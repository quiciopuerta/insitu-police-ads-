import React, { useState } from "react";
import { InfoTooltip } from "./ui/InfoTooltip";
import { KeywordMetric, AdExtension } from "../types";

interface Props {
  negativeKeywords?: string[];
  adExtensions?: AdExtension[];
  extractedKeywords?: (KeywordMetric & {
    qualityScore?: number;
    adRelevance?: string;
    landingPageExp?: string;
    expectedCTR?: string;
    qsRecommendation?: string;
  })[];
  themeContext?: string;
}

const QS_COLOR = (score: number) =>
  score >= 8 ? "text-emerald-400" : score >= 6 ? "text-yellow-400" : "text-rose-400";

const QS_BAR_COLOR = (score: number) =>
  score >= 8 ? "#10b981" : score >= 6 ? "#f59e0b" : "#f43f5e";

const RATING_PILL = (val: string) =>
  val?.toLowerCase().includes("arriba") || val?.toLowerCase().includes("above")
    ? "bg-emerald-500/15 text-emerald-400"
    : val?.toLowerCase().includes("abajo") || val?.toLowerCase().includes("below")
    ? "bg-rose-500/15 text-rose-400"
    : "bg-slate-500/15 text-slate-400";

const TYPE_CONFIG: Record<string, { color: string; icon: string }> = {
  Sitelink:           { color: "border-blue-500/30 bg-blue-500/5",   icon: "🔗" },
  Callout:            { color: "border-emerald-500/30 bg-emerald-500/5", icon: "📣" },
  "Structured Snippet": { color: "border-indigo-500/30 bg-indigo-500/5",  icon: "📋" },
  Call:               { color: "border-yellow-500/30 bg-yellow-500/5", icon: "📞" },
  "Lead Form":        { color: "border-[#ff477b]/30 bg-[#ff477b]/5",  icon: "📝" },
};

const downloadNegativeCSV = (negatives: string[], theme: string) => {
  const csv = ["Keyword Negativa\n", ...negatives.map((k) => `"${k}"`).join("\n")].join("");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `NegativeKeywords_${(theme || "ads").replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const AdsInsightsPanel: React.FC<Props> = ({
  negativeKeywords,
  adExtensions,
  extractedKeywords,
  themeContext,
}) => {
  const [activeTab, setActiveTab] = useState<"qs" | "negatives" | "extensions">("qs");

  const kwsWithQS = (extractedKeywords || []).filter((k) => (k as any).qualityScore !== undefined);
  const hasQS = kwsWithQS.length > 0;
  const hasNeg = negativeKeywords && negativeKeywords.length > 0;
  const hasExt = adExtensions && adExtensions.length > 0;

  if (!hasQS && !hasNeg && !hasExt) return null;

  return (
    <section className="glass-card rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-slate-800 text-white rounded-lg flex items-center justify-center font-black text-xs">05</div>
        <h3 className="text-xl font-black text-white tracking-tighter uppercase">
          Inteligencia de Campaña — <span className="text-[#ff477b]">{themeContext}</span>
        </h3>
        <InfoTooltip text="Quality Score estimado, Negative Keywords y Extensiones de Anuncio recomendadas." />
      </div>

      {/* Tab pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {hasQS && (
          <button
            onClick={() => setActiveTab("qs")}
            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${activeTab === "qs" ? "bg-[#ff477b] border-[#ff477b] text-white shadow-lg shadow-[#ff477b]/20" : "bg-white/5 border-white/5 text-slate-400 hover:bg-primary hover:text-white hover:border-primary"}`}
          >
            📊 Quality Score
          </button>
        )}
        {hasNeg && (
          <button
            onClick={() => setActiveTab("negatives")}
            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${activeTab === "negatives" ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-white/5 border-white/5 text-slate-400 hover:bg-primary hover:text-white hover:border-primary"}`}
          >
            🚫 Negativas ({negativeKeywords?.length})
          </button>
        )}
        {hasExt && (
          <button
            onClick={() => setActiveTab("extensions")}
            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${activeTab === "extensions" ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-white/5 border-white/5 text-slate-400 hover:bg-primary hover:text-white hover:border-primary"}`}
          >
            🔌 Extensiones ({adExtensions?.length})
          </button>
        )}
      </div>

      {/* ── Quality Score Tab ── */}
      {activeTab === "qs" && hasQS && (
        <div className="space-y-3">
          {kwsWithQS.slice(0, 10).map((k, i) => {
            const qs = (k as any).qualityScore as number;
            return (
              <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* QS Score */}
                  <div className="flex items-center gap-3 shrink-0 w-24">
                    <div className="relative w-12 h-12">
                      <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15" fill="none"
                          stroke={QS_BAR_COLOR(qs)} strokeWidth="3"
                          strokeDasharray={`${(qs / 10) * 94.25} 94.25`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-sm font-black ${QS_COLOR(qs)}`}>{qs}</span>
                    </div>
                  </div>
                  {/* Keyword */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate mb-2">{k.term}</p>
                    <div className="flex flex-wrap gap-2">
                      {[(k as any).adRelevance, (k as any).landingPageExp, (k as any).expectedCTR].map((val, vi) => (
                        val && (
                          <span key={vi} className={`px-2 py-0.5 rounded-lg text-[11px] font-black uppercase ${RATING_PILL(val)}`}>
                            {["Ad Rel.", "Landing", "CTR"][vi]}: {val}
                          </span>
                        )
                      ))}
                    </div>
                    {(k as any).qsRecommendation && (
                      <p className="text-[11px] text-slate-400 mt-1.5 italic">💡 {(k as any).qsRecommendation}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Negative Keywords Tab ── */}
      {activeTab === "negatives" && hasNeg && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-[11px] text-slate-400 font-black uppercase">
              {negativeKeywords?.length || 0} términos a excluir del targeting
            </p>
            <button
              onClick={() => downloadNegativeCSV(negativeKeywords || [], themeContext || "ads")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-400 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              Exportar CSV
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {negativeKeywords!.map((kw, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] font-bold rounded-xl hover:bg-rose-500/20 transition-colors"
              >
                — {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Ad Extensions Tab ── */}
      {activeTab === "extensions" && hasExt && (
        <div className="space-y-4">
          {Object.entries(
            adExtensions!.reduce((acc: Record<string, typeof adExtensions>, ext) => {
              const t = (ext as any).type || "Otro";
              if (!acc[t]) acc[t] = [];
              acc[t]!.push(ext);
              return acc;
            }, {})
          ).map(([type, exts]) => {
            const cfg = TYPE_CONFIG[type] || { color: "border-white/10 bg-white/5", icon: "⚡" };
            return (
              <div key={type} className={`border rounded-2xl p-5 ${cfg.color}`}>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span>{cfg.icon}</span> {type} ({(exts || []).length})
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  {(exts || []).map((ext, i) => (
                    <div key={i} className="p-3 bg-white/5 rounded-xl">
                      {ext.title && <p className="text-xs font-black text-white mb-0.5">{ext.title}</p>}
                      {ext.description && <p className="text-[11px] text-slate-400">{ext.description}</p>}
                      {(ext as any).value && <p className="text-[11px] text-slate-300 font-bold">{(ext as any).value}</p>}
                      {ext.url && <p className="text-[11px] text-blue-400 mt-0.5">{ext.url}</p>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default React.memo(AdsInsightsPanel);
