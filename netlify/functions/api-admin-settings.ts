import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError, logError } from "./_lib/errorHandler";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

const handler: Handler = async (
    event: HandlerEvent,
    _ctx: HandlerContext
) => {
    // ── CORS preflight ──────────────────────────────────────────────
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: "" };
    }

    // Auth helper: ADMIN_SECRET OR admin role via DB
    const checkAdmin = async (): Promise<boolean> => {
        const authHeader = event.headers["authorization"] || event.headers["Authorization"] || event.headers["x-admin-key"] || "";
        if (ADMIN_SECRET !== "" && authHeader === `Bearer ${ADMIN_SECRET}`) return true;
        
        const xUserId = getUserIdFromHeaders(event.headers);
        if (!xUserId) return false;
        
        const rows = await runQuery((sql) =>
            sql`SELECT role FROM users WHERE id = ${xUserId} LIMIT 1`
        );
        const isAdmin = Array.isArray(rows) && rows.length > 0 &&
            (rows[0].role === "admin" || rows[0].role === "superAdmin");
            
        if (!isAdmin && xUserId) {
            console.warn(`[ADMIN-SETTINGS] Unauthorized access attempt from user ID: ${xUserId}`);
        }
        return isAdmin;
    };

    try {
        // Ensure table exists
        await runQuery(async (sql) => {
            await sql`
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY,
                    data JSONB
                )
            `;
        }).catch(() => null);

        // ── GET: public — app settings needed by all users ──────────
        if (event.httpMethod === "GET") {
            const rows = await runQuery((sql) => sql`SELECT data FROM settings WHERE id = 1`).catch(() => null);
            if (!rows?.length) {
                return { statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({}) };
            }
            
            // SECURITY HOTFIX: Prevent GCP private keys and other credentials from leaking via GET
            let settingsData = rows[0].data;
            if (typeof settingsData === "string") {
                try { settingsData = JSON.parse(settingsData); } catch(e) {}
            } else if (settingsData && typeof settingsData === "object") {
                settingsData = { ...settingsData };
            }
            
            if (settingsData && settingsData.gcpCredentials) {
                settingsData.gcpCredentials = { ...settingsData.gcpCredentials, private_key: "REDACTED_SECURITY_HOTFIX" };
            }
            if (settingsData && settingsData.smtp) {
                delete settingsData.smtp;
            }

            return { statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify(settingsData) };
        }

        // ── POST: admin-only — save settings ─────────────────────────
        if (event.httpMethod === "POST") {
            if (!await checkAdmin()) {
                return { statusCode: 401, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Unauthorized" }) };
            }
            let parsed: any;
            try {
                parsed = JSON.parse(event.body ?? "{}");
            } catch {
                return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Invalid JSON" }) };
            }

            const toStore = { ...parsed };
            if (Array.isArray(toStore.aiConfigs)) {
                toStore.aiConfigs = toStore.aiConfigs.map((c: any) => ({ ...c, apiKey: "" }));
            }
            if (toStore.smtp) delete toStore.smtp;

            const dataStr = JSON.stringify(toStore);
            await runQuery((sql) => sql`
                INSERT INTO settings (id, data) VALUES (1, ${dataStr})
                ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
            `);

            return { statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 405, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Method not allowed" }) };
    } catch (err: any) {
        logError("api-admin-settings", err);
        return { statusCode: 500, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: safeError(err) }) };
    }
};


export { handler };

