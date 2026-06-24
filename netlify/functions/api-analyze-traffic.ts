import { getCorsHeaders } from "./_lib/corsHelper";
import { getUserIdFromHeaders } from "./_lib/authMiddleware";

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { Type } from "@google/genai";
import { fetchRealDataAll, buildRealDataContext } from "./_lib/realDataService";
import { safeError, logError } from "./_lib/errorHandler";
import { runQuery } from "./_lib/db";
import { checkRateLimit, getClientIp } from "./_lib/rateLimiter";
import { getGeminiKey as _getGeminiKey, callGeminiApi } from "./_lib/gemini";

const getGeminiKey = (): string => _getGeminiKey().key;

/** 
 * Extracts JSON from AI response, handling potential markdown blocks or conversational text.
 */
function extractJson(text: string): string {
    if (!text) return "{}";
    
    // 1. Try to find content between triple backticks (markdown code block)
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (markdownMatch && markdownMatch[1]) {
        return markdownMatch[1].trim();
    }
    
    // 2. Try to find the first '{' and last '}'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        return text.substring(firstBrace, lastBrace + 1).trim();
    }
    
    return text.trim();
}

/**
 * Internal logic for consistent data normalization (Capa 3).
 * Ensures that both cached and fresh results follow the same estimation models.
 */
function applyConsistentNormalization(result: any, realData: any): void {
    // 1. Domain Sanitization (Critical: Anti-Placeholder)
    const isMock = (str: string) => /example\.com|ejemplo\.com|url-real|competidor\d+\.com/i.test(str);
    
    const sanitizeObj = (obj: any) => {
        if (!obj) return;
        for (const key in obj) {
            if (typeof obj[key] === 'string' && isMock(obj[key])) {
                obj[key] = ""; // Clear placeholders
            } else if (Array.isArray(obj[key])) {
                obj[key] = obj[key].filter((item: any) => {
                    if (typeof item === 'string') return !isMock(item);
                    if (item && item.domain) return !isMock(item.domain);
                    if (item && item.url) return !isMock(item.url);
                    return true;
                });
                obj[key].forEach((item: any) => typeof item === 'object' && sanitizeObj(item));
            } else if (typeof obj[key] === 'object') {
                sanitizeObj(obj[key]);
            }
        }
    };
    sanitizeObj(result);

    // 2. Estimation Formulas (based on DA correlation studies)
    const estTraffic = (d: number) => {
        if (d <= 5) return Math.round(Math.pow(d + 5, 1.8) * 15); // Floor for very low DA
        if (d <= 15) return Math.round(Math.pow(d, 1.8) * 15);
        if (d <= 40) return Math.round(Math.pow(d, 2.2) * 3);
        if (d <= 70) return Math.round(Math.pow(d, 2.4) * 1.5);
        return Math.round(Math.pow(d, 2.6) * 0.8);
    };
    const estKeywords = (d: number) => Math.round(estTraffic(d) / (d <= 20 ? 4 : d <= 50 ? 6 : 8));
    const estBacklinks = (d: number) => {
        if (d <= 20) return Math.round(Math.pow(d, 1.6) * 3);
        if (d <= 50) return Math.round(Math.pow(d, 1.9) * 1.2);
        return Math.round(Math.pow(d, 2.1) * 0.6);
    };

    // 3. Normalization (only apply if value is 0/missing but site existed)
    // Expanded siteExists heuristic: if the API found ANY data (PageRank, WHOIS, history), the site exists.
    const siteExists = !!(
        realData?.domainHealth?.isReachable || 
        realData?.waybackHistory?.hasArchive ||
        realData?.pageRank ||
        (realData?.backlinksData?.totalFound > 0) ||
        (realData?.whoisAge?.ageYears !== null && realData?.whoisAge?.ageYears !== undefined)
    );
    
    if (siteExists) {
        // Normalización de Domain Authority (Critical for result rendering)
        if (!result.domainAuthority || result.domainAuthority === 0) {
            // Priority: Real PageRank > Wayback Seen Year Correlation > Baseline
            const realPR = realData?.pageRank?.domainAuthority;
            const wbYear = realData?.waybackHistory?.firstSeenYear;
            if (realPR && realPR > 0) {
                result.domainAuthority = realPR;
            } else if (wbYear && wbYear < 2015) {
                result.domainAuthority = 15; // Established site fallback
            } else if (wbYear && wbYear < 2020) {
                result.domainAuthority = 8;
            } else {
                result.domainAuthority = 2; // New reachable site
            }
        }

        const da = (result.domainAuthority as number) || 2;

        if (!result.organicTraffic || result.organicTraffic === 0) {
            result.organicTraffic = Math.max(150, estTraffic(da));
            if (result.dataQuality) {
                result.dataQuality.isEstimated = true;
                result.dataQuality.confidenceScore = Math.min(result.dataQuality.confidenceScore || 45, 45);
                result.dataQuality.sourceReliability = 'Low (Calculated)';
            }
        }
        if (!result.organicKeywords || result.organicKeywords === 0) {
            result.organicKeywords = Math.max(30, estKeywords(da));
        }
        if (!result.backlinks || result.backlinks === 0) {
            const commoncrawlCount = realData.backlinksData?.totalFound || 0;
            result.backlinks = commoncrawlCount > 0 ? commoncrawlCount : Math.max(15, estBacklinks(da));
        }
    }
}

