import React, { useState } from "react";
import { Competitor } from "../types";

interface Props {
  competitors: Competitor[];
  period?: string;
  themeContext?: string;
}

// Color palette for competitor lines
const COLORS = ["#ff477b", "#3b82f6", "#10b981", "#f59e0b", "#a855f7"];

const CompetitorChart: React.FC<Props> = ({ competitors, period, themeContext }) => {
  const [activeMetric, setActiveMetric] = useState<"avgSearchVolume" | "impressionShare">("avgSearchVolume");
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Only show competitors with monthly data
  const compsWithData = competitors.filter((c) => c.monthlySeries && c.monthlySeries.length === 12);
  if (compsWithData.length === 0) return null;

  const MONTHS = compsWithData[0].monthlySeries!.map((d) => d.month);

  // Determine the values to chart
  const allValues = compsWithData.flatMap((c) =>
    c.monthlySeries!.map((d) => activeMetric === "avgSearchVolume" ? d.avgSearchVolume : d.impressionShare)
  );
  const maxVal = Math.max(...allValues) * 1.1 || 1;

  // For the long-period chart
  const W = 900;
  const H = 320;
  const PAD = 60;
  const GW = W - PAD * 2;
  const GH = H - PAD * 2;

  const xPos = (i: number) => PAD + (i * GW) / (MONTHS.length - 1);
  const yPos = (val: number) => H - PAD - (val / maxVal) * GH;

  const getPath = (comp: Competitor) => {
    const vals = comp.monthlySeries!.map((d) =>
      activeMetric === "avgSearchVolume" ? d.avgSearchVolume : d.impressionShare
    );
    return vals.map((v, i) => `${i === 0 ? "M" : "L"} ${xPos(i)} ${yPos(v)}`).join(" ");
  };

  // Export CSV helper — includes full monthly historical data
  const exportCSV = () => {
    const header = [
      "Competidor",
      ...MONTHS,
      "Avg Mensual",
      "Mes Pico",
      "Imp. Share %",
      "Overlap %",
      "Outranking %",
      "Top Page %",
      "Abs Top %",
      "Pos. Promedio",
    ];
    const rows = compsWithData.map((c) => {
      const monthlyVols = c.monthlySeries!.map((d) =>
        d.avgSearchVolume.toLocaleString()
      );
      return [
        `"${c.name}"`,
        ...monthlyVols,
        c.avgMonthlySearches ? c.avgMonthlySearches.toLocaleString() : "0",
        c.peakMonth || "—",
        `${c.impressionShare.toFixed(2)}%`,
        `${c.overlapRate.toFixed(2)}%`,
        `${c.outrankingShare.toFixed(2)}%`,
        `${c.topOfPageRate.toFixed(2)}%`,
        `${c.absTopOfPageRate.toFixed(2)}%`,
        c.avgPosition ? c.avgPosition.toFixed(1) : "—",
      ];
    });
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "competitors_monthly.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-10">
      {/* ── Line Chart ── */}
      <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-10 border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-slate-800 text-white rounded-lg flex items-center justify-center font-black text-xs">02B</div>
              <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter uppercase">
                Evolución Mensual — <span className="text-[#ff477b]">{themeContext}</span>
              </h3>
            </div>
            <p className="text-slate-500 text-xs ml-10">Tendencia anual vs. competidores · {period || "Últimos 12 meses"}</p>
          </div>
          <div className="flex gap-4 flex-wrap items-center">
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              Exportar CSV
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveMetric("avgSearchVolume")}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  activeMetric === "avgSearchVolume"
                    ? "bg-[#ff477b] text-white shadow-lg shadow-[#ff477b]/30"
                    : "bg-white/5 text-slate-400 hover:bg-primary hover:text-white hover:border-primary"
                }`}
              >
                Búsquedas
              </button>
              <button
                onClick={() => setActiveMetric("impressionShare")}
                className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  activeMetric === "impressionShare"
                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white/5 text-slate-400 hover:bg-primary hover:text-white hover:border-primary"
                }`}
              >
                Imp. Share
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]" />
            <span className="text-[11px] font-black text-white uppercase">{themeContext || "Tú"}</span>
          </div>
          {compsWithData.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-[11px] font-black text-slate-400 uppercase">{c.name}</span>
            </div>
          ))}
        </div>

        {/* SVG Chart */}
        <div
          className="relative"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top });
          }}
          onMouseLeave={() => setHoveredMonth(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
              <g key={i}>
                <line x1={PAD} y1={H - PAD - p * GH} x2={W - PAD} y2={H - PAD - p * GH} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <text x={PAD - 8} y={H - PAD - p * GH + 6} fill="rgba(148,163,184,0.7)" fontSize="22" fontWeight="bold" textAnchor="end">
                  {activeMetric === "avgSearchVolume"
                    ? `${Math.round(maxVal * p / 1.1 / 1000)}K`
                    : `${(maxVal * p / 1.1).toFixed(0)}%`}
                </text>
              </g>
            ))}

            {/* X-axis months */}
            {MONTHS.map((m, i) => (
              <text key={m} x={xPos(i)} y={H - PAD + 35} fill="rgba(148,163,184,0.6)" fontSize="20" fontWeight="bold" textAnchor="middle">
                {m}
              </text>
            ))}

            {/* Target Line (Analyzed Term) - Visualised as a reference dashed line if no real timeseries exists, or just a marker */}
            <line 
              x1={PAD} 
              y1={yPos(maxVal * 0.4)} 
              x2={W - PAD} 
              y2={yPos(maxVal * 0.45)} 
              stroke="white" 
              strokeWidth="2" 
              strokeDasharray="5,5" 
              className="opacity-30" 
            />

            {/* Competitor lines */}
            {compsWithData.map((c, ci) => {
              const color = COLORS[ci % COLORS.length];
              return (
                <g key={ci}>
                  <path d={getPath(c)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {c.monthlySeries!.map((d, i) => {
                    const val = activeMetric === "avgSearchVolume" ? d.avgSearchVolume : d.impressionShare;
                    return (
                      <circle
                        key={i}
                        cx={xPos(i)} cy={yPos(val)} r="4"
                        fill={color}
                        onMouseEnter={() => setHoveredMonth(d.month)}
                        className="cursor-pointer hover:r-6 transition-all"
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoveredMonth && (
            <div
              className="absolute pointer-events-none z-50 bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[180px]"
              style={{ left: Math.min(mousePos.x + 16, 700), top: Math.max(mousePos.y - 80, 0) }}
            >
              <p className="text-[#ff477b] font-black text-xs mb-2 uppercase tracking-widest">{hoveredMonth}</p>
              {compsWithData.map((c, i) => {
                const d = c.monthlySeries!.find((s) => s.month === hoveredMonth);
                if (!d) return null;
                const val = activeMetric === "avgSearchVolume" ? d.avgSearchVolume : d.impressionShare;
                return (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-slate-300 text-[11px] font-bold truncate">{c.name}:</span>
                    <span className="text-white text-[11px] font-black ml-auto">
                      {activeMetric === "avgSearchVolume" ? val.toLocaleString() : `${val}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Monthly Avg Table ── */}
      <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-10 border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-slate-800 text-white rounded-lg flex items-center justify-center font-black text-xs">02C</div>
              <h3 className="text-xl font-black text-white tracking-tighter uppercase">
                Avg Búsquedas Mensuales — <span className="text-[#ff477b]">{themeContext}</span>
              </h3>
            </div>
            <p className="text-slate-500 text-xs ml-10">Volumen promedio anual · {period || "Últimos 12 meses"} · Mes destacado resaltado</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
            Exportar CSV
          </button>
        </div>

        <div className="overflow-x-auto pb-4 custom-scrollbar-horizontal">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="text-[11px] font-black uppercase text-slate-200 border-b border-white/10">
                <th className="pb-4 pr-4 text-left">Competidor</th>
                {MONTHS.map((m) => (
                  <th key={m} className="pb-4 text-center px-2 text-slate-300">{m}</th>
                ))}
                <th className="pb-4 text-right text-white">Avg Mensual</th>
                <th className="pb-4 text-right text-white">Mes Pico</th>
              </tr>
            </thead>
            <tbody>
              {/* "Tú" reference row */}
              <tr className="border-b border-white/10 bg-white/5">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-white shadow-[0_0_8px_white]" />
                    <span className="text-xs font-black text-white truncate max-w-[140px]">{themeContext || "Tú"}</span>
                    <span className="px-1.5 py-0.5 bg-[#ff477b] text-white text-[7px] font-black rounded uppercase">Target</span>
                  </div>
                </td>
                {MONTHS.map((m, mi) => (
                  <td key={mi} className="py-3 text-center px-2">
                    <span className="text-[11px] font-bold text-slate-400">—</span>
                  </td>
                ))}
                <td className="py-3 text-right text-xs font-black text-slate-400">—</td>
                <td className="py-3 text-right">
                  <span className="text-[11px] font-black text-slate-500 px-2 py-1 rounded-lg">Ver auditoría</span>
                </td>
              </tr>
              {compsWithData.map((c, ci) => {
                const color = COLORS[ci % COLORS.length];
                const maxVol = c.monthlySeries ? Math.max(...c.monthlySeries.map((d) => d.avgSearchVolume)) : 0;
                return (
                  <tr key={ci} className="border-b border-white/5 hover:bg-primary hover:text-white hover:border-primary transition-colors group">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-xs font-black text-white group-hover:text-[#ff477b] transition-colors truncate max-w-[140px]">{c.name}</span>
                      </div>
                    </td>
                    {c.monthlySeries!.map((d, mi) => {
                      const isPeak = d.avgSearchVolume === maxVol;
                      return (
                        <td key={mi} className={`py-3 text-center px-2 ${isPeak ? "bg-[#ff477b]/15 rounded" : ""}`}>
                          <span className={`text-[11px] font-bold ${isPeak ? "text-[#ff477b] font-black" : "text-slate-100"}`}>
                            {d.avgSearchVolume >= 1000
                              ? `${(d.avgSearchVolume / 1000).toFixed(1)}K`
                              : d.avgSearchVolume || "0"}
                          </span>
                          {isPeak && <div className="text-[11px] text-[#ff477b] font-black uppercase leading-none">▲ Pico</div>}
                        </td>
                      );
                    })}
                    <td className="py-3 text-right text-xs font-black text-white">
                      {c.avgMonthlySearches
                        ? c.avgMonthlySearches >= 1000
                          ? `${(c.avgMonthlySearches / 1000).toFixed(1)}K`
                          : c.avgMonthlySearches
                        : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-[11px] font-black text-[#ff477b] bg-[#ff477b]/15 px-2 py-1 rounded-lg border border-[#ff477b]/20">
                        {c.peakMonth || "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default React.memo(CompetitorChart);
