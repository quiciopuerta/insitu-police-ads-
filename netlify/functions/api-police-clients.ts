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
        await runMigrations().catch(err => console.error("[POLICE-CLIENTS] Migrations failed:", err));
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

        const isAdmin = userRole === 'admin' || userRole === 'superAdmin';

        // Create client if POST
        if (event.httpMethod === "POST") {
            if (!isAdmin) return json(403, { error: "Solo los directores pueden crear clientes." });
            const body = parseBody();
            const { name, email, contactPerson, monthlyBudget, industry, country, brandProfileId } = body;
            
            if (!name) {
                return json(400, { error: "Name is required" });
            }

            const timestamp = Date.now();
            const clientId = `cli_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;

            await runQuery(sql => sql`
                INSERT INTO police_clients (id, organization_id, name, email, contact_person, monthly_budget, industry, country, status, created_at, updated_at, brand_profile_id)
                VALUES (${clientId}, ${orgId}, ${name}, ${email || null}, ${contactPerson || null}, ${monthlyBudget ? parseFloat(monthlyBudget.toString()) : null}, ${industry || null}, ${country || null}, 'active', ${timestamp}, ${timestamp}, ${brandProfileId || null})
            `);

            return json(201, { id: clientId, name, email, contactPerson, monthlyBudget, brandProfileId });
        }

        // Edit client if PUT
        if (event.httpMethod === "PUT") {
            if (!isAdmin) return json(403, { error: "Solo los directores pueden editar clientes." });
            const body = parseBody();
            const { id, name, email, contactPerson, monthlyBudget, industry, country, brandProfileId } = body;

            if (!id) {
                return json(400, { error: "Client ID is required" });
            }
            if (!name) {
                return json(400, { error: "Name is required" });
            }

            const timestamp = Date.now();

            await runQuery(sql => sql`
                UPDATE police_clients
                SET name = ${name},
                    email = ${email || null},
                    contact_person = ${contactPerson || null},
                    monthly_budget = ${monthlyBudget ? parseFloat(monthlyBudget.toString()) : null},
                    industry = ${industry || null},
                    country = ${country || null},
                    brand_profile_id = ${brandProfileId || null},
                    updated_at = ${timestamp}
                WHERE id = ${id} AND organization_id = ${orgId}
            `);

            return json(200, { success: true });
        }

        // Delete client if DELETE (Soft delete)
        if (event.httpMethod === "DELETE") {
            if (!isAdmin) return json(403, { error: "Solo los directores pueden eliminar clientes." });
            const clientId = event.queryStringParameters?.id;
            if (!clientId) {
                return json(400, { error: "Client ID is required" });
            }

            const timestamp = Date.now();

            // Perform logical soft delete
            await runQuery(sql => sql`
                UPDATE police_clients
                SET is_deleted = true,
                    deleted_at = ${timestamp},
                    updated_at = ${timestamp}
                WHERE id = ${clientId} AND organization_id = ${orgId}
            `);

            // Audit log in ai_technical_logs
            await runQuery(sql => sql`
                INSERT INTO ai_technical_logs (feature, error_message, severity, user_id)
                VALUES ('police_clients_delete', ${`Soft deleted client ${clientId} by user ${callerUserId}`}, 'info', ${callerUserId})
            `);

            return json(200, { success: true });
        }

        // Fetch clients
        let clientIdsFilter: string[] | null = null;
        if (!isAdmin) {
            const asgs = await runQuery(sql => sql`
                SELECT client_id FROM police_user_assignments 
                WHERE user_id = ${userId} AND organization_id = ${orgId} AND client_id IS NOT NULL
            `);
            clientIdsFilter = (asgs || []).map(a => a.client_id);
            if (clientIdsFilter!.length === 0) {
                return json(200, []);
            }
        }

        let clients = await runQuery(sql => {
            if (clientIdsFilter) {
                return sql`SELECT * FROM police_clients WHERE organization_id = ${orgId} AND id = ANY(${clientIdsFilter}) AND (is_deleted IS NULL OR is_deleted = false) ORDER BY name ASC`;
            }
            return sql`SELECT * FROM police_clients WHERE organization_id = ${orgId} AND (is_deleted IS NULL OR is_deleted = false) ORDER BY name ASC`;
        });

        // Auto-create some default clients if none exist
        if (!clients || clients.length === 0) {
            const timestamp = Date.now();
            const defaultClients = [
                { id: `cli_1_${timestamp}`, name: 'Adidas Latam', industry: 'Retail', country: 'CO' },
                { id: `cli_2_${timestamp}`, name: 'Banco Pichincha', industry: 'Finance', country: 'EC' },
                { id: `cli_3_${timestamp}`, name: 'Claro', industry: 'Telecom', country: 'PE' }
            ];

            for (const c of defaultClients) {
                await runQuery(sql => sql`
                    INSERT INTO police_clients (id, organization_id, name, industry, country, monthly_budget, status, created_at, updated_at)
                    VALUES (${c.id}, ${orgId}, ${c.name}, ${c.industry}, ${c.country}, 50000.00, 'active', ${timestamp}, ${timestamp})
                `);
            }

            clients = await runQuery(sql =>
                sql`SELECT * FROM police_clients WHERE organization_id = ${orgId} AND (is_deleted IS NULL OR is_deleted = false) ORDER BY name ASC`
            );
        }

        return json(200, clients || []);
    } catch (err: unknown) {
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
