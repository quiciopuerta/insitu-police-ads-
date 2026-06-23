import { buildAbsoluteUrl } from "../../utils/apiConfig";
import { GoogleGenAI } from "@google/genai";
import {
  SearchResult,
  KeywordMetric,
  Competitor,
  MetricPoint,
  CampaignAudit,
  Language,
  CampaignPerformance,
} from "../../types";
import {
  getSystemInstruction,
  CAMPAIGN_AUDIT_INSTRUCTION,
} from "../../constants";
import { keyRotationService } from "./keyRotationService";
import { getLearnedRules } from "../feedbackRulesService";
import { 
  calculateBudgetScenarios,
  generateConversionFunnel, 
  calculateIndustryBenchmark 
} from "../../utils/calculations";
import { auditCacheService } from "../auditCacheService";
import { maskPII, cleanAIData, sanitizePromptInput } from "../../utils/sanitization";
import { aiBridge } from "./AiUniversalBridge";
import { GLOBAL_MODEL_ID } from "../../constants/aiModels";
import { logger } from '../../utils/logger';
import { authService } from "../auth/authService";
import { ExecutionRouter } from "../bridge/ExecutionRouter";


export const adsAnalysisService = {
  performSearch: async (
    theme: string,
    country: string,
    objective: string,
    period: string,
    lang: Language = "es",
    realAccountData?: CampaignPerformance[],
    landingUrl?: string,
    brand?: any,
  ): Promise<SearchResult> => {
    const maskedTheme = sanitizePromptInput(maskPII(theme), 300);
    const maskedUrl = landingUrl ? sanitizePromptInput(maskPII(landingUrl), 200) : '';
    const safeObjective = sanitizePromptInput(objective, 200);
    const safeCountry = sanitizePromptInput(country, 50);

    const cacheKey = `search-${maskedTheme}-${safeCountry}-${safeObjective}-${period}-${lang}-${maskedUrl}-${JSON.stringify(realAccountData || [])}`;
    const hash = await auditCacheService.computeHash(cacheKey);
    const cached = await auditCacheService.checkCache<SearchResult>(hash);
    if (cached) {
      logger.info(`[AdsAnalysis] Cache hit for ${theme}`);
      return cached;
    }

    // ── Production guard: route through backend proxy to protect API keys ────
    const isProduction = import.meta.env.PROD;

    if (isProduction && !ExecutionRouter.isDesktopMode()) {
      logger.info(`[AdsAnalysis] 🔄 Routing performSearch through backend proxy (production mode)`);

      const userId = authService.getCurrentUser()?.id || '';

      const proxyResponse = await fetch(buildAbsoluteUrl('/.netlify/functions/api-ai-proxy'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(userId ? { 'X-User-Id': userId } : {})
        },
        body: JSON.stringify({
          task: 'ads_search',
          payload: { theme: maskedTheme, country: safeCountry, objective: safeObjective, period, lang, realAccountData, landingUrl: maskedUrl, brand }
        }),
      });
      if (!proxyResponse.ok) {
        const errData = await proxyResponse.json().catch(() => ({})) as any;
        throw new Error(errData?.error || `Backend proxy error: ${proxyResponse.status}`);
      }
      const result = await proxyResponse.json() as SearchResult;
      await auditCacheService.saveCache(hash, result);
      return result;
    }

    return keyRotationService.fetchWithRetry(async (apiKey) => {
      const provider = aiBridge.getSmartProvider('ADS_AUDIT', apiKey);

      let accountContext = "";
      if (realAccountData && realAccountData.length > 0) {
        accountContext = `\nDATOS REALES DEL USUARIO:\n${realAccountData.map((p) => `- Campaña: ${p.campaignName}, CTR: ${(p.ctr * 100).toFixed(2)}%, CPC Real: $${p.cpc.toFixed(2)}`).join("\n")}`;
      }

      let brandContext = "";
      if (brand) {
        const s = (v: unknown, max = 200) => sanitizePromptInput(String(v || 'N/A'), max);
        brandContext = `\n🧬 ADN DE MARCA Y BRIEF DEL USUARIO:
- Marca: ${s(brand.brandName, 100)}
- Industria: ${s(brand.industry, 100)}
- Propuesta de Valor: ${s(brand.valueProposition)}
- Audiencia Objetivo: ${s(brand.targetAudience)}
- Tono de Voz: ${s(brand.toneOfVoice, 100)}
- Mensajes Clave: ${s(Array.isArray(brand.keyMessages) ? brand.keyMessages.join(", ") : brand.keyMessages)}
- Colores de Marca: ${s(brand.brandColors, 100)}
- Tipografía: ${s(brand.typography, 100)}
- Guías Visuales: ${brand.visualGuidelines || "N/A"}
- Reglas de Compliance: ${brand.complianceRules || "N/A"}

INSTRUCCIÓN CRÍTICA: TODA la generación de copys (Headlines, CTAs, Hooks) y el Roadmap DEBEN ser 100% coherentes con este ADN de marca y respetar las reglas de compliance proporcionadas.`;
      }

      // Generate dynamic month+year labels for the last 12 months
      const _mNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const _now = new Date();
      const monthYearLabels = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(_now.getFullYear(), _now.getMonth() - 11 + i, 1);
        return `${_mNames[d.getMonth()]} ${d.getFullYear()}`;
      });

      // Fetch learned rules from user feedback
      const learnedRules = await getLearnedRules('GoogleAds_Search');

      // Pre-flight: fetch real traffic data from SimilarWeb/SemRush via Tavily+Serper
      let realTrafficContext = "";
      const domainForIntel = landingUrl
          ? landingUrl.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim()
          : "";
      if (domainForIntel) {
          try {
              const { API_URL } = await import("../../utils/apiConfig");
              const intelRes = await fetch(`${API_URL}/traffic-intel`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ domain: domainForIntel }),
              });
              if (intelRes.ok) {
                  const intelData = await intelRes.json();
                  const mainData = intelData.trafficData?.[0];
                  if (mainData) {
                      const lines: string[] = [`\n📊 DATOS DE TRÁFICO REAL (SimilarWeb/SemRush) para ${domainForIntel}:`];
                      if (mainData.tavily?.answer) lines.push(`   ➜ ${mainData.tavily.answer}`);
                      if (mainData.tavily?.results?.length) {
                          mainData.tavily.results.forEach((r: any) => lines.push(`   ➜ [${r.url}] ${r.content}`));
                      }
                      if (mainData.serper?.organic?.length) {
                          mainData.serper.organic.forEach((r: any) => lines.push(`   ➜ Snippet: ${r.snippet}`));
                      }
                      if (lines.length > 1) realTrafficContext = lines.join("\n");
                  }
              }
          } catch {
              // non-blocking — continue without real traffic data
          }
      }

      let urlContext = "";
      if (landingUrl) {
          urlContext = `\nURL DE ATERRIZAJE (LANDING PAGE): ${maskedUrl}\nINSTRUCCIÓN CRÍTICA: Como el usuario proporcionó una URL, DEBES buscar en Google usando googleSearch los competidores reales para la búsqueda de las palabras clave principales y extraer datos precisos. Priorízalos y organízalos estrictamente de acuerdo al promedio de impresiones (ImpShare) y métricas de competencia en la red de búsqueda (Search).`;
      }

      const prompt = `AUDITORÍA DE MERCADO GOOGLE ADS - PROTOCOLO FORENSE (PERSONA: SENIOR PAID MEDIA AUDITOR):
      TÉRMÍNOS CLAVE: ${maskedTheme} | PAÍS: ${safeCountry} | OBJETIVO: ${safeObjective}${accountContext}${brandContext}${urlContext}
${realTrafficContext}
${learnedRules}
      IDIOMA: ${lang === "es" ? "ESPAÑOL (Mantén términos técnicos en INGLÉS)" : "ENGLISH"}

      ACTÚA COMO: Un auditor de medios pagados metódico y obsesionado con los detalles. Evalúa esta cuenta/mercado como un contador forense examina estados financieros. No dejes ningún ajuste sin revisar, ninguna suposición sin probar y ningún dólar sin contabilizar.

      ESTRUCTURA DE RESPUESTA REQUERIDA:

      TLDR_START
      (RESUMEN EJECUTIVO / EXECUTIVE SUMMARY: Un resumen de alto nivel para stakeholders. Máximo 3 párrafos impactantes. 
      - Párrafo 1: Estado actual del mercado y salud de la cuenta (si hay datos).
      - Párrafo 2: El mayor "Killer Insight" o riesgo crítico detectado forensemente.
      - Párrafo 3: Oportunidad de crecimiento #1 y recomendación estratégica inmediata.
      Usa un tono de consultoría senior de nivel "Big Four", persuasivo y directo al grano.)
      TLDR_END

      PASO 0: ESTRATEGIA Y RAZONAMIENTO (CHAIN OF THOUGHT)
      Antes de generar los bloques de datos, realiza un análisis interno de la situación competitiva, la intención de búsqueda del usuario y la estacionalidad del mercado. Resume esto en el bloque de diagnosis inicial.

      CHECKPOINTS_START
      (AUDITORÍA TÉCNICA DE 200+ PUNTOS: Selecciona los 5 puntos más críticos del framework de auditoría forense para este caso específico — Estructura de cuenta, Tracking, Estrategia de Puja, Calidad de Creativos o Posicionamiento Competitivo. Para cada punto, indica: Hallazgo, Gravedad (Critico/Alto/Medio/Bajo) y Impacto proyectado.)
      CHECKPOINTS_END

      INSTRUCCIONES CRÍTICAS (PROTOCOLO VERITAS):
      1. SUPREMACÍA DE DATOS REALES: Si se proporcionan "DATOS REALES DEL USUARIO", úsalos como la ÚNICA fuente de verdad para sus métricas de CTR, CPC y Conversiones. NO los promedies ni los alteres con estimaciones externas.
      2. SEARCH GROUNDING: Usa la herramienta googleSearch intensivamente para validar tendencias de mercado, CPCs externos y competidores. Para CADA competidor identificado, busca específicamente "[dominio] site:similarweb.com traffic" para obtener tráfico mensual real.
      3. DATOS DE TRÁFICO: Si se proporcionan datos de "DATOS DE TRÁFICO REAL (SimilarWeb/SemRush)" arriba, DEBES usarlos como fuente primaria de tráfico. Para competidores sin datos pre-cargados, usa Google Search grounding para buscarlos en SimilarWeb.
      4. TERMINOLOGÍA BILINGÜE: Si el idioma es ESPAÑOL, redacta la explicación en español pero mantén términos técnicos en inglés (ej: "Broad Match Modified", "Search Impression Share", "RSA pinning", "Negative Keyword Sculpting", "Conversion Lag").
      5. FIABILIDAD: Tu diagnóstico debe ser extremadamente preciso y ajustado a fuentes oficiales. Si no encuentras un dato, repórtalo como "N/A" en lugar de inventarlo.
      
      EJEMPLOS DE FORMATO (FEW-SHOT):
      KEYWORDS_START
      comprar zapatillas running | 15000 | Alta | 1.25 | 45000 | 3.5% | Exact
      zapatillas trail baratas | 8500 | Media | 0.85 | 22000 | 4.1% | Phrase
      KEYWORDS_END

      COMPETITORS_START
      Nike | 25.5 | 15.2 | 45.0 | 78.5 | 12.3 | 34.1 | 2.1 | E-commerce | 15000000
      Adidas | 18.2 | 12.1 | 38.4 | 65.2 | 8.5 | 22.4 | 2.8 | E-commerce | 12000000
      COMPETITORS_END

      MANDATORIO: DEBES generar TODOS los siguientes bloques con MÁXIMO DETALLE. La parte exterior de los bloques será tu "Diagnóstico Estratégico", el cual debe ser un análisis detallado en varios párrafos.

      KEYWORDS_START
      (Término | Volumen Mensual | Nivel Competencia Ej: Alta/Media/Baja | CPC estimado Ej: 1.50 | Impresiones Avg Ej: 8500 | CTR Estimado Ej: 3.2% | Concordancia Sugerida: Exact/Phrase/Broad) (Al menos 50 palabras clave principales muy precisas, incluyendo variaciones de cola larga, sinónimos y términos relacionados)
      KEYWORDS_END
      
      COMPETITORS_START
      (Nombre | ImpShare% | Overlap% | PosAbove% | TopPage% | AbsTop% | Outranking% | PosPromedio | Dominio/Nicho | TraficoMes) (5 competidores reales. TraficoMes = visitas mensuales reales de SimilarWeb/SemRush — búscalo en Google si no está en los datos pre-cargados. Formato: número entero ej: 450000)
      COMPETITORS_END
      
      MONTHLY_SEARCH_START
      Genera datos de búsquedas mensuales promedio (avg mensual) para los mismos 5 competidores del bloque anterior.
      IMPORTANTE: Usa los últimos 12 meses con formato MES AÑO. Usa el formato:
      Nombre | ${monthYearLabels.join(" | ")}
      (cada valor es el volumen estimado de búsquedas mensuales para ese competidor en ese mes correspondiente al periodo real)
      MONTHLY_SEARCH_END

      HEADLINES_START
      (Título 1 | Título 2 | Título 3 | Título 4) (Altamente persuasivos)
      HEADLINES_END

      LOCATIONS_START
      (Región 1 | Región 2 | Región 3) (Zonas/Ubicaciones macro recomendadas, separadas por barra vertical)
      LOCATIONS_END
      
      LOCALITIES_START
      (Ciudad 1 | Ciudad 2 | Barrio 1) (Localidades específicas para segmentar, separadas por barra vertical)
      LOCALITIES_END
      
      INTERESTS_START
      (Interés 1 | Interés 2 | Interés 3) (Segmentación detallada de intereses, separadas por barra vertical)
      INTERESTS_END

      CTAS_START
      (CTA 1 | CTA 2 | CTA 3) (Separados por barra vertical)
      CTAS_END

      HOOKS_START
      (Hook psicológico 1 | Hook 2 | Hook 3) (Separados por barra vertical)
      HOOKS_END
      
      ROADMAP_START
      (Paso 1 detallado | Paso 2 detallado | Paso 3 detallado | Paso 4) (Hoja de ruta clara para lograr posición #1, separados por barra vertical)
      ROADMAP_END
      
      NEGATIVE_KEYWORDS_START
      (Lista de 20-30 palabras clave negativas para excluir del targeting, separadas por barra vertical. Ej: gratis|barato|cómo hacer|tutorial|descargar)
      NEGATIVE_KEYWORDS_END

      QUALITY_SCORE_START
      Estima el Quality Score (1-10) para las top 8 keywords del bloque KEYWORDS. Formato:
      Keyword | QS (1-10) | Ad Relevance (Abajo/Promedio/Arriba) | LandingPage (Abajo/Promedio/Arriba) | ExpectedCTR (Abajo/Promedio/Arriba) | Recomendación
      QUALITY_SCORE_END

      AD_EXTENSIONS_START
      Genera extensiones de anuncio recomendadas. Formato JSON array: [{\"type\":\"Sitelink\",\"title\":\"Título\",\"description\":\"Desc\",\"url\":\"/url\"},{\"type\":\"Callout\",\"value\":\"texto corto\"},{\"type\":\"Structured Snippet\",\"title\":\"Encabezado\",\"value\":\"item1, item2, item3\"}]
      (Incluye al menos 3 Sitelinks, 4 Callouts, 2 Structured Snippets)
      AD_EXTENSIONS_END

      MARKET_SERIES_START
      Genera datos históricos promedio del mercado (no solo de un competidor) para los últimos 12 meses.
      IMPORTANTE: Usa el formato:
      Mes | Volumen | CPC Estimado
      ${monthYearLabels.map(m => `${m} | [volumen] | [cpc]`).join("\n")}
      MARKET_SERIES_END
      
      PLATFORM_RECOMMENDATIONS_START
      (Recomendación técnica 1 sobre la plataforma Google Ads | Recomendación 2 | Recomendación 3) (Separados por barra vertical. Enfócate en estructura, pujas, optimización de conversiones y mejores prácticas actuales de la plataforma como Performance Max vs Search structural alignment)
      PLATFORM_RECOMMENDATIONS_END
      
      GEO_INSIGHTS_START
      (Región/Ciudad Hotspot | Tendencia Local | Oportunidad de Nicho) (Identifica 3 puntos geográficos específicos donde hay mayor concentración de búsqueda o menor competencia, separados por barra vertical)
      GEO_INSIGHTS_END

      AEO_OPTIMIZATION_START
      (Tip 1 para visibilidad en LLM/AI Search | Tip 2 | Tip 3) (Estrategias para que la marca aparezca en respuestas de modelos de lenguaje como Gemini/ChatGPT, separadas por barra vertical)
      AEO_OPTIMIZATION_END

      AUDIT_RECOMMENDATIONS_START
      (Recomendación 1 sobre el formato de esta auditoría/reporte | Recomendación 2 | Recomendación 3) (Separados por barra vertical. Cómo mejorar la legibilidad, qué otros datos incluir en el futuro, o cómo presentar estos hallazgos a un cliente)
      AUDIT_RECOMMENDATIONS_END`;

      const response = await provider.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: getSystemInstruction(lang) + `\n\nCRÍTICO: DEBES incluir SIEMPRE los bloques delimitadores *_START y *_END tal como se solicitan en el prompt. No los omitas bajo ninguna circunstancia, incluso si usas Google Search.`,
          tools: [{ googleSearch: {} }],
        },
      });

      const responseText = response.text || "";
      const thinkingProcess = response.candidates?.[0]?.content?.parts?.find((p: any) => p.thought)?.thought || "";
      const rawText = cleanAIData(responseText);
      const extractBlock = (mS: string, mE: string) => {
        const regex = new RegExp(`${mS}\\s*([\\s\\S]*?)${mE}`, "si");
        const match = rawText.match(regex);
        return match ? match[1].trim() : "";
      };

      const tldr = extractBlock("TLDR_START", "TLDR_END");
      const forensicCheckpoints = extractBlock("CHECKPOINTS_START", "CHECKPOINTS_END")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("(") && !line.startsWith("-"));

      // Clean the main text by removing the custom blocks so they don't appear twice
      let cleanedMainText = rawText
        .replace(/TLDR_START[\s\S]*?TLDR_END/gi, "")
        .replace(/CHECKPOINTS_START[\s\S]*?CHECKPOINTS_END/gi, "")
        .trim();

      // ── Utility: detect placeholder/header lines from AI echoing prompt format ──
      const isPlaceholder = (s: string): boolean => {
        if (!s || !s.trim()) return true;
        const t = s.trim();
        // All dashes or dots
        if (/^[-–.\s*]+$/.test(t)) return true;
        // Contains format placeholders like (Nombre | ...) or starts with bracket
        if (/^\(|^\[/.test(t)) return true;
        // Looks like a header keyword
        if (/^(nombre|term[oi]?no|keyword|competitor|domain|headline|región|region|paso|step|cta|hook|interés|interest|nicho|niche|escenario|scenario)(\s*[|\d]|$)/i.test(t)) return true;
        // Many dashes inline
        if ((t.match(/-{3,}/g) || []).length >= 1) return true;
        // Asterisks
        if (/^\*+/.test(t)) return true;
        return false;
      };

      // Parsing logic (simplified for clarity but keeping functionality)
      const kwBlock = extractBlock("KEYWORDS_START", "KEYWORDS_END");
      const extractedKeywords = kwBlock
        .split("\n")
        .map((line) => {
          const parts = line.split("|").map((s) => s.trim());
          if (parts.length < 4) return null;
          if (isPlaceholder(parts[0])) return null; // skip header rows
          const matchTypePart = (parts[6] || "").replace(/Exact|Phrase|Broad/i, (m) => m);
          const suggestedMatchType = /(exact)/i.test(matchTypePart) ? "Exact" :
            /(phrase)/i.test(matchTypePart) ? "Phrase" : "Broad";
          return {
            term: parts[0],
            volume: parts[1],
            competition: parts[2] as any,
            cpc: parts[3],
            avgImpressions: parts[4] ? parseInt(parts[4].replace(/[^0-9]/g, ""), 10) || undefined : undefined,
            ctr: parts[5] ? parts[5].trim() : undefined,
            suggestedMatchType: parts.length >= 7 ? suggestedMatchType : undefined,
          };
        })
        .filter(Boolean) as KeywordMetric[];

      const competitorsBlock = extractBlock(
        "COMPETITORS_START",
        "COMPETITORS_END",
      );
      const competitors = competitorsBlock
        .split("\n")
        .map((line) => {
          const parts = line.split("|").map((s) => s.trim());
          if (parts.length < 9) return null;
          if (isPlaceholder(parts[0])) return null; // skip header/placeholder rows
          return {
            name: parts[0],
            impressionShare: parseFloat(parts[1]) || 0,
            overlapRate: parseFloat(parts[2]) || 0,
            positionAboveRate: parseFloat(parts[3]) || 0,
            topOfPageRate: parseFloat(parts[4]) || 0,
            absTopOfPageRate: parseFloat(parts[5]) || 0,
            outrankingShare: parseFloat(parts[6]) || 0,
            avgPosition: parseFloat(parts[7]) || 0,
            nicheDominance: parts[8],
            trafficVolume: parts[9] ? parseInt(parts[9].replace(/[^0-9]/g, ""), 10) || undefined : undefined,
          };
        })
        .filter(Boolean) as Competitor[];

      // Parse monthly search data and merge into competitors
      // Generate dynamic month+year labels for the last 12 months
      const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      const MONTHS: string[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        MONTHS.push(`${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`);
      }
      const monthlyBlock = extractBlock("MONTHLY_SEARCH_START", "MONTHLY_SEARCH_END");
      if (monthlyBlock) {
        monthlyBlock.split("\n").forEach((line) => {
          const parts = line.split("|").map((s) => s.trim());
          if (parts.length < 13) return;
          const name = parts[0];
          const volumes = parts.slice(1, 13).map((v) => parseInt(v.replace(/[^0-9]/g, ""), 10) || 0);
          const comp = competitors.find((c) => c.name.toLowerCase() === name.toLowerCase());
          if (comp) {
            comp.monthlySeries = MONTHS.map((m, i) => ({
              month: m,
              impressionShare: comp.impressionShare, // static per competitor
              avgSearchVolume: volumes[i],
            }));
            const total = volumes.reduce((a, b) => a + b, 0);
            comp.avgMonthlySearches = Math.round(total / 12);
            comp.peakMonth = MONTHS[volumes.indexOf(Math.max(...volumes))];
          }
        });

        // Competitors without real monthly data from AI stay as null — no synthetic generation
        competitors.forEach((comp) => {
          if (!comp.monthlySeries) {
            comp.monthlySeries = null;
            comp.avgMonthlySearches = null;
            comp.peakMonth = null;
          }
        });
      }

      // ── Parse v5 blocks ──────────────────────────────────────────────────────

      // Negative Keywords
      const negativeKeywords = extractBlock("NEGATIVE_KEYWORDS_START", "NEGATIVE_KEYWORDS_END")
        .split("|").map((s) => s.trim()).filter(Boolean);

      // Quality Score — merge into extractedKeywords
      const qsBlock = extractBlock("QUALITY_SCORE_START", "QUALITY_SCORE_END");
      qsBlock.split("\n").forEach((line) => {
        const parts = line.split("|").map((s) => s.trim());
        if (parts.length < 5) return;
        const kw = extractedKeywords.find((k) =>
          k.term.toLowerCase().includes(parts[0].toLowerCase()) || parts[0].toLowerCase().includes(k.term.toLowerCase())
        );
        if (kw) {
          (kw as any).qualityScore = parseInt(parts[1], 10) || undefined;
          (kw as any).adRelevance = parts[2];
          (kw as any).landingPageExp = parts[3];
          (kw as any).expectedCTR = parts[4];
          (kw as any).qsRecommendation = parts[5] || "";
        }
      });

      // Ad Extensions
      let adExtensions: any[] = [];
      const aeBlock = extractBlock("AD_EXTENSIONS_START", "AD_EXTENSIONS_END");
      try {
        const jsonMatch = aeBlock.match(/\[[\s\S]*\]/);
        if (jsonMatch) adExtensions = JSON.parse(jsonMatch[0]);
      } catch (e) { }

      // ── Deterministic Math Offloading (v6 Strategy) ──────────────────────────
      
      // We extract the base market CPC from keywords or fallback to $1.00
      const avgMarketCpc = extractedKeywords.length > 0 
        ? parseFloat(extractedKeywords[0].cpc.replace(/[^0-9.]/g, "")) || 1.0
        : 1.0;

      // Calculate scenarios and benchmarks using pure logic for precision and token saving
      const industryName = theme.split(' ')[0] || "General";
      const budgetScenarios = calculateBudgetScenarios(avgMarketCpc, industryName);
      const industryBenchmark = calculateIndustryBenchmark(industryName, avgMarketCpc);
      const recommendedBudget = budgetScenarios.find(s => s.label === 'Recomendado')?.monthlyBudget || (avgMarketCpc * 30 * 30);
      const conversionFunnel = generateConversionFunnel(recommendedBudget, avgMarketCpc, industryBenchmark.avgConvRate / 100);

      // Market Series (CPC vs Volume chart)
      const metricsSeries: MetricPoint[] = [];
      const marketBlock = extractBlock("MARKET_SERIES_START", "MARKET_SERIES_END");
      if (marketBlock) {
        marketBlock.split("\n").forEach((line) => {
          const parts = line.split("|").map((s) => s.trim());
          if (parts.length < 3) return;
          if (isPlaceholder(parts[0])) return;
          metricsSeries.push({
            month: parts[0],
            conv: parseInt(parts[1].replace(/[^0-9]/g, ""), 10) || 0, // conv is used as volume in ResultCard
            cpc: parseFloat(parts[2].replace(/[^0-9.]/g, "")) || 0,
            ranking: 1, // placeholder
          });
        });
      }

      const result: SearchResult = {
        text: cleanedMainText.split("KEYWORDS_START")[0].trim(),
        tldr,
        forensicCheckpoints,
        sources: (
          response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
        )
          .filter((c) => c.web)
          .map((c) => ({
            title: c.web?.title || "Fuentes",
            uri: c.web?.uri || "",
          })),
        extractedKeywords,
        competitors,
        headlines: extractBlock("HEADLINES_START", "HEADLINES_END")
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s && !isPlaceholder(s)),
        descriptions: [],
        recommendedLocations: extractBlock("LOCATIONS_START", "LOCATIONS_END")
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s && !isPlaceholder(s)),
        specificLocalities: extractBlock("LOCALITIES_START", "LOCALITIES_END")
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s && !isPlaceholder(s)),
        platformInterests: extractBlock("INTERESTS_START", "INTERESTS_END")
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s && !isPlaceholder(s)),
        suggestedCTAs: extractBlock("CTAS_START", "CTAS_END")
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s && !isPlaceholder(s)),
        psychologicalHooks: extractBlock("HOOKS_START", "HOOKS_END")
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s && !isPlaceholder(s)),
        suggestionsForFirstPlace: extractBlock("ROADMAP_START", "ROADMAP_END")
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s && !isPlaceholder(s)),
        marketTempScore: (() => {
          // Deterministic calculation from real parsed data — no AI fallback needed
          // 1. Volume signal (0-40): avg keyword search volume
          const volumes = extractedKeywords
            .map(k => parseInt(k.volume.replace(/[^0-9]/g, ""), 10))
            .filter(v => v > 0);
          const avgVolume = volumes.length ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;
          const volumeScore = Math.min(40, (avgVolume / 8000) * 40);

          // 2. CPC signal (0-25): higher CPC = more advertiser demand
          const cpcs = extractedKeywords
            .map(k => parseFloat(k.cpc.replace(/[^0-9.]/g, "")))
            .filter(v => v > 0);
          const avgCPC = cpcs.length ? cpcs.reduce((a, b) => a + b, 0) / cpcs.length : 0;
          const cpcScore = Math.min(25, (avgCPC / 8) * 25);

          // 3. Competition signal (0-20): from keyword competition labels
          const compMap: Record<string, number> = { alta: 20, high: 20, media: 12, medium: 12, baja: 5, low: 5 };
          const compScores = extractedKeywords.map(k => {
            const c = (k.competition || "").toLowerCase();
            for (const [key, val] of Object.entries(compMap)) {
              if (c.includes(key)) return val;
            }
            return 10;
          });
          const competitionScore = compScores.length
            ? compScores.reduce((a, b) => a + b, 0) / compScores.length
            : 10;

          // 4. Growth trend (0-15): recent 3 months vs oldest 3 months in market series
          let trendScore = 7.5;
          if (metricsSeries.length >= 6) {
            const recent = metricsSeries.slice(-3).reduce((a, b) => a + b.conv, 0) / 3;
            const older = metricsSeries.slice(0, 3).reduce((a, b) => a + b.conv, 0) / 3;
            if (older > 0) {
              const growth = (recent - older) / older;
              trendScore = Math.min(15, Math.max(0, 7.5 + growth * 15));
            }
          }

          const total = Math.round(volumeScore + cpcScore + competitionScore + trendScore);
          return Math.min(100, Math.max(5, total));
        })(),
        metricsSeries,
        themeContext: theme,
        language: lang,
        // v5 fields
        negativeKeywords: negativeKeywords.filter(k => !isPlaceholder(k)).length
          ? negativeKeywords.filter(k => !isPlaceholder(k))
          : undefined,
        adExtensions: adExtensions.length ? adExtensions : undefined,
        budgetScenarios: budgetScenarios.length ? budgetScenarios : undefined,
        industryBenchmark,
        conversionFunnel,
        platformRecommendations: extractBlock("PLATFORM_RECOMMENDATIONS_START", "PLATFORM_RECOMMENDATIONS_END")
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s && !isPlaceholder(s)),
        geographicInsights: extractBlock("GEO_INSIGHTS_START", "GEO_INSIGHTS_END")
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s && !isPlaceholder(s)),
        aeoOptimizations: extractBlock("AEO_OPTIMIZATION_START", "AEO_OPTIMIZATION_END")
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s && !isPlaceholder(s)),
        auditRecommendations: extractBlock("AUDIT_RECOMMENDATIONS_START", "AUDIT_RECOMMENDATIONS_END")
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s && !isPlaceholder(s)),
        thinkingProcess,
      };

      keyRotationService.trackTokens(result, "Auditoría de Ads", theme, 'TEXT_AUDIT');
      await auditCacheService.saveCache(hash, result);
      return result;
    });
  },

  getCampaignAudit: async (
    campaignData: string,
    lang: Language = "es",
    competitorData?: string
  ): Promise<CampaignAudit> => {
    return keyRotationService.fetchWithRetry(async (apiKey) => {
      const provider = aiBridge.getSmartProvider('ADS_AUDIT', apiKey);
      const campaignRules = await getLearnedRules('GoogleAds_Search');
      
      const prompt = `AUDITORÍA DE CAMPAÑA GOOGLE ADS - PROTOCOLO DE OPTIMIZACIÓN AVANZADA:
      ${campaignData}
      ${competitorData ? `\nDATOS DE COMPETENCIA (Subasta):\n${competitorData}` : ""}
      ${campaignRules}
      
      INSTRUCCIONES CRÍTICAS:
      1. SEARCH GROUNDING: Usa googleSearch para encontrar benchmarks de CTR y CPC promedio para la industria detectada en los datos proporcionados.
      2. ANÁLISIS TÉCNICO: Evalúa el Health Score (0-100) basándote en CTR real vs benchmark, CPC real vs mercado y ROAS proyectado.
      3. ESTRATEGIA DE PUJA: Sugiere la mejor estrategia (tCPA, tROAS, Maximizar Conversiones) con una justificación técnica sólida.
      4. SEGMENTACIÓN: Identifica brechas en la segmentación actual basándote en el comportamiento de los competidores.

      REQUISITO DE SALIDA: Responde ÚNICAMENTE con un objeto JSON válido con esta estructura:
      {
        "healthScore": 0,
        "criticalIssues": ["issue 1", "issue 2"],
        "opportunities": ["opportunity 1", "opportunity 2"],
        "suggestedBidding": "estrategia de puja sugerida con justificación técnica",
        "analysis": "análisis detallado de al menos 3 párrafos sobre el estado actual y potencial",
        "suggestedSegmentation": ["segmento 1", "segmento 2"]
      }
      
      IDIOMA REQUERIDO: ${lang === "es" ? "ESPAÑOL" : "ENGLISH"}.`;

      const response = await provider.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: getSystemInstruction(lang) + `\n\nCRÍTICO: Responde solo con JSON puro.`,
          tools: [{ googleSearch: {} }],
        },
      });

      const textResponse = response.text || "{}";
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : "{}";

      let result: any = {};
      try {
        result = JSON.parse(cleanJson);
      } catch (e) {
        logger.error("Error parsing CampaignAudit JSON:", e);
      }

      keyRotationService.trackTokens(result, "Auditoría de Campaña", undefined, 'TEXT_AUDIT');
      return { ...result, language: lang } as CampaignAudit;
    });
  },
};
