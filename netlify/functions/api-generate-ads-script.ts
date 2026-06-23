import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { checkRateLimit, getClientIp } from "./_lib/rateLimiter";
import { runQuery } from "./_lib/db";
import { callGeminiApi } from "./_lib/gemini";
import crypto from "crypto";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
};

export const handler: Handler = async (event: HandlerEvent, _ctx: HandlerContext) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: CORS, body: "" };
    }
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    try {
        const body = JSON.parse(event.body || "{}");
        const { customerId, brief, realAccountData, configuration } = body;

        const clientIp = getClientIp(event);
        const rateLimit = await checkRateLimit(clientIp, { windowMs: 60000, max: 10 });
        if (!rateLimit.success) {
            return {
                statusCode: 429,
                headers: CORS,
                body: JSON.stringify({ error: "Too many requests" })
            };
        }

        // Authentication
        // Headers are case-insensitive in HTTP, but Node converts them to lowercase
        const userId = event.headers["x-user-id"] || event.headers["X-User-Id"] || event.headers["authorization"]?.replace('Bearer ', '') || "";

        console.log("[api-generate-ads-script] Authentication check:", {
            received_headers: Object.keys(event.headers),
            userId_found: !!userId,
            userId_value: userId ? `${userId.slice(0, 8)}...` : 'MISSING'
        });

        if (!userId) {
            console.error("[api-generate-ads-script] Missing user ID in headers. Available headers:", Object.keys(event.headers));
            return {
                statusCode: 401,
                headers: CORS,
                body: JSON.stringify({ error: "User not authenticated. Please sign in first." })
            };
        }

        let userExists = false;
        try {
            userExists = await runQuery(async (sql) => {
                const rows = await sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1`;
                return rows && rows.length > 0;
            });
        } catch (dbError: any) {
            console.warn("[api-generate-ads-script] DB check failed, continuing:", dbError.message);
            // Continue anyway — DB might be temporarily unavailable but user could still be valid
            userExists = true;
        }

        if (!userExists) {
            console.error("[api-generate-ads-script] User not found in DB:", userId);
            return {
                statusCode: 401,
                headers: CORS,
                body: JSON.stringify({ error: "User account not found." })
            };
        }

        if (!brief) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Missing brief parameter" }) };
        }

        // Gemini Prompt Construction
        const system = `Eres un experto Ingeniero de Software SEM y Especialista en Google Ads Scripts (JavaScript) alineado con Google Ads Best Practices y Search Quality Raters Guidelines.
Tu objetivo es crear un script de optimización de Google Ads basado en las instrucciones del usuario (el brief), la configuración provista y los datos de rendimiento.
Asegúrate de que el script use la API de Google Ads Scripts más reciente (AdsApp).
El código debe ser limpio, estructurado y seguro, incluyendo control de errores y logs explicativos de las acciones tomadas.
Debes alertar activamente si alguna regla propuesta puede afectar negativamente el rendimiento de las campañas o el consumo desmedido del presupuesto.`;

        const prompt = `Por favor, genera un Google Ads Script y un reporte de optimización detallado.

Brief del usuario: "${brief}"

Configuración de seguridad/comportamiento elegida:
${configuration ? JSON.stringify(configuration, null, 2) : "(Optimizar de forma balanceada y segura)"}

${realAccountData ? `Aquí tienes contexto de los datos actuales de la cuenta para que puedas basar tu flujo de decisiones y alertas en métricas reales:\n${JSON.stringify(realAccountData, null, 2)}\n` : ""}

Devuelve tu respuesta estructurada utilizando EXACTAMENTE las siguientes etiquetas de marcado (no agregues texto fuera de ellas):

[DECISION_REPORT]
Proporciona un reporte explicativo detallado de tu flujo de decisión en formato Markdown. Explica qué campañas, palabras clave o elementos se verán afectados por este script basándote en los datos reales proporcionados y por qué esta regla es adecuada para mejorar la eficiencia.
[/DECISION_REPORT]

[SAFETY_ALERTS]
Menciona advertencias críticas de rendimiento, volumen de conversiones, presupuesto o políticas en formato Markdown. Por ejemplo, advierte si pausar palabras clave caras reducirá conversiones debido a modelos de atribución, o si las campañas corren riesgo de quedarse sin palabras clave activas o si puede haber picos de gasto inesperados.
[/SAFETY_ALERTS]

[SCRIPT]
\`\`\`javascript
// Código JavaScript de Google Ads Script completo. Debe incluir la función main()
\`\`\`
[/SCRIPT]

[INSTRUCTIONS]
Instrucciones detalladas de implementación paso a paso en formato Markdown.
[/INSTRUCTIONS]`;

        // callGeminiApi() already handles retry + key rotation internally
        // Custom API key from client is optional — if not provided, uses server defaults
        let aiResponseData: any;
        try {
            console.log(`[api-generate-ads-script] Calling Gemini API for script generation...`);
            const geminiParams: any = {
                model: "gemini-2.5-flash",
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                systemInstruction: system,
                tools: [{ google_search: {} }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 4096,
                    thinkingConfig: { thinkingBudget: 0 }
                }
            };

            // Only add apiKey if provided by client
            const customApiKey = event.headers["x-gemini-key"] || event.headers["X-Gemini-Key"];
            if (customApiKey) {
                geminiParams.apiKey = customApiKey;
            }

            aiResponseData = await callGeminiApi(geminiParams);
            console.log(`[api-generate-ads-script] Gemini response received successfully`);
        } catch (geminiError: any) {
            console.error(`[api-generate-ads-script] Gemini API failed after all retries:`, {
                message: geminiError.message,
                status: geminiError.status,
                apiMessage: geminiError.apiMessage,
                isCredentialError: geminiError.isCredentialError,
                isTimeout: geminiError.isTimeout,
                isQuota: geminiError.isQuota
            });

            // Credential error = broken config
            if (geminiError.isCredentialError) {
                return {
                    statusCode: 401,
                    headers: CORS,
                    body: JSON.stringify({
                        error: "API configuration error. Contact support.",
                        details: process.env.NODE_ENV === 'development' ? geminiError.message : undefined
                    })
                };
            }

            // Timeout = Gemini too slow
            if (geminiError.isTimeout) {
                return {
                    statusCode: 504,
                    headers: CORS,
                    body: JSON.stringify({
                        error: "AI service timeout. Try again with a simpler request.",
                        details: process.env.NODE_ENV === 'development' ? geminiError.message : undefined
                    })
                };
            }

            // Everything else (429, 5xx, network) = service unavailable
            return {
                statusCode: 503,
                headers: CORS,
                body: JSON.stringify({
                    error: "AI service temporarily unavailable. Please try again in a few moments.",
                    details: process.env.NODE_ENV === 'development' ? {
                        message: geminiError.message,
                        status: geminiError.status
                    } : undefined
                })
            };
        }

        const aiText = aiResponseData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!aiText) {
            console.error("[api-generate-ads-script] Empty AI response:", {
                candidatesCount: aiResponseData?.candidates?.length,
                firstCandidate: aiResponseData?.candidates?.[0]
            });
            return {
                statusCode: 503,
                headers: CORS,
                body: JSON.stringify({
                    error: "AI service returned empty response. Please try again.",
                    details: process.env.NODE_ENV === 'development' ? JSON.stringify(aiResponseData?.candidates?.[0]) : undefined
                })
            };
        }

        // Helper function to extract content between custom tags
        const extractTag = (text: string, openTag: string, closeTag: string): string => {
            const openEscaped = openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const closeEscaped = closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`${openEscaped}([\\s\\S]*?)${closeEscaped}`);
            const match = text.match(regex);
            return match && match[1] ? match[1].trim() : "";
        };

        const decisionReport = extractTag(aiText, "[DECISION_REPORT]", "[/DECISION_REPORT]");
        const safetyAlerts = extractTag(aiText, "[SAFETY_ALERTS]", "[/SAFETY_ALERTS]");
        const scriptRaw = extractTag(aiText, "[SCRIPT]", "[/SCRIPT]");
        const instructions = extractTag(aiText, "[INSTRUCTIONS]", "[/INSTRUCTIONS]");

        // Parse clean script code from block
        const codeMatch = scriptRaw.match(/```(?:javascript|js)\n([\s\S]*?)```/) || [null, scriptRaw];
        const scriptContent = codeMatch[1] ? codeMatch[1].trim() : (scriptRaw || aiText.match(/```(?:javascript|js)\n([\s\S]*?)```/)?.[1] || "// Error de parseo");
        
        const finalReport = decisionReport || "Análisis completado basado en el brief.";
        const finalAlerts = safetyAlerts || "No se detectaron alertas críticas inmediatas.";
        const finalInstructions = instructions || aiText.replace(/```(?:javascript|js)\n[\s\S]*?```/, "").trim();

        // Save to Supabase user_scripts (combine instructions, report, and alerts in one field to maintain schema compatibility)
        const scriptId = crypto.randomUUID();
        const combinedDbInstructions = `### Reporte de Decisión\n${finalReport}\n\n### Alertas de Seguridad\n${finalAlerts}\n\n### Instrucciones\n${finalInstructions}`;
        
        await runQuery(async (sql) => {
            await sql`
                INSERT INTO user_scripts (
                    id, user_id, customer_id, brief, script_content, instructions, created_at
                ) VALUES (
                    ${scriptId}, ${userId}, ${customerId || null}, ${brief}, ${scriptContent}, ${combinedDbInstructions}, ${Date.now()}
                )
            `;
        });

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({
                id: scriptId,
                script_content: scriptContent,
                decisionReport: finalReport,
                safetyAlerts: finalAlerts,
                instructions: finalInstructions
            })
        };
    } catch (error: any) {
        console.error("[api-generate-ads-script] Unexpected error:", {
            message: error.message,
            stack: error.stack,
            code: error.code,
            type: error.constructor.name,
            status: error.status
        });

        // Network/connection errors
        if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
            return {
                statusCode: 503,
                headers: CORS,
                body: JSON.stringify({
                    error: "Service temporarily unavailable. Database or API connection failed.",
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                })
            };
        }

        return {
            statusCode: 500,
            headers: CORS,
            body: JSON.stringify({
                error: "Unexpected error while generating script. Please try again.",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};
