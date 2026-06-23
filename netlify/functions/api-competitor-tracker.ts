import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError, logError } from "./_lib/errorHandler";

const DB_URL = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || "";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Content-Type": "application/json",
};

const json = (statusCode: number, body: unknown) => ({
    statusCode,
    headers: CORS,
    body: JSON.stringify(body),
});

// ─── Limits per plan ────────────────────────────────────────────────────────────
const PLAN_LIMITS: Record<string, number> = {
    Trial: 1,
    Starter: 3,
    Growth: 10,
    Agency: 25,
};

const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

    // ── Ensure tables exist (Refactored for Signals) ───────────────────────────
    await runQuery(async (sql) => {
        await sql`CREATE TABLE IF NOT EXISTS competitor_tracks (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            brand_name TEXT NOT NULL,
            search_query TEXT NOT NULL,        -- Usado para Serper/Tavily
            networks TEXT[] DEFAULT '{search,tech,seo}', 
            country TEXT DEFAULT 'ALL',
            is_active BOOLEAN DEFAULT true,
            notify_email BOOLEAN DEFAULT true,
            notify_inapp BOOLEAN DEFAULT true,
            created_at BIGINT,
            last_checked_at BIGINT,
            total_signals_found INTEGER DEFAULT 0,
            UNIQUE(user_id, brand_name)
        )`;
        await sql`CREATE TABLE IF NOT EXISTS competitor_signals (
            id TEXT PRIMARY KEY,
            track_id TEXT NOT NULL REFERENCES competitor_tracks(id) ON DELETE CASCADE,
            type TEXT NOT NULL,                -- 'seo', 'tech', 'mention', 'landing'
            source TEXT,                       -- 'serper', 'tavily', 'builtwith'
            title TEXT,
            description TEXT,
            url TEXT,
            relevance_score INTEGER DEFAULT 0, -- 0-100 score by Gemini
            detected_at BIGINT,
            is_new BOOLEAN DEFAULT true,
            raw_data JSONB,
            UNIQUE(track_id, url, type)
        )`;
    });

    const path = event.path
        .replace(/^\/\.netlify\/functions\/api-competitor-tracker\/?/, "")
        .replace(/^\/api\/competitor-tracker\/?/, "");
    const body = event.body ? JSON.parse(event.body) : {};
    const params = event.queryStringParameters || {};

    // ── IDENTITY VERIFICATION ─────────────────────────────────────────────
    const userId = event.headers["x-user-id"] || event.headers["X-User-Id"] || event.headers["Authorization"]?.replace('Bearer ', '') || "";
    if (!userId) {
        return json(401, { error: "Unauthorized: Missing identity" });
    }

    // Validate user exists in DB
    const userExists = await runQuery(async (sql) => {
        const rows = await sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1`;
        return rows && rows.length > 0;
    });

    if (!userExists) {
        return json(401, { error: "Unauthorized: Invalid identity" });
    }
    const callerUserId = userId;
    // ──────────────────────────────────────────────────────────────────────

    try {
        // ── GET / → List user's tracked competitors ────────────────────────────────
        if (event.httpMethod === "GET" && (!path || path === "")) {
            const userId = params.userId;
            if (!userId) return json(400, { error: "userId required" });
            if (callerUserId !== userId) return json(403, { error: "Forbidden" });

            const tracks = await runQuery(async (sql) => {
                return await sql`
                    SELECT * FROM competitor_tracks
                    WHERE user_id = ${userId} AND (is_deleted IS NULL OR is_deleted = false)
                    ORDER BY created_at DESC
                `;
            });
            if (tracks === null) return json(503, { error: "Database offline" });
            return json(200, {
                tracks,
                limits: PLAN_LIMITS,
            });
        }

        // ── GET /signals?trackId=xxx → Signals detected for a specific competitor ──
        if (event.httpMethod === "GET" && path === "signals") {
            const trackId = params.trackId;
            if (!trackId) return json(400, { error: "trackId required" });

            const result = await runQuery(async (sql) => {
                // Ownership check
                const track = await sql`SELECT user_id FROM competitor_tracks WHERE id = ${trackId} LIMIT 1`;
                if (!track || track.length === 0 || track[0].user_id !== callerUserId) {
                    return { error: "forbidden" };
                }

                const signals = await sql`
                    SELECT * FROM competitor_signals
                    WHERE track_id = ${trackId}
                    ORDER BY detected_at DESC
                    LIMIT 100
                `;
                // Mark as read
                await sql`
                    UPDATE competitor_signals SET is_new = false
                    WHERE track_id = ${trackId} AND is_new = true
                `;
                return { signals };
            });

            if (!result) return json(503, { error: "Database offline" });
            if ((result as any).error === "forbidden") return json(403, { error: "Forbidden: Access denied to this track" });

            return json(200, result);
        }

        // ── GET /notifications?userId=xxx → Unread notification count ──────────────
        if (event.httpMethod === "GET" && path === "notifications") {
            const userId = params.userId;
            if (!userId) return json(400, { error: "userId required" });
            if (callerUserId !== userId) return json(403, { error: "Forbidden" });

            const result = await runQuery(async (sql) => {
                const countRes = await sql`
                    SELECT COUNT(*) as count
                    FROM competitor_signals cs
                    JOIN competitor_tracks ct ON cs.track_id = ct.id
                    WHERE ct.user_id = ${userId} AND cs.is_new = true
                `;

                const recentAlerts = await sql`
                    SELECT cs.*, ct.brand_name
                    FROM competitor_signals cs
                    JOIN competitor_tracks ct ON cs.track_id = ct.id
                    WHERE ct.user_id = ${userId} AND cs.is_new = true
                    ORDER BY cs.detected_at DESC
                    LIMIT 20
                `;
                return { countRes, recentAlerts };
            });
            if (!result) return json(503, { error: "Database offline" });

            return json(200, {
                unreadCount: parseInt(result.countRes[0]?.count || "0"),
                alerts: result.recentAlerts,
            });
        }

        // ── GET /stats?userId=xxx → Effectiveness and scanner metrics ──────────────
        if (event.httpMethod === "GET" && path === "stats") {
            const userId = params.userId;
            if (!userId) return json(400, { error: "userId required" });
            if (callerUserId !== userId) return json(403, { error: "Forbidden" });

            const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

            const res = await runQuery(async (sql) => {
                const signalsQuery = await sql`
                    SELECT 
                      COUNT(*) as count,
                      COALESCE(AVG(relevance_score), 0) as avg_relevance
                    FROM competitor_signals cs
                    JOIN competitor_tracks ct ON cs.track_id = ct.id
                    WHERE ct.user_id = ${userId} AND cs.detected_at > ${dayAgo}
                `;

                const highImpactQuery = await sql`
                    SELECT COUNT(*) as count 
                    FROM competitor_signals cs
                    JOIN competitor_tracks ct ON cs.track_id = ct.id
                    WHERE ct.user_id = ${userId} AND cs.detected_at > ${dayAgo} AND cs.relevance_score >= 80
                `;

                const activeTracks = await sql`
                    SELECT COUNT(*) as count FROM competitor_tracks 
                    WHERE user_id = ${userId} AND is_active = true
                `;
                return { signalsQuery, highImpactQuery, activeTracks };
            });
            if (!res) return json(503, { error: "Database offline" });
            
            const stats = res.signalsQuery[0] || { count: "0", avg_relevance: "0" };
            const highImpactCount = res.highImpactQuery[0]?.count || 0;

            return json(200, {
                signals_24h: parseInt(stats.count || "0"),
                tracks_active: parseInt(res.activeTracks[0]?.count || "0"),
                total_scans_today: parseInt(stats.count || "0") + 1, // rough proxy
                average_relevance: Math.round(parseFloat(stats.avg_relevance || "0")),
                high_impact_signals: parseInt(highImpactCount || "0")
            });
        }

        // ── POST / → Add a new competitor to track ─────────────────────────────────
        if (event.httpMethod === "POST" && (!path || path === "")) {
            const { userId, brandName, searchQuery, networks, country, notifyEmail, notifyInapp, userPlan } = body;

            if (!userId || !brandName || !searchQuery) {
                return json(400, { error: "userId, brandName, and searchQuery are required" });
            }
            if (callerUserId !== userId) return json(403, { error: "Forbidden" });

            const plan = userPlan || "Trial";
            const limit = PLAN_LIMITS[plan] || 1;
            const resCount = await runQuery(async (sql) => {
                return await sql`SELECT COUNT(*) as count FROM competitor_tracks WHERE user_id = ${userId}`;
            });
            if (!resCount) return json(503, { error: "Database offline" });

            if (parseInt(resCount[0]?.count || "0") >= limit) {
                return json(403, {
                    error: `Has alcanzado el límite de ${limit} competidores para tu plan ${plan}.`,
                    limit,
                    plan,
                });
            }

            const id = `ct_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

            await runQuery(async (sql) => {
                await sql`
                    INSERT INTO competitor_tracks (id, user_id, brand_name, search_query, networks, country, is_active, notify_email, notify_inapp, created_at)
                    VALUES (
                      ${id},
                      ${userId},
                      ${brandName},
                      ${searchQuery},
                      ${networks || ["search", "tech"]},
                      ${country || "ALL"},
                      true,
                      ${notifyEmail !== false},
                      ${notifyInapp !== false},
                      ${Date.now()}
                    )
                `;
            });

            return json(201, { success: true, trackId: id });
        }

        // ── DELETE /?trackId=xxx → Remove tracking ─────────────────────────────────
        if (event.httpMethod === "DELETE") {
            const trackId = params.trackId || path.split("/")[0];
            if (!trackId) return json(400, { error: "trackId required" });

            // Verify the track belongs to the caller before deleting
            const owned = await runQuery(async (sql) =>
                await sql`SELECT user_id FROM competitor_tracks WHERE id = ${trackId} LIMIT 1`);
            if (!owned || !owned.length || owned[0].user_id !== callerUserId) {
                return json(403, { error: "Forbidden" });
            }

            // Safe Management Protocol: Soft delete — no physical DELETE FROM competitor_tracks
            await runQuery(async (sql) => await sql`
                UPDATE competitor_tracks SET is_deleted = true WHERE id = ${trackId}
            `);
            // Audit log (Safe Management Protocol)
            await runQuery(async (sql) => await sql`
                INSERT INTO ai_technical_logs (feature, error_message, severity, user_id, request_context)
                VALUES ('competitor_management', 'Authorized Soft Delete of competitor track: ' || ${trackId}, 'info', ${callerUserId}, ${JSON.stringify({ deletedTrackId: trackId })})
            `).catch((err) => console.error("[COMPETITOR] Audit log failed:", err));

            return json(200, {
                success: true,
                message: 'Seguimiento archivado. Las señales históricas se conservan para análisis retroactivo.'
            });
        }

        return json(405, { error: "Method not allowed" });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-competitor-tracker]", message);
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};

export { handler };
