/**
 * Netlify Edge Function: SEO Pre-rendering for Crawlers
 *
 * Intercepts requests from bots (Googlebot, facebookexternalhit, etc.)
 * and injects route-specific <meta> tags AND pre-rendered HTML content
 * into <div id="root"> so crawlers don't depend on JavaScript rendering.
 *
 * This ensures correct indexing by search engines for an SPA
 * and proper social media previews when sharing links.
 */

// ── SEO Data ───────────────────────────────────────────────────────

const SITE_URL = 'https://insitu.company';
const SITE_NAME = 'insitu.company';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

interface RouteData {
    title: string;
    description: string;
    path: string;
    ogType?: string;
    ogImage?: string;
    /** Pre-rendered HTML content injected inside <div id="root"> for bots */
    prerenderedContent?: string;
}

// ── Pre-rendered HTML content for key routes ───────────────────────
// Mirrors the actual React component output so crawlers see real content
// without needing to execute JavaScript.

const HOME_CONTENT = `
<div data-prerendered="true">
  <header>
    <nav aria-label="Main navigation">
      <a href="/" aria-label="insitu.company Home">insitu.company</a>
      <ul>
        <li><a href="#pricing">Planes</a></li>
        <li><a href="/blog">Blog</a></li>
        <li><a href="#casos-de-uso">Servicios</a></li>
        <li><a href="/contact">Contacto</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <section aria-label="Hero">
      <h1>insitu.company — Plataforma de Optimización de Ads con IA Multimodal</h1>
      <p>insitu.company es el laboratorio de investigación de IA aplicado al marketing lider en Latinoamerica. Nuestra plataforma SaaS utiliza Gemini, GPT-4o y Claude en un pipeline paralelo para auditar y optimizar campanas en Google Ads, Meta Ads y TikTok Ads.</p>
      <p>Auditoria de copy SEM, analisis neuro-visual de imagenes con heatmaps, analisis de retencion de video publicitario, deteccion de keywords negativas y Brand Safety.</p>
      <a href="#pricing">Auditoria Gratis</a>
    </section>

    <section aria-label="Estadisticas">
      <div><strong>+500%</strong> <span>ROI promedio en los primeros 3 meses</span></div>
      <div><strong>24/7</strong> <span>Optimizacion automatizada sin parar</span></div>
      <div><strong>Top Tier AI</strong> <span>Gemini, GPT-4o y Claude</span></div>
    </section>

    <section id="como-funciona" aria-label="Como funciona">
      <h2>De cero a ROI explosivo en 3 pasos</h2>
      <p>Nuestra plataforma automatiza todo el flujo de trabajo de optimizacion publicitaria. Sin configuracion compleja, sin curva de aprendizaje.</p>
      <ol>
        <li>
          <h3>Acelera tus resultados</h3>
          <p>Obten un diagnostico completo de tus campanas en minutos, no en dias. Nuestra IA detecta puntos ciegos en copy, keywords y creativos que estan frenando tu ROAS.</p>
        </li>
        <li>
          <h3>La IA analiza todo</h3>
          <p>Gemini, GPT-4o y Claude trabajan en paralelo para auditar copy, landing pages, keywords negativas, creativos de imagen y retencion de video.</p>
        </li>
        <li>
          <h3>Recibe insights accionables</h3>
          <p>Obten recomendaciones priorizadas por impacto estimado en ROAS. Reportes PDF White-label listos para enviar a tus clientes.</p>
        </li>
      </ol>
    </section>

    <section id="features" aria-label="Caracteristicas">
      <h2>Caracteristicas Principales</h2>

      <article>
        <h3>Insights de Palabras Clave</h3>
        <p>Nuestra IA no solo rastrea, predice. Descubre tendencias antes que tu competencia y ajusta tus pujas de forma dinamica basandose en el analisis semantico.</p>
        <ul>
          <li>Deteccion de palabras clave negativas automaticas</li>
          <li>Prediccion de intencion de busqueda avanzada</li>
          <li>Dashboard de visualizacion en tiempo real</li>
        </ul>
      </article>

      <article>
        <h3>Vigilancia de Competidores 24/7</h3>
        <p>No esperes a que te quiten mercado. Recibe alertas en tiempo real cuando tus competidores lancen nuevos anuncios o cambien su stack tecnologico.</p>
        <ul>
          <li>Scanner oficial de Google, Meta y TikTok Ads</li>
          <li>Deteccion de cambios tecnologicos en tiempo real</li>
          <li>Alertas de relevancia por Inteligencia Artificial</li>
        </ul>
      </article>

      <article>
        <h3>Aprendizaje Continuo Activo</h3>
        <p>Tu plataforma se vuelve mas inteligente con cada interaccion. El sistema aprende de tu feedback y ajusta sus prompts para darte insights cada vez mas precisos.</p>
        <ul>
          <li>Bucle de retroalimentacion obligatorio y accionable</li>
          <li>Auto-generacion de reglas de inyeccion de prompts</li>
          <li>Personalizacion profunda por estilo de marca</li>
        </ul>
      </article>
    </section>

    <section id="casos-de-uso" aria-label="Casos de uso">
      <h2>Para quien es insitu.company</h2>

      <article>
        <h3>Freelancers y Solopreneurs</h3>
        <p>Optimiza tu copy SEM, detecta keywords negativas y genera reportes profesionales sin necesidad de un equipo de analistas.</p>
      </article>
      <article>
        <h3>Agencias de Marketing</h3>
        <p>Gestiona decenas de cuentas simultaneamente. Reportes white-label, auditorias masivas de creativos y Brand Guardian automatico.</p>
      </article>
      <article>
        <h3>E-commerce y DTC</h3>
        <p>Maximiza el ROAS de tus campanas de Shopping, analiza la retencion de tus videos de producto y optimiza catalogos.</p>
      </article>
      <article>
        <h3>Marcas Corporativas</h3>
        <p>Supervision de compliance de marca a escala, analisis de consistencia cross-channel y dashboards ejecutivos con AI-driven insights.</p>
      </article>
    </section>

    <section id="testimonios" aria-label="Testimonios">
      <h2>Lo que dicen nuestros clientes</h2>

      <blockquote>
        <p>insitu.company redujo nuestro costo por lead en un 42% en solo 3 semanas. La auditoria neuronal detecto keywords negativas que llevabamos meses desperdiciando presupuesto.</p>
        <footer><cite>Maria Garcia</cite> — Head of Growth, TechStartup MX</footer>
      </blockquote>
      <blockquote>
        <p>La funcion de Brand Guardian es un game-changer para agencias. Supervisamos el cumplimiento de marca de +50 clientes automaticamente. Es como tener un equipo de QA 24/7.</p>
        <footer><cite>Carlos Mendoza</cite> — Director de Operaciones, AdFactory</footer>
      </blockquote>
      <blockquote>
        <p>El analisis de retencion de video nos ayudo a identificar exactamente en que segundo perdiamos atencion. Nuestro CTR en TikTok Ads subio un 87%.</p>
        <footer><cite>Ana Torres</cite> — Content Strategist, E-commerce LATAM</footer>
      </blockquote>
    </section>

    <section id="pricing" aria-label="Planes y precios">
      <h2>Planes Flexibles</h2>

      <article>
        <h3>ON-SITE (Starter)</h3>
        <p>Ideal para freelancers y solopreneurs. Optimiza copy y SEO rapido.</p>
        <p><strong>Precio: $29 USD por mes</strong></p>
        <ul>
          <li>Cuota: 1,750 Tokens mensuales</li>
          <li>Auditoria SEM y SEO completa</li>
          <li>Analisis Neuro-Visual de imagenes</li>
          <li>Generacion de imagenes con IA (Lite)</li>
          <li>Audio Hub (Basico)</li>
        </ul>
      </article>

      <article>
        <h3>DEEP SCAN (Growth) — Mas Popular</h3>
        <p>Para agencias y e-commerce. Contenido visual y video que convierte.</p>
        <p><strong>Precio: $49 USD por mes</strong></p>
        <ul>
          <li>Cuota: 7,500 Tokens mensuales</li>
          <li>Todo lo del plan Starter</li>
          <li>Analisis de Video Pro</li>
          <li>Creative Lab (Video/Retail/Motion)</li>
          <li>Ads Optimizer Pro</li>
        </ul>
      </article>

      <article>
        <h3>OMNI-CHANNEL (Agency)</h3>
        <p>Para grandes marcas y agencias. Supervision total y brand compliance.</p>
        <p><strong>Precio: Contactar para cotizacion personalizada</strong></p>
        <ul>
          <li>Cuota: 50,000 Tokens mensuales</li>
          <li>Brand Guardian y Briefing Lab</li>
          <li>Intelligent Feedback Loop</li>
          <li>White Label y Generation API</li>
          <li>Competitor Tracker (Pro Alerts)</li>
        </ul>
      </article>
    </section>

    <section id="faq" aria-label="Preguntas frecuentes">
      <h2>Preguntas Frecuentes</h2>

      <details>
        <summary>Que es insitu.company?</summary>
        <p>insitu.company es una plataforma SaaS de inteligencia artificial disenada para auditar, optimizar y planificar campanas publicitarias en Google Ads, Meta Ads y TikTok Ads. Utiliza tres modelos de IA (Gemini, GPT-4o y Claude) trabajando en paralelo para ofrecer analisis multimodal de copy, imagenes y video.</p>
      </details>
      <details>
        <summary>Cuanto cuesta insitu.company?</summary>
        <p>Ofrecemos tres planes: ON-SITE (Starter) desde $29/mes, DEEP SCAN (Growth) desde $49/mes, y OMNI-CHANNEL (Agency) con precios personalizados. Todos los planes incluyen una prueba gratuita.</p>
      </details>
      <details>
        <summary>Con que plataformas es compatible?</summary>
        <p>insitu.company es compatible con Google Ads (Search, Shopping, Performance Max, Display, YouTube), Meta Ads (Facebook e Instagram) y TikTok Ads. Tambien analiza landing pages y PageSpeed.</p>
      </details>
      <details>
        <summary>Que modelos de IA utiliza?</summary>
        <p>Utilizamos Google Gemini 2.0, OpenAI GPT-4o y Anthropic Claude en un pipeline de procesamiento paralelo. Cada modelo aporta fortalezas complementarias para maximizar la precision del analisis.</p>
      </details>
      <details>
        <summary>Que es Brand Guardian?</summary>
        <p>Brand Guardian es nuestro modulo de supervision de marca que verifica automaticamente que todos los creativos y copies cumplan con las directrices de marca del cliente, incluyendo tono de voz, paleta de colores y mensajes clave.</p>
      </details>
      <details>
        <summary>Puedo usarlo gratis?</summary>
        <p>Si. Ofrecemos una auditoria gratuita para que pruebes la plataforma sin compromiso. No se requiere tarjeta de credito para empezar.</p>
      </details>
    </section>

    <section aria-label="Llamada a la accion">
      <h2>Listo para transformar tus campanas con IA?</h2>
      <p>Comienza con una auditoria gratuita y descubre como insitu.company puede optimizar tu inversion publicitaria desde el primer dia.</p>
      <a href="#pricing">Auditoria Gratis</a>
      <a href="#pricing">Ver Planes y Precios</a>
      <p>Sin tarjeta de credito. Setup en 2 minutos. Cancela cuando quieras.</p>
    </section>
  </main>

  <footer>
    <p>&copy; 2024-2026 insitu.company. Todos los derechos reservados.</p>
    <nav aria-label="Footer navigation">
      <a href="/privacy">Politica de Privacidad</a>
      <a href="/terms">Terminos de Servicio</a>
      <a href="/security">Seguridad</a>
      <a href="/contact">Contacto</a>
      <a href="/blog">Blog</a>
      <a href="/glossary">Glosario</a>
    </nav>
  </footer>
</div>`;

