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
        await runMigrations().catch(err => console.error("[POLICE-CAMPAIGNS] Migrations failed:", err));
        migrationsRan = true;
    }

    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const callerUserId = event.headers['x-user-id'] || event.headers['X-User-Id'] || authHeader.replace('Bearer ', '') || '';
    
    if (!callerUserId) {
        return json(401, { error: "Unauthorized: Missing identity" });
    }

    try {
        if (event.httpMethod === "GET") {
            const campaigns = await runQuery(sql =>
                sql`SELECT * FROM police_campaigns 
                    WHERE user_id = ${callerUserId} AND (is_deleted IS NULL OR is_deleted = false) 
                    ORDER BY created_at DESC`
            );

            return json(200, campaigns || []);
        }

        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || "{}");
            const { 
                id, organization_id, client_id, platform_account_id, 
                name, platform, budget, max_budget_allowed, 
                status, country, channel, objective, product, year 
            } = body;

            if (!id || !organization_id || !client_id || !platform_account_id || !name || !platform || !budget) {
                return json(400, { error: "Missing required fields" });
            }

            const timestamp = Date.now();

            await runQuery(sql => sql`
                INSERT INTO police_campaigns (
                    id, user_id, organization_id, client_id, platform_account_id, 
                    name, platform, budget, max_budget_allowed, status, 
                    country, channel, objective, product, year, 
                    created_at, updated_at
                ) VALUES (
                    ${id}, ${callerUserId}, ${organization_id}, ${client_id}, ${platform_account_id},
                    ${name}, ${platform}, ${budget}, ${max_budget_allowed || budget}, ${status || 'draft'},
                    ${country}, ${channel}, ${objective}, ${product}, ${year},
                    ${timestamp}, ${timestamp}
                ) ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    platform = EXCLUDED.platform,
                    budget = EXCLUDED.budget,
                    max_budget_allowed = EXCLUDED.max_budget_allowed,
                    status = EXCLUDED.status,
                    country = EXCLUDED.country,
                    channel = EXCLUDED.channel,
                    objective = EXCLUDED.objective,
                    product = EXCLUDED.product,
                    year = EXCLUDED.year,
                    updated_at = EXCLUDED.updated_at
            `);

            return json(200, { success: true, id });
        }

        return json(404, { error: "Endpoint not found" });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-police-campaigns] Error:", message);
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
