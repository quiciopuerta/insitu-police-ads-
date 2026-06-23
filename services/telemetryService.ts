import { API_URL } from "../utils/apiConfig";
import { logger } from '../utils/logger';


export interface LatencyLog {
  taskType: string;
  durationMs: number;
  status?: string;
  metadata?: any;
}

export const telemetryService = {
  /**
   * Log execution latency for an AI task
   */
  logLatency: async (data: LatencyLog): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/telemetry/latency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return response.ok;
    } catch (error) {
      logger.warn("[TELEMETRY] Failed to log latency:", error);
      return false;
    }
  }
};
