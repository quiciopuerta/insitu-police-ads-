import { API_URL, adminFetch } from '../utils/apiConfig';
import { logger } from '../utils/logger';


// ── Cache for prompt rules to avoid excessive API calls ─────────────────────
let cachedRules: Record<string, { content: string, timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches learned prompt rules from the backend and formats them for injection
 * into AI prompts. Rules come from user feedback (thumbs down → auto-learned rules)
 * and from performance feedback (successful recommendations → positive examples).
 * 
 * @param feature - The specific feature to fetch rules for (e.g., 'GoogleAds_Search', 'ImageAnalysis')
 * @returns A formatted string block to append to AI prompts, or empty string if no rules
 */
export async function getLearnedRules(feature?: string): Promise<string> {
  const now = Date.now();
  const cacheKey = feature || 'global';
  
  // Return cached if fresh
  if (cachedRules[cacheKey] && (now - cachedRules[cacheKey].timestamp) < CACHE_TTL) {
    return cachedRules[cacheKey].content;
  }

  try {
    // 1. Fetch rules for the specific feature/global
    const mainUrl = feature 
      ? `${API_URL}/prompt-rules?feature=${encodeURIComponent(feature)}`
      : `${API_URL}/prompt-rules`;
    
    // 2. Also fetch the latest Market Pulse trends
    const pulseUrl = `${API_URL}/prompt-rules?feature=market-pulse`;
    
    const [mainRes, pulseRes] = await Promise.all([
      adminFetch(mainUrl),
      adminFetch(pulseUrl)
    ]);

    const mainData = mainRes.ok ? await mainRes.json() : { rules: [] };
    const pulseData = pulseRes.ok ? await pulseRes.json() : { rules: [] };

    const mainRules = mainData.rules || [];
    const pulseRules = pulseData.rules || [];

    if (mainRules.length === 0 && pulseRules.length === 0) {
      cachedRules[cacheKey] = { content: '', timestamp: now };
      return '';
    }

    let finalPrompt = '';

    // Format Market Pulse (Trends)
    if (pulseRules.length > 0) {
      const pulseContent = pulseRules
        .map((r: { content: string }) => r.content)
        .join('\n\n');
      finalPrompt += `\n🌎 TENDENCIAS ACTUALES DEL MERCADO (MARKET PULSE 2026):\n${pulseContent}\n`;
    }

    // Format User Feedback Rules
    if (mainRules.length > 0) {
      const formattedMain = mainRules
        .filter((r: { feature: string }) => r.feature !== 'market-pulse')
        .map((r: { rule_type: string; content: string }) => `- [${r.rule_type.toUpperCase()}] ${r.content}`)
        .join('\n');
      
      if (formattedMain) {
        finalPrompt += `\n📝 REGLAS APRENDIDAS (CRÍTICO - FEEDBACK REAL):\n${formattedMain}\n`;
      }
    }

    cachedRules[cacheKey] = { content: finalPrompt, timestamp: now };
    return finalPrompt;
  } catch (err) {
    logger.warn('[feedbackRulesService] Error fetching rules:', err);
    return '';
  }
}

/**
 * Fetches feedback stats for the admin panel.
 */
export async function getFeedbackStats(): Promise<{
  feedback: any[];
  stats: { feature: string; feedback_type: string; count: number }[];
}> {
  try {
    const res = await adminFetch(`${API_URL}/feedback`);
    if (!res.ok) throw new Error('Failed to fetch feedback');
    return res.json();
  } catch (err) {
    logger.error('[feedbackRulesService] Error:', err);
    return { feedback: [], stats: [] };
  }
}

/**
 * Fetches all active prompt rules for admin management.
 */
export async function getActiveRules(): Promise<any[]> {
  try {
    const res = await adminFetch(`${API_URL}/prompt-rules`);
    if (!res.ok) throw new Error('Failed to fetch rules');
    const data = await res.json();
    return data.rules || [];
  } catch (err) {
    logger.error('[feedbackRulesService] Error:', err);
    return [];
  }
}

/** Clears the cached rules (useful after admin changes) */
export function invalidateRulesCache(): void {
  cachedRules = {};
}
