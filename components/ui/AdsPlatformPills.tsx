import React from "react";

const PLATFORMS = [
  { id: "Universal / Multiplatform", label: "Universal", icon: "🌐" },
  { id: "Google Ads", label: "Google", icon: "🔍" },
  { id: "Meta Ads", label: "Meta", icon: "📘" },
  { id: "TikTok Ads", label: "TikTok", icon: "🎵" },
  { id: "YouTube Ads", label: "YouTube", icon: "▶️" },
  { id: "LinkedIn Ads", label: "LinkedIn", icon: "💼" },
  { id: "Programmatic", label: "Programmatic", icon: "⚡" },
];

interface AdsPlatformPillsProps {
  value: string;
  onChange: (platform: string) => void;
  theme?: "dark" | "light";
  language?: string;
}

export const AdsPlatformPills: React.FC<AdsPlatformPillsProps> = ({
  value,
  onChange,
  theme = "dark",
  language = "es",
}) => {
  return (
    <div className="w-full">
      <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">
        {language === "es" ? "Ecosistema de Ads" : "Ads Ecosystem"}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {PLATFORMS.map((p) => {
          const isActive = value === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onChange(p.id)}
              title={p.id}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 border whitespace-nowrap ${
                isActive
                  ? "bg-indigo-500 border-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] scale-105"
                  : theme === "dark"
                  ? "bg-white/5 border-white/10 text-slate-400 hover:bg-indigo-500/20 hover:border-indigo-500/40 hover:text-indigo-300"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              <span className="text-sm">{p.icon}</span>
              {p.label}
            </button>
          );
        })}
      </div>
      <p className={`text-[11px] font-bold uppercase tracking-widest leading-relaxed mt-3 ${theme === "dark" ? "text-slate-600" : "text-slate-400"}`}>
        {language === "es"
          ? "La IA ajustará el análisis según los estándares de esta plataforma."
          : "AI will adjust analysis criteria based on this platform's standards."}
      </p>
    </div>
  );
};

export default AdsPlatformPills;
