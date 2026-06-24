import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";
import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError } from "./_lib/errorHandler";
import { runMigrations } from "./_lib/migrations";

let migrationsRan = false;

export const handler: Handler = async (event: HandlerEvent) => {
    const origin = event.headers.origin || event.headers.Origin;
    const json = (status: number, body: unknown) => ({
        statusCode: status,
        headers: getCorsHeaders(origin),
        body: JSON.stringify(body),
    });

    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: getCorsHeaders(origin), body: "" };

    if (!migrationsRan) {
        await runMigrations().catch(err => console.error("[POLICE-POLICIES] Migrations failed:", err));
        migrationsRan = true;
    }

    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const callerUserId = getUserIdFromHeaders(event.headers);
    
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
            const clientId = event.queryStringParameters?.client_id;
            const accountId = event.queryStringParameters?.platform_account_id;
            if (!orgId) return json(400, { error: "Missing organization_id" });

            // Ensure user has access to this organization
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

            if (event.queryStringParameters?.fetch_all === 'true') {
                let allPolicies = await runQuery(sql => sql`SELECT * FROM police_policies WHERE organization_id = ${orgId}`);
                if (!isAdmin) {
                    allPolicies = (allPolicies || []).filter(p => {
                        if (!p.client_id && !p.platform_account_id) return true; // Can view org level
                        if (p.client_id && clientIdsFilter.includes(p.client_id)) return true;
                        if (p.platform_account_id && accountIdsFilter.includes(p.platform_account_id)) return true;
                        return false;
                    });
                }
                return json(200, allPolicies || []);
            }

            // Fetch hierarchical policies (all matching this org)
            let policies = await runQuery(sql => sql`SELECT * FROM police_policies WHERE organization_id = ${orgId}`);

            // Determine the most specific policy
            let bestPolicy = null;
            if (policies && policies.length > 0) {
                if (accountId) {
                    bestPolicy = policies.find((p: any) => p.platform_account_id === accountId) || 
                                 policies.find((p: any) => p.client_id === clientId && !p.platform_account_id) || 
                                 policies.find((p: any) => !p.client_id && !p.platform_account_id);
                } else if (clientId) {
                    bestPolicy = policies.find((p: any) => p.client_id === clientId && !p.platform_account_id) || 
                                 policies.find((p: any) => !p.client_id && !p.platform_account_id);
                } else {
                    bestPolicy = policies.find((p: any) => !p.client_id && !p.platform_account_id);
                }
            }

            // Return default policies if not found at any level
            if (!bestPolicy) {
                return json(200, {
                    organization_id: orgId,
                    client_id: clientId || null,
                    platform_account_id: accountId || null,
                    campaign_rules: [
                        { type: 'pais', label: 'País', required: true },
                        { type: 'canal', label: 'Canal', required: true },
                        { type: 'objetivo', label: 'Objetivo', required: true },
                        { type: 'producto', label: 'Producto', required: true },
                        { type: 'anio', label: 'Año/Temporada', required: true }
                    ],
                    adset_rules: [
                        { type: 'pais', label: 'País', required: true },
                        { type: 'publico', label: 'Público/Audiencia', required: true }
                    ],
                    ad_rules: [
                        { type: 'formato', label: 'Formato Visual', required: true },
                        { type: 'copy', label: 'Variante de Copy', required: true }
                    ]
                });
            }

            return json(200, bestPolicy);
        }

        if (event.httpMethod === "POST") {
            if (userRole === 'trafficker') {
                return json(403, { error: "Los Traffikers tienen acceso de solo lectura a las políticas." });
            }

            const body = JSON.parse(event.body || "{}");
            const { organization_id, client_id, platform_account_id, campaign_rules, adset_rules, ad_rules } = body;

            if (!organization_id) {
                return json(400, { error: "Missing organization_id" });
            }

            // Verify access
            let orgs = await runQuery(sql => sql`SELECT id FROM police_organizations WHERE id = ${organization_id} AND owner_id = ${userId}`);
            if (!orgs || orgs.length === 0) {
                const userOrg = await runQuery(sql => sql`SELECT organization_id FROM users WHERE id = ${userId} AND organization_id = ${organization_id}`);
                if (userOrg && userOrg.length > 0) {
                    orgs = [{ id: organization_id }];
                }
            }
            if (!orgs || orgs.length === 0) {
                return json(403, { error: "Forbidden" });
            }

            if (!isAdmin) {
                if (!client_id && !platform_account_id) {
                    return json(403, { error: "Solo los directores pueden editar políticas de nivel organización." });
                }
                const asgs = await runQuery(sql => sql`
                    SELECT client_id, platform_account_id FROM police_user_assignments 
                    WHERE user_id = ${userId} AND organization_id = ${organization_id}
                `);
                const clientIdsFilter = (asgs || []).filter(a => a.client_id).map(a => a.client_id);
                const accountIdsFilter = (asgs || []).filter(a => a.platform_account_id).map(a => a.platform_account_id);
                
                let hasAccess = false;
                if (platform_account_id && accountIdsFilter.includes(platform_account_id)) hasAccess = true;
                if (client_id && clientIdsFilter.includes(client_id)) hasAccess = true;

                if (!hasAccess) {
                    return json(403, { error: "No tienes permiso para editar políticas en esta cuenta/cliente." });
                }
            }

            const timestamp = Date.now();
            
            // Check if policy exists for this specific level
            let existing;
            if (platform_account_id) {
                existing = await runQuery(sql => sql`SELECT id FROM police_policies WHERE organization_id = ${organization_id} AND platform_account_id = ${platform_account_id}`);
            } else if (client_id) {
                existing = await runQuery(sql => sql`SELECT id FROM police_policies WHERE organization_id = ${organization_id} AND client_id = ${client_id} AND platform_account_id IS NULL`);
            } else {
                existing = await runQuery(sql => sql`SELECT id FROM police_policies WHERE organization_id = ${organization_id} AND client_id IS NULL AND platform_account_id IS NULL`);
            }

            if (existing && existing.length > 0) {
                // Update
                await runQuery(sql => sql`
                    UPDATE police_policies SET
                        campaign_rules = ${JSON.stringify(campaign_rules || [])},
                        adset_rules = ${JSON.stringify(adset_rules || [])},
                        ad_rules = ${JSON.stringify(ad_rules || [])},
                        updated_at = ${timestamp}
                    WHERE id = ${existing[0].id}
                `);
            } else {
                // Insert
                const policyId = `pol_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
                await runQuery(sql => sql`
                    INSERT INTO police_policies (
                        id, organization_id, client_id, platform_account_id, campaign_rules, adset_rules, ad_rules, created_at, updated_at
                    ) VALUES (
                        ${policyId}, ${organization_id}, ${client_id || null}, ${platform_account_id || null},
                        ${JSON.stringify(campaign_rules || [])}, 
                        ${JSON.stringify(adset_rules || [])}, 
                        ${JSON.stringify(ad_rules || [])}, 
                        ${timestamp}, ${timestamp}
                    )
                `);
            }

            return json(200, { success: true });
        }

        return json(404, { error: "Endpoint not found" });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-police-policies] Error:", message);
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
