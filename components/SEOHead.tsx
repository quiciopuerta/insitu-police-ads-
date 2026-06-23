import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Language } from '../types';

const SITE_URL = 'https://insitu.company';
const SITE_NAME = 'insitu.company';
const SITE_LOGO = `${SITE_URL}/favicon.svg`;
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;

interface SEORoute {
  title: { es: string; en: string };
  description: { es: string; en: string };
  path: string;
  priority: 'high' | 'medium' | 'low';
  ogType?: string;
  ogImage?: string;
}

/**
 * Central SEO data map for all public routes and modal pages.
 * Keeps all SEO copy in one place for maintainability.
 */
const SEO_ROUTES: Record<string, SEORoute> = {
  // ─── Main Tabs ─────────────────────────────────────────────────
  analyzer: {
    title: {
      es: 'insitu.company — Optimización de Google Ads, Meta Ads y TikTok con IA',
      en: 'insitu.company — Google Ads, Meta Ads & TikTok Optimization with AI',
    },
    description: {
      es: 'Optimiza tu ROAS con insitu.company. Auditoría avanzada de Google Ads, Meta Ads y TikTok usando Gemini, GPT-4o y Claude. Mejora tus campañas con IA multimodal en segundos.',
      en: 'Optimize your ROAS with insitu.company. Advanced Google Ads, Meta Ads & TikTok audit using Gemini, GPT-4o & Claude. Improve your campaigns with multimodal AI in seconds.',
    },
    path: '/',
    priority: 'high',
  },
  'competitor-tracker': {
    title: {
      es: 'insitu.company — Tracker de Competidores en Tiempo Real',
      en: 'insitu.company — Real-Time Competitor Tracker',
    },
    description: {
      es: 'Monitorea los anuncios de tu competencia en tiempo real. Recibe alertas de nuevos lanzamientos, cambios de estrategia y tendencias en Meta, TikTok y Google.',
      en: 'Monitor your competitors\' ads in real-time. Get alerts for new launches, strategy changes, and trends across Meta, TikTok, and Google.',
    },
    path: '/competitor-tracker',
    priority: 'high',
  },
  'traffic-checker': {
    title: {
      es: 'insitu.company — Auditoría de Tráfico Web y SEO',
      en: 'insitu.company — Web Traffic & SEO Audit',
    },
    description: {
      es: 'Analiza el tráfico web y SEO de cualquier dominio con IA. Descubre fuentes de tráfico, competidores, métricas de rendimiento y oportunidades de crecimiento real.',
      en: 'Analyze web traffic and SEO for any domain with AI. Discover traffic sources, competitors, performance metrics, and real growth opportunities.',
    },
    path: '/traffic-checker',
    priority: 'high',
  },
  'image-ai': {
    title: {
      es: 'insitu.company — Análisis Neuro-Visual de Imágenes Publicitarias',
      en: 'insitu.company — Neuro-Visual Ad Image Analysis',
    },
    description: {
      es: 'Auditoría de imágenes publicitarias con IA: carga cognitiva, neuro-heatmaps, AOI scoring y recomendaciones tácticas para mejorar el CTR de tus creativos.',
      en: 'AI ad image audit: cognitive load, neuro-heatmaps, AOI scoring, and tactical recommendations to improve your creative CTR.',
    },
    path: '/image-ai',
    priority: 'medium',
  },
  'video-ai': {
    title: {
      es: 'insitu.company — Análisis de Retención y Video Publicitario con IA',
      en: 'insitu.company — AI Video Retention & Ad Analysis',
    },
    description: {
      es: 'Optimiza la retención de tus videos publicitarios con IA. Detecta puntos de abandono, evalúa hooks y mejora la persuasión de tus anuncios en TikTok y Reels.',
      en: 'Optimize your ad video retention with AI. Detect drop-off points, evaluate hooks, and improve persuasion for your TikTok and Reels ads.',
    },
    path: '/video-ai',
    priority: 'medium',
  },
  'compare-ai': {
    title: {
      es: 'insitu.company — Comparar Creativos Publicitarios',
      en: 'insitu.company — Compare Ad Creatives',
    },
    description: {
      es: 'Compara dos creativos publicitarios lado a lado con análisis neuro-visual de IA. Identifica el ganador por métricas de atención, memoria y persuasión.',
      en: 'Compare two ad creatives side by side with neuro-visual AI analysis. Identify the winner by attention, memory, and persuasion metrics.',
    },
    path: '/compare-ai',
    priority: 'medium',
  },
  campaigns: {
    title: {
      es: 'insitu.company — Optimizador de Campañas Google Ads',
      en: 'insitu.company — Google Ads Campaign Optimizer',
    },
    description: {
      es: 'Optimiza tus campañas de Google Ads con IA. Análisis profundo de keywords, copy SEM, estrategia de puja y mejora directa del Quality Score.',
      en: 'Optimize your Google Ads campaigns with AI. In-depth keyword analysis, SEM copy, bidding strategy, and direct Quality Score improvement.',
    },
    path: '/campaigns',
    priority: 'medium',
  },
  'brand-identity': {
    title: {
      es: 'insitu.company — Identidad de Marca con IA',
      en: 'insitu.company — AI Brand Identity',
    },
    description: {
      es: 'Protege la identidad de tu marca con IA. Auditoría de consistencia visual, tono de voz y cumplimiento de guías de estilo en todas tus plataformas.',
      en: 'Protect your brand identity with AI. Visual consistency audit, tone of voice, and style guide compliance across all your platforms.',
    },
    path: '/brand-identity',
    priority: 'medium',
  },
  metrics: {
    title: {
      es: 'insitu.company — Panel de Métricas y KPIs',
      en: 'insitu.company — Metrics & KPIs Dashboard',
    },
    description: {
      es: 'Visualiza los KPIs clave de tus auditorías: ROAS proyectado, scores de atención y benchmarks competitivos en un solo dashboard.',
      en: 'Visualize key KPIs from your audits: projected ROAS, attention scores, and competitive benchmarks in a single dashboard.',
    },
    path: '/metrics',
    priority: 'low',
  },
  blog: {
    title: {
      es: 'insitu.company — Blog de Marketing e IA',
      en: 'insitu.company — Marketing & AI Blog',
    },
    description: {
      es: 'Aprende sobre IA aplicada al marketing, optimización de pauta digital, Google Ads avanzado y estrategias de growth hacking con inteligencia artificial.',
      en: 'Learn about AI applied to marketing, digital ad optimization, advanced Google Ads, and growth hacking strategies with artificial intelligence.',
    },
    path: '/blog',
    priority: 'high',
  },


  // ─── Modal / Standalone Pages ──────────────────────────────────
  pricing: {
    title: {
      es: 'insitu.company — Planes y Precios',
      en: 'insitu.company — Plans & Pricing',
    },
    description: {
      es: 'Planes flexibles desde $0/mes. Encuentra la opción perfecta para freelancers o agencias: auditorías ilimitadas, reportes white-label y soporte premium.',
      en: 'Flexible plans from $0/mo. Find the perfect option for freelancers or agencies: unlimited audits, white-label reports, and premium support.',
    },
    path: '/pricing',
    priority: 'high',
    ogType: 'product',
  },
  technology: {
    title: {
      es: 'insitu.company — Nuestra Tecnología de IA',
      en: 'insitu.company — Our AI Technology',
    },
    description: {
      es: 'Descubre cómo insitu.company optimiza campañas de Google Ads y Meta Ads. Tecnología avanzada con Gemini, GPT-4o y Claude en un pipeline de IA multimodal.',
      en: 'Discover how insitu.company optimizes Google Ads and Meta Ads campaigns. Advanced technology with Gemini, GPT-4o & Claude in a multimodal AI pipeline.',
    },
    path: '/technology',
    priority: 'medium',
  },
  privacy: {
    title: {
      es: 'insitu.company — Política de Privacidad',
      en: 'insitu.company — Privacy Policy',
    },
    description: {
      es: 'Política de privacidad de insitu.company. Conoce cómo protegemos tu información, el uso de cookies y nuestro compromiso con la seguridad de tus datos.',
      en: 'insitu.company privacy policy. Learn how we protect your information, cookie usage, and our commitment to your data security.',
    },
    path: '/privacy',
    priority: 'low',
  },
  terms: {
    title: {
      es: 'insitu.company — Términos de Servicio',
      en: 'insitu.company — Terms of Service',
    },
    description: {
      es: 'Términos y condiciones legales para el uso de la plataforma insitu.company. Bases legales, responsabilidades y derechos de los usuarios.',
      en: 'Legal terms and conditions for using the insitu.company platform. Legal basis, responsibilities, and user rights.',
    },
    path: '/terms',
    priority: 'low',
  },
  glossary: {
    title: {
      es: 'insitu.company — Glosario de Marketing y Publicidad Digital',
      en: 'insitu.company — Digital Marketing & Advertising Glossary',
    },
    description: {
      es: 'Glosario completo de términos de marketing digital, publicidad programática, SEM, SEO e inteligencia artificial.',
      en: 'Complete glossary of digital marketing, programmatic advertising, SEM, SEO, and artificial intelligence terms.',
    },
    path: '/glossary',
    priority: 'medium',
  },
  security: {
    title: {
      es: 'insitu.company — Seguridad y Protección de Datos',
      en: 'insitu.company — Security & Data Protection',
    },
    description: {
      es: 'Seguridad de grado empresarial en insitu.company. Encriptación de datos, cumplimiento de estándares internacionales (GDPR) e infraestructura protegida.',
      en: 'Enterprise-grade security at insitu.company. Data encryption, international standard compliance (GDPR), and protected infrastructure.',
    },
    path: '/security',
    priority: 'low',
  },
  contact: {
    title: {
      es: 'insitu.company — Contacto',
      en: 'insitu.company — Contact Us',
    },
    description: {
      es: '¿Tienes dudas sobre insitu.company? Contáctanos para solicitar una demo personalizada, soporte técnico o consultas sobre nuestros planes para agencias.',
      en: 'Have questions about insitu.company? Contact us to request a personalized demo, technical support, or inquiries about our agency plans.',
    },
    path: '/contact',
    priority: 'medium',
  },
  admin: {
    title: {
      es: 'insitu.company — Panel de Administración',
      en: 'insitu.company — Admin Dashboard',
    },
    description: {
      es: 'Panel de administración de insitu.company.',
      en: 'insitu.company administration dashboard.',
    },
    path: '/admin',
    priority: 'low',
  },
};

