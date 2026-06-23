import { buildAbsoluteUrl } from "../../utils/apiConfig";
import { TrafficCheckResult, Language } from "../../types";
import { keyRotationService } from "./keyRotationService";
import { auditCacheService } from "../auditCacheService";
import { maskPII, cleanAIData } from "../../utils/sanitization";
import { aiBridge } from "./AiUniversalBridge";
import { GLOBAL_MODEL_ID } from "../../constants/aiModels";
import { logger } from '../../utils/logger';


/**
 * Traffic Analysis Service
 * =========================
 * Strategy:
 *   1. In all environments (dev + production), try the Netlify Function first
 *      at `/api/analyze/traffic` — it runs the full 3-step pipeline with real data.
 *   2. Falls back to client-side Gemini only if the function is unreachable
 *      (e.g., running locally without `netlify dev`).
 */

const callTrafficFunction = async (
  domain: string,
  country: string,
  lang: Language,
  period: string,
  refresh: boolean = false,
  accessToken?: string
): Promise<TrafficCheckResult | null> => {
  const session = localStorage.getItem('insitu_active_session');
  let userId = '';
  if (session) {
    try {
      const parsed = JSON.parse(session);
      userId = parsed.id || parsed.user?.id || '';
    } catch (e) {
      console.error('[TrafficService] Error parsing session:', e);
    }
  }

  const response = await fetch(buildAbsoluteUrl('/api/analyze/traffic'), {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      ...(userId ? { 'X-User-Id': userId } : {})
    },
    body: JSON.stringify({ domain, country, language: lang, period, refresh, accessToken }),
    signal: AbortSignal.timeout(90_000), // 90s — allow time for multi-step pipeline
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as any;
    throw new Error(err?.error || `Function error: ${response.status}`);
  }

  const data = await response.json();
  return data as TrafficCheckResult;
};

/**
 * Fallback: direct Gemini call from the browser when Netlify dev isn't running.
 * This path is ONLY active during local development without netlify dev.
 */
const fetchFromGeminiFallback = async (
  domain: string,
  country: string,
  lang: Language,
  period: string = "90d"
): Promise<TrafficCheckResult> => {
  const periodLabel =
    { "30d": "30 días", "90d": "90 días", "6m": "6 meses", "12m": "12 meses" }[period] ||
    "90 días";

  return keyRotationService.fetchWithRetry(async (apiKey) => {
    if (!apiKey) {
      throw new Error("No client-side API key available. Backend analysis failed and cannot fallback to client.");
    }
    const provider = aiBridge.getSmartProvider('TEXT_AUDIT', apiKey);
    const currentDate = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

    // Improved prompt: Strictly forbidding placeholders and directing to REAL research
    const prompt = `AUDIT DOMAIN: ${domain} | MARKET: ${country} | PERIOD: ${periodLabel} | LANG: ${lang}
Current Date: ${currentDate}.

INSTRUCTIONS:
1. Use your 'googleSearch' tool to conduct deep research on the public SEO footprint of ${domain}.
2. Look for real traffic signals, indexed keywords, and ACTUAL competitors in the same niche.
3. ABSOLUTE RULE: NEVER output placeholder strings like "example.com", "url-real", "competidor1.com", "keyword real", or "dominio-real". 
4. If you find NO public data for a specific field after searching, return 0 (number) or an empty array [] but NEVER a fake/example record.
5. If the site is small/private and metrics aren't in SimilarWeb/SemRush, provide your best estimation in 'organicTraffic' based on indexed pages found via site:${domain}, but explain this clearly in 'dataSource'.
6. Return only valid JSON.

JSON STRUCTURE REQUIRED:
{
  "domain": "${domain}",
  "period": "${period}",
  "auditedAt": "${new Date().toISOString()}",
  "organicTraffic": number (0 if no data),
  "organicKeywords": number (0 if no data),
  "domainAuthority": number (0-100),
  "backlinks": number,
  "dataSource": "Public APIs + Google Search + Estimated Signals",
  "dataQuality": { "confidenceScore": number (0-100), "sourceReliability": "string", "validationMethod": "Search Grounding" },
  "seoCritique": ["observation 1", "observation 2"],
  "strategicRecommendations": ["recommendation 1", "recommendation 2"],
  "topPages": [{"url": "real url", "visits": "visits string", "keywords": number}],
  "keywordsList": [{"term": "keyword", "volume": number, "difficulty": number, "position": number, "intent": "informational|transactional", "cpc": "string"}],
  "backlinksList": [{"url": "url", "authority": number, "type": "dofollow|nofollow", "context": "context", "quality": "high|medium|low"}],
  "trafficByCountry": [{"country": "ISO name", "percentage": number}],
  "competitors": [{"domain": "actual competitor domain", "position": number, "trafficVolume": number, "commonKeywords": number, "competitionLevel": "Alta|Media|Baja", "strategy": "strategy description"}]
}`;

    const response = await provider.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "You are a Senior SEO Analyst. You never use placeholder data. If no data is found for a specific metric, you return 0 or empty arrays. You prioritize accuracy over filling forms. You ALWAYS output valid JSON based on real search signals.",
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 2500,
        temperature: 0.1 // Keeping it low to minimize hallucinations
      },
    });

    const textResponse = (typeof response.text === 'function' ? response.text() : response.text) || "{}";
    const cleanJson = cleanAIData(textResponse);
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    const finalCleanJson = jsonMatch ? jsonMatch[0] : "{}";

    let result: Partial<TrafficCheckResult> = {};
    try {
      result = JSON.parse(finalCleanJson);
    } catch (e) {
      logger.error("Error parsing TrafficCheck JSON (fallback):", e);
      // Fallback object to prevent UI crash
      result = { 
        domain, 
        organicTraffic: 0, 
        organicKeywords: 0, 
        dataSource: "Error en procesamiento IA",
        seoCritique: ["Hubo un error al procesar los datos de la IA."]
      };
    }

    // Map legacy fields if AI uses them
    if (!(result as any).strategicRecommendations && (result as any).recommendations) {
      (result as any).strategicRecommendations = (result as any).recommendations;
    }

    keyRotationService.trackTokens(result, "Auditoría de Tráfico (fallback)", domain);
    return result as TrafficCheckResult;
  });
};

