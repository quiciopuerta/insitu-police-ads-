import React from "react";
import { motion } from "framer-motion";
import { Zap, Sparkles, Rocket } from "lucide-react";
import { Language } from "../../types";

interface HowItWorksProps {
  language: Language;
}

const HowItWorks: React.FC<HowItWorksProps> = ({ language }) => {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24 reveal-on-scroll" id="como-funciona">
      {/* HowTo JSON-LD for rich snippets */}
      <script
        type="application/ld+json"
      >
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "Cómo funciona la optimización de campañas con inteligencia artificial en 3 pasos",
          "description": "Guía rápida de optimización de campañas con IA: usa Gemini y Claude para optimizar tu pauta en Meta Ads, TikTok Ads y Google Ads con insitu.company.",
          "step": [
            {
              "@type": "HowToStep",
              "position": 1,
              "name": "Acelera tus resultados",
              "text": "Obtén un diagnóstico completo de tus campañas en minutos. La IA detecta puntos ciegos en copy, keywords y creativos que están frenando tu ROAS."
            },
            {
              "@type": "HowToStep",
              "position": 2,
              "name": "Optimización con Gemini y Claude",
              "text": "Gemini optimiza tus campañas de Google Ads y Meta Ads con análisis multimodal. Claude optimiza tu pauta analizando copy SEM, keywords negativas y estructura de anuncios. Ambos modelos trabajan en paralelo para cubrir TikTok Ads, creativos de imagen y retención de video."
            },
            {
              "@type": "HowToStep",
              "position": 3,
              "name": "Recibe insights accionables",
              "text": "Obtén recomendaciones priorizadas por impacto estimado en ROAS. Reportes PDF White-label listos para enviar a tus clientes."
            }
          ]
        })}
      </script>
      <div className="text-center mb-16">
        <span className="text-[#ff477b] text-xs font-bold uppercase tracking-widest block mb-4">
          {language === "es" ? "¿Cómo funciona?" : "How It Works?"}
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4">
          {language === "es" ? "De cero a ROI explosivo en 3 pasos" : "From zero to explosive ROI in 3 steps"}
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          {language === "es"
            ? "Nuestra plataforma automatiza todo el flujo de trabajo de optimización publicitaria. Sin configuración compleja, sin curva de aprendizaje."
            : "Our platform automates the entire ad optimization workflow. No complex setup, no learning curve."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {/* Connection line */}
        <div className="hidden md:block absolute top-24 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-[#ff477b]/30 to-transparent" />

        {[
          {
            step: "01",
            icon: <Zap className="w-8 h-8" />,
            title: language === "es" ? "Acelera tus resultados" : "Accelerate your results",
            desc: language === "es"
              ? "Obtén un diagnóstico completo de tus campañas en minutos, no en días. Nuestra IA detecta puntos ciegos en copy, keywords y creativos que están frenando tu ROAS."
              : "Get a complete campaign diagnosis in minutes, not days. Our AI detects blind spots in copy, keywords and creatives that are holding back your ROAS.",
          },
          {
            step: "02",
            icon: <Sparkles className="w-8 h-8" />,
            title: language === "es" ? "La IA analiza todo" : "AI analyzes everything",
            desc: language === "es"
              ? "Gemini, GPT-4o y Claude trabajan en paralelo para auditar copy, landing pages, keywords negativas, creativos de imagen y retención de video."
              : "Gemini, GPT-4o and Claude work in parallel to audit copy, landing pages, negative keywords, image creatives and video retention.",
          },
          {
            step: "03",
            icon: <Rocket className="w-8 h-8" />,
            title: language === "es" ? "Recibe insights accionables" : "Get actionable insights",
            desc: language === "es"
              ? "Obtén recomendaciones priorizadas por impacto estimado en ROAS. Reportes PDF White-label listos para enviar a tus clientes."
              : "Get recommendations prioritized by estimated ROAS impact. White-label PDF reports ready to send to your clients.",
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="glass-landing p-8 rounded-2xl border border-white/5 text-center relative group hover:border-[#ff477b]/30 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl bg-[#ff477b]/10 border border-[#ff477b]/20 flex items-center justify-center text-[#ff477b] mx-auto mb-6 group-hover:scale-110 group-hover:bg-[#ff477b]/20 transition-all">
              {item.icon}
            </div>
            <span className="text-[#ff477b]/40 text-5xl font-black absolute top-4 right-6">{item.step}</span>
            <h3 className="text-xl font-bold text-slate-100 mb-3">{item.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
