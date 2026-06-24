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
        await runMigrations().catch(err => console.error("[POLICE-ALERTS] Migrations failed:", err));
        migrationsRan = true;
    }

    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const callerUserId = getUserIdFromHeaders(event.headers);
    
    if (!callerUserId) {
        return json(401, { error: "Unauthorized: Missing identity" });
    }

    try {
        if (event.httpMethod === "GET") {
            const alerts = await runQuery(sql =>
                sql`SELECT * FROM police_alerts 
                    WHERE user_id = ${callerUserId} AND (is_deleted IS NULL OR is_deleted = false) 
                    ORDER BY created_at DESC`
            );

            return json(200, alerts || []);
        }

        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || "{}");
            const { 
                id, campaign_id, organization_id, type, severity, message, 
                budget, max_allowed, exceeded_by 
            } = body;

            if (!id || !campaign_id || !organization_id || !type || !severity || !message) {
                return json(400, { error: "Missing required fields" });
            }

            const timestamp = Date.now();

            await runQuery(sql => sql`
                INSERT INTO police_alerts (
                    id, campaign_id, user_id, organization_id, type, severity, message,
                    budget, max_allowed, exceeded_by, created_at, updated_at
                ) VALUES (
                    ${id}, ${campaign_id}, ${callerUserId}, ${organization_id}, ${type}, ${severity}, ${message},
                    ${budget || null}, ${max_allowed || null}, ${exceeded_by || null}, ${timestamp}, ${timestamp}
                )
            `);

            return json(200, { success: true, id });
        }

        return json(404, { error: "Endpoint not found" });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-police-alerts] Error:", message);
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