export const trafficAnalysisService = {
  /**
   * Performs a traffic and SEO audit for a given domain.
   *
   * STRATEGY:
   *  1. Call the Netlify Function `/api/analyze/traffic` (works in both dev with
   *     `netlify dev` and production). This runs the full 3-step pipeline:
   *     real data from 9 free APIs → Google Search grounding → JSON schema format.
   *  2. If unreachable (local dev without netlify dev), fall back to direct Gemini.
   */
  performTrafficCheck: async (
    domain: string,
    country: string,
    lang: Language = "es",
    period: string = "90d",
    refresh: boolean = false,
    accessToken?: string
  ): Promise<TrafficCheckResult> => {
    const maskedDomain = maskPII(domain);
    const cacheKey = `traffic-${maskedDomain}-${country}-${lang}-${period}`;
    const hash = await auditCacheService.computeHash(cacheKey);
    
    if (!refresh) {
      const cached = await auditCacheService.checkCache<TrafficCheckResult>(hash);
      if (cached) {
        logger.info(`[TrafficService] Cache hit for ${domain}`);
        return cached;
      }
    }

    try {
      logger.info(`[TrafficService] Calling Netlify Function for: ${domain} (${country}) period:${period} refresh:${refresh}`);
      const result = await callTrafficFunction(domain, country, lang, period, refresh, accessToken);
      if (result) {
        logger.info(
          `[TrafficService] ✅ Got real data from Netlify Function. Sources: ${(result as any).realDataCollected?.join(", ") || "Gemini + Search"
          }`
        );
        await auditCacheService.saveCache(hash, result);
        return result;
      }
    } catch (err) {
      // In production, NEVER fall back to client-side Gemini (would leak keys + cause 400s).
      // Only allow the fallback during local dev without `netlify dev` running.
      const isProduction = import.meta.env.PROD;

      if (isProduction) {
        logger.error(`[TrafficService] ❌ Netlify Function unreachable in PRODUCTION — not falling back to client.`, err);
        throw err; // Surface the real error; no client-side key exposure.
      }

      logger.warn(
        `[TrafficService] Netlify Function unreachable — using client-side Gemini fallback (LOCAL DEV only). Error:`,
        err
      );
    }

    logger.info(`[TrafficService] 🔄 Using client-side Gemini fallback for: ${domain} (LOCAL DEV)`);
    const fallbackResult = await fetchFromGeminiFallback(domain, country, lang, period);
    await auditCacheService.saveCache(hash, fallbackResult);
    return fallbackResult;
  },
};
