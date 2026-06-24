import { getUserIdFromHeaders } from "./_lib/authMiddleware";
import { getCorsHeaders } from "./_lib/corsHelper";
import { Handler } from '@netlify/functions';
import { GoogleGenAI } from "@google/genai";
import { runQuery } from './_lib/db';
import { getGeminiKey, callGeminiApi } from './_lib/gemini';
import { callDeepSeekApi } from './_lib/deepseek';
import { callGlmApi } from './_lib/glm';
import { handler as googleAdsHandler } from './api-google-ads';
import { checkRateLimit, getClientIp } from './_lib/rateLimiter';

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-Gemini-Key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
};

/**
 * AI Proxy — Securely executes Gemini calls on the server
 * to prevent leaking API keys to the client.
 */
export const handler: Handler = async (event, context) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed", headers };

    try {
        const clientIp = getClientIp(event);
        const rateLimit = await checkRateLimit(clientIp, { windowMs: 60000, max: 20 });
        const rateLimitHeaders = {
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-RateLimit-Reset": String(rateLimit.resetAt),
        };
        if (!rateLimit.success) {
            return {
                statusCode: 429,
                headers: { ...headers, ...rateLimitHeaders },
                body: JSON.stringify({ error: "Rate limit exceeded. Try again later." })
            };
        }

        // 1. Authentication
        const userId = getUserIdFromHeaders(event.headers);
        if (!userId) {
            return { statusCode: 401, headers: { ...headers, ...rateLimitHeaders }, body: JSON.stringify({ error: "Unauthorized: Missing identity" }) };
        }

        const userExists = await runQuery(async (sql) => {
            const rows = await sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1`;
            return rows && rows.length > 0;
        });

        if (!userExists) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized: Invalid identity" }) };
        }

        // 2. Payload Parsing
        const body = JSON.parse(event.body || "{}");
        const { task, payload, contents, config, modelId } = body;

        // ── Task-based routing ────────────────────────────────────────────────
        // When a named task is provided, forward to the dedicated Netlify Function
        // instead of handling it inline. This keeps each feature's logic isolated.
        if (task === 'ping') {
            return {
                statusCode: 200,
                headers: { ...headers, ...rateLimitHeaders },
                body: JSON.stringify({ status: "online", timestamp: new Date().toISOString() })
            };
        }

        if (task === 'ads_search') {
            // Forward internally to the google-ads analysis function
            const simulatedEvent = {
                ...event,
                body: JSON.stringify({ action: 'search_audit', ...payload }),
                headers: {
                    ...event.headers,
                    'x-user-id': userId,
                    'x-internal-proxy': '1',
                }
            };

            try {
                // @ts-ignore - The context type is compatible
                const fwdResponse = await googleAdsHandler(simulatedEvent, context);
                return fwdResponse || { statusCode: 500, body: '{"error": "Empty response from internal handler"}' };
            } catch (e: any) {
                console.error("[AI-Proxy] Failed to execute backend handler:", e.message);
                return {
                    statusCode: 500,
                    headers: { ...headers, ...rateLimitHeaders },
                    body: JSON.stringify({ error: "Failed to execute backend handler", details: e.message })
                };
            }
        }

        // ── Generic Gemini proxy (existing path) ──────────────────────────────
        if (!contents || !Array.isArray(contents)) {
            return { statusCode: 400, headers: { ...headers, ...rateLimitHeaders }, body: JSON.stringify({ error: "Invalid request: Missing contents or unknown task" }) };
        }

        // 3. AI Execution - REFACTORED to use centralized callGeminiApi
        const tools = config?.tools || [];
        const systemInstruction = config?.systemInstruction || body.systemInstruction;
        const genConfig = config?.generationConfig || config || {};

        // Extract custom user API key if provided
        const customApiKey = event.headers["x-gemini-key"] || event.headers["X-Gemini-Key"];

        let aiResponseData;

        if (modelId && modelId.startsWith('deepseek')) {
            aiResponseData = await callDeepSeekApi({
                model: modelId,
                contents,
                systemInstruction,
                generationConfig: genConfig,
            });
        } else if (modelId && modelId.startsWith('glm')) {
            aiResponseData = await callGlmApi({
                model: modelId,
                contents,
                systemInstruction,
                generationConfig: genConfig,
            });
        } else {
            aiResponseData = await callGeminiApi({
                model: modelId || "gemini-2.5-flash",
                contents,
                generationConfig: {
                    temperature: genConfig.temperature ?? 0.4,
                    topP: genConfig.topP ?? 0.95,
                    topK: genConfig.topK ?? 40,
                    maxOutputTokens: genConfig.maxOutputTokens ?? 8192,
                    responseMimeType: genConfig.responseMimeType ?? "text/plain",
                    responseSchema: genConfig.responseSchema,
                    stopSequences: genConfig.stopSequences,
                    thinkingConfig: genConfig.thinkingConfig ?? { thinkingBudget: 0 }
                },
                systemInstruction: systemInstruction,
                tools: tools.length > 0 ? tools : undefined,
                safetySettings: config?.safetySettings,
                apiKey: customApiKey
            });
        }

        const candidate = aiResponseData.candidates?.[0];
        const responseText = candidate?.content?.parts?.[0]?.text || "";

        return {
            statusCode: 200,
            headers: { ...headers, ...rateLimitHeaders },
            body: JSON.stringify({
                text: responseText,
                candidates: aiResponseData.candidates,
                usageMetadata: aiResponseData.usageMetadata,
                groundingMetadata: candidate?.groundingMetadata
            })
        };

    } catch (error: any) {
        console.error("[AI-Proxy] Critical Error:", {
            message: error.message,
            stack: error.stack,
            userId: event.headers["x-user-id"]
        });

        // Map common Google AI errors to user-friendly messages
        let status = error.status || 500;
        let message = "Error interno en el servicio de inteligencia artificial.";

        if (error.message?.includes("finishReason: SAFETY")) {
            status = 400;
            message = "La solicitud fue bloqueada por los filtros de seguridad de la IA. Por favor, reformula tu petición.";
        } else if (error.message?.includes("quota") || status === 429) {
            status = 429;
            message = "Límite de capacidad alcanzado. Por favor, espera un momento antes de reintentar.";
        } else if (error.isTimeout || status === 504) {
            status = 504;
            message = "El tiempo de espera se ha agotado. El modelo está tardando demasiado en responder.";
        } else if (error.isCredentialError || status === 401 || status === 403) {
            status = 401;
            message = "Problema de credenciales con el proveedor de IA. Contacta al administrador.";
        } else if (error.message) {
            message = `Error de IA (${status}): ${error.message}`;
        }

        return {
            statusCode: status,
            headers,
            body: JSON.stringify({ 
                error: message,
                technical: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};
