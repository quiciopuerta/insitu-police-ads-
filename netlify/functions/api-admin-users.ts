import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError, logError } from "./_lib/errorHandler";
import { runMigrations } from "./_lib/migrations";
import { getCorsHeaders } from "./_lib/corsHelper";
import { scryptSync, randomBytes } from "node:crypto";
import { sendEmail, approvalEmail, invitationEmail } from "./_lib/mailService";

function hashPassword(plain: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(plain, salt, 64).toString("hex");
    return `scrypt:${salt}:${hash}`;
}

const DB_URL =
    process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || "";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";



    const handler: Handler = async (event: HandlerEvent) => {
    const origin = event.headers.origin;
    const json = (statusCode: number, body: unknown) => ({
        statusCode,
        headers: getCorsHeaders(origin),
        body: JSON.stringify(body),
    });

    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: getCorsHeaders(origin), body: "" };

    // Auth: ADMIN_SECRET (scripts/CLI) OR logged-in admin user (frontend)
    const authHeader = event.headers["authorization"] || event.headers["Authorization"] || event.headers["x-admin-key"] || "";
    const xUserId = event.headers["x-user-id"] || event.headers["X-User-Id"] || "";
    
    let isAuthorized = ADMIN_SECRET !== "" && authHeader === `Bearer ${ADMIN_SECRET}`;
    
    if (!isAuthorized && xUserId) {
        const roleRows = await runQuery(async (sql) => await sql`SELECT role, username FROM users WHERE id = ${xUserId} LIMIT 1`);
        if (roleRows && roleRows.length > 0) {
            isAuthorized = roleRows[0].role === "admin" || roleRows[0].role === "superAdmin";
            if (!isAuthorized) console.warn(`[ADMIN] User ${roleRows[0].username} (${xUserId}) attempted admin access with role: ${roleRows[0].role}`);
        } else {
            console.warn(`[ADMIN] Attempt with unknown x-user-id: ${xUserId}`);
        }
    }

    if (!isAuthorized) {
        console.warn(`[ADMIN] 401 Unauthorized attempt - Path: ${event.path}, AuthHeader: ${authHeader ? 'Present' : 'Missing'}, XUserId: ${xUserId || 'Missing'}`);
        return json(401, { error: "Unauthorized" });
    }

    // Verificación adicional de privilegios para borrado
    const isSuperPrivileged = (ADMIN_SECRET !== "" && authHeader === `Bearer ${ADMIN_SECRET}`) ||
                             (await runQuery(async (sql) => {
                                 const r = await sql`SELECT role FROM users WHERE id = ${xUserId} LIMIT 1`;
                                 return r?.[0]?.role === "superAdmin";
                             }));

    await runMigrations().catch(err => console.error("[ADMIN] Migrations failed:", err));

    const path = event.path.replace(/^\/api\/admin\/users\/?/, "");
    const body = event.body ? JSON.parse(event.body) : {};

    try {
        // ── GET /api/admin/users ────────────────────────────────────
        if (event.httpMethod === "GET") {
            const rows = await runQuery(async (sql) => await sql`SELECT * FROM users WHERE is_deleted = false ORDER BY last_login DESC NULLS LAST`);
            if (rows === null) return json(503, { error: "Database offline" });
            const users = rows.map((u: any) => {
                const { password, recoveryCode, recoveryCodeExpiry, ...safeUser } = u;
                return {
                    ...safeUser,
                    firstName: u.first_name || u.firstName || "",
                    lastName: u.last_name || u.lastName || "",
                    lastLogin: u.last_login || u.lastLogin,
                    approvalStatus: u.approval_status || u.approvalStatus,
                    usageLimit: u.usage_limit || u.usageLimit,
                    totalTokensUsed: u.total_tokens_used || u.totalTokensUsed,
                    subscription: safeJson(u.subscription, {}),
                    usageHistory: safeJson(u.usage_history || u.usageHistory, []),
                    brandProfile: safeJson(u.brand_profile || u.brandProfile, {}),
                    brandProfiles: safeJson(u.brand_profiles || u.brandProfiles, []),
                };
            });
            return json(200, users);
        }

        // ── POST /api/admin/users/approve ──────────────────────────
        if (event.httpMethod === "POST" && path === "approve") {
            const userRows = await runQuery(async (sql) =>
                await sql`SELECT email, first_name, username FROM users WHERE id = ${body.userId}`);
            await runQuery(async (sql) =>
                await sql`UPDATE users SET approval_status = 'approved' WHERE id = ${body.userId}`);
            if (userRows?.length) {
                const u = userRows[0];
                const firstName = u.first_name || u.firstName || u.username || 'Usuario';
                await sendEmail(u.email, '✅ Tu cuenta INsitu AI ha sido activada', approvalEmail(firstName));
            }
            return json(200, { success: true });
        }

        // ── POST /api/admin/users/reject ───────────────────────────
        if (event.httpMethod === "POST" && path === "reject") {
            await runQuery(async (sql) => await sql`UPDATE users SET approval_status = 'rejected' WHERE id = ${body.userId}`);
            return json(200, { success: true });
        }

        // ── POST /api/admin/users/update-limit ─────────────────────
        if (event.httpMethod === "POST" && path === "update-limit") {
            await runQuery(async (sql) => await sql`UPDATE users SET usage_limit = ${body.newLimit} WHERE id = ${body.userId}`);
            return json(200, { success: true });
        }

        // ── POST /api/admin/users/set-plan ─────────────────────────
        if (event.httpMethod === "POST" && path === "set-plan") {
            const prices: Record<string, number> = { Starter: 19, Growth: 49, Agency: 149, Trial: 0 };
            const limits: Record<string, number> = { Starter: 500, Growth: 5000, Agency: 50000, Trial: 100 };
            const rows = await runQuery(async (sql) => await sql`SELECT subscription FROM users WHERE id = ${body.userId}`);
            if (!rows) return json(503, { error: "Database offline" });
            if (!rows.length) return json(404, { error: "User not found" });
            const current = safeJson(rows[0].subscription, {});
            const updated = JSON.stringify({
                ...current,
                status: "active",
                plan: body.plan,
                price: prices[body.plan] ?? 0,
                expiryDate: Date.now() + 1000 * 60 * 60 * 24 * 30,
                paymentMethod: "Manual",
            });
            await runQuery(async (sql) => await sql`
                UPDATE users SET subscription = ${updated}, approval_status = 'approved'
                WHERE id = ${body.userId}
            `);
            return json(200, { success: true, subscription: JSON.parse(updated) });
        }

        // ── POST /api/admin/users/invite ───────────────────────────
        if (event.httpMethod === "POST" && path === "invite") {
            const { email, role, plan, username } = body;
            const existing = await runQuery(async (sql) => await sql`SELECT id FROM users WHERE email = ${email}`);
            if (existing && existing.length) return json(400, { error: "Este correo ya está registrado." });

            const prices: Record<string, number> = { Starter: 19, Growth: 49, Agency: 149 };
            const limits: Record<string, number> = { Starter: 500, Growth: 5000, Agency: 50000 };
            const id = Math.random().toString(36).substr(2, 9);
            const tempPasswordPlain = "Temp" + Math.floor(1000 + Math.random() * 9000);
            const tempPassword = hashPassword(tempPasswordPlain);
            const subscription = JSON.stringify({ status: "inactive", plan, price: prices[plan] ?? 0, expiryDate: 0 });

            await runQuery(async (sql) => await sql`
                INSERT INTO users (id, username, password, email, role, approval_status, picture, last_login, subscription, usage_limit, brand_profiles)
                VALUES (
                  ${id},
                  ${username || email.split("@")[0]},
                  ${tempPassword},
                  ${email},
                  ${role || "user"},
                  'invited',
                  ${"https://ui-avatars.com/api/?name=" + email[0].toUpperCase() + "&background=6366f1&color=fff"},
                  ${0},
                  ${subscription},
                  ${limits[plan] ?? 500},
                  '[]'
                )
            `);
            await sendEmail(email, '🎉 Has sido invitado a INsitu AI', invitationEmail(username || email.split('@')[0], email, tempPasswordPlain, plan || 'Starter'));
            return json(200, { success: true, userId: id });
        }

        // ── POST /api/admin/users/update ───────────────────────────
        if (event.httpMethod === "POST" && path === "update") {
            const { userId, updates } = body;
            const ALLOWED_COLUMNS = new Set(['plan', 'tokens_remaining', 'tokens_total', 'status', 'white_label_enabled', 'white_label_config', 'last_active', 'password', 'subscription', 'usage_history', 'usage_limit', 'brand_profile', 'brand_profiles', 'approval_status', 'first_name', 'last_name', 'username', 'avatar', 'bonus_tokens', 'total_bonus_earned']);
            const jsonFields = ["subscription", "usage_history", "brand_profile", "brand_profiles"];
            for (const [key, value] of Object.entries(updates ?? {})) {
                if (!ALLOWED_COLUMNS.has(key)) continue;
                const val = key === "password"
                    ? hashPassword(value as string)
                    : jsonFields.includes(key) ? JSON.stringify(value) : value;
                await runQuery(async (sql) => await sql.unsafe(
                    `UPDATE users SET "${key}" = $1 WHERE id = $2`,
                    [val, userId]
                ));
            }
            return json(200, { success: true });
        }

        // ── DELETE /api/admin/users/:userId (Soft Delete) ──────────
        if (event.httpMethod === "DELETE") {
            const userId = path.split("/")[0];
            if (!userId) return json(400, { error: "userId required" });
            
            if (!isSuperPrivileged) {
                return json(403, { error: "Solo un SuperAdmin o Desarrollador puede borrar usuarios." });
            }

            await runQuery(async (sql) => await sql`UPDATE users SET is_deleted = true, deleted_at = ${Date.now()} WHERE id = ${userId}`);
            
            // Log audit
            await runQuery(async (sql) => await sql`
                INSERT INTO ai_technical_logs (feature, error_message, severity, user_id, request_context)
                VALUES ('user_management', 'Authorized Soft Delete of user ID: ' || ${userId}, 'info', ${xUserId || 'system'}, ${JSON.stringify({ deletedUserId: userId })})
            `);

            return json(200, { success: true, message: "Usuario marcado como eliminado" });
        }

        return json(405, { error: "Method not allowed" });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-admin-users]", message);
        return json(500, { error: message });
    }
};

function safeJson(val: unknown, fallback: unknown) {
    try {
        return typeof val === "string" ? JSON.parse(val) : (val ?? fallback);
    } catch {
        return fallback;
    }
}

export { handler };
