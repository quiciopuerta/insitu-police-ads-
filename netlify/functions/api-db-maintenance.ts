import { getCorsHeaders } from "./_lib/corsHelper";
/**
 * api-db-maintenance.ts — Netlify Scheduled Function + Health Endpoint
 *
 * Scheduled: runs daily at 03:00 UTC (configured in netlify.toml)
 *   - Prunes usageHistory per user (keeps last 30 entries)
 *   - Soft-deletes rejected/expired users older than 60 days (Safe Management Protocol)
 *   - Reports row counts and emails admin if DB looks unhealthy
 *
 * On-demand (GET /api/db/health):
 *   - Returns circuit status, row counts, and last maintenance timestamp
 *   - Used by the admin dashboard to monitor DB health
 */
import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery, getCircuitStatus, resetCircuit } from "./_lib/db";
import nodemailer from "nodemailer";

const json = (status: number, body: unknown) => ({
    statusCode: status,
    headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
    body: JSON.stringify(body),
});

// ── Email ──────────────────────────────────────────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST || "mail.insitu.company";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER || "ia@insitu.company";
const SMTP_PASS = process.env.SMTP_PASS || "";
const ADMIN_EMAIL = process.env.ADMIN_ALERT_EMAIL || "ia@insitu.company";
const APP_URL = process.env.APP_URL || "https://insitu.company";

async function sendAlertEmail(subject: string, html: string) {
    if (!SMTP_PASS) return;
    try {
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: true,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
            tls: { rejectUnauthorized: false },
        });
        await transporter.sendMail({
            from: `"INsitu AI Monitor" <${SMTP_USER}>`,
            to: ADMIN_EMAIL,
            subject,
            html,
        });
        console.log(`[MAINTENANCE] Alert email sent: ${subject}`);
    } catch (err) {
        console.error("[MAINTENANCE] Failed to send alert email:", err);
    }
}

// ── Maintenance tasks ──────────────────────────────────────────────────────────

/** Trim usageHistory to the last 30 entries per user to prevent row bloat. */
async function pruneUsageHistory(): Promise<number> {
    const rows = await runQuery(async (sql) =>
        sql`SELECT id, "usageHistory" FROM users WHERE "usageHistory" IS NOT NULL`
    );
    if (!rows || rows.length === 0) return 0;

    let pruned = 0;
    for (const row of rows) {
        try {
            const history = typeof row.usageHistory === "string"
                ? JSON.parse(row.usageHistory)
                : (row.usageHistory ?? []);

            if (!Array.isArray(history) || history.length <= 30) continue;

            const trimmed = history.slice(-30);
            await runQuery(async (sql) =>
                sql`UPDATE users SET "usageHistory" = ${JSON.stringify(trimmed)} WHERE id = ${row.id}`
            );
            pruned++;
        } catch {
            // skip malformed rows
        }
    }
    return pruned;
}

/**
 * Soft-delete users that were rejected or never activated,
 * and whose account is older than 60 days (based on lastLogin = 0 or very old).
 * Safe Management Protocol: no physical DELETE — uses is_deleted flag + audit log.
 */
async function deleteStaleUsers(): Promise<number> {
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 days ago
    const staleUsers = await runQuery(async (sql) =>
        sql`SELECT id FROM users
            WHERE "approvalStatus" IN ('rejected', 'pending')
            AND ("lastLogin" = 0 OR "lastLogin" < ${cutoff})
            AND (is_deleted IS NULL OR is_deleted = false)`
    );
    if (!staleUsers || staleUsers.length === 0) return 0;

    for (const user of staleUsers) {
        await runQuery(async (sql) => sql`UPDATE users SET is_deleted = true, deleted_at = ${Date.now()} WHERE id = ${user.id}`);
        // Audit log (Safe Management Protocol: use ai_technical_logs)
        await runQuery(async (sql) => sql`
            INSERT INTO ai_technical_logs (feature, error_message, severity, user_id, request_context)
            VALUES ('maintenance', ${'SOFT_DELETE_STALE_USER: ' + user.id}, 'info', 'system', 
                    ${JSON.stringify({ target_id: user.id, reason: 'Stale account >60 days', cutoff })})
        `).catch((err) => console.error("[MAINTENANCE] Audit log failed:", err));
    }
    return staleUsers.length;
}

/** 
 * Physically delete notifications and engagement events older than 30 days. 
 * User Preference: "estas notificaciones solo deberia permanecer 30 dias luego borrar por completo"
 * because they are already sent via email.
 */
