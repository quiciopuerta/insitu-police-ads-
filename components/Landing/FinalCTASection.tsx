import React from "react";
import { Rocket } from "lucide-react";
import { Language } from "../../types";

interface FinalCTASectionProps {
  language: Language;
  onOpenPricing: () => void;
  setShowLeadMagnet: (show: boolean) => void;
}

const FinalCTASection: React.FC<FinalCTASectionProps> = ({
  language,
  onOpenPricing,
  setShowLeadMagnet,
}) => {
  return (
    <section className="max-w-7xl mx-auto px-6 py-24 reveal-on-scroll">
      <div className="relative rounded-3xl overflow-hidden border border-[#ff477b]/20">
        <div className="absolute inset-0 bg-gradient-to-r from-[#ff477b]/20 via-indigo-600/10 to-[#ff477b]/20" />
        <div className="absolute inset-0 bg-[#0a0507]/80" />
        <div className="relative z-10 px-8 md:px-16 py-16 md:py-20 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-100 mb-6 leading-tight">
            {language === "es"
              ? "¿Listo para la optimización de campañas con inteligencia artificial?"
              : "Ready for AI-powered campaign optimization?"}
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10">
            {language === "es"
              ? "Comienza con una auditoría gratuita. Gemini y Claude optimizan tu pauta en Meta Ads, TikTok Ads y Google Ads desde el primer día."
              : "Start with a free audit. Gemini and Claude optimize your ads on Meta Ads, TikTok Ads and Google Ads from day one."}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setShowLeadMagnet(true)}
              className="bg-[#ff477b] hover:bg-[#ff477b]/90 text-white px-10 py-4 rounded-xl text-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-[#ff477b]/30 hover:shadow-[#ff477b]/50 hover:scale-[1.02]"
            >
              <Rocket className="w-5 h-5" />
              {language === "es" ? "Auditoría Gratis" : "Free Audit"}
            </button>
            <button
              onClick={onOpenPricing}
              className="bg-white/5 hover:bg-primary hover:text-white hover:border-primary text-white border border-white/10 px-10 py-4 rounded-xl text-lg font-bold transition-all backdrop-blur-sm hover:border-white/20"
            >
              {language === "es" ? "Ver Planes y Precios" : "View Plans & Pricing"}
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-6">
            {language === "es"
              ? "Sin tarjeta de crédito · Setup en 2 minutos · Cancela cuando quieras"
              : "No credit card · 2-minute setup · Cancel anytime"}
          </p>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
