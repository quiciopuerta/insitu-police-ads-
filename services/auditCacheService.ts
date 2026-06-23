import { logger } from '../utils/logger';
import { buildAbsoluteUrl } from '../utils/apiConfig';
/**
 * Unified Cache Service for AI Audits
 * Interface for Netlify Function api-visual-cache (generalized as api-audit-cache logic)
 */

export const auditCacheService = {
  computeHash: async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  },

  checkCache: async <T>(hash: string): Promise<T | null> => {
    try {
      let userId = "";
      try {
        const session = localStorage.getItem("insitu_active_session");
        if (session) {
          const parsed = JSON.parse(session);
          userId = parsed.id || parsed.user?.id || "";
        }
      } catch { /* ignore */ }

      const res = await fetch(buildAbsoluteUrl(`/.netlify/functions/api-visual-cache?hash=${hash}`), {
        headers: userId ? { 'X-User-Id': userId } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.cached) return data.result as T;
      }
    } catch (e) {
      logger.warn("[AuditCache] Cache check failed", e);
    }
    return null;
  },

  saveCache: async (hash: string, result: any): Promise<void> => {
    try {
      let userId = "";
      try {
        const session = localStorage.getItem("insitu_active_session");
        if (session) {
          const parsed = JSON.parse(session);
          userId = parsed.id || parsed.user?.id || "";
        }
      } catch { /* ignore */ }

      await fetch(buildAbsoluteUrl("/.netlify/functions/api-visual-cache"), {
        method: "POST",
        body: JSON.stringify({ hash, result }),
        headers: { 
          "Content-Type": "application/json",
          ...(userId ? { 'X-User-Id': userId } : {})
        },
      });
    } catch (e) {
      logger.warn("[AuditCache] Cache save failed", e);
    }
  }
};
