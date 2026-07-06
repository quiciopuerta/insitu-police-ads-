import postgres from "postgres";
import { getStore } from "@netlify/blobs";
import initSqlJs from "sql.js";
import fs from "node:fs";
import path from "node:path";

/**
 * Standardized database client for Netlify Functions.
 * Standardized database client for Netlify Functions using Supabase via postgres.js generic driver,
 * with hybrid SQLite + Netlify Blobs persistence.
 */
const DB_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || "";
const USE_NETLIFY_BLOBS = process.env.USE_NETLIFY_BLOBS === "true" || !DB_URL;

// Cache the postgres client pool
let sqlClient: any = null;

// Cache sql.js instances
let sqlInstance: any = null;
let dbInstance: any = null;
let dbWasmBuffer: any = null;

// ── Circuit Breaker state (per serverless instance) ──────────────────────────
// After FAILURE_THRESHOLD consecutive capacity errors the circuit opens and all
// queries return null immediately for CIRCUIT_TIMEOUT_MS, protecting the DB.
let failureCount = 0;
let circuitOpenUntil = 0;
const FAILURE_THRESHOLD = 3;
const CIRCUIT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const getCircuitStatus = () => ({
    open: circuitOpenUntil > Date.now(),
    failureCount,
    retryAt: circuitOpenUntil > 0 ? new Date(circuitOpenUntil).toISOString() : null,
});

export const resetCircuit = () => {
    failureCount = 0;
    circuitOpenUntil = 0;
    sqlClient = null; // force reconnect
    dbInstance = null; // force reload SQLite
};

export const getDb = () => {
    if (!DB_URL) {
        console.warn("[DB] No DATABASE_URL found. Database operations will be skipped.");
        return null;
    }
    if (!sqlClient) {
        sqlClient = postgres(DB_URL, {
            max: 1,
            idle_timeout: 20,
            connect_timeout: 10,
            // Required for Supabase pgBouncer (transaction mode, port 6543).
            // Safe to enable for direct connections too — postgres.js falls back gracefully.
            prepare: false,
        });
    }
    return sqlClient;
};

// ── SQLite Blob Helper functions ─────────────────────────────────────────────
async function getSqlJs() {
    if (sqlInstance) return sqlInstance;
    
    // In Netlify lambda environment, included_files puts the WASM file inside node_modules/sql.js/dist/
    const wasmPath = path.join(process.cwd(), "node_modules/sql.js/dist/sql-wasm.wasm");
    if (!fs.existsSync(wasmPath)) {
        throw new Error(`[DB-SQLJS] WASM binary not found at ${wasmPath}`);
    }
    dbWasmBuffer = fs.readFileSync(wasmPath);
    sqlInstance = await initSqlJs({ wasmBinary: dbWasmBuffer });
    return sqlInstance;
}

// Global promise to queue database load operations and prevent parallel loads
let dbLoadPromise: Promise<any> | null = null;

async function loadDatabase() {
    if (dbInstance) return dbInstance;
    
    if (dbLoadPromise) return dbLoadPromise;
    
    dbLoadPromise = (async () => {
        const SQL = await getSqlJs();
        let dbData: Uint8Array | null = null;
        
        if (process.env.USE_NETLIFY_BLOBS === "true" || (process.env.NETLIFY && !DB_URL)) {
            try {
                const store = getStore("police_ads_db");
                const blob = await store.get("database.db", { type: "arrayBuffer" });
                if (blob) {
                    dbData = new Uint8Array(blob);
                    console.log(`[DB-BLOBS] Loaded database from Netlify Blobs (${dbData.length} bytes)`);
                }
            } catch (e: any) {
                console.warn("[DB-BLOBS] Failed to fetch database from blobs, starting fresh:", e.message);
            }
        }
        
        if (!dbData) {
            // Fallback: Try to load local seed database
            try {
                const seedPath = path.join(process.cwd(), "database.db");
                if (fs.existsSync(seedPath)) {
                    const seedBuffer = fs.readFileSync(seedPath);
                    dbData = new Uint8Array(seedBuffer);
                    console.log(`[DB-BLOBS] Seeded database from local database.db (${dbData.length} bytes)`);
                }
            } catch (seedErr: any) {
                console.warn("[DB-BLOBS] No local seed database found:", seedErr.message);
            }
        }
        
        if (dbData) {
            dbInstance = new SQL.Database(dbData);
        } else {
            dbInstance = new SQL.Database();
            console.log("[DB-BLOBS] Initialized fresh in-memory database");
        }
        
        dbLoadPromise = null;
        return dbInstance;
    })();
    
    return dbLoadPromise;
}

