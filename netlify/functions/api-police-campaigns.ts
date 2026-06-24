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
        // Resolve extension session token or direct user ID to user.id
        let userId = callerUserId;
        const userResult = await runQuery(sql => sql`
            SELECT id, role FROM users 
            WHERE id = ${callerUserId} 
               OR extension_session_token = ${callerUserId}
        `);
        
        if (userResult && userResult.length > 0) {
            userId = userResult[0].id;
        } else {
            return json(401, { error: "Unauthorized: Invalid user identity or token" });
        }

        const userRole = userResult[0].role || 'mediaPlanner';
        const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

        if (event.httpMethod === "GET") {
            const orgId = event.queryStringParameters?.organization_id;
            if (!orgId) {
                // Backward compatibility: fetch by user_id if no org provided
                const campaigns = await runQuery(sql =>
                    sql`SELECT * FROM police_campaigns 
                        WHERE user_id = ${userId} AND (is_deleted IS NULL OR is_deleted = false) 
                        ORDER BY created_at DESC`
                );
                return json(200, campaigns || []);
            }

            // Verify access
            let orgs = await runQuery(sql => sql`SELECT id FROM police_organizations WHERE id = ${orgId} AND owner_id = ${userId}`);
            if (!orgs || orgs.length === 0) {
                const userOrg = await runQuery(sql => sql`SELECT organization_id FROM users WHERE id = ${userId} AND organization_id = ${orgId}`);
                if (userOrg && userOrg.length > 0) {
                    orgs = [{ id: orgId }];
                }
            }
            if (!orgs || orgs.length === 0) {
                return json(403, { error: "Forbidden: You don't have access to this organization" });
            }

            let clientIdsFilter: string[] = [];
            let accountIdsFilter: string[] = [];
            if (!isAdmin) {
                const asgs = await runQuery(sql => sql`
                    SELECT client_id, platform_account_id FROM police_user_assignments 
                    WHERE user_id = ${userId} AND organization_id = ${orgId}
                `);
                clientIdsFilter = (asgs || []).filter(a => a.client_id).map(a => a.client_id);
                accountIdsFilter = (asgs || []).filter(a => a.platform_account_id).map(a => a.platform_account_id);
            }

            const campaigns = await runQuery(sql => {
                if (!isAdmin) {
                    return sql`
                        SELECT * FROM police_campaigns 
                        WHERE organization_id = ${orgId} 
                          AND (client_id = ANY(${clientIdsFilter}) OR platform_account_id = ANY(${accountIdsFilter}))
                          AND (is_deleted IS NULL OR is_deleted = false) 
                        ORDER BY created_at DESC
                    `;
                }
                return sql`
                    SELECT * FROM police_campaigns 
                    WHERE organization_id = ${orgId} AND (is_deleted IS NULL OR is_deleted = false) 
                    ORDER BY created_at DESC
                `;
            });

            return json(200, campaigns || []);
        }

        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || "{}");
            const timestamp = Date.now();
            
            const insertCampaigns = async (campaignsArray: any[]) => {
                for (const camp of campaignsArray) {
                    const { 
                        id, organization_id, client_id, platform_account_id, 
                        name, platform, budget, max_budget_allowed, 
                        status, country, channel, objective, product, year 
                    } = camp;

                    if (!id || !organization_id || !client_id || !platform_account_id || !name || !platform || budget === undefined) {
                        continue;
                    }

                    // Simple access check for POST
                    if (!isAdmin) {
                        const asgs = await runQuery(sql => sql`
                            SELECT client_id, platform_account_id FROM police_user_assignments 
                            WHERE user_id = ${userId} AND organization_id = ${organization_id}
                        `);
                        const allowedClients = (asgs || []).filter(a => a.client_id).map(a => a.client_id);
                        const allowedAccounts = (asgs || []).filter(a => a.platform_account_id).map(a => a.platform_account_id);
                        
                        if (!allowedClients.includes(client_id) && !allowedAccounts.includes(platform_account_id)) {
                            // User not allowed to create campaigns for this client/account
                            continue;
                        }
                    }

                    await runQuery(sql => sql`
                        INSERT INTO police_campaigns (
                            id, user_id, organization_id, client_id, platform_account_id, 
                            name, platform, budget, max_budget_allowed, status, 
                            country, channel, objective, product, year, 
                            created_at, updated_at
                        ) VALUES (
                            ${id}, ${userId}, ${organization_id}, ${client_id}, ${platform_account_id},
                            ${name}, ${platform}, ${Number(budget) || 0}, ${Number(max_budget_allowed) || Number(budget) || 0}, ${status || 'draft'},
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
                }
            };

            if (Array.isArray(body)) {
                await insertCampaigns(body);
                return json(200, { success: true, count: body.length });
            } else {
                if (!body.id || !body.organization_id || !body.client_id || !body.platform_account_id || !body.name || !body.platform || body.budget === undefined) {
                    return json(400, { error: "Missing required fields" });
                }
                await insertCampaigns([body]);
                return json(200, { success: true, id: body.id });
            }
        }

        return json(404, { error: "Endpoint not found" });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-police-campaigns] Error:", message);
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
