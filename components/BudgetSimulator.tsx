import React, { useState } from "react";
import { InfoTooltip } from "./ui/InfoTooltip";
import { useTutorial } from "../hooks/useTutorial";
import TutorialBubble, { TutorialTrigger } from "./ui/TutorialBubble";
import { Language } from "../types";

interface BudgetScenario {
  label?: string;
  dailyBudget: number;
  monthlyBudget: number;
  estimatedClicks: number;
  estimatedImpressions: number;
  estimatedConversions: number;
  estimatedCPA: number;
  estimatedROAS: number;
  estimatedRevenue: number;
}

interface ConversionFunnel {
  impressions: number;
  clicks: number;
  visits: number;
  leads: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  cpa: number;
  roas: number;
  dailyBudget: number;
}

interface IndustryBenchmark {
  avgCpc: number;
  avgCtr: number;
  avgConversionRate: number;
  industry: string;
  userCpcDelta: number;
}

interface Props {
  budgetScenarios?: BudgetScenario[];
  conversionFunnel?: ConversionFunnel;
  industryBenchmark?: IndustryBenchmark;
  themeContext?: string;
  language?: Language;
}

const SCENARIO_COLORS: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  "Básico":       { bg: "bg-slate-800/60", border: "border-slate-600/30", text: "text-slate-300", accent: "text-slate-400" },
  "Recomendado":  { bg: "bg-[#ff477b]/10", border: "border-[#ff477b]/30", text: "text-white",     accent: "text-[#ff477b]"  },
  "Agresivo":     { bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-white",   accent: "text-indigo-400"  },
};

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(Math.round(n));

