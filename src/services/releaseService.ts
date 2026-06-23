import { PlatformUpdate, PlatformUpdateRead } from "../../types";
import { API_URL } from "../../utils/apiConfig";

/**
 * releaseService.ts
 * Frontend service for managing platform updates and WOW notifications.
 */

export const releaseService = {
  /**
   * Fetches full history of platform updates for the Intel Panel.
   */
  async getHistory(): Promise<PlatformUpdate[]> {
    try {
      const res = await fetch(`${API_URL}/platform-updates/history`);
      if (!res.ok) throw new Error("Failed to fetch update history");
      const data = await res.json();
      return data.updates || [];
    } catch (err) {
      console.error("[releaseService] Error fetching history:", err);
      return [];
    }
  },

  /**
   * Checks if there's a pending update that the user hasn't seen via modal yet.
   * This is part of the "one-shot" logic.
   */
  async checkPendingUpdate(userId: string): Promise<PlatformUpdate | null> {
    try {
      const res = await fetch(`${API_URL}/platform-updates/pending/${userId}`);
      if (!res.ok) throw new Error("Failed to check pending updates");
      const data = await res.json();
      return data.pending || null;
    } catch (err) {
      console.error("[releaseService] Error checking pending updates:", err);
      return null;
    }
  },

  /**
   * Tracks that a user has interacted with an update.
   */
  async trackRead(userId: string, updateId: string, source: PlatformUpdateRead['source']): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/platform-updates/track-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updateId, source })
      });
      return res.ok;
    } catch (err) {
      console.error("[releaseService] Error tracking read:", err);
      return false;
    }
  }
};
