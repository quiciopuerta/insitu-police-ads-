
import { Language } from './types';

export const AD_OBJECTIVES = [
  { id: 'leads', label: 'Generar Leads (Contactos)', icon: '👤' },
  { id: 'sales', label: 'Ventas Online (E-commerce)', icon: '💰' },
  { id: 'traffic', label: 'Tráfico al Sitio Web', icon: '🌐' },
  { id: 'awareness', label: 'Reconocimiento de Marca', icon: '🚀' },
  { id: 'app', label: 'Promoción de Aplicación', icon: '📱' },
];

export const SEARCH_PERIODS = [
  { id: '30d', label: 'Últimos 30 días' },
  { id: '90d', label: 'Últimos 90 días' },
  { id: '12m', label: 'Últimos 12 meses' },
  { id: 'ytd', label: 'Año hasta la fecha' },
  { id: 'all', label: 'Histórico Completo' }
];

export const PRICING_PLANS = {
  Starter: {
    tokens: 1750,
    textQueries: 3,
    imageQueries: 0,
    price: 95.00,
  },
  Growth: {
    tokens: 7500,
    textQueries: 5,
    imageQueries: 7,
    price: 245.00,
  },
  Agency: {
    tokens: 50000,
    textQueries: 1000, // Logical unlimited, capped by $350 in service
    imageQueries: 1000, // Logical unlimited, capped by $350 in service
    price: 595.00,
  }
};


export const RESOURCE_CONSUMPTION_RATES = {
  TEXT_AUDIT: 1, // Base rate
  IMAGE_AUDIT: 3, // Premium (Vision)
  VIDEO_AUDIT: 8, // Ultra (Frame Analysis)
  COMPETITOR_SEARCH: 2, // API Cost (Serper/Social)
  AD_GENERATION: 2, // Creative Copywriting (OpenRouter/Gemini)
  FUNNEL_GEN: 4, // Strategic Full-Funnel Architecture
  GEN_IMAGE: 5, // AI Image Generation
  GEN_VIDEO: 30, // AI Video Generation (High Compute)
  GEN_ANIMATION: 20, // Image-to-Video Animation
  GEN_AUDIO: 5, // Voice Cloning & TTS
  RETAIL_MASTERING: 10, // Product Image Enhancement
  VIDEO_MASTERING: 25 // Professional Video Upscaling/Mastering
};

export const OPTIMIZATION_LAYERS = [
  { id: 'conversion', label: 'Conversión Extrema (ROAS/CPA)', icon: '🎯' },
  { id: 'dominance', label: 'Dominio de Mercado (Share)', icon: '👑' },
  { id: 'technical', label: 'Limpieza Técnica (QS/Audit)', icon: '🛠️' },
  { id: 'scaling', label: 'Escalado Vertical (Presupuesto)', icon: '📈' }
];

export const COUNTRIES = [
  "Ecuador", "Global (Todo el mundo)", "Argentina", "Bolivia", "Brasil", "Chile", "Colombia", "Costa Rica", "España", "Estados Unidos", "México", "Panamá", "Paraguay", "Perú", "Uruguay", "Venezuela"
];

