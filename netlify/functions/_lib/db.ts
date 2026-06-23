import postgres from "postgres";

/**
 * Standardized database client for Netlify Functions.
 * Standardized database client for Netlify Functions using Supabase via postgres.js generic driver.
 */
const DB_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || "";

// Cache the postgres client pool
let sqlClient: any = null;

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

