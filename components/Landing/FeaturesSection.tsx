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
      
      {/* Module 1: Policy Violation Scanner */}
      <article className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center reveal-on-scroll" itemScope itemType="https://schema.org/FeatureAction">
        <div className="flex flex-col">
          <header>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6 leading-tight" itemProp="name">
            {language === "es" ? "Detección de Violaciones de Política con" : "Policy Violation Detection powered by"} <br />
            <span className="text-[#ff477b]">{language === "es" ? "Inteligencia Artificial" : "Artificial Intelligence"}</span>
            </h2>
          </header>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed" itemProp="description">
            {language === "es"
              ? "Escaneo profundo de Ad Copy en busca de lenguaje restringido, afirmaciones engañosas (Misleading claims) y regulaciones estrictas en nichos de Salud y Servicios Financieros."
              : "Deep Ad Copy scanning for restricted language, misleading claims, and strict regulations in Healthcare and Financial Services niches."}
          </p>
          <ul className="space-y-4" aria-label={language === "es" ? "Características de Detección" : "Detection features"}>
            {[
              language === "es" ? "Análisis contra políticas de Google (Misleading, Healthcare, etc.)" : "Analysis against Google policies (Misleading, Healthcare, etc.)",
              language === "es" ? "Identificación automática de frases en riesgo" : "Automatic identification of at-risk phrasing",
              language === "es" ? "Recomendaciones de corrección de Copy" : "Ad Copy correction recommendations",
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
              <span className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">Policy Compliance Console</span>
            </div>
            <div className="p-6 md:p-8 font-mono text-sm min-h-[300px]">
              {[
                { num: "01", parts: [{ text: "const ", cls: "text-indigo-400" }, { text: "scanner", cls: "text-[#ff477b]" }, { text: " = new PolicyScanner();", cls: "text-slate-300" }] },
                { num: "02", parts: [{ text: "await ", cls: "text-indigo-400" }, { text: "scanner.auditAds({", cls: "text-slate-300" }] },
                { num: "03", parts: [{ text: '  niche: ', cls: "text-slate-500" }, { text: '"Healthcare"', cls: "text-emerald-400" }, { text: ",", cls: "text-slate-500" }] },
                { num: "04", parts: [{ text: "  ruleset: ", cls: "text-slate-500" }, { text: '"Google Ads Strict"', cls: "text-orange-400" }] },
              ].map((line, i) => (
                <div key={line.num} className="overflow-hidden whitespace-nowrap mb-4 border-r-2 border-[#ff477b]" style={{ animation: `typing 3.5s steps(40, end) infinite`, animationDelay: `${i * 1.5}s` }}>
                  <span className="text-slate-600">{line.num} </span>
                  {line.parts.map((p, j) => <span key={j} className={p.cls}>{p.text}</span>)}
                </div>
              ))}
              <div className="mt-8 p-4 bg-[#ff477b]/5 rounded border border-[#ff477b]/20 opacity-0" style={{ animation: 'reveal-up 0.5s ease-out forwards', animationDelay: '6s' }}>
                <p className="text-[#ff477b] text-xs font-bold mb-2 uppercase">Violation Detected:</p>
                <p className="text-slate-100">"Headline contains unverified medical claims. Suggestion: Modify to informative tone."</p>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Module 2: Landing Page Scanner */}
      <article className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center reveal-on-scroll" itemScope itemType="https://schema.org/FeatureAction">
        <div className="order-2 lg:order-1 relative" aria-hidden="true">
           <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20" />
           <div className="relative glass-landing rounded-2xl p-8 border border-white/10 space-y-6 bg-slate-900/40">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Safe Browsing API</span>
                </div>
                <span className="text-[11px] font-black px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 uppercase">Secure</span>
              </div>
              
              <div className="relative w-full h-48 bg-slate-800 rounded-xl overflow-hidden border border-white/10 shadow-inner group flex items-center justify-center flex-col gap-4">
                <ShieldCheck className="w-16 h-16 text-emerald-400" />
                <p className="text-emerald-400 font-mono text-sm">No Malicious Software Detected</p>
                <div className="absolute inset-0 border-2 border-indigo-500/0 group-hover:border-indigo-500/30 transition-colors rounded-xl duration-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Redirects</p>
                  <p className="text-xl text-white font-black">Clean</p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Transparency</p>
                  <p className="text-xl text-emerald-400 font-black">Passed</p>
                </div>
              </div>
           </div>
        </div>
        <div className="order-1 lg:order-2 flex flex-col">
          <header>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6 leading-tight" itemProp="name">
              {language === "es" ? "Escáner de Landing Pages" : "Landing Page Scanner"} <br />
              <span className="text-indigo-400">{language === "es" ? "& Prevención de Malware" : "& Malware Prevention"}</span>
            </h2>
          </header>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed" itemProp="description">
            {language === "es"
              ? "Análisis de la URL de destino simulando el crawler de Google para detectar señales de Software Malicioso o Sistemas de Elusión (Circumventing Systems) antes de que la cuenta sea suspendida."
              : "Destination URL analysis simulating the Google crawler to detect Malicious Software signals or Circumventing Systems before your account gets suspended."}
          </p>
          <ul className="space-y-4">
            {[
              language === "es" ? "Detección de redirecciones engañosas" : "Deceptive redirects detection",
              language === "es" ? "Verificación de malware y scripts ocultos" : "Malware and hidden scripts verification",
              language === "es" ? "Validación de políticas de transparencia (contacto, privacidad)" : "Transparency policy validation (contact, privacy)",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-300 group">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 group-hover:scale-125 transition-transform shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </article>

       {/* Module 3: MCC Monitoring */}
       <article className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center reveal-on-scroll" itemScope itemType="https://schema.org/FeatureAction">
        <div className="flex flex-col">
          <header>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6 leading-tight" itemProp="name">
            {language === "es" ? "Monitoreo Continuo" : "Continuous Monitoring"} <br />
            <span className="text-emerald-400">{language === "es" ? "Para Agencias (MCC)" : "For Agencies (MCC)"}</span>
          </h2>
          </header>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed" itemProp="description">
            {language === "es"
              ? "Dashboard centralizado para agencias con alertas tempranas. Actúa antes de que Google rechace anuncios a nivel masivo o suspenda las cuentas de tus clientes."
              : "Centralized dashboard for agencies with early alerts. Act before Google rejects ads on a massive scale or suspends your clients' accounts."}
          </p>
          <ul className="space-y-4" aria-label={language === "es" ? "Ventajas para MCC" : "MCC Advantages"}>
            {[
              language === "es" ? "Supervisión de múltiples cuentas en un solo panel" : "Multi-account supervision in a single panel",
              language === "es" ? "Alertas por email o Slack de rechazos de anuncios" : "Email or Slack alerts for ad disapprovals",
              language === "es" ? "Generación de reportes de cumplimiento (Compliance) en PDF" : "PDF compliance report generation",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-300 group">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 group-hover:scale-125 transition-transform shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Alerts Visual */}
        <div className="relative" aria-hidden="true">
           <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-2xl blur opacity-20" />
           <div className="relative glass-landing rounded-2xl p-10 border border-white/10 overflow-hidden group bg-[#0a0507]">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                   <h4 className="text-white font-black uppercase text-xs tracking-widest">Early Alert System</h4>
                   <p className="text-[11px] text-slate-500 uppercase">Monitoring MCC accounts...</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-center transition-all hover:bg-emerald-500/20">
                       <Layers className="w-5 h-5 text-emerald-500/40" />
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 border-dashed relative overflow-hidden">
                  <div className="absolute inset-0 bg-emerald-500/5 pulse-slow" />
                  <p className="text-[11px] font-mono text-emerald-300 leading-relaxed relative z-10">
                    "Alert: Client Account #102-392 at risk. 5 Ads flagged for Unacceptable Practices. Action required."
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
