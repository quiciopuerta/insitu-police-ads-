import { GoogleGenAI } from "@google/genai";
import {
  ImageAnalysisResult,
  VideoAnalysisResult,
  Language,
} from "../../types";
import { keyRotationService } from "./keyRotationService";
import { getLearnedRules } from "../feedbackRulesService";
import { auditCacheService } from "../auditCacheService";
import { compressImage } from "../../utils/mediaCompression";
import { maskPII } from "../../utils/sanitization";
import { API_URL } from "../../utils/apiConfig";
import { GLOBAL_MODEL_ID } from "../../constants/aiModels";
import { logger } from '../../utils/logger';
import { authService } from "../auth/authService";
import { aiBridge } from "./AiUniversalBridge";


// ============================================================================
// INDUSTRY PROTOCOLS & OFFICIAL GUIDELINES (2025-2026 UPDATE)
// ============================================================================
const INDUSTRY_PROTOCOLS = {
  GOOGLE_ADS: {
    ABCD_FRAMEWORK: "Attract (0-3s), Brand (early & frequent), Connect (emotional), Direct (clear CTA)",
    VIDEO_REQUIREMENTS: "Logotipo en primeros 5s, Relación de aspecto 9:16/16:9/1:1, Voz en off humana.",
    CREATIVE_PRINCIPLES: "Optimización por objetivo, Atributos creativos destacados, Uso de IA generativa transparente."
  },
  META_ADS: {
    CREATIVE_FIRST_2026: "La creatividad define la audiencia (Creative-as-Targeting). Meta analiza lo visual, audio y texto para encontrar al comprador.",
    FORMAT_DOMINANCE: "UGC 2.0 (Autenticidad aumentada), Founders Video (Marca personal), Static Ads de Alto Contraste (Scroll-stoppers).",
    ANATOMY_OF_SUCCESS: "Hook (0-3s), Retención (3-15s con problema/solución), CTA (15s+ indicaciones literales).",
    METRICS: "Creative Fatigue, Similarity, Themes, Hook Strength, Retention Curve."
  },
  TIKTOK_ADS: {
    CREATIVE_PRINCIPLES: "Crea para TikTok, no anuncios. Estética nativa (lo-fi/UGC), 9:16 vertical, sonido ON.",
    CONTENT_STRUCTURE: "Gancho (primeros 3-6s), Propuesta de valor clara, CTA fuerte. Subtítulos/superposiciones de texto (5-10 palabras/s).",
    ZONE_SAFETY: "Mantener contenido importante fuera de las zonas de la UI de TikTok.",
    TRENDS: "Uso de hashtags, música tendencia, retos y efectos para relevancia."
  },
};

// ─── Client-side Gemini fallback (used when backend is unreachable) ──────────

const isNetworkOrServerError = (err: unknown): boolean => {
  if (err instanceof TypeError) return true; // Failed to fetch (network down)
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  // Do NOT fallback for auth errors
  if (msg.includes("401") || msg.includes("403")) return false;
  // Do NOT fallback for timeout (504) — retrying client-side won't help, the model is slow
  if (msg.includes("504") || msg.includes("timeout") || msg.includes("Timeout")) return false;
  // Do NOT fallback for payload-too-large (413) — same image will fail again
  if (msg.includes("413") || msg.includes("too large") || msg.includes("demasiado grande")) return false;
  // Only fallback for genuine backend unreachability (502, 503, network errors)
  if (msg.includes("backend error")) return true;
  return false;
};

