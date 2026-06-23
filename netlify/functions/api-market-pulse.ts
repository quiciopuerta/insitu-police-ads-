import { Handler } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { runMigrations } from "./_lib/migrations"; // Static import for better bundling
import { getGeminiKey, VISION_MODEL, callGeminiApi } from "./_lib/gemini";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id, x-admin-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
};

/**
 * api-market-pulse.ts
 * ===================
 * Synthesizes recent high-relevance signals into "Market Pulse" rules.
 * Runs monthly or on-demand by admin.
 */
export const handler: Handler = async (event) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS };
    
    // Auth Check: Standardized for Admin/SuperAdmin roles via X-User-Id
    // Consistent with api-history and other Admin modules
    const xUserId = event.headers['x-user-id'] || event.headers['X-User-Id'] || '';
    if (!xUserId) {
        console.error("[api-market-pulse] Authentication Failed: Missing X-User-Id header");
        return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: "Missing authorization (X-User-Id)" }) };
    }

    try {
        // Idempotent schema sync before processing
        await runMigrations().catch(err => console.error("[MARKET-PULSE] Migrations failed:", err));

        // Verify Admin role
        const callerRoles = await runQuery(sql => sql`SELECT role FROM users WHERE id = ${xUserId} LIMIT 1`);
        const isAdmin = Array.isArray(callerRoles) && callerRoles.length > 0 && 
                        (callerRoles[0]?.role === 'superAdmin' || callerRoles[0]?.role === 'admin');

        if (!isAdmin) {
            return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: "Forbidden: Admin access required" }) };
        }

        let gemini;
        try {
            gemini = getGeminiKey();
        } catch (authErr: any) {
            console.error("[api-market-pulse] Key error:", authErr.message);
            return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Configuración de IA incompleta (Gemini Key missing)", details: authErr.message }) };
        }

        // 1. Fetch high-relevance signals from the last 30 days
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        let signals = [];
        try {
            signals = await runQuery(async (sql) => {
                return await sql`
                    SELECT type, source, title, description, url, relevance_score, detected_at
                    FROM competitor_signals
                    WHERE relevance_score >= 80 AND detected_at > ${thirtyDaysAgo}
                    ORDER BY relevance_score DESC
                    LIMIT 50
                `;
            });
        } catch (dbErr: any) {
            console.warn("[api-market-pulse] Competitor signals table might be missing or empty:", dbErr.message);
            // Don't crash 500 if the table doesn't exist yet, just stop pulse.
            return { 
                statusCode: 200, 
                headers: CORS, 
                body: JSON.stringify({ message: "Database not ready for Pulse (signals table missing).", details: dbErr.message }) 
            };
        }

        if (!signals || signals.length === 0) {
            return { 
                statusCode: 200, 
                headers: CORS, 
                body: JSON.stringify({ message: "No se encontraron señales de competidores suficientes (score > 80) para generar un Pulse semanal." }) 
            };
        }

        // 2. Synthesize Trends (Trend Researcher Persona)
        const prompt = `
            ACT AS A SENIOR TREND RESEARCHER (persona: agency-trend-researcher).
            
            You are analyzing HIGH-RELEVANCE signals from competitors:
            ${JSON.stringify(signals, null, 2)}

            GOAL: Synthesize the most critical "Market Shifts" and "Innovation Patterns".

            REQUIRED ANALYSIS FRAMEWORK:
            1. TREND LIFECYCLE MAPPING: For each trend, identify its current stage:
               - SIGNAL (Noise/Initial detection)
               - EMERGENCE (Validated experimental shift)
               - GROWTH (Rapid adoption/Scaling)
               - MATURITY (Standard industry practice)
               - DECLINE (Losing effectiveness)

            2. IMPACT SCORING (0-10): Quantify the potential ROI or business disruption of the trend.

            3. COMPETITIVE SWOT: Based on these signals, identify 1 Strength, 1 Weakness, 1 Opportunity, and 1 Threat for the current market landscape.

            4. BILINGUAL SUPPORT: Maintain technical terminology in ENGLISH. Explanations in Spanish (per INsitu AI Ads standard).

            OUTPUT FORMAT:
            You MUST return a valid JSON object (enclosed in JSON_START/JSON_END) with this structure:
            {
              "tldr": "...",
              "trends": [
                {
                  "type": "trend",
                  "content": "Professional brief of the trend",
                  "lifecycle": "EMERGENCE",
                  "impactScore": 8,
                  "platform": "Google|Meta|TikTok|Global"
                }
              ],
              "swot": {
                "strengths": [],
                "weaknesses": [],
                "opportunities": [],
                "threats": []
              }
            }
        `;

        let pulseData: any = null;
        try {
            const response = await callGeminiApi({
                model: 'gemini-2.5-flash',
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,  // Increased: pulse with SWOT + trends can exceed 2048 tokens
                    responseMimeType: "application/json",
                    thinkingConfig: { thinkingBudget: 0 }  // Disable thinking: not needed for trend synthesis
                }
            });

            const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const cleanJson = rawText
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim();
            pulseData = JSON.parse(cleanJson);
        } catch (parseErr: any) {
            console.error("[api-market-pulse] Gemini execution or parse failed:", parseErr.message);
            return { 
                statusCode: 500, 
                headers: CORS, 
                body: JSON.stringify({ 
                    error: "Format Error", 
                    message: "La IA no entregó un formato de inteligencia de mercado válido.",
                    details: parseErr.message 
                }) 
            };
        }

        if (!pulseData || !pulseData.trends) {
            return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Gemini failed to output structured pulse data" }) };
        }

        // 3. Update AI Prompt Rules
        const pulseContent = `MONTHLY MARKET PULSE (${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}):\n` + 
            `TL;DR: ${pulseData.tldr}\n` +
            pulseData.trends.map((t: any) => `- [${t.platform}] [${t.lifecycle} - Score: ${t.impactScore}] ${t.content}`).join('\n');

        let insertedRuleId = null;
        try {
            const insertedRule = await runQuery(async (sql) => {
                // Disable previous pulses for the same feature to keep only the latest
                await sql`UPDATE ai_prompt_rules SET is_active = FALSE WHERE feature = 'market-pulse'`;
                
                return await sql`
                    INSERT INTO ai_prompt_rules (rule_type, content, feature, is_active)
                    VALUES ('context', ${pulseContent}, 'market-pulse', TRUE)
                    RETURNING id
                `;
            });
            insertedRuleId = insertedRule?.[0]?.id;
        } catch (ruleErr: any) {
            console.warn("[api-market-pulse] Could not save prompt rule (table might be missing):", ruleErr.message);
            // Non-fatal if only the rule injection fails, we still have the trends detected
        }

        // 4. Record the trend in a historical table
        try {
            const monthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
            await runQuery(async (sql) => {
                await sql`
                    INSERT INTO market_trends (month_key, findings)
                    VALUES (${monthKey}, ${JSON.stringify(pulseData)})
                    ON CONFLICT (month_key) DO UPDATE SET findings = EXCLUDED.findings
                `;
            });
        } catch (trendErr: any) {
            console.error("[api-market-pulse] Trend storage failed:", trendErr.message);
            // Non-fatal, return pulse success anyway
        }

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ 
                success: true, 
                pulseId: insertedRuleId,
                trendsDetected: pulseData.trends.length,
                summary: pulseContent,
                pulse: pulseData
            })
        };

    } catch (e: any) {
        console.error("[api-market-pulse] Fatal Error:", e.message, e.stack);
        return { 
            statusCode: 500, 
            headers: CORS, 
            body: JSON.stringify({ error: "Internal Server Error", message: e.message, debug: e.stack }) 
        };
    }
};
