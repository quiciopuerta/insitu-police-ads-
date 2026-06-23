import { buildAbsoluteUrl } from "../../utils/apiConfig";
import { API_URL } from "../../utils/apiConfig";
import { logger } from '../../utils/logger';


/**
 * Service to log technical failures and malfunctions in production properties.
 * These logs can be reviewed by the Super Admin and Antigravity to fix issues.
 */
export const aiTechLogService = {
  /**
   * Register a technical error in the AI system.
   */
  async logError(params: {
    feature: string;
    errorMessage: string;
    stackTrace?: string;
    context?: any;
    severity?: "error" | "warning" | "critical";
    userId?: string;
  }) {
    try {
      let currentUserId = params.userId || "";
      if (!currentUserId) {
        try {
          const session = localStorage.getItem("insitu_active_session");
          if (session) {
            const parsed = JSON.parse(session);
            currentUserId = parsed.id || parsed.user?.id || "";
          }
        } catch { /* ignore */ }
      }

      const response = await fetch(buildAbsoluteUrl('/.netlify/functions/api-ai-logs'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentUserId ? { "X-User-Id": currentUserId } : {}),
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        logger.warn("[aiTechLogService] Could not send log to server:", response.statusText);
      }
    } catch (err) {
      logger.error("[aiTechLogService] Network error sending tech log:", err);
    }
  },

  /**
   * Fetch latest logs (for Admin Dashboard).
   */
  async getLatestLogs(limit = 50, feature?: string) {
    try {
      let currentUserId = "";
      try {
        const session = localStorage.getItem("insitu_active_session");
        if (session) {
          const parsed = JSON.parse(session);
          currentUserId = parsed.id || parsed.user?.id || "";
        }
      } catch { /* ignore */ }

      let url = `/.netlify/functions/api-ai-logs?limit=${limit}`;
      if (feature) url += `&feature=${feature}`;

      const response = await fetch(buildAbsoluteUrl(url), {
        headers: {
          "X-User-Id": currentUserId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.logs || [];
      }
      return [];
    } catch (err) {
      logger.error("[aiTechLogService] Error fetching logs:", err);
      return [];
    }
  },
};
