import { Language } from "../../types";
import { keyRotationService } from "./keyRotationService";
import { getLearnedRules } from "../feedbackRulesService";
import { aiBridge } from "./AiUniversalBridge";
import { logger } from '../../utils/logger';


export interface SearchConsoleAIResult {
  performanceScore: number;
  criticalIssues: string[];
  contentGaps: string[];
  keywordOpportunities: {
    keyword: string;
    action: "Optimizar" | "Crear Nuevo" | "Expandir";
    reason: string;
    intent?: string; // INFORMATIONAL, COMMERCIAL, TRANSACTIONAL
  }[];
  strategicRoadmap: string[];
  analysis: string;
  tldr?: string;
  cannibalizationReport?: string;
  eeatScore?: number;
}

export const seoAnalysisService = {
  analyzeSearchConsoleData: async (
    gscData: any,
    lang: Language = "es"
  ): Promise<SearchConsoleAIResult> => {
    return keyRotationService.fetchWithRetry(async (apiKey) => {
      const provider = aiBridge.getSmartProvider('TEXT_AUDIT', apiKey);
      const seoRules = await getLearnedRules('SEO_SearchConsole');
      
      const prompt = `AUDITORÍA SEO MAESTRO - SEARCH CONSOLE INTEL:
      DATOS CRUDOS GSC: ${JSON.stringify(gscData).substring(0, 8000)}
      ${seoRules}
      
      INSTRUCCIONES DE IDENTIDAD:
      1. Eres SearchIntel AI, un SEO Strategist Senior (persona: agency-seo-specialist).
      2. No eres un chatbot genérico. Eres un auditor forense de búsqueda orgánica.
      3. Tu tono es profesional, clínico y orientado a resultados (ROI).

      INSTRUCCIONES TÉCNICAS (PROTOCOLO AGENCIA):
      - CANNIBALIZATION AUDIT (MANDATORIO): Analiza si múltiples URLs están compitiendo por la misma query.
      - E-E-A-T (EXPERIENCE, EXPERTISE, AUTHORITATIVENESS, TRUST): Evalúa la calidad del contenido.
      - INTENT CLASSIFICATION: Clasifica keywords como INFORMATIONAL, COMMERCIAL o TRANSACTIONAL.
      - BILINGUAL REQUIREMENT: Mantén los términos técnicos en INGLÉS (ej: "Keyword Cannibalization", "E-E-A-T Score"). El análisis en ${lang === "es" ? "ESPAÑOL" : "ENGLISH"}.

      ESTRUCTURA DE RESPUESTA REQUERIDA (delimitada por bloques):

      TLDR_START
      (Resumen Ejecutivo de 3 párrafos: 1. Estado, 2. Hallazgo crítico, 3. Ganancia inmediata)
      TLDR_END

      CANNIBALIZATION_START
      (Reporte detallado de conflictos o confirmación de limpieza)
      CANNIBALIZATION_END

      JSON_START
      {
        "performanceScore": 0-100,
        "eeatScore": 0-100,
        "criticalIssues": [],
        "contentGaps": [],
        "keywordOpportunities": [
          {"keyword": "...", "action": "Optimizar", "reason": "...", "intent": "TRANSACTIONAL"}
        ],
        "strategicRoadmap": [],
        "analysis": "..."
      }
      JSON_END

      IDIOMA: ${lang === "es" ? "ESPAÑOL" : "ENGLISH"}.`;

      const response = await provider.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "Eres SearchIntel AI, un experto SEO Técnico Senior de la plataforma INsitu AI. Responde siempre con JSON válido y basa tu análisis estrictamente en los datos de Google Search Console proporcionados.",
          tools: [{ googleSearch: {} }],
        },
      });

      const textResponse = response.text || "{}";
      
      const extractBlock = (mS: string, mE: string) => {
        const regex = new RegExp(`${mS}\\s*([\\s\\S]*?)${mE}`, "si");
        const match = textResponse.match(regex);
        return match ? match[1].trim() : null;
      };

      const tldr = extractBlock("TLDR_START", "TLDR_END");
      const cannibal = extractBlock("CANNIBALIZATION_START", "CANNIBALIZATION_END");
      const jsonText = extractBlock("JSON_START", "JSON_END") || textResponse;

      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : "{}";

      let result: any = {};
      try {
        result = JSON.parse(cleanJson);
        if (tldr) result.tldr = tldr;
        if (cannibal) result.cannibalizationReport = cannibal;
      } catch (e) {
        logger.error("Error parsing Search Console AI JSON:", e);
      }

      keyRotationService.trackTokens(result, "Search Console SEO Audit", gscData?.siteUrl || "N/A", 'TEXT_AUDIT');
      return result as SearchConsoleAIResult;
    });
  },
};
