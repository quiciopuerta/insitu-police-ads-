import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";
import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError } from "./_lib/errorHandler";

const json = (status: number, body: unknown) => ({
    statusCode: status,
    headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
    body: JSON.stringify(body),
});

export const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: "" };

    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const callerUserId = getUserIdFromHeaders(event.headers);
    
    if (!callerUserId) {
        return json(401, { error: "Unauthorized: Missing identity" });
    }

    try {
        if (event.httpMethod === "POST") {
            const body = JSON.parse(event.body || "{}");
            const { 
                platform, campaignName, isValid, errors, level 
            } = body;

            // We log this directly into ai_technical_logs or a specific extension_logs
            // For now, ai_technical_logs with a specific feature prefix.
            
            const timestamp = Date.now();
            const severity = isValid ? 'info' : 'warning';
            const logMessage = isValid 
                ? `Validación Correcta: ${platform} - ${level || 'campaign'}` 
                : `Error de Nomenclatura: ${platform} - ${level || 'campaign'}`;

            await runQuery(sql => sql`
                INSERT INTO ai_technical_logs (
                    feature, error_message, stack_trace, request_context, severity, user_id, created_at
                ) VALUES (
                    ${'police_extension'}, 
                    ${logMessage},
                    ${JSON.stringify({ name: campaignName, errors })},
                    ${JSON.stringify({ platform, level, isValid })},
                    ${severity}, 
                    ${callerUserId}, 
                    NOW()
                )
            `);

            // If we have an organization, we could theoretically insert into police_alerts
            // But from the extension we might not know the campaign_id or organization_id yet.
            // This technical log will be fetched by the dashboard to show generic extension alerts.

            return json(200, { success: true });
        }

        return json(404, { error: "Endpoint not found" });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-extension-compliance] Error:", message);
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