// ─── Competitor JSON schema ────────────────────────────────────────────────────
const competitorSchema = {
    type: Type.OBJECT,
    properties: {
        domain: { type: Type.STRING },
        position: { type: Type.NUMBER },
        trafficVolume: { type: Type.NUMBER },
        commonKeywords: { type: Type.NUMBER },
        competitionLevel: { type: Type.STRING },
        domainAuthority: { type: Type.NUMBER },
        avgPosition: { type: Type.NUMBER },
        organicKeywords: { type: Type.NUMBER },
        backlinks: { type: Type.NUMBER },
        strategy: { type: Type.STRING },
        gapInsight: { type: Type.STRING },
        trafficSource: { type: Type.STRING },
    },
    required: [
        "domain", "position", "trafficVolume", "commonKeywords",
        "competitionLevel", "domainAuthority", "avgPosition",
        "organicKeywords", "backlinks", "strategy", "gapInsight",
        "trafficSource",
    ],
};

const DATA_QUALITY_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        confidenceScore: { type: Type.NUMBER }, // 0-100
        sourceReliability: { type: Type.STRING }, // 'High' | 'Medium' | 'Low'
        validationMethod: { type: Type.STRING }, // e.g. 'API + Search Grounding'
    },
    required: ["confidenceScore", "sourceReliability", "validationMethod"],
};

let seoHistoryInitialized = false;