async function saveDatabase() {
    if (!dbInstance) return;
    
    const outBuffer = dbInstance.export();
    
    if (process.env.USE_NETLIFY_BLOBS === "true" || (process.env.NETLIFY && !DB_URL)) {
        const store = getStore("police_ads_db");
        await store.set("database.db", outBuffer, { consistency: "strong" });
        console.log(`[DB-BLOBS] Saved database to Netlify Blobs (${outBuffer.length} bytes)`);
    } else {
        const localPath = path.join(process.cwd(), "database.db");
        fs.writeFileSync(localPath, outBuffer);
        console.log(`[DB-BLOBS] Saved database to local file: ${localPath} (${outBuffer.length} bytes)`);
    }
}

function checkIsWrite(query: string): boolean {
    return /insert|update|delete|create|drop|alter|replace/i.test(query);
}

function mapSqlResult(res: any[]): any[] {
    if (!res || res.length === 0) return [];
    const { columns, values } = res[0];
    return values.map((row: any) => {
        const obj: any = {};
        columns.forEach((col: string, idx: number) => {
            // Strip surrounding double quotes from column names (e.g. '"approvalStatus"' -> 'approvalStatus')
            let normalizedCol = col.replace(/^"|"$/g, '');
            // Normalize postgres/sqlite differences
            if (normalizedCol.toLowerCase() === 'count(*)') {
                normalizedCol = 'count';
            }
            obj[normalizedCol] = row[idx];
        });
        return obj;
    });
}

const normalizeSqlForSqlite = (query: string): string => {
    return query
        // Comment out Postgres-only EXTENSION creations
        .replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp"/gi, '-- CREATE EXTENSION')
        .replace(/CREATE EXTENSION IF NOT EXISTS "pgcrypto"/gi, '-- CREATE EXTENSION')
        // SQLite does not support IF NOT EXISTS in ADD COLUMN
        .replace(/ADD COLUMN IF NOT EXISTS/gi, 'ADD COLUMN')
        // Map Postgres SERIAL to SQLite autoincrement integer
        .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
        // Map Postgres UUID primary key to TEXT in SQLite
        .replace(/UUID PRIMARY KEY/gi, 'TEXT PRIMARY KEY')
        // Native UUID generator expression in SQLite
        .replace(/DEFAULT uuid_generate_v4\(\)/gi, "DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))")
        // Map Postgres JSONB / TEXT[] to standard SQLite TEXT
        .replace(/JSONB/gi, 'TEXT')
        .replace(/TEXT\[\]/gi, 'TEXT')
        // Map Postgres timestamps to SQLite timestamp affinity
        .replace(/TIMESTAMP WITH TIME ZONE/gi, 'TIMESTAMP')
        .replace(/DEFAULT NOW\(\)/gi, 'DEFAULT CURRENT_TIMESTAMP')
        // Map Postgres positional parameters $1, $2 to SQLite ?
        .replace(/\$\d+/g, '?');
};

const makeSqljsClient = (db: any) => {
    const client = async (strings: TemplateStringsArray, ...values: any[]) => {
        let query = strings.join('?');
        query = normalizeSqlForSqlite(query);
        
        const params = values.map(p => {
            if (p !== null && typeof p === 'object') {
                return JSON.stringify(p);
            }
            if (typeof p === 'boolean') {
                return p ? 1 : 0;
            }
            return p;
        });

        const res = db.exec(query, params);
        
        if (checkIsWrite(query)) {
            await saveDatabase().catch(err => console.error("[DB-BLOBS] Failed to save DB:", err));
        }
        
        return mapSqlResult(res);
    };

    client.unsafe = async (query: string, params: any[] = []) => {
        let sqliteQuery = normalizeSqlForSqlite(query);
        const mappedParams = params.map(p => {
            if (p !== null && typeof p === 'object') {
                return JSON.stringify(p);
            }
            if (typeof p === 'boolean') {
                return p ? 1 : 0;
            }
            return p;
        });

        const res = db.exec(sqliteQuery, mappedParams);
        
        if (checkIsWrite(query)) {
            await saveDatabase().catch(err => console.error("[DB-BLOBS] Failed to save DB:", err));
        }

        return mapSqlResult(res);
    };

    return client;
};

