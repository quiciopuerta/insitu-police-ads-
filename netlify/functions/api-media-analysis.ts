import { Handler } from '@netlify/functions';
import { runQuery } from './_lib/db';
import { getGeminiKey, callGeminiApi } from './_lib/gemini';

const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
};

// ─── Prompt Rules Helper ──────────────────────────────────────────────────────
async function getLearnedRules(feature: string): Promise<string> {
    const rules = await runQuery(async (sql) => {
        return await sql`
            SELECT rule_type, content FROM ai_prompt_rules 
            WHERE is_active = TRUE AND (feature = ${feature} OR feature = 'global')
            ORDER BY created_at DESC
        `;
    });
    if (!rules || rules.length === 0) return "";
    const formatted = rules
        .map((r: any) => `- [${r.rule_type.toUpperCase()}] ${r.content}`)
        .join('\n');
    return `\n📝 REGLAS APRENDIDAS (CRÍTICO - FEEDBACK DE USUARIOS REALES):\n${formatted}\n`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export const handler: Handler = async (event) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers };
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed", headers };

    try {
        // Log headers for debugging in production (X-User-Id check)
        const allHeaders = event.headers;
        const userId = allHeaders["x-user-id"] || allHeaders["X-User-Id"] || 
                       allHeaders["authorization"]?.replace('Bearer ', '') || "";
        
        console.log(`[MediaAnalysis] Headers received:`, JSON.stringify(Object.keys(allHeaders)));
        console.log(`[MediaAnalysis] Auth attempt for User ID: "${userId}"`);

        if (!userId) {
            console.error("[MediaAnalysis] Error: Missing user ID in headers");
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized: Missing X-User-Id header" }) };
        }

        const userExists = await runQuery(async (sql) => {
            const rows = await sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1`;
            return rows && rows.length > 0;
        });
        
        if (userExists === false) {
            console.error(`[MediaAnalysis] Error: User "${userId}" not found in database`);
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized: User not found" }) };
        }
        if (userExists === null) {
            console.warn(`[MediaAnalysis] Warning: Database unavailable, bypassing strict user verification for "${userId}"`);
        }

        let rawBody = event.body || "{}";
        if (event.isBase64Encoded) {
            rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
        }

        const bodySize = Buffer.byteLength(rawBody, 'utf8');
        if (bodySize > 50 * 1024 * 1024) {
            return { statusCode: 413, headers, body: JSON.stringify({ error: 'Payload too large (max 50MB)' }) };
        }

        const body = JSON.parse(rawBody);
        const { mediaType, base64Data, mimeType, lang, frames, context: auditContext } = body;

        // Guard: base64 payload > 2.7MB (~2MB decoded) — reject early to avoid silent timeout
        if (!base64Data || typeof base64Data !== 'string') {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "base64Data inválido o ausente" }) };
        }
        const b64SizeBytes = Buffer.byteLength(base64Data, 'utf8');
        if (b64SizeBytes > 2_700_000) {
            return { statusCode: 413, headers, body: JSON.stringify({
                error: `Imagen demasiado grande (${(b64SizeBytes / 1_000_000).toFixed(1)} MB en base64). Máximo permitido: ~2 MB. Comprime o redimensiona la imagen antes de enviarla.`,
                code: "PAYLOAD_TOO_LARGE"
            })};
        }

        if (!mediaType || !base64Data) {
            return { statusCode: 400, body: JSON.stringify({ error: "Missing mediaType or base64Data" }), headers };
        }

        // Sanitize user-supplied strings before prompt interpolation (prevent prompt injection)
        const sanitize = (s: unknown, maxLen = 200): string =>
            String(s ?? "").replace(/[`"'<>]/g, '').slice(0, maxLen);

        const featureName = mediaType === 'video' ? 'VideoAnalysis' : 'ImageAnalysis';
        const rules = await getLearnedRules(featureName);
        
        const { key: apiKey } = getGeminiKey();

        let promptTemplate = "";
        if (mediaType === 'video') {
            promptTemplate = `
                ACTÚA COMO UN EXPERTO EN GROWTH MARKETING, NEUROMARKETING, DISEÑO PUBLICITARIO DE ÉLITE Y AUDITOR DE COMPLIANCE (Nivel Senior Director).
                TU MISIÓN ES AUDITAR ESTA PIEZA CREATIVA (VIDEO) BAJO UN PROTOCOLO ESTRICTO QUE COMBINA RIGOR DE MARCA CON LOS MEJORES MARCOS DE TRABAJO DE LA INDUSTRIA (Reforge, Avinash Kaushik, Meta/TikTok Best Practices).

${auditContext?.brand ? `                ---
                PARTE 1: INGESTA DINÁMICA DE REGLAS BASADA EN EL 'BRAND DATA LAKE'
                ATENCIÓN: Para realizar esta auditoría, tu fuente de la verdad NO son suposiciones, sino el 'Data Lake de Marca'. Basado en este cruce de datos, construye el siguiente CONTEXTO ESTRATÉGICO dinámico antes de evaluar:
                - MARCA A DEFENDER: ${sanitize(auditContext.brand.brandName) || "Extraída del video"}
                - PALETA CROMÁTICA EXACTA: ${sanitize(auditContext.brand.brandColors) || "Extraída de los píxeles si no se provee"}
                - TIPOGRAFÍA: ${sanitize(auditContext.brand.typography) || "La identificada"}
                - TONO DE VOZ EMPÍRICO: ${sanitize(auditContext.brand.toneOfVoice) || "Tono real analizado"}
                - REGLAS DE CUMPLIMIENTO (COMPLIANCE): ${sanitize(auditContext.brand.complianceRules, 400) || "Restricciones Legales Genéricas"}
                - NIVEL DE ADHERENCIA EXIGIDO: ${sanitize(auditContext.brand.adherenceLevel) || "Estricto / Flexible"}
                - PÚBLICO OBJETIVO: ${sanitize(auditContext.brand.targetAudience) || "General"}
                - PROPUESTA DE VALOR: ${sanitize(auditContext.brand.valueProposition) || "Descubierta en el video"}
                - PLATAFORMA DE PAUTA: ${sanitize(auditContext?.platform) || "Vertical (TikTok/Reels/Shorts)"}

                ---
                PARTE 2: REGLAS DE ORO DE BRAND COMPLIANCE (MEJORAS DEL 'KILL SWITCH')
                ¡ADVERTENCIA CRÍTICA! Eres el guardián absoluto de la marca basándote en el Data Lake. Las mejoras recientes a tu sistema de auditoría exigen CERO margen de error:
                1. BLOQUEO DE COMPETIDORES Y TERCEROS: Si el logo, nombre, empaque o escenario en la creatividad NO pertenece explícitamente a la marca dueña del Data Lake, tu evaluación debe ser FULMINANTE. El puntaje de Compliance será 0, el estatus será 'Rejected'. NUNCA apruebes piezas ajenas o plantillas genéricas no adaptadas.
                2. AUDITORÍA FORENSE DE PÍXELES VS DATA LAKE: Extrae la paleta de colores y tipografías directamente de los keyframes del video. Estrésalos matemáticamente contra los HEX/RGB en el Data Lake. Si hay una violación cromática (ej. un rojo distinto al oficial) y el nivel es 'Estricto', rechaza y lista las violaciones precisas.
                3. CONGRUENCIA OMNICANAL (Mejora de Identidad): Compara si esta pieza de video desentona radicalmente o mantiene congruencia narrativa con el ecosistema actual extraído.`
                  : `                ---
                PARTE 1 & 2: CONTEXTO ESTRATÉGICO
                - Objetivo Principal: ${auditContext?.objective || "Conversión"}
                - Plataforma de Pauta: ${auditContext?.platform || "Vertical (TikTok/Reels/Shorts)"}`}

                ---
                PARTE 3: MARCOS TEÓRICOS DE GROWTH Y NEURO-DISEÑO (APLICACIÓN OBLIGATORIA)
                Aplica rigurosamente estos frameworks sobre los visuales aprobados:
                1. SEE-THINK-DO-CARE (Intención de Kaushik): Define la intención del video. ¿El visual rompe el patrón? ¿Educa? ¿Fuerza el CTR? ¿Fideliza?
                2. GROWTH LOOPS (Reforge): ¿El video alimenta un ciclo de adquisición (Viral Loop / Habit Loop) o es un callejón sin salida (Dead-end ad)?
                3. NEURO-DISEÑO Y BEHAVIORAL SCIENCE:
                   - PREDICTIVE RETENTION CURVE: Estima la retención y identifica el "Hook Point" y los "Click Hotspots".
                   - Carga Cognitiva (Cognitive Load): Penaliza el exceso de texto, ritmo muy acelerado o ruido audiovisual.
                   - Mapas de Saliencia (Hotspots): Identifica zonas '[FOCUS]' (anclajes visuales) y '[FIX]' (fricción visual) en los fotogramas clave.
                4. NATIVE BEST PRACTICES: ¿Respeta las Safe-Zones mecánicas (Meta/TikTok)? ¿Genera impacto en los primeros 1.5 a 3s?

                ${rules}

                ---
                PARTE 4: ESTRUCTURA DE SALIDA REQUERIDA (JSON FORMAT)
                Tu respuesta DEBE ser ÚNICAMENTE un JSON válido (sin markdown, sin backticks, sin texto adicional) con esta estructura exacta:

                {
                  "overallRating": "X/10",
                  "hookStrength": 0-100,
                  "retentionScore": 0-100,
                  "executiveSummary": "Resumen rápido del estado general del asset y su alineación con el Data Lake (1-2 oraciones).",
${auditContext?.brand ? `                  "dataLakeAlignment": {
                    "webScrapeCongruence": "0-100 (Alineado con el sitio web oficial)",
                    "socialScrapeCongruence": "0-100 (Alineado con el tono de las redes)",
                    "pdfBrandbookAdherence": "0-100 (Precisión respecto al PDF maestro)"
                  },
                  "brandComplianceStatus": {
                    "score": "0-100",
                    "status": "Approved / Flexible / Rejected",
                    "analysis": "Análisis forense de CÓMO los píxeles de este video respetan o violan los lineamientos extraídos del Data Lake.",
                    "violations": ["Infracción 1 (Ej: El rojo de la imagen es #FF0000; oficial es #E50024)", "Infracción 2..."],
                    "recommendations": ["Corrección 1 para alinear", "Corrección 2..."]
                  },` : ""}
                  "neuroAndFrameworkDiagnosis": {
                    "funnelStage": "See / Think / Do / Care",
                    "visualHierarchy": "Dictamen Gestalt de flujo visual en movimiento.",
                    "growthImplication": "Potencial en ciclos de crecimiento."
                  },
                  "hotspots": [
                    { "type": "[FOCUS] o [FIX]", "element": "Ej: Texto CTA en el Hook", "impact": "Qué genera cognitivamente" }
                  ],
                  "predictiveMetrics": {
                    "avgCognitiveLoad": 0-100,
                    "avgCognitiveDemand": 0-100,
                    "clarityScore": 0-100,
                    "overallFocusScore": 0-100,
                    "contrastScore": 0-100,
                    "legibilityScore": 0-100,
                    "safeZoneScore": 0-100,
                    "peakAttentionTimestamp": "0:XX",
                    "overallRecallPotential": 0-100,
                    "scanpath": [
                      { "x": 0-100, "y": 0-100, "label": "string", "dwellTime": "ms" }
                    ]
                  },
                  "safeZoneCompliance": {
                    "score": 0-100,
                    "violations": ["string"],
                    "recommendations": ["string"]
                  },
                  "growthVerdict": {
                     "strengths": ["Fuerza 1"],
                     "weaknesses": ["Fricción 1"],
                     "priorityFix": "Instrucción quirúrgica y corta de mayor impacto para el editor.",
                     "conversionUpliftPotential": "+X%"
                  },
                  "retentionCurve": [
                    { "second": 0, "retention": 100, "engagementScore": 0, "clicks": 0, "conversions": 0, "abandonRate": 0, "intentLabel": "Hook Start" },
                    { "second": 1, "retention": 95, "engagementScore": 85, "clicks": 10, "conversions": 0, "abandonRate": 5, "intentLabel": "Hook Phase" }
                  ],
                  "keyframes": [
                    {
                      "timestamp": "0:XX",
                      "description": "...",
                      "isTopFrame": true,
                      "communicationAnalysis": "...",
                      "analysisPoints": [{ "x": 0, "y": 0, "label": "[FOCUS]", "relevance": 10, "details": "..." }]
                    }
                  ],
                  "descriptiveAnalysis": "Análisis descriptivo profundo (2-3 párrafos).",
                  "narrativeCritique": "...",
                  "visualQualityScore": 0-100,
                  "suggestedEdits": ["Sugerencia 1"],
                  "suggestedSegmentation": ["Audiencia 1"],
                  "complianceIssues": ["Riesgo 1: ..."],
                  "audienceMatchScore": 0-100,
                  "extractedBusinessDna": {
                    "brandPersonality": "...",
                    "colorPalette": ["#HEX1"],
                    "typographyStyle": "..."
                  },
                  "improvementPrompt": "Dirección de arte y guion en INGLES para corregir el video."
                }

                --- PARTE 5: NEURO-CREATIVE SCORE (TRIBE-INSPIRED METHODOLOGY) ---
                Segmenta tu análisis neuro-cognitivo en 4 ROIs evaluando los fotogramas como un todo narrativo:

                ROI 1 — ATENCIÓN VISUAL (peso 30%):
                  Evalúa: cambios de ritmo visual, contraste entre escenas, caras mirando a cámara, movimiento cinético. ¿El hook retiene la mirada en 0-3s?

                ROI 2 — CARGA EMOCIONAL (peso 25%):
                  Evalúa: arco emocional del video, valencia emocional por segmento, pico de intensidad. Correlaciona con el punto de máxima retención en retentionCurve.

                ROI 3 — GATILLOS DE DECISIÓN (peso 25%):
                  Evalúa: timestamp exacto del CTA, prueba social narrativa, urgencia dramática, autoridad de marca en pantalla.

                ROI 4 — CARGA COGNITIVA (peso 20%, INVERTIDA: 100 = carga mínima = óptimo):
                  Penaliza: >2 cortes/segundo en escenas informativas, >3 elementos de texto simultáneos.

                COMPOSITE NCS = (attentionROI.score × 0.30) + (emotionROI.score × 0.25) + (decisionROI.score × 0.25) + (cognitiveLoadROI.score × 0.20)
                TIER: elite ≥80 | strong 60-79 | average 40-59 | weak <40

                Añade el objeto "neuroCreativeScore" al JSON de salida:
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

                IDIOMA REQUERIDO: ${lang === "es" ? "ESPAÑOL" : "ENGLISH"} - ES MANDATORIO RESPONDER TODO EL CONTENIDO EN ESTE IDIOMA.
            `;
        } else {
            promptTemplate = `
                ACTÚA COMO UN EXPERTO EN GROWTH MARKETING, NEUROMARKETING, DISEÑO PUBLICITARIO DE ÉLITE Y AUDITOR DE COMPLIANCE (Nivel Senior Director).
                TU MISIÓN ES AUDITAR ESTA PIEZA CREATIVA (IMAGEN) BAJO UN PROTOCOLO ESTRICTO QUE COMBINA RIGOR DE MARCA CON LOS MEJORES MARCOS DE TRABAJO DE LA INDUSTRIA (Reforge, Avinash Kaushik, Meta/TikTok Best Practices).

${auditContext?.brand ? `                ---
                PARTE 1: INGESTA DINÁMICA DE REGLAS BASADA EN EL 'BRAND DATA LAKE'
                ATENCIÓN: Para realizar esta auditoría, tu fuente de la verdad NO son suposiciones, sino el 'Data Lake de Marca'. Basado en este cruce de datos, construye el siguiente CONTEXTO ESTRATÉGICO dinámico antes de evaluar:
                - MARCA A DEFENDER: ${auditContext.brand.brandName || "Extraída de la imagen"}
                - PALETA CROMÁTICA EXACTA: ${auditContext.brand.brandColors || "Extraída de los píxeles si no se provee"}
                - TIPOGRAFÍA: ${auditContext.brand.typography || "La identificada"}
                - TONO DE VOZ EMPÍRICO: ${auditContext.brand.toneOfVoice || "Tono real analizado"}
                - REGLAS DE CUMPLIMIENTO (COMPLIANCE): ${auditContext.brand.complianceRules || "Restricciones Legales Genéricas"}
                - NIVEL DE ADHERENCIA EXIGIDO: ${auditContext.brand.adherenceLevel || "Estricto / Flexible"}
                - PÚBLICO OBJETIVO: ${auditContext.brand.targetAudience || "General"}
                - PROPUESTA DE VALOR: ${auditContext.brand.valueProposition || "Descubierta en la imagen"}
                - PLATAFORMA DE PAUTA: ${auditContext?.platform || "Agnóstico"}
                - ESTRUCTURA PUBLICITARIA EXIGIDA: ${auditContext?.referenceFramework ? sanitize(JSON.stringify(auditContext.referenceFramework)) : "Libre albedrío (usa frameworks probados)"}

                ---
                PARTE 2: REGLAS DE ORO DE BRAND COMPLIANCE (MEJORAS DEL 'KILL SWITCH')
                ¡ADVERTENCIA CRÍTICA! Eres el guardián absoluto de la marca basándote en el Data Lake. Las mejoras recientes a tu sistema de auditoría exigen CERO margen de error:
                1. BLOQUEO DE COMPETIDORES Y TERCEROS: Si el logo, nombre, empaque o escenario en la creatividad NO pertenece explícitamente a la marca dueña del Data Lake, tu evaluación debe ser FULMINANTE. El puntaje de Compliance será 0, el estatus será 'Rejected'. NUNCA apruebes piezas ajenas o plantillas genéricas no adaptadas.
                2. AUDITORÍA FORENSE DE PÍXELES VS DATA LAKE: Extrae la paleta de colores y tipografías directamente de los píxeles de la imagen. Estrésalos matemáticamente contra los HEX/RGB en el Data Lake. Si hay una violación cromática (ej. un rojo distinto al oficial) y el nivel es 'Estricto', rechaza y lista las violaciones precisas.
                3. CONGRUENCIA OMNICANAL (Mejora de Identidad): Compara si esta pieza gráfica desentona radicalmente o mantiene congruencia narrativa con el ecosistema actual extraído.`
                  : `                ---
                PARTE 1 & 2: CONTEXTO ESTRATÉGICO
                - Objetivo Principal: ${auditContext?.objective || "Conversión"}
                - Plataforma de Pauta: ${auditContext?.platform || "Agnóstico"}
                - Estructura Exigida: ${auditContext?.referenceFramework ? sanitize(JSON.stringify(auditContext.referenceFramework)) : "Libre albedrío"}`}

                ---
                PARTE 3: MARCOS TEÓRICOS DE GROWTH Y NEURO-DISEÑO (APLICACIÓN OBLIGATORIA)
                Aplica rigurosamente estos frameworks sobre los visuales aprobados:
                1. SEE-THINK-DO-CARE (Intención de Kaushik): Define la intención visual. ¿El visual rompe el patrón? ¿Educa? ¿Fuerza el CTR? ¿Fideliza?
                2. GROWTH LOOPS (Reforge): ¿La pieza alimenta un ciclo de adquisición (Viral Loop / Habit Loop) o es un callejón sin salida (Dead-end ad)?
                3. NEURO-DISEÑO Y BEHAVIORAL SCIENCE:
                   - Carga Cognitiva (Cognitive Load): Penaliza el exceso de texto o ruido visual.
                   - Mapas de Saliencia (Hotspots): Identifica zonas '[FOCUS]' (anclajes visuales de conversión) y '[FIX]' (fricción visual).
                   - Gestalt (Ley de Proximidad y Figura/Fondo): Evalúa jerarquía y priorización de la oferta.
                4. NATIVE BEST PRACTICES: ¿Respeta las Safe-Zones mecánicas (Meta/TikTok)? ¿Pasa la prueba de los 1.5 a 3 segundos de reconocimiento de marca?

                ${rules}

                ---
                PARTE 4: ESTRUCTURA DE SALIDA REQUERIDA (JSON FORMAT)
                Tu respuesta DEBE ser ÚNICAMENTE un JSON válido (sin markdown, sin backticks, sin texto adicional) con esta estructura exacta:

                {
                  "detectedPlatform": "Meta / Google / TikTok / LinkedIn / Pinterest / X / DV360",
                  "bestPlatformMatch": "La plataforma ideal según el diseño",
                  "designFormat": "Square / Portrait / Landscape / Story",
                  "overallRating": "X/10",
                  "executiveSummary": "Resumen rápido del estado general del asset y su alineación con el Data Lake (1-2 oraciones).",
${auditContext?.brand ? `                  "dataLakeAlignment": {
                    "webScrapeCongruence": "0-100 (Alineado con el sitio web oficial)",
                    "socialScrapeCongruence": "0-100 (Alineado con el tono de las redes)",
                    "pdfBrandbookAdherence": "0-100 (Precisión respecto al PDF maestro)"
                  },
                  "brandComplianceStatus": {
                    "score": "0-100",
                    "status": "Approved / Flexible / Rejected",
                    "analysis": "Análisis forense de CÓMO los píxeles de esta pieza respetan o violan los lineamientos extraídos del Data Lake.",
                    "violations": ["Infracción 1 (Ej: El rojo de la imagen es #FF0000; oficial es #E50024)", "Infracción 2..."],
                    "recommendations": ["Corrección 1 para alinear", "Corrección 2..."]
                  },` : ""}
                  "predictiveMetrics": {
                    "cognitiveLoad": 0-100,
                    "cognitiveDemand": 0-100,
                    "clarityScore": 0-100,
                    "focusScore": 0-100,
                    "engagementScore": 0-100,
                    "recallScore": 0-100,
                    "contrastScore": 0-100,
                    "legibilityScore": 0-100,
                    "safeZoneScore": 0-100,
                    "scanpath": [
                      { "x": 0-100, "y": 0-100, "label": "string", "dwellTime": "ms" }
                    ]
                  },
                  "safeZoneCompliance": {
                    "score": 0-100,
                    "violations": ["string"],
                    "recommendations": ["string"]
                  },
                  "neuroAndFrameworkDiagnosis": {
                    "funnelStage": "See / Think / Do / Care",
                    "visualHierarchy": "Dictamen Gestalt de flujo visual.",
                    "growthImplication": "Potencial en ciclos de crecimiento."
                  },
                  "hotspots": [
                    { "type": "[FOCUS] o [FIX]", "element": "Ej: Texto CTA", "impact": "Qué genera cognitivamente" }
                  ],
                  "growthVerdict": {
                    "strengths": ["Fuerza 1"],
                    "weaknesses": ["Fricción cognitiva 1"],
                    "priorityFix": "Instrucción quirúrgica y corta de mayor impacto para el diseñador.",
                    "conversionUpliftPotential": "+X%"
                  },
                  "analysisPoints": [
                    { "x": 0-100, "y": 0-100, "relevance": 1-10, "label": "[FOCUS] o [FIX]", "details": "descripción de este punto de calor (Neuro-Mapping)" }
                  ],
                  "elementAttention": [
                    { "element": "Headline Text", "totalAttention": 0-100, "timeSpent": 0-2, "percentageSeen": 0-100 },
                    { "element": "CTA Button", "totalAttention": 0-100, "timeSpent": 0-2, "percentageSeen": 0-100 }
                  ],
                  "scores": { "google": 0-100, "meta": 0-100, "tiktok": 0-100, "linkedin": 0-100, "pinterest": 0-100, "x": 0-100, "programmatic": 0-100 },
                  "complianceIssues": ["Riesgo 1: ..."],
                  "neuroDiagnosis": { "faceBias": "...", "ruleOfThirds": "...", "gestaltLaws": "..." },
                  "visualCritique": "Resumen estratégico profundo integrando Product-Channel Fit, See-Think-Do-Care...",
                  "descriptiveAnalysis": "Análisis descriptivo detallado de 2 a 3 párrafos.",
                  "croAnalysis": {
                    "trafficContext": { "source": "Meta Ads / TikTok Ads", "deviceMode": "Mobile / Desktop" },
                    "scrollAnalysis": { "criticalDropOffPoint": "65%", "dropOffReason": "...", "ctaVisibleBeforeDropOff": true, "highAttentionZones": ["..."] },
                    "interactionFriction": [{ "type": "...", "element": "...", "severity": "CRITICAL", "uxHypothesis": "..." }],
                    "conversionRoadmap": { "priorityFix": "...", "secondaryOptimizations": ["..."], "estimatedConversionUplift": "+X%" }
                  },
                  "headlines": ["Sugerencia título 1"],
                  "descriptions": ["Copywriting principal/cuerpo persuasivo"],
                  "creativeReferences": [
                    { "referenceId": "id-del-framework", "description": "Por qué este marco de éxito se aplica a los copies sugeridos", "platform": "Plataforma Ideal" }
                  ],
                  "suggestedCTAs": ["CTA 1"],
                  "psychologicalHooks": ["Gancho psicológico 1"],
                  "creativeSuggestions": ["Sugerencia específica 1"],
                  "extractedBusinessDna": {
                    "brandPersonality": "...",
                    "colorPalette": ["#HEX1", "#HEX2"],
                    "typographyStyle": "..."
                  },
                  "improvementPrompt": "Highly descriptive prompt in ENGLISH for AI generators (Midjourney/DALL-E) based on this analysis and brand DNA."
                }

                --- PARTE 5: NEURO-CREATIVE SCORE (TRIBE-INSPIRED METHODOLOGY) ---
                Segmenta tu análisis neuro-cognitivo en 4 ROIs cognitivas:

                ROI 1 — ATENCIÓN VISUAL (peso 30%):
                  Evalúa: contraste luminoso, caras/ojos, saturación de color, posición jerarquizada. ¿Capta la mirada en los primeros 3 segundos?

                ROI 2 — CARGA EMOCIONAL (peso 25%):
                  Evalúa: valencia emocional, intensidad afectiva, resonancia con el target.
                  Ref: valence-arousal circumplex model.

                ROI 3 — GATILLOS DE DECISIÓN (peso 25%):
                  Evalúa: claridad del CTA, urgencia percibida, prueba social, escasez, autoridad.
                  Ref: Cialdini's 6 principles of influence.

                ROI 4 — CARGA COGNITIVA (peso 20%, INVERTIDA):
                  Penaliza: >3 familias tipográficas, >5 elementos en primer plano, texto <16px equivalente.

                COMPOSITE NCS = (attentionROI.score × 0.30) + (emotionROI.score × 0.25) + (decisionROI.score × 0.25) + (cognitiveLoadROI.score × 0.20)
                TIER: elite ≥80 | strong 60-79 | average 40-59 | weak <40
                BENCHMARK DELTA: compara vs. benchmark de la industria para el objetivo '${auditContext?.objective || "Conversión"}' en '${auditContext?.platform || "Agnóstico"}'. El delta puede ser negativo.

                Añade el objeto "neuroCreativeScore" al JSON de salida:
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

                IDIOMA REQUERIDO: ${lang === "es" ? "ESPAÑOL" : "ENGLISH"} - ES MANDATORIO RESPONDER TODO EL CONTENIDO EN ESTE IDIOMA.
            `;
        }

        // Strip data URL prefix if present (both frontend and backend may pass full URLs)
        const stripDataUrl = (data: string, isImage = false): string => {
            if (typeof data !== 'string') return data;
            if (data.startsWith('data:')) {
                const idx = data.indexOf('base64,');
                if (idx !== -1) {
                    return data.substring(idx + 7);
                }
                const commaIdx = data.indexOf(',');
                if (commaIdx !== -1) {
                    return data.substring(commaIdx + 1);
                }
            }
            return data;
        };

        const parts: any[] = [
            { text: promptTemplate },
            {
                inlineData: {
                    data: stripDataUrl(base64Data),
                    mimeType: mimeType || (mediaType === 'video' ? "video/mp4" : "image/jpeg")
                }
            }
        ];

        if (mediaType === 'video' && frames && Array.isArray(frames)) {
            frames.forEach(f => {
                if (f && f.length > 0) {
                    parts.push({
                        inlineData: {
                            data: stripDataUrl(f, true),
                            mimeType: "image/jpeg"
                        }
                    });
                }
            });
        }

        // --- REFACTOR: Use centralized callGeminiApi to bypass SDK bugs and ensure correct field mapping ---
        // IMPORTANT: thinkingBudget:0 disables Gemini 2.5 Flash's extended thinking mode.
        // Thinking mode adds 10-20s latency on multimodal requests, causing 24s AbortError timeouts.
        // For structured JSON audits, thinking mode does not improve output quality.
        const aiResponseData = await callGeminiApi({
            model: 'gemini-2.5-flash',
            contents: [{ role: "user", parts }],
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
                maxOutputTokens: 8192,  // Increased: complex audit JSON (with neuroCreativeScore + analysisPoints) can exceed 4096
                thinkingConfig: {
                    thinkingBudget: 0   // Disable thinking: saves 10-20s latency, keeps fast structured JSON output
                }
            }
        });

        const rawText = aiResponseData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let result: any = {};
        try {
            // Try direct parse first (model used responseMimeType: application/json)
            result = JSON.parse(rawText);
        } catch {
            // Fallback: extract first complete JSON object using bracket-counting
            // (regex-based fallback fails on deeply nested objects like neuroCreativeScore)
            let depth = 0, start = -1;
            for (let i = 0; i < rawText.length; i++) {
                if (rawText[i] === '{') {
                    if (depth === 0) start = i;
                    depth++;
                } else if (rawText[i] === '}') {
                    depth--;
                    if (depth === 0 && start !== -1) {
                        try {
                            result = JSON.parse(rawText.slice(start, i + 1));
                            console.warn("[MediaAnalysis] Used bracket-counting JSON extraction fallback");
                        } catch { /* leave as {} */ }
                        break;
                    }
                }
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };

    } catch (error: any) {
        console.error("[MediaAnalysis] Error processing request:", {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
            status: error?.status,
            cause: error?.cause,
            timestamp: new Date().toISOString(),
            payloadType: event.body ? (event.body.includes('"mediaType":"image"') ? 'image' : (event.body.includes('"mediaType":"video"') ? 'video' : 'unknown')) : 'unknown'
        });
        return {
            statusCode: error?.status === 413 ? 413 : (error?.status === 504 ? 504 : 500),
            headers,
            body: JSON.stringify({
                error: error?.message || "Internal Server Error",
                code: "ANALYSIS_FAILED",
                ...(error?.isTimeout ? { hint: "Timeout: la imagen puede ser demasiado grande. Intenta con una imagen más pequeña (< 1 MB)." } : {})
            })
        };
    }
};