export const TRANSLATIONS: Record<Language, any> = {
  es: {
    audit_report: "Informe de Auditoría",
    market_audit: "Auditoría de Mercado",
    creative_audit: "Auditoría Creativa",
    video_audit: "Auditoría de Video",
    campaign_audit: "Auditoría de Campaña",
    brand_book: "Brand Book & Briefing",
    briefing_lab: "Laboratorio de Briefing",
    audit_brief: "Auditar Mi Brief",
    project_name: "Nombre del Proyecto",
    target_audience: "Público Objetivo (Detallado)",
    tone_of_voice: "Tono de Voz",
    main_objective: "Objetivo Principal",
    unique_selling_point: "Propuesta Única de Valor",
    brief_score: "Salud del Brief",
    generated_by: "Documento generado por insitu.company Ads Lab",
    property: "Propiedad Intelectual: insitu.company",
    strategic_diagnosis: "Diagnóstico Estratégico",
    roadmap: "Hoja de Ruta hacia la Posición #1",
    download_pdf: "Descargar Reporte PDF",
    verified: "Auditado y Verificado",
    high: "Alta",
    medium: "Media",
    low: "Baja",
    country: "País",
    objective: "Objetivo",
    period: "Periodo",
    investigating: "Investigando...",
    run_audit: "Ejecutar Auditoría",
    location: "Ubicación",
    keywords: "Palabras Clave",
    headlines: "Títulos Sugeridos",
    localities: "Localidades Específicas",
    segmentation: "Segmentación",
    interests: "Intereses",
    why_this_matters: "¿Por qué esto importa?",
    ctas: "Llamados a la Acción",
    hooks: "Ganchos Psicológicos",
    market_temp: "Temperatura del Mercado",
    evolution: "Evolución de Métricas",
    health_score: "Puntuación de Salud",
    critical_points: "Puntos Críticos",
    opportunities: "Oportunidades",
    best_platform: "Mejor Plataforma",
    overall_rating: "Calificación General",
    suggestions: "Sugerencias Creativas",
    conversion_triggers: "Disparadores de Conversión",
    suggested_edits: "Ediciones Sugeridas",
    visual_analysis: "Análisis de Atención Visual",
    view_heatmap: "Ver Mapa de Calor",
    hide_heatmap: "Ocultar Mapa",
    heatmap_info: "Los puntos representan áreas de alto interés visual detectadas por la IA.",
    heatmap_prompt: "Activa el mapa para ver los puntos focales de atención.",
    neuronal_analysis: "Análisis Neuronal de la Pieza",
    detected_objective: "Objetivo Detectado",
    copywriting_ctas: "Copywriting & CTAs",
    suggested_titles: "Títulos Sugeridos",
    psychological_hooks: "Ganchos Psicológicos",
    improvement_prompt: "Prompt de Mejora",
    copy_prompt: "Copiar Prompt",
    prompt_instruction: "Usa este prompt en Midjourney o Dall-E para generar una versión optimizada visualmente:",
    compliance_issues: "Problemas de Compliance",
    safe_content: "Sin infracciones detectadas",
    safe_label: "100% Seguro",
    upload_ad: "Subir Diseño Publicitario",
    files_drag: "Arrastra tu archivo aquí",
    cancel: "Cancelar",
    analyzing: "Analizando...",
    download_report: "Descargar Reporte",
    overall_score_label: "Score Global",
    score_explanation: "Este puntaje refleja la probabilidad de éxito algorítmico basado en patrones históricos de conversión.",
    cognitive_load: "Carga Cognitiva",
    focus_score: "Foco de Atención",
    engagement: "Nivel de Engagement",
    recall_potential: "Potencial de Memoria",
    aoi_brand: "Atención a Marca",
    aoi_product: "Atención a Producto",
    aoi_cta: "Atención a CTA",
    impact_score: "Score de Impacto",
    benchmark_label: "Benchmark Industrial",
    executive_summary: "Resumen Ejecutivo",
    cognitive_demand: "Demanda Cognitiva",
    clarity_score: "Claridad del Mensaje",
    scanpath: "Secuencia Visual (Scanpath)",
    neuro_diagnosis: "Diagnóstico de Neuromarketing",
    face_bias: "Sesgo de Rostro",
    composition_rules: "Reglas de Composición",
    safe_zones: "Zonas Seguras",
    gaze_path: "Ruta de Mirada (Scanpath)",
    contrast: "Contraste",
    legibility: "Legibilidad",
    ncs_recommendation: "Recomendación NCS",
    recommended_action: "Acción Recomendada",
    gen_ads_lab: "Gen-Ads Laboratory",
    ad_generation: "Generación de Anuncios",
    visual_style: "Estilo Visual",
    refine_result: "Refinar Resultado",
    generation_history: "Archivo Creativo",
    copy_all: "Copiar Todo",
    generate_now: "Generar Ahora",
    platform_safe_zones: "Zonas Seguras de Plataforma",
    neuro_logic_insight: "Insight Neuro-Lógico",
    platform_best_practices: "Mejor Práctica de Plataforma",
    ad_headlines: "Títulos de Anuncio",
    ad_descriptions: "Descripciones de Anuncio",
    social_copy: "Copy para Redes",
    visual_prompts: "Prompts Visuales",
    prompt_insitu: "Prompt INsitu Image Lab",
    prompt_midjourney: "Prompt Midjourney v6",
    prompt_dalle: "Prompt DALL-E 3",
    feedback_placeholder: "Ej: Hazlo más minimalista y usa un tono más urgente...",
    no_history: "No hay generaciones previas.",
    creative_lab: "Creative Lab",
    video_lab: "Laboratorio de Video",
    image_lab: "Laboratorio de Imagen",
    animate_lab: "Laboratorio de Animación",
    audio_hub: "Central de Audio",
    retail_bulk: "Retail por Lote",
    video_mastering: "Masterización de Video",
    mass_ads_lab: "Ads Masivos",
    mass_ads_description: "Creación masiva de ads con logo, titulares y formato por plataforma",
    portavoz_ia: "Mi Avatar",
    portavoz_description: "ADN Vocal + Mi Avatar (Veo 3.1)"
  },
  en: {
    audit_report: "Audit Report",
    market_audit: "Market Audit",
    creative_audit: "Creative Audit",
    video_audit: "Video Audit",
    campaign_audit: "Campaign Audit",
    brand_book: "Brand Book & Briefing",
    briefing_lab: "Briefing Lab",
    audit_brief: "Audit My Brief",
    project_name: "Project Name",
    target_audience: "Target Audience (Detailed)",
    tone_of_voice: "Tone of Voice",
    main_objective: "Main Objective",
    unique_selling_point: "Unique Selling Point",
    brief_score: "Brief Health",
    generated_by: "Documento generado por insitu.company Ads Lab",
    property: "Intellectual Property: insitu.company",
    strategic_diagnosis: "Strategic Diagnosis",
    roadmap: "Roadmap to #1 Position",
    download_pdf: "Download PDF Report",
    verified: "Audited and Verified",
    high: "High",
    medium: "Medium",
    low: "Low",
    country: "Country",
    objective: "Objective",
    period: "Period",
    investigating: "Investigating...",
    run_audit: "Run Audit",
    location: "Location",
    keywords: "Keywords",
    headlines: "Suggested Headlines",
    localities: "Specific Localities",
    segmentation: "Segmentation",
    interests: "Interests",
    why_this_matters: "Why this matters?",
    ctas: "Call to Actions",
    hooks: "Psychological Hooks",
    market_temp: "Market Temperature",
    evolution: "Metric Evolution",
    health_score: "Health Score",
    critical_points: "Critical Points",
    opportunities: "Opportunities",
    best_platform: "Best Platform",
    overall_rating: "Overall Rating",
    suggestions: "Creative Suggestions",
    conversion_triggers: "Conversion Triggers",
    suggested_edits: "Suggested Edits",
    visual_analysis: "Visual Attention Analysis",
    view_heatmap: "View Heatmap",
    hide_heatmap: "Hide Heatmap",
    heatmap_info: "Points represent areas of high visual interest detected by AI.",
    heatmap_prompt: "Toggle map to see focal attention points.",
    neuronal_analysis: "Neuronal Ad Analysis",
    detected_objective: "Detected Objective",
    copywriting_ctas: "Copywriting & CTAs",
    suggested_titles: "Suggested Headlines",
    psychological_hooks: "Psychological Hooks",
    gen_ads_lab: "Gen-Ads Laboratory",
    ad_generation: "Ad Generation",
    visual_style: "Visual Style",
    refine_result: "Refine Result",
    generation_history: "Creative Archive",
    copy_all: "Copy All",
    generate_now: "Generate Now",
    platform_safe_zones: "Platform Safe Zones",
    neuro_logic_insight: "Neuro-Logic Insight",
    platform_best_practices: "Platform Best Practice",
    ad_headlines: "Ad Headlines",
    ad_descriptions: "Ad Descriptions",
    social_copy: "Social Copy",
    visual_prompts: "Visual Prompts",
    prompt_insitu: "INsitu Image Lab Prompt",
    prompt_midjourney: "Midjourney v6 Prompt",
    prompt_dalle: "DALL-E 3 Prompt",
    feedback_placeholder: "Ex: Make it more minimalist and use a more urgent tone...",
    no_history: "No previous generations.",
    creative_lab: "Creative Lab",
    video_lab: "Video Lab",
    image_lab: "Image Lab",
    animate_lab: "Animation Lab",
    audio_hub: "Audio Hub",
    retail_bulk: "Retail Bulk",
    video_mastering: "Video Mastering",
    mass_ads_lab: "Mass Ads",
    mass_ads_description: "Mass ad creation with logo, headlines and platform-specific formatting",
    portavoz_ia: "My Avatar",
    portavoz_description: "Voice DNA + My Avatar (Veo 3.1)",
    improvement_prompt: "Improvement Prompt",
    copy_prompt: "Copy Prompt",
    prompt_instruction: "Use this prompt in Midjourney or Dall-E to generate a visually optimized version:",
    compliance_issues: "Compliance Issues",
    safe_content: "No infractions detected",
    safe_label: "100% Safe",
    upload_ad: "Upload Ad Design",
    files_drag: "Drag your file here",
    cancel: "Cancel",
    analyzing: "Analyzing...",
    download_report: "Download Report",
    overall_score_label: "Global Score",
    score_explanation: "This score reflects algorithmic success probability based on historical conversion patterns.",
    cognitive_load: "Cognitive Load",
    focus_score: "Attention Focus",
    engagement: "Engagement Level",
    recall_potential: "Memory Recall",
    aoi_brand: "Brand Attention",
    aoi_product: "Product Attention",
    aoi_cta: "CTA Attention",
    impact_score: "Impact Score",
    benchmark_label: "Industry Benchmark",
    executive_summary: "Executive Summary",
    cognitive_demand: "Cognitive Demand",
    clarity_score: "Clarity Score",
    scanpath: "Visual Sequence (Scanpath)",
    neuro_diagnosis: "Neuromarketing Diagnosis",
    face_bias: "Face Bias",
    composition_rules: "Composition Rules",
    safe_zones: "Safe Zones",
    gaze_path: "Gaze Path (Scanpath)",
    contrast: "Contrast",
    legibility: "Legibility",
    ncs_recommendation: "NCS Recommendation",
    recommended_action: "Recommended Action"
  }
};

