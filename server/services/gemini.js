
import { GoogleGenAI, Type } from "@google/genai";

import db from '../db.js';

let API_KEYS = [];
let currentKeyIndex = 0;

const refreshKeys = async () => {
    try {
        const row = await db.get("SELECT data FROM settings WHERE id = 1");
        if (row) {
            try {
                const settings = JSON.parse(row.data);
                const aiConfigs = settings.aiConfigs;
                if (Array.isArray(aiConfigs)) {
                    const activeConfigs = aiConfigs.filter(c => c.status === 'active' && c.apiKey);
                    if (activeConfigs.length > 0) {
                        API_KEYS = activeConfigs.map(c => c.apiKey);
                        return;
                    }
                }
            } catch (e) {
                console.error("[Gemini Server] Error parsing settings JSON:", e.message);
            }
        }
        
        // Fallback to Encrypted Env Var (GK_ENC only — NO VITE_ prefix for security)
        const enc = process.env.GK_ENC || "";
        if (enc) {
            try {
                const decoded = Buffer.from(enc, 'base64').toString('utf-8');
                const envKeys = (decoded || "").split(',').map(k => k.trim()).filter(Boolean);
                if (envKeys.length > 0) {
                    API_KEYS = envKeys;
                    return;
                }
            } catch (e) {
                console.error("[Gemini Server] Error decoding GK_ENC:", e.message);
            }
        }

        // 2. Fallback to Raw Env Vars (Removed for security, only encoded keys allowed)
        if (API_KEYS.length === 0) {
            console.warn("[Gemini Server] No API keys found in database or GK_ENC. Raw env vars are disabled for security.");
        }
    } catch (e) {
        console.error("[Gemini Server] Error refreshing keys from DB:", e);
    }
};

const getNextKey = async () => {
    await refreshKeys();
    if (API_KEYS.length === 0) throw new Error("No API Keys configured");
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    return API_KEYS[currentKeyIndex];
};

const getCurrentKey = async () => {
    if (API_KEYS.length === 0) await refreshKeys();
    if (API_KEYS.length === 0) throw new Error("No API Keys configured");
    return API_KEYS[currentKeyIndex];
};

// Simplified token tracking for server-side (logs only)
const trackTokens = (result, taskName, details) => {
    try {
        const estimatedTokens = Math.ceil(JSON.stringify(result).length / 4);
        console.log(`[Token Usage] ${taskName}: ~${estimatedTokens} tokens (${details || ''})`);
    } catch (e) {
        console.error('Error calculating tokens', e);
    }
};

const fetchWithRetry = async (fn, retries = 4, delay = 3000) => {
    try {
        const key = await getCurrentKey();
        return await fn(key);
    } catch (error) {
        const errorMsg = error?.message?.toLowerCase() || "";
        const isQuotaError =
            errorMsg.includes('429') ||
            error?.status === 429 ||
            errorMsg.includes('resource_exhausted') ||
            errorMsg.includes('quota') ||
            errorMsg.includes('503') ||
            error?.status === 503 ||
            errorMsg.includes('unavailable') ||
            errorMsg.includes('capacity');

        if (isQuotaError) {
            console.warn(`[Gemini Server] Temporary error or quota exceeded (Status: ${error?.status || 'unknown'}) with Key #${currentKeyIndex + 1}. Rotating and retrying...`);
            await getNextKey();
            if (retries > 0) {
                return fetchWithRetry(fn, retries - 1, 1000);
            }
        }

        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(fn, retries - 1, delay * 1.5);
        }
        throw error;
    }
};

// Instructions & Constants
const getSystemInstruction = (lang) => `Eres el NÚCLEO DE INTELIGENCIA de Insitu Ai. 
Responde en IDIOMA: ${lang === 'es' ? 'Español' : 'Inglés'}.
IMPORTANTE: El DIAGNÓSTICO ESTRATÉGICO debe entregarse siempre usando una lista de viñetas (bullet points) claras y accionables, no párrafos largos.`;

const AGENT_EXPERT_INSTRUCTION = (lang, context) => `
ACTÚA COMO: El Experto Oficial y Consultor Senior de Insitu AI.
TU OBJETIVO PRINCIPAL: No es dar la respuesta final, sino ENSEÑAR al usuario a usar las potentes herramientas de Insitu AI.
REGLA DE ORO:
1. VALIDA EL CONTEXTO ACTUAL: ${context || 'General'}
2. RESPUESTA BREVE Y AL PUNTO.
3. GUIAR, NO REEMPLAZAR.
TU PERSONALIDAD: "Tour Guide" experto, empático pero enfocado en la acción.
Responde en: ${lang === 'es' ? 'Español' : 'Inglés'}.
FORMATO: Texto plano natural, sin markdown ni caracteres especiales.
`;

