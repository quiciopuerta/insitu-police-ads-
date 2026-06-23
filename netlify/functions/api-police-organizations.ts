import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError } from "./_lib/errorHandler";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
};

const json = (status: number, body: unknown) => ({
    statusCode: status,
    headers: CORS,
    body: JSON.stringify(body),
});

export const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const callerUserId = event.headers['x-user-id'] || event.headers['X-User-Id'] || authHeader.replace('Bearer ', '') || '';
    
    if (!callerUserId) {
        return json(401, { error: "Unauthorized: Missing identity" });
    }

    try {
        if (event.httpMethod === "GET") {
            const orgs = await runQuery(sql => 
                sql`SELECT * FROM police_organizations WHERE owner_id = ${callerUserId} AND is_deleted = false ORDER BY created_at DESC`
            );

            // If user doesn't have an organization yet, we could auto-create a default one here
            // But since this is just a fetch endpoint, we'll return what's there
            if (!orgs || orgs.length === 0) {
                // Auto-create a default organization for the user to make the extension work
                const timestamp = Date.now();
                const newOrgId = `org_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
                
                await runQuery(sql => sql`
                    INSERT INTO police_organizations (id, name, owner_id, created_at, updated_at)
                    VALUES (${newOrgId}, 'Default Organization', ${callerUserId}, ${timestamp}, ${timestamp})
                `);

                return json(200, [{
                    id: newOrgId,
                    name: 'Default Organization',
                    owner_id: callerUserId
                }]);
            }

            return json(200, orgs);
        }

        return json(404, { error: "Endpoint not found" });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-police-organizations] Error:", message);
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