const PRICING_CONTENT = `
<div data-prerendered="true">
  <header><nav><a href="/">INsitu AI</a></nav></header>
  <main>
    <h1>Planes y Precios — INsitu AI</h1>
    <p>Planes flexibles para freelancers, agencias y marcas corporativas. Comienza gratis, escala cuando quieras.</p>
    <section>
      <article><h2>ON-SITE (Starter)</h2><p>Precio: $29 USD/mes. Cuota: 1,750 tokens mensuales. Auditoria SEM y SEO, analisis neuro-visual, generacion de imagenes con IA.</p></article>
      <article><h2>DEEP SCAN (Growth)</h2><p>Precio: $49 USD/mes. Cuota: 7,500 tokens mensuales. Todo lo del Starter mas analisis de video pro, Creative Lab y Ads Optimizer Pro.</p></article>
      <article><h2>OMNI-CHANNEL (Agency)</h2><p>Precio: Contactar. Cuota: 50,000 tokens mensuales. Brand Guardian, White Label, Competitor Tracker y soporte prioritario.</p></article>
    </section>
  </main>
</div>`;

const BLOG_CONTENT = `
<div data-prerendered="true">
  <header><nav><a href="/">insitu.company</a></nav></header>
  <main>
    <h1>Blog de Marketing e IA — insitu.company</h1>
    <p>Articulos sobre IA aplicada al marketing, optimizacion de pauta digital, Google Ads, Meta Ads y estrategias de crecimiento.</p>
  </main>
</div>`;

