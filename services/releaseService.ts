/**
 * releaseService.ts — WOW Notifications frontend service
 * Handles: pending update check (one-shot), mark-as-read, and fetching the full update list.
 */
import { API_URL } from "../utils/apiConfig";
import type { PlatformUpdate } from "../types";

const BASE = `${API_URL.replace(/\/api$/, "")}/.netlify/functions/api-platform-updates`;

export const releaseService = {
  /**
   * Check if there's an unread platform update for this user.
   * Called once per login — returns null if nothing to show.
   */
  async checkPendingUpdate(userId: string): Promise<PlatformUpdate | null> {
    try {
      const res = await fetch(`${BASE}?action=pending&userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return null;
      const { update } = await res.json();
      return update || null;
    } catch {
      return null;
    }
  },

  /**
   * Mark an update as read for this user.
   * source: 'in_app_modal' | 'panel_click' | 'email_opened'
   */
  async markRead(userId: string, updateId: string, source: "in_app_modal" | "panel_click" | "release_panel" = "in_app_modal"): Promise<void> {
    try {
      await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", userId, updateId, source }),
      });
    } catch {
      // Non-blocking — tracking failure is not critical
    }
  },

  /**
   * Get the public changelog (title + version + date) for non-admin users.
   * Used by ReleaseIntelPanel to display the history.
   */
  async getPublicChangelog(): Promise<PlatformUpdate[]> {
    try {
      const res = await fetch(`${BASE}?action=public`);
      if (!res.ok) return [];
      const { updates } = await res.json();
      return updates || [];
    } catch {
      return [];
    }
  },

  /**
   * Admin: get all updates with stats.
   */
  async adminGetAll(adminSecret: string): Promise<PlatformUpdate[]> {
    try {
      const res = await fetch(`${BASE}?action=list`, {
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      if (!res.ok) return [];
      const { updates } = await res.json();
      return updates || [];
    } catch {
      return [];
    }
  },

  /**
   * Admin: publish a new update and trigger email broadcast.
   */
  async adminPublish(adminSecret: string, payload: {
    version: string;
    type: "major" | "feature" | "fix" | "ai-upgrade";
    titleEs: string;
    titleEn?: string;
    descriptionEs: string;
    descriptionEn?: string;
    previewUrl?: string;
    featureTab?: string;
    ctaUrl?: string;
    emailSubjectActive?: string;
    emailSubjectTrial?: string;
    emailSubjectExpired?: string;
    emailSubjectFree?: string;
    createdBy: string;
    segments?: string[];
    preview?: boolean;
  }): Promise<{ ok: boolean; updateId?: string; emailsSent?: number; usersTotal?: number; previews?: any }> {
    try {
      const res = await fetch(BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ action: "publish", ...payload }),
      });
      return await res.json();
    } catch (e) {
      return { ok: false };
    }
  },

  /**
   * Admin: resend broadcast for an existing update.
   */
  async adminResend(adminSecret: string, updateId: string, segments?: string[]): Promise<{ ok: boolean; emailsSent?: number }> {
    try {
      const res = await fetch(BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ action: "resend", updateId, segments }),
      });
      return await res.json();
    } catch {
      return { ok: false };
    }
  },

  /**
   * Admin: deactivate an update (hides it from the one-shot check).
   */
  async adminDeactivate(adminSecret: string, updateId: string): Promise<void> {
    try {
      await fetch(BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminSecret}`,
        },
        body: JSON.stringify({ action: "deactivate", updateId }),
      });
    } catch {}
  },

  /**
   * Admin: get stats for a specific update.
   */
  async adminGetStats(adminSecret: string, updateId: string): Promise<any> {
    try {
      const res = await fetch(`${BASE}?action=stats&updateId=${updateId}`, {
        headers: { Authorization: `Bearer ${adminSecret}` },
      });
      return await res.json();
    } catch {
      return null;
    }
  },
};
