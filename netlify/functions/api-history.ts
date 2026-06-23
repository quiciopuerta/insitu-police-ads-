import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError, logError } from "./_lib/errorHandler";
import { runMigrations } from "./_lib/migrations";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Content-Type": "application/json",
};

const json = (status: number, body: unknown) => ({
    statusCode: status,
    headers: CORS,
    body: JSON.stringify(body),
});

let migrationsRan = false;

export const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

    if (!migrationsRan) {
        await runMigrations().catch(err => console.error("[HISTORY] Migrations failed:", err));
        migrationsRan = true;
    }

    const sub = event.path
        .replace(/^\/api\/history\/?/, "")
        .replace(/^\/\.netlify\/functions\/api-history\/?/, "");

    // ── Ownership guard: caller must provide matching X-User-Id header ────────
    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const callerUserId = event.headers['x-user-id'] || event.headers['X-User-Id'] || authHeader.replace('Bearer ', '') || '';
    
    if (!callerUserId) {
        return json(401, { error: "Unauthorized: Missing identity" });
    }

    // Validate user exists in DB
    const userExists = await runQuery(async (sql) => {
        const rows = await sql`SELECT id FROM users WHERE id = ${callerUserId} LIMIT 1`;
        return rows && rows.length > 0;
    });

    if (!userExists) {
        return json(401, { error: "Unauthorized: Invalid identity" });
    }

    try {
        // ── POST / (Save Item) ────────────────────────────────────────────────
        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || "{}");
            const { id, userId, type, query, result, timestamp } = body;

            if (!id || !userId || !type) {
                return json(400, { error: "Missing required fields (id, userId, type)" });
            }
            if (callerUserId !== userId) {
                return json(403, { error: "Forbidden" });
            }

            await runQuery(sql => sql`
                INSERT INTO history (id, user_id, type, query, result, timestamp)
                VALUES (${id}, ${userId}, ${type}, ${JSON.stringify(query)}, ${JSON.stringify(result)}, ${timestamp || Date.now()})
                ON CONFLICT (id) DO UPDATE SET
                    query = EXCLUDED.query,
                    result = EXCLUDED.result,
                    timestamp = EXCLUDED.timestamp
            `);

            return json(200, { success: true });
        }

        // ── GET /:userId OR /detail/:itemId ─────────────────────────────────────
        if (event.httpMethod === "GET") {
            const pathParts = sub.split('/');
            const isDetail = pathParts[0] === 'detail';
            const itemId = isDetail ? pathParts[1] : null;
            const userId = isDetail ? null : pathParts[0];

            if (!userId && !itemId) return json(400, { error: "Missing identifier in path" });

            // 1. DETAIL VIEW (Single Item with full result)
            if (isDetail && itemId) {
                const row = await runQuery(sql => sql`
                    SELECT * FROM history WHERE id = ${itemId} LIMIT 1
                `);
                if (!row || row.length === 0) return json(404, { error: "Item not found" });
                
                const r = row[0];
                return json(200, {
                    id: r.id,
                    userId: r.user_id,
                    type: r.type,
                    query: typeof r.query === 'string' ? JSON.parse(r.query) : r.query,
                    result: r.result ? (typeof r.result === 'string' ? JSON.parse(r.result) : r.result) : null,
                    timestamp: Number(r.timestamp)
                });
            }

            // 2. LIST VIEW (User History without large results)
            if (!userId) return json(400, { error: "Missing userId" });

            // VALIDATION: If requesting others' history, caller MUST BE ADMIN
            if (callerUserId !== userId) {
                const callerRoles = await runQuery(sql => sql`SELECT role FROM users WHERE id = ${callerUserId}`);
                const isSuperAdmin = Array.isArray(callerRoles) && callerRoles.length > 0 && 
                                     (callerRoles[0]?.role === 'superAdmin' || callerRoles[0]?.role === 'admin');
                if (!isSuperAdmin) {
                    return json(403, { error: "Forbidden: Admin/SuperAdmin required" });
                }
            }

            const now = Date.now();
            const retentionLimit = 15 * 24 * 60 * 60 * 1000;
            const expiryTime = now - retentionLimit;

            // Soft-delete expired history
            await runQuery(sql => sql`
                UPDATE history
                SET is_deleted = true
                WHERE user_id = ${userId} AND timestamp < ${expiryTime} AND (is_deleted IS NULL OR is_deleted = false)
            `);

            // Fetch history list (Exclude 'result' to prevent 502/Payload too large)
            const rows = await runQuery(sql =>
                sql`SELECT id, user_id, type, query, timestamp, is_deleted 
                    FROM history 
                    WHERE user_id = ${userId} AND (is_deleted IS NULL OR is_deleted = false) 
                    ORDER BY timestamp DESC LIMIT 100`
            );

            if (rows === null) return json(503, { error: "DB Unavailable" });

            const history = rows.map(r => ({
                id: r.id,
                userId: r.user_id,
                type: r.type,
                query: typeof r.query === 'string' ? JSON.parse(r.query) : r.query,
                result: null, // Results must be fetched individually via /detail/:itemId
                timestamp: Number(r.timestamp)
            }));

            return json(200, history);
        }

        // ── DELETE /:itemId ─────────────────────────────────────────────────────
        if (event.httpMethod === "DELETE") {
            const itemId = sub.split('/')[0];
            if (!itemId) return json(400, { error: "Missing itemId" });

            // Safe Management Protocol: Soft delete — no physical DELETE FROM history
            await runQuery(async (sql) => await sql`
                UPDATE history SET is_deleted = true WHERE id = ${itemId}
            `);
            // Audit log (Safe Management Protocol)
            await runQuery(async (sql) => await sql`
                INSERT INTO ai_technical_logs (feature, error_message, severity, user_id, request_context)
                VALUES ('history_management', 'Authorized Soft Delete of history item: ' || ${itemId}, 'info', ${callerUserId}, ${JSON.stringify({ deletedItemId: itemId })})
            `).catch((err) => console.error("[HISTORY] Audit log failed:", err));

            return json(200, {
                success: true,
                message: 'Registro archivado. Los datos se conservan por protocolo de auditoría y pueden ser recuperados.'
            });
        }

        return json(404, { error: "Endpoint not found" });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-history] Error:", message);
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
