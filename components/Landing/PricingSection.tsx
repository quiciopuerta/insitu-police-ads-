import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Check } from "lucide-react";
import { Language } from "../../types";

interface PricingSectionProps {
  language: Language;
  billingCycle: "monthly" | "yearly";
  setBillingCycle: (cycle: "monthly" | "yearly") => void;
  plans: any[];
  comingSoon?: { enabled: boolean };
  setShowConsulting: (show: boolean) => void;
  setSelectedPlan: (plan: any) => void;
  setShowCheckout: (show: boolean) => void;
}

const PricingSection: React.FC<PricingSectionProps> = ({
  language,
  billingCycle,
  setBillingCycle,
  plans,
  comingSoon,
  setShowConsulting,
  setSelectedPlan,
  setShowCheckout,
}) => {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24 reveal-on-scroll" id="pricing">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-6">
          {language === "es" ? "Planes Flexibles" : "Flexible Plans"}
        </h2>
        <div className="flex items-center justify-center gap-4">
          <span className={`text-sm cursor-pointer ${billingCycle === "monthly" ? "text-slate-100 font-bold" : "text-slate-400"}`} onClick={() => setBillingCycle("monthly")}>
            {language === "es" ? "Mensual" : "Monthly"}
          </span>
          <div className="w-14 h-7 bg-[#ff477b]/20 rounded-full relative p-1 cursor-pointer transition-colors hover:bg-[#ff477b]/30" onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}>
            <div className={`w-5 h-5 bg-[#ff477b] rounded-full absolute shadow-sm shadow-[#ff477b]/50 transition-all ${billingCycle === "yearly" ? "right-1" : "left-1"}`} />
          </div>
          <span className={`text-sm flex items-center gap-2 cursor-pointer ${billingCycle === "yearly" ? "text-slate-100 font-bold" : "text-slate-400"}`} onClick={() => setBillingCycle("yearly")}>
            {language === "es" ? "Anual" : "Yearly"}
            <span className="bg-emerald-500/20 text-emerald-400 text-[11px] px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
              {language === "es" ? "AHORRA 20%" : "SAVE 20%"}
            </span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
        {plans.map((plan, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            style={{ overflow: 'visible' }}
            className={`p-8 md:p-10 rounded-3xl flex flex-col border relative z-10 bg-slate-900/60 backdrop-blur-sm ${plan.recommended ? "border-2 border-[#ff477b] scale-[1.02] md:scale-105 shadow-2xl shadow-[#ff477b]/10" : "border-white/5"
              }`}
          >
            {plan.recommended && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#ff477b] text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-lg shadow-[#ff477b]/30 z-20">
                {language === "es" ? "Más Popular" : "Most Popular"}
              </div>
            )}
            <h3 className="text-slate-100 text-xl font-bold mb-2 relative z-10">{plan.name}</h3>
            <p className="text-slate-500 text-sm mb-8 relative z-10">{plan.target}</p>
            <div className="mb-8 relative z-10">
              {plan.tier === "Agency" ? (
                <>
                  <span className="text-2xl font-bold text-slate-100">{language === "es" ? "Solo por contacto" : "Contact only"}</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold text-slate-100">${plan.price}</span>
                  <span className="text-slate-500 text-sm">/{billingCycle === "monthly" ? (language === "es" ? "mes" : "mo") : (language === "es" ? "año" : "yr")}</span>
                </>
              )}
            </div>
            <ul className="space-y-4 mb-10 flex-grow relative z-10">
              {plan.features.map((f: any, idx: number) => (
                <li key={idx} className="flex items-center gap-3 text-sm" style={{ color: f.included ? (plan.recommended ? '#cbd5e1' : '#94a3b8') : '#475569' }}>
                  {f.included
                    ? <CheckCircle2 className="w-4 h-4 text-[#ff477b] shrink-0" />
                    : <Check className="w-4 h-4 opacity-20 shrink-0" />
                  }
                  <span className={f.special ? "text-white font-bold" : ""}>{f.label}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                if (plan.tier === "Agency") {
                  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                  // Fallback to modal if section not in view or for better UX as secondary action
                  setTimeout(() => setShowConsulting(true), 800);
                } else {
                  setSelectedPlan(plan.tier);
                  setShowCheckout(true);
                }
              }}
              disabled={comingSoon?.enabled}
              className={`w-full py-4 rounded-xl font-bold transition-all relative z-10 ${plan.recommended
                ? "bg-[#ff477b] text-white hover:opacity-90 shadow-lg shadow-[#ff477b]/30 hover:scale-[1.02]"
                : "bg-white/5 border border-white/10 text-white hover:bg-primary hover:text-white hover:border-primary hover:border-white/20"
                }`}
            >
              {comingSoon?.enabled
                ? (language === "es" ? "PRÓXIMAMENTE" : "COMING SOON")
                : plan.tier === "Agency"
                  ? (language === "es" ? "Contactar" : "Contact Us")
                  : (language === "es" ? "Elegir Plan" : "Choose Plan")}
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default PricingSection;
