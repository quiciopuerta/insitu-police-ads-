import React from "react";
import { ChevronRight } from "lucide-react";
import { Language } from "../../types";

interface FAQSectionProps {
  language: Language;
}

const FAQSection: React.FC<FAQSectionProps> = ({ language }) => {
  return (
    <section className="max-w-4xl mx-auto px-6 py-24 reveal-on-scroll" id="faq">
      {/* JSON-LD structured data for FAQ */}
      <script
        type="application/ld+json"
      >
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "¿Qué es insitu.company?",
              "acceptedAnswer": { "@type": "Answer", "text": "insitu.company es una plataforma SaaS de IA que audita campañas de Google Ads, Meta Ads y TikTok Ads utilizando Gemini, GPT-4o y Claude. Analizamos copy, imágenes y video para maximizar el ROAS con insights estratégicos." }
            },
            {
              "@type": "Question",
              "name": "¿Cuánto cuesta insitu.company?",
              "acceptedAnswer": { "@type": "Answer", "text": "Ofrecemos tres planes: ON-SITE (gratis), DEEP SCAN ($49/mes) y OMNI-CHANNEL (personalizado). Los planes anuales tienen un 20% de descuento." }
            },
            {
              "@type": "Question",
              "name": "¿Con qué plataformas es compatible?",
              "acceptedAnswer": { "@type": "Answer", "text": "Es compatible con Google Ads, Meta Ads (Facebook/Instagram) y TikTok Ads. Cubrimos búsqueda, display y video." }
            },
            {
              "@type": "Question",
              "name": "¿Qué modelos de IA utiliza?",
              "acceptedAnswer": { "@type": "Answer", "text": "Utilizamos Google Gemini, OpenAI GPT-4o y Anthropic Claude en paralelo para auditorías de texto, imagen y video." }
            },
            {
              "@type": "Question",
              "name": "¿Cómo funciona la optimización de campañas con Gemini?",
              "acceptedAnswer": { "@type": "Answer", "text": "La optimización con Gemini analiza tus campañas de Google Ads, Meta Ads y TikTok Ads usando el modelo multimodal de Google. Gemini evalúa copy, imágenes y video simultáneamente para generar insights accionables que mejoran tu ROAS." }
            },
            {
              "@type": "Question",
              "name": "¿Se puede optimizar la pauta publicitaria con Claude?",
              "acceptedAnswer": { "@type": "Answer", "text": "Sí, la optimización con Claude permite analizar en profundidad la estructura de tus anuncios, el copy SEM, las keywords negativas y la estrategia de pujas. Claude destaca en el análisis semántico de texto publicitario y la detección de oportunidades de mejora en tu pauta." }
            },
            {
              "@type": "Question",
              "name": "¿insitu.company optimiza campañas de Meta Ads y TikTok Ads con inteligencia artificial?",
              "acceptedAnswer": { "@type": "Answer", "text": "Sí, insitu.company ofrece optimización con AI de Meta Ads (Facebook e Instagram) y optimización de TikTok Ads. Analizamos creativos visuales, retención de video, copy publicitario y métricas de engagement para maximizar el rendimiento de tus campañas en estas plataformas." }
            }
          ]
        })}
      </script>

      <div className="text-center mb-16">
        <span className="text-[#ff477b] text-xs font-bold uppercase tracking-widest block mb-4">FAQ</span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">
          {language === "es" ? "Preguntas Frecuentes" : "Frequently Asked Questions"}
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          {language === "es"
            ? "Todo lo que necesitas saber sobre insitu.company, nuestra plataforma de inteligencia publicitaria con IA."
            : "Everything you need to know about insitu.company, our AI-powered advertising intelligence platform."}
        </p>
      </div>

      <div className="space-y-4">
        {[
          {
            id: "que-es-insitu-company",
            q: language === "es" ? "¿Qué es insitu.company?" : "What is insitu.company?",
            a: language === "es"
              ? "insitu.company es una plataforma SaaS de IA que audita campañas de Google Ads, Meta Ads y TikTok Ads utilizando Gemini, GPT-4o y Claude. Analizamos copy, imágenes y video para maximizar el ROAS con insights estratégicos."
              : "insitu.company is an AI-powered SaaS platform that audits Google, Meta, and TikTok Ads campaigns using Gemini, GPT-4o, and Claude. We analyze copy, images, and video to maximize ROAS with strategic insights.",
          },
          {
            id: "cuanto-cuesta",
            q: language === "es" ? "¿Cuánto cuesta insitu.company?" : "How much does insitu.company cost?",
            a: language === "es"
              ? "Ofrecemos tres planes: ON-SITE (gratis), DEEP SCAN ($49/mes) y OMNI-CHANNEL (personalizado). Los planes anuales tienen un 20% de descuento."
              : "We offer three plans: ON-SITE (free), DEEP SCAN ($49/mo), and OMNI-CHANNEL (custom). Annual plans have a 20% discount.",
          },
          {
            id: "plataformas-compatibles",
            q: language === "es" ? "¿Con qué plataformas es compatible?" : "Compatibility?",
            a: language === "es"
              ? "Es compatible con Google Ads, Meta Ads (Facebook/Instagram) y TikTok Ads. Cubrimos búsqueda, display y video."
              : "Compatible with Google Ads, Meta Ads (Facebook/Instagram), and TikTok Ads. Covers search, display, and video.",
          },
          {
            id: "modelos-ia",
            q: language === "es" ? "¿Qué modelos de IA utiliza?" : "AI Models?",
            a: language === "es"
              ? "Utilizamos Google Gemini, OpenAI GPT-4o y Anthropic Claude en paralelo para auditorías de texto, imagen y video."
              : "We use Google Gemini, OpenAI GPT-4o, and Anthropic Claude in parallel for text, image, and video audits.",
          },
          {
            id: "brand-guardian",
            q: language === "es" ? "¿Qué es Brand Guardian?" : "Brand Guardian?",
            a: language === "es"
              ? "Es nuestra función para supervisar la consistencia de marca (colores, tonos, logos) en todas tus campañas automáticamente."
              : "It's our feature to automatically monitor brand consistency (colors, tones, logos) across all your campaigns.",
          },
          {
            id: "prueba-gratis",
            q: language === "es" ? "¿Puedo usarlo gratis?" : "Free trial?",
            a: language === "es"
              ? "Sí, ofrecemos una auditoría gratuita inicial y una prueba de 7 días del plan ON-SITE."
              : "Yes, we offer an initial free audit and a 7-day trial of the ON-SITE plan.",
          },
          {
            id: "optimizacion-gemini",
            q: language === "es" ? "¿Cómo funciona la optimización de campañas con Gemini?" : "How does campaign optimization with Gemini work?",
            a: language === "es"
              ? "La optimización con Gemini analiza tus campañas de Google Ads, Meta Ads y TikTok Ads usando el modelo multimodal de Google. Gemini evalúa copy, imágenes y video simultáneamente para generar insights accionables que mejoran tu ROAS."
              : "Optimization with Gemini analyzes your Google Ads, Meta Ads and TikTok Ads campaigns using Google's multimodal model. Gemini evaluates copy, images and video simultaneously to generate actionable insights that improve your ROAS.",
          },
          {
            id: "optimizacion-claude-pauta",
            q: language === "es" ? "¿Se puede optimizar la pauta publicitaria con Claude?" : "Can you optimize ad campaigns with Claude?",
            a: language === "es"
              ? "Sí, la optimización con Claude permite analizar en profundidad la estructura de tus anuncios, el copy SEM, las keywords negativas y la estrategia de pujas. Claude destaca en el análisis semántico de texto publicitario y la detección de oportunidades de mejora en tu pauta."
              : "Yes, optimization with Claude allows deep analysis of your ad structure, SEM copy, negative keywords, and bidding strategy. Claude excels at semantic analysis of ad copy and detecting improvement opportunities in your campaigns.",
          },
          {
            id: "optimizacion-meta-tiktok",
            q: language === "es" ? "¿insitu.company optimiza campañas de Meta Ads y TikTok Ads con IA?" : "Does insitu.company optimize Meta Ads and TikTok Ads with AI?",
            a: language === "es"
              ? "Sí, insitu.company ofrece optimización con AI de Meta Ads (Facebook e Instagram) y optimización de TikTok Ads. Analizamos creativos visuales, retención de video, copy publicitario y métricas de engagement para maximizar el rendimiento de tus campañas."
              : "Yes, insitu.company offers AI optimization for Meta Ads (Facebook and Instagram) and TikTok Ads optimization. We analyze visual creatives, video retention, ad copy and engagement metrics to maximize your campaign performance.",
          },
        ].map((faq: any, i) => (
          <details key={i} id={faq.id} className="glass-landing rounded-xl border border-white/5 group open:border-[#ff477b]/20 transition-all scroll-mt-24">
            <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-slate-100 font-bold text-sm md:text-base select-none list-none">
              {faq.q}
              <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform shrink-0 ml-4" />
            </summary>
            <div className="px-6 pb-5 text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
};

export default FAQSection;
