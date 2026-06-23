import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Search, TrendingUp, Zap, ShieldCheck, Eye, Film, Sparkles, Layers } from "lucide-react";
import { Language } from "../../types";

interface FeaturesSectionProps {
  language: Language;
}

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ language }) => {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24 space-y-32" id="features">
      
      {/* Module 1: SEM / SEO Audit */}
      <article className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center reveal-on-scroll" itemScope itemType="https://schema.org/FeatureAction">
        <div className="flex flex-col">
          <header>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6 leading-tight" itemProp="name">
            {language === "es" ? "Auditoría SEM y SEO con" : "SEM & SEO Audit powered by"} <br />
            <span className="text-[#ff477b]">{language === "es" ? "Gemini y Claude" : "Gemini & Claude"}</span>
            </h2>
          </header>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed" itemProp="description">
            {language === "es"
              ? "Nuestra IA no solo extrae datos, los comprende. Realiza auditorías completas de campañas en Google Ads, identifica brechas SEO y genera Ad Copy de alta conversión con procesamiento de lenguaje natural."
              : "Our AI doesn't just extract data, it understands it. Perform full Google Ads campaign audits, identify SEO gaps, and automatically generate high-converting Ad Copy via NLP."}
          </p>
          <ul className="space-y-4" aria-label={language === "es" ? "Características de Auditoría SEM" : "SEM Audit features"}>
            {[
              language === "es" ? "Análisis de intenciones de búsqueda y Quality Score" : "Search intent and Quality Score analysis",
              language === "es" ? "Detección automática de keywords negativas" : "Automatic negative keyword detection",
              language === "es" ? "Generación de Ad Copy alineado con Best Practices" : "Ad Copy generation aligned with Best Practices",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-300 group">
                <CheckCircle2 className="w-5 h-5 text-[#ff477b] group-hover:scale-125 transition-transform shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Terminal / AI Console Visual */}
        <div className="relative border border-white/10 rounded-2xl bg-white/[0.02]" aria-hidden="true">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#ff477b] to-indigo-600 rounded-2xl blur opacity-20" />
          <div className="relative glass-landing rounded-2xl overflow-hidden">
            <div className="bg-white/5 px-6 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <span className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Search Intel Console</span>
            </div>
            <div className="p-6 md:p-8 font-mono text-sm min-h-[300px]">
              {[
                { num: "01", parts: [{ text: "const ", cls: "text-indigo-400" }, { text: "auditor", cls: "text-[#ff477b]" }, { text: " = new SearchAuditor();", cls: "text-slate-300" }] },
                { num: "02", parts: [{ text: "await ", cls: "text-indigo-400" }, { text: "auditor.analyzeCampaign({", cls: "text-slate-300" }] },
                { num: "03", parts: [{ text: '  network: ', cls: "text-slate-500" }, { text: '"Google Search"', cls: "text-emerald-400" }, { text: ",", cls: "text-slate-500" }] },
                { num: "04", parts: [{ text: "  engine: ", cls: "text-slate-500" }, { text: '"Gemini Pro"', cls: "text-orange-400" }] },
              ].map((line, i) => (
                <div key={line.num} className="overflow-hidden whitespace-nowrap mb-4 border-r-2 border-[#ff477b]" style={{ animation: `typing 3.5s steps(40, end) infinite`, animationDelay: `${i * 1.5}s` }}>
                  <span className="text-slate-600">{line.num} </span>
                  {line.parts.map((p, j) => <span key={j} className={p.cls}>{p.text}</span>)}
                </div>
              ))}
              <div className="mt-8 p-4 bg-[#ff477b]/5 rounded border border-[#ff477b]/20 opacity-0" style={{ animation: 'reveal-up 0.5s ease-out forwards', animationDelay: '6s' }}>
                <p className="text-[#ff477b] text-xs font-bold mb-2 uppercase">Ad Copy Suggestion:</p>
                <p className="text-slate-100">"Increase CTR by 24% focusing on emotional triggers."</p>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Module 2: Neuro-Visual Analysis & Video Audit */}
      <article className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center reveal-on-scroll" itemScope itemType="https://schema.org/FeatureAction">
        <div className="order-2 lg:order-1 relative" aria-hidden="true">
           <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20" />
           <div className="relative glass-landing rounded-2xl p-8 border border-white/10 space-y-6 bg-slate-900/40">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Neuro-Visual Map</span>
                </div>
                <span className="text-[11px] font-black px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 uppercase">Salience</span>
              </div>
              
              <div className="relative w-full h-48 bg-slate-800 rounded-xl overflow-hidden border border-white/10 shadow-inner group">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542744094-24638ea0b56c?q=80&w=1000')] bg-cover bg-center opacity-40 mix-blend-luminosity grayscale" />
                <div className="absolute top-[20%] left-[30%] w-24 h-24 bg-red-500 blur-3xl opacity-0 group-hover:opacity-70 transition-opacity duration-1000 mix-blend-screen mix-blend-color-dodge rounded-full" />
                <div className="absolute top-[50%] right-[20%] w-32 h-32 bg-yellow-500 blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-1000 delay-300 mix-blend-screen rounded-full" />
                <div className="absolute bottom-[20%] left-[40%] w-20 h-20 bg-green-500 blur-3xl opacity-0 group-hover:opacity-60 transition-opacity duration-1000 delay-500 mix-blend-screen rounded-full" />
                <div className="absolute inset-0 border-2 border-indigo-500/0 group-hover:border-indigo-500/30 transition-colors rounded-xl duration-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Cognitive Load</p>
                  <p className="text-xl text-white font-black">2.4<span className="text-sm text-slate-500 font-normal">/5</span></p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Hook Retention</p>
                  <p className="text-xl text-emerald-400 font-black">84%</p>
                </div>
              </div>
           </div>
        </div>
        <div className="order-1 lg:order-2 flex flex-col">
          <header>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6 leading-tight" itemProp="name">
              {language === "es" ? "Análisis Neuro-Visual" : "Neuro-Visual Audit"} <br />
              <span className="text-indigo-400">{language === "es" ? "e Inteligencia Artificial Video" : "& Video AI Analytics"}</span>
            </h2>
          </header>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed" itemProp="description">
            {language === "es"
              ? "Analiza imágenes generar heatmaps de atención y métricas de carga cognitiva. Audita videos de TikTok y Reels frame-by-frame descubriendo por qué el usuario hace scroll."
              : "Analyze images to generate attention heatmaps and cognitive load metrics. Audit TikTok videos and Reels frame-by-frame discovering why users scroll."}
          </p>
          <ul className="space-y-4">
            {[
              language === "es" ? "Heatmaps de prominencia visual (Salience Maps)" : "Visual salience heatmaps",
              language === "es" ? "Análisis frame-by-frame de retención de audiencia" : "Frame-by-frame audience retention analysis",
              language === "es" ? "Reglas de Brand Safety y cumplimiento visual" : "Brand Safety rules and visual compliance",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-300 group">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 group-hover:scale-125 transition-transform shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </article>

       {/* Module 3: Automation & Ecosystem */}
       <article className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center reveal-on-scroll" itemScope itemType="https://schema.org/FeatureAction">
        <div className="flex flex-col">
          <header>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6 leading-tight" itemProp="name">
            {language === "es" ? "Ecosistema Centralizado" : "Centralized Ecosystem"} <br />
            <span className="text-emerald-400">{language === "es" ? "Autónomo y Optimizado" : "Continuously Optimized"}</span>
          </h2>
          </header>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed" itemProp="description">
            {language === "es"
              ? "Desde el sistema Brand Guardian hasta el optimizador masivo de anuncios (Mass Ads), la plataforma mejora de forma continua. El bucle de retroalimentación de IA (AI Feedback Loop) enriquece los modelos."
              : "From the Brand Guardian to the Campaign Optimizer (Mass Ads), the platform auto-tunes itself. The AI Feedback Loop enriches models from user inputs to generate data-driven personalization."}
          </p>
          <ul className="space-y-4" aria-label={language === "es" ? "Oportunidades de Ecosistema" : "Ecosystem opportunities"}>
            {[
              language === "es" ? "Brand Guardian para mantener identidad visual" : "Brand Guardian to maintain visual identity",
              language === "es" ? "Generación de video (Veo 3.1) e imágenes con IA" : "AI Video (Veo 3.1) and Image generation",
              language === "es" ? "AI Feedback Loop: la plataforma reescribe sus prompts por ti" : "AI Feedback Loop: the app rewrites its prompts for you",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-300 group">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 group-hover:scale-125 transition-transform shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* AI Learning Visual */}
        <div className="relative" aria-hidden="true">
           <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-2xl blur opacity-20" />
           <div className="relative glass-landing rounded-2xl p-10 border border-white/10 overflow-hidden group bg-[#0a0507]">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                   <h4 className="text-white font-black uppercase text-xs tracking-widest">Neural Calibration</h4>
                   <p className="text-[11px] text-slate-500 uppercase">Learning from feedback...</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "30%" }} 
                    whileInView={{ width: "85%" }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" 
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center transition-all hover:bg-emerald-500/20">
                       <Layers className="w-5 h-5 text-emerald-500/40" />
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 border-dashed relative overflow-hidden">
                  <div className="absolute inset-0 bg-emerald-500/5 pulse-slow" />
                  <p className="text-[11px] font-mono text-emerald-300 leading-relaxed italic relative z-10">
                    "Rule Updated: Prioritizing specific niche data and visual guidelines over generic recommendations."
                  </p>
                </div>
              </div>
           </div>
        </div>
      </article>

    </section>
  );
};

export default FeaturesSection;
