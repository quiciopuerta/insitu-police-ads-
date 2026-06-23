
import postgres from 'postgres';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'database.db');

// Supabase / any Postgres via DATABASE_URL
const PG_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
let USE_LOCAL = process.env.VITE_USE_LOCAL_DB === 'true' || !PG_URL;

let sql = null;
let sqliteClient = null;
let isPg = false;

const connectToDb = async () => {
    if (USE_LOCAL) {
        console.log("📂 [Database] Using Local SQLite Database:", dbPath);
        sqliteClient = new sqlite3.Database(dbPath);
        isPg = false;
        return;
    }

    try {
        sql = postgres(PG_URL, {
            max: 1,
            idle_timeout: 20,
            connect_timeout: 10,
            prepare: false, // Required for Supabase pgBouncer (transaction mode)
        });
        await sql`SELECT 1`; // test connection
        isPg = true;
        console.log("☁️ [Database] Connected to Supabase Postgres.");
    } catch (e) {
        console.warn("⚠️ [Database] Postgres connection failed, falling back to SQLite:", e.message);
        sqliteClient = new sqlite3.Database(dbPath);
        isPg = false;
        USE_LOCAL = true;
    }
};

let connectionPromise = connectToDb();

/**
 * Query executor — Supabase/Postgres with SQLite fallback.
 * Accepts standard SQL with ? placeholders (converted to $1, $2... for Postgres).
 */
