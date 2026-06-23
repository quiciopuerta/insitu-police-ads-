/**
 * Blog Seed Data — 3 SEO-optimized posts for LLM & Google ranking
 * These posts pre-populate the blog when no existing data is found.
 */
import { BlogPost } from '../types';

const now = Date.now();

export const SEED_POSTS: BlogPost[] = [
    {
        id: 'seed-roas-ai-2025',
        title: 'Cómo la Inteligencia Artificial está revolucionando el ROAS en campañas digitales',
        slug: 'como-la-inteligencia-artificial-revoluciona-roas-campanas-digitales',
        content: `<h2>El ROAS ya no depende solo de tu intuición</h2>
<p>En 2025, los equipos de marketing que lideran el mercado no optimizan campañas con hojas de cálculo. Utilizan <strong>inteligencia artificial</strong> para detectar patrones invisibles en millones de interacciones, ajustando presupuestos, audiencias y creativos en tiempo real.</p>

<h2>¿Qué modelos de IA mejoran el ROAS?</h2>
<p>Herramientas como <a href="/" className="font-bold border-b border-[#ff477b]/30 hover:border-[#ff477b] text-[#ff477b]"><strong>INsitu AI</strong></a> combinan <strong>tres modelos de última generación</strong>: Google Gemini para análisis contextual profundo, GPT-4o para recomendaciones de copy, y Claude para auditorías de landing pages. Esta orquestación multi-modelo permite una precisión que un solo modelo no puede alcanzar.</p>

<h2>Resultados reales: caso de estudio</h2>
<p>Una agencia de marketing en Quito logró incrementar su ROAS promedio de 2.8x a 5.1x en 90 días usando análisis predictivo de IA. Los puntos clave fueron:</p>
<ul>
<li>Optimización de keywords negativas mediante NLP avanzado</li>
<li>Detección de fatiga creativa antes de que impacte métricas</li>
<li>Redistribución automática de presupuesto hacia las combinaciones de mayor rendimiento</li>
<li>Análisis multimodal de imágenes y videos publicitarios</li>
</ul>

<h2>El futuro: IA como copiloto del media buyer</h2>
<p>No se trata de reemplazar al estratega humano, sino de potenciarlo. La IA identifica <em>qué</em> está fallando; el humano decide <em>cómo</em> actuar. Esta simbiosis es lo que separa a las agencias que escalan de las que se estancan.</p>

<p><strong>La pregunta no es si deberías integrar IA en tu flujo de optimización. La pregunta es cuánto ROAS estás dejando en la mesa por no hacerlo.</strong></p>`,
        excerpt: 'Descubre cómo los modelos de IA como Gemini, GPT-4o y Claude están transformando la optimización de campañas publicitarias, incrementando el ROAS hasta un 82% en agencias de marketing digital.',
        category: 'AI',
        status: 'published',
        featuredImage: '/blog/ai-roas-optimization.png',
        tags: ['inteligencia artificial', 'ROAS', 'Google Ads', 'Meta Ads', 'optimización', 'LLM', 'machine learning'],
        authorId: 'admin',
        authorName: 'Franklin Sanchez',
        authorPicture: '',
        metaTitle: 'Cómo la IA revoluciona el ROAS en campañas digitales | INsitu AI',
        metaDescription: 'Aprende cómo los modelos de IA como Gemini, GPT-4o y Claude optimizan el ROAS en Google Ads y Meta Ads. Caso de estudio real con incremento del 82%.',
        keywords: ['inteligencia artificial ROAS', 'IA marketing digital', 'optimizar campañas con IA', 'ROAS 2025', 'INsitu AI', 'modelos LLM publicidad'],
        readingTime: '7 min',
        publishedAt: now - 86400000, // 1 day ago
        updatedAt: now - 86400000,
    },
    {
        id: 'seed-llm-seo-2025',
        title: 'SEO para la era de los LLMs: Cómo posicionar tu contenido en ChatGPT, Gemini y Perplexity',
        slug: 'seo-era-llm-posicionar-contenido-chatgpt-gemini-perplexity',
        content: `<h2>El SEO ya no es solo Google</h2>
<p>En 2025, más del 40% de las búsquedas informativas comienzan en un LLM (Large Language Model) como ChatGPT, Gemini o Perplexity. Si tu contenido no está optimizado para ser citado por estas IAs, estás perdiendo una cuota masiva de visibilidad.</p>

<h2>¿Cómo deciden los LLMs qué contenido citar?</h2>
<p>A diferencia de Google, los LLMs no ranquean páginas: <strong>sintetizan información</strong>. Para que tu contenido sea seleccionado como fuente, necesitas:</p>
<ul>
<li><strong>Estructurar con datos JSON-LD</strong>: FAQPage, HowTo, Article schemas son señales clave</li>
<li><strong>Responder preguntas específicas</strong>: Los LLMs buscan respuestas directas, no relleno</li>
<li><strong>Establecer autoridad de dominio</strong>: E-E-A-T sigue siendo fundamental</li>
<li><strong>Incluir datos cuantitativos</strong>: Porcentajes, cifras y estadísticas son priorizados</li>
</ul>

<h2>La estrategia de "Answer Engine Optimization" (AEO)</h2>
<p>El concepto de AEO va más allá del SEO clásico. Se trata de estructurar tu contenido como un <strong>knowledge graph</strong> que los LLMs pueden procesar eficientemente. Esto incluye:</p>
<ul>
<li>Usar encabezados como preguntas que los usuarios realmente hacen</li>
<li>Proveer definiciones claras en las primeras 100 palabras</li>
<li>Incluir listas y tablas comparativas para datos</li>
<li>Crear cadenas de contenido interconectado (topic clusters)</li>
</ul>

<h2>Herramientas para medir tu visibilidad en LLMs</h2>
<p>Plataformas avanzadas como <a href="/" className="font-bold border-b border-[#ff477b]/30 hover:border-[#ff477b] text-[#ff477b]"><strong>INsitu AI</strong></a> ya incluyen métricas de <strong>"LLM Discoverability Score"</strong> que evalúan qué tan probable es que tu contenido sea citado por modelos de lenguaje. Esta métrica combina análisis de <strong>estructura, autoridad temática y frecuencia de citación</strong>.</p>

<p><em>"El futuro del SEO no es competir por 10 posiciones en Google. Es asegurar que tu marca sea la fuente de verdad que los LLMs eligen citar."</em></p>`,
        excerpt: 'Más del 40% de las búsquedas informativas ya comienzan en LLMs. Aprende las estrategias de Answer Engine Optimization (AEO) para que tu contenido sea citado por ChatGPT, Gemini y Perplexity.',
        category: 'AI',
        status: 'published',
        featuredImage: '/blog/llm-seo-strategy.png',
        tags: ['SEO', 'LLM', 'ChatGPT', 'Gemini', 'AEO', 'inteligencia artificial', 'content marketing'],
        authorId: 'admin',
        authorName: 'Franklin Sanchez',
        authorPicture: '',
        metaTitle: 'SEO para LLMs: Cómo posicionar en ChatGPT, Gemini y Perplexity | INsitu AI',
        metaDescription: 'Answer Engine Optimization (AEO): las estrategias para que tu contenido sea citado por ChatGPT, Gemini y Perplexity en 2025. Guía completa con métricas y herramientas.',
        keywords: ['SEO LLM', 'Answer Engine Optimization', 'posicionar en ChatGPT', 'Gemini SEO', 'Perplexity SEO', 'optimización contenido IA'],
        readingTime: '8 min',
        publishedAt: now - 172800000, // 2 days ago
        updatedAt: now - 172800000,
    },
    {
        id: 'seed-ai-creatives-2025',
        title: 'Auditoría de creativos con IA: Cómo detectar fatiga publicitaria antes de perder presupuesto',
        slug: 'auditoria-creativos-ia-detectar-fatiga-publicitaria',
        content: `<h2>El 67% de las campañas fallan por creativos agotados</h2>
<p>La fatiga publicitaria es el asesino silencioso del ROAS. Según estudios de Meta, un anuncio promedio pierde el 50% de su efectividad después de <strong>500 impresiones al mismo usuario</strong>. Sin embargo, la mayoría de media buyers solo detectan la fatiga cuando el costo por resultado ya se ha disparado.</p>

<h2>Cómo la IA analiza creativos antes de que cansen</h2>
<p>Los modelos de visión artificial como <strong>Gemini Vision</strong> pueden analizar cada frame de un video publicitario y predecir su "vida útil creativa" basándose en:</p>
<ul>
<li><strong>Complejidad visual</strong>: Imágenes más complejas retienen atención más tiempo</li>
<li><strong>Contraste emocional</strong>: Creativos con narrativa emocional resisten mejor la repetición</li>
<li><strong>Variación cromática</strong>: Paletas diversas en distintos formatos extienden la frescura</li>
<li><strong>Coherencia marca-mensaje</strong>: Alineación entre copy e imagen mejora la retención</li>
</ul>

<h2>El método de auditoría 3-capas</h2>
<p>En <a href="/" className="font-bold border-b border-[#ff477b]/30 hover:border-[#ff477b] text-[#ff477b]"><strong>INsitu AI</strong></a> utilizamos un sistema exclusivo de evaluación continua de <strong>tres capas simultáneas</strong>:</p>
<ol>
<li><strong>Capa semántica (GPT-4o)</strong>: Evalúa el copy del anuncio, analiza propuesta de valor, call-to-action y urgencia percibida</li>
<li><strong>Capa visual (Gemini Vision)</strong>: Analiza composición, jerarquía visual, uso del color y legibilidad en mobile</li>
<li><strong>Capa de rendimiento (Claude)</strong>: Cruza el análisis creativo con datos históricos de performance para predecir ROAS esperado</li>
</ol>

<h2>Resultados medibles</h2>
<p>Las agencias que implementan auditorías de creativos con IA reportan:</p>
<ul>
<li>Reducción del 35% en "Ad Spend Waste" (gasto en creativos fatigados)</li>
<li>Incremento del 45% en la vida útil promedio de los anuncios</li>
<li>Mejora del 28% en CTR al rotar creativos basándose en predicciones de IA</li>
</ul>

<p><strong>El ojo humano es brillante para crear. Pero la IA es imbatible para predecir cuándo ese brillante creativo dejará de funcionar.</strong></p>`,
        excerpt: 'El 67% de campañas fallan por fatiga creativa no detectada. Aprende el método de auditoría 3-capas con IA (GPT-4o + Gemini Vision + Claude) para predecir vida útil de tus anuncios.',
        category: 'AI',
        status: 'published',
        featuredImage: '/blog/ai-creative-audit.png',
        tags: ['creativos publicitarios', 'IA', 'fatiga publicitaria', 'auditoría', 'Gemini Vision', 'GPT-4o', 'LLM'],
        authorId: 'admin',
        authorName: 'Franklin Sanchez',
        authorPicture: '',
        metaTitle: 'Auditoría de creativos con IA: Detectar fatiga publicitaria | INsitu AI',
        metaDescription: 'Método de auditoría 3-capas con GPT-4o, Gemini Vision y Claude para detectar fatiga publicitaria. Reduce 35% de gasto en creativos agotados.',
        keywords: ['auditoría creativos IA', 'fatiga publicitaria', 'análisis visual IA', 'Gemini Vision publicidad', 'creativos ads IA'],
        readingTime: '6 min',
        publishedAt: now - 259200000, // 3 days ago
        updatedAt: now - 259200000,
    },
    {
        id: 'seed-creative-hub-tutorial-2026',
        title: 'Tutorial: Dominando el Creative Hub (Flow Workspace)',
        slug: 'tutorial-dominando-creative-hub-flow-workspace',
        content: `<h2>El Centro de Comando para tu Creatividad</h2>
<p>El <strong>Creative Hub</strong> es tu espacio de trabajo unificado ("Flow Workspace") donde convergen la inteligencia artificial, el diseño cinemático y la automatización narrativa. Aquí te explicamos cómo sacar el máximo provecho de esta herramienta y centralizar tu producción de imágenes estáticas y video en movimiento sin fricciones.</p>

<h2>1. Generador de Flujo Narrativo</h2>
<p>En la barra superior, encontrarás el <strong>Narrative Engine</strong>. Al escribir un <em>prompt global</em> (ej: "Un escenario cyberpunk con luces neón y lluvia"), la plataforma utiliza Gen-AI para definir el universo de tu producción. El botón <strong>Generar Flujo</strong> automatiza la creación de los primeros segmentos o "tomas", dejándolas listas para ser renderizadas con un estilo consistente.</p>

<h2>2. Modalidades: Imagen vs Motion (Veo)</h2>
<p>El núcleo de cada toma está en tu decisión creativa. Cada segmento te permite seleccionar entre:</p>
<ul>
<li><strong>📸 Static (Imagen)</strong>: Utiliza los modelos más avanzados de imagen estática ultra-realista. Perfecto para creativos de banners o posts inmediatos.</li>
<li><strong>🎬 Motion (Veo)</strong>: Aprovecha la integración de la IA cinemática para generar clips de video a partir de ese mismo segmento, todo desde el mismo panel de control.</li>
</ul>

<h2>3. Dirección Cinematográfica Asistida</h2>
<p>No necesitas ser un experto en fotografía. El panel flotante incluye botones rápidos (<em>cinematic presets</em>):</p>
<ul>
<li><strong>Lens (Lente)</strong>: Agrega la etiqueta perfecta a tu prompt para lograr primeros planos macro, seguimientos de cámara o tomas panorámicas ("Cinematic Wide").</li>
<li><strong>Atmosphere (Iluminación)</strong>: Desde <em>Golden Hour</em> (luz de atardecer) hasta un misterioso <em>Neon Noir</em>. Haz clic y la IA se encargará de ajustar los matices.</li>
</ul>

<h2>4. Mastering Aesthetic (Postprocesado)</h2>
<p>A la derecha, en el <strong>Production Hub</strong>, la sección "Mastering Aesthetic" altera los tonos, saturaciones y contraste visual <em>en tiempo real</em>. Prueba el estilo "Cyber" o "Vintage" para unificar todas tus tomas generadas con una capa visual compartida.</p>

<h2>5. Línea de Tiempo y Render Final</h2>
<p>En el panel inferior (<em>Filmstrip Timeline</em>) tienes todas tus secuencias ordenadas. Puedes inyectar nuevas escenas vacías, arrastrar orden, refinar prompts visuales y visualizar simultáneamente el estatus de renderización. Una vez terminadas las tomas, el botón de <strong>Render Final</strong> procesará un único video fluido de todo tu trabajo.</p>

<p><em>¿Listo para empezar? Navega al Creative Hub en la sección "Estudio de Creación" y dirije tu primera obra híbrida de IA.</em></p>`,
        excerpt: 'Aprende paso a paso cómo dominar el Flow Workspace del Creative Hub. Genera y unifica imágenes ultra-realistas y video con IA (Veo) en una sola línea de tiempo.',
        category: 'Tutorials',
        status: 'published',
        featuredImage: '/blog/creative-hub-tutorial.png',
        tags: ['tutorial', 'creative hub', 'flow workspace', 'generador de video', 'inteligencia artificial', 'IA generativa'],
        authorId: 'admin',
        authorName: 'Franklin Sanchez',
        authorPicture: '',
        metaTitle: 'Tutorial: Dominando el Creative Hub (Flow Workspace) | INsitu AI',
        metaDescription: 'Guía completa sobre cómo utilizar el Creative Hub (Flow Workspace). Aprende a producir videos (Veo) o renderizar imágenes combinando modelos de IA.',
        keywords: ['tutorial creative hub', 'como usar flujo de trabajo', 'INsitu AI tutorial', 'flujo creativo inteligencia artificial'],
        readingTime: '5 min',
        publishedAt: now,
        updatedAt: now,
    },
    {
        id: 'seed-tutorial-auditoria-ads-2026',
        title: 'Tutorial: Auditoría de Google Ads con IA (Search & PMax)',
        slug: 'tutorial-auditoria-google-ads-ia',
        content: `<h2>El analista perfecto en segundos</h2>
<p>La Auditoría de Google Ads de INsitu AI revisa tus anuncios y keywords para detectar fugas de presupuesto ("Ad Spend Waste") con precisión robótica. A continuación te detallamos cómo ejecutar tu primera auditoría.</p>

<img src="/assets/tutorial-ads-1.png" alt="Pantalla de entrada de Auditoría Ads" style="border-radius: 0.75rem; border: 1px solid rgba(255, 71, 123, 0.2); margin: 1.5rem 0; width: 100%; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);" />

<h2>1. Ingreso del Contexto (SearchInterface)</h2>
<p>Dirígete a la pestaña principal del <strong>Analyzer</strong>. Aquí debes detallar brevemente el negocio, URL o cuenta a la cual vas a realizar el diagnóstico. Si especificas el objetivo (ROAS, CPA), la IA ajustará sus baremos.</p>

<h2>2. Interpretación de la Tarjeta de Resultados (ResultCard)</h2>
<p>Una vez completado el procesamiento, se generará tu reporte visual interactivo. Aquí destacan dos componentes críticos:</p>
<ul>
<li><strong>Health Score:</strong> Indicador verde, amarillo o rojo sobre la salud general de tu estructura (keywords irrelevantes, CPC fuera de rango, extensiones faltantes).</li>
<li><strong>Radar de Rendimiento:</strong> Evalúa la relación Costo-Beneficio actual vs el potencial de mejora sugerido por la IA.</li>
</ul>

<img src="/assets/tutorial-ads-2.png" alt="Análisis de ResultCard y Gráficas" style="border-radius: 0.75rem; border: 1px solid rgba(255, 71, 123, 0.2); margin: 1.5rem 0; width: 100%; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);" />

<h2>3. Retroalimentación de la IA</h2>
<p>Usa el sistema de retroalimentación <em>(Feedback Widget)</em> en el reporte para dictarle a la IA qué tan accionable fue su respuesta. Este mecanismo entrena futuras auditorías para tu perfil.</p>`,
        excerpt: 'Paso a paso para auditar campañas de Google Ads (Search & PMax). Aprende a interpretar el Health Score y entrenar a la IA a través del Feedback Loop.',
        category: 'Tutorials',
        status: 'published',
        featuredImage: '/assets/tutorial-ads-cover.png',
        tags: ['tutorial', 'google ads', 'auditoría', 'SEM', 'optimización', 'IA'],
        authorId: 'admin',
        authorName: 'Franklin Sanchez',
        authorPicture: '',
        metaTitle: 'Tutorial: Auditoría de Google Ads con Inteligencia Artificial | INsitu AI',
        metaDescription: 'Aprende a ejecutar una auditoría profunda de Google Ads, interpretar el Health Score y retroalimentar a la IA.',
        keywords: ['tutorial auditoría google ads', 'INsitu AI ads', 'optimizar google ads con ia'],
        readingTime: '4 min',
        publishedAt: now + 1000,
        updatedAt: now + 1000,
    },
    {
        id: 'seed-tutorial-auditoria-imagen-2026',
        title: 'Tutorial: Auditoría de Imagen con Heatmap Neuro-Visual',
        slug: 'tutorial-auditoria-imagen-ia-neuro-visual',
        content: `<h2>Entiende el Carga Cognitiva de tus Creativos</h2>
<p>Nuestra Auditoría de Imagen IA utiliza el poder de Gemini Vision y algoritmos de contraste cognitivo para simular el desplazamiento y la jerarquía visual humana, revelando qué atrae realmente la mirada en tus banners.</p>

<img src="/assets/tutorial-img-1.png" alt="Carga de la imagen y análisis Heatmap" style="border-radius: 0.75rem; border: 1px solid rgba(168, 85, 247, 0.2); margin: 1.5rem 0; width: 100%; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);" />

<h2>1. Selecciona el Modal de Imagen IA</h2>
<p>En el menú superior, ingresa a la opción <strong>Imagen IA</strong>. Puedes importar un cuadro extraído o subir tu banner final directamente al sistema.</p>

<h2>2. Generación del Mapa de Calor (Heatmap)</h2>
<p>Al auditar, INsitu procesa la imagen para generar una superposición térmica. Las áreas rojas indican máxima atención esperada, mientras que las azules son virtualmente ignoradas en los primeros 3 segundos.</p>

<h2>3. Métrica de Cognitive Load (Carga Cognitiva)</h2>
<p>Revisa el indicador de <strong>Cognitive Load</strong>. Si la barra marca "Sobrecarga" (rojo), significa que el anuncio contiene demasiado texto, logos conflictivos o falta de contraste entre figura y fondo. Ajusta en el Creative Hub en base a las zonas de calor.</p>

<img src="/assets/tutorial-img-2.png" alt="Ajuste táctico visual del banner" style="border-radius: 0.75rem; border: 1px solid rgba(168, 85, 247, 0.2); margin: 1.5rem 0; width: 100%; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);" />

<p><em>Tip de optimización:</em> Prioriza situar botones o Call-to-actions en las transiciones de verde a amarillo sobre tu heatmap analizado.</p>`,
        excerpt: 'Aprende a identificar la Carga Cognitiva y los mapas de calor predictivo en la Auditoría de Imagen. Descubre si tu llamado a la acción pasa desapercibido.',
        category: 'Tutorials',
        status: 'published',
        featuredImage: '/assets/tutorial-img-cover.png',
        tags: ['tutorial', 'imagen', 'heatmap', 'neuro-visual', 'creativos', 'auditoría'],
        authorId: 'admin',
        authorName: 'Franklin Sanchez',
        authorPicture: '',
        metaTitle: 'Tutorial: Auditoría de Imagen con Mapa de Calor Visual | INsitu AI',
        metaDescription: 'Comprende el "Cognitive Load" y la atención de tus anuncios gráficos mediante la auditoría visual automatizada de Gemini Vision.',
        keywords: ['mapa de calor anuncios', 'auditoría imagen ia', 'cognitive load marketing'],
        readingTime: '5 min',
        publishedAt: now + 2000,
        updatedAt: now + 2000,
    },
    {
        id: 'seed-tutorial-auditoria-video-2026',
        title: 'Tutorial: Frame Analysis y Auditoría de Video IA',
        slug: 'tutorial-auditoria-video-ia-frame-analysis',
        content: `<h2>El Reto de la Retención de los Primeros 3 Segundos</h2>
<p>La mitad de los usuarios escrolean si tu gancho es débil. La Auditoría de Video (Video IA) analiza frame-a-frame la estructura temporal, la energía visual y la narrativa emocional de tu micro-video o anuncio.</p>

<img src="/assets/tutorial-video-1.png" alt="Subida de video y panel Frame-by-Frame" style="border-radius: 0.75rem; border: 1px solid rgba(59, 130, 246, 0.2); margin: 1.5rem 0; width: 100%; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);" />

<h2>1. Ingresa a la Auditoría de Video</h2>
<p>Accede al módulo <strong>Video IA</strong>. Sube archivos en formato MP4 o WebM preferiblemente cortos (formato Reel/TikTok o anuncios de 15 segundos).</p>

<h2>2. Analizador de Ganchos (Hook Analysis)</h2>
<p>Observa el panel de análisis temporal. La IA segmenta y valora independientemente:</p>
<ul>
<li><strong>El Gancho (0s - 3s):</strong> Evalúa patrón visual, texto en pantalla inicial y sorpresa.</li>
<li><strong>El Retenedor/Contenido:</strong> ¿Es suficiente el movimiento en pantalla o hay planos estáticos demasiado largos?</li>
<li><strong>El Llamado a la Acción final:</strong> Métrica de cierre.</li>
</ul>

<img src="/assets/tutorial-video-2.png" alt="Análisis de retención visual y velocidad de la toma" style="border-radius: 0.75rem; border: 1px solid rgba(59, 130, 246, 0.2); margin: 1.5rem 0; width: 100%; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);" />

<h2>3. Velocidad de Edición y Cambio de Cámara</h2>
<p>El reporte también entrega recomendaciones sobre si requieres "Jump Cuts" (cortes de cámara directos) más rápidos para adaptarse al algoritmo nativo de la red recomendada (ej. TikTok vs LinkedIn).</p>`,
        excerpt: 'Domina la auditoría publicitaria audiovisual. Aprende cómo la herramienta evalúa Hooks (primeros 3 segundos), ritmo de edición y la narrativa continua.',
        category: 'Tutorials',
        status: 'published',
        featuredImage: '/assets/tutorial-video-cover.png',
        tags: ['tutorial', 'video', 'frame by frame', 'tiktok ads', 'retención', 'auditoria de video'],
        authorId: 'admin',
        authorName: 'Franklin Sanchez',
        authorPicture: '',
        metaTitle: 'Tutorial: Frame Analysis - Auditoría de Video | INsitu AI',
        metaDescription: 'Eleva el ROAS al mejorar el hook y la retención con la auditoría de video IA frame-by-frame de INsitu.',
        keywords: ['auditoría video ads', 'retención 3 segundos ia', 'optimización micro video'],
        readingTime: '5 min',
        publishedAt: now + 3000,
        updatedAt: now + 3000,
    },
    {
        id: 'seed-tutorial-ads-optimizer-2026',
        title: 'Tutorial: Ads Optimizer. De la Auditoría a la Ejecución',
        slug: 'tutorial-optimizado-campanas-ia',
        content: `<h2>El puente automático a tu campaña</h2>
<p>Identificar errores es solo la primera mitad del trabajo. El módulo <strong>Ads Optimizer</strong> traduce las anomalías encontradas en tu auditoría directas a acciones, proponiendo nuevos ad copies y estrategias de corrección presupuestal.</p>

<img src="/assets/tutorial-optimizer-1.png" alt="Panel de Ads Optimizer activo" style="border-radius: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.1); margin: 1.5rem 0; width: 100%; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);" />

<h2>1. Acceder al Optimizer desde tu Panel</h2>
<p>Tras completar una auditoría en Google Ads o un Chequeo de Tráfico SEO, haz clic directamente en <strong>Optimizar Campaña</strong> o entra a la pestaña "Optimizador". El módulo absorbe inteligentemente el contexto del problema original.</p>

<h2>2. Modificador Automático de Audiencias</h2>
<p>Si la IA dictaminó "CTR bajo", generará tácticas específicas como:</p>
<ul>
<li>Ajuste de edad y perfiles demográficos.</li>
<li>Expansión Semántica (nuevas agrupaciones de palabras clave).</li>
</ul>

<img src="/assets/tutorial-optimizer-2.png" alt="Sugerencias de Ad Copy auto generadas" style="border-radius: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.1); margin: 1.5rem 0; width: 100%; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);" />

<h2>3. Extracción de Extensiones y Ad Copy</h2>
<p>Copia los RSA (Responsive Search Ads) propuestos. INsitu los diseña teniendo en cuenta límite de caracteres, títulos gancho "Headlines", descripciones contextuales y sugerencia de Extensiones de Sitio.</p>
<p>Exporta toda esta información final mediante nuestro botón "Exportar a PDF" para presentarlo directamente al ejecutivo de cuenta o a tu cliente con formato prístino.</p>`,
        excerpt: 'Transforma problemas reportados en correcciones inmediatas. Aprende cómo Ads Optimizer te genera Ad Copies en formato Google RSA y modifica audiencias on-the-fly.',
        category: 'Tutorials',
        status: 'published',
        featuredImage: '/assets/tutorial-optimizer-cover.png',
        tags: ['tutorial', 'ads optimizer', 'ad copy', 'automatización', 'arquitectura rsa'],
        authorId: 'admin',
        authorName: 'Franklin Sanchez',
        authorPicture: '',
        metaTitle: 'Tutorial: Ads Optimizer y Ejecución en Plataforma | INsitu AI',
        metaDescription: 'Cómo el Ads Optimizer de INsitu genera Responsive Search Ads (RSA), y ajustes de audiencia derivados directamente de los reportes de Google.',
        keywords: ['ads optimizer', 'ad copy generator ai', 'optimizar grupos anuncios', 'tutorial in-situ'],
        readingTime: '4 min',
        publishedAt: now + 4000,
        updatedAt: now + 4000,
    }
];

