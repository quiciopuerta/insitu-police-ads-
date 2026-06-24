import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";
/**
 * Netlify Function: api-google-ads
 * =================================
 * Server-side proxy for Google Ads API + Google Search Console API.
 * Prevents CORS issues and keeps the developer token server-side.
 *
 * Routes (dispatched by body.action):
 *   - listCustomers          → customers:listAccessibleCustomers
 *   - getCampaigns           → GAQL: campaign performance
 *   - getAuctionInsights     → GAQL: auction_insight (FIXED resource)
 *   - getSearchConsoleData   → Google Search Console API (own domain only)
 *
 * Route: POST /api/google-ads/*
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { checkRateLimit, getClientIp } from "./_lib/rateLimiter";
import { safeError, logError } from "./_lib/errorHandler";
import { callGeminiApi } from './_lib/gemini';
import { runQuery } from './_lib/db';

const DEV_TOKEN = process.env.GOOGLE_ADS_DEV_TOKEN || "";
const GOOGLE_ADS_BASE = "https://googleads.googleapis.com/v23";
const SEARCH_CONSOLE_BASE = "https://searchconsole.googleapis.com/webmasters/v3";

if (!DEV_TOKEN) {
    console.error("[api-google-ads] CRITICAL: GOOGLE_ADS_DEV_TOKEN is not set. All Google Ads API calls will fail.");
}

const PERIOD_MAPPINGS: Record<string, string> = {
    "30d": "DURING LAST_30_DAYS",
    "90d": "DURING LAST_90_DAYS",
    "6m": "DURING LAST_6_MONTHS",
    "12m": "DURING THIS_YEAR",
};

// ─── Sub-handlers ──────────────────────────────────────────────────────────────

/** Extract the first meaningful reason code from a Google Ads API error response */
const extractGoogleReason = (errBody: any): string => {
    const details = errBody?.error?.details || [];
    for (const d of details) {
        if (d.errors?.length) return d.errors[0].reason || "";
    }
    return errBody?.error?.status || "";
};

