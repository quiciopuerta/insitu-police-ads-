import { getUserIdFromHeaders } from "./_lib/authMiddleware";
import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { getCorsHeaders } from "./_lib/corsHelper";
import { checkRateLimit, getClientIp } from "./_lib/rateLimiter";
import { sanitizeXSS } from "./_lib/sanitizer";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "";



const handler: Handler = async (event: HandlerEvent) => {
    const origin = event.headers.origin;
    const CORS = getCorsHeaders(origin);
    const json = (statusCode: number, body: unknown) => ({
        statusCode,
        headers: CORS,
        body: JSON.stringify(body),
    });

    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

    // Auth logic (similar to other admin functions)
    const authHeader = event.headers["authorization"] || event.headers["Authorization"] || "";
    const xUserId = getUserIdFromHeaders(event.headers);
    
    let isAuthorized = ADMIN_SECRET !== "" && authHeader === `Bearer ${ADMIN_SECRET}`;
    let callerRole = "";
    
    if (!isAuthorized && xUserId) {
        const roleRows = await runQuery(async (sql) => await sql`SELECT role FROM users WHERE id = ${xUserId} LIMIT 1`);
        if (roleRows && roleRows.length > 0) {
            callerRole = roleRows[0].role;
            isAuthorized = callerRole === "admin" || callerRole === "superAdmin";
        }
    }

    if (!isAuthorized) {
        return json(401, { error: "Unauthorized" });
    }

    // Safe Management Protocol: Only superAdmin or ADMIN_SECRET can delete
    const isSuperPrivileged = (ADMIN_SECRET !== "" && authHeader === `Bearer ${ADMIN_SECRET}`) || callerRole === "superAdmin";

    // Rate limiting: 50 requests per 15 minutes per authenticated user
    const clientIp = getClientIp(event);
    const rateLimitKey = `leads:${xUserId || clientIp}`;
    const rateLimit = await checkRateLimit(rateLimitKey, { windowMs: 15 * 60 * 1000, max: 50 });
    if (!rateLimit.success) {
        return json(429, { error: "Too many requests. Please try again later." });
    }

    try {
        if (event.httpMethod === "GET") {
            const rows = await runQuery(async (sql) => 
                await sql`SELECT * FROM leads WHERE (is_deleted IS NULL OR is_deleted = false) ORDER BY created_at DESC NULLS LAST`
            );
            
            if (rows === null) return json(503, { error: "Database offline" });
            
            return json(200, rows);
        }

        if (event.httpMethod === "POST") {
            const body = event.body ? JSON.parse(event.body) : {};
            const { name, email, role, budget, goals, website, notes } = body;

            if (!email) return json(400, { error: "Email is required" });

            // Input validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return json(400, { error: "Invalid email format" });
            }

            if (name && name.length > 100) {
                return json(400, { error: "Name too long (max 100 chars)" });
            }

            if (notes && notes.length > 2000) {
                return json(400, { error: "Notes too long (max 2000 chars)" });
            }

            if (website) {
                try {
                    new URL(website.startsWith('http') ? website : `https://${website}`);
                } catch {
                    return json(400, { error: "Invalid website URL" });
                }
            }

            const id = Math.random().toString(36).substr(2, 9);
            const createdAt = Date.now();

            // Sanitize inputs to prevent XSS
            const sanitizedName = sanitizeXSS(name);
            const sanitizedEmail = sanitizeXSS(email);
            const sanitizedRole = role ? sanitizeXSS(role) : null;
            const sanitizedBudget = budget ? sanitizeXSS(budget) : null;
            const sanitizedGoals = goals ? sanitizeXSS(goals) : null;
            const sanitizedWebsite = website ? sanitizeXSS(website) : null;
            const sanitizedNotes = notes ? sanitizeXSS(notes) : null;

            await runQuery(async (sql) => await sql`
                INSERT INTO leads (id, name, email, role, budget, goals, website, notes, created_at, status)
                VALUES (${id}, ${sanitizedName}, ${sanitizedEmail}, ${sanitizedRole}, ${sanitizedBudget}, ${sanitizedGoals}, ${sanitizedWebsite}, ${sanitizedNotes}, ${createdAt}, 'new')
            `);

            return json(201, { success: true, id });
        }

        // ── DELETE /api/leads/:leadId (Soft Delete) ──────────
        if (event.httpMethod === "DELETE") {
            const leadId = event.path.split("/").pop();
            if (!leadId || leadId === "leads") return json(400, { error: "leadId required" });

            if (!isSuperPrivileged) {
                return json(403, { error: "Solo un SuperAdmin o Desarrollador puede borrar leads." });
            }

            await runQuery(async (sql) => await sql`UPDATE leads SET is_deleted = true, deleted_at = ${Date.now()} WHERE id = ${leadId}`);
            
            // Log audit (Safe Management Protocol)
            await runQuery(async (sql) => await sql`
                INSERT INTO ai_technical_logs (feature, error_message, severity, user_id, request_context)
                VALUES ('lead_management', 'Authorized Soft Delete of lead ID: ' || ${leadId}, 'info', ${xUserId || 'system'}, ${JSON.stringify({ deletedLeadId: leadId })})
            `).catch((err) => console.error("[api-leads] Audit log failed:", err));

            return json(200, { success: true, message: "Lead marcado como eliminado" });
        }

        return json(405, { error: "Method not allowed" });
    } catch (err: unknown) {
        console.error("[api-leads]", err instanceof Error ? err.message : String(err));
        return json(500, { error: "Internal server error" });
    }
};

export { handler };
