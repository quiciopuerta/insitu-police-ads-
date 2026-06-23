import React from "react";
import { Language } from "../../types";

interface TrustBarProps {
  language: Language;
}

const TrustBar: React.FC<TrustBarProps> = ({ language }) => {
  return (
    <section className="max-w-7xl mx-auto px-6 py-8 reveal-on-scroll">
      <div className="glass-landing rounded-2xl border border-white/5 p-8 md:p-10">
        <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-500 mb-8">
          {language === "es" ? "Potenciado por los 3 modelos de IA más avanzados del mundo" : "Powered by the world's 3 most advanced AI models"}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {[
            { name: "Google Gemini", sub: "Multimodal", color: "#4285F4" },
            { name: "OpenAI GPT-4o", sub: "Reasoning", color: "#10a37f" },
            { name: "Anthropic Claude", sub: "Analysis", color: "#d97706" },
          ].map((ai, i) => (
            <div key={i} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg" style={{ backgroundColor: ai.color + '15', color: ai.color }}>
                {ai.name.charAt(0)}
              </div>
              <div>
                <p className="text-slate-200 text-sm font-bold group-hover:text-white transition-colors">{ai.name}</p>
                <p className="text-slate-500 text-[11px] uppercase tracking-widest">{ai.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBar;
