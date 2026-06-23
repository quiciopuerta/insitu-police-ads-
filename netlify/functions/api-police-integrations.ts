import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError } from "./_lib/errorHandler";
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
        await runMigrations().catch(err => console.error("[POLICE-INTEGRATIONS] Migrations failed:", err));
        migrationsRan = true;
    }

    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const callerUserId = event.headers['x-user-id'] || event.headers['X-User-Id'] || authHeader.replace('Bearer ', '') || '';
    
    if (!callerUserId) {
        return json(401, { error: "Unauthorized: Missing identity" });
    }

    try {
        if (event.httpMethod === "GET") {
            const integrations = await runQuery(sql =>
                sql`SELECT * FROM police_integrations 
                    WHERE user_id = ${callerUserId} AND (is_deleted IS NULL OR is_deleted = false) 
                    ORDER BY created_at DESC`
            );

            return json(200, integrations || []);
        }

        return json(404, { error: "Endpoint not found" });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-police-integrations] Error:", message);
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