/**
 * Detects transient/capacity errors from Supabase (postgres.js).
 * Returns null so callers can degrade gracefully instead of throwing 500s.
 */
function isCapacityError(error: any): boolean {
    const msg = (error.message || "").toLowerCase();
    const code = error.code || "";

    // Error patterns: quota exceeded
    if (msg.includes("402") || msg.includes("quota")) return true;

    // postgres.js / PostgreSQL error codes
    // 53300 = too_many_connections, 53200 = out_of_memory, 53100 = disk_full
    if (["53300", "53200", "53100"].includes(code)) return true;

    // Supabase / generic connection errors
    if (
        msg.includes("too many connections") ||
        msg.includes("connection refused") ||
        msg.includes("connection terminated") ||
        msg.includes("econnrefused") ||
        msg.includes("econnreset") ||
        msg.includes("etimedout") ||
        msg.includes("timeout") ||
        msg.includes("max_client_conn") ||
        msg.includes("emaxconnsession") ||
        msg.includes("max clients reached") ||
        msg.includes("no more connections allowed") ||
        msg.includes("remaining connection slots are reserved") ||
        msg.includes("storage limit") ||
        msg.includes("disk full") ||
        msg.includes("out of memory")
    ) return true;

    return false;
}

/**
 * Common database helper for safe execution.
 * Returns null on capacity/availability errors so callers can degrade gracefully.
 * Includes circuit breaker: after FAILURE_THRESHOLD consecutive capacity errors
 * the circuit opens and all queries return null for CIRCUIT_TIMEOUT_MS.
 */
export const runQuery = async <T = any>(queryFn: (sql: any) => Promise<T>): Promise<T | null> => {
    if (USE_NETLIFY_BLOBS) {
        try {
            const db = await loadDatabase();
            const client = makeSqljsClient(db);
            const result = await queryFn(client);
            return result;
        } catch (error: any) {
            console.error("[DB SQLite/Blobs Error]:", error.message);
            throw error;
        }
    }

    // Circuit open — skip query entirely
    if (circuitOpenUntil > Date.now()) {
        console.warn(`[DB] Circuit open — skipping query. Retry after ${new Date(circuitOpenUntil).toISOString()}`);
        return null;
    }

    const sql = getDb();
    if (!sql) return null;

    try {
        const result = await queryFn(sql);
        // Successful query resets the failure counter
        if (failureCount > 0) {
            console.log("[DB] Circuit recovered — resetting failure count.");
            failureCount = 0;
        }
        return result;
    } catch (error: any) {
        if (isCapacityError(error)) {
            failureCount++;
            if (failureCount >= FAILURE_THRESHOLD) {
                circuitOpenUntil = Date.now() + CIRCUIT_TIMEOUT_MS;
                console.warn(`[DB] Circuit OPENED after ${failureCount} failures. Will retry at ${new Date(circuitOpenUntil).toISOString()}`);
            }
            console.warn("⚠️ [DB] Capacity/availability error — degrading gracefully:", error.message);
            return null;
        }

        console.error("[DB Query Error]:", error.message);
        throw error;
    }
};

/**
 * Default settings fallback for when the database is unavailable.
 */
export const DEFAULT_SETTINGS = {
    promptRules: [
        { rule_type: 'style_guide', content: 'Mantener tono profesional y orientado a conversión.', feature: 'global' },
        { rule_type: 'negative_example', content: 'Evitar promesas de resultados irreales o garantizados.', feature: 'global' }
    ]
};


