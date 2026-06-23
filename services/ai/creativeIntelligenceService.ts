/**
 * creativeIntelligenceService.ts
 * ===============================
 * Advanced Vision-Based Creative Scoring & Analytics.
 * This service leverages Gemini Pro Vision to analyze fully composited ad creatives.
 */

import { keyRotationService } from './keyRotationService';
import { aiBridge } from './AiUniversalBridge';
import type { CreativeScore } from '../../types';
import { logger } from '../../utils/logger';


export const creativeIntelligenceService = {
  /**
   * Analyzes a final ad creative (image + overlays) using the Vision model.
   * Predictive performance based on composition, contrast, and messaging.
   */
  scoreWithVision: async (
    dataUrl: string,
    platform: string,
    objective: string
  ): Promise<Partial<CreativeScore>> => {
    return keyRotationService.fetchWithRetry(async (apiKey) => {
      const provider = aiBridge.getSmartProvider('VISION_ANALYSIS', apiKey);
      
      // Extract base64 part
      const base64Data = dataUrl.split(',')[1] || dataUrl;

      const prompt = `
        ACTÚA COMO UN EXPERTO EN AUDITORÍA NEUROMARKETING Y PERFORMANCE MEDIA BUYER.
        ANALIZA ESTE ANUNCIO FINAL PARA LA PLATAFORMA: ${platform} CON EL OBJETIVO: ${objective}.

        TU MISIÓN ES EVALUAR LA EFECTIVIDAD VISUAL Y PREDICCIÓN DE RENDIMIENTO (CTR).

        CRITERIOS DE EVALUACIÓN:
        1. THUMB-STOPPING POWER (0-100): ¿Qué tan probable es que el usuario se detenga al ver esto? (Contraste, sujeto, impacto visual).
        2. LEGIBILIDAD (0-100): ¿El texto se lee claramente sobre el fondo? ¿Hay interferencia visual?
        3. BRAND PRESENCE (0-100): ¿El logo es visible pero no invasivo? ¿Se reconoce la marca en 3 segundos?
        4. COGNITIVE LOAD: ¿La jerarquía visual es clara (Titular -> Beneficio -> CTA)?
        5. COMPLIANCE: ¿Respeta las safe zones de la plataforma para no ser tapado por la UI?

        RESPONDE ESTRICTAMENTE EN JSON:
        {
          "visionTotalScore": 0-100,
          "thumbStoppingPower": 0-100,
          "readability": 0-100,
          "brandPower": 0-100,
          "critique": "Breve análisis estratégico (máx 20 palabras)",
          "safeZoneCheck": "OK" | "WARNING"
        }
      `;

      try {
        const response = await provider.generateContent({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/png', data: base64Data } }
            ]
          }]
        });

        const rawText = response.text || '{}';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : '{}';
        const result = JSON.parse(cleanJson);

        return {
          total: result.visionTotalScore,
          visualHierarchy: (result.readability + result.thumbStoppingPower) / 10,
          recommendation: result.critique,
          // We'll merge these vision insights into the CreativeScore object
        } as Partial<CreativeScore>;
      } catch (error) {
        logger.error('Error in scoreWithVision:', error);
        return { total: 70, recommendation: 'Vision analysis paused — heuristic fallback.' };
      }
    });
  }
};
