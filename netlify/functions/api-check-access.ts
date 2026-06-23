import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { getCorsHeaders } from "./_lib/corsHelper";
import { verifySessionToken } from "./_lib/jwtHelper";

export const handler: Handler = async (event: HandlerEvent) => {
    const origin = event.headers.origin;
    const json = (status: number, body: unknown) => ({
        statusCode: status,
        headers: getCorsHeaders(origin),
        body: JSON.stringify(body),
    });

    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: getCorsHeaders(origin), body: "" };

    const cookieHeader = event.headers.cookie || "";
    const match = cookieHeader.match(/insitu_session=([^;]+)/);
    
    let userId: string | undefined;
    let role: string | undefined;

    if (match) {
        const payload = verifySessionToken(match[1]);
        if (payload && payload.id) {
            userId = payload.id;
            role = payload.role;
        }
    } else {
        // Fallback for development only: allow X-User-Id but enforce role validation
        const devMode = process.env.VITE_DEV_MODE === "true";
        if (devMode) {
            userId = event.headers["x-user-id"] || event.headers["X-User-Id"];
            role = event.headers["x-user-role"] || event.headers["X-User-Role"];
        }
    }
    
    if (!userId) {
        return json(401, { error: "No autorizado", hasAccess: false });
    }
    
    // El superAdmin siempre tiene acceso a todo
    if (role === "superAdmin") {
        return json(200, { hasAccess: true, reason: "superAdmin bypass" });
    }

    // Identificar la herramienta que se solicita verificar, por defecto 'police-ads'
    const toolId = event.queryStringParameters?.tool || "police-ads";

    try {
        const rows = await runQuery(async (sql) => 
            await sql`SELECT * FROM user_tools WHERE user_id = ${userId} AND tool_name = ${toolId}`
        );

        if (rows && rows.length > 0) {
            return json(200, { hasAccess: true });
        } else {
            return json(403, { error: "Acceso denegado a esta herramienta", hasAccess: false });
        }
    } catch (e) {
        console.error("[RBAC] Error checking access:", e);
        return json(500, { error: "Error interno del servidor", hasAccess: false });
    }
};
