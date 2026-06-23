import { Language } from '../types';
import { TutorialModuleKey } from '../hooks/useTutorial';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TutorialStepContent {
  title: string;
  body: string;
}

export interface TutorialStep {
  id: string;
  es: TutorialStepContent;
  en: TutorialStepContent;
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    transform?: string;
  };
  arrowDirection: 'right' | 'left' | 'top' | 'bottom' | 'none';
}

/** Step already localized — what TutorialBubble receives */
export interface LocalizedTutorialStep {
  id: string;
  title: string;
  body: string;
  position: TutorialStep['position'];
  arrowDirection: TutorialStep['arrowDirection'];
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const TUTORIAL_REGISTRY: Record<TutorialModuleKey, TutorialStep[]> = {

  // ── Flow Workspace ──────────────────────────────────────────────────────────
  'flow-workspace': [
    {
      id: 'flow-step-1',
      es: { title: '① Sube tu Personaje', body: 'Arrastra o haz clic para subir la foto de referencia del personaje o producto. La IA lo mantendrá consistente en todas las escenas.' },
      en: { title: '① Upload Your Character', body: 'Drag or click to upload your character or product reference photo. The AI will keep it consistent across all scenes.' },
      position: { left: '21rem', top: '6rem' },
      arrowDirection: 'left',
    },
    {
      id: 'flow-step-2',
      es: { title: '② Carga tus Ingredientes', body: 'Sube imágenes de mood board, logos o assets visuales. Aparecerán aquí para ser arrastrados a cualquier escena del storyboard.' },
      en: { title: '② Load Your Ingredients', body: 'Upload mood board images, logos, or visual assets. They will appear here to be dragged into any storyboard scene.' },
      position: { left: '21rem', top: '42%' },
      arrowDirection: 'left',
    },
    {
      id: 'flow-step-3',
      es: { title: '③ Describe tu Narrativa', body: 'Escribe el concepto global de tu campaña o el prompt de la escena seleccionada. Sé específico: estilo visual, iluminación, emoción, acción.' },
      en: { title: '③ Describe Your Narrative', body: 'Write your campaign concept or the selected scene prompt. Be specific: visual style, lighting, emotion, action.' },
      position: { left: '50%', bottom: '17rem', transform: 'translateX(-50%)' },
      arrowDirection: 'bottom',
    },
    {
      id: 'flow-step-4',
      es: { title: '④ Gestiona tu Storyboard', body: 'Cada tarjeta es una escena. Haz clic para seleccionarla, arrastra para reordenarla. Usa PAN/TILT/ZOOM para definir el movimiento de cámara.' },
      en: { title: '④ Manage Your Storyboard', body: 'Each card is a scene. Click to select it, drag to reorder. Use PAN/TILT/ZOOM to define the camera motion.' },
      position: { left: '22rem', bottom: '2.5rem' },
      arrowDirection: 'top',
    },
    {
      id: 'flow-step-5',
      es: { title: '⑤ Exporta el Video Final', body: '¡Todo listo! Elige un preset de Mastering (Cinematic, Noir, Vintage…) y pulsa "Render Final" para componer todas las escenas en un único video exportable.' },
      en: { title: '⑤ Export the Final Video', body: 'All set! Choose a Mastering preset (Cinematic, Noir, Vintage…) and press "Render Final" to compose all scenes into one exportable video.' },
      position: { right: '2rem', top: '4rem' },
      arrowDirection: 'none',
    },
  ],

  // ── Search Interface ────────────────────────────────────────────────────────
  'search-interface': [
    {
      id: 'search-step-1',
      es: { title: '① Tu Producto o Servicio', body: 'Escribe el tema o producto que quieres auditar. Sé específico: "zapatillas running premium" es mejor que "zapatillas".' },
      en: { title: '① Your Product or Service', body: 'Type the topic or product you want to audit. Be specific: "premium running shoes" works better than "shoes".' },
      position: { top: '6rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'top',
    },
    {
      id: 'search-step-2',
      es: { title: '② Selecciona tu Objetivo', body: 'Define si tu campaña busca Conversiones, Tráfico o Brand Awareness. Esto afecta el análisis de intención de búsqueda.' },
      en: { title: '② Select Your Goal', body: 'Define whether your campaign targets Conversions, Traffic, or Brand Awareness. This shapes the search intent analysis.' },
      position: { top: '6rem', right: '2rem' },
      arrowDirection: 'none',
    },
    {
      id: 'search-step-3',
      es: { title: '③ País y Período', body: 'Elige el mercado objetivo y el rango de tiempo. Los datos de los últimos 30 días ofrecen las recomendaciones más relevantes.' },
      en: { title: '③ Country & Period', body: 'Choose the target market and time range. The last 30 days gives you the most actionable recommendations.' },
      position: { top: '6rem', right: '2rem' },
      arrowDirection: 'none',
    },
    {
      id: 'search-step-4',
      es: { title: '④ Lanza el Análisis', body: 'Pulsa "Analizar" y Gemini revisará tu estrategia SEM con datos reales, benchmarks de la industria y recomendaciones accionables.' },
      en: { title: '④ Run the Analysis', body: 'Hit "Analyze" and Gemini will review your SEM strategy with real data, industry benchmarks, and actionable recommendations.' },
      position: { bottom: '8rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'bottom',
    },
  ],

  // ── Image Audit ─────────────────────────────────────────────────────────────
  'image-audit': [
    {
      id: 'img-step-1',
      es: { title: '① Sube tu Creatividad', body: 'Arrastra o selecciona la imagen del anuncio. Acepta JPG, PNG, WebP hasta 20MB. También puedes pegar una URL de imagen.' },
      en: { title: '① Upload Your Creative', body: 'Drag or select your ad image. Accepts JPG, PNG, WebP up to 20MB. You can also paste an image URL.' },
      position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      arrowDirection: 'none',
    },
    {
      id: 'img-step-2',
      es: { title: '② Selecciona la Plataforma', body: 'Elige Meta, TikTok, Google Display… El análisis de specs, proporciones y benchmarks se adapta a cada red publicitaria.' },
      en: { title: '② Select the Platform', body: 'Choose Meta, TikTok, Google Display… The specs, aspect ratio, and benchmark analysis adapts to each ad network.' },
      position: { top: '6rem', right: '2rem' },
      arrowDirection: 'none',
    },
    {
      id: 'img-step-3',
      es: { title: '③ Mapa de Calor Neural', body: 'Activa el Heatmap para visualizar dónde se fijará la atención del usuario primero (Eye Tracking simulado con IA).' },
      en: { title: '③ Neural Heatmap', body: 'Enable the Heatmap to visualize where users will look first (AI-simulated Eye Tracking).' },
      position: { top: '6rem', left: '2rem' },
      arrowDirection: 'none',
    },
    {
      id: 'img-step-4',
      es: { title: '④ Corrección con IA', body: 'Usa "Fix con IA" para que Gemini regenere el creativo aplicando automáticamente todas las correcciones detectadas.' },
      en: { title: '④ AI Fix', body: 'Use "Fix with AI" to let Gemini regenerate the creative automatically applying all detected corrections.' },
      position: { bottom: '8rem', right: '2rem' },
      arrowDirection: 'none',
    },
    {
      id: 'img-step-5',
      es: { title: '⑤ Exporta el Reporte', body: 'Descarga el análisis completo en PDF con todas las métricas neuro-visuales y recomendaciones prioritizadas.' },
      en: { title: '⑤ Export the Report', body: 'Download the full PDF analysis with all neuro-visual metrics and prioritized recommendations.' },
      position: { bottom: '8rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'bottom',
    },
  ],

  // ── Video Audit ─────────────────────────────────────────────────────────────
  'video-audit': [
    {
      id: 'vid-step-1',
      es: { title: '① Sube tu Video', body: 'Arrastra el archivo MP4 o WebM. El análisis es frame-by-frame: cada segundo cuenta para detectar caídas de atención.' },
      en: { title: '① Upload Your Video', body: 'Drag your MP4 or WebM file. Analysis is frame-by-frame: every second matters to detect retention drops.' },
      position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      arrowDirection: 'none',
    },
    {
      id: 'vid-step-2',
      es: { title: '② Plataforma de Destino', body: 'TikTok, Reels, YouTube Shorts, Google Video Ads… Los benchmarks de retención y los specs varían por plataforma.' },
      en: { title: '② Target Platform', body: 'TikTok, Reels, YouTube Shorts, Google Video Ads… Retention benchmarks and specs vary per platform.' },
      position: { top: '6rem', right: '2rem' },
      arrowDirection: 'none',
    },
    {
      id: 'vid-step-3',
      es: { title: '③ Lee la Retención', body: 'El gráfico muestra en qué segundo pierdes audiencia. Focus en el hook: los primeros 3 segundos son críticos para todas las plataformas.' },
      en: { title: '③ Read Retention', body: 'The chart shows when you lose viewers. Focus on the hook: the first 3 seconds are critical across all platforms.' },
      position: { bottom: '8rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'bottom',
    },
    {
      id: 'vid-step-4',
      es: { title: '④ Exporta el Reporte', body: 'PDF completo con scoring de IA por escena, gráfico de retención y recomendaciones de edición accionables.' },
      en: { title: '④ Export the Report', body: 'Full PDF with AI scoring per scene, retention chart, and actionable editing recommendations.' },
      position: { bottom: '8rem', right: '2rem' },
      arrowDirection: 'none',
    },
  ],

  // ── Budget Simulator ────────────────────────────────────────────────────────
  'budget-simulator': [
    {
      id: 'budget-step-1',
      es: { title: '① Benchmark de Industria', body: 'Compara tu costo por clic estimado frente a los promedios reales de Google Ads en tu sector.' },
      en: { title: '① Industry Benchmark', body: 'Compare your estimated cost per click against real Google Ads averages in your industry.' },
      position: { top: '6rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'top',
    },
    {
      id: 'budget-step-2',
      es: { title: '② Simulador de ROI', body: 'Elige un escenario de inversión publicitaria y proyecta los resultados esperados: clics, conversiones, CPA y ROAS.' },
      en: { title: '② ROI Simulator', body: 'Choose an ad spend scenario and project expected results: clicks, conversions, CPA, and ROAS.' },
      position: { bottom: '8rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'bottom',
    },
    {
      id: 'budget-step-3',
      es: { title: '③ Embudo de Conversión', body: 'Visualiza el flujo completo desde la impresión del anuncio hasta la conversión final para identificar cuellos de botella.' },
      en: { title: '③ Conversion Funnel', body: 'Visualize the full flow from ad impression to final conversion to identify any bottlenecks.' },
      position: { bottom: '4rem', right: '2rem' },
      arrowDirection: 'bottom',
    },
  ],

  // ── Campaigns (Ads Optimizer) ───────────────────────────────────────────────
  'campaigns': [
    {
      id: 'camp-step-1',
      es: { title: '① Conecta tus Campañas', body: 'Importa los datos de tu cuenta de Google Ads para análisis en tiempo real. Se analizan CPC, CTR, ROAS, impresiones y más.' },
      en: { title: '① Connect Your Campaigns', body: 'Import your Google Ads account data for real-time analysis. CPC, CTR, ROAS, impressions, and more are audited.' },
      position: { top: '6rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'top',
    },
    {
      id: 'camp-step-2',
      es: { title: '② Revisa las Alertas', body: 'Rojo = crítico. Las alertas detectan CPC alto, CTR bajo, negative keywords faltantes y oportunidades de Quality Score.' },
      en: { title: '② Review Alerts', body: 'Red = critical. Alerts detect high CPC, low CTR, missing negative keywords, and Quality Score opportunities.' },
      position: { top: '6rem', right: '2rem' },
      arrowDirection: 'none',
    },
    {
      id: 'camp-step-3',
      es: { title: '③ Aplica Sugerencias', body: 'Cada insight tiene un botón para aplicar la optimización directamente. Los cambios se registran en el historial de auditorías.' },
      en: { title: '③ Apply Suggestions', body: 'Each insight has a one-click button to apply the optimization. Changes are logged in the audit history.' },
      position: { bottom: '8rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'bottom',
    },
    {
      id: 'camp-step-4',
      es: { title: '④ Monitorea el Impacto', body: 'Observa cómo evolucionan las métricas después de aplicar los cambios. Los gráficos se actualizan automáticamente.' },
      en: { title: '④ Monitor Impact', body: 'Watch how metrics evolve after applying changes. Charts update automatically.' },
      position: { bottom: '4rem', right: '2rem' },
      arrowDirection: 'none',
    },
  ],

  // ── Research Hub ────────────────────────────────────────────────────────────
  'research-hub': [
    {
      id: 'res-step-1',
      es: { title: '① Define tu Investigación', body: 'Escribe la pregunta de mercado con precisión. Más específica = más valiosa. Ej: "Tendencias de e-commerce de moda en LATAM 2025".' },
      en: { title: '① Define Your Research', body: 'Write your market question precisely. More specific = more valuable. E.g. "Fashion e-commerce trends in LATAM 2025".' },
      position: { top: '6rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'top',
    },
    {
      id: 'res-step-2',
      es: { title: '② Activa Search Grounding', body: 'Permite que la IA use datos reales de internet en tiempo real, no solo su conocimiento de entrenamiento. Resultados mucho más actuales.' },
      en: { title: '② Enable Search Grounding', body: 'Lets the AI use real-time internet data, not just training knowledge. Results are significantly more current.' },
      position: { top: '6rem', right: '2rem' },
      arrowDirection: 'none',
    },
    {
      id: 'res-step-3',
      es: { title: '③ Profundidad del Análisis', body: 'Quick = resumen ejecutivo (1-2 min). Deep Dive = informe científico completo con fuentes verificadas y citas inline (3-5 min).' },
      en: { title: '③ Analysis Depth', body: 'Quick = executive summary (1-2 min). Deep Dive = full scientific report with verified sources and inline citations (3-5 min).' },
      position: { top: '6rem', left: '2rem' },
      arrowDirection: 'none',
    },
    {
      id: 'res-step-4',
      es: { title: '④ Exporta el Informe', body: 'Descarga el reporte completo en PDF con todas las fuentes verificadas, citas inline y datos de mercado listos para presentar.' },
      en: { title: '④ Export the Report', body: 'Download the full PDF report with all verified sources, inline citations, and market data ready to present.' },
      position: { bottom: '8rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'bottom',
    },
  ],

  // ── Portavoz IA ─────────────────────────────────────────────────────────────
  'portavoz': [
    {
      id: 'port-step-1',
      es: { title: '① Identidad Vocal', body: 'Graba una muestra de voz para clonar. Esta será la voz de tu avatar publicitario.' },
      en: { title: '① Vocal Identity', body: 'Record a voice sample to clone. This will be your advertising avatar\'s voice.' },
      position: { top: '6rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'top',
    },
    {
      id: 'port-step-2',
      es: { title: '② Base Visual', body: 'Elige cómo se verá el avatar: genéralo con IA (Google Veo 3.1), usa actores de stock o sube tu video.' },
      en: { title: '② Visual Base', body: 'Choose your avatar appearance: generate with AI (Google Veo 3.1), use stock actors, or upload your video.' },
      position: { top: '6rem', right: '2rem' },
      arrowDirection: 'none',
    },
    {
      id: 'port-step-3',
      es: { title: '③ Guion y Síntesis', body: 'Escribe el guion para que la IA genere el audio y haga el lip-sync automático con el video.' },
      en: { title: '③ Script & Synthesis', body: 'Write the script so the AI can generate the audio and perform automatic lip-sync with the video.' },
      position: { bottom: '8rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'bottom',
    },
    {
      id: 'port-step-4',
      es: { title: '④ Envío al Flow Lab', body: 'Descarga tu video final o expórtalo directamente al "Ingredient Archive" del Flow Workspace.' },
      en: { title: '④ Send to Flow Lab', body: 'Download your final video or export it directly to the Flow Workspace\'s Ingredient Archive.' },
      position: { bottom: '4rem', right: '2rem' },
      arrowDirection: 'none',
    },
  ],

  // ── Mass Ads Generator ──────────────────────────────────────────────────────
  'mass-ads': [
    {
      id: 'mass-step-1',
      es: { title: '① Define el Brief', body: 'Describe el producto, el tono de comunicación y el objetivo del anuncio. Cuánto más detallado, mejores serán las variantes generadas.' },
      en: { title: '① Define the Brief', body: 'Describe the product, communication tone, and ad objective. The more detailed, the better the generated variants.' },
      position: { top: '6rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'top',
    },
    {
      id: 'mass-step-2',
      es: { title: '② Elige los Formatos', body: 'Selecciona las redes publicitarias y los tamaños. El sistema genera automáticamente variantes optimizadas para cada especificación.' },
      en: { title: '② Choose Formats', body: 'Select the ad networks and sizes. The system automatically generates variants optimized for each specification.' },
      position: { top: '6rem', right: '2rem' },
      arrowDirection: 'none',
    },
    {
      id: 'mass-step-3',
      es: { title: '③ Exporta el Batch', body: 'Descarga todas las creatividades en un ZIP organizado por formato y red publicitaria, listo para subir a las plataformas.' },
      en: { title: '③ Export the Batch', body: 'Download all creatives in a ZIP organized by format and ad network, ready to upload to the platforms.' },
      position: { bottom: '8rem', left: '50%', transform: 'translateX(-50%)' },
      arrowDirection: 'bottom',
    },
  ],
};

/** Helper: get localized steps for a module */
export function getLocalizedSteps(
  moduleKey: TutorialModuleKey,
  language: Language,
): Array<{ id: string; title: string; body: string; position: TutorialStep['position']; arrowDirection: TutorialStep['arrowDirection'] }> {
  return (TUTORIAL_REGISTRY[moduleKey] ?? []).map((s) => ({
    id: s.id,
    title: s[language].title,
    body: s[language].body,
    position: s.position,
    arrowDirection: s.arrowDirection,
  }));
}