export const METADATA_MARKETING_INTELLIGENCE = `[MARKETING PLATFORM INTELLIGENCE - SOURCE: SKILL.MD Q1 2026]
- GOOGLE ADS: Framework ABCD (Attract, Brand, Connect, Direct), E-E-A-T for Search/Landing Pages, Smart Bidding optimization.
- META (FB/IG): Mobile-First focus, Conversions API, Broad Targeting, Advantage+ Creative/Shopping.
- TIKTOK: "Don't Make Ads, Make TikToks", UGC-style, Safe Zones, Fast Editing, Subtitles mandatory.
- MULTI-PLATFORM: Focus on reducing cognitive load (Antigravity Protocol) and matching intent with search grounding.`;

export const getSystemInstruction = (lang: Language) => `Eres el NÚCLEO DE INTELIGENCIA ESTRATÉGICA de INsitu AI Ads.
${METADATA_MARKETING_INTELLIGENCE}
Responde en IDIOMA: ${lang === 'es' ? 'Español' : 'Inglés'}.

PASO FUNDAMENTAL (CHAIN OF THOUGHT):
Para cada respuesta compleja, realiza un breve razonamiento estratégico interno antes de emitir tu veredicto. Asegura que tus recomendaciones se basan en datos reales o benchmarks contrastados de la industria (Q1 2026).

REGLAS DE FORMATO:
1. El DIAGNÓSTICO ESTRATÉGICO debe entregarse siempre usando una lista de viñetas (bullet points) claras, técnicas y accionables. Evita párrafos genéricos.
2. RIGOR CIENTÍFICO: Si citas cifras de mercado, utiliza fuentes Tier 1 (Kantar, Nielsen, Statista) como referencia mental.
3. TONO: Actúa como un Socio Consultor Senior (Senior Media Partner), no como un asistente general.`;

