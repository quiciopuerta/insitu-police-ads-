import { authService } from "../authService";
import { RESOURCE_CONSUMPTION_RATES } from "../../constants";
import { aiTechLogService } from "./aiTechLogService";
import { logger } from '../../utils/logger';


/**
 * Key Rotation Service (RESTORED TO ORIGINAL WORKING STATE)
 * 
 * Re-enabling multi-key support to resolve 429 Quota Exceeded errors.
 * This service balances load across Primary, Secondary, and System keys
 * from both environment variables and user settings.
 */
export const keyRotationService = {
  _blockedKeys: new Map<string, number>(), // key -> block_until_timestamp
  _BLOCK_DURATION: 5 * 60 * 1000, // 5 minutes

  /**
   * Gets the next available API key from the pool, excluding blocked ones.
   */
  getNextKey: (provider: string = 'studio'): string => {
    const allKeys: string[] = [];

    // 1. (DEPRECATED) Collect from Environment Variables
    // VITE_ variables are never referenced directly for secrets anymore to prevent Vite bundle leakage.
    // Instead, we rely exclusively on VITE_GK_ENC (Encrypted Bundle) and User Settings.

    // 2. (REMOVED) Collect from Encrypted Bundle (VITE_GK_ENC)
    // Removed for security: Base64 decoding in the frontend is detectable by Google Cloud scanners.
    // All AI calls must now go through the Netlify Functions proxy in production.


    // 3. Collect from User Settings (Active configurations)
    try {
      const settings = authService.getSettings();
      const activeConfigs = settings.aiConfigs?.filter((c: any) => c.status === 'active' && c.apiKey && (c.provider || 'studio') === provider) || [];
      activeConfigs.forEach((c: any) => {
        if (!allKeys.includes(c.apiKey)) allKeys.push(c.apiKey);
      });
    } catch (e) {
      // Settings might not be ready yet
    }

    // Remove duplicates
    const uniqueKeys = Array.from(new Set(allKeys)).filter(k => k.length > 20); // Support AIza and AQ. keys

    if (uniqueKeys.length === 0) {
      logger.warn("[KeyRotation] No valid AI keys found in the system. Falling back to server proxy.");
      return '';
    }

    // 4. Filter out blocked keys
    const now = Date.now();
    const availableKeys = uniqueKeys.filter(key => {
      const blockedUntil = keyRotationService._blockedKeys.get(key);
      if (blockedUntil && blockedUntil > now) return false;
      if (blockedUntil && blockedUntil <= now) {
        keyRotationService._blockedKeys.delete(key); // Cleanup expired block
      }
      return true;
    });

    // 5. Select a key (Random for load distribution)
    if (availableKeys.length > 0) {
      const picked = availableKeys[Math.floor(Math.random() * availableKeys.length)];
      return picked;
    }

    // 6. Last resort: If ALL keys are blocked, pick the one that will be unblocked SOONEST
    logger.warn(`[KeyRotation] All ${uniqueKeys.length} keys are quota-exhausted. Selecting the one recovering soonest.`);
    
    let soonestKey = uniqueKeys[0];
    let minTime = Infinity;

    uniqueKeys.forEach(key => {
      const time = keyRotationService._blockedKeys.get(key) || 0;
      if (time < minTime) {
        minTime = time;
        soonestKey = key;
      }
    });

    return soonestKey;
  },

  /**
   * Blocks a key temporarily after a 429 error.
   */
  reportFailure: (key: string, error: any) => {
    if (!key) return;

    const errorMsg = String(error?.message || error || "").toLowerCase();
    const status = error?.status || 0;

    const isQuotaError = 
      errorMsg.includes("429") || 
      status === 429 || 
      errorMsg.includes("quota") ||
      errorMsg.includes("exhausted") ||
      errorMsg.includes("limit reach");

    if (isQuotaError) {
      const blockUntil = Date.now() + keyRotationService._BLOCK_DURATION;
      keyRotationService._blockedKeys.set(key, blockUntil);
      logger.warn(`[KeyRotation] Key ${key.substring(0, 8)}... blocked until ${new Date(blockUntil).toLocaleTimeString()} (429 Quota).`);
      
      try {
        authService.reportAPIError(key, "Quota Exceeded (429)");
      } catch (e) {}
    } else if (errorMsg.includes("invalid") || errorMsg.includes("key not found") || status === 403) {
      // Permanent failure for this key
      keyRotationService._blockedKeys.set(key, Date.now() + (24 * 60 * 60 * 1000)); // Block for 24h
      logger.error(`[KeyRotation] Key ${key.substring(0, 8)}... appears INVALID. Blocking for 24h.`);
      
      try {
        authService.reportAPIError(key, "Invalid API Key");
      } catch (e) {}
    }
  },

  trackTokens: (result: any, taskName: string, details?: string, rateKey: keyof typeof RESOURCE_CONSUMPTION_RATES = 'TEXT_AUDIT') => {
    try {
      const consumptionRate = RESOURCE_CONSUMPTION_RATES[rateKey] || 1;
      const estimatedTokens = Math.ceil((JSON.stringify(result).length / 4) * consumptionRate);
      authService.trackTokenUsage(estimatedTokens, taskName, details);
    } catch (e) {
      logger.error("Error tracking tokens", e);
    }
  },

  fetchWithRetry: async <T>(
    fn: (apiKey: string) => Promise<T>,
    retries = 3,
    delay = 2000,
    provider = 'studio'
  ): Promise<T> => {
    const currentKey = keyRotationService.getNextKey(provider);
    
    try {
      const isProduction = import.meta.env.PROD;
      if (!currentKey && !isProduction) {
        throw new Error("No API key available for AI request.");
      } else if (!currentKey) {
        logger.warn("[AI-Core] No API key found locally, falling back to server-side proxy.");
      }
      
      const result = await fn(currentKey || '');
      if (currentKey) {
        authService.clearAPIError(currentKey);
      }
      return result;
    } catch (error: any) {
      const errorMsg = error?.message?.toLowerCase() || "";
      const status = error?.status || 500;

      const isQuotaError =
        errorMsg.includes("429") ||
        status === 429 ||
        errorMsg.includes("quota");

      const isTransient = status >= 500 || errorMsg.includes("overloaded") || errorMsg.includes("unavailable");

      // Report failure to rotate it out
      keyRotationService.reportFailure(currentKey, error);

      if (retries > 0 && (isTransient || isQuotaError)) {
        const backoff = delay * (isQuotaError ? 3 : 1.5) + Math.random() * 1000;
        logger.warn(`[AI-Core] Request failed (${status}). Retrying with next key in ${Math.round(backoff)}ms... (Retries left: ${retries})`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        return keyRotationService.fetchWithRetry(fn, retries - 1, backoff, provider);
      }

      // Log failure with userId for diagnostics
      const userId = authService.getCurrentUser()?.id;
      aiTechLogService.logError({
        feature: "AI_Core_MultiKey",
        errorMessage: error.message || "Unknown error",
        severity: isQuotaError ? "warning" : "error",
        userId,
        context: { 
          status, 
          retriesUsed: 3 - retries, 
          isQuota: isQuotaError,
          keyUsed: currentKey ? (currentKey.substring(0, 8) + "...") : "none"
        }
      });

      throw error;
    }
  },
};