const TRAFFIC_CHECKER_CONTENT = `
<div data-prerendered="true">
  <header><nav><a href="/">insitu.company</a></nav></header>
  <main>
    <article>
      <h1>Auditoría de Tráfico Web y SEO con IA — insitu.company</h1>
      <p>Analiza el tráfico web de cualquier dominio con inteligencia artificial. Descubre fuentes de tráfico, tendencias de búsqueda, métricas de rendimiento y oportunidades de crecimiento SEO técnico.</p>
      <ul>
        <li>Detección de intencionalidad de búsqueda</li>
        <li>Análisis de autoridad de dominio (DR/DA)</li>
        <li>Comparativa de tráfico orgánico vs pagado</li>
      </ul>
      <p>Maximiza tu visibilidad en SERPs utilizando insights generados por Gemini y Claude.</p>
    </article>
  </main>
</div>`;

const IMAGE_AI_CONTENT = `
<div data-prerendered="true">
  <header><nav><a href="/">insitu.company</a></nav></header>
  <main>
    <article>
      <h1>Análisis Neuro-Visual de Imágenes Publicitarias — insitu.company</h1>
      <p>Auditoría de imágenes publicitarias utilizando IA avanzada. Calculamos métricas de carga cognitiva, generamos heatmaps de atención predictivos y calculamos el AOI (Area of Interest) scoring.</p>
      <ul>
        <li>Heatmaps de atención neuronal</li>
        <li>Análisis de consistencia con la identidad de marca</li>
        <li>Recomendaciones de diseño para maximizar el CTR</li>
      </ul>
      <p>Asegura que tus creativos de Meta Ads y Google Display capturen la atención en menos de 2 segundos.</p>
    </article>
  </main>
</div>`;