const BudgetSimulator: React.FC<Props> = ({ budgetScenarios, conversionFunnel, industryBenchmark, themeContext, language = 'es' }) => {
  const [selected, setSelected] = useState(1); // default Recommended
  const { steps, currentStep, isVisible, isDismissed, next, prev, goTo, dismiss, restart } = useTutorial('budget-simulator', language);

  const scenarios = budgetScenarios || [];
  const funnel = conversionFunnel;
  const bench = industryBenchmark;

  const hasBudget = scenarios.length > 0;
  const hasFunnel = !!funnel;
  const hasBench = !!bench;

  if (!hasBudget && !hasFunnel && !hasBench) return null;

  const FUNNEL_STEPS = [
    { label: "Impresiones", icon: "👁", value: funnel?.impressions, color: "#6366f1" },
    { label: "Clicks", icon: "🖱", value: funnel?.clicks, color: "#3b82f6" },
    { label: "Visitas", icon: "🌐", value: funnel?.visits, color: "#10b981" },
    { label: "Leads", icon: "✉", value: funnel?.leads, color: "#f59e0b" },
    { label: "Conversiones", icon: "💰", value: funnel?.conversions, color: "#ff477b" },
  ];

  return (
    <div className="space-y-10">

      {/* ── Industry Benchmark ── */}
      {hasBench && (
        <section id="budget-step-1" className="glass-card rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-10 relative">
          <div className="absolute top-4 right-4 md:top-8 md:right-8 z-10">
            <TutorialTrigger 
              isDismissed={isDismissed}
              isVisible={isVisible}
              language={language}
              onShow={restart}
              onRestart={restart}
            />
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-slate-800 text-white rounded-lg flex items-center justify-center font-black text-xs">06</div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tighter uppercase">
                Benchmark vs. Industria — {bench.industry}
              </h3>
              {themeContext && (
                <p className="text-xs text-[#ff477b] font-black mt-0.5 ml-0">
                  📌 Término analizado: <span className="text-white">{themeContext}</span>
                </p>
              )}
            </div>
            <InfoTooltip text="Comparación del CPC estimado de tu mercado vs. el promedio de la industria según datos de Google Ads." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "CPC Promedio Industria", value: `$${bench.avgCpc.toFixed(2)}`, sub: "Referencia estándar del sector" },
              {
                label: "CPC Tu Mercado vs. Benchmark",
                value: `${bench.userCpcDelta > 0 ? "+" : ""}${bench.userCpcDelta.toFixed(1)}%`,
                sub: bench.userCpcDelta > 0 ? "⚠️ Por encima del benchmark" : "✅ Por debajo del benchmark",
                highlight: bench.userCpcDelta > 0 ? "#f59e0b" : "#10b981",
              },
              { label: "CTR Promedio Industria", value: `${bench.avgCtr.toFixed(1)}%`, sub: "Benchmark de clicks" },
            ].map((stat, i) => (
              <div key={i} className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
                <p className="text-2xl font-black" style={{ color: (stat as any).highlight || "#ffffff" }}>{stat.value}</p>
                <p className="text-[11px] text-slate-500 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>
          {/* Visual bar */}
          <div className="mt-6 p-4 bg-white/5 rounded-2xl">
            <div className="flex justify-between text-[11px] text-slate-400 uppercase font-black mb-2">
              <span className="text-[#ff477b]">{themeContext || "Tu mercado"}</span>
              <span>← Benchmark {bench.industry} →</span>
            </div>
            <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, 50 + (bench.userCpcDelta / 2))}%`,
                  background: bench.userCpcDelta > 10 ? "#f59e0b" : bench.userCpcDelta < -10 ? "#10b981" : "#3b82f6",
                }}
              />
              <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white/30" />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>Más económico</span>
              <span>Promedio</span>
              <span>Más caro</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Budget Simulator ── */}
      {hasBudget && (
        <section id="budget-step-2" className="glass-card rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-10 relative">
          {!hasBench && (
            <div className="absolute top-4 right-4 md:top-8 md:right-8 z-10">
              <TutorialTrigger 
                isDismissed={isDismissed}
                isVisible={isVisible}
                language={language}
                onShow={restart}
                onRestart={restart}
              />
            </div>
          )}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-slate-800 text-white rounded-lg flex items-center justify-center font-black text-xs">07</div>
            <h3 className="text-xl font-black text-white tracking-tighter uppercase">
              Budget Simulator — <span className="text-[#ff477b]">{themeContext}</span>
            </h3>
            <InfoTooltip text="Proyección de resultados según 3 niveles de inversión publicitaria." />
          </div>
          {/* Scenario tabs */}
          <div className="flex gap-3 mb-6 flex-wrap">
            {scenarios.map((s, i) => {
              const label = s.label || (i === 0 ? "Básico" : i === 1 ? "Recomendado" : "Agresivo");
              const c = SCENARIO_COLORS[label] || SCENARIO_COLORS["Básico"];
              return (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${
                    selected === i
                      ? `${c.bg} ${c.border} ${c.accent} border-opacity-100`
                      : "bg-white/5 border-white/5 text-slate-400 hover:bg-primary hover:text-white hover:border-primary"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {scenarios[selected] && (() => {
            const s = scenarios[selected];
            const label = s.label || (selected === 0 ? "Básico" : selected === 1 ? "Recomendado" : "Agresivo");
            const c = SCENARIO_COLORS[label] || SCENARIO_COLORS["Básico"];
            const stats = [
              { label: "Presupuesto Diario", value: `$${s.dailyBudget.toFixed(0)}`, icon: "📅" },
              { label: "Presupuesto Mensual", value: `$${s.monthlyBudget.toFixed(0)}`, icon: "💳" },
              { label: "Clicks Estimados", value: fmt(s.estimatedClicks), icon: "🖱" },
              { label: "Impresiones Est.", value: fmt(s.estimatedImpressions), icon: "👁" },
              { label: "Conversiones Est.", value: fmt(s.estimatedConversions), icon: "🎯" },
              { label: "CPA Estimado", value: `$${s.estimatedCPA.toFixed(2)}`, icon: "💰" },
              { label: "ROAS Estimado", value: `${s.estimatedROAS.toFixed(1)}x`, icon: "📈" },
              { label: "Ingreso Estimado", value: `$${fmt(s.estimatedRevenue)}`, icon: "🏆" },
            ];
            return (
              <div className={`p-6 rounded-2xl border ${c.bg} ${c.border} grid grid-cols-2 md:grid-cols-4 gap-4`}>
                {stats.map((stat, i) => (
                  <div key={i} className="text-center p-4 bg-white/5 rounded-xl">
                    <div className="text-2xl mb-1">{stat.icon}</div>
                    <p className={`text-xl font-black ${c.accent}`}>{stat.value}</p>
                    <p className="text-[11px] text-slate-400 uppercase font-black mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>
      )}

      {/* ── Conversion Funnel ── */}
      {hasFunnel && (
        <section id="budget-step-3" className="glass-card rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-slate-800 text-white rounded-lg flex items-center justify-center font-black text-xs">08</div>
            <h3 className="text-xl font-black text-white tracking-tighter uppercase">
              Embudo de Conversión — <span className="text-[#ff477b]">{themeContext}</span>
            </h3>
            <InfoTooltip text="Proyección del flujo de usuarios desde impresiones hasta conversiones, basado en el escenario Recomendado." />
          </div>
          <div className="flex items-stretch gap-0 overflow-x-auto pb-4">
            {FUNNEL_STEPS.map((step, i) => {
              if (!step.value) return null;
              const maxVal = FUNNEL_STEPS[0].value || 1;
              const widthPct = Math.max(20, (step.value / maxVal) * 100);
              const nextStep = FUNNEL_STEPS[i + 1];
              const dropPct = nextStep?.value ? (((step.value - nextStep.value) / step.value) * 100).toFixed(1) : null;
              return (
                <div key={i} className="flex-1 min-w-[120px] flex flex-col items-center">
                  {/* Bar */}
                  <div className="w-full flex justify-center mb-3">
                    <div
                      className="rounded-xl flex items-center justify-center text-white font-black text-xs transition-all duration-700 py-6"
                      style={{
                        width: `${widthPct}%`,
                        background: step.color,
                        minWidth: "60px",
                        clipPath: i < FUNNEL_STEPS.length - 1
                          ? "polygon(0 0, 90% 0, 100% 50%, 90% 100%, 0 100%)"
                          : "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
                      }}
                    >
                      {step.icon}
                    </div>
                  </div>
                  <p className="text-white font-black text-lg">{fmt(step.value)}</p>
                  <p className="text-[11px] text-slate-400 uppercase font-black text-center">{step.label}</p>
                  {dropPct && (
                    <p className="text-[11px] text-rose-400 mt-1">↓ -{dropPct}%</p>
                  )}
                </div>
              );
            })}
          </div>
          {/* Summary stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { label: "CTR Estimado", value: `${funnel?.ctr?.toFixed(1) || "-"}%` },
              { label: "Tasa de Conversión", value: `${funnel?.conversionRate?.toFixed(1) || "-"}%` },
              { label: "ROAS Estimado", value: `${funnel?.roas?.toFixed(1) || "-"}x` },
            ].map((s, i) => (
              <div key={i} className="p-4 bg-white/5 rounded-2xl text-center border border-white/5">
                <p className="text-lg font-black text-[#ff477b]">{s.value}</p>
                <p className="text-[11px] text-slate-400 uppercase font-black mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}
      <TutorialBubble 
        steps={steps}
        currentStep={currentStep}
        isVisible={isVisible}
        language={language}
        onNext={next}
        onPrev={prev}
        onGoTo={goTo}
        onDismiss={dismiss}
      />
    </div>
  );
};

export default React.memo(BudgetSimulator);
