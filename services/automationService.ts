import { API_URL } from "../utils/apiConfig";
import { AutomationRule, AutomationLog } from "../types";
import { logger } from '../utils/logger';


const RULES_STORAGE = "insitu_automation_rules";

export const automationService = {
  /**
   * Fetch rules from server with local cache fallback
   */
  fetchRules: async (userId: string): Promise<AutomationRule[]> => {
    try {
      const response = await fetch(`${API_URL}/automation/rules/${userId}`, {
        headers: { "x-user-id": userId }
      });
      if (response.ok) {
        const rules = await response.json();
        localStorage.setItem(RULES_STORAGE, JSON.stringify(rules));
        return rules;
      }
    } catch (error) {
      logger.warn("[AUTOMATION] Server unreachable, using local rules:", error);
    }

    const local = localStorage.getItem(RULES_STORAGE);
    if (local) {
      try {
        return JSON.parse(local).filter((r: any) => r.userId === userId || !r.userId);
      } catch {
        return [];
      }
    }
    return [];
  },

  /**
   * Save or update a rule
   */
  saveRule: async (rule: AutomationRule, userId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/automation/rules`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "x-user-id": userId 
        },
        body: JSON.stringify({ ...rule, userId })
      });
      return response.ok;
    } catch (error) {
      logger.error("[AUTOMATION] Failed to save rule to server:", error);
      // Fallback: save to local only if needed, but primary is server
      return false;
    }
  },

  /**
   * Delete a rule (soft delete)
   */
  deleteRule: async (ruleId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/automation/rules/${ruleId}`, {
        method: "DELETE"
      });
      return response.ok;
    } catch (error) {
      logger.error("[AUTOMATION] Failed to delete rule:", error);
      return false;
    }
  },

  /**
   * Fetch execution logs
   */
  fetchLogs: async (userId: string): Promise<AutomationLog[]> => {
    try {
      const response = await fetch(`${API_URL}/automation/logs/${userId}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      logger.error("[AUTOMATION] Failed to fetch logs:", error);
    }
    return [];
  },

  /**
   * Add an execution log
   */
  addLog: async (log: Partial<AutomationLog>): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/automation/logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log)
      });
      return response.ok;
    } catch (error) {
      logger.error("[AUTOMATION] Failed to save log:", error);
      return false;
    }
  }
};
