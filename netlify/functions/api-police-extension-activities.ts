import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";
import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError } from "./_lib/errorHandler";
import { runMigrations } from "./_lib/migrations";

const json = (status: number, body: unknown) => ({
    statusCode: status,
    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
    body: JSON.stringify(body),
});

let migrationsRan = false;

export const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: "" };

    if (!migrationsRan) {
        await runMigrations().catch(err => console.error("[EXTENSION-ACTIVITIES] Migrations failed:", err));
        migrationsRan = true;
    }

    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const callerUserId = getUserIdFromHeaders(event.headers);
    if (!callerUserId) return json(401, { error: "Unauthorized: Missing identity" });

    try {
        // Resolve extension session token or direct user ID to user.id
        let userId = callerUserId;
        const userResult = await runQuery(sql => sql`
            SELECT id FROM users 
            WHERE id = ${callerUserId} 
               OR extension_session_token = ${callerUserId}
        `);
        
        if (userResult && userResult.length > 0) {
            userId = userResult[0].id;
        } else {
            return json(401, { error: "Unauthorized: Invalid user identity or token" });
        }

        if (event.httpMethod === "GET") {
            // Get all activities for the user, with resolved user emails and client names
            const activities = await runQuery(sql =>
                sql`SELECT a.*, u.email as user_email, c.name as client_name
                    FROM police_extension_activities a
                    JOIN users u ON a.user_id = u.id
                    LEFT JOIN police_clients c ON a.client_id = c.id
                    WHERE a.user_id = ${userId} AND (a.is_deleted IS NULL OR a.is_deleted = false)
                    ORDER BY a.created_at DESC`
            );

            return json(200, activities || []);
        }

        if (event.httpMethod === "POST") {
            // Parse JSON body helper (handles base64 encoding from Netlify)
            const parseBody = () => {
                if (!event.body) return {};
                try {
                    const decoded = event.isBase64Encoded 
                        ? Buffer.from(event.body, 'base64').toString('utf8')
                        : event.body;
                    return JSON.parse(decoded || "{}");
                } catch (e) {
                    console.error("JSON parse error:", e);
                    return {};
                }
            };

            const body = parseBody();
            const { 
                client_id, brand, activity_type, platform, campaign_name, 
                budget, budget_type, start_date, end_date, objective,
                max_budget_allowed, status, utm_url, campaign_id, adset_id, ad_id 
            } = body;

            if (!activity_type || !platform || !campaign_name) {
                return json(400, { error: "Missing required fields (activity_type, platform, campaign_name)" });
            }

            const timestamp = Date.now();

            await runQuery(sql => sql`
                INSERT INTO police_extension_activities (
                    user_id, client_id, brand, activity_type, platform, campaign_name,
                    budget, budget_type, start_date, end_date, objective, 
                    max_budget_allowed, status, utm_url, campaign_id, adset_id, ad_id,
                    created_at
                ) VALUES (
                    ${userId}, ${client_id || null}, ${brand || null}, ${activity_type}, ${platform}, ${campaign_name},
                    ${budget ? Number(budget) : null}, ${budget_type || null}, ${start_date || null}, ${end_date || null}, ${objective || null},
                    ${max_budget_allowed ? Number(max_budget_allowed) : null}, ${status || null}, ${utm_url || null},
                    ${campaign_id || null}, ${adset_id || null}, ${ad_id || null},
                    ${timestamp}
                )
            `);

            return json(200, { success: true });
        }

        return json(404, { error: "Endpoint not found" });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-police-extension-activities] Error:", message);
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
