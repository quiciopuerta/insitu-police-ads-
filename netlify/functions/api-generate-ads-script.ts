import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { checkRateLimit, getClientIp } from "./_lib/rateLimiter";
import { runQuery } from "./_lib/db";
import { callGeminiApi } from "./_lib/gemini";
import { callDeepSeekApi } from "./_lib/deepseek";
import { callGlmApi } from "./_lib/glm";
import crypto from "crypto";

export const handler: Handler = async (event: HandlerEvent, _ctx: HandlerContext) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: "" };
    }
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: JSON.stringify({ error: "Method not allowed" }) };
    }

    try {
        const body = JSON.parse(event.body || "{}");
        const { customerId, brief, realAccountData, configuration } = body;

        const clientIp = getClientIp(event);
        const rateLimit = await checkRateLimit(clientIp, { windowMs: 60000, max: 10 });
        if (!rateLimit.success) {
            return {
                statusCode: 429,
                headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
                body: JSON.stringify({ error: "Too many requests" })
            };
        }

        // Authentication
        // Headers are case-insensitive in HTTP, but Node converts them to lowercase
        const userId = getUserIdFromHeaders(event.headers);

        console.log("[api-generate-ads-script] Authentication check:", {
            received_headers: Object.keys(event.headers),
            userId_found: !!userId,
            userId_value: userId ? `${userId.slice(0, 8)}...` : 'MISSING'
        });

        if (!userId) {
            console.error("[api-generate-ads-script] Missing user ID in headers. Available headers:", Object.keys(event.headers));
            return {
                statusCode: 401,
                headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
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
                headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
                body: JSON.stringify({ error: "User account not found." })
            };
        }

        if (!brief) {
            return { statusCode: 400, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: JSON.stringify({ error: "Missing brief parameter" }) };
        }

        // Gemini Prompt Construction
        const system = `Eres un experto Ingeniero de Software SEM y Especialista en Google Ads Scripts (JavaScript) alineado con Google Ads Best Practices y Search Quality Raters Guidelines.
Tu objetivo es crear un script de optimización de Google Ads basado en las instrucciones del usuario (el brief), la configuración provista y los datos de rendimiento.
Asegúrate de que el script use la API de Google Ads Scripts más reciente (AdsApp).
El código debe ser limpio, estructurado y seguro, incluyendo control de errores y logs explicativos de las acciones tomadas.
Debes alertar activamente si alguna regla propuesta puede afectar negativamente el rendimiento de las campañas o el consumo desmedido del presupuesto.
El script generado debe tener la capacidad de ejecutarse sobre una sola campaña específica si es necesario, definiendo una constante como \`const CAMPAIGN_NAME_FILTER = "";\` al inicio del script.`;

        const prompt = `Por favor, genera un Google Ads Script y un reporte de optimización detallado.

Brief del usuario: "${brief}"

Configuración de seguridad/comportamiento elegida:
${configuration ? JSON.stringify(configuration, null, 2) : "(Optimizar de forma balanceada y segura)"}

${realAccountData ? `Aquí tienes contexto de los datos actuales de la cuenta para que puedas basar tu flujo de decisiones y alertas en métricas reales:\n${JSON.stringify(realAccountData, null, 2)}\n` : ""}

Instrucción de filtro por campaña: Asegúrate de incluir al inicio del script una variable \`const CAMPAIGN_NAME_FILTER = "";\`. Configura los selectores de la API de AdsApp (ej. \`AdsApp.campaigns()\`) para que filtren por el nombre exacto de la campaña si esta variable no está vacía.

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

        // DeepSeek is set as the primary engine for high-reliability script generation.
        // Falls back to Gemini and Zhipu respectively if DeepSeek is unavailable.
        let aiResponseData: any;
        const customApiKey = event.headers["x-gemini-key"] || event.headers["X-Gemini-Key"];

        try {
            console.log(`[api-generate-ads-script] Calling DeepSeek API for script generation...`);
            aiResponseData = await callDeepSeekApi({
                model: "deepseek-chat",
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                systemInstruction: system,
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 4000
                }
            });
            console.log(`[api-generate-ads-script] DeepSeek response received successfully`);
        } catch (deepseekError: any) {
            console.warn(`[api-generate-ads-script] DeepSeek API failed. Attempting fallback to Gemini...`, deepseekError.message);
            
            try {
                // Fallback 1: Gemini
                const geminiParams: any = {
                    model: "gemini-2.0-flash",
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    systemInstruction: system,
                    tools: [{ google_search: {} }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 4096,
                        thinkingConfig: { thinkingBudget: 0 }
                    }
                };
                if (customApiKey) {
                    geminiParams.apiKey = customApiKey;
                }
                aiResponseData = await callGeminiApi(geminiParams);
                console.log(`[api-generate-ads-script] Gemini fallback completed successfully`);
            } catch (geminiError: any) {
                console.warn(`[api-generate-ads-script] Gemini fallback failed. Attempting fallback to Zhipu (GLM)...`, geminiError.message);
                
                try {
                    // Fallback 2: Zhipu (GLM)
                    aiResponseData = await callGlmApi({
                        model: "glm-4",
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        systemInstruction: system,
                        generationConfig: {
                            temperature: 0.2,
                            maxOutputTokens: 4000
                        }
                    });
                    console.log(`[api-generate-ads-script] Zhipu fallback completed successfully`);
                } catch (glmError: any) {
                    console.error(`[api-generate-ads-script] All LLM providers failed (DeepSeek, Gemini, Zhipu)`);
                    
                    return {
                        statusCode: 503,
                        headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
                        body: JSON.stringify({
                            error: "Todos los servicios de IA fallaron temporalmente. Por favor, verifica tus llaves de API o contacta a soporte.",
                            details: {
                                deepseek: deepseekError.message,
                                gemini: geminiError.message,
                                zhipu: glmError.message
                            }
                        })
                    };
                }
            }
        }

        const aiText = aiResponseData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!aiText) {
            console.error("[api-generate-ads-script] Empty AI response:", {
                candidatesCount: aiResponseData?.candidates?.length,
                firstCandidate: aiResponseData?.candidates?.[0]
            });
            return {
                statusCode: 503,
                headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
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
        const codeMatch = scriptRaw.match(/```(?:javascript|js)?\n([\s\S]*?)```/) || [null, scriptRaw.trim()];
        const scriptContent = codeMatch[1] ? codeMatch[1].trim() : (scriptRaw.trim() || aiText.match(/```(?:javascript|js)?\n([\s\S]*?)```/)?.[1]?.trim() || "// Error de parseo: No se pudo extraer el código del script.");
        
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
            headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
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
                headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
                body: JSON.stringify({
                    error: "Service temporarily unavailable. Database or API connection failed.",
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                })
            };
        }

        return {
            statusCode: 500,
            headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
            body: JSON.stringify({
                error: "Unexpected error while generating script. Please try again.",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};