const VIDEO_AI_CONTENT = `
<div data-prerendered="true">
  <header><nav><a href="/">insitu.company</a></nav></header>
  <main>
    <article>
      <h1>Análisis de Retención y Video Publicitario con IA — insitu.company</h1>
      <p>Optimiza tus videos para TikTok, Reels y YouTube Shorts. Nuestra IA analiza la retención segundo a segundo, detectando los puntos exactos de abandono y evaluando la efectividad de tus hooks.</p>
      <ul>
        <li>Análisis de hooks iniciales</li>
        <li>Detección de picos de engagement</li>
        <li>Optimización de narrativa visual para conversión</li>
      </ul>
      <p>Mejora el watch time y el ROI de tus campañas de video publicitario.</p>
    </article>
  </main>
</div>`;

const CAMPAIGNS_CONTENT = `
<div data-prerendered="true">
  <header><nav><a href="/">insitu.company</a></nav></header>
  <main>
    <article>
      <h1>Optimizador de Campañas Google Ads & Ads Intelligence — insitu.company</h1>
      <p>Optimiza tus campañas de Google Ads (Search, PMax, YouTube) con inteligencia artificial. Nuestro sistema audita tus copies, detecta anomalías en el Quality Score y recomienda keywords negativas automáticas para ahorrar presupuesto.</p>
      <ul>
        <li>Auditoría de Search Ads y RSA</li>
        <li>Simulador de presupuesto y funnel de conversión</li>
        <li>Detección de keywords negativas inteligentes</li>
      </ul>
      <p>Maximiza tu ROAS eliminando el desperdicio de presupuesto en clics irrelevantes.</p>
    </article>
  </main>
</div>`;