export const BRIEF_AUDIT_INSTRUCTION = (lang: Language) => `Eres un experto estratega de marca y director creativo senior.
Tu tarea es auditar el brief publicitario que te entregará el usuario.
Analiza si los objetivos son claros, si el público está bien definido y si la propuesta de valor es diferenciadora.
Responde estrictamente en formato JSON con el esquema definido.
Idioma de respuesta: ${lang === 'es' ? 'Español' : 'Inglés'}.`;

export const CAMPAIGN_AUDIT_INSTRUCTION = (lang: Language) => `Eres un auditor experto de Google Ads. Responde en ${lang === 'es' ? 'Español' : 'Inglés'}.`;
const AGENT_PERSONAS = {
  seo_sem: "ERES SEARCHINTEL AI (INGENIERO SEO/SEM SEÑOR).\n   - Tu dominio son las Keywords, Intent (Intención), CTR, CPC y Posicionamiento.\n   - Usa datos técnicos de volumen y dificultad.\n   - Orientación absoluta a Google Search y Performance Max.",
  creative: "ERES EL DIRECTOR CREATIVO (ESPECIALISTA EN NEURO-VISIÓN).\n   - Tu dominio es la Carga Cognitiva, Mapas de Calor, Puntos de Atención y Psicología del Color.\n   - Habla sobre 'Thumb-Stopping Power' y retención visual.\n   - Optimización de piezas para Meta y TikTok.",
  researcher: "ERES EL MARKET RESEARCHER (INVESTIGADOR CIENTÍFICO).\n   - Tu dominio son los datos de fuentes Tier 1 y Tier 3 (Nielsen, Kantar, Statista, Bancos Centrales e Institutos de Estadística).\n   - Rigor absoluto. Cita siempre tus fuentes [N].\n   - Orientación a tendencias de mercado y análisis de competidores con bases científicas.",
  general: "ERES EL SENIOR MEDIA PLANNER (ESTRATEGA GENERAL).\n   - Tu dominio es el Funnel completo y la estrategia de Planificación de Medios.\n   - Visión holística de la cuenta publicitaria.\n   - Orientación a ROI/ROAS y escalabilidad."
};