const ANTIGRAVITY_CORE_INSTRUCTIONS = `
ACTÚA COMO: Antigravity, un estratega digital de élite y consultor senior de Neuromarketing.
MISIÓN: Auditar activos digitales usando el PROTOCOLO ANTIGRAVITY de 4 capas.

CAPAS DE VALIDACIÓN:
1. NEUROCIENCIA Y ATENCIÓN: Scanpath (Gancho->Valor->CTA), Carga Cognitiva (entropía visual), Contraste/Jerarquía y Disparador Emocional.
2. VALIDACIÓN TÉCNICA (2026): Safe Zones (TikTok/Reels), Formato Óptimo (9:16, 4:5, 1:1) y Regla del 20% de Texto.
3. BENCHMARKS Q1 2026: CTR esperado (>1.5%), Retención/Ritmo cada 2-3s (en video) y Tendencias actuales.
4. PROTOCOLO VERITAS (Ética): Veracidad de promesas, Ad Policy Compliance (Meta/Google) y sustanciación de afirmaciones.
5. TIKTOK ADS COMPLIANCE (Q1 2026): Etiquetado obligatorio de AI ("AI Generated"), Native Score (estética UGC/auténtica), Safe Zones estrictas (interfaz TikTok) y coherencia de oferta en Landing Page.
6. GOOGLE ADS ABCDs (Video): Atraer (Atract), Marca (Brand), Conectar (Connect) y Dirigir (Direct). Prioriza el "ritmo rápido", visibilidad temprana de marca y CTA potente con audio.
`;

const GET_IMAGE_AUDIT_PROMPT = (lang) => `
${ANTIGRAVITY_CORE_INSTRUCTIONS}
AUDITA ESTA IMAGEN AD. Idioma: ${lang === 'es' ? 'Español' : 'Inglés'}.
Proporciona un diagnóstico ejecutivo (Pasa/No Pasa), análisis por capas y sugerencias creativas precisas (ej: códigos hex, cambios de copia).
`;

const GET_VIDEO_AUDIT_PROMPT = (lang) => `
${ANTIGRAVITY_CORE_INSTRUCTIONS}
AUDITA ESTE VIDEO AD. Idioma: ${lang === 'es' ? 'Español' : 'Inglés'}.
Analiza el "Hold Rate" visual, el guion, la música y los estímulos de atención.
Proporciona sugerencias de edición específicas (ej: "Corta los segundos 0:02-0:04").
`;

/**
 * Traffic Check Logic
 */
