import { 
  FunnelArchitectResult, 
  LandingPageBrief, 
  Language, 
  BrandProfile 
} from "../../types";
import { keyRotationService } from "./keyRotationService";
import { adsGenerationService } from "./adsGenerationService";
import { cleanAIData } from "../../utils/sanitization";
import { aiBridge } from "./AiUniversalBridge";

export const funnelGenerationService = {
  generateFunnel: async (
    url: string,
    objective: string,
    targetAudience: string,
    lang: Language = "es",
    brandProfile?: BrandProfile
  ): Promise<FunnelArchitectResult> => {
    return keyRotationService.fetchWithRetry(async (apiKey) => {
      const provider = aiBridge.getSmartProvider('FUNNEL_GEN', apiKey);

      // 1. First, generate the Strategic Brief for the Landing Page
      const briefPrompt = `ACTÚA COMO UN ESTRATEGA DE CRECIMIENTO Y COPYWRITER SENIOR.
      Tu misión es generar un BRIEF CREATIVO detallado para una Landing Page a partir de esta URL: ${url}
      OBJETIVO: ${objective}
      AUDIENCIA: ${targetAudience}
      IDIOMA: ${lang === 'es' ? 'Español' : 'Inglés'}

      ${brandProfile ? `CONTEXTO DE MARCA:
      - Nombre: ${brandProfile.brandName}
      - Propuesta: ${brandProfile.valueProposition}
      - Tono: ${brandProfile.toneOfVoice}` : ''}

      INSTRUCCIONES:
      1. Define la estrategia de venta (ej. PAS - Problema, Agitación, Solución o AIDA).
      2. Genera las secciones de la página con los textos exactos (Copywriting).
      3. Proporciona un "Visual Prompt" para cada sección (instrucciones para generar imágenes o videos que acompañen al texto).
      4. Sugiere una paleta de colores.

      ESPONDÉ ÚNICAMENTE CON UN OBJETO JSON VÁLIDO siguiendo este esquema:
      {
        "id": "unique-id",
        "title": "Título del Proyecto",
        "targetAudience": "Descripción de la audiencia",
        "toneOfVoice": "Tono detectado",
        "sellingStrategy": "PAS | AIDA | otros",
        "sections": [
          {
            "id": "1",
            "type": "hero | features | socialProof | faq | cta | benefits | neuroInsights",
            "title": "Titular de la sección",
            "content": "Cuerpo del texto / Copywriting persuasivo",
            "subtitle": "Subtítulo opcional",
            "ctaText": "Texto del botón",
            "visualPrompt": "Instrucción visual para IA generadora de imágenes",
            "items": [{"title": "item title", "description": "item desc"}]
          }
        ],
        "suggestedColors": ["#hex1", "#hex2"],
        "marketingStrategy": "Explicación breve de por qué este funnel funcionará"
      }`;

      const briefResponse = await provider.generateContent({
        contents: [{ role: "user", parts: [{ text: briefPrompt }] }]
      });
      const briefText = cleanAIData(briefResponse.text || "");
      const landingBrief: LandingPageBrief = JSON.parse(briefText.match(/\{[\s\S]*\}/)?.[0] || "{}");

      // 2. Generate Ads (Search, Meta, TikTok) using the existing adsGenerationService
      const platforms: Array<'search' | 'meta' | 'tiktok'> = ['search', 'meta', 'tiktok'];
      
      const adsPromises = platforms.map(platform => 
        adsGenerationService.generateAdContent({
          url,
          keywords: objective, 
          audience: targetAudience,
          objective,
          platform,
          brandContext: brandProfile,
          optimizationLevel: 'aggressive',
          copyFramework: landingBrief.sellingStrategy.toLowerCase().includes('aida') ? 'aida' : 'pas'
        }, lang)
      );

      const adsResults = await Promise.all(adsPromises);

      const result: FunnelArchitectResult = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        url,
        ads: adsResults,
        landingBrief,
        marketingStrategy: (landingBrief as any).marketingStrategy || "Estrategia omnichannel optimizada para conversión."
      };

      keyRotationService.trackTokens(result, "Arquitectura de Funnel", url, 'FUNNEL_GEN');
      return result;
    });
  }
};
