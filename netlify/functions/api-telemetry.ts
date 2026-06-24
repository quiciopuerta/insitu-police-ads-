import { getUserIdFromHeaders } from "./_lib/authMiddleware";
import { getCorsHeaders } from "./_lib/corsHelper";
import { Handler } from '@netlify/functions';
import { runQuery } from './_lib/db';

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
};

/**
 * Telemetry Endpoint
 * ====================
 * Accepts latency logs from the frontend (POST /api/telemetry/latency)
 * and persists them in ai_technical_logs for observability.
 * 
 * Security: user-id is optional — telemetry is low-risk,
 * but we cap log size and sanitize before insertion.
 */
export const handler: Handler = async (event) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed", headers };

    try {
        const body = JSON.parse(event.body || "{}");
        const { taskType, durationMs, status, metadata } = body;

        // Basic validation
        if (!taskType || typeof durationMs !== 'number') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Missing required fields: taskType, durationMs" })
            };
        }

        const userId = getUserIdFromHeaders(event.headers);
        const safeTaskType = String(taskType).slice(0, 100);
        const safeDuration = Math.round(durationMs);
        const safeStatus = String(status || "unknown").slice(0, 50);
        const safeMetadata = metadata ? JSON.stringify(metadata).slice(0, 1000) : null;

        // Fire-and-forget DB insertion — don't block the response
        runQuery(async (sql) => {
            await sql`
                INSERT INTO ai_technical_logs (
                    feature, error_message, severity, user_id, context, created_at
                ) VALUES (
                    ${'telemetry:' + safeTaskType},
                    ${`Duration: ${safeDuration}ms | Status: ${safeStatus}`},
                    ${'info'},
                    ${userId},
                    ${safeMetadata ? JSON.parse(safeMetadata) : null},
                    NOW()
                )
            `;
        }).catch((e) => {
            // Non-fatal — telemetry should never break the app
            console.warn("[Telemetry] DB write failed (non-critical):", e.message);
        });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ received: true })
        };

    } catch (error: any) {
        console.error("[Telemetry] Error:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Internal error" })
        };
    }
};
