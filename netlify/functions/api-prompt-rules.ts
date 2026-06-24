import { getUserIdFromHeaders } from "./_lib/authMiddleware";
import { getCorsHeaders } from "./_lib/corsHelper";
import { Handler } from '@netlify/functions';
import { runQuery, DEFAULT_SETTINGS } from './_lib/db';

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

let promptRulesInitialized = false;

export const handler: Handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed', headers };
    }

    // ── IDENTITY VERIFICATION ─────────────────────────────────────────────
    const userId = getUserIdFromHeaders(event.headers);
    if (!userId) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized: Missing identity" }) };
    }

    // Validate user exists in DB
    const userExists = await runQuery(async (sql) => {
        const rows = await sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1`;
        return rows && rows.length > 0;
    });

    if (!userExists) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized: Invalid identity" }) };
    }
    // ──────────────────────────────────────────────────────────────────────

    try {
        // 1. Initialize table if it doesn't exist (Once per instance)
        if (!promptRulesInitialized) {
            await runQuery(async (sql) => {
                await sql`
                    CREATE TABLE IF NOT EXISTS ai_prompt_rules (
                    id SERIAL PRIMARY KEY,
                    rule_type VARCHAR(50) NOT NULL,
                    content TEXT NOT NULL,
                    feature VARCHAR(100),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                );
            `;
            }).catch(err => console.error("[PromptRules] Init failed:", err));
            promptRulesInitialized = true;
        }

        if (event.httpMethod === 'GET') {
            const { feature } = event.queryStringParameters || {};
            
            const rules = await runQuery(async (sql) => {
                if (feature) {
                    return await sql`
                        SELECT rule_type, content FROM ai_prompt_rules 
                        WHERE is_active = TRUE AND (feature = ${feature} OR feature = 'global')
                        ORDER BY created_at DESC
                    `;
                } else {
                    return await sql`
                        SELECT rule_type, content, feature FROM ai_prompt_rules 
                        WHERE is_active = TRUE
                        ORDER BY created_at DESC
                    `;
                }
            });

            // Fallback to default settings if DB query fails (e.g. quota exceeded)
            const finalRules = rules || DEFAULT_SETTINGS.promptRules.filter(r => !feature || r.feature === feature || r.feature === 'global');

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ rules: finalRules }),
            };
        }

        if (event.httpMethod === 'POST') {
            const adminSecret = event.headers['x-admin-secret'];
            if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
                return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
            }

            const { ruleType, content, feature } = JSON.parse(event.body || '{}');

            if (!ruleType || !content) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing ruleType or content' }) };
            }

            const result = await runQuery(async (sql) => {
                return await sql`
                    INSERT INTO ai_prompt_rules (rule_type, content, feature, is_active)
                    VALUES (${ruleType}, ${content}, ${feature || 'global'}, TRUE)
                    RETURNING id;
                `;
            });

            if (!result) {
                return { 
                    statusCode: 503, 
                    headers, 
                    body: JSON.stringify({ error: 'Database unavailable (Quota Exceeded)' }) 
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, id: result[0].id }),
            };
        }
    } catch (error: any) {
        console.error('API Prompt Rules Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message }),
        };
    }

    return { statusCode: 400, headers, body: 'Bad Request' };
};