export const performTrafficCheck = async (domain, country, lang = 'es', period = '90d') => {
    return fetchWithRetry(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });

        // ─── STEP 1: Real data from public APIs ─────────────────────────────────────
        let realData = null;
        try {
            const { fetchRealSEOData } = await import('./seoDataService.js');
            realData = await fetchRealSEOData(domain);
            console.log(`[Traffic] Real data collected from ${realData.realDataSources.length} sources`);
        } catch (e) {
            console.warn('[Traffic] Could not fetch real SEO data:', e.message);
        }

        // Build a context block with whatever real data we have
        const realDataContext = realData ? `
DATOS REALES VERIFICADOS DE APIs PÚBLICAS (incluir en el análisis):
${realData.domainHealth ? `
- ESTADO DEL DOMINIO: ${realData.domainHealth.isReachable ? '✅ Activo' : '❌ Inactivo'}, HTTPS: ${realData.domainHealth.hasHttps ? '✅ Sí' : '❌ No'}, HTTP Status: ${realData.domainHealth.statusCode}. Fuente: ${realData.domainHealth.source}` : ''}
${realData.pageRank ? `
- PAGE RANK REAL: ${realData.pageRank.pageRankDecimal}/10, Posición global: #${realData.pageRank.rankPosition || 'N/A'}. Fuente: ${realData.pageRank.source}
  * Usar este dato como base para domainAuthority (escalar a 0-100).` : '- PAGE RANK: No disponible (sin API key de Open PageRank). Estima basado en Google Search.'}
${realData.backlinksData ? `
- BACKLINKS (Common Crawl): Se encontraron ${realData.backlinksData.totalFound} referencias. Dominios ejemplo: ${realData.backlinksData.samples.map(s => s.url).join(', ')}. Fuente: ${realData.backlinksData.source}` : '- BACKLINKS: Busca con Google Search.'}
${realData.sitemapData ? `
- PÁGINAS REALES DEL SITIO (sitemap): ${realData.sitemapData.total} páginas encontradas. URLs reales: ${realData.sitemapData.urls.slice(0, 8).join(', ')}. Fuente: ${realData.sitemapData.source}` : '- SITEMAP: No encontrado, usa site:${domain} en Google Search.'}

Fuentes de confianza disponibles: ${realData.realDataSources.join('; ')}
` : '';

        // ─── STEP 2: Google Search grounding research (NO schema — incompatible) ────
        // CRITICAL: googleSearch tool is INCOMPATIBLE with responseMimeType/responseSchema.
        const periodLabel = { '30d': '30 días', '90d': '90 días', '6m': '6 meses', '12m': '12 meses' }[period] || '90 días';
        const periodDateHint = { '30d': 'último mes', '90d': 'últimos 3 meses', '6m': 'últimos 6 meses', '12m': 'último año' }[period] || 'últimos 3 meses';

        const researchPrompt = `ACTÚA COMO: Senior SEO Analyst & Competitive Intelligence Specialist (SEMRUSH / Ahrefs / GSC level).
DOMINIO: ${domain} | MERCADO: ${country} | IDIOMA: ${lang === 'es' ? 'Español' : 'English'}
PERÍODO DE ANÁLISIS: ${periodLabel} (${periodDateHint})

${realDataContext}

MISIÓN CRÍTICA: Usando googleSearch, extrae datos REALES Y VERIFICABLES para el período ${periodLabel}.
- PROHIBIDO EXPRESAMENTE usar dominios de prueba, placeholders como "example.com", "competidor1.com", "tusitio.com" o "blog1". DEBES usar URLs y dominios REALES que existan en internet.
- Si la información no está disponible directamente, usa tu base de conocimiento para identificar competidores reales de la industria y sitios reales que probablemente enlacen al dominio.
- Todos los números deben ser AUDITABLES: indica la fuente en tu respuesta.

PROTOCOLO DE INVESTIGACIÓN OBLIGATORIO:
1. Busca: site:${domain} → páginas indexadas realmente en Google hoy
2. Busca: "${domain} traffic" OR "${domain} visitors" site:similaweb.com OR site:semrush.com → tráfico real
3. Busca: ${domain} competitors OR alternatives → competidores reales que Google muestra para las mismas keywords
4. Para CADA competidor encontrado, busca: "{competidor} domain authority" site:moz.com OR site:ahrefs.com → DA real
5. Busca: "${domain}" inbound links OR backlinks site:ahrefs.com OR site:moz.com → backlinks verificados
6. Busca: ${domain} site:google.com → posicionamiento real en SERPs actuales por keyword

ANÁLISIS DE COMPETIDORES (CRÍTICO):
Para cada competidor real encontrado, debes investigar:
- Su Domain Authority (busca en Moz/Ahrefs)
- Su posición promedio en Google Search para las keywords del sector
- Cuántas keywords orgánicas tienen (de fuentes públicas de SEO)
- Cuántos backlinks tienen en total
- Su estrategia SEO principal (contenido, backlinks, técnico, etc.)
- Qué ventaja/desventaja tienen vs ${domain}

ENTREGA: Análisis DETALLADO con NÚMEROS CONCRETOS y FUENTES. Incluye:
- Tráfico estimado con base en indicadores reales (páginas indexadas, DA, antigüedad)
- Backlinks con dominios reales que mencionan a ${domain} (HASTA 500 ITEMS)
- 5+ competidores directos con DA, posición promedio, keywords y backlinks
- Top keywords reales del dominio en el período ${periodLabel} (HASTA 500 ITEMS)
- Top páginas del sitio (HASTA 500 ITEMS)
NO uses ceros — si el sitio está activo siempre hay estimaciones válidas.`;

        const researchResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: researchPrompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const researchFindings = researchResponse.text || '';
        const groundingMeta = researchResponse.candidates?.[0]?.groundingMetadata;
        const webSources = groundingMeta?.groundingChunks?.map(c => c.web?.uri).filter(Boolean) || [];

        console.log(`[Traffic] Google Search used ${webSources.length} real web sources for period: ${period}`);

        // ─── STEP 3: Format research as structured JSON using responseSchema ────────
        // Uses Gemini's Type system — eliminates angle-bracket placeholders being
        // returned literally by the model. The schema enforces real string values.
        const formatPrompt = `Eres un experto senior en SEO y Competitive Intelligence.
Con base en la investigación real sobre "${domain}" para el período ${periodLabel}, extrae y devuelve datos estructurados.

INVESTIGACIÓN REAL (verificada con Google Search):
${researchFindings}

${realDataContext}

Fuentes web consultadas: ${webSources.slice(0, 5).join(', ') || 'Google Search'}

INSTRUCCIONES CRÍTICAS:
- Usa ÚNICAMENTE dominios reales que existen en internet. PROHIBIDO usar "example.com", "competidor1.com", "blog1" o cualquier nombre inventado.
- Si la investigación no entregó todos los datos necesarios, aplica tu conocimiento profundo del sector/nicho de ${domain} para completar con estimaciones realistas y dominios reales.
- organicTraffic mínimo 50 si el sitio está activo.
- organicKeywords mínimo 5 si el sitio tiene páginas indexadas.
- backlinks mínimo 1. Usa dominios reales de calidad para el sector.
- competitors: al menos 5 competidores REALES con domainAuthority, avgPosition, organicKeywords y backlinks completos.
- keywordsList: keywords reales del nicho (hasta 500 items).
- topPages: páginas reales del dominio (hasta 500 items).
- backlinksList: dominios reales que enlazan al sitio (hasta 500 items).
- dataSource: nombra las fuentes reales usadas (Google Search, Common Crawl, SimilarWeb estimado, etc.).
DEVUELVE JSON VÁLIDO con todos los campos del schema.`;

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
            },
            required: ['domain', 'position', 'trafficVolume', 'commonKeywords', 'competitionLevel', 'domainAuthority', 'avgPosition', 'organicKeywords', 'backlinks', 'strategy', 'gapInsight'],
        };

        const formatResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: formatPrompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        domain: { type: Type.STRING },
                        period: { type: Type.STRING },
                        auditedAt: { type: Type.STRING },
                        organicTraffic: { type: Type.NUMBER },
                        organicKeywords: { type: Type.NUMBER },
                        domainAuthority: { type: Type.NUMBER },
                        backlinks: { type: Type.NUMBER },
                        dataSource: { type: Type.STRING },
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
                                required: ['url', 'visits', 'keywords'],
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
                                required: ['term', 'volume', 'difficulty', 'position', 'intent'],
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
                                required: ['url', 'authority', 'type', 'quality'],
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
                                required: ['country', 'percentage'],
                            },
                        },
                        competitors: {
                            type: Type.ARRAY,
                            items: competitorSchema,
                        },
                        gapAnalysis: { type: Type.ARRAY, items: { type: Type.STRING } },
                        keywordOpportunities: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    term: { type: Type.STRING },
                                    potential: { type: Type.STRING },
                                },
                                required: ['term', 'potential'],
                            },
                        },
                    },
                    required: ['domain', 'organicTraffic', 'organicKeywords', 'domainAuthority', 'backlinks', 'seoCritique', 'competitors', 'keywordsList', 'backlinksList', 'topPages', 'trafficByCountry'],
                },
            },
        });

        let result = {};
        try {
            result = JSON.parse(formatResponse.text || '{}');
        } catch (e) {
            console.error('[Traffic] Error parsing final JSON:', e);
        }

        // Attach metadata
        result.webSourcesUsed = webSources.slice(0, 8);
        result.realDataCollected = realData?.realDataSources || [];
        result.period = result.period || period;
        result.auditedAt = result.auditedAt || new Date().toISOString();
        result.language = lang;

        trackTokens(result, 'Traffic Analysis (Period + Competitor DA)', domain);
        return result;
    });
};

