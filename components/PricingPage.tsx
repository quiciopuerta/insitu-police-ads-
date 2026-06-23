import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AuthUser, PlanTier, Language } from "../types";
import { authService } from "../services/authService";
import { martechService } from "../services/martechService";
import LogoIsotype from "./LogoIsotype";

interface PricingPageProps {
  onClose: () => void;
  onGetStarted: () => void;
  onSelectPlan: (tier: PlanTier) => void;
  currentUser: AuthUser | null;
  language?: Language;
}

const PricingPage: React.FC<PricingPageProps> = ({
  onClose,
  onGetStarted,
  onSelectPlan,
  currentUser,
  language = 'es',
}) => {
  useEffect(() => {
    martechService.trackSubscription("view_pricing", {});
  }, []);

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const pricing = authService.getPricing();
  const settings = authService.getSettings();
  const comingSoon = settings.comingSoon;

  const plans = [
    {
      name: "ON-SITE",
      tier: "Starter",
      price:
        billingCycle === "monthly"
          ? (pricing?.Starter?.monthly ?? 95)
          : (pricing?.Starter?.yearly ?? 950),
      target: language === 'es' ? "Freelancers, Solopreneurs, Copywriters" : "Freelancers, Solopreneurs, Copywriters",
      argument: language === 'es' ? "Ideal para optimizar copy y SEO on-page rápido." : "Ideal for quick copy and on-page SEO optimization.",
      features: [
        { label: language === 'es' ? "3 Consultas de Texto Mensuales" : "3 Monthly Text Queries", included: true },
        { label: language === 'es' ? "Auditoría SEM & SEO Completa" : "Full SEM & SEO Audit", included: true },
        { label: language === 'es' ? "Imágenes/Video: NO INCLUIDO" : "Images/Video: NOT INCLUDED", included: false },
        { label: language === 'es' ? "Brand Guardian: NO INCLUIDO" : "Brand Guardian: NOT INCLUDED", included: false },
      ],
      recommended: false,
    },
    {
      name: "DEEP SCAN",
      tier: "Growth",
      price:
        billingCycle === "monthly"
          ? (pricing?.Growth?.monthly ?? 245)
          : (pricing?.Growth?.yearly ?? 2450),
      target: language === 'es' ? "Pequeñas Agencias, E-commerce, Startups" : "Small Agencies, E-commerce, Startups",
      argument: language === 'es'
        ? "El estándar para equipos que necesitan contenido visual que convierta."
        : "The standard for teams that need visual content that converts.",
      features: [
        { label: language === 'es' ? "5 Texto + 7 Imágenes al mes" : "5 Text + 7 Images per month", included: true },
        { label: language === 'es' ? "Todo lo de Starter" : "Everything in Starter", included: true },
        { label: language === 'es' ? "Análisis de Video Pro" : "Pro Video Analysis", included: true },
        { label: language === 'es' ? "Brand Guardian: NO INCLUIDO" : "Brand Guardian: NOT INCLUDED", included: false },
      ],
      recommended: true,
    },
    {
      name: "OMNI-CHANNEL",
      tier: "Agency",
      price:
        billingCycle === "monthly"
          ? (pricing?.Agency?.monthly ?? 595)
          : (pricing?.Agency?.yearly ?? 5950),
      target: language === 'es' ? "Grandes Agencias, Marcas Corporativas" : "Large Agencies, Corporate Brands",
      argument: language === 'es'
        ? "Tu seguro de calidad automatizado. Supervisa el cumplimiento de marca."
        : "Your automated quality assurance. Monitor brand compliance.",
      features: [
        { label: language === 'es' ? "Uso Ilimitado Especial*" : "Special Unlimited Use*", included: true },
        {
          label: language === 'es' ? "BRAND GUARDIAN 🛡️" : "BRAND GUARDIAN 🛡️",
          included: true,
          special: true,
        },
        {
          label: language === 'es' ? "Feedback Loop Inteligente" : "Intelligent Feedback Loop",
          included: true,
          special: true,
        },
        { label: language === 'es' ? "White Label & API Access" : "White Label & API Access", included: true, special: true },
        { label: language === 'es' ? "Soporte VIP Directo" : "Direct VIP Support", included: true },
      ],
      recommended: false,
    },
  ];

  const tableData = [
    {
      feature: language === 'es' ? "Consultas de Texto (IA)" : "Text Queries (AI)",
      starter: "3 / mes",
      growth: "5 / mes",
      agency: language === 'es' ? "Ilimitado*" : "Unlimited*",
    },
    {
      feature: language === 'es' ? "Generación de Imágenes (IA)" : "Image Generation (AI)",
      starter: false,
      growth: "7 / mes",
      agency: language === 'es' ? "Ilimitado*" : "Unlimited*",
    },
    {
      feature: language === 'es' ? "Análisis de Video Avanzado" : "Advanced Video Analysis",
      starter: false,
      growth: language === 'es' ? "4 min / mes" : "4 min / mo",
      agency: language === 'es' ? "20 min / mes" : "20 min / mo",
    },
    {
      feature: language === 'es' ? "Feedback Loop (IA Learning)" : "Feedback Loop (AI Learning)",
      starter: false,
      growth: false,
      agency: true,
    },
    {
      feature: "PageSpeed & Web Vitals",
      starter: true,
      growth: true,
      agency: true,
    },
    {
      feature: language === 'es' ? "Análisis via URL (Social/Cloud)" : "URL Analysis (Social/Cloud)",
      starter: false,
      growth: true,
      agency: true,
    },
    {
      feature: language === 'es' ? "Brand Guardian (Validación IA)" : "Brand Guardian (AI Validation)",
      starter: false,
      growth: false,
      agency: language === 'es' ? "Exclusivo 🛡️" : "Exclusive 🛡️",
    },
    {
      feature: language === 'es' ? "Laboratorio de Briefing" : "Briefing Lab",
      starter: false,
      growth: false,
      agency: true,
    },
    {
      feature: language === 'es' ? "Exportación Enriquecida (PPTX/CSV)" : "Enriched Export (PPTX/CSV)",
      starter: language === 'es' ? "Básico" : "Basic",
      growth: language === 'es' ? "Avanzado" : "Advanced",
      agency: "Full 💎",
    },
    {
      feature: "White-label & API Access",
      starter: false,
      growth: false,
      agency: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 overflow-y-auto selection:bg-[#ff477b]/30">
      {/* Navigation with Brand Identity */}
      <nav className="sticky top-0 w-full z-50 border-b border-white/5 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={onClose}
          >
            <LogoIsotype className="w-8 h-8 text-[#ff477b]" />
            <span className="font-black text-xl tracking-tighter text-white">
              INsitu<span className="text-[#ff477b]">AI</span>
            </span>
            <div className="h-4 w-px bg-white/10 hidden sm:block mx-2"></div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40 hidden sm:block">
              Pricing
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-[11px] font-black uppercase tracking-widest flex items-center space-x-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10"
          >
            <span>{language === 'es' ? 'Cerrar' : 'Close'}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </nav>

      <section className="pt-24 pb-20 max-w-[120rem] mx-auto px-6">
        <div className="text-center mb-20 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-full bg-gradient-to-r from-transparent via-[#ff477b]/5 to-transparent blur-3xl pointer-events-none"></div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl md:text-6xl lg:text-7xl font-black mb-8 uppercase tracking-tighter text-white leading-tight text-center">
              {language === 'es' ? '¿Listo para' : 'Ready to'}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff477b] to-purple-500">
                {language === 'es' ? 'Escalar con IA?' : 'Scale with AI?'}
              </span>
            </h2>
            <p className="text-slate-400 mb-10 max-w-xl mx-auto text-lg font-medium">
              {language === 'es'
                ? 'Elige el plan que se adapte al tamaño de tu ambición. Cancelas cuando quieras.'
                : 'Choose the plan that fits the size of your ambition. Cancel anytime.'}
            </p>
          </motion.div>

          <div className="flex items-center justify-center space-x-6 bg-slate-900/80 backdrop-blur-sm w-fit mx-auto px-8 py-3 rounded-full border border-white/10 shadow-2xl relative z-10">
            <span
              className={`text-xs font-black uppercase tracking-widest cursor-pointer transition-colors ${billingCycle === "monthly" ? "text-white" : "text-slate-500"}`}
              onClick={() => setBillingCycle("monthly")}
            >
              {language === 'es' ? 'Mensual' : 'Monthly'}
            </span>
            <button
              onClick={() =>
                setBillingCycle(
                  billingCycle === "monthly" ? "yearly" : "monthly",
                )
              }
              className="w-14 h-7 bg-slate-800 rounded-full relative p-1 transition-all border border-white/5"
            >
              <motion.div
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`w-5 h-5 bg-[#ff477b] rounded-full shadow-lg ${billingCycle === "yearly" ? "ml-auto" : ""}`}
              />
            </button>
            <span
              className={`text-xs font-black uppercase tracking-widest cursor-pointer transition-colors ${billingCycle === "yearly" ? "text-[#ff477b]" : "text-slate-500"}`}
              onClick={() => setBillingCycle("yearly")}
            >
              {language === 'es' ? 'Anual (20% OFF)' : 'Yearly (20% OFF)'}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -10 }}
              className={`flex flex-col p-10 rounded-[3rem] border transition-all ${
                plan.recommended
                  ? "bg-gradient-to-b from-slate-900 to-slate-950 border-[#ff477b] shadow-2xl relative"
                  : "bg-slate-950 border-white/5 hover:border-white/20"
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#ff477b] text-white px-8 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                  <span>{language === 'es' ? '🔥 Más Popular' : '🔥 Most Popular'}</span>
                </div>
              )}
              <div className="mb-8">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 h-6">
                  {plan.target}
                </p>
                <h3 className="text-3xl font-black mb-1 text-white">
                  {plan.name}
                </h3>
                <div className="flex items-baseline space-x-2 my-4">
                  {typeof plan.price === "number" ? (
                    <>
                      <span className="text-5xl font-black text-white">
                        ${plan.price}
                      </span>
                      <span className="text-slate-500 text-xs uppercase font-black">
                        /{billingCycle === "monthly" ? (language === 'es' ? 'mes' : 'mo') : (language === 'es' ? 'año' : 'yr')}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-white py-2">
                        {language === 'es' ? 'Solo por Contacto' : 'Contact Only'}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        {language === 'es' ? 'Plan personalizado' : 'Custom plan'}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[11px] font-medium text-emerald-400 uppercase tracking-wide mb-4 border-l-2 border-emerald-500 pl-4 py-1 bg-emerald-500/5 rounded-r-lg">
                  {plan.argument}
                </p>
              </div>

              <div className="flex-1 space-y-4 mb-10">
                {plan.features.map((f, idx) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <div
                      className={`mt-1 w-4 h-4 rounded-full flex items-center justify-center text-[11px] shrink-0 ${f.included ? (f.special ? "bg-gradient-to-r from-[#ff477b] to-purple-500 text-white" : "bg-slate-800 text-emerald-400") : "bg-slate-900 text-slate-600"}`}
                    >
                      {f.included ? "✓" : "✕"}
                    </div>
                    <span
                      className={`text-[12px] font-bold ${f.included ? "text-slate-300" : "text-slate-600"} ${f.special ? "text-white" : ""}`}
                    >
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              <motion.button
                whileHover={!comingSoon?.enabled ? { scale: 1.02 } : {}}
                whileTap={!comingSoon?.enabled ? { scale: 0.98 } : {}}
                disabled={comingSoon?.enabled}
                onClick={() => {
                  if (comingSoon?.enabled) return;
                  if (plan.tier === "Agency") {
                    martechService.trackSubscription("view_pricing", { plan: plan.tier });
                    window.location.href = "mailto:info@insitu.company?subject=Agency%20Plan%20-%20INsitu%20AI";
                    return;
                  }
                  martechService.trackSubscription("begin_checkout", {
                    plan: plan.tier,
                    value: typeof plan.price === "number" ? plan.price : 0
                  });
                  onSelectPlan(plan.tier as PlanTier);
                }}
                className={`w-full py-5 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all ${
                  comingSoon?.enabled
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                    : plan.recommended
                      ? "bg-[#ff477b] text-white shadow-xl shadow-[#ff477b]/20 hover:brightness-110"
                      : "bg-white/5 text-white hover:bg-primary hover:text-white hover:border-primary border border-white/10"
                } ${!settings.paypal?.enabled && plan.tier !== "Starter" && plan.tier !== "Agency" ? "opacity-75" : ""}`}
              >
                {comingSoon?.enabled
                  ? (language === 'es' ? "Próximamente" : "Coming Soon")
                  : plan.tier === "Agency"
                    ? (language === 'es' ? "Contactar Equipo" : "Contact Sales")
                    : currentUser?.subscription.plan === plan.tier
                      ? (language === 'es' ? "Plan Actual" : "Current Plan")
                      : plan.tier === "Starter"
                        ? (language === 'es' ? "Comenzar Gratis" : "Start Free")
                        : settings.paypal?.enabled
                          ? (language === 'es' ? "Contratar Plan" : "Subscribe")
                          : (language === 'es' ? "Consultar Disponibilidad" : "Check Availability")}
              </motion.button>
              {comingSoon?.enabled && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-amber-500 mb-1">
                    {language === 'es' ? 'Aviso del Sistema' : 'System Notice'}
                  </p>
                  <p className="text-xs font-bold text-slate-300 leading-relaxed">
                    {comingSoon.message}
                  </p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Agency Feature Showcase - New Animated Section */}
        <div className="mt-40 mb-20 overflow-hidden rounded-[4rem] bg-[#020617] border border-white/5 relative group p-8 md:p-16">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-1000"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-purple-500/20 transition-all duration-1000"></div>

          <div className="flex flex-col lg:flex-row items-center gap-16 relative z-10">
            <div className="lg:w-1/2">
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-[#ff477b] mb-6 block">
                {language === 'es' ? 'Optimización Martech' : 'Martech Optimization'}
              </span>
              <h3 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter leading-[1.1]">
                {language === 'es' ? 'INSIGHTS DE' : 'KEYWORD'} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
                  {language === 'es' ? 'PALABRAS CLAVE' : 'INSIGHTS'}
                </span>
              </h3>
              <p className="text-slate-400 text-lg mb-12 max-w-lg leading-relaxed font-medium">
                {language === 'es'
                  ? 'Nuestra IA analiza las tendencias de búsqueda en tiempo real de Google y los hashtags virales de TikTok para sugerirte los términos con mayor potencial de conversión para tus campañas.'
                  : 'Our AI analyzes real-time Google search trends and viral TikTok hashtags to suggest the terms with the highest conversion potential for your campaigns.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-[2rem] bg-slate-900/50 border border-white/5 backdrop-blur-sm group/card hover:border-[#ff477b]/30 transition-all hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4 group-hover/card:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2">Google Ads SEO</h4>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">{language === 'es' ? 'Keywords de alta intención y baja competencia.' : 'High-intent, low-competition keywords.'}</p>
                </div>

                <div className="p-6 rounded-[2rem] bg-slate-900/50 border border-white/5 backdrop-blur-sm group/card hover:border-purple-500/30 transition-all hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 group-hover/card:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2">TikTok Viral Hooks</h4>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">{language === 'es' ? 'Términos que detienen el scroll y aumentan el CTR.' : 'Scroll-stopping terms that boost CTR.'}</p>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="relative p-1 rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent">
                <div className="bg-[#0f172a] rounded-[2.8rem] overflow-hidden shadow-2xl border border-white/5">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[.3em] text-slate-500">Live AI Analysis</span>
                  </div>

                  <div className="p-8 space-y-6">
                    {[
                      { label: "AI Marketing", sub: language === 'es' ? "125K Búsquedas/mes" : "125K Searches/mo", val: "+45%", color: "bg-cyan-500" },
                      { label: "Creative Strategy", sub: language === 'es' ? "82K Búsquedas/mes" : "82K Searches/mo", val: "+12%", color: "bg-emerald-500" },
                      { label: "TikTok Ads ROI", sub: language === 'es' ? "240K Búsquedas/mes" : "240K Searches/mo", val: "+130%", color: "bg-[#ff477b]" },
                      { label: "SEM Optimization", sub: language === 'es' ? "45K Búsquedas/mes" : "45K Searches/mo", val: "+5%", color: "bg-amber-500" },
                    ].map((item, idx) => (
                      <motion.div
                        key={idx}
                        className="p-5 rounded-lg bg-slate-900/50 border border-white/5 flex items-center justify-between group/row"
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <div className="flex items-center space-x-5">
                          <div className={`w-1 h-8 rounded-full ${item.color}`}></div>
                          <div>
                            <p className="text-[11px] font-black text-white uppercase tracking-widest">{item.label}</p>
                            <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest mt-1">{item.sub}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <motion.p
                            initial={{ scale: 0.9 }}
                            whileInView={{ scale: 1 }}
                            className={`text-xs font-black ${item.val.includes('+130') ? "text-[#ff477b] scale-110" : item.color.replace('bg-', 'text-')}`}
                          >
                            {item.val}
                          </motion.p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="p-8 border-t border-white/5 bg-slate-900/10 flex items-center justify-between">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{language === 'es' ? 'Actualizado hace 2 min por INsitu Engine' : 'Updated 2 min ago by INsitu Engine'}</p>
                    <button className="text-[11px] font-black text-white uppercase tracking-[.2em] flex items-center space-x-2 group/btn">
                      <span>{language === 'es' ? 'Ver Informe Completo' : 'View Full Report'}</span>
                      <svg className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Comparison Table */}
        <div className="mt-32">
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl font-black text-center text-white mb-16 uppercase tracking-tighter"
          >
            {language === 'es' ? 'Comparativa Detallada' : 'Detailed Comparison'}
          </motion.h3>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-slate-900/50 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl relative z-10"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-8 md:px-12 py-10 text-[11px] md:text-[11px] font-black uppercase text-slate-500 tracking-widest w-1/4">
                      {language === 'es' ? 'Capacidad Técnica Auditada' : 'Audited Technical Capability'}
                    </th>
                    <th className="px-6 md:px-10 py-10 text-center text-white font-black text-xs md:text-sm">
                      On-Site (${pricing?.Starter.monthly})
                    </th>
                    <th className="px-6 md:px-10 py-10 text-center text-[#ff477b] font-black text-xs md:text-sm">
                      Deep Scan (${pricing?.Growth.monthly})
                    </th>
                    <th className="px-6 md:px-10 py-10 text-center text-white font-black text-xs md:text-sm">
                      Omni-Channel ({language === 'es' ? 'Contactar' : 'Contact'})
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tableData.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-white/[0.01] transition-colors group"
                    >
                      <td className="px-8 md:px-12 py-6 md:py-8 text-[11px] md:text-sm font-bold text-slate-300 group-hover:text-white transition-colors">
                        {row.feature}
                      </td>
                      <td className="px-6 md:px-10 py-6 md:py-8 text-center text-[11px] md:text-xs font-black uppercase tracking-widest text-slate-500">
                        {typeof row.starter === "string" ? (
                          row.starter
                        ) : row.starter ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span className="text-slate-700">×</span>
                        )}
                      </td>
                      <td className="px-6 md:px-10 py-6 md:py-8 text-center text-[11px] md:text-xs font-black uppercase tracking-widest text-[#ff477b]">
                        {typeof row.growth === "string" ? (
                          row.growth
                        ) : row.growth ? (
                          "✓"
                        ) : (
                          <span className="text-slate-700">×</span>
                        )}
                      </td>
                      <td className="px-6 md:px-10 py-6 md:py-8 text-center text-[11px] md:text-xs font-black uppercase tracking-widest text-white">
                        {typeof row.agency === "string" ? (
                          row.agency
                        ) : row.agency ? (
                          "✓"
                        ) : (
                          <span className="text-slate-700">×</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