const queryExec = async (query, params = []) => {
    await connectionPromise;
    if (isPg) {
        try {
            let i = 0;
            const pgQuery = query.replace(/\?/g, () => `$${++i}`);
            const rows = await sql.unsafe(pgQuery, params);
            return rows || [];
        } catch (e) {
            const msg = e.message || '';
            if (msg.includes('402') || msg.includes('quota') || msg.includes('ECONNREFUSED') || msg.includes('too many connections') || msg.includes('timeout')) {
                console.error("🚨 Postgres error. Switching to local SQLite:", msg);
                isPg = false;
                if (!sqliteClient) sqliteClient = new sqlite3.Database(dbPath);
                return queryExec(query, params);
            }
            throw e;
        }
    } else {
        return new Promise((resolve, reject) => {
            sqliteClient.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    }
};

export const run = async (query, params = []) => {
    const rows = await queryExec(query, params);
    return { lastID: rows[0]?.id ?? null, changes: rows.length };
};

export const get = async (query, params = []) => {
    const rows = await queryExec(query, params);
    return rows[0] ?? null;
};

export const all = async (query, params = []) => {
    return await queryExec(query, params);
};

export const initDb = async () => {
    console.log("[DB] Initializing Database...");

    const textArrType = isPg ? "TEXT[] DEFAULT '{search,tech,seo}'" : "TEXT DEFAULT 'search,tech,seo'";
    const jsonbType = isPg ? "JSONB" : "TEXT";

    await run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        email TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        role TEXT,
        approval_status TEXT,
        picture TEXT,
        last_login BIGINT,
        subscription TEXT,
        total_tokens_used INTEGER DEFAULT 0,
        usage_limit INTEGER DEFAULT 10000,
        usage_history TEXT,
        brand_profile TEXT,
        brand_profiles TEXT,
        free_trials_used INTEGER DEFAULT 0,
        recovery_code TEXT,
        recovery_code_expiry BIGINT,
        linked_google_ads TEXT,
        linked_search_console TEXT,
        saved_voices TEXT,
        is_deleted BOOLEAN DEFAULT false
    )`);

    // SQLite Migration: Rename camelCase to snake_case
    if (!isPg) {
        const tableMigrations = [
            { 
                table: 'users', 
                cols: [
                    { old: 'firstName', new: 'first_name' },
                    { old: 'lastName', new: 'last_name' },
                    { old: 'approvalStatus', new: 'approval_status' },
                    { old: 'lastLogin', new: 'last_login' },
                    { old: 'usageHistory', new: 'usage_history' },
                    { old: 'brandProfile', new: 'brand_profile' },
                    { old: 'usageLimit', new: 'usage_limit' },
                    { old: 'totalTokensUsed', new: 'total_tokens_used' },
                    { old: 'freeTrialsUsed', new: 'free_trials_used' },
                    { old: 'recoveryCode', new: 'recovery_code' },
                    { old: 'linkedGoogleAds', new: 'linked_google_ads' },
                    { old: 'linkedSearchConsole', new: 'linked_search_console' }
                ]
            },
            {
                table: 'leads',
                cols: [
                    { old: 'createdAt', new: 'created_at' }
                ]
            },
            {
                table: 'blog_posts',
                cols: [
                    { old: 'authorId', new: 'author_id' },
                    { old: 'authorName', new: 'author_name' },
                    { old: 'authorPicture', new: 'author_picture' },
                    { old: 'publishedAt', new: 'published_at' },
                    { old: 'updatedAt', new: 'updated_at' },
                    { old: 'featuredImage', new: 'featured_image' },
                    { old: 'metaTitle', new: 'meta_title' },
                    { old: 'metaDescription', new: 'meta_description' },
                    { old: 'readingTime', new: 'reading_time' }
                ]
            }
        ];

        for (const tMig of tableMigrations) {
            try {
                const tableInfo = await all(`PRAGMA table_info(${tMig.table})`);
                const colNames = tableInfo.map(c => c.name);
                for (const m of tMig.cols) {
                    if (colNames.includes(m.old) && !colNames.includes(m.new)) {
                        console.log(`[DB] Renaming ${tMig.table}.${m.old} to ${m.new}...`);
                        await run(`ALTER TABLE ${tMig.table} RENAME COLUMN ${m.old} TO ${m.new}`);
                    }
                }
            } catch (e) {
                // Table might not exist yet, skip
            }
        }
    }

    // Add missing columns if they don't exist
    const columns = [
        { table: 'users', col: 'phone', type: 'TEXT' },
        { table: 'users', col: 'brand_profiles', type: 'TEXT' },
        { table: 'users', col: 'recovery_code', type: 'TEXT' },
        { table: 'users', col: 'recovery_code_expiry', type: 'BIGINT' },
        { table: 'users', col: 'linked_google_ads', type: 'TEXT' },
        { table: 'users', col: 'linked_search_console', type: 'TEXT' },
        { table: 'users', col: 'saved_voices', type: 'TEXT' },
        { table: 'users', col: 'is_deleted', type: 'BOOLEAN DEFAULT false' },
        { table: 'users', col: 'deleted_at', type: 'BIGINT' },
        { table: 'blog_posts', col: 'is_deleted', type: 'BOOLEAN DEFAULT false' },
        { table: 'blog_posts', col: 'deleted_at', type: 'BIGINT' },
        { table: 'blog_posts', col: 'created_at', type: 'BIGINT' },
        { table: 'history', col: 'is_deleted', type: 'BOOLEAN DEFAULT false' },
        { table: 'history', col: 'deleted_at', type: 'BIGINT' },
        { table: 'history', col: 'user_id', type: 'TEXT' },
        { table: 'notifications', col: 'is_deleted', type: 'BOOLEAN DEFAULT false' },
        { table: 'notifications', col: 'deleted_at', type: 'BIGINT' },
        { table: 'leads', col: 'is_deleted', type: 'BOOLEAN DEFAULT false' },
        { table: 'leads', col: 'deleted_at', type: 'BIGINT' },
        { table: 'leads', col: 'created_at', type: 'BIGINT' },
        { table: 'competitor_tracks', col: 'is_deleted', type: 'BOOLEAN DEFAULT false' },
        { table: 'competitor_tracks', col: 'deleted_at', type: 'BIGINT' },
        { table: 'automation_rules', col: 'is_deleted', type: 'BOOLEAN DEFAULT false' },
        { table: 'automation_rules', col: 'deleted_at', type: 'BIGINT' }
    ];

    for (const { table, col, type } of columns) {
        if (isPg) {
            await run(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type}`).catch(() => {});
        } else {
            await run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`).catch(() => {});
        }
    }

    await run(`CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        role TEXT,
        budget TEXT,
        goals TEXT,
        email TEXT,
        name TEXT,
        created_at BIGINT,
        status TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS competitor_tracks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        search_query TEXT NOT NULL,
        networks ${textArrType},
        country TEXT DEFAULT 'ALL',
        is_active BOOLEAN DEFAULT true,
        notify_email BOOLEAN DEFAULT true,
        notify_inapp BOOLEAN DEFAULT true,
        created_at BIGINT,
        last_checked_at BIGINT,
        total_signals_found INTEGER DEFAULT 0,
        UNIQUE(user_id, brand_name)
    )`);

    await run(`CREATE TABLE IF NOT EXISTS competitor_signals (
        id TEXT PRIMARY KEY,
        track_id TEXT NOT NULL,
        type TEXT NOT NULL,
        source TEXT,
        title TEXT,
        description TEXT,
        url TEXT,
        relevance_score INTEGER DEFAULT 0,
        detected_at BIGINT,
        is_new BOOLEAN DEFAULT true,
        raw_data ${jsonbType},
        UNIQUE(track_id, url, type)
    )`);

    const settingsCheck = isPg ? 'CHECK (id = 1)' : '';
    await run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY ${settingsCheck}, data TEXT)`);

    await run(`CREATE TABLE IF NOT EXISTS blog_posts (
        id TEXT PRIMARY KEY,
        title TEXT,
        slug TEXT UNIQUE,
        content TEXT,
        excerpt TEXT,
        author_id TEXT,
        author_name TEXT,
        author_picture TEXT,
        published_at BIGINT,
        updated_at BIGINT,
        status TEXT,
        category TEXT,
        tags TEXT,
        featured_image TEXT,
        meta_title TEXT,
        meta_description TEXT,
        keywords TEXT,
        reading_time TEXT,
        created_at BIGINT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        userid TEXT,
        type TEXT,
        query TEXT,
        timestamp BIGINT,
        data TEXT,
        results TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at BIGINT NOT NULL,
        cta_url TEXT,
        image_url TEXT,
        video_url TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS engagement_events (
        id TEXT PRIMARY KEY,
        notification_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        metadata ${jsonbType}
    )`);

    await run(`CREATE TABLE IF NOT EXISTS audit_delete_log (
        id TEXT PRIMARY KEY,
        created_at BIGINT,
        author TEXT,
        action TEXT,
        target_id TEXT,
        details TEXT
    )`);

    // Ensure default superAdmin
    if (isPg) {
        await run(
            `INSERT INTO users (id, username, password, email, role, approval_status, picture, last_login, subscription, usage_limit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (id) DO NOTHING`,
            [
                'admin-master',
                'Fsanchez',
                process.env.ADMIN_PASSWORD || '',
                'sociopuerta@gmail.com',
                'superAdmin',
                'approved',
                'https://ui-avatars.com/api/?name=Franklin+Sanchez&background=0f172a&color=fff',
                Date.now(),
                JSON.stringify({ status: 'active', plan: 'Agency', price: 299, expiryDate: Date.now() + 1000 * 60 * 60 * 24 * 365 * 10, paymentMethod: 'Manual' }),
                1000000,
            ]
        );
    } else {
        await run(
            `INSERT OR IGNORE INTO users (id, username, password, email, role, approval_status, picture, last_login, subscription, usage_limit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'admin-master',
                'Fsanchez',
                process.env.ADMIN_PASSWORD || '',
                'sociopuerta@gmail.com',
                'superAdmin',
                'approved',
                'https://ui-avatars.com/api/?name=Franklin+Sanchez&background=0f172a&color=fff',
                Date.now(),
                JSON.stringify({ status: 'active', plan: 'Agency', price: 299, expiryDate: Date.now() + 1000 * 60 * 60 * 24 * 365 * 10, paymentMethod: 'Manual' }),
                1000000,
            ]
        );
    }

    // Default settings
    const existingSettings = await get("SELECT * FROM settings WHERE id = 1");
    if (!existingSettings) {
        const defaultSettings = {
            aiConfigs: [{ provider: 'Google Gemini (Primary)', apiKey: '', status: 'active', type: 'text' }],
            googleAuth: { clientId: '', enabled: false },
            paypal: { clientId: 'sb-default', mode: 'sandbox', enabled: true, plans: { Starter: 'P-STARTER-TRIAL', Growth: 'P-GROWTH-TRIAL', Agency: 'P-AGENCY-TRIAL' } },
            trialTokens: 500,
            trialDays: 7,
            features: { competitorAnalysis: true, imageAnalysis: true, videoAnalysis: true, metrics: true, trafficAnalysis: true, brandIdentity: true },
            pricing: {
                Starter: { monthly: 19, yearly: 182, features: ['Auditoría SEM & Textos (Limitado)', 'Análisis de Imágenes (20/mes)', '500 Tokens de Bienvenida'] },
                Growth: { monthly: 49, yearly: 470, features: ['Todo lo de Starter', 'Análisis de Imágenes (Hasta 100/mes)', 'Análisis de Video (Hasta 4 min/mes)'] },
                Agency: { monthly: 149, yearly: 1430, features: ['Todo lo de Growth', 'Análisis de Imágenes Ilimitado', 'Análisis de Video Avanzado (Hasta 20 min/mes)'] },
            },
            comingSoon: { enabled: false, message: '¡Próximamente!' },
        };
        await run("INSERT INTO settings (id, data) VALUES (?, ?)", [1, JSON.stringify(defaultSettings)]);
    }

    await run(`CREATE TABLE IF NOT EXISTS automation_rules (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT,
        description TEXT,
        logic TEXT,
        template_type TEXT,
        conditions ${jsonbType},
        actions ${jsonbType},
        is_active BOOLEAN DEFAULT true,
        is_deleted BOOLEAN DEFAULT false,
        created_at BIGINT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS automation_logs (
        id TEXT PRIMARY KEY,
        rule_id TEXT,
        rule_name TEXT,
        timestamp BIGINT,
        campaign_id TEXT,
        ad_id TEXT,
        action_taken TEXT,
        metrics_snapshot ${jsonbType},
        status TEXT
    )`);

    await run(`CREATE TABLE IF NOT EXISTS latency_telemetry (
        id TEXT PRIMARY KEY,
        task_type TEXT,
        duration_ms INTEGER,
        status TEXT,
        timestamp BIGINT,
        metadata ${jsonbType}
    )`);

    console.log(`✅ ${isPg ? 'Supabase Postgres' : 'Local SQLite'} DB initialized successfully`);
};

export default { run, get, all, initDb };