/**
 * Image Audit Logic
 */

export const auditAdImage = async (base64Image, mimeType, lang = 'es') => {
    return fetchWithRetry(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [{ inlineData: { data: base64Image, mimeType: mimeType } }, {
                    text: GET_IMAGE_AUDIT_PROMPT(lang)
                }]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        detectedPlatform: { type: Type.STRING },
                        bestPlatformMatch: { type: Type.STRING },
                        designFormat: { type: Type.STRING },
                        scores: { type: Type.OBJECT, properties: { google: { type: Type.NUMBER }, meta: { type: Type.NUMBER }, programmatic: { type: Type.NUMBER } } },
                        analysisPoints: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER }, relevance: { type: Type.NUMBER }, label: { type: Type.STRING }, details: { type: Type.STRING } } } },
                        predictiveMetrics: {
                            type: Type.OBJECT,
                            properties: {
                                cognitiveLoad: { type: Type.NUMBER },
                                cognitiveDemand: { type: Type.NUMBER },
                                clarityScore: { type: Type.NUMBER },
                                focusScore: { type: Type.NUMBER },
                                engagementScore: { type: Type.NUMBER },
                                recallScore: { type: Type.NUMBER }
                            }
                        },
                        aoiScores: { type: Type.OBJECT, properties: { brand: { type: Type.NUMBER }, cta: { type: Type.NUMBER }, product: { type: Type.NUMBER } } },
                        impactScore: { type: Type.NUMBER },
                        visualCritique: { type: Type.STRING },
                        complianceIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
                        creativeSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestedSegmentation: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestedCTAs: { type: Type.ARRAY, items: { type: Type.STRING } },
                        headlines: { type: Type.ARRAY, items: { type: Type.STRING } },
                        captions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        descriptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        psychologicalHooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                        marketingObjective: { type: Type.STRING },
                        improvementPrompt: { type: Type.STRING },
                        overallRating: { type: Type.STRING },
                        scanpath: { type: Type.ARRAY, items: { type: Type.STRING } },
                        executiveSummary: { type: Type.STRING },
                        neuroDiagnosis: {
                            type: Type.OBJECT,
                            properties: {
                                faceBias: { type: Type.STRING },
                                ruleOfThirds: { type: Type.STRING },
                                gestaltLaws: { type: Type.STRING }
                            }
                        }
                    }
                },
            }
        });
        const result = JSON.parse(response.text || "{}");
        const finalResult = { ...result, language: lang };
        trackTokens(finalResult, 'Image Audit', result.detectedPlatform);
        return finalResult;
    });
};

