import { BrandBrief, BriefAnalysisResult, Language, BlogCategory } from "../../types";
import { BRIEF_AUDIT_INSTRUCTION } from "../../constants";
import { keyRotationService } from "./keyRotationService";
import { getLearnedRules } from "../feedbackRulesService";
import { aiBridge } from "./AiUniversalBridge";
import { logger } from '../../utils/logger';


/**
 * Utility to extract and parse JSON from AI's response text.
 */
const parseAiJson = (text: string, fallback: any = {}) => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : "{}";
    return JSON.parse(cleanJson);
  } catch (e) {
    logger.error("Error parsing AI JSON:", e, "Raw text:", text);
    return fallback;
  }
};

export const contentAnalysisService = {
  auditBrandBrief: async (
    brief: BrandBrief,
    lang: Language = "es",
  ): Promise<BriefAnalysisResult> => {
    return keyRotationService.fetchWithRetry(async (apiKey) => {
      const provider = aiBridge.getSmartProvider('TEXT_AUDIT', apiKey);
      const learnedRules = await getLearnedRules('BrandBrief');
      
      const prompt = `${learnedRules}
AUDITA ESTE BRIEF: ${JSON.stringify(brief)}
      
      REQUISITO CRÍTICO: Responde ÚNICAMENTE con un objeto JSON válido que siga exactamente esta estructura (sin texto adicional fuera del JSON), verificando datos y tendencias de mercado actuales en Google Search para sustentar tus consejos:
      {
        "score": 0,
        "critique": "Tu análisis exhaustivo aquí",
        "missingElements": ["Elemento faltante 1", "Elemento faltante 2"],
        "optimizationTips": ["Tip de mejora 1", "Tip de mejora 2"],
        "suggestedKeywords": ["keyword1", "keyword2"]
      }

      IDIOMA REQUERIDO: ${lang === "es" ? "ESPAÑOL" : "ENGLISH"} - ES MANDATORIO RESPONDER TODO EL CONTENIDO EN ESTE IDIOMA.`;

      const response = await provider.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: BRIEF_AUDIT_INSTRUCTION(lang),
          tools: [{ googleSearch: {} }]
        },
      });

      const textResponse = response.text || "{}";
      const result = parseAiJson(textResponse);
      
      keyRotationService.trackTokens(
        result,
        "Análisis de Brief",
        brief.projectName,
      );
      return result as BriefAnalysisResult;
    });
  },

  optimizeBlogPostSEO: async (
    title: string,
    content: string,
    lang: Language = "es",
  ): Promise<{
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    readingTime: string;
  }> => {
    return keyRotationService.fetchWithRetry(async (apiKey) => {
      const provider = aiBridge.getSmartProvider('TEXT_AUDIT', apiKey);
      const learnedRules = await getLearnedRules('BlogPostSEO');
      
      const prompt = `${learnedRules}
OPTIMIZA SEO: ${title}\n\n${content.substring(0, 5000)}
      
      REQUISITO CRÍTICO: Responde ÚNICAMENTE con un objeto JSON válido que siga exactamente esta estructura (sin texto adicional fuera del JSON), comprobando datos e intención de búsqueda recientes en Google Search si es necesario:
      {
        "metaTitle": "Título SEO Optimizado (máx 60 caracteres)",
        "metaDescription": "Meta descripción atractiva (máx 155 caracteres)",
        "keywords": ["keyword 1", "keyword 2", "keyword 3"],
        "readingTime": "X min"
      }
      
      IDIOMA REQUERIDO: ${lang === "es" ? "ESPAÑOL" : "ENGLISH"} - ES MANDATORIO RESPONDER TODO EL CONTENIDO EN ESTE IDIOMA.`;

      const response = await provider.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }]
        },
      });

      const textResponse = response.text || "{}";
      const result = parseAiJson(textResponse);
      
      keyRotationService.trackTokens(result, "Optimización SEO Blog", title);
      return result as any;
    });
  },

  auditBlogPostIntelligence: async (
    title: string,
    content: string,
    lang: Language = "es",
  ): Promise<any> => {
    return keyRotationService.fetchWithRetry(async (apiKey) => {
      const provider = aiBridge.getSmartProvider('TEXT_AUDIT', apiKey);
      const learnedRules = await getLearnedRules('BlogPostIntelligence');
      
      const prompt = `${learnedRules}
AUDITORÍA DE INTELIGENCIA Y VERDAD ABSOLUTA:
      TÍTULO: ${title}
      CONTENIDO: ${content.substring(0, 8000)}
      
      OBJETIVO: Evalúa este contenido con las habilidades de un Director de Marketing (CMO) y SEO Estratégico.
      1. ORIGINALIDAD: ¿Es contenido único o parece generado/clonado por IA sin valor? (0-100)
      2. SEO: ¿Está optimizado para intención de búsqueda real? (0-100)
      3. FACTOR DE VERDAD: Contrasta afirmaciones con datos reales (Google Search) y asigna un puntaje de veracidad. (0-100)
      
      REQUISITO CRÍTICO: Responde ÚNICAMENTE con un objeto JSON válido (sin texto adicional):
      {
        "seoScore": 0,
        "originalityScore": 0,
        "intelligenceAudit": {
          "seoCritique": "Análisis SEO técnico y táctico",
          "originalityAnalysis": "Análisis de unicidad y valor diferencial",
          "lastAuditAt": 0,
          "topSkillsUsed": ["Growth Hacking", "Semantic SEO", "Data Grounding"],
          "truthFactor": 0
        }
      }
      
      IDIOMA REQUERIDO: ${lang === "es" ? "ESPAÑOL" : "ENGLISH"}`;

      const response = await provider.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }]
        },
      });

      const textResponse = response.text || "{}";
      const result = parseAiJson(textResponse);
      
      // Inject current timestamp as per plan
      if (result.intelligenceAudit) {
        result.intelligenceAudit.lastAuditAt = Date.now();
      }

      keyRotationService.trackTokens(result, "Auditoría de Inteligencia Blog", title);
      return result;
    });
  },

  generateBlogPostContent: async (
    instruction: string,
    lang: Language = "es",
  ): Promise<{
    title: string;
    content: string;
    category: BlogCategory;
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  }> => {
    return keyRotationService.fetchWithRetry(async (apiKey) => {
      // For creative generation, we use BLOG_GEN (OpenRouter/Llama 3)
      const provider = aiBridge.getSmartProvider('BLOG_GEN', apiKey);
      const learnedRules = await getLearnedRules('BlogPost');
      
      const prompt = `${learnedRules}
GENERA UN BLOG POST ORIGINAL Y DE ALTO IMPACTO BASADO EN ESTA INSTRUCCIÓN: "${instruction}"
      
      OBJETIVO: Posicionamiento en nicho y optimización para LLMs (IA Search Grounding).
      
      REQUISITOS DE ESTILO Y TONO (INsitu AI Premium):
      1. TONO: Profesional, visionario, innovador y autoritario.
      2. FORMATO OBLIGATORIO (HTML):
         - Usa <h2> para secciones principales (Se renderizarán en blanco).
         - Usa <h3> para subsecciones (Se renderizarán en Magenta #ff477b).
         - Usa <strong> para resaltar conceptos clave (Se renderizarán en Magenta #ff477b).
         - Limpia el HTML de estilos inline o clases. Solo etiquetas semánticas.
      3. ESTRATEGIA: Crea contenido que aporte "Verdad Absoluta" y datos contrastables.
      
      REQUISITO CRÍTICO: Responde ÚNICAMENTE con un objeto JSON válido (sin texto adicional):
      {
        "title": "Un título magnético y SEO-friendly",
        "content": "<h1>Título del Post</h1><p>Introducción...</p><h2>Sección 1</h2><p>Contenido...</p><h3>Subsección</h3><p>...</p>",
        "category": "AI",
        "metaTitle": "Título SEO (máx 60 car)",
        "metaDescription": "Snippet atractivo (máx 155 car)",
        "keywords": ["key1", "key2", "key3"]
      }
      
      CATEGORÍAS DISPONIBLES: ["AI", "Marketing", "Business", "Strategy", "Tech"]
      IDIOMA REQUERIDO: ${lang === "es" ? "ESPAÑOL" : "ENGLISH"}`;

      const response = await provider.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "Eres un Director de Contenido Senior y experto en SEO Semántico para INsitu AI.",
          // Note: OpenRouter doesn't support Google Search grounding natively this way, 
          // but Llama 3 is trained on web data and the brief is creative. 
          // If grounding is vital, we'd route this back to Gemini.
          responseMimeType: "application/json"
        },
      });

      const textResponse = response.text || "{}";
      const result = parseAiJson(textResponse);
      
      keyRotationService.trackTokens(result, "Generación de Contenido AI", instruction);
      return result as any;
    });
  },
};
