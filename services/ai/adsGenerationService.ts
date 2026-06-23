import { 
  AdGenerationResult, 
  GenAdsParams, 
  Language 
} from "../../types";
import { keyRotationService } from "./keyRotationService";
import { getLearnedRules } from "../feedbackRulesService";
import { aiBridge } from "./AiUniversalBridge";

export const adsGenerationService = {
  generateAdContent: async (
    params: GenAdsParams,
    lang: Language = "es"
  ): Promise<AdGenerationResult> => {
    // We still use fetchWithRetry to benefit from the logging and error handling, 
    // but the bridge will decide which provider to use.
    return keyRotationService.fetchWithRetry(async (apiKey) => {
      const provider = aiBridge.getSmartProvider('ADS_GENERATION', apiKey);
      const generationRules = await getLearnedRules('AdGeneration');

      const brandContext = params.brandContext ? `
        CONTEXTO DE MARCA (DATA LAKE — BRAND DNA):
        - Marca: ${params.brandContext.brandName}
        - Industria: ${params.brandContext.industry || 'No especificada'}
        - Propuesta de Valor: ${params.brandContext.valueProposition}
        - Tono de Voz: ${params.brandContext.toneOfVoice}
        - Público Objetivo: ${params.brandContext.targetAudience}
        - Mensajes Clave: ${params.brandContext.keyMessages?.join(', ') || 'N/A'}
        - Colores de Marca: ${params.brandContext.brandColors || 'N/A'}
        - Tipografía: ${params.brandContext.typography || 'N/A'}
        - Guías Visuales: ${params.brandContext.visualGuidelines || 'N/A'}
        - Reglas de Compliance: ${params.brandContext.complianceRules || 'N/A'}
        - Nivel de Adherencia: ${params.brandContext.adherenceLevel || 'Flexible'}

        REGLA CRÍTICA DE CONSISTENCIA DE MARCA:
        Los creativos (headlines, descriptions, socialCopy, creativePrompts) DEBEN reflejar el Brand DNA:
        1. El tono de voz debe ser consistente con "${params.brandContext.toneOfVoice}".
        2. Los suggestedColors DEBEN priorizar los colores de marca: ${params.brandContext.brandColors || 'libre'}.
        3. La suggestedTypography DEBE respetar: ${params.brandContext.typography || 'libre'}.
        4. El prompt de imagen (insitu) DEBE incluir la paleta de colores y estilo visual de la marca.
        5. Si adherenceLevel es "Strict", NO se permiten desviaciones del brand book.
      ` : "";

      const frameworkInstructions: Record<string, string> = {
        aida: `FRAMEWORK OBLIGATORIO: AIDA
          - ATENCIÓN (hook): Abre con un gancho que interrumpa el scroll — dato sorprendente, pregunta provocadora o imagen mental impactante.
          - INTERÉS (body start): Desarrolla relevancia personal para la audiencia — por qué les importa ahora.
          - DESEO (body middle): Activa la emoción positiva — visualización del beneficio transformado, no características.
          - ACCIÓN (cta): CTA urgente y específico — evita "Más información", usa "Pruébalo hoy", "Únete ahora", etc.
          Aplica esta estructura en socialCopy.hook → socialCopy.body → socialCopy.cta y en headlines/descriptions.`,

        pas: `FRAMEWORK OBLIGATORIO: PAS (Problem → Agitation → Solution)
          - PROBLEMA (hook): Nombra el dolor específico del usuario de forma directa y empática.
          - AGITACIÓN (body): Intensifica el costo emocional/económico de no resolver el problema ahora.
          - SOLUCIÓN (cta): Presenta el producto/servicio como la salida clara y confiable.
          Ideal para conversión y retargeting. Usa lenguaje de "¿Cansado de...? ¿Qué pasaría si...? [Marca] lo resuelve."`,

        bab: `FRAMEWORK OBLIGATORIO: BAB (Before → After → Bridge)
          - BEFORE: Describe la situación actual frustrante del usuario (sin el producto).
          - AFTER: Pinta el estado ideal, transformado, con el producto.
          - BRIDGE: El producto ES el puente. CTA que hace ese salto inevitable y fácil.
          Perfecto para testimoniales, transformaciones y SaaS/apps.`,

        '4ps': `FRAMEWORK OBLIGATORIO: 4Ps (Promise → Picture → Proof → Push)
          - PROMISE: Promesa central, bold y específica en el headline.
          - PICTURE: Imagen mental del resultado — lo más vívida posible en el copy.
          - PROOF: Prueba social, número, dato o guarantee que elimine el riesgo.
          - PUSH: Urgencia real o percibida que justifique actuar hoy.
          Ideal para e-commerce, ofertas y productos con social proof.`,

        auto: `PROTOCOLO ANTIGRAVITY (FRAMEWORK ABCD):
          1. BAJA CARGA COGNITIVA: Títulos y descripciones claros, directos, sin entropía textual.
          2. FRAMEWORK ABCD (Google): Atraer (Hook), Marcar (Brand early), Conectar (Emoción), Dirigir (CTA).
          3. THUMB-STOPPING POWER: Prompts de imagen que rompan el scroll con alto contraste.
          4. TIKTOK NATIVE: Si es TikTok, priorizar estética UGC lo-fi sobre pulido corporativo.
          5. SAFE ZONES: Mensaje principal fuera de zonas de interfaz de plataforma.`,
      };

      const selectedFramework = params.copyFramework || 'auto';
      const frameworkBlock = frameworkInstructions[selectedFramework] || frameworkInstructions['auto'];

      const prompt = `
        ACTÚA COMO UN DIRECTOR CREATIVO SENIOR Y ESTRATEGA DE NEUROMARKETING DE INSITU AI.
        TU OBJETIVO ES GENERAR EL CONTENIDO DE UN ANUNCIO DE ALTO RENDIMIENTO (HIGH-PERFORMANCE AD).

        TÉRMINOS CLAVE: ${params.keywords}
        OBJETIVO: ${params.objective}
        PLATAFORMA: ${params.platform}
        AUDIENCIA: ${params.audience}
        ${brandContext}
        ${params.url ? `URL DE REFERENCIA: ${params.url}` : ""}
        ${params.tone ? `TONO ESPECÍFICO: ${params.tone}` : ""}
        ${params.customInstructions ? `INSTRUCCIONES ADICIONALES: ${params.customInstructions}` : ""}
        ${params.videoPrompt ? `PROMPT DE VIDEO DE REFERENCIA (Instant Ads): ${params.videoPrompt}` : ""}
        ${params.ttsScript ? `GUIÓN DE VOZ (Instant Ads): ${params.ttsScript}` : ""}
        ${params.suggestedVoice ? `VOZ SUGERIDA (Instant Ads): ${params.suggestedVoice}` : ""}

        ---
        REGLA DE DIRECCIÓN DE ARTE Y MODIFICACIÓN:
        1. Si se proporciona una ESTRUCTURA DE REFERENCIA (Framework), úsala como base estructural y estratégica.
        2. Si el usuario proporciona INSTRUCCIONES ADICIONALES de prompt, estas tienen PRECEDENCIA sobre el estilo visual del framework.
        3. Debes 'mezclar' (blend) el framework con las instrucciones del usuario, asegurando que la dirección de arte solicitada se respete pero se adapte a la anatomía del anuncio seleccionado.

        ---
        ${frameworkBlock}
        ${generationRules}

        ---
        FORMATO DE SALIDA (JSON):
        Debes responder estrictamente en formato JSON con la siguiente estructura:

        {
          "type": "${params.platform}",
          "headlines": ["Lista de 15 títulos (máx 30 caracteres cada uno). REGLA CRÍTICA: SOLO el texto, SIN números, SIN 'Headline:', SIN prefijos."],
          "descriptions": ["Lista de 4 descripciones (máx 90 caracteres cada una). REGLA CRÍTICA: SOLO el texto, SIN etiquetas."],
          "socialCopy": {
            "hook": "Gancho inicial impactante (SOLO el texto, SIN la palabra 'Hook' o 'Gancho')",
            "body": "Cuerpo persuasivo (SOLO el texto)",
            "cta": "Llamado a la acción (SOLO el texto, SIN 'CTA:')"
          },
          "creativePrompts": {
            "visualStyle": "Dirección de arte visual premium (ej: Fotografía Editorial de Alta Gama, CGI 3D Ultra-realista, Soft Minimalism Moderno)",
            "insitu": "PROMPT MAESTRO DE IMAGEN PARA ADS (Obligatorio en INGLÉS y >40 palabras). Específica tipo de toma (ej: medium shot, eye-level), iluminación publicitaria (ej: high-end studio lighting, soft box, cinematic rim light), paleta de colores y textura. Obligatorio incluir: 'empty negative space for text layout', 'high-end commercial photography', 'no text', 'no typography', '8k resolution', 'hyper-photorealistic'. NUNCA integres palabras habladas ni texto real en la imagen.",
            "neuroLogic": "Justificación de percepción visual y neuromarketing: por qué esta imagen detendrá el scroll (thumb-stopping) y facilitará la lectura."
          },
          "neuroQualityScore": 0-100,
          "platformBestPractices": ["Regla 1", "Regla 2"],
          "suggestedColors": ["#HEX1", "#HEX2"],
          "suggestedTypography": "Nombre de la fuente sugerida"
        }

        IDIOMA: ${lang === "es" ? "Español" : "English"}.
      `;

      const response = await provider.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      const rawText = response.text || "{}";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : "{}";

      let result = JSON.parse(cleanJson);
      keyRotationService.trackTokens(result, "Generación de Ads", params.platform, 'AD_GENERATION');
      
      return {
        ...result,
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
      } as AdGenerationResult;
    });
  },

  refineAdContent: async (
    previousResult: AdGenerationResult,
    feedback: string,
    lang: Language = "es"
  ): Promise<AdGenerationResult> => {
    return keyRotationService.fetchWithRetry(async (apiKey) => {
      const provider = aiBridge.getSmartProvider('ADS_GENERATION', apiKey);

      const prompt = `
        ERES UN EDITOR SENIOR DE INSITU AI.
        DEBES REFINAR EL SIGUIENTE RESULTADO DE GENERACIÓN DE ANUNCIOS BASÁNDOTE EN EL FEEDBACK DEL USUARIO.

        RESULTADO ANTERIOR:
        ${JSON.stringify(previousResult, null, 2)}

        FEEDBACK DEL USUARIO:
        "${feedback}"

        ---
        TAREA:
        1. Modifica los textos, prompts e insights para satisfacer el feedback.
        2. Mantén el PROTOCOLO ANTIGRAVITY (Baja carga cognitiva, alta relevancia).
        3. Responde estrictamente con el mismo formato JSON que el original.

        IDIOMA: ${lang === "es" ? "Español" : "English"}.
      `;

      const response = await provider.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      const rawText = response.text || "{}";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : "{}";

      let result = JSON.parse(cleanJson);
      return {
        ...result,
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
      } as AdGenerationResult;
    });
  }
};
