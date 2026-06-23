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
    
    if (!match) {
        return json(401, { error: "No autorizado", hasAccess: false });
    }

    const payload = verifySessionToken(match[1]);
    if (!payload || !payload.id) {
        return json(401, { error: "Sesión inválida", hasAccess: false });
    }

    const userId = payload.id;
    const role = payload.role;
    
    // El superAdmin siempre tiene acceso a todo
    if (role === "superAdmin") {
        return json(200, { hasAccess: true, reason: "superAdmin bypass" });
    }

    // Identificar la herramienta que se solicita verificar, por defecto 'police-ads'
    const toolId = event.queryStringParameters?.tool || "police-ads";

    try {
        const rows = await runQuery(async (sql) => 
            await sql`SELECT * FROM user_tools WHERE user_id = ${userId} AND tool_id = ${toolId}`
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
