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
        await runMigrations().catch(err => console.error("[POLICE-ACCOUNTS] Migrations failed:", err));
        migrationsRan = true;
    }

    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const callerUserId = getUserIdFromHeaders(event.headers);
    if (!callerUserId) return json(401, { error: "Unauthorized" });

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

        // Find user's organization first
        let orgs = await runQuery(sql => 
            sql`SELECT id FROM police_organizations WHERE owner_id = ${userId} AND is_deleted = false`
        );

        if (!orgs || orgs.length === 0) {
            const userOrg = await runQuery(sql => sql`SELECT organization_id FROM users WHERE id = ${userId}`);
            if (userOrg && userOrg.length > 0 && userOrg[0].organization_id) {
                orgs = [{ id: userOrg[0].organization_id }];
            }
        }

        if (!orgs || orgs.length === 0) {
            const timestamp = Date.now();
            const newOrgId = `org_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
            await runQuery(sql => sql`
                INSERT INTO police_organizations (id, name, owner_id, created_at, updated_at)
                VALUES (${newOrgId}, 'Default Organization', ${userId}, ${timestamp}, ${timestamp})
            `);
            orgs = [{ id: newOrgId }];
        }

        const orgId = orgs[0].id;

        // Parse path ID for DELETE e.g., /api-police-accounts/acc_123
        const pathParts = event.path.split('/');
        const pathId = pathParts[pathParts.length - 1];
        const targetAccountId = (pathId && pathId !== 'api-police-accounts' && pathId !== 'api-police-accounts-create') ? pathId : event.queryStringParameters?.id;

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

        // Create platform account if POST (api-police-accounts-create or POST on api-police-accounts)
        if (event.httpMethod === "POST") {
            if (!isAdmin) return json(403, { error: "Solo los directores pueden conectar cuentas." });
            const body = parseBody();
            const { clientId, platform, accountId, accountName, email, accessToken } = body;

            if (!clientId || !platform || !accountId || !accountName) {
                return json(400, { error: "Missing required fields (clientId, platform, accountId, accountName)" });
            }

            const timestamp = Date.now();
            const accountRowId = `acc_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
            let integrationId: string | null = null;

            // If token is provided, create a record in police_integrations first
            if (accessToken) {
                integrationId = `int_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
                await runQuery(sql => sql`
                    INSERT INTO police_integrations (id, user_id, organization_id, type, status, access_token, account_id, account_name, created_at, updated_at)
                    VALUES (${integrationId}, ${userId}, ${orgId}, ${platform}, 'connected', ${accessToken}, ${accountId}, ${accountName}, ${timestamp}, ${timestamp})
                `);
            }

            await runQuery(sql => sql`
                INSERT INTO police_platform_accounts (id, client_id, organization_id, platform, account_id, account_name, integration_id, status, created_at, updated_at)
                VALUES (${accountRowId}, ${clientId}, ${orgId}, ${platform}, ${accountId}, ${accountName}, ${integrationId}, 'connected', ${timestamp}, ${timestamp})
            `);

            return json(201, { id: accountRowId, platform, accountId, accountName });
        }

        // Delete account if DELETE
        if (event.httpMethod === "DELETE") {
            if (!isAdmin) return json(403, { error: "Solo los directores pueden remover cuentas." });
            if (!targetAccountId) {
                return json(400, { error: "Account ID is required" });
            }

            const timestamp = Date.now();

            // Soft delete the platform account
            await runQuery(sql => sql`
                UPDATE police_platform_accounts
                SET is_deleted = true,
                    deleted_at = ${timestamp},
                    updated_at = ${timestamp}
                WHERE id = ${targetAccountId} AND organization_id = ${orgId}
            `);

            // Audit log in ai_technical_logs
            await runQuery(sql => sql`
                INSERT INTO ai_technical_logs (feature, error_message, severity, user_id)
                VALUES ('police_accounts_delete', ${`Soft deleted platform account ${targetAccountId} by user ${userId}`}, 'info', ${userId})
            `);

            return json(200, { success: true });
        }

        // Fetch accounts (GET)
        let clientIdsFilter: string[] | null = null;
        let accountIdsFilter: string[] | null = null;
        if (!isAdmin) {
            const asgs = await runQuery(sql => sql`
                SELECT client_id, platform_account_id FROM police_user_assignments 
                WHERE user_id = ${userId} AND organization_id = ${orgId}
            `);
            clientIdsFilter = (asgs || []).filter(a => a.client_id).map(a => a.client_id);
            accountIdsFilter = (asgs || []).filter(a => a.platform_account_id).map(a => a.platform_account_id);
            if (clientIdsFilter!.length === 0 && accountIdsFilter!.length === 0) {
                return json(200, []);
            }
        }

        const dbAccounts = await runQuery(sql => {
            if (!isAdmin) {
                return sql`
                    SELECT a.*, c.name as client_name
                    FROM police_platform_accounts a
                    LEFT JOIN police_clients c ON a.client_id = c.id
                    WHERE a.organization_id = ${orgId} 
                      AND (a.id = ANY(${accountIdsFilter}) OR a.client_id = ANY(${clientIdsFilter}))
                      AND (a.is_deleted IS NULL OR a.is_deleted = false)
                    ORDER BY a.created_at DESC
                `;
            }
            return sql`
                SELECT a.*, c.name as client_name
                FROM police_platform_accounts a
                LEFT JOIN police_clients c ON a.client_id = c.id
                WHERE a.organization_id = ${orgId} 
                  AND (a.is_deleted IS NULL OR a.is_deleted = false)
                ORDER BY a.created_at DESC
            `;
        });

        const formatted = (dbAccounts || []).map(a => ({
            id: a.id,
            platform: a.platform,
            accountId: a.account_id,
            accountName: a.account_name,
            status: a.status || 'connected',
            client: { name: a.client_name || '-' }
        }));

        return json(200, formatted);
    } catch (err: unknown) {
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