const TECHNOLOGY_CONTENT = `
<div data-prerendered="true">
  <header><nav><a href="/">insitu.company</a></nav></header>
  <main>
    <article>
      <h1>Nuestra Tecnología de IA — insitu.company</h1>
      <p>Descubre cómo INsitu AI combina Gemini, GPT-4o y Claude en un pipeline multimodal para optimizar campañas publicitarias.</p>
    </article>
  </main>
</div>`;

const GENERIC_CONTENT = `
<div data-prerendered="true">
  <header><nav><a href="/">insitu.company</a></nav></header>
  <main>
    <h1>insitu.company — Optimizacion de Ads con IA</h1>
    <p>Plataforma SaaS de inteligencia artificial para auditar, optimizar y planificar campanas publicitarias en Google Ads, Meta Ads y TikTok Ads.</p>
    <a href="/">Ir al inicio</a>
  </main>
</div>`;

// ── Route definitions ──────────────────────────────────────────────

const ROUTES: Record<string, RouteData> = {
    '/': {
        title: 'INsitu AI — Optimización de Google Ads, Meta Ads y TikTok con IA',
        description: 'Plataforma SaaS que usa Gemini, GPT-4o y Claude para auditar campañas de Google Ads, Meta Ads y TikTok. Maximiza tu ROAS con auditorías multimodales.',
        path: '/',
        prerenderedContent: HOME_CONTENT,
    },
    '/pricing': {
        title: 'INsitu AI — Planes y Precios',
        description: 'Planes flexibles desde $29/mes. Starter, Growth y Agency con auditorías ilimitadas, reportes white-label y soporte prioritario.',
        path: '/pricing',
        ogType: 'product',
        prerenderedContent: PRICING_CONTENT,
    },
    '/blog': {
        title: 'INsitu AI — Blog de Marketing e IA',
        description: 'Artículos sobre IA aplicada al marketing, optimización de pauta digital, Google Ads, Meta Ads y estrategias de crecimiento.',
        path: '/blog',
        prerenderedContent: BLOG_CONTENT,
    },
    '/traffic-checker': {
        title: 'INsitu AI — Auditoría de Tráfico Web y SEO',
        description: 'Analiza el tráfico web de cualquier dominio con IA. Descubre fuentes, tendencias, métricas de rendimiento y oportunidades de crecimiento.',
        path: '/traffic-checker',
        ogImage: `${SITE_URL}/og-traffic.jpg`,
        prerenderedContent: TRAFFIC_CHECKER_CONTENT,
    },
    '/technology': {
        title: 'INsitu AI — Nuestra Tecnología de IA',
        description: 'Descubre cómo INsitu AI combina Gemini, GPT-4o y Claude en un pipeline multimodal para optimizar campañas publicitarias.',
        path: '/technology',
        prerenderedContent: TECHNOLOGY_CONTENT,
    },
    '/image-ai': {
        title: 'INsitu AI — Análisis Neuro-Visual de Imágenes Publicitarias',
        description: 'Auditoría de imágenes publicitarias con IA: carga cognitiva, heatmaps, AOI scoring y recomendaciones de optimización creativa.',
        path: '/image-ai',
        ogImage: `${SITE_URL}/og-image-ai.jpg`,
        prerenderedContent: IMAGE_AI_CONTENT,
    },
    '/video-ai': {
        title: 'INsitu AI — Análisis de Retención y Video Publicitario con IA',
        description: 'Analiza la retención de video publicitario con IA. Detecta puntos de abandono, evalúa hooks y optimiza para conversión.',
        path: '/video-ai',
        ogImage: `${SITE_URL}/og-video-ai.jpg`,
        prerenderedContent: VIDEO_AI_CONTENT,
    },
    '/compare-ai': {
        title: 'INsitu AI — Comparar Creativos Publicitarios',
        description: 'Compara dos creativos publicitarios lado a lado con análisis de IA. Identifica el ganador por métricas de atención y persuasión.',
        path: '/compare-ai',
    },
    '/campaigns': {
        title: 'INsitu AI — Optimizador de Campañas Google Ads',
        description: 'Optimiza tus campañas de Google Ads con IA. Análisis de keywords, copy SEM, bid strategy y Quality Score mejorado.',
        path: '/campaigns',
        ogImage: `${SITE_URL}/og-image.jpg`, // Default or shared
        prerenderedContent: CAMPAIGNS_CONTENT,
    },
    '/brand-identity': {
        title: 'INsitu AI — Identidad de Marca con IA',
        description: 'Define y protege la identidad visual de tu marca con IA. Paleta de colores, tipografía, tono de voz y guía de estilo automatizada.',
        path: '/brand-identity',
    },
    '/metrics': {
        title: 'INsitu AI — Panel de Métricas y KPIs',
        description: 'Visualiza las métricas clave de tus auditorías publicitarias: scores, tendencias y benchmarks de la industria.',
        path: '/metrics',
    },
    '/glossary': {
        title: 'INsitu AI — Glosario de Marketing y Publicidad Digital',
        description: 'Glosario completo de términos de marketing digital, publicidad programática, SEM, SEO e inteligencia artificial.',
        path: '/glossary',
    },
    '/contact': {
        title: 'INsitu AI — Contacto',
        description: 'Contáctanos para demo, soporte empresarial o consultas sobre la plataforma INsitu AI.',
        path: '/contact',
    },
    '/privacy': {
        title: 'INsitu AI — Política de Privacidad',
        description: 'Política de privacidad de INsitu AI. Cómo recopilamos, usamos y protegemos tus datos personales.',
        path: '/privacy',
    },
    '/terms': {
        title: 'INsitu AI — Términos de Servicio',
        description: 'Términos y condiciones de uso de la plataforma INsitu AI.',
        path: '/terms',
    },
    '/security': {
        title: 'INsitu AI — Seguridad y Protección de Datos',
        description: 'Cómo protegemos tus datos: encriptación, cumplimiento GDPR, infraestructura segura y certificaciones.',
        path: '/security',
    },
    '/support': {
        title: 'INsitu AI — Centro de Soporte y Ayuda',
        description: 'Centro de soporte de INsitu AI. Documentación, base de conocimientos, FAQ y contacto con el equipo de soporte.',
        path: '/support',
    },
};