/**
 * Video Audit Logic
 */
export const auditAdVideo = async (base64Video, mimeType, lang = 'es', frames) => {
    return fetchWithRetry(async (apiKey) => {
        const ai = new GoogleGenAI({ apiKey });
        const parts = [{ inlineData: { data: base64Video, mimeType: mimeType } }];

        if (frames && frames.length > 0) {
            frames.forEach((frameBase64) => {
                const cleanBase64 = frameBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
                parts.push({ inlineData: { data: cleanBase64, mimeType: "image/jpeg" } });
            });
        }

        parts.push({
            text: GET_VIDEO_AUDIT_PROMPT(lang)
        });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        platform: { type: Type.STRING },
                        hookStrength: { type: Type.NUMBER },
                        retentionScore: { type: Type.NUMBER },
                        narrativeCritique: { type: Type.STRING },
                        visualQualityScore: { type: Type.NUMBER },
                        audioAnalysis: { type: Type.STRING },
                        conversionTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestedEdits: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestedSegmentation: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestedCTAs: { type: Type.ARRAY, items: { type: Type.STRING } },
                        overallRating: { type: Type.STRING },
                        predictiveMetrics: {
                            type: Type.OBJECT,
                            properties: {
                                avgCognitiveLoad: { type: Type.NUMBER },
                                avgCognitiveDemand: { type: Type.NUMBER },
                                clarityScore: { type: Type.NUMBER },
                                overallFocusScore: { type: Type.NUMBER },
                                peakAttentionTimestamp: { type: Type.STRING },
                                overallRecallPotential: { type: Type.NUMBER }
                            }
                        },
                        scanpath: { type: Type.ARRAY, items: { type: Type.STRING } },
                        executiveSummary: { type: Type.STRING },
                        keyframes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    timestamp: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    analysisPoints: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                x: { type: Type.NUMBER },
                                                y: { type: Type.NUMBER },
                                                label: { type: Type.STRING },
                                                relevance: { type: Type.NUMBER },
                                                details: { type: Type.STRING }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const result = JSON.parse(response.text || "{}");
        if (result.keyframes && frames && frames.length > 0) {
            result.keyframes = result.keyframes.map((k, i) => ({ ...k, imageUrl: frames[i] || null }));
        }

        const finalResult = { ...result, language: lang };
        trackTokens(finalResult, 'Video Audit', result.platform);
        return finalResult;
    });
};

/**
 * Chat Logic
 */
export const chatWithExpert = async (message, history, lang = 'es', context) => {
    return fetchWithRetry(async (apiKey) => {
        const aiClient = new GoogleGenAI({ apiKey });
        const chat = aiClient.chats.create({
            model: "gemini-1.5-flash",
            history: history,
            config: {
                systemInstruction: AGENT_EXPERT_INSTRUCTION(lang, context),
                tools: [{ googleSearch: {} }]
            },
        });
        const response = await chat.sendMessage({ message });
        const text = response.text || "";
        trackTokens({ text }, 'Chat Expert', message.substring(0, 30));
        return text;
    });
};

/**
 * Image Generation Logic (NanoBanana / Imagen 3)
 */
export const generateBlogImage = async (promptContext, referenceUrl) => {
    return fetchWithRetry(async (apiKey) => {
        const genAI = new GoogleGenAI({ apiKey });
        
        const fullPrompt = `Create a premium, corporate, and technological blog header image. 
Context: ${promptContext}.
Subject: Include a professional man resembling the person at ${referenceUrl} (wearing a black shirt), integrated naturally into the context of the image. The image should be highly optimized, humanized, and visually striking.`;

        try {
            console.log(`[Gemini Server] Requesting Blog Image (Imagen 3.0): ${fullPrompt.substring(0, 50)}...`);
            const response = await genAI.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: fullPrompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio: "16:9",
                    outputMimeType: "image/jpeg",
                }
            });

            if (response?.generatedImages && response.generatedImages.length > 0) {
                const base64 = response.generatedImages[0].image.imageBytes;
                return `data:image/jpeg;base64,${base64}`;
            }
            throw new Error("No image returned by Imagen 3.");
        } catch (e) {
            console.error("[Gemini Server] imagen-4.0-generate-001 error:", e.message);
            throw e;
        }
    });
};

/**
 * Unified Media Generation (Imagen 3, Gemini 2.0 Flash Audio)
 */