interface SEOHeadProps {
  activeTab: string;
  language: Language;
  /** Modal states — the first truthy one takes priority */
  isPricingOpen?: boolean;
  isTechOpen?: boolean;
  isPrivacyOpen?: boolean;
  isTermsOpen?: boolean;
  isGlossaryOpen?: boolean;
  isSecurityOpen?: boolean;
  isContactOpen?: boolean;
  isAdminOpen?: boolean;
}

/**
 * SEOHead — Global dynamic <head> manager for all routes.
 *
 * Renders the correct <title>, <meta>, <link rel="canonical">,
 * Open Graph, Twitter Card, and JSON-LD BreadcrumbList tags
 * based on the current active tab or open modal.
 *
 * Blog SEO is handled separately by BlogSEOHead in BlogView.tsx
 * for per-article granularity (that component overrides these tags).
 */
const SEOHead: React.FC<SEOHeadProps> = ({
  activeTab,
  language,
  isPricingOpen,
  isTechOpen,
  isPrivacyOpen,
  isTermsOpen,
  isGlossaryOpen,
  isSecurityOpen,
  isContactOpen,
  isAdminOpen,
}) => {
  const currentRoute = useMemo(() => {
    // Modals take priority over tabs (same order as App.tsx title logic)
    if (isAdminOpen) return SEO_ROUTES.admin;
    if (isPricingOpen) return SEO_ROUTES.pricing;
    if (isGlossaryOpen) return SEO_ROUTES.glossary;
    if (isTechOpen) return SEO_ROUTES.technology;
    if (isPrivacyOpen) return SEO_ROUTES.privacy;
    if (isTermsOpen) return SEO_ROUTES.terms;
    if (isSecurityOpen) return SEO_ROUTES.security;
    if (isContactOpen) return SEO_ROUTES.contact;
    return SEO_ROUTES[activeTab] || SEO_ROUTES.analyzer;
  }, [activeTab, isPricingOpen, isTechOpen, isPrivacyOpen, isTermsOpen, isGlossaryOpen, isSecurityOpen, isContactOpen, isAdminOpen]);

  const title = currentRoute.title[language];
  const description = currentRoute.description[language];
  const canonicalUrl = `${SITE_URL}${currentRoute.path}`;
  const ogImage = currentRoute.ogImage || DEFAULT_OG_IMAGE;
  const ogType = currentRoute.ogType || 'website';

  // Build breadcrumb: Home > [Page Name]
  const breadcrumbName = title.split('—')[1]?.trim() || title;

  return (
    <Helmet>
      {/* ── Primary Meta ──────────────────────────────── */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={currentRoute.path === '/admin' ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'} />

      {/* ── Open Graph ────────────────────────────────── */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={language === 'es' ? 'es_ES' : 'en_US'} />

      {/* ── Twitter Card ──────────────────────────────── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* ── JSON-LD: BreadcrumbList ───────────────────── */}
      {currentRoute.path !== '/' && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'insitu.company',
                item: SITE_URL,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: breadcrumbName,
                item: canonicalUrl,
              },
            ],
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;

/**
 * Exported for use by the Netlify Edge Function (seo-prerender).
 * Maps route paths to their SEO metadata for server-side injection.
 */
export { SEO_ROUTES, SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE };
export type { SEORoute };
