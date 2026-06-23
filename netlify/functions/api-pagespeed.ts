import { Handler } from "@netlify/functions";
import { callGemini } from "./_lib/ai";
import { runQuery } from "./_lib/db";
import { runMigrations } from "./_lib/migrations";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
};

/**
 * Key Rotation: Choose a random key from available PageSpeed keys
 */
const getPageSpeedKey = () => {
    const keys = (process.env.PAGESPEED_API_KEYS || process.env.VITE_PAGESPEED_API_KEY || "")
        .split(",")
        .map(k => k.trim())
        .filter(Boolean);
        
    if (keys.length === 0) return "";
    return keys[Math.floor(Math.random() * keys.length)];
};

export const handler: Handler = async (event) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
    if (event.httpMethod !== "GET") return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };

    const url = event.queryStringParameters?.url;
    const strategy = event.queryStringParameters?.strategy || "desktop";
    const forceRefresh = event.queryStringParameters?.refresh === "true";
    
    if (!url) {
        return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Missing required parameter: url" }) };
    }
    
    try {
        await runMigrations();

        // ── 1. Cache Check ────────────────────────────────────────────────────
        if (!forceRefresh) {
            const cached = await runQuery(async (sql) => 
                sql`SELECT data, created_at FROM pagespeed_cache 
                    WHERE url = ${url} AND strategy = ${strategy} 
                    AND created_at > NOW() - INTERVAL '24 hours'
                    LIMIT 1`
            );
            
            if (cached && cached.length > 0) {
                console.log(`[PageSpeed] Serving from cache: ${url} (${strategy})`);
                return {
                    statusCode: 200,
                    headers: { ...CORS, "X-Cache": "HIT" },
                    body: JSON.stringify(cached[0].data)
                };
            }
        }

        // ── 2. External API Call with Key Rotation ────────────────────────────
        const apiKey = getPageSpeedKey();
        const keyParam = apiKey ? `&key=${apiKey}` : "";
        const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo${keyParam}`;

        console.log(`[PageSpeed] Calling external API for: ${url} (${strategy})...`);
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`PageSpeed API error: ${response.status}`);
        const data = await response.json();

        // ── 3. AI Technical Roadmap (Gemini 1.5 Pro) ──────────────────────────
        let aiRoadmap = null;
        try {
            const audits = data.lighthouseResult?.audits || {};
            const criticalAudits = {
                lcp: audits['largest-contentful-paint'],
                cls: audits['cumulative-layout-shift'],
                tbt: audits['total-blocking-time'],
                fcp: audits['first-contentful-paint'],
                speedIndex: audits['speed-index'],
                unusedJs: audits['unused-javascript'],
                modernImages: audits['modern-image-formats'],
                renderBlocking: audits['render-blocking-resources'],
                serverResponse: audits['server-response-time']
            };

            const system = "Eres un Web Performance Engineer Senior experto en Core Web Vitals. Tu misión es proporcionar un roadmap técnico de corrección basado en un JSON de Lighthouse.";
            const prompt = `Analiza estos datos de Lighthouse para la URL ${url} (${strategy}). 
Genera un plan de acción de 3 pasos técnicos obligatorios para mejorar el LCP y CLS. 
Para cada paso, incluye:
1. Problema (resumen métrico)
2. Causa técnica
3. Solución (fragmento de código HTML/CSS/JS si aplica)

AUDITS:
${JSON.stringify(criticalAudits, null, 2)}`;

            aiRoadmap = await callGemini([{ role: "user", parts: [{ text: prompt }] }], system, {
                model: "gemini-1.5-pro-002",
                temperature: 0.3
            });
            console.log(`[PageSpeed AI] Roadmap generated for ${url}`);
        } catch (aiErr: any) {
            console.warn("[PageSpeed AI] Failed to generate AI roadmap:", aiErr.message);
        }

        const finalResult = {
            ...data,
            aiRoadmap,
            _cachedAt: new Date().toISOString()
        };

        // ── 4. Save to Cache (Fire & Forget) ──────────────────────────────────
        runQuery(async (sql) => 
            sql`INSERT INTO pagespeed_cache (url, strategy, data) 
                VALUES (${url}, ${strategy}, ${JSON.stringify(finalResult)})
                ON CONFLICT DO NOTHING`
        ).catch(e => console.error("[PageSpeed Cache] Save failed:", e.message));

        return {
            statusCode: 200,
            headers: { ...CORS, "X-Cache": "MISS" },
            body: JSON.stringify(finalResult)
        };

    } catch (e: any) {
        const status = e.response?.status || 500;
        const errBody = e.response?.data || { error: e.message };
        
        console.error(`[PageSpeed Error] ${status}: ${e.message}`);
        
        return { 
            statusCode: status, 
            headers: CORS,
            body: JSON.stringify(errBody) 
        };
    }
};
