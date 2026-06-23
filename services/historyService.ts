import { HistoryItem } from "../types";
import { API_URL } from "../utils/apiConfig";
import { logger } from '../utils/logger';


const HIST_STORAGE = "insitu_ads_history";

/**
 * JSON replacer that strips non-serializable browser objects (Blob, ArrayBuffer,
 * Uint8Array, etc.) so that JSON.stringify never throws on complex ad payloads.
 */
const safeReplacer = (_key: string, value: unknown): unknown => {
  if (value instanceof Blob || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return undefined; // Drop binary data silently
  }
  return value;
};

/**
 * Serializes items to a JSON string, stripping any binary/non-serializable
 * values. Returns null if serialization fails entirely.
 */
const safeStringify = (items: HistoryItem[]): string | null => {
  try {
    return JSON.stringify(items, safeReplacer);
  } catch (e) {
    logger.warn('[HISTORY] JSON.stringify failed, skipping persist:', e);
    return null;
  }
};

/**
 * Helper to safely persist items to localStorage with fallback pruning.
 * Never throws — all errors are caught and logged.
 */
const safePersist = (items: HistoryItem[]): boolean => {
  // Pruning strategy cascade: full → no-mass-ads → 10 items → 1 item → clear
  const strategies: (() => HistoryItem[])[] = [
    () => items,
    () => items.filter(h => h.type !== 'mass-ads').slice(0, 50),
    () => items.slice(0, 10),
    () => items.slice(0, 1),
    () => [],
  ];

  for (const strategy of strategies) {
    const subset = strategy();
    const payload = safeStringify(subset);
    if (payload === null) continue; // JSON error — try smaller

    try {
      if (subset.length === 0) {
        localStorage.removeItem(HIST_STORAGE);
        logger.warn('[HISTORY] Nuclear prune: cleared localStorage history');
        return false;
      }
      localStorage.setItem(HIST_STORAGE, payload);
      if (subset.length < items.length) {
        logger.warn(`[HISTORY] Pruned history from ${items.length} → ${subset.length} items`);
      }
      return true;
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        continue; // Try next (smaller) strategy
      }
      logger.error('[HISTORY] Unexpected localStorage error:', e);
      return false;
    }
  }
  return false;
};

export const historyService = {
  /**
   * Obtiene el historial persistente desde el servidor, con fallback a localStorage
   */
  getHistory: async (userId: string): Promise<HistoryItem[]> => {
    try {
      const response = await fetch(`${API_URL}/history/${userId}`, {
        headers: {
          "x-user-id": userId,
        },
      });
      if (response.ok) {
        const serverHistory = await response.json();
        if (Array.isArray(serverHistory)) {
          // Sync to local cache safely
          safePersist(serverHistory);
          return serverHistory;
        }
      }
    } catch (e) {
      logger.warn("[HISTORY] Backend unavailable, using local history cache archive:", e);
    }

    // Fallback: Local Cache
    const local = localStorage.getItem(HIST_STORAGE);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        return Array.isArray(parsed) ? parsed.filter((item: HistoryItem) => item && item.userId === userId) : [];
      } catch {
        return [];
      }
    }
    return [];
  },

  /**
   * Obtiene un ítem específico con todo su detalle (para cuando result es null en la lista)
   */
  getHistoryItem: async (userId: string, itemId: string): Promise<HistoryItem | null> => {
    try {
      const response = await fetch(`${API_URL}/history/detail/${itemId}`, {
        headers: {
          "x-user-id": userId,
        },
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      logger.error("[HISTORY] Failed to fetch item detail:", e);
    }
    return null;
  },

  /**
   * Guarda un ítem de historial en el servidor y localmente
   */
  saveHistoryItem: async (item: HistoryItem): Promise<boolean> => {
    if (!item) return false;

    // 1. Local Cache management
    const local = localStorage.getItem(HIST_STORAGE);
    let history: HistoryItem[] = [];
    try {
      history = local ? JSON.parse(local) : [];
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }

    // Deduplication and cap at 100 items initially
    history = [item, ...history.filter(h => h && h.id !== item.id)].slice(0, 100);

    // Persist locally using the hardened helper
    safePersist(history);

    // 2. Persist to Backend
    try {
      const response = await fetch(`${API_URL}/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "x-user-id": item.userId
        },
        body: JSON.stringify(item),
      });
      return response.ok;
    } catch (e) {
      logger.warn("[HISTORY] Could not sync item to backend:", e);
      return false;
    }
  },

  /**
   * Elimina un ítem de historial
   */
  deleteHistoryItem: async (itemId: string): Promise<boolean> => {
    let sessionData: any = {};
    try {
      sessionData = JSON.parse(localStorage.getItem("insitu_active_session") || "{}");
    } catch {
      sessionData = {};
    }
    const userId = sessionData.id;
    
    // 1. Local Cache
    const local = localStorage.getItem(HIST_STORAGE);
    if (local) {
      try {
        let history: HistoryItem[] = JSON.parse(local);
        if (Array.isArray(history)) {
          history = history.filter(h => h && h.id !== itemId);
          safePersist(history);
        }
      } catch (e) {
        logger.error("[HISTORY] Error parsing cache during delete:", e);
      }
    }

    // 2. Persist to Backend
    try {
      const response = await fetch(`${API_URL}/history/${itemId}`, {
        method: 'DELETE',
        headers: {
          "x-user-id": userId || ""
        }
      });
      return response.ok;
    } catch (e) {
      logger.warn("[HISTORY] Could not delete item on backend:", e);
      return false;
    }
  }
};