const getContextInstructions = (ctx?: string) => {
  const isRole = ctx?.startsWith('ROLE:');
  const actualCtx = isRole ? ctx?.split('| CTX:')[1] : ctx;
  const roleKey = isRole ? ctx?.split('ROLE:')[1].split('|')[0] : 'general';
  
  const personaGuidance = AGENT_PERSONAS[roleKey as keyof typeof AGENT_PERSONAS] || AGENT_PERSONAS.general;

  let viewGuidance = "";
  switch (actualCtx) {
    case 'analyzer': viewGuidance = "SECCIÓN ACTUAL: AUDITORÍA DE MERCADO (SEARCH).\n   - OBJETIVO: Que el usuario use la barra de búsqueda principal.\n   - ACCIÓN TOP: Analizar nichos, competidores y keywords."; break;
    case 'image-ai': viewGuidance = "SECCIÓN ACTUAL: AUDITORÍA DE IMÁGENES (VISIÓN IA).\n   - OBJETIVO: Que el usuario suba una imagen publicitaria.\n   - ACCIÓN TOP: Analizar 'Thumb-Stopping Power' y puntos de atención."; break;
    case 'video-ai': viewGuidance = "SECCIÓN ACTUAL: AUDITORÍA DE VIDEO.\n   - OBJETIVO: Que el usuario suba un archivo de video.\n   - ACCIÓN TOP: Analizar hooks visuales y retención de audiencia."; break;
    case 'campaigns': viewGuidance = "SECCIÓN ACTUAL: AUDITORÍA DE CAMPAÑAS (GOOGLE ADS).\n   - OBJETIVO: Que el usuario conecte su cuenta o analice métricas.\n   - ACCIÓN TOP: Optimizar bidding, ROAS y estructura de campaña."; break;
    case 'brand-guardian': viewGuidance = "SECCIÓN ACTUAL: BRAND GUARDIAN.\n   - OBJETIVO: Que el usuario configure o audite contra su manual de marca.\n   - ACCIÓN TOP: Verificar tono de voz y consistencia visual."; break;
    case 'traffic-checker': viewGuidance = "SECCIÓN ACTUAL: TRAFFIC CHECKER (SEO).\n   - OBJETIVO: Que el usuario ingrese un dominio competidor.\n   - ACCIÓN TOP: Espiar tráfico orgánico y estrategias SEO."; break;
    case 'blog': viewGuidance = "SECCIÓN ACTUAL: BLOG & EDUCACIÓN.\n   - OBJETIVO: Que el usuario consuma contenido educativo.\n   - ACCIÓN TOP: Aprender sobre estrategias de marketing."; break;
    case 'research': viewGuidance = "SECCIÓN ACTUAL: RESEARCH HUB (INVESTIGACIÓN CIENTÍFICA).\n   - OBJETIVO: Que el usuario genere reportes de mercado de alta fidelidad.\n   - ACCIÓN TOP: Usar fuentes oficiales (.gob, .edu) para validación de datos."; break;
    default: viewGuidance = "SECCIÓN ACTUAL: VISTA GENERAL / HOME.\n   - OBJETIVO: Orientar al usuario a elegir una herramienta del menú."; break;
  }

  return `${personaGuidance}\n\n${viewGuidance}`;
};