async function pruneOldNotifications(): Promise<number> {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    
    // 1. Delete related engagement events first to maintain referential integrity
    await runQuery(async (sql) => sql`
        DELETE FROM engagement_events 
        WHERE notification_id IN (
            SELECT id FROM notifications WHERE created_at < ${cutoff}
        )
    `);

    // 2. Physically delete the notifications
    const result = await runQuery(async (sql) => sql`
        DELETE FROM notifications 
        WHERE created_at < ${cutoff}
    `);
    
    return (result as any)?.count || 0;
}

/** Get basic stats for health reporting. */
async function getStats() {
    const counts = await runQuery(async (sql) =>
        sql`SELECT
            COUNT(*) FILTER (WHERE "approvalStatus" = 'approved') AS active,
            COUNT(*) FILTER (WHERE "approvalStatus" = 'pending')  AS pending,
            COUNT(*) FILTER (WHERE "approvalStatus" = 'rejected') AS rejected,
            COUNT(*) AS total
        FROM users`
    );
    return counts?.[0] ?? null;
}

// ── Handler ────────────────────────────────────────────────────────────────────
export const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: "" };

    const isScheduled = !event.httpMethod || event.httpMethod === "GET" && event.path?.includes("db-maintenance");
    const isHealthCheck = event.httpMethod === "GET";

    // ── GET /api/db/health — lightweight status for admin dashboard ────────────
    if (isHealthCheck) {
        const circuit = getCircuitStatus();
        const stats = await getStats();
        return json(200, {
            ok: !circuit.open && stats !== null,
            circuit,
            stats,
            timestamp: new Date().toISOString(),
        });
    }

    // ── Scheduled / manual maintenance run ────────────────────────────────────
    if (event.httpMethod === "POST" || isScheduled) {
        const circuit = getCircuitStatus();
        if (circuit.open) {
            console.warn("[MAINTENANCE] Circuit is open — skipping maintenance, DB likely unavailable.");
            return json(503, { error: "DB circuit open", circuit });
        }

        console.log("[MAINTENANCE] Starting daily maintenance...");
        const startedAt = Date.now();
        
        // Execute tasks
        const [prunedUsage, deletedUsers, deletedNotifs, stats] = await Promise.all([
            pruneUsageHistory(),
            deleteStaleUsers(),
            pruneOldNotifications(),
            getStats(),
        ]);

        const elapsed = Date.now() - startedAt;
        const report = {
            prunedUsageHistory: prunedUsage,
            deletedStaleUsers: deletedUsers,
            deletedNotifications: deletedNotifs,
            stats,
            durationMs: elapsed,
            timestamp: new Date().toISOString(),
        };

        console.log("[MAINTENANCE] Complete:", report);

        // Alert admin if we deleted stale users or the DB looks unhealthy
        const totalUsers = parseInt(stats?.total ?? "0", 10);
        const shouldAlert = deletedUsers > 0 || !stats;

        if (shouldAlert) {
            await sendAlertEmail(
                `[INsitu AI] DB Maintenance Report — ${new Date().toLocaleDateString("es-ES")}`,
                `<div style="font-family:sans-serif;background:#020617;color:#e2e8f0;padding:24px;border-radius:12px;max-width:500px">
                    <h2 style="color:#ff477b">🛠 Reporte de Mantenimiento DB</h2>
                    <p><strong>Fecha:</strong> ${new Date().toLocaleString("es-ES", { timeZone: "America/Bogota" })}</p>
                    <ul>
                        <li>✂️ Historiales podados: <strong>${prunedUsage}</strong> usuarios</li>
                        <li>🗑 Usuarios obsoletos eliminados: <strong>${deletedUsers}</strong></li>
                        <li>🔕 Notificaciones antiguas (>30d) borradas: <strong>${deletedNotifs}</strong></li>
                        <li>👥 Total usuarios activos: <strong>${stats?.active ?? "N/A"}</strong> / ${totalUsers}</li>
                        <li>⏱ Duración: <strong>${elapsed}ms</strong></li>
                    </ul>
                    ${!stats ? '<p style="color:#ef4444">⚠️ <strong>No se pudo obtener estadísticas de la BD.</strong> Revisar conexión.</p>' : ""}
                    <p><a href="${APP_URL}/?admin=true" style="color:#ff477b">Ir al Admin Panel →</a></p>
                </div>`
            );
        }

        // If circuit was previously open but maintenance succeeded, reset it
        if (circuit.open) resetCircuit();

        return json(200, report);
    }

    return json(405, { error: "Method not allowed" });
};
