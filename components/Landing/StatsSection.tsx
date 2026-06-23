import React from "react";
import { TrendingUp, Monitor, Zap } from "lucide-react";
import { Language } from "../../types";

interface StatsSectionProps {
  language: Language;
}

const StatsSection: React.FC<StatsSectionProps> = ({ language }) => {
  return (
    <section className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: <TrendingUp className="w-7 h-7" />, label: "ROI Growth", value: "+500%", note: language === "es" ? "Promedio en los primeros 3 meses" : "Average in the first 3 months" },
          { icon: <Monitor className="w-7 h-7" />, label: "Monitoring", value: "24/7", note: language === "es" ? "Optimización automatizada sin pausas" : "Non-stop automated optimization" },
          { icon: <Zap className="w-7 h-7" />, label: "AI Model", value: "Top Tier", note: "Gemini · GPT-4o · Claude" },
        ].map((stat, i) => (
          <div key={i} className="sweep-card-landing glass-landing p-8 rounded-2xl group border border-white/5 relative z-10">
            <div className="w-12 h-12 rounded-lg bg-[#ff477b]/20 flex items-center justify-center text-[#ff477b] mb-6 group-hover:scale-110 transition-transform relative z-10">
              {stat.icon}
            </div>
            <h3 className="text-slate-400 font-medium mb-1 relative z-10">{stat.label}</h3>
            <p className="text-4xl font-bold text-slate-100 relative z-10">{stat.value}</p>
            <p className="text-slate-500 text-sm mt-4 italic relative z-10">{stat.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsSection;