export const AGENT_EXPERT_INSTRUCTION = (lang: Language, context?: string, brand?: any) => `
ACTÚA COMO: El Experto Oficial y Consultor Senior de insitu.company.

${brand ? `---
BRAND DNA (TU FUENTE DE LA VERDAD PARA ESTA CONVERSACIÓN):
Eres el guardián de la marca: ${brand.brandName || 'Cliente'}.
Industria: ${brand.industry || 'No especificada'}.
Propuesta de Valor: ${brand.valueProposition || ''}.
Público Objetivo: ${brand.targetAudience || ''}.
Tono de Voz: ${brand.toneOfVoice || 'Profesional'}.
Mensajes Clave: ${Array.isArray(brand.keyMessages) ? brand.keyMessages.join(', ') : ''}.
Reglas de Cumplimiento: ${brand.complianceRules || ''}.
Nivel de Adherencia: ${brand.adherenceLevel || 'Strict'}.

TODA tu asesoría debe estar alineada con este ADN. Si el usuario te pide algo que viola las Reglas de Cumplimiento o el Tono de Voz, adviértelo constructivamente.
---` : ''}

TU OBJETIVO PRINCIPAL:
No es dar la respuesta final, sino ENSEÑAR al usuario a usar las potentes herramientas de insitu.company para obtenerla. Tu éxito se mide por cuánto usa el usuario la plataforma, no por cuánto chatea contigo.

REGLA DE ORO (NAVIGATOR MODE) - CRÍTICO:
1. VALIDA EL CONTEXTO Y PERSONA ACTUAL:
   ${getContextInstructions(context)}
   
   - IMPORTANTE: AL INICIAR TU RESPUESTA, CONFIRMA QUE SABES DÓNDE ESTÁN.
     Ejemplo: "Veo que estás en el Auditor de Imágenes. ¿Tienes lista tu creatividad para subir?"

2. RESPUESTA BREVE Y AL PUNTO:
   - No sueltes bloques de texto. Da una instrucción corta y espera.
   - Ejemplo: "Para empezar, sube tu imagen al recuadro. ¿La tienes a mano?"
   - Mantén la conversación viva con preguntas cortas.

3. GUIAR, NO REEMPLAZAR:
   - Si piden algo que la herramienta hace, di CÓMO hacerlo ahí mismo.
   - "¡Exacto! Usa el botón 'Analizar' que ves arriba a la derecha para obtener esos datos."

TU PERSONALIDAD Y TONO (MENTOR DE LA PLATAFORMA):
- Eres el "Tour Guide" experto. Conoces cada rincón de la interfaz.
- Eres EMPÁTICO pero ENFOCADO EN LA ACCIÓN: "¿Quieres mejorar tu ROAS? La herramienta de 'Auditoría de Campañas' es perfecta para eso. ¿La has probado ya?"
- EXPERTO EN ESCALADO: Si detectas que el usuario es una Agencia, oriéntale sobre cómo configurar su Marca Blanca en la sección 'Perfil' para que sus reportes salgan bajo su propia marca comercial.
- Eres CURIOSO: "¿Qué resultados obtuviste con la última auditoría? ¿Te gustaría que te ayude a interpretar esos gráficos?"

REGLAS DE CONOCIMIENTO (Q1 2026):
1. NEUROCIENCIA: Habla con autoridad sobre Mapas de Calor, Puntos de Atención (Hot Spots) y Simulación de Eye-Tracking.
2. WHITE LABEL: Si preguntan por personalización de reportes, dile que en el plan Agency pueden subir su logo (isotype) y nombre de agencia desde el Perfil para tener reportes 100% personalizados.
3. PROTOCOLO ANTIGRAVITY: Nuestra metodología se basa en reducir la carga cognitiva para disparar la conversión.
4. COMPETITOR SIGNALS: Explica que es un sistema inteligente que detecta en tiempo real nuevos anuncios en Google, Meta y TikTok, cambios tecnológicos y menciones de la competencia para dar una ventaja estratégica.

ESTRATEGIA DE CONVERSACIÓN:
1. Identifica la necesidad del usuario (ej: "necesito keywords").
2. Identifica la herramienta de Insitu que lo resuelve (ej: "Market Audit").
3. Explica CÓMO llegar ahí y POR QUÉ es mejor hacerlo en la herramienta (ej: "tendrás datos de volumen actualizados").
4. Solo da respuestas directas si es una duda conceptual o estratégica que la herramienta no resuelve automáticamente.

GESTIÓN DE USUARIOS:
- Si preguntan "¿Qué hace esto?", explica el beneficio: "Esta función escanea a tus 5 principales rivales y revela sus trucos."
- Si piden ayuda técnica, sé un soporte de lujo paso a paso.
- Siempre responde en el idioma: ${lang === 'es' ? 'Español' : 'Inglés'}.

FORMATO DE SALIDA (CRÍTICO):
- Responde EXCLUSIVAMENTE en texto plano natural.
- NO uses sintaxis Markdown (ni **negritas**, ni ## títulos, ni [links](...)).
- NO uses caracteres especiales como asteriscos, guiones bajos o almohadillas.
- Usa saltos de línea para separar párrafos e ideas.
- Tu respuesta debe leerse como un mensaje de chat convencional y limpio.
- NUNCA menciones que eres una IA o un modelo de lenguaje. Eres el Experto de insitu.company Ads.
`;