/**
 * franklinsanchez.com WordPress RSS feed config
 * Used to fetch posts tagged with AI/LLM from the external blog
 */
export const EXTERNAL_BLOG_CONFIG = {
    name: 'Franklin Sanchez Blog',
    baseUrl: 'https://maxi.franklinsanchez.com',
    // WordPress REST API — posts tagged/categorized with "insitu" are fetched via the proxy
    feedUrl: 'https://maxi.franklinsanchez.com/wp-json/wp/v2/posts?tags={insitu_tag_id}&per_page=20&_embed',
    rssUrl: 'https://maxi.franklinsanchez.com/feed/',
    tags: ['insitu'],
};

export interface ExternalBlogPost {
    id: number;
    title: string;
    excerpt: string;
    content: string;
    link: string;
    featuredImage: string;
    date: string;
    author: string;
    categories: string[];
}

/**
 * Fetch posts from franklinsanchez.com through our internal proxy
 * This avoids CORS issues and provides sanitized/adapted content
 */
export async function fetchFranklinSanchezPosts(): Promise<ExternalBlogPost[]> {
    try {
        const res = await fetch('/api/blog-external');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (error) {
        console.warn('[ExternalBlog] Could not fetch from proxy:', error);
        return [];
    }
}

/**
 * Seed the blog with initial posts if empty
 */
export function seedBlogIfEmpty(): void {
    const BLOG_KEY = 'insitu_blog_posts';
    try {
        const existing = JSON.parse(localStorage.getItem(BLOG_KEY) || '[]');
        if (existing.length === 0) {
            localStorage.setItem(BLOG_KEY, JSON.stringify(SEED_POSTS));
            console.log('[BlogSeed] Seeded 3 initial blog posts');
        }
    } catch {
        localStorage.setItem(BLOG_KEY, JSON.stringify(SEED_POSTS));
    }
}