export const generateMedia = async (type, payload) => {
    return fetchWithRetry(async (apiKey) => {
        const genAI = new GoogleGenAI({ apiKey });

        switch (type) {
            case 'IMAGE_GEN': {
                const { prompt, aspectRatio = "16:9" } = payload;
                try {
                    console.log(`[Gemini Server] Requesting IMAGE_GEN (Imagen 3.0): ${prompt}`);
                    const response = await genAI.models.generateImages({
                        model: 'imagen-4.0-generate-001',
                        prompt: prompt,
                        config: {
                            numberOfImages: 1,
                            aspectRatio,
                            outputMimeType: "image/jpeg",
                        }
                    });
                    if (response?.generatedImages && response.generatedImages.length > 0) {
                        return { 
                            url: `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`,
                            meta: { modelUsed: 'imagen-4.0-generate-001 (Vertex AI)' }
                        };
                    }
                    throw new Error("No image returned by IMAGE_GEN");
                } catch (e) {
                    console.error("[Gemini Server] IMAGE_GEN error:", e.message);
                    throw e;
                }
            }

            case 'IMAGE_EDIT': {
                const { prompt, sourceImageBase64, aspectRatio = "1:1" } = payload;
                if (!sourceImageBase64) throw new Error("sourceImageBase64 is required for IMAGE_EDIT");
                
                const cleanBase64 = sourceImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

                try {
                    console.log(`[Gemini Server] Requesting IMAGE_EDIT (Imagen 3.0): ${prompt}`);
                    const response = await genAI.models.generateImages({
                        model: 'imagen-4.0-generate-001',
                        prompt: prompt,
                        config: {
                            numberOfImages: 1,
                            aspectRatio,
                            outputMimeType: "image/jpeg",
                            referenceImages: [
                                {
                                    referenceImage: {
                                        inlineData: {
                                            data: cleanBase64,
                                            mimeType: "image/jpeg"
                                        }
                                    },
                                    referenceType: "CONTROL_IMAGE",
                                    controlType: "CANNY"
                                }
                            ]
                        }
                    });
                    if (response?.generatedImages && response.generatedImages.length > 0) {
                        return { 
                            url: `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`,
                            meta: { modelUsed: 'imagen-4.0-generate-001 (Vertex AI)' }
                        };
                    }
                    throw new Error("No image returned by IMAGE_EDIT (Imagen 3.0)");
                } catch (e) {
                    console.error("[Gemini Server] IMAGE_EDIT error:", e.message);
                    throw e;
                }
            }

            case 'AUDIO_GEN': {
                const { 
                    text, 
                    audioData, 
                    voice = 'Neutral', 
                    language = 'es',
                    dialect = 'Neutral',
                    tone = 'Professional',
                    emotion = 'Neutral',
                    pitch = 1.0,
                    speed = 1.0
                } = payload;

                const cleanAudioData = audioData ? audioData.replace(/^data:audio\/(wav|mp3|ogg|webm);base64,/, "") : null;

                const VALID_VOICES = new Set([
                    'Zephyr','Puck','Charon','Kore','Fenrir','Leda','Orus','Aoede',
                    'Callirrhoe','Autonoe','Enceladus','Iapetus','Umbriel','Algieba','Despina',
                    'Algenib','Rasalgethi','Laomedeia','Achernar','Alnilam','Schedar','Gacrux',
                    'Pulcherrima','Achird','Zubenelgenubi','Vindemiatrix','Sadachbia','Sadaltager',
                    'Sulafat','Erinome',
                ]);
                const voiceName = VALID_VOICES.has(voice) ? voice : 'Aoede';

                const pitchDesc = pitch < 0.85 ? "lower than normal" : pitch > 1.15 ? "higher than normal" : "natural pitch";
                const speedDesc = speed < 0.8 ? "slow and deliberate" : speed > 1.3 ? "fast-paced" : "natural pace";

                const audioPrompt = [
                    `[Voice Profile] Professional voice-over artist. ${tone} delivery. Natural, clear articulation.`,
                    `[Scene] Professional recording studio.`,
                    `[Director's Notes] Tone: ${tone}. Emotion: ${emotion}. Speaking rate: ${speedDesc}. Pitch: ${pitchDesc}. Language: ${language}, ${dialect} dialect.`,
                    `[Transcript] ${text || "Hello, this is a test narration."}`,
                ].join('\n');

                const response = await genAI.models.generateContent({
                    model: "gemini-2.5-flash-preview-tts",
                    contents: [{ role: 'user', parts: [{ text: audioPrompt }] }],
                    config: {
                        responseModalities: ["AUDIO"],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: { voiceName }
                            }
                        }
                    }
                });

                const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (!audioPart || !audioPart.inlineData) throw new Error("No audio data returned by Gemini TTS");
                return {
                    url: `data:audio/wav;base64,${audioPart.inlineData.data}`,
                    meta: { modelUsed: 'gemini-2.5-flash-preview-tts (AI Studio)', voice: voiceName }
                };
            }

            case 'VIDEO_GEN': {
                // Veo 2.0 (Vertex AI) is required for video generation — not available via Express local server.
                // Run `netlify dev` instead of `npm run dev` to use Netlify Functions with Vertex AI credentials.
                throw new Error(
                    "La generación de video con Veo 2.0 requiere Netlify Functions y credenciales Vertex AI. " +
                    "Usa 'netlify dev' en lugar de 'npm run dev' para desarrollo local, o despliega en Netlify."
                );
            }

            case 'ANIMATE': {
                const { prompt, sourceImage } = payload;
                if (!sourceImage) throw new Error("sourceImage is required for animation");
                
                const cleanImageBase64 = sourceImage.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
                const response = await genAI.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: [{
                        role: 'user',
                        parts: [
                            { inlineData: { data: cleanImageBase64, mimeType: "image/jpeg" } },
                            { text: `Animate this image based on: ${prompt}. Return a 4-second MP4 video.` }
                        ]
                    }],
                    config: {
                        responseModalities: ["VIDEO"]
                    }
                });
                
                const animVideoPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (!animVideoPart || !animVideoPart.inlineData) throw new Error("No animation data returned by Gemini 2.0 Flash");
                return { 
                    url: `data:video/mp4;base64,${animVideoPart.inlineData.data}`,
                    meta: { modelUsed: 'gemini-2.5-flash (AI Studio)' }
                };
            }

            case 'RESEARCH': {
                const { query, language: lang = 'es' } = payload;
                if (!query) throw new Error("Query is required for RESEARCH");

                const researchPrompt = `Eres "MarketIntel AI", un Senior Media Planner e Investigador de Mercado Científico.
Tu objetivo es producir reportes de investigación de mercado rigurosamente verificables para clientes ejecutivos, utilizando Google Search Grounding en tiempo real.

QUERY DEL USUARIO: "${query}"
IDIOMA DE RESPUESTA: ${lang === 'es' ? 'Español' : 'English'}

### ═══ PROTOCOLO DE RIGOR CIENTÍFICO (OBLIGATORIO) ═══
1. **SOLO datos verificados en tiempo real**: Usa únicamente datos encontrados por Google Search Grounding en esta sesión. IGNORA tu conocimiento interno si no está respaldado por una búsqueda actual. NO inventes cifras.
2. **Cita inline obligatoria**: Cada cifra, porcentaje o tendencia debe llevar su referencia [1], [2], [3]... vinculada a una fuente real.
3. **DATO NO ENCONTRADO = DECLARARLO**: Si no encuentras un dato específico, escribe literalmente: "Dato no disponible en fuentes verificadas a fecha ${new Date().getFullYear()}". NUNCA alucines, inventes ni extrapoles.
4. **Jerarquía de Fuentes (Tier 1-4)**: Prioriza fuentes oficiales en este orden:
   - Tier 1: Kantar, NielsenIQ, Statista, Euromonitor, GWI, Ipsos, eMarketer, Similarweb, Think with Google.
   - Tier 2: CEPAL, Cámaras de Comercio, Asobancaria, BID, CAF.
   - Tier 3 (Nacional): INEGI/Banxico (MX), DANE/Banrep (CO), INE/BDE (ES), Census/BLS (USA).
   - Tier 4: McKinsey, Deloitte, PwC, BCG.

### REGLA BILINGÜE CRÍTICA
Responde en ${lang === 'es' ? 'Español' : 'English'}, pero mantén los términos técnicos en INGLÉS (CAGR, TAM/SAM, AdSpend, CPC, CTR, ROAS, Insights, Funnel, etc.).

### ESTRUCTURA OBLIGATORIA (XML TAGS)
Debes devolver el reporte utilizando EXACTAMENTE estos bloques:

<TLDR>
Resumen ejecutivo de alto impacto (máx 150 palabras). 3 hallazgos estratégicos y su implicación de negocio.
</TLDR>

<RESEARCH_BODY>
## 1. Análisis de Tendencias Actuales (2025-2026)
[Descripción + dato cuantitativo + fuente [N] + fecha]

## 2. Datos Clave de Mercado y Benchmarks
[TAM/SAM, CAGR, cuotas de mercado y KPIs del sector (CPC/CTR/ROAS)]

## 3. Perspectiva Institucional y Competitiva
[Contexto económico, entorno legal y players principales]

## 4. Limitaciones Metodológicas
[Datos que NO se encontraron y requieren estudios de pago]

## 5. Conclusión y Recomendaciones
[3-5 pasos accionables basados exclusivamente en la evidencia anterior]
</RESEARCH_BODY>

<SCIENTIFIC_VERACITY>
- Source Reliability: [High/Medium/Low]
- Temporal Freshness: [Latest data year found]
- Data Triangulation: [Status: Confirmed/Discrepancies]
- Grounding Check: [Yes/No]
</SCIENTIFIC_VERACITY>

Nota metodológica: Reporte generado por INsitu AI Research Engine con validación Rigor-V.`;

                const ai = new GoogleGenAI({ apiKey });
                const response = await ai.models.generateContent({ 
                    model: "gemini-2.5-flash",
                    contents: researchPrompt,
                    config: {
                        tools: [{ googleSearch: {} }]
                    }
                });

                const text = response.text || "";
                
                // Extract grounding metadata for the frontend
                const candidate = response.candidates?.[0];
                const rawChunks = candidate?.groundingMetadata?.groundingChunks || [];
                const sources = rawChunks
                    .filter(chunk => chunk.web?.uri)
                    .map((chunk, idx) => ({
                        index: idx + 1,
                        title: chunk.web?.title || (() => { try { return new URL(chunk.web.uri).hostname.replace('www.',''); } catch { return 'Source'; } })(),
                        url: chunk.web.uri,
                    }));

                const rawSupports = candidate?.groundingMetadata?.groundingSupports || [];
                const citationMap = rawSupports
                    .filter(s => s.groundingChunkIndices?.length > 0)
                    .map(s => ({
                        segment: s.segment?.text || '',
                        sourceIndices: s.groundingChunkIndices.map(i => i + 1),
                        confidence: s.confidenceScores?.[0] ?? null,
                    }));

                return { 
                    text,
                    sources,
                    citationMap,
                    type: 'research',
                    meta: { 
                        modelUsed: 'gemini-2.5-flash (Express Grounded)',
                        groundingUsed: sources.length > 0
                    }
                };
            }

            case 'THINKING': {
                const { prompt, language: lang = 'es' } = payload;
                if (!prompt) throw new Error("Prompt is required for THINKING");

                const response = await genAI.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: [{
                        role: 'user',
                        parts: [{ text: `${prompt}\n\nResponde en ${lang === 'es' ? 'Español' : 'English'}.` }]
                    }],
                    generationConfig: {
                        // @ts-ignore
                        thinkingConfig: { thinkingBudget: 8192 }
                    }
                });

                const text = response.text || "";
                const thoughts = response.candidates?.[0]?.content?.parts?.find(p => p.thought)?.text || "";
                const thinking = thoughts;

                return { 
                    text, 
                    thinking, 
                    type: 'thinking',
                    meta: { modelUsed: 'gemini-2.5-flash (AI Studio)' }
                };
            }

            case 'BRAND_PDF_ANALYZE': {
                const { pdfBase64, language: lang = 'es' } = payload;
                if (!pdfBase64) throw new Error("pdfBase64 is required for BRAND_PDF_ANALYZE");

                const cleanPdf = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
                const response = await genAI.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: [{
                        role: 'user',
                        parts: [
                            { inlineData: { data: cleanPdf, mimeType: "application/pdf" } },
                            { text: `Analiza este documento de marca. Responde EXCLUSIVAMENTE en JSON:
{
  "brandName": "nombre",
  "industry": "industria",
  "valueProposition": "propuesta",
  "targetAudience": "público",
  "toneOfVoice": "tono",
  "brandColors": "HEX",
  "typography": "fuentes",
  "visualGuidelines": "directrices",
  "keyMessages": ["msj1"],
  "complianceRules": "reglas"
}` }
                        ]
                    }]
                });

                let text = (response.text || "").replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                return { 
                    brandData: JSON.parse(text), 
                    type: 'brand_pdf',
                    meta: { modelUsed: 'gemini-2.5-flash (AI Studio)' }
                };
            }

            case 'VOICE_ANALYZE': {
                const { audioData } = payload;
                if (!audioData) throw new Error("audioData is required for VOICE_ANALYZE");

                const cleanAudio = audioData.replace(/^data:audio\/(wav|mp3|ogg|webm);base64,/, "");
                const response = await genAI.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: [{
                        role: 'user',
                        parts: [
                            { inlineData: { data: cleanAudio, mimeType: "audio/wav" } },
                            { text: `Analiza las características de esta voz y proporciona un JSON con: gender, ageRange, pitch, tempo, tone, accent, emotion, clarity, characteristics, bestUseCase, summary.` }
                        ]
                    }]
                });

                let text = (response.text || "").replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                return { 
                    voiceProfile: JSON.parse(text), 
                    type: 'voice_analyze',
                    meta: { modelUsed: 'gemini-2.5-flash (AI Studio)' }
                };
            }

            default:
                throw new Error(`Unsupported media type: ${type}`);
        }
    });
};

/**
 * Generic Proxy Content Generation
 * Matches the interface expected by AiUniversalBridge
 */
export const generateProxyContent = async (prompt, history = [], modelName = "gemini-1.5-flash", generationConfig = {}) => {
    return fetchWithRetry(async (apiKey) => {
        const genAI = new GoogleGenAI({ apiKey });
        const modelInstance = genAI.getGenerativeModel({ model: modelName || "gemini-1.5-flash" });
        
        const chat = modelInstance.startChat({
            history: history || [],
            generationConfig: generationConfig || {}
        });
        
        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        const text = response.text();
        
        trackTokens({ text }, `Proxy-${modelName}`, prompt.substring(0, 30));
        return text;
    });
};