// ── Bot User-Agent patterns ─────────────────────────────────────

const BOT_PATTERNS = [
    'googlebot',
    'bingbot',
    'yandexbot',
    'duckduckbot',
    'baiduspider',
    'facebookexternalhit',
    'facebot',
    'twitterbot',
    'linkedinbot',
    'slackbot',
    'whatsapp',
    'telegrambot',
    'discordbot',
    'pinterestbot',
    'applebot',
    'petalbot',
    'semrushbot',
    'ahrefsbot',
    'dotbot',
    'rogerbot',
    'embedly',
    'quora link preview',
    'outbrain',
    'vkshare',
    'w3c_validator',
    'redditbot',
    'gptbot',
    'oai-searchbot',
    'claude-web',
    'anthropic-ai',
    'perplexitybot',
    'google-inspectiontool',
    'google-adwords',
    'adsbot-google',
    'google-safety-checks',
    'google-web-preview',
    'headlesschrome',
];

function isBot(userAgent: string): boolean {
    const ua = userAgent.toLowerCase();
    return BOT_PATTERNS.some((pattern) => ua.includes(pattern));
}

// ── HTML manipulation ──────────────────────────────────────────────

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Inject SEO meta tags into the HTML response for bot requests.
 */
function injectMetaTags(html: string, route: RouteData): string {
    const canonicalUrl = `${SITE_URL}${route.path}`;
    const ogType = route.ogType || 'website';
    const ogImage = DEFAULT_OG_IMAGE;

    html = html.replace(
        /<title>[^<]*<\/title>/i,
        `<title>${escapeHtml(route.title)}</title>`
    );
    html = html.replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="description" content="${escapeHtml(route.description)}" />`
    );
    html = html.replace(
        /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
        `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
    );
    html = html.replace(
        /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
    );
    html = html.replace(
        /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:title" content="${escapeHtml(route.title)}" />`
    );
    html = html.replace(
        /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:description" content="${escapeHtml(route.description)}" />`
    );
    html = html.replace(
        /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:type" content="${ogType}" />`
    );
    html = html.replace(
        /<meta\s+(?:property|name)="og:image"\s+content="[^"]*"\s*\/?>/i,
        `<meta property="og:image" content="${escapeHtml(route.ogImage || ogImage)}" />`
    );
    html = html.replace(
        /<meta\s+(?:property|name)="twitter:image"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:image" content="${escapeHtml(route.ogImage || ogImage)}" />`
    );
    html = html.replace(
        /<meta\s+(?:property|name)="twitter:url"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:url" content="${escapeHtml(canonicalUrl)}" />`
    );
    html = html.replace(
        /<meta\s+(?:property|name)="twitter:title"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:title" content="${escapeHtml(route.title)}" />`
    );
    html = html.replace(
        /<meta\s+(?:property|name)="twitter:description"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="twitter:description" content="${escapeHtml(route.description)}" />`
    );
    html = html.replace(
        /<meta\s+name="title"\s+content="[^"]*"\s*\/?>/i,
        `<meta name="title" content="${escapeHtml(route.title)}" />`
    );

    return html;
}

/**
 * Inject pre-rendered HTML content into <div id="root"> for bots.
 * React will hydrate over this on client-side (for real users who somehow get this).
 */
function injectContent(html: string, content: string): string {
    return html.replace(
        '<div id="root"></div>',
        `<div id="root">${content}</div>`
    );
}

// ── Edge Function Handler ───────────────────────────────────────

export default async function handler(
    request: Request,
    context: { next: () => Promise<Response> }
): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. FAST PATH: Always skip non-HTML requests regardless of User-Agent
    // This prevents corruption of content-type for sitemap.xml, robots.txt, and assets
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/.netlify/') ||
        pathname.startsWith('/assets/') ||
        pathname.match(/\.(xml|txt|png|jpg|jpeg|gif|svg|ico|webp|js|css|woff2|json)$/)
    ) {
        return context.next();
    }

    const userAgent = request.headers.get('user-agent') || '';

    // 2. Only process bot requests for HTML pages
    if (!isBot(userAgent)) {
        return context.next();
    }

    // ── Pre-render Logic ───────────────────────────────────────────
    
    let dynamicPost: any = null;
    let route = ROUTES[pathname];
    let isExactRoute = !!route;

    // Handle Dynamic Blog Posts: /blog/{slug}
    if (!route && pathname.startsWith('/blog/') && pathname !== '/blog/') {
        const slug = pathname.replace('/blog/', '');
        try {
            const apiUrl = `${url.origin}/api/admin/blog/${slug}`;
            const apiRes = await fetch(apiUrl, {
                headers: { 'User-Agent': 'INsitu-SEO-Prerender' }
            });

            if (apiRes.ok) {
                dynamicPost = await apiRes.json();
                if (dynamicPost && dynamicPost.status === 'published') {
                    isExactRoute = true;
                    route = {
                        title: `${dynamicPost.title} | ${SITE_NAME}`,
                        description: dynamicPost.excerpt || (dynamicPost.metaDescription || ''),
                        path: pathname,
                        ogType: 'article',
                        prerenderedContent: `
<div data-prerendered="true">
  <header><nav><a href="/">INsitu AI</a></nav></header>
  <main>
    <article>
      <h1>${dynamicPost.title}</h1>
      <div class="meta">
        <span>Por ${dynamicPost.authorName || SITE_NAME}</span>
        <span>${dynamicPost.publishedAt ? new Date(dynamicPost.publishedAt).toLocaleDateString() : ''}</span>
      </div>
      ${dynamicPost.featuredImage ? `<img src="${dynamicPost.featuredImage}" alt="${dynamicPost.title}" />` : ''}
      <div class="content">
        ${dynamicPost.content}
      </div>
    </article>
  </main>
</div>`
                    };
                }
            }
        } catch (err) {
            console.error(`[SEO-Prerender] Failed to fetch dynamic post ${slug}:`, err);
        }
    }

    // Fallback to homepage data for SEO meta but NOT necessarily for status code
    if (!route) {
        route = ROUTES['/'];
    }

    // Get the original response (index.html from the SPA)
    let response: Response;
    let html: string;

    try {
        response = await context.next();
        html = await response.text();
    } catch (err) {
        console.error(`[SEO-Prerender] context.next() failed:`, err);
        // Fallback response for origin failures
        html = `<!doctype html><html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${escapeHtml(route.title)}</title><meta name="description" content="${escapeHtml(route.description)}"/><meta name="robots" content="index,follow"/><link rel="canonical" href="${SITE_URL}${route.path}"/></head><body><div id="root">${route.prerenderedContent || GENERIC_CONTENT}</div></body></html>`;

        return new Response(html, {
            status: 200,
            headers: {
                'content-type': 'text/html; charset=utf-8',
                'vary': 'user-agent',
                'cache-control': 'public, max-age=0, must-revalidate',
            },
        });
    }

    // Inject route-specific meta tags
    let modifiedHtml = injectMetaTags(html, route);

    // If it's a dynamic post, also inject the specific OG image
    if (dynamicPost?.featuredImage) {
        modifiedHtml = modifiedHtml.replace(
            /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
            `<meta property="og:image" content="${escapeHtml(dynamicPost.featuredImage)}" />`
        ).replace(
            /<meta\s+property="twitter:image"\s+content="[^"]*"\s*\/?>/i,
            `<meta property="twitter:image" content="${escapeHtml(dynamicPost.featuredImage)}" />`
        );
    }

    // Inject pre-rendered content for bots
    const content = route.prerenderedContent || GENERIC_CONTENT;
    modifiedHtml = injectContent(modifiedHtml, content);

    // STATUS LOGIC:
    // If it's a known route (static or dynamic blog post), force 200.
    // If it's an UNKNOWN route (like /tag/twitter/feed/), return 404 to avoid Soft 404s.
    const status = isExactRoute ? 200 : 404;
    
    console.log(`[SEO-Prerender] Request: ${pathname} | Bot: true | RouteFound: ${isExactRoute} | Status: ${status}`);

    const headers = new Headers(response.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.set('vary', 'user-agent');

    return new Response(modifiedHtml, { status, headers });
}

// ── Netlify Edge Function config ────────────────────────────────
export const config = {
    path: '/*',
    excludedPath: [
        '/assets/*',
        '/.netlify/*',
        '/api/*',
        '/*.svg',
        '/*.png',
        '/*.jpg',
        '/*.jpeg',
        '/*.gif',
        '/*.ico',
        '/*.js',
        '/*.css',
        '/*.woff2',
        '/*.json',
        '/*.xml',
        '/*.txt',
        '/*.webp',
        '/*.map',
        '/*.html'
    ],
};
