import { buildAbsoluteUrl } from "../../utils/apiConfig";

import { adsAnalysisService } from './adsAnalysisService';
import { mediaAnalysisService } from './mediaAnalysisService';
import { trafficAnalysisService } from './trafficAnalysisService';
import { chatService } from './chatService';
import { contentAnalysisService } from './contentAnalysisService';
import { keyRotationService } from './keyRotationService';
import { adsGenerationService } from './adsGenerationService';
import { funnelGenerationService } from './funnelGenerationService';

export const aiService = {
    // Key Management
    checkAIHealth: async (apiKey: string) => {
        // If we are on Desktop, assume the AI is healthy if Ollama is handled by the Bridge
        const { ExecutionRouter } = await import('../bridge/ExecutionRouter');
        if (ExecutionRouter.isDesktopMode()) {
            return { status: 'online' as const, latency: 10 };
        }

        const isProduction = import.meta.env.PROD;
        const key = apiKey || keyRotationService.getNextKey() || '';
        
        // In production, if no local key is available, we ping the proxy to check system status
        if (!key && isProduction) {
            const start = Date.now();
            try {
                const { authService } = await import('../auth/authService');
                const userId = authService.getCurrentUser()?.id || '';
                const response = await fetch(buildAbsoluteUrl('/.netlify/functions/api-ai-proxy'), {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        ...(userId ? { 'X-User-Id': userId } : {})
                    },
                    body: JSON.stringify({ task: 'ping' }),
                });
                const latency = Date.now() - start;
                return { 
                    status: response.ok ? 'online' : 'offline' as const, 
                    latency 
                };
            } catch {
                return { status: 'offline' as const, latency: Date.now() - start };
            }
        }

        if (!key) return { status: 'offline' as const, latency: -1 };

        const start = Date.now();
        try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: key });
            await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
            });
            const latency = Date.now() - start;
            const status = latency < 2000 ? 'online' : 'degraded';
            return { status, latency };
        } catch {
            return { status: 'offline' as const, latency: Date.now() - start };
        }
    },

    // Service Facades
    ...adsAnalysisService,
    ...mediaAnalysisService,
    ...trafficAnalysisService,
    ...chatService,
    ...contentAnalysisService,
    ...adsGenerationService,
    ...funnelGenerationService,

    // Re-export core utilities if needed
    trackTokens: keyRotationService.trackTokens,
    fetchWithRetry: keyRotationService.fetchWithRetry
};

// Also export individual services for granular control
export { 
    adsAnalysisService, 
    mediaAnalysisService, 
    trafficAnalysisService, 
    chatService, 
    contentAnalysisService, 
    adsGenerationService,
    funnelGenerationService,
    keyRotationService 
};
export default aiService;