const handler: Handler = async (event: HandlerEvent, _ctx: HandlerContext) => {
    // ── CORS preflight ─────────────────────────────────────────────────────────
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const clientIp = getClientIp(event);
    const rateLimit = await checkRateLimit(clientIp, { windowMs: 60000, max: 10 });
    if (!rateLimit.success) {
        return { statusCode: 429, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Rate limit exceeded. Try again later." }) };
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

    let domain = "";
    let country = "Global";
    let language = "es";
    let period = "90d";
    let refresh = false;

    try {
        const { 
            domain: rawDomain, 
            nicheDescription = "", 
            country: bodyCountry = "Global", 
            forceRefresh = false, 
            period: bodyPeriod = "90d",
            language: bodyLanguage = "es" 
        } = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        domain = rawDomain?.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "") || "";
        // sanitize domain to prevent prompt injection: remove control chars, newlines, and suspicious escape chars
        domain = domain
            .replace(/[\n\r\x00-\x1F`"\\]/g, "")  // Remove control chars, newlines, backticks, quotes, backslashes
            .substring(0, 255)
            .toLowerCase()
            .trim();
        // Validate domain format: alphanumeric, dots, hyphens only
        if (!/^[a-z0-9]([a-z0-9-\.]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(domain)) {
            return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Invalid domain format" }) };
        }
        country = bodyCountry;
        language = bodyLanguage;
        period = bodyPeriod;
        refresh = !!forceRefresh;
    } catch {
        return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "Invalid JSON body" }) };
    }

    if (!domain) {
        return { statusCode: 400, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify({ error: "domain is required" }) };
    }

    try {
        // ── STEP 0: Caching & Persistence Check ──────────────────────────────────
        if (!seoHistoryInitialized) {
            await runQuery(async (sql) => {
                await sql`
                    CREATE TABLE IF NOT EXISTS seo_history (
                        id SERIAL PRIMARY KEY,
                        domain TEXT NOT NULL,
                        result TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `;
            }).catch(err => console.error("[TrafficAnalysis] Init failed:", err));
            seoHistoryInitialized = true;
        }

        if (!refresh) {
            const recent = await runQuery(async (sql) => {
                return await sql`
                    SELECT result, created_at FROM seo_history 
                    WHERE domain = ${domain} 
                    AND created_at > NOW() - INTERVAL '24 hours' 
                    ORDER BY created_at DESC LIMIT 1
                `;
            });
            if (recent && recent.length > 0) {
                console.log(`[api-analyze-traffic] ⚡ Cache Hit for ${domain}`);
                const cached = JSON.parse(recent[0].result);
                cached.isCached = true;
                cached.cachedAt = recent[0].created_at;
                
                // Consistency: Apply normalization to cached data to ensure domain sanitization 
                // and consistent Capa 3 logic.
                applyConsistentNormalization(cached, {}); 
                
                return { statusCode: 200, headers: getCorsHeaders(event.headers.origin || event.headers.Origin), body: JSON.stringify(cached) };
            }
        }

        // Get previous audit for comparison
        let previousAudit: any = null;
        let promptRules: string = "";
        
        const prevAuditRows = await runQuery(async (sql) => {
            return await sql`SELECT result FROM seo_history WHERE domain = ${domain} ORDER BY created_at DESC LIMIT 1`;
        });
        if (prevAuditRows && prevAuditRows.length > 0) previousAudit = JSON.parse(prevAuditRows[0].result);

        try {
            const rulesRows = await runQuery(async (sql) => {
                return await sql`SELECT content FROM ai_prompt_rules WHERE is_active = TRUE AND (feature = 'TrafficChecker_Audit' OR feature = 'global')`;
            });
            if (rulesRows && rulesRows.length > 0) {
                promptRules = "\n📝 REGLAS APRENDIDAS (CRÍTICO - FEEDBACK DE AGENCIA):\n" + rulesRows.map((r: any) => "- " + r.content).join("\n");
            }
        } catch (err) {
            console.error("Could not fetch prompt rules:", err);
        }

        const generateContentWithRetry = async (params: any, retries = 3, delay = 1000): Promise<any> => {
            try {
                const data = await callGeminiApi({
                    model: params.model || "gemini-2.5-flash",
                    contents: params.contents,
                    generationConfig: {
                        temperature: params.config?.temperature ?? 0.4,
                        maxOutputTokens: params.config?.maxOutputTokens ?? 4096,
                        responseMimeType: params.config?.responseMimeType,
                        responseSchema: params.config?.responseSchema,
                        // Disable thinking mode: incompatible with Google Search grounding tools
                        // and adds 10-20s latency for structured JSON output
                        thinkingConfig: { thinkingBudget: 0 }
                    },
                    systemInstruction: params.config?.systemInstruction,
                    tools: params.config?.tools
                });

                const candidate = data.candidates?.[0];
                return {
                    text: candidate?.content?.parts?.[0]?.text || "",
                    candidates: data.candidates,
                    groundingMetadata: candidate?.groundingMetadata
                };
            } catch (error: any) {
                const status = error.message?.match(/\((\d+)\)/)?.[1];
                const isQuotaOrOverload = status === "429" || status === "503" || status === "502";
                
                if (retries > 0 && (isQuotaOrOverload || !error.message?.includes("400"))) {
                    const backoff = delay * 2 + Math.random() * 1000;
                    console.warn(`[api-analyze-traffic] Gemini API error, retrying in ${Math.round(backoff)}ms...`);
                    await new Promise((resolve) => setTimeout(resolve, backoff));
                    return generateContentWithRetry(params, retries - 1, backoff);
                }
                throw error;
            }
        };

        // ── Period, language and date labels ─────────────────────────────────────
        const periodLabel = { "30d": "30 días", "90d": "90 días", "6m": "6 meses", "12m": "12 meses" }[period] || "90 días";
        const langLabel = language === "es" ? "Español" : "English";
        const currentMonthYear = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        const currentDate = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

        // ── STEP 1+2: Run real data collection & niche identification in parallel ──
        console.log(`[api-analyze-traffic] Starting parallel: real data + niche identification for: ${domain}`);
        
        // Add a safety timeout to the parallel data fetching
        // 20s: niche Gemini call with Search Grounding can take 5-10s alone in production
        const fetchTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Global Data Fetch Timeout")), 20000));
        
        const [realData, nicheResponse] = await Promise.race([
            Promise.all([
                fetchRealDataAll(domain),
                generateContentWithRetry({
                    model: "gemini-2.5-flash",
                    contents: [{ role: 'user', parts: [{ text: `Search for the domain ${domain} and determine: 1) What is this website about exactly? 2) What industry/niche does it belong to? 3) What country/language primarily serves? 4) Who is their target audience? Return only a short paragraph.` }] }],
                    config: {
                        systemInstruction: "You are an expert SEO data extractor. Return only the requested information clearly and concisely without conversational filler.",
                        tools: [{ google_search: {} }] as any,
                        maxOutputTokens: 512,
                    },
                }),
            ]),
            fetchTimeout
        ]) as [any, any];
        
        const realDataContext = buildRealDataContext(realData);
        console.log(`[api-analyze-traffic] Real data from ${realData.realDataSources.length} sources`);
        
        // Correct text extraction from GenerativeModel response
        const nicheDescription = nicheResponse.text || `digital marketing website in ${country}`;
        console.log(`[api-analyze-traffic] Niche identified: ${nicheDescription.slice(0, 200)}`);

        // ── STEP 3: Ultra-specific research with niche context ─────────────────────
        const researchPrompt = `ACTÚA COMO: Senior SEO Analyst con acceso a Ahrefs, Semrush y SimilarWeb.

DOMINIO A AUDITAR: ${domain}
NICHO IDENTIFICADO: ${nicheDescription}
MERCADO: ${country} | PERÍODO: ${periodLabel} | IDIOMA: ${langLabel}
FECHA ACTUAL: ${currentDate} (Estamos en ${currentMonthYear}). 
REGLA CRÍTICA: Prioriza datos frescos de los últimos 3 meses (2026).

DATOS VERIFICADOS POR APIs (Tu Ancla de Verdad):
${realDataContext}
${previousAudit ? `\nAUDITORÍA PREVIA (${previousAudit.auditedAt}):\nTraffic: ${previousAudit.organicTraffic}, DA: ${previousAudit.domainAuthority}, Keywords: ${previousAudit.organicKeywords}.` : ""}

PROTOCOLO DE EQUIPO (Gemini + APIs):
Tú eres el Auditor. Las APIs han proporcionado el contexto base. Tu misión es VALIDAR, REFINAR y COMPLETAR.

PASO 1 - Auditoría de Puntos Ciegos y Actualización:
  → Si los datos de la API parecen obsoletos (ej. Common Crawl 2024), utiliza Search Grounding para encontrar métricas de 2025-2026.
  → Si la API dice DA 0 o Tráfico 0 pero el sitio es site:${domain}, BUSCA el motivo real.
  → Si la API no dio datos de competencia, BUSCA dominios reales en ${country} que compitan hoy.

PASO 2 - Keywords del NICHO REAL (Equipo de Investigación):
  → No inventes. Busca en site:semrush.com, site:ahrefs.com para el dominio ${domain}.
  → Identifica las 10 keywords con las que REALMENTE compite.

PASO 3 - Análisis de Tendencias y Comparativa Temporal:
  ${previousAudit ? `→ IMPORTANTE: La auditoría anterior (${previousAudit.auditedAt}) mostró:
    * Tráfico: ${previousAudit.organicTraffic}
    * DA: ${previousAudit.domainAuthority}
    * Keywords: ${previousAudit.organicKeywords}
    Analiza si el sitio está en tendencia ascendente o descendente según los datos más recientes de 2026.` : "→ Identifica la trayectoria actual del sitio (Growth vs Stagnation)."}

PASO 4 - Verificación Cruzada:
  → Si encuentras datos en Search que contradigan a la API, menciónalo en tus hallazgos.
  → Identifica TENDENCIAS DE MERCADO (Market Trends) actuales para este nicho específico en 2026.
  → Prioriza precisión sobre cantidad.
${promptRules}

❌ PROHIBIDO: Usar rangos de texto como "20-40" en campos numéricos. Usa el promedio o el valor superior.`;

        const researchResponse = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: researchPrompt }] }],
            config: {
                systemInstruction: "Eres un analista SEO senior de inteligencia competitiva. Tu única misión es investigar métricas y extraer datos técnicos precisos. No uses lenguaje conversacional ni incluyas disclaimers. Entrega los hallazgos de forma directa y estructurada.",
                tools: [{ google_search: {} }] as any,
                maxOutputTokens: 4096,
            },
        });

        const researchFindings = researchResponse.text || "";
        const groundingMeta = (researchResponse as any).candidates?.[0]?.groundingMetadata;
        const webSources: string[] = (groundingMeta?.groundingChunks || [])
            .map((c: any) => c.web?.uri)
            .filter(Boolean);

        console.log(`[api-analyze-traffic] Research complete. Sources: ${webSources.length}, Findings length: ${researchFindings.length}`);

        // ── STEP 4: Format research into strict JSON schema ────────────────────────
        const formatPrompt = `Eres Senior SEO Auditor & Media Planner. Transforma los HALLAZGOS REALES en un reporte estratégico premium.
            
            DOMINIO: ${domain} | NICHO: ${nicheDescription} | MERCADO: ${country} | IDIOMA: ${language === 'es' ? 'Español' : 'English'}
            
            GUÍA DE IDIOMA: 
            - Escribe todo el análisis y el resumen en ${language === 'es' ? 'Español' : 'English'}.
            - MUY IMPORTANTE: Mantén los términos técnicos de la industria en INGLÉS (ej: Domain Authority, Backlinks, Organic Traffic, CTR, CPC, keywords, Search Intent) para mantener el rigor profesional.
            - Usa un tono de consultoría de alto nivel.

═══ INVESTIGACIÓN REAL(basa TODO en esto): ═══
${researchFindings}

═══ DATOS VERIFICADOS POR APIS: ═══
${realDataContext}

═══ FUENTES WEB CONSULTADAS: ═══
${webSources.slice(0, 10).join("\n") || "Google Search grounding"}

INSTRUCCIONES DE CONVERSIÓN — CRÍTICO, LEE ANTES DE ESCRIBIR EL JSON:

🔴 PRIORIDAD DE FUENTES PARA organicTraffic (en orden estricto):
   P0 — Si los DATOS DE APIS contienen "TRÁFICO MENSUAL EXTRAÍDO AUTOMÁTICAMENTE": USA ESE NÚMERO EXACTO. Es dato pre-parseado de SimilarWeb/SemRush.
   P1 — Si los DATOS DE APIS contienen sección "TRÁFICO REAL (Tavily + SimilarWeb/SemRush)": extrae el número y úsalo.
   P2 — Si los DATOS DE APIS contienen sección "SNIPPETS DE TRÁFICO (Serper Traffic Data)": extrae el número del snippet y úsalo.
   P3 — Si la INVESTIGACIÓN mencionó un número específico de visitas con fuente (SimilarWeb, SemRush, Ahrefs): úsalo.
   P4 — Solo si P0/P1/P2/P3 no tienen datos: estima usando esta tabla de referencia basada en DA:
        DA 1-10: 100-1,000 visitas/mes (sitios nuevos o micro-nichos)
        DA 11-20: 1,000-8,000 visitas/mes (sitios pequeños establecidos)
        DA 21-30: 8,000-25,000 visitas/mes (sitios medianos con contenido)
        DA 31-40: 25,000-60,000 visitas/mes (sitios con autoridad en nicho)
        DA 41-50: 60,000-150,000 visitas/mes (sitios de autoridad)
        DA 51-60: 150,000-350,000 visitas/mes (marcas conocidas)
        DA 61-70: 350,000-700,000 visitas/mes (líderes de industria)
        DA 71+: 700,000+ visitas/mes (top-tier)
        AJUSTA según nicho: e-commerce y noticias tienen 2-3x más tráfico que B2B/SaaS para el mismo DA.

1. organicTraffic: número entero > 0 SIEMPRE. Prioriza datos reales de SimilarWeb/SemRush (P1-P3) sobre estimaciones.
2. organicKeywords: número entero > 0. Mínimo 10 si el sitio existe. Basate en el nicho y contenido encontrado.
3. domainAuthority: usa el valor de Open PageRank de los DATOS VERIFICADOS POR APIS. Si no está, estima 1-5 para sitios pequeños.
4. backlinks: número entero. Si Common Crawl encontró referencias, úsalas. Mínimo 5 si el sitio existe.
5. competitors: MÍN 5 dominios REALES del MISMO NICHO.
    - REGLA ANTI-SOCIAL-MEDIA: NUNCA incluyas Facebook, Instagram, LinkedIn, Amazon, YouTube o Twitter en 'competitors' a menos que el sitio auditado sea una red social.
    - Para cada competidor:
    - Busca en la INVESTIGACIÓN REAL si se mencionó su tráfico con fuente (SimilarWeb, SemRush, Ahrefs) → úsalo y pon trafficSource = "SimilarWeb (real)", "SemRush (real)" o "Ahrefs (real)".
    - Si no hay dato real disponible → estima basado en DA×nicho y pon trafficSource = "Estimación IA".
    - NUNCA inventes un número real sin respaldo de fuente. Sé honesto: prefiere "Estimación IA" a un número falso.
6. keywordsList: keywords REALES del nicho con volúmenes REALES (no keywords de Facebook ni plataformas).
7. topPages: URLs REALES de ${domain} (usa las de site:${domain} que encontraste).
8. backlinksList: dominios REALES que enlazan a ${domain}.
12. dataQuality: Asigna un confidenceScore bajo (20-40) si todos los datos son 'Estimación IA' y alto (80-100) si tienes datos de SimilarWeb/SemRush.
13. summaryContent: GENERAR UN RESUMEN EJECUTIVO (TL;DR) DE ALTO IMPACTO. 
    - Máximo 3 párrafos. 
    - Debe resumir la situación competitiva, la mayor oportunidad de crecimiento detectada y un análisis forense del tráfico.
    - Usa un lenguaje persuasivo y profesional.
14. language: "${language}"

⚠️ PROHIBIDO ABSOLUTAMENTE: Devolver 0 en organicTraffic, organicKeywords o backlinks si el sitio existe y es accesible.
⚠️ PROHIBIDO: Usar dominios de ejemplo como 'example.com', 'url-real', 'ejemplo.com', 'competidor1.com', etc. Devuelve strings reales o vacíos ("").
⚠️ IMPORTANTE: Si tienes datos reales de SimilarWeb en los DATOS DE APIS, DEBES usarlos. No los ignores.`;

        const formatResponse = await generateContentWithRetry({
            model: "gemini-2.5-flash",
            contents: formatPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        domain: { type: Type.STRING },
                        period: { type: Type.STRING },
                        auditedAt: { type: Type.STRING },
                        language: { type: Type.STRING },
                        summaryContent: { type: Type.STRING },
                        organicTraffic: { type: Type.NUMBER },
                        organicKeywords: { type: Type.NUMBER },
                        domainAuthority: { type: Type.NUMBER },
                        backlinks: { type: Type.NUMBER },
                        dataSource: { type: Type.STRING },
                        dataQuality: DATA_QUALITY_SCHEMA,
                        seoCritique: { type: Type.ARRAY, items: { type: Type.STRING } },
                        strategicRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
                        topPages: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    url: { type: Type.STRING },
                                    visits: { type: Type.STRING },
                                    keywords: { type: Type.NUMBER },
                                },
                            },
                        },
                        keywordsList: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    term: { type: Type.STRING },
                                    volume: { type: Type.NUMBER },
                                    difficulty: { type: Type.NUMBER },
                                    position: { type: Type.NUMBER },
                                    intent: { type: Type.STRING },
                                    cpc: { type: Type.STRING },
                                },
                                required: ["term", "volume", "difficulty", "position", "intent"],
                            },
                        },
                        backlinksList: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    url: { type: Type.STRING },
                                    authority: { type: Type.NUMBER },
                                    type: { type: Type.STRING },
                                    context: { type: Type.STRING },
                                    quality: { type: Type.STRING },
                                },
                                required: ["url", "authority", "type", "quality"],
                            },
                        },
                        trafficByCountry: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    country: { type: Type.STRING },
                                    percentage: { type: Type.NUMBER },
                                },
                                required: ["country", "percentage"],
                            },
                        },
                        competitors: {
                            type: Type.ARRAY,
                            items: competitorSchema,
                        },
                        gapAnalysis: { type: Type.ARRAY, items: { type: Type.STRING } },
                        marketTrends: { type: Type.ARRAY, items: { type: Type.STRING } },
                        keywordOpportunities: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    term: { type: Type.STRING },
                                    potential: { type: Type.STRING },
                                },
                                required: ["term", "potential"],
                            },
                        },
                    },
                    required: [
                        "domain", "organicTraffic", "organicKeywords", "domainAuthority", "backlinks",
                        "seoCritique", "competitors", "keywordsList", "backlinksList", "topPages", "trafficByCountry",
                    ],
                  } as any,
                  maxOutputTokens: 8192,
            },
        });

        let result: Record<string, unknown> = {};
        const cleanedJson = extractJson(formatResponse.text || "{}");
        try {
            result = JSON.parse(cleanedJson);
        } catch (e) {
            console.error("[api-analyze-traffic] Error parsing final JSON:", e);
            console.error("[api-analyze-traffic] Raw text was:", formatResponse.text);
            // Fallback: search grounding findings might have enough for a basic result if JSON failed
            throw new Error("La IA no pudo generar un formato válido de datos. Por favor, reintenta.");
        }

        // ── Attach enriched metadata ────────────────────────────────────────────────
        result.webSourcesUsed = webSources.slice(0, 8);
        result.realDataCollected = realData.realDataSources;
        result.realDataDetails = {
            domainAge: realData.whoisAge?.ageYears ?? null,
            domainRegistered: realData.whoisAge?.registrationDate ?? null,
            firstSeenYear: realData.waybackHistory?.firstSeenYear ?? null,
            hasArchive: realData.waybackHistory?.hasArchive ?? null,
            httpsEnabled: realData.domainHealth?.hasHttps ?? null,
            httpStatus: realData.domainHealth?.statusCode ?? null,
            commoncrawlBacklinks: realData.backlinksData?.totalFound ?? null,
            sitemapPages: realData.sitemapData?.total ?? null,
            techStack: realData.builtWithData?.technologies ?? null,
        };
        result.period = result.period || period;
        result.auditedAt = result.auditedAt || new Date().toISOString();
        result.language = language;
        result.country = country;

        // Use real DA from Open PageRank if available and model didn't provide one
        if (realData.pageRank && (!result.domainAuthority || result.domainAuthority === 0)) {
            result.domainAuthority = realData.pageRank.domainAuthority;
        }

        // ── Consistently Normalize and Sanitize ────────────────────────────────────
        applyConsistentNormalization(result, realData);

        // ── Compare with previous audit to get trends ──────────────────────────────
        if (previousAudit) {
            result.previousStats = {
                organicTraffic: previousAudit.organicTraffic,
                organicKeywords: previousAudit.organicKeywords,
                domainAuthority: previousAudit.domainAuthority,
                backlinks: previousAudit.backlinks,
                auditedAt: previousAudit.auditedAt
            };
            
            // Calculate simple trends
            const getTrend = (curr: any, prev: any) => {
                const c = typeof curr === 'number' ? curr : 0;
                const p = typeof prev === 'number' ? prev : 0;
                if (c > p * 1.05) return "up";
                if (c < p * 0.95) return "down";
                return "stable";
            };

            result.trends = {
                traffic: getTrend(result.organicTraffic, previousAudit.organicTraffic),
                keywords: getTrend(result.organicKeywords, previousAudit.organicKeywords),
                da: getTrend(result.domainAuthority, previousAudit.domainAuthority),
                backlinks: getTrend(result.backlinks, previousAudit.backlinks),
            };
        }

        // ── STEP 5: Save result for future temporal comparison ──────────────────────
        await runQuery(async (sql) => {
            await sql`
                INSERT INTO seo_history(domain, result)
                VALUES(${domain}, ${JSON.stringify(result)})
            `;
        }).catch(dbErr => console.error("[api-analyze-traffic] Error saving result to DB:", dbErr));

        console.log(`[api-analyze-traffic] ✅ Analysis complete for ${domain}`);

        return {
            statusCode: 200,
            headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
            body: JSON.stringify(result),
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-analyze-traffic] Error:", message);
        return {
            statusCode: 500,
            headers: getCorsHeaders(event.headers.origin || event.headers.Origin),
            body: JSON.stringify({ error: safeError(err, process.env.NODE_ENV === "development") }),
        };
    }
};

export { handler };