const listCustomers = async (accessToken: string) => {
    const res = await fetch(`${GOOGLE_ADS_BASE}/customers:listAccessibleCustomers`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": DEV_TOKEN,
        },
    });
    if (!res.ok) {
        const status = res.status;
        const err = await res.json().catch(() => ({})) as any;
        const reason = extractGoogleReason(err);
        const message = err?.error?.message || `Google Ads API error: ${status}`;
        console.error(`[api-google-ads] listCustomers failed (${status}). reason=${reason} | message=${message.substring(0, 200)}`);
        const error: any = new Error(message);
        error.status = status;
        error.googleReason = reason;
        error.isGoogleAds = true;
        throw error;
    }
    const data = await res.json() as any;
    const resourceNames: string[] = data.resourceNames || [];

    // Fetch customer details in parallel
    const accounts = await Promise.all(
        resourceNames.map(async (name: string) => {
            const customerId = name.split("/")[1];
            if (!customerId) return null;
            try {
                const searchRes = await fetch(
                    `${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            "developer-token": DEV_TOKEN,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            query: `SELECT customer.id, customer.descriptive_name, customer.status FROM customer`,
                        }),
                    }
                );
                if (!searchRes.ok) return { id: customerId, name: `ID: ${customerId}`, resourceName: name, status: "unknown" };
                const searchData = await searchRes.json() as any;
                const info = searchData.results?.[0]?.customer;
                return {
                    id: customerId,
                    name: info?.descriptiveName || `Cuenta ${customerId}`,
                    resourceName: name,
                    status: info?.status === "ENABLED" ? "active" : "paused",
                };
            } catch (error: any) {
                console.error(`[api-google-ads] Account fetch error (${customerId}):`, error.message);
                return { id: customerId, name: `ID: ${customerId}`, resourceName: name, status: "error" };
            }
        })
    );
    return accounts.filter(Boolean);
};

const getCampaigns = async (accessToken: string, customerId: string, period = "90d") => {
    const gaqlPeriod = PERIOD_MAPPINGS[period] || "DURING LAST_30_DAYS";
    const query = `
    SELECT
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date ${gaqlPeriod}
    AND campaign.status = 'ENABLED'
    ORDER BY metrics.clicks DESC
    LIMIT 10
  `;
    const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": DEV_TOKEN,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
    });
    
    if (!res.ok) {
        const status = res.status;
        const err = await res.json().catch(() => ({})) as any;
        const details = err?.error?.message || `Error ${status}`;
        
        const error: any = new Error(details);
        error.status = status;
        error.isGoogleAds = true;
        throw error;
    }

    const data = await res.json() as any;
    return (data.results || []).map((row: any) => ({
        campaignName: row.campaign.name,
        clicks: parseInt(row.metrics.clicks || "0"),
        impressions: parseInt(row.metrics.impressions || "0"),
        cost: parseFloat(row.metrics.costMicros || "0") / 1_000_000,
        conversions: parseFloat(row.metrics.conversions || "0"),
        ctr: parseFloat(row.metrics.ctr || "0"),
        cpc: parseFloat(row.metrics.averageCpc || "0") / 1_000_000,
    }));
};

const getAuctionInsights = async (accessToken: string, customerId: string, period = "90d") => {
    const gaqlPeriod = PERIOD_MAPPINGS[period] || "DURING LAST_30_DAYS";
    const query = `
    SELECT
      auction_insight.domain,
      metrics.search_impression_share,
      metrics.search_overlap_rate,
      metrics.search_outranking_share,
      metrics.search_top_impression_share,
      metrics.search_absolute_top_impression_share,
      metrics.search_rank_lost_impression_share
    FROM auction_insight
    WHERE segments.date ${gaqlPeriod}
    ORDER BY metrics.search_impression_share DESC
    LIMIT 10
  `;
    const res = await fetch(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": DEV_TOKEN,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as any;
        console.warn("[api-google-ads] Auction insights not available:", err?.error?.message);
        return [];
    }
    const data = await res.json() as any;
    return (data.results || []).map((row: any) => ({
        domain: row.auctionInsight?.domain || "Competidor Desconocido",
        impressionShare: parseFloat(row.metrics?.searchImpressionShare || "0"),
        overlapRate: parseFloat(row.metrics?.searchOverlapRate || "0"),
        outrankingShare: parseFloat(row.metrics?.searchOutrankingShare || "0"),
        topImpressionShare: parseFloat(row.metrics?.searchTopImpressionShare || "0"),
        absTopImpressionShare: parseFloat(row.metrics?.searchAbsoluteTopImpressionShare || "0"),
        rankLostShare: parseFloat(row.metrics?.searchRankLostImpressionShare || "0"),
        avgPosition: 0,
        cpc: 0,
    }));
};

const getSearchConsoleData = async (
    accessToken: string,
    siteUrl: string,
    period = "90d"
) => {
    const endDate = new Date();
    const startDate = new Date();
    const days = { "30d": 30, "90d": 90, "6m": 180, "12m": 365 }[period] || 90;
    startDate.setDate(startDate.getDate() - days);

    const fmt = (d: Date) => d.toISOString().split("T")[0];

    const queriesRes = await fetch(
        `${SEARCH_CONSOLE_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                startDate: fmt(startDate),
                endDate: fmt(endDate),
                dimensions: ["query"],
                rowLimit: 50,
                orderBy: [{ field: "clicks", sortOrder: "DESCENDING" }],
            }),
        }
    );

    const pagesRes = await fetch(
        `${SEARCH_CONSOLE_BASE}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                startDate: fmt(startDate),
                endDate: fmt(endDate),
                dimensions: ["page"],
                rowLimit: 25,
                orderBy: [{ field: "clicks", sortOrder: "DESCENDING" }],
            }),
        }
    );

    const sitesRes = await fetch(`${SEARCH_CONSOLE_BASE}/sites`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    const [queriesData, pagesData, sitesData] = await Promise.all([
        queriesRes.ok ? queriesRes.json() as Promise<any> : Promise.resolve(null),
        pagesRes.ok ? pagesRes.json() as Promise<any> : Promise.resolve(null),
        sitesRes.ok ? sitesRes.json() as Promise<any> : Promise.resolve(null),
    ]);

    const topQueries = (queriesData?.rows || []).map((row: any) => ({
        query: row.keys?.[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: Math.round(row.ctr * 10000) / 100, 
        position: Math.round(row.position * 10) / 10,
    }));

    const topPages = (pagesData?.rows || []).map((row: any) => ({
        url: row.keys?.[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: Math.round(row.ctr * 10000) / 100,
        position: Math.round(row.position * 10) / 10,
    }));

    const totalImpressions = topQueries.reduce((s: number, q: any) => s + q.impressions, 0);
    const totalClicks = topQueries.reduce((s: number, q: any) => s + q.clicks, 0);
    const avgCTR = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0;

    return {
        siteUrl,
        period,
        dateRange: { startDate: fmt(startDate), endDate: fmt(endDate) },
        summary: {
            totalClicks,
            totalImpressions,
            avgCTR,
            avgPosition: topQueries.length > 0
                ? Math.round(topQueries.reduce((s: number, q: any) => s + q.position, 0) / topQueries.length * 10) / 10
                : null,
        },
        topQueries: topQueries.slice(0, 30),
        topPages: topPages.slice(0, 15),
        verifiedSites: (sitesData?.siteEntry || []).map((s: any) => s.siteUrl),
        source: "Google Search Console API",
    };
};

// ─── Main handler ──────────────────────────────────────────────────────────────
const handler: Handler = async (event: HandlerEvent, _ctx: HandlerContext) => {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: "" };
    }
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Method not allowed" }) };
    }

    let body: Record<string, any> = {};
    try {
        body = JSON.parse(event.body || "{}");
    } catch {
        return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const clientIp = getClientIp(event);
    const rateLimit = await checkRateLimit(clientIp, { windowMs: 60000, max: 20 }); 
    if (!rateLimit.success) {
        return { 
            statusCode: 429, 
            headers: getCorsHeaders(event.headers.origin || event.headers.Origin), 
            body: JSON.stringify({ error: "Too many requests. Please try again in a minute." }) 
        };
    }

    // Authentication
    const userId = getUserIdFromHeaders(event.headers);
    if (!userId) {
        return { statusCode: 401, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Unauthorized: Missing identity" }) };
    }

    const userExists = await runQuery(async (sql) => {
        const rows = await sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1`;
        return rows && rows.length > 0;
    });

    if (!userExists) {
        return { statusCode: 401, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Unauthorized: Invalid identity" }) };
    }

    const { action, accessToken, period, siteUrl } = body;
    const cleanCustomerId = (body.customerId || "").replace(/-/g, "");

    if (!DEV_TOKEN) {
        return { 
            statusCode: 503, 
            headers: getCorsHeaders(event.headers.origin || event.headers.Origin), 
            body: JSON.stringify({ 
                error: "[503] Google Ads Dev Token not configured.",
                recommendation: "Configura la variable de entorno GOOGLE_ADS_DEV_TOKEN en el panel de Netlify o en tu archivo .env local.",
                details: "El Developer Token es obligatorio para realizar llamadas a la API de Google Ads."
            }) 
        };
    }

    const isInternalProxy = event.headers["x-internal-proxy"] === "1" || event.headers["X-Internal-Proxy"] === "1";

    if (!accessToken && action !== "ping" && action !== "search_audit" && !isInternalProxy) {
        return { 
            statusCode: 401, 
            headers: getCorsHeaders(event.headers.origin || event.headers.Origin), 
            body: JSON.stringify({ 
                error: "Token OAuth no encontrado. Debes vincular tu cuenta de Google Ads.",
                type: "TOKEN_MISSING"
            }) 
        };
    }

    // Basic sanity check: Google OAuth access tokens start with "ya29."
    // If it doesn't match, it's almost certainly stale/invalid.
    // Skip this check for search_audit if no token is provided.
    if (accessToken && typeof accessToken === "string" && accessToken !== "demo_token" && !accessToken.startsWith("ya29.")) {
        console.warn("[api-google-ads] accessToken does not look like a valid Google OAuth token.");
        return {
            statusCode: 401,
            headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
            body: JSON.stringify({ 
                error: "El token de Google no es válido. Por favor, vuelve a vincular tu cuenta.",
                type: "INVALID_TOKEN_FORMAT"
            })
        };
    }

    try {
        console.log(`[api-google-ads] 📡 Action: ${action} | Customer: ${cleanCustomerId || 'N/A'}`);
        let result: any;

        switch (action) {
            case "ping": {
                // Diagnostic route to check dev token and token reachability
                const pingRes = await fetch(`${GOOGLE_ADS_BASE}/customers:listAccessibleCustomers`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "developer-token": DEV_TOKEN,
                    },
                });
                const pingBody = await pingRes.json().catch(() => ({})) as any;
                result = {
                    status: pingRes.ok ? "online" : "error",
                    googleStatus: pingRes.status,
                    googleMessage: pingBody?.error?.message || null,
                    devTokenConfigured: !!DEV_TOKEN,
                    devTokenLength: DEV_TOKEN.length,
                    accessTokenPrefix: typeof accessToken === "string" ? accessToken.substring(0, 6) : "(none)",
                    apiVersion: GOOGLE_ADS_BASE,
                    accounts: pingRes.ok ? (pingBody?.resourceNames || []) : [],
                };
                break;
            }

            case "listCustomers":
                result = await listCustomers(accessToken);
                break;

            case "getCampaigns":
                if (!cleanCustomerId || cleanCustomerId.length < 8) {
                    return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Invalid customerId" }) };
                }
                result = await getCampaigns(accessToken, cleanCustomerId, period);
                break;

            case "getAuctionInsights":
                if (!cleanCustomerId) return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "customerId required" }) };
                result = await getAuctionInsights(accessToken, cleanCustomerId, period);
                break;

            case "getSearchConsoleData":
                if (!siteUrl) return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "siteUrl required" }) };
                result = await getSearchConsoleData(accessToken, siteUrl, period);
                break;

            case "analyzeAnomalies": {
                if (!cleanCustomerId) return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "customerId required" }) };
                
                // 1. Fetch Current vs Previous Metrics
                const [current, previous, auction] = await Promise.all([
                    getCampaigns(accessToken, cleanCustomerId, "30d"),
                    // Custom date range logic for "previous" could be added, but for now we use 60d total and the AI can differentiate
                    getCampaigns(accessToken, cleanCustomerId, "90d"), 
                    getAuctionInsights(accessToken, cleanCustomerId, "30d")
                ]);

                // 2. Call Claude 3.5 Sonnet for strategic analysis
                const system = "Eres un Senior SEM Planner de INsitu AI Ads. Tu misión es detectar anomalías en el rendimiento y explicarlas usando Auction Insights.";
                const prompt = `Analiza el rendimiento de la cuenta ${cleanCustomerId}.
DATOS RECIENTES (30d):
${JSON.stringify(current, null, 2)}

DATOS HISTORICOS (Contexto 90d):
${JSON.stringify(previous.slice(0, 5), null, 2)}

AUCTION INSIGHTS (Competidores):
${JSON.stringify(auction, null, 2)}

Detecta si algún competidor está afectando el CPC o la Cuota de Impresión y da una recomendación táctica clara.`;

                const aiResponseData = await callGeminiApi({
                    model: "gemini-2.5-flash",
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    systemInstruction: system,
                    generationConfig: {
                        temperature: 0.5,
                        maxOutputTokens: 2048,
                        thinkingConfig: { thinkingBudget: 0 }
                    }
                });
                
                const aiAnalysis = aiResponseData.candidates?.[0]?.content?.parts?.[0]?.text || "";

                result = {
                    analysis: aiAnalysis,
                    timestamp: new Date().toISOString()
                };
                break;
            }

            case "search_audit": {
                const { theme, country, objective, lang, realAccountData, landingUrl, brand } = body;
                const system = "Eres SearchIntel AI, un Senior Media Planner y experto en auditoría forense de Google Ads.";
                const prompt = `Realiza una auditoría de mercado para:
- Término: ${theme}
- País: ${country}
- Objetivo: ${objective}
- Idioma: ${lang}
${landingUrl ? `- URL: ${landingUrl}` : ""}
${realAccountData ? `- Datos Reales: ${JSON.stringify(realAccountData)}` : ""}
${brand ? `- ADN de Marca: ${JSON.stringify(brand)}` : ""}

Usa Google Search para validar datos actuales.`;

                // Use Gemini 2.5 Flash via native API (avoids Vertex AI latency & token issues)
                const aiResponseData = await callGeminiApi({
                    model: "gemini-2.5-flash",
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    systemInstruction: system,
                    tools: [{ google_search: {} }], // Enable Google Search Grounding
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 4096,
                        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for Grounding compatibility
                    }
                });

                const aiResponse = aiResponseData.candidates?.[0]?.content?.parts?.[0]?.text || "";

                result = { 
                    text: aiResponse,
                    timestamp: new Date().toISOString()
                };
                break;
            }

            default:
                return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: `Unknown action: ${action}` }) };
        }

        return { statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify(result) };
    } catch (err: any) {
        const status = err.status || 500;
        const message = err.message || "Internal Server Error";
        
        console.error(`[api-google-ads] ❌ Error (${action} on ${cleanCustomerId}):`, message);

        // Passthrough status for 404
        if (status === 404) {
            return {
                statusCode: 404,
                headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                body: JSON.stringify({ 
                    error: `Cuenta no encontrada (${cleanCustomerId}). Verifica el ID.`,
                    details: message 
                })
            };
        }

        if (status === 401 || status === 403) {
            const reason: string = (err as any).googleReason || "";
            const msgLower = message.toLowerCase();
            
            // Differentiate between Google Ads API errors and other auth errors (like Gemini)
            const isGoogleAdsError = (err as any).isGoogleAds || reason || msgLower.includes("google ads") || msgLower.includes("developer token") || msgLower.includes("customer_id");
            
            if (isGoogleAdsError) {
                const isDevTokenError = reason.includes("DEVELOPER_TOKEN") ||
                    msgLower.includes("developer_token") ||
                    msgLower.includes("not_approved") ||
                    msgLower.includes("developer token");
                const isExpiredToken = reason === "UNAUTHENTICATED" ||
                    reason.includes("INVALID_GRANT") ||
                    msgLower.includes("invalid_grant") ||
                    msgLower.includes("token expired") ||
                    msgLower.includes("unauthenticated") ||
                    msgLower.includes("request had invalid authentication");
                const isScopeError = reason.includes("SCOPE") || msgLower.includes("insufficient scope") || msgLower.includes("scope");
                const errorType = isDevTokenError ? "DEVELOPER_TOKEN_ERROR" 
                    : isExpiredToken ? "TOKEN_EXPIRED" 
                    : isScopeError ? "SCOPE_INSUFFICIENT"
                    : "USER_OAUTH_ERROR";
                const recommendation = isDevTokenError
                    ? "Tu Google Ads Developer Token no está aprobado o está en estado 'Dormant'. Verifica en https://ads.google.com/home/tools/manager-accounts/ → Configuración → API Center."
                    : isScopeError
                    ? "El token OAuth no incluye el scope 'https://www.googleapis.com/auth/adwords'. Desvincula y vuelve a vincular tu cuenta de Google Ads para regenerar el token con los permisos correctos."
                    : "El token de acceso de Google ha expirado (duran 1 hora). Desvincula y vuelve a vincular tu cuenta de Google Ads."
                
                console.error(`[api-google-ads] Google Ads Auth error: type=${errorType} reason=${reason}`);
                return {
                    statusCode: status,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify({ 
                        error: "Problema de autenticación con Google Ads.",
                        details: message,
                        type: errorType,
                        googleReason: reason,
                        recommendation,
                        hint: `Developer Token configurado: ${!!DEV_TOKEN} (${DEV_TOKEN.length} chars).`
                    })
                };
            } else {
                // Handle non-Google Ads auth errors (e.g., Gemini API key issues)
                console.error(`[api-google-ads] General Auth error: ${message}`);
                return {
                    statusCode: status,
                    headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
                    body: JSON.stringify({ 
                        error: "Error de autenticación en los servicios de IA.",
                        details: message,
                        type: "AI_AUTH_ERROR"
                    })
                };
            }
        }

        return { 
            statusCode: status, 
            headers: getCorsHeaders(event.headers.origin || event.headers.Origin), 
            body: JSON.stringify({ error: message }) 
        };
    }
};

export { handler };