const imageFallback = async (
  base64Image: string,
  mimeType: string,
  lang: Language,
  context?: { objective?: string; platform?: string; brand?: any },
): Promise<ImageAnalysisResult> => {
  return keyRotationService.fetchWithRetry(async (apiKey: string) => {
    const provider = aiBridge.getSmartProvider('MEDIA_AUDIT', apiKey);
    const objective = context?.objective || "Conversion";
    const platform = context?.platform || "Universal";
    const brand = context?.brand;
    const sanitize = (s: unknown, maxLen = 200): string => String(s ?? "").replace(/["'<>]/g, "").slice(0, maxLen);

    const brandSection = brand ? `
--- PARTE 1: INGESTA DINÁMICA DE REGLAS BASADA EN EL 'BRAND DATA LAKE' ---
ATENCIÓN: Tu fuente de la verdad NO son suposiciones, sino el 'Data Lake de Marca':
- MARCA A DEFENDER: ${sanitize(brand.brandName) || "Extraída de la imagen"}
- PALETA CROMÁTICA EXACTA: ${sanitize(brand.brandColors) || "Extraída de los píxeles"}
- TIPOGRAFÍA: ${sanitize(brand.typography) || "La identificada"}
- TONO DE VOZ EMPÍRICO: ${sanitize(brand.toneOfVoice) || "Tono real analizado"}
- REGLAS DE CUMPLIMIENTO (COMPLIANCE): ${sanitize(brand.complianceRules, 400) || "Restricciones Legales Genéricas"}
- NIVEL DE ADHERENCIA EXIGIDO: ${sanitize(brand.adherenceLevel) || "Estricto / Flexible"}
- PÚBLICO OBJETIVO: ${sanitize(brand.targetAudience) || "General"}
- PROPUESTA DE VALOR: ${sanitize(brand.valueProposition) || "Descubierta en la imagen"}

--- PARTE 2: REGLAS DE ORO DE BRAND COMPLIANCE (KILL SWITCH) ---
1. BLOQUEO DE COMPETIDORES: Si el logo, nombre o escenario NO pertenece a la marca del Data Lake, Compliance = 0, status = 'Rejected'.
2. AUDITORÍA FORENSE DE PÍXELES: Extrae colores y tipografías de la imagen. Estrésalos contra HEX/RGB del Data Lake. Si hay violación cromática y el nivel es 'Estricto', rechaza.
3. CONGRUENCIA OMNICANAL: Compara si la pieza mantiene congruencia narrativa con el ecosistema de la marca.
--- PARTE 1 & 2: CONTEXTO ESTRATÉGICO ---
- Objetivo Principal: ${objective}
- Plataforma de Pauta: ${platform}
- Estructura Exigida: ${context?.brand?.referenceFramework ? sanitize(context.brand.referenceFramework) : "Libre albedrío"}
` : "";

    const prompt = `ACTÚA COMO UN EXPERTO EN GROWTH MARKETING, NEUROMARKETING, DISEÑO PUBLICITARIO DE ÉLITE Y AUDITOR DE COMPLIANCE (Nivel Senior Director).
TU MISIÓN ES AUDITAR ESTA PIEZA CREATIVA (IMAGEN) BAJO UN PROTOCOLO ESTRICTO (Reforge, Avinash Kaushik, Meta/TikTok Best Practices).

${brandSection}
--- PARTE 3: MARCOS TEÓRICOS DE GROWTH Y NEURO-DISEÑO (APLICACIÓN OBLIGATORIA) ---
1. SEE-THINK-DO-CARE (Intención de Kaushik): Define la intención visual. ¿El visual rompe el patrón? ¿Educa? ¿Fuerza el CTR? ¿Fideliza?
2. GROWTH LOOPS (Reforge): ¿La pieza alimenta un ciclo de adquisición (Viral Loop / Habit Loop) o es un callejón sin salida (Dead-end ad)?
3. NEURO-DISEÑO Y BEHAVIORAL SCIENCE:
   - Carga Cognitiva: Penaliza el exceso de texto o ruido visual.
   - Mapas de Saliencia (Hotspots): Identifica zonas '[FOCUS]' (anclajes visuales de conversión) y '[FIX]' (fricción visual).
   - Gestalt (Ley de Proximidad y Figura/Fondo): Evalúa jerarquía y priorización de la oferta.
4. NATIVE BEST PRACTICES: ¿Respeta las Safe-Zones mecánicas (Meta/TikTok)? ¿Pasa la prueba de los 1.5 a 3 segundos de reconocimiento de marca?

--- PARTE 4: ESTRUCTURA DE SALIDA REQUERIDA (JSON FORMAT) ---
Tu respuesta DEBE ser ÚNICAMENTE un JSON válido (sin markdown, sin backticks):
 {
  "detectedPlatform": "Meta / Google / TikTok / LinkedIn / Pinterest / X / DV360",
  "bestPlatformMatch": "La plataforma ideal según el diseño",
  "designFormat": "Square / Portrait / Landscape / Story",
  "overallRating": "X/10",
  "thinkingProcess": "Razonamiento estratégico previo sobre la pieza, considerando objetivos y audiencia (Chain of Thought).",
  "scores": { "google": 0-100, "meta": 0-100, "tiktok": 0-100, "programmatic": 0-100 },
  "executiveSummary": "Resumen rápido del estado general (1-2 oraciones).",
${brand ? `  "dataLakeAlignment": { "webScrapeCongruence": "0-100", "socialScrapeCongruence": "0-100", "pdfBrandbookAdherence": "0-100" },
  "brandComplianceStatus": { "score": "0-100", "status": "Approved / Flexible / Rejected", "analysis": "string", "violations": ["string"], "recommendations": ["string"] },` : ""}
  "predictiveMetrics": {
    "cognitiveLoad": 0-100, 
    "cognitiveDemand": 0-100, 
    "clarityScore": 0-100,
    "focusScore": 0-100, 
    "engagementScore": 0-100, 
    "recallScore": 0-100,
    "contrastRatio": "X.X:1",
    "contrastScore": 0-100,
    "legibilityScore": 0-100,
    "readabilityGrade": "string (e.g. A, B, C or grade level)",
    "typographyConsistency": 0-100,
    "backgroundComplexity": 0-100,
    "safeZoneScore": 0-100,
    "scanpath": [
      { "x": 0-100, "y": 0-100, "label": "string", "dwellTime": "ms" }
    ]
  },
  "safeZoneCompliance": {
    "score": 0-100,
    "violations": ["string (e.g. 'Text overlaps TikTok interactive sidebar')"],
    "recommendations": ["string"],
    "affectedZones": ["string (matches the zone labels in safe zone templates)"]
  },
  "neuroAndFrameworkDiagnosis": { 
    "funnelStage": "See / Think / Do / Care", 
    "visualHierarchy": "string", 
    "growthImplication": "string",
    "eyeTrackingHypothesis": "string describing the expected gaze movement"
  },
  "hotspots": [{ "type": "[FOCUS] o [FIX]", "element": "string", "impact": "string", "reason": "string" }],
  "analysisPoints": [{ "x": 0-100, "y": 0-100, "relevance": 1-10, "label": "string", "details": "string" }],
  "descriptiveAnalysis": "Análisis descriptivo profundo (2-3 párrafos).",
  "neuroDiagnosis": { 
    "faceBias": "string", 
    "ruleOfThirds": "string", 
    "gestaltLaws": "string",
    "chromaticPsychology": "string analysis of color impact"
  },
  "complianceIssues": ["string"],
  "creativeSuggestions": ["Sugerencia con estructura: [Visual: descripción de cambio] + [Copy: texto sugerido]"],
  "suggestedSegmentation": ["string"],
  "headlines": ["Título persuasivo"],
  "descriptions": ["Texto descriptivo persuasivo"],
  "creativeReferences": [
    { "referenceId": "id-del-framework", "description": "Por qué se aplicó el Copy", "platform": "Red social" }
  ],
  "suggestedCTAs": ["CTA accionable"],
  "psychologicalHooks": ["Hook basado en sesgo cognitivo"],
  "growthVerdict": { "strengths": ["string"], "weaknesses": ["string"], "priorityFix": "string", "conversionUpliftPotential": "+X%" },
  "croAnalysis": {
    "trafficContext": { "source": "string", "deviceMode": "string" },
    "scrollAnalysis": { "criticalDropOffPoint": "string", "dropOffReason": "string", "ctaVisibleBeforeDropOff": true, "highAttentionZones": ["string"] },
    "interactionFriction": [{ "type": "string", "element": "string", "severity": "string", "uxHypothesis": "string" }],
    "conversionRoadmap": { "priorityFix": "string", "secondaryOptimizations": ["string"], "estimatedConversionUplift": "+X%" }
  },
  "extractedBusinessDna": { "brandPersonality": "string", "colorPalette": ["#HEX1"], "typographyStyle": "string" },
  "improvementPrompt": "Prompt en INGLÉS para regenerar la imagen mejorada con IA, incluyendo detalles de iluminación, composición y materiales."
}

--- PARTE 5: NEURO-CREATIVE SCORE (TRIBE-INSPIRED METHODOLOGY) ---
Segmenta tu análisis neuro-cognitivo en 4 ROIs (Regions of Interest cognitivas). Para cada ROI genera: score 0-100, nivel de confianza, elementos dominantes y recomendación accionable.

ROI 1 — ATENCIÓN VISUAL (peso 30%):
  Evalúa: movimiento inducido, contraste luminoso, presencia de caras/ojos, saturación de color, posición jerarquizada. ¿Capta y mantiene la mirada en los primeros 3 segundos?

ROI 2 — CARGA EMOCIONAL (peso 25%):
  Evalúa: valencia emocional (positiva/negativa/neutral), intensidad del estímulo afectivo, resonancia con el público objetivo.
  Ref: appraisal theory (Lazarus), valence-arousal circumplex model.

ROI 3 — GATILLOS DE DECISIÓN (peso 25%):
  Evalúa: presencia y claridad del CTA, urgencia percibida, prueba social visible, escasez, autoridad de marca.
  Ref: Cialdini's 6 principles of influence.

ROI 4 — CARGA COGNITIVA (peso 20%, INVERTIDA: 100 = carga mínima = óptimo):
  Evalúa: densidad de información, legibilidad tipográfica, complejidad visual, número de elementos simultáneos.
  Penaliza: >3 familias tipográficas, >5 elementos en primer plano, texto <16px equivalente.

COMPOSITE NCS = (attentionROI.score × 0.30) + (emotionROI.score × 0.25) + (decisionROI.score × 0.25) + (cognitiveLoadROI.score × 0.20)
TIER: elite ≥80 | strong 60-79 | average 40-59 | weak <40
BENCHMARK DELTA: compara vs. benchmark de la industria para el objetivo '${objective}' en '${platform}'. El delta puede ser negativo.

Añade el objeto "neuroCreativeScore" al JSON de salida con esta estructura exacta:
  "neuroCreativeScore": {
    "composite": 0-100,
    "tier": "elite | strong | average | weak",
    "benchmarkDelta": número entre -100 y +100,
    "predictedRecall": 0-100,
    "predictedEngagementLift": "+X% o -X%",
    "executiveInsight": "1-2 oraciones para el reporte CxO",
    "overallRecommendation": "Recomendación estratégica global de alto impacto para mejorar el ROI",
    "attentionROI":    { "score": 0-100, "confidence": "high|medium|low", "dominantElements": ["string"], "recommendation": "string" },
    "emotionROI":      { "score": 0-100, "confidence": "high|medium|low", "dominantElements": ["string"], "recommendation": "string" },
    "decisionROI":     { "score": 0-100, "confidence": "high|medium|low", "dominantElements": ["string"], "recommendation": "string" },
    "cognitiveLoadROI":{ "score": 0-100, "confidence": "high|medium|low", "dominantElements": ["string"], "recommendation": "string" }
  }

IDIOMA REQUERIDO: ${lang === "es" ? "ESPAÑOL" : "ENGLISH"} - ES MANDATORIO RESPONDER TODO EL CONTENIDO EN ESTE IDIOMA.`;

    const response = await provider.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Image.replace(/^data:.*?;base64,/, "") } },
            { text: prompt },
          ],
        },
      ],
      config: { responseMimeType: "application/json", temperature: 0.2 },
    });

    const text = response.text ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    try {
      return { ...JSON.parse(jsonMatch ? jsonMatch[0] : text), language: lang } as ImageAnalysisResult;
    } catch {
      throw new Error("Client-side image audit: failed to parse Gemini response");
    }
  });
};

const videoFallback = async (
  frames: string[],
  lang: Language,
  context?: { objective?: string; platform?: string; brand?: any },
): Promise<VideoAnalysisResult> => {
  return keyRotationService.fetchWithRetry(async (apiKey: string) => {
    const provider = aiBridge.getSmartProvider('MEDIA_AUDIT', apiKey);
    const objective = context?.objective || "Conversion";
    const platform = context?.platform || "Universal";
    const brand = context?.brand;
    const sanitize = (s: unknown, maxLen = 200): string => String(s ?? "").replace(/["'<>]/g, "").slice(0, maxLen);
    const topFrames = frames.slice(0, 5);
    const frameParts = topFrames.map((f) => ({
      inlineData: { mimeType: "image/jpeg", data: f.replace(/^data:.*?;base64,/, "") },
    }));

    const brandSection = brand ? `
--- PARTE 1: INGESTA DINÁMICA DE REGLAS BASADA EN EL 'BRAND DATA LAKE' ---
ATENCIÓN: Tu fuente de la verdad NO son suposiciones, sino el 'Data Lake de Marca':
- MARCA A DEFENDER: ${sanitize(brand.brandName) || "Extraída del video"}
- PALETA CROMÁTICA EXACTA: ${sanitize(brand.brandColors) || "Extraída de los fotogramas"}
- TIPOGRAFÍA: ${sanitize(brand.typography) || "La identificada"}
- TONO DE VOZ EMPÍRICO: ${sanitize(brand.toneOfVoice) || "Tono real analizado"}
- REGLAS DE CUMPLIMIENTO (COMPLIANCE): ${sanitize(brand.complianceRules, 400) || "Restricciones Legales Genéricas"}
- NIVEL DE ADHERENCIA EXIGIDO: ${sanitize(brand.adherenceLevel) || "Estricto / Flexible"}
- PÚBLICO OBJETIVO: ${sanitize(brand.targetAudience) || "General"}
- PROPUESTA DE VALOR: ${sanitize(brand.valueProposition) || "Descubierta en el video"}

--- PARTE 2: REGLAS DE ORO DE BRAND COMPLIANCE (KILL SWITCH) ---
1. BLOQUEO DE COMPETIDORES: Si el logo, nombre o escenario NO pertenece a la marca del Data Lake, Compliance = 0, status = 'Rejected'.
2. AUDITORÍA FORENSE DE PÍXELES: Extrae colores y tipografías de los fotogramas. Estrésalos contra HEX/RGB del Data Lake. Si hay violación cromática y el nivel es 'Estricto', rechaza.
3. CONGRUENCIA OMNICANAL: Compara si la pieza mantiene congruencia narrativa con el ecosistema de la marca.
` : `--- CONTEXTO ESTRATÉGICO ---
- Objetivo Principal: ${objective}
- Plataforma de Pauta: ${platform}
`;

    const prompt = `ACTÚA COMO UN EXPERTO EN GROWTH MARKETING, NEUROMARKETING, PRODUCCIÓN DE VIDEO PUBLICITARIO DE ÉLITE Y AUDITOR DE COMPLIANCE (Nivel Senior Director).
TU MISIÓN ES AUDITAR ESTE VIDEO PUBLICITARIO BAJO UN PROTOCOLO ESTRICTO (Reforge, Avinash Kaushik, Google ABCD, Meta Creative-First, TikTok Native Best Practices).

${brandSection}
--- PARTE 3: PROTOCOLOS OFICIALES DE LA INDUSTRIA ---
GOOGLE ADS (ABCD Framework): ${INDUSTRY_PROTOCOLS.GOOGLE_ADS.ABCD_FRAMEWORK}
- Requisitos de video: ${INDUSTRY_PROTOCOLS.GOOGLE_ADS.VIDEO_REQUIREMENTS}
META ADS (Creative-First 2026): ${INDUSTRY_PROTOCOLS.META_ADS.CREATIVE_FIRST_2026}
- Anatomía del éxito: ${INDUSTRY_PROTOCOLS.META_ADS.ANATOMY_OF_SUCCESS}
- Métricas clave: ${INDUSTRY_PROTOCOLS.META_ADS.METRICS}
TIKTOK ADS: ${INDUSTRY_PROTOCOLS.TIKTOK_ADS.CREATIVE_PRINCIPLES}
- Estructura: ${INDUSTRY_PROTOCOLS.TIKTOK_ADS.CONTENT_STRUCTURE}
- Safe Zones: ${INDUSTRY_PROTOCOLS.TIKTOK_ADS.ZONE_SAFETY}

--- PARTE 4: MARCOS TEÓRICOS DE GROWTH Y NEURO-DISEÑO (APLICACIÓN OBLIGATORIA) ---
1. SEE-THINK-DO-CARE (Intención de Kaushik): Define la intención del video. ¿El hook rompe el patrón en 0-3s? ¿La narrativa educa (Think)? ¿Fuerza el CTA (Do)? ¿Fideliza (Care)?
2. GROWTH LOOPS (Reforge): ¿El video alimenta un ciclo de adquisición (Viral Loop / Habit Loop / UGC Loop) o es un callejón sin salida (Dead-end ad)?
3. NEURO-DISEÑO Y BEHAVIORAL SCIENCE:
   - Carga Cognitiva: Penaliza el exceso de texto superpuesto, transiciones rápidas sin propósito, ruido visual.
   - Mapas de Saliencia (Hotspots): Identifica zonas '[FOCUS]' (anclajes visuales de conversión) y '[FIX]' (fricción visual) EN CADA FOTOGRAMA.
   - Gestalt (Ley de Proximidad y Figura/Fondo): Evalúa jerarquía visual y priorización de la oferta en cada escena.
   - Curva de Retención Predictiva: Simula segundo a segundo la caída de atención basada en patrones de la industria.
4. NATIVE BEST PRACTICES: ¿Respeta las Safe-Zones mecánicas de cada plataforma? ¿Pasa la prueba del hook en 1.5-3 segundos? ¿Logo visible en primeros 5s (Google ABCD)?

--- PARTE 5: ESTRUCTURA DE SALIDA REQUERIDA (JSON FORMAT) ---
Tu respuesta DEBE ser ÚNICAMENTE un JSON válido (sin markdown, sin backticks):
{
  "platform": "Meta / Google / TikTok / YouTube / LinkedIn",
  "overallRating": "X/10",
  "thinkingProcess": "Razonamiento estratégico previo sobre el video, considerando el arco narrativo y el impacto del audio (Chain of Thought).",
  "hookStrength": 0-100,
  "retentionScore": 0-100,
  "visualQualityScore": 0-100,
  "narrativeCritique": "Crítica narrativa profunda: estructura, ritmo, storytelling, emotional arc",
  "audioAnalysis": "Análisis de audio: voz, música, sincronización, impacto emocional",
  "conversionTriggers": ["string"],
  "suggestedEdits": ["Mejora con estructura: [Escena: timestamp] + [Visual: cambio] + [Audio: ajuste]"],
  "suggestedSegmentation": ["string"],
  "suggestedCTAs": ["string"],
  "complianceIssues": ["string"],
  "scores": { "google": 0-100, "meta": 0-100, "tiktok": 0-100 },
  "executiveSummary": "Resumen ejecutivo del estado general (2-3 oraciones con veredicto claro).",
${brand ? `  "dataLakeAlignment": { "webScrapeCongruence": "0-100", "socialScrapeCongruence": "0-100", "pdfBrandbookAdherence": "0-100" },
  "brandComplianceStatus": { "score": "0-100", "status": "Approved / Flexible / Rejected", "analysis": "string", "violations": ["string"], "recommendations": ["string"] },` : ""}
  "predictiveMetrics": {
    "avgCognitiveLoad": 0-100,
    "avgCognitiveDemand": 0-100,
    "clarityScore": 0-100,
    "overallFocusScore": 0-100,
    "contrastRatio": "X.X:1",
    "contrastScore": 0-100,
    "legibilityScore": 0-100,
    "readabilityGrade": "string",
    "typographyConsistency": 0-100,
    "backgroundComplexity": 0-100,
    "safeZoneScore": 0-100,
    "peakAttentionTimestamp": "0:XX",
    "overallRecallPotential": 0-100,
    "scanpath": [
      { "x": 0-100, "y": 0-100, "label": "string", "dwellTime": "ms" }
    ]
  },
  "safeZoneCompliance": {
    "score": 0-100,
    "violations": ["string (e.g. 'Subtitles cut off by TikTok bottom menu at 0:05')"],
    "recommendations": ["string"],
    "affectedZones": ["string"]
  },
  "neuroAndFrameworkDiagnosis": { 
    "funnelStage": "See / Think / Do / Care", 
    "hookAnalysis": "string", 
    "narrativeArc": "string", 
    "growthImplication": "string",
    "eyeTrackingHypothesis": "string describing typical gaze flow for this video style"
  },
  "retentionCurve": [
    { "second": 0, "retention": 100, "engagementScore": 0, "clicks": 0, "conversions": 0, "abandonRate": 0, "intentLabel": "Hook Start" }
  ],
  "keyframes": [
    {
      "timestamp": "0:XX",
      "description": "Descripción detallada",
      "communicationAnalysis": "Análisis visual"
    }
  ],
  "hotspots": [{ "type": "[FOCUS] o [FIX]", "element": "string", "timestamp": "0:XX", "impact": "string", "reason": "string" }],
  "neuroDiagnosis": { 
    "hookEffectiveness": "string", 
    "paceAndRhythm": "string", 
    "emotionalArc": "string", 
    "gestaltLaws": "string",
    "chromaticPsychology": "string"
  },
  "descriptiveAnalysis": "Análisis profundo (2-3 párrafos).",
  "growthVerdict": { "strengths": ["string"], "weaknesses": ["string"], "priorityFix": "string", "conversionUpliftPotential": "+X%" },
  "psychologicalHooks": ["Hook con estructura: [Sesgo: nombre] + [Aplicación: cómo usarlo]"],
  "headlines": ["Título con estructura: [Gancho: texto] + [Beneficio: texto]"],
  "extractedBusinessDna": { "brandPersonality": "string", "colorPalette": ["#HEX"], "typographyStyle": "string", "videoStyle": "string" }
}

REGLAS CRÍTICAS:
- La retentionCurve DEBE tener al menos 10 puntos de datos, simulando la retención segundo a segundo.
- El peakAttentionTimestamp DEBE indicar el momento exacto de máxima atención basado en los fotogramas.
- Genera al MENOS 3 keyframes con analysisPoints detallados (coordenadas x,y reales de puntos de interés).
- Los hotspots DEBEN incluir timestamp para ubicarlos en la línea de tiempo.
- El narrativeCritique debe evaluar: gancho inicial, arco narrativo, ritmo de edición, cierre/CTA.
- El audioAnalysis debe cubrir: calidad de voz, selección musical, sincronización audio-visual.
- Los psychologicalHooks deben identificar sesgos cognitivos explotados (urgencia, prueba social, FOMO, etc.).

--- PARTE 6: NEURO-CREATIVE SCORE (TRIBE-INSPIRED METHODOLOGY) ---
Segmenta tu análisis neuro-cognitivo en 4 ROIs evaluando los fotogramas como un todo narrativo:

ROI 1 — ATENCIÓN VISUAL (peso 30%):
  Evalúa: cambios de ritmo visual, contraste entre escenas, presencia de caras mirando a cámara, color dominante, movimiento cinético. ¿El hook retiene la mirada en 0-3s?

ROI 2 — CARGA EMOCIONAL (peso 25%):
  Evalúa: arco emocional completo del video, valencia emocional por segmento, pico de intensidad. Correlaciona con el punto de máxima retención en la retentionCurve.

ROI 3 — GATILLOS DE DECISIÓN (peso 25%):
  Evalúa: timestamp exacto del momento de conversión (CTA), prueba social narrativa, urgencia dramática, autoridad de marca en pantalla.

ROI 4 — CARGA COGNITIVA (peso 20%, INVERTIDA: 100 = carga mínima = óptimo):
  Evalúa: velocidad de edición (cuts/segundo), superposiciones de texto simultáneas, densidad informativa por escena. Penaliza: >2 cortes/segundo en escenas informativas, >3 elementos de texto simultáneos.

COMPOSITE NCS = (attentionROI.score × 0.30) + (emotionROI.score × 0.25) + (decisionROI.score × 0.25) + (cognitiveLoadROI.score × 0.20)
TIER: elite ≥80 | strong 60-79 | average 40-59 | weak <40

Añade el objeto "neuroCreativeScore" al JSON de salida con esta estructura exacta:
  "neuroCreativeScore": {
    "composite": 0-100,
    "tier": "elite | strong | average | weak",
    "benchmarkDelta": número entre -100 y +100,
    "predictedRecall": 0-100,
    "predictedEngagementLift": "+X% o -X%",
    "executiveInsight": "1-2 oraciones para el reporte CxO",
    "overallRecommendation": "Recomendación estratégica global de alto impacto para mejorar el ROI",
    "attentionROI":    { "score": 0-100, "confidence": "high|medium|low", "dominantElements": ["string"], "recommendation": "string" },
    "emotionROI":      { "score": 0-100, "confidence": "high|medium|low", "dominantElements": ["string"], "recommendation": "string" },
    "decisionROI":     { "score": 0-100, "confidence": "high|medium|low", "dominantElements": ["string"], "recommendation": "string" },
    "cognitiveLoadROI":{ "score": 0-100, "confidence": "high|medium|low", "dominantElements": ["string"], "recommendation": "string" }
  }

IDIOMA REQUERIDO: ${lang === "es" ? "ESPAÑOL" : "ENGLISH"} - ES MANDATORIO RESPONDER TODO EL CONTENIDO EN ESTE IDIOMA.`;

    const response = await provider.generateContent({
      contents: [
        {
          role: "user",
          parts: [...frameParts, { text: prompt }],
        },
      ],
      config: { responseMimeType: "application/json", temperature: 0.2 },
    });

    const text = response.text ?? "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    try {
      return { ...JSON.parse(jsonMatch ? jsonMatch[0] : text), language: lang } as VideoAnalysisResult;
    } catch {
      throw new Error("Client-side video audit: failed to parse Gemini response");
    }
  });
};

// ─── Backend endpoint for server-side Vertex AI analysis ─────────────────────
const getMediaAnalysisUrl = (): string => {
  // Use the API_URL which already handles the /api base
  return `${API_URL}/media-analysis`;
};

const isProduction = import.meta.env.PROD;

export const mediaAnalysisService = {
  auditAdImage: async (
    base64Image: string,
    mimeType: string,
    lang: Language = "es",
    context?: { objective?: string; platform?: string; brand?: any },
  ): Promise<ImageAnalysisResult> => {
    // Step 1: Compress and compute cache hash
    const compressedImage = await compressImage(base64Image, 1024, 0.75);
    const maskedContext = context ? maskPII(JSON.stringify(context)) : '{}';
    const hash = await auditCacheService.computeHash(`${compressedImage}-${lang}-${maskedContext}`);
    const cached = await auditCacheService.checkCache(hash);
    if (cached) {
      logger.info(`[MediaService] Cache hit! Skipping AI call for Image.`);
      return cached as ImageAnalysisResult;
    }

    // Step 2: Fetch additional context — learned rules injected server-side
    // We still try local first for dev; backend picks it up from DB directly
    logger.info(`[MediaService] Sending image to backend (Vertex AI) for audit...`);

    let result: ImageAnalysisResult;
    try {
      // Step 2: Read userId from session (defensive check)
      const session = localStorage.getItem('insitu_active_session');
      let userId = '';
      if (session) {
        try {
          const parsed = JSON.parse(session);
          userId = parsed.id || parsed.user?.id || '';
        } catch (e) {
          logger.error('[MediaService] Error parsing session:', e);
        }
      }

      const response = await fetch(getMediaAnalysisUrl(), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(userId ? { 'X-User-Id': userId } : {})
        },
        body: JSON.stringify({
          mediaType: 'image',
          base64Data: compressedImage,
          mimeType: 'image/jpeg',
          lang,
          context,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Media analysis backend error (${response.status}): ${errorText}`);
      }

      result = { ...(await response.json()), language: lang } as ImageAnalysisResult;
    } catch (err) {
      if (isNetworkOrServerError(err) && !isProduction) {
        logger.warn(`[MediaService] Backend unreachable, using client-side Gemini fallback (dev mode)`);
        result = await imageFallback(compressedImage, mimeType, lang, context);
      } else {
        logger.error(`[MediaService] Audit failed:`, err);
        throw err;
      }
    }

    await auditCacheService.saveCache(hash, result);
    keyRotationService.trackTokens(result, "Image Audit (Neuro-Visual via Vertex)", undefined, 'IMAGE_AUDIT');

    return result;
  },

  auditAdVideo: async (
    base64Video: string,
    mimeType: string,
    lang: Language = "es",
    frames?: string[],
    context?: { objective?: string; platform?: string; brand?: any },
  ): Promise<VideoAnalysisResult> => {
    // Step 1: Compute cache hash
    const videoHashStr = `${base64Video.substring(0, 1000)}-${frames?.length || 0}-${lang}-${JSON.stringify(context || {})}`;
    const hash = await auditCacheService.computeHash(videoHashStr);
    const cached = await auditCacheService.checkCache(hash);
    if (cached) {
      logger.info(`[MediaService] Cache hit! Skipping AI call for Video.`);
      return cached as VideoAnalysisResult;
    }

    logger.info(`[MediaService] Sending video to backend (Vertex AI) for audit. Size: ${Math.round(base64Video.length / 1024)} KB. Frames: ${frames?.length || 0}`);

    let result: VideoAnalysisResult;
    try {
      // Step 2: Read userId from session
      const session = localStorage.getItem('insitu_active_session');
      let userId = '';
      if (session) {
        try {
          const parsed = JSON.parse(session);
          userId = parsed.id || parsed.user?.id || '';
        } catch (e) {
          logger.error('[MediaService] Error parsing session:', e);
        }
      }

      const response = await fetch(getMediaAnalysisUrl(), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(userId ? { 'X-User-Id': userId } : {})
        },
        body: JSON.stringify({
          mediaType: 'video',
          base64Data: base64Video,
          mimeType,
          lang,
          frames,
          context,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Media analysis backend error (${response.status}): ${errorText}`);
      }

      result = { ...(await response.json()), language: lang } as VideoAnalysisResult;
    } catch (err) {
      if (isNetworkOrServerError(err) && frames && frames.length > 0 && !isProduction) {
        logger.warn(`[MediaService] Backend unreachable, using client-side Gemini fallback (dev mode)`);
        result = await videoFallback(frames, lang, context);
      } else {
        logger.error(`[MediaService] Video audit failed:`, err);
        throw err;
      }
    }

    await auditCacheService.saveCache(hash, result);
    keyRotationService.trackTokens(result, "Video Audit (Advanced via Vertex)", undefined, 'VIDEO_AUDIT');

    return result;
  },
};
