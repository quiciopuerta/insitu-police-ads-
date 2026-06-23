import { buildAbsoluteUrl } from "../utils/apiConfig";
import React, { useState, useRef, useMemo, useCallback } from "react";
import { SearchResult, AuthUser } from "../types";
import { TRANSLATIONS } from "../constants";
import { authService } from "../services/authService";
// import { generateGoogleStylePDF } from "../utils/exportUtils"; // Removed for dynamic import optimization
import { InfoTooltip } from "./ui/InfoTooltip";
import { Badge } from "./ui/Badge"; // Added by instruction
import { ResultSkeleton } from "./LazyComponents"; // Added by instruction
import CompetitorChart from "./CompetitorChart";
import AdsInsightsPanel from "./AdsInsightsPanel";
import BudgetSimulator from "./BudgetSimulator";
import { FeedbackWidget } from "./ui/FeedbackWidget";
import { TrendingUp, ShieldCheck, Zap, Rocket, Mail } from "lucide-react";
import { AdminDiagnosticPanel } from "./ui/AdminDiagnosticPanel";
import Toast, { ToastData } from "./Toast"; // Added by instruction
import { funnelGenerationService } from "../services/ai/funnelGenerationService";

interface ResultCardProps {
  result: SearchResult;
  onTabChange?: (tab: 'metrics') => void;
  onElevateToFunnel?: (result: any) => void;
}



const ResultCard: React.FC<ResultCardProps> = ({ result, onTabChange, onElevateToFunnel }) => {
  const lang = result.language || "es";
  const t = TRANSLATIONS[lang] || TRANSLATIONS["es"];
  const user = authService.getCurrentUser();

  // States for interactive chart
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isElevating, setIsElevating] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleDownloadPdf = async () => {
    try {
      const { generateGoogleStylePDF } = await import("../utils/exportUtils");
      const fileName = `Auditoria_Insitu_${(result.themeContext || "audit").replace(/\s+/g, "_")}.pdf`;
      await generateGoogleStylePDF("search-result", result, fileName, lang, { user, action: "download" });
      
      setToast({
        title: lang === "es" ? "Descarga Iniciada" : "Download Started",
        message: lang === "es" ? "Tu reporte se está descargando." : "Your report is downloading.",
        type: "success"
      });
    } catch (err) {
      console.error("Error loading export module:", err);
      setToast({ 
        title: lang === "es" ? "Error de Exportación" : "Export Error",
        message: lang === "es" ? "Error al generar PDF. Inténtalo de nuevo." : "Error generating PDF. Try again.", 
        type: "error" 
      }); 
    }
  };

  const handleSendEmailReport = async () => {
    const email = user?.email || "";
    if (!email) {
      setToast({
        title: lang === "es" ? "Inicia Sesión" : "Sign In",
        message: lang === "es" ? "Debes estar registrado para recibir el reporte por email." : "You must be signed in to receive the report by email.",
        type: "warning"
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      const { generateGoogleStylePDF } = await import("../utils/exportUtils");
      const fileName = `Auditoria_Insitu_${(result.themeContext || "audit").replace(/\s+/g, "_")}.pdf`;
      
      // Generate PDF as Base64
      const pdfBase64 = await generateGoogleStylePDF("search-result", result, fileName, lang, { 
        user, 
        action: "return" 
      }) as string;

      if (!pdfBase64) throw new Error("PDF generation returned empty");

      // Send to Netlify function
      const response = await fetch(buildAbsoluteUrl('/.netlify/functions/api-send-report'), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": user?.id || ""
        },
        body: JSON.stringify({
          email,
          pdfBase64,
          fileName,
          domain: result.landingUrl || result.themeContext,
          reportType: result.themeContext,
          language: lang
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      setToast({
        title: lang === "es" ? "Email Enviado" : "Email Sent",
        message: lang === "es" ? `Reporte enviado exitosamente a ${email}` : `Report successfully sent to ${email}`,
        type: "success"
      });
    } catch (err: any) {
      console.error("[EmailReport] Error:", err);
      const errMsg = err?.message || "";
      setToast({ 
        title: lang === "es" ? "Error de Envío" : "Send Error",
        message: errMsg || (lang === "es" ? "No se pudo enviar el reporte por email." : "Could not send the report via email."), 
        type: "error" 
      }); 
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleElevateToFunnel = async () => {
    if (!result.landingUrl) {
      setToast({
        title: lang === "es" ? "URL Requerida" : "URL Required",
        message: lang === "es" ? "Agregue una URL para generar el Funnel Architect." : "Add a URL to generate the Funnel Architect.",
        type: "info"
      });
      return;
    }

    setIsElevating(true);
    try {
      const funnelResult = await funnelGenerationService.generateFunnel(
        result.landingUrl,
        result.themeContext || "Optimization",
        result.targetAudience || "General",
        lang
      );
      
      if (onElevateToFunnel) {
        onElevateToFunnel(funnelResult);
      }
    } catch (err) {
      console.error("Error generating funnel:", err);
      setToast({
        title: lang === "es" ? "Error" : "Error",
        message: lang === "es" ? "No se pudo generar el Funnel Architect." : "Failed to generate Funnel Architect.",
        type: "error"
      });
    } finally {
      setIsElevating(false);
    }
  };

  const handleDownloadKeywordsCSV = () => {
    const kws = result.extractedKeywords || [];
    if (!kws.length) {
      setToast({ 
        title: lang === "es" ? "Faltan datos" : "Missing data",
        message: lang === "es" ? "No hay palabras clave para descargar." : "No keywords to download.", 
        type: "info" 
      }); 
      return;
    }
    const header = ["Término de Búsqueda", "Volumen Mensual", "Competencia", "CPC", "Avg Impresiones", "CTR Estimado", "Concordancia Sugerida"];
    const rows = kws.map((k) => [
      k.term,
      k.volume,
      k.competition,
      k.cpc,
      k.avgImpressions ? k.avgImpressions.toLocaleString() : "",
      k.ctr || "",
      k.suggestedMatchType || "Broad",
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Keywords_${(result.themeContext || "ads").replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ 
      title: lang === "es" ? "Descarga Iniciada" : "Download Started",
      message: lang === "es" ? "Keywords CSV descargado con éxito." : "Keywords CSV downloaded successfully.", 
      type: "success" 
    }); 
  };

  const handleDownloadEvolutionCSV = () => {
    const data = result.metricsSeries || [];
    if (!data.length) {
      setToast({ 
        title: lang === "es" ? "Faltan datos" : "Missing data",
        message: lang === "es" ? "No hay datos de evolución para descargar." : "No evolution data to download.", 
        type: "info" 
      }); 
      return;
    }
    const header = ["Mes", "Volumen de Búsqueda", "CPC Estimado ($)"];
    const rows = data.map((d) => [
      d.month,
      d.conv,
      d.cpc.toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Evolucion_Mercado_${(result.themeContext || "ads").replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ 
      title: lang === "es" ? "Descarga Iniciada" : "Download Started",
      message: lang === "es" ? "Evolución CSV descargado con éxito." : "Evolution CSV downloaded successfully.", 
      type: "success" 
    }); 
  };

  // Metrics Logic for Visual Chart - Memoized
  const { mData, maxConv, maxCpc, width, height, padding, graphWidth, graphHeight } = useMemo(() => {
    const data = result.metricsSeries || [];
    const mConv = data.length > 0 ? Math.max(...data.map((d) => d.conv)) * 1.2 : 1;
    const mCpc = data.length > 0 ? Math.max(...data.map((d) => d.cpc)) * 1.2 : 1;
    const w = 1000;
    const h = 400;
    const p = 80;
    return {
      mData: data,
      maxConv: mConv,
      maxCpc: mCpc,
      width: w,
      height: h,
      padding: p,
      graphWidth: w - p * 2,
      graphHeight: h - p * 2
    };
  }, [result.metricsSeries]);

  // Executive Benchmarking Logic
  const topCompetitor = useMemo(() => {
    if (!result.competitors || result.competitors.length === 0) return null;
    return [...result.competitors].sort((a, b) => (b.impressionShare || 0) - (a.impressionShare || 0))[0];
  }, [result.competitors]);

  const benchmarkDelta = result.industryBenchmark?.userCpcDelta || 0;

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-1000 overflow-x-hidden w-full">
      {/* Notifications */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      
      {/* Header Visual */}
      <div className="bg-slate-950/80 backdrop-blur-3xl rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-16 text-white shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative border border-white/5 group/header hover:border-white/10 transition-colors overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-[#ff477b]/10 blur-[140px] -mr-32 md:-mr-64 -mt-32 md:-mt-64 group-hover/header:bg-[#ff477b]/15 transition-colors pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="w-full md:max-w-2xl">
            <div className="flex items-center space-x-3 mb-6">
              <span className="bg-emerald-500 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                {t.verified}
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                REPORT V3.0 • {lang.toUpperCase()}
              </span>
            </div>
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter mb-4 leading-tight">
              {t.audit_report.split(" ")[0]}{" "}
              <span className="text-[#ff477b]">{result.themeContext}</span>
            </h2>
            <p className="text-slate-400 text-sm md:text-xl font-medium max-w-lg">
              {t.strategic_diagnosis}
            </p>
          </div>
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <button
              onClick={handleDownloadPdf}
              className="bg-white/5 hover:bg-white/10 text-white px-6 md:px-10 py-5 md:py-6 rounded-[2rem] md:rounded-3xl font-black text-sm md:text-sm transition-all flex justify-center items-center space-x-3 uppercase tracking-widest no-print active:scale-95 w-full md:w-auto border border-white/10"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{t.download_pdf || "Descargar PDF"}</span>
            </button>

            <button
              disabled={isSendingEmail}
              onClick={handleSendEmailReport}
              className="bg-gradient-to-r from-[#ff477b] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#ff477b] text-white px-6 md:px-10 py-5 md:py-6 rounded-[2rem] md:rounded-3xl font-black text-sm md:text-sm shadow-[0_10px_30px_rgba(255,71,123,0.3)] transition-all flex justify-center items-center space-x-3 uppercase tracking-widest no-print active:scale-95 w-full md:w-auto border-none disabled:opacity-50"
            >
              {isSendingEmail ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Mail className="w-5 h-5 text-white" />
              )}
              <span>{isSendingEmail ? (lang === 'es' ? 'Enviando...' : 'Sending...') : (lang === 'es' ? 'Recibir por Email' : 'Receive by Email')}</span>
            </button>
          </div>
        </div>
      </div>
 
      {/* ─── PROACTIVE: DIRECT INSIGHTS HUD ─── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 no-print my-8">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center group hover:bg-[#ff477b]/5 hover:border-[#ff477b]/20 transition-all duration-500">
          <div className="w-10 h-10 rounded-2xl bg-[#ff477b]/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
             <TrendingUp className="w-5 h-5 text-[#ff477b]" />
          </div>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Oportunidad</span>
          <span className="text-2xl font-black text-white">{(result.marketTempScore || 0) > 70 ? 'ALTA' : 'ESTABLE'}</span>
        </div>
        
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center group hover:bg-emerald-500/5 hover:border-emerald-500/20 transition-all duration-500">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
             <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Eficiencia</span>
          <span className="text-2xl font-black text-white">{benchmarkDelta < 10 ? 'ÓPTIMA' : 'MEJORABLE'}</span>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center group hover:bg-indigo-500/5 hover:border-indigo-500/20 transition-all duration-500">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
             <Zap className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Impacto AI</span>
          <span className="text-2xl font-black text-white">READY</span>
        </div>

        {user?.role === 'superAdmin' && (
          <button 
            onClick={handleElevateToFunnel}
            disabled={isElevating}
            className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center group hover:bg-blue-500/5 hover:border-blue-500/20 transition-all duration-500 disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
               {isElevating ? (
                 <div className="w-5 h-5 border-2 border-blue-400 border-t-white rounded-full animate-spin" />
               ) : (
                 <Rocket className="w-5 h-5 text-blue-400" />
               )}
            </div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Próximo Paso</span>
            <span className="text-xl font-black text-white uppercase tracking-tighter">
              {isElevating ? (lang === 'es' ? 'Generando...' : 'Generating...') : 'Funnel Architect'}
            </span>
          </button>
        )}
      </section>

      {/* Executive Benchmarking Summary */}
      <section className="bg-gradient-to-r from-slate-900 to-indigo-950/20 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
              <span className="flex h-2 w-2 rounded-full bg-[#ff477b] animate-pulse"></span>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Gap Analysis de Mercado</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase leading-tight">
              {result.themeContext} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-400 to-slate-600 text-2xl md:text-3xl">Posicionamiento vs. Competencia</span>
            </h2>
            <p className="text-sm text-slate-400 font-medium max-w-xl">
              Análisis objetivo del rendimiento esperado frente a los líderes del sector y benchmarks globales de Google Ads.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 w-full md:w-auto">
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center text-center">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Dominio de Mercado</span>
              <span className="text-3xl font-black text-white">{result.marketTempScore ?? 50}%</span>
              <span className="text-[11px] text-[#ff477b] font-bold mt-1">Score IA</span>
            </div>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center text-center">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">Gap vs Industry</span>
              <span className={`text-3xl font-black ${benchmarkDelta > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {benchmarkDelta > 0 ? "+" : ""}{benchmarkDelta.toFixed(1)}%
              </span>
              <span className="text-[11px] text-slate-400 font-bold mt-1">{benchmarkDelta > 10 ? "⚠️ Coste Elevado" : "✅ Eficiencia Alta"}</span>
            </div>
          </div>
        </div>

        {topCompetitor && (
          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center gap-6">
            <div className="px-5 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Líder del Sector:</span>
              <span className="ml-3 text-sm font-black text-white">{topCompetitor.name}</span>
            </div>
            <div className="flex-1 w-full bg-slate-800/50 h-2 rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ff477b] to-indigo-500 transition-all duration-1000"
                style={{ width: `${topCompetitor.impressionShare}%` }}
              ></div>
              <div 
                className="absolute top-0 left-0 h-full w-1 bg-white shadow-[0_0_10px_white]"
                style={{ left: `${(result.marketTempScore ?? 50) * 0.8}%` }}
              ></div>
            </div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
              Share de Impresiones: {topCompetitor.impressionShare}%
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-white shadow-[0_0_5px_white]"></div>
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Tú (Posición Estimada)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-gradient-to-r from-[#ff477b] to-indigo-500"></div>
            <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Líder de Categoría</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-12">
          {/* ─── TL;DR: RESUMEN EJECUTIVO (Agency-Agent Injection) ─── */}
          {result.tldr && (
            <section className="bg-gradient-to-br from-[#ff477b]/10 to-indigo-500/10 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-[#ff477b]/20 shadow-xl relative overflow-hidden group">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-[#ff477b] text-white rounded-lg flex items-center justify-center font-black text-xs shadow-[0_0_15px_rgba(255,71,123,0.5)]">
                  TL;DR
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">
                  {lang === 'es' ? 'Resumen Ejecutivo' : 'Executive Summary'}
                </h3>
              </div>
              <div className="prose prose-invert max-w-none text-slate-200 font-bold leading-relaxed text-sm md:text-base">
                {result.tldr.split("\n").map((para, i) => (
                  para.trim() && <p key={i} className="mb-3">{para.replace(/\*/g, "")}</p>
                ))}
              </div>
            </section>
          )}

          {/* ─── REAL PERFORMANCE AUDIT (Follow-up) ─── */}
          {result.realPerformanceAudit ? (
            <section className="bg-slate-900 border-2 border-[#7c3aed]/30 rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden group mb-10">
              <div className="absolute top-0 right-0 p-4">
                 <div className="bg-[#7c3aed]/20 text-[#7c3aed] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#7c3aed]/30">
                    REAL ACCOUNT DATA (FOLLOW-UP)
                 </div>
              </div>
              <div className="flex items-center space-x-4 mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg border-2 ${
                  result.realPerformanceAudit.healthScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                  result.realPerformanceAudit.healthScore >= 50 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                  'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {result.realPerformanceAudit.healthScore}
                </div>
                <div>
                   <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">
                     {lang === 'es' ? 'Auditoría de Cuenta Real' : 'Real Account Audit'}
                   </h3>
                   <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                     Health Score de Rendimiento
                   </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <h4 className="text-xs font-black text-[#ff477b] uppercase tracking-widest flex items-center">
                       <span className="w-1.5 h-1.5 rounded-full bg-[#ff477b] mr-2 animate-pulse" />
                       {lang === 'es' ? 'Problemas Críticos' : 'Critical Issues'}
                    </h4>
                    <ul className="space-y-3">
                       {result.realPerformanceAudit.criticalIssues.map((issue, i) => (
                         <li key={i} className="flex items-start space-x-3 p-3 bg-rose-500/5 rounded-xl border border-rose-500/10">
                            <span className="text-rose-500 mt-0.5">⚠️</span>
                            <span className="text-sm font-bold text-slate-300">{issue}</span>
                         </li>
                       ))}
                    </ul>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                       {lang === 'es' ? 'Oportunidades de Mejora' : 'Growth Opportunities'}
                    </h4>
                    <ul className="space-y-3">
                       {result.realPerformanceAudit.opportunities.map((opp, i) => (
                         <li key={i} className="flex items-start space-x-3 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                            <span className="text-emerald-500 mt-0.5">🚀</span>
                            <span className="text-sm font-bold text-slate-300">{opp}</span>
                         </li>
                       ))}
                    </ul>
                 </div>
              </div>

              <div className="mt-8 p-6 bg-white/5 rounded-3xl border border-white/5">
                 <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Análisis Estructural</p>
                 <div className="text-sm text-slate-300 font-medium leading-relaxed whitespace-pre-line">
                   {result.realPerformanceAudit.analysis}
                 </div>
              </div>
            </section>
          ) : null}

          {/* Diagnóstico Estratégico */}
          <section className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-12 shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/5 relative group/container hover:border-white/10 transition-colors overflow-hidden">
            <div className="absolute top-0 left-0 w-1 md:w-1.5 h-full bg-[#ff477b] rounded-l-[2rem] md:rounded-l-[3.5rem]"></div>
            <div className="flex items-center justify-between mb-8 md:mb-10 flex-wrap gap-4">
              <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter flex items-center">
                <span className="w-8 h-8 bg-white/10 text-white rounded-lg flex items-center justify-center mr-4 text-sm">
                  01
                </span>
                {t.strategic_diagnosis}
                <InfoTooltip text="Análisis general del mercado, contexto específico y principales oportunidades de crecimiento detectadas." />
              </h3>
            </div>
            <div className="prose prose-invert max-w-none text-slate-300 font-medium leading-relaxed text-sm md:text-lg mb-10 break-words">
              {(result.text || "").split("\n").map(
                (para, i) =>
                  para.trim() && (
                    <p key={i} className="mb-4">
                      {para.replace(/\*/g, "")}
                    </p>
                  ),
              )}
            </div>

            {/* Competitive Insight Bubble */}
            {topCompetitor && (
              <div className="p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-3xl mt-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Inferencia IA: Gap vs {topCompetitor.name}</p>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                      Actualmente, {topCompetitor.name} lidera con un <span className="text-white font-bold">{topCompetitor.impressionShare}% de Share de Impresiones</span>. 
                      Tu posición relativa en <span className="text-white font-bold">{result.themeContext}</span> indica un {benchmarkDelta > 0 ? "sobrecoste" : "ahorro"} del <span className={`font-bold ${benchmarkDelta > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{Math.abs(benchmarkDelta).toFixed(1)}%</span> respecto al benchmark industrial. 
                      {topCompetitor.positionAboveRate && topCompetitor.positionAboveRate > 50 
                        ? " El competidor suele aparecer por encima de tus anuncios con frecuencia crítica." 
                        : " Mantienes una competitividad saludable en subasta pese al dominio del líder."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Forensic Checkpoints (200+ point protocol) */}
            {result.forensicCheckpoints && result.forensicCheckpoints.length > 0 && (
              <div className="mt-10 border-t border-white/5 pt-10">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-md flex items-center justify-center font-black text-[10px] border border-emerald-500/30">
                    AUDIT
                  </div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">
                    {lang === 'es' ? 'Protocolo Forense de Auditoría (Resultados Clave)' : 'Forensic Audit Protocol (Key Findings)'}
                  </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.forensicCheckpoints.map((checkpoint, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-emerald-500/20 transition-all group/check">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] group-hover/check:scale-125 transition-transform" />
                      <span className="text-[11px] font-bold text-slate-300 leading-tight">
                        {checkpoint}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Metrics Chart integrated inside Analyzer */}
            {mData.length > 0 && (
              <div
                ref={chartContainerRef}
                className="mt-8 md:mt-12 p-3 md:p-8 bg-slate-900/60 backdrop-blur-3xl rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 relative overflow-hidden no-print cursor-pointer group/metrics-chart"
                onMouseMove={handleMouseMove}
                onClick={() => onTabChange?.('metrics')}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    Evolución CPC vs Volumen
                    <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-md text-[11px] font-black group-hover/metrics-chart:bg-[#ff477b] group-hover/metrics-chart:text-white transition-colors">VER DETALLES</span>
                    <InfoTooltip text="Proyección y comportamiento histórico del costo por clic comparado contra la búsqueda estimada. Haz clic para ver el análisis detallado." />
                  </p>
                  <div className="flex gap-4 items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadEvolutionCSV();
                      }}
                      className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                      CSV
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#ff477b]"></div>
                      <span className="text-[11px] font-black uppercase text-slate-500">
                        Volumen
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-[11px] font-black uppercase text-slate-500">
                        CPC Est.
                      </span>
                    </div>
                  </div>
                </div>
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-auto overflow-visible"
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Grid lines */}
                  {[0, 0.5, 1].map((p, idx) => (
                    <line
                      key={idx}
                      x1={padding}
                      y1={height - padding - p * graphHeight}
                      x2={width - padding}
                      y2={height - padding - p * graphHeight}
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="1"
                    />
                  ))}
                  {/* Y-axis Labels - Left (Volume) */}
                  {[0, 0.5, 1].map((p, idx) => (
                    <text
                      key={`vol-${idx}`}
                      x={padding - 10}
                      y={height - padding - p * graphHeight + 4}
                      fill="#ff477b"
                      fontSize="24"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      {Math.round((maxConv * p) / 1000)}K
                    </text>
                  ))}
                  {/* Y-axis Labels - Right (CPC) */}
                  {[0, 0.5, 1].map((p, idx) => (
                    <text
                      key={`cpc-${idx}`}
                      x={width - padding + 10}
                      y={height - padding - p * graphHeight + 4}
                      fill="#3b82f6"
                      fontSize="24"
                      fontWeight="bold"
                      textAnchor="start"
                    >
                      ${(maxCpc * p).toFixed(2)}
                    </text>
                  ))}

                  {/* Volume Line */}
                  <path
                    d={`M ${mData.map((d, i) => `${padding + (i * graphWidth) / (mData.length - 1)},${height - padding - (d.conv / maxConv) * graphHeight}`).join(" L ")}`}
                    fill="none"
                    stroke="#ff477b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-80"
                  />
                  {/* CPC Line */}
                  <path
                    d={`M ${mData.map((d, i) => `${padding + (i * graphWidth) / (mData.length - 1)},${height - padding - (d.cpc / maxCpc) * graphHeight}`).join(" L ")}`}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-80"
                  />
                  {/* Interactions */}
                  {mData.map((d, i) => {
                    const x = padding + (i * graphWidth) / (mData.length - 1);
                    return (
                      <g
                        key={i}
                        onMouseEnter={() => setHoveredIndex(i)}
                        className="cursor-pointer"
                      >
                        <rect
                          x={x - 20}
                          y={padding}
                          width="40"
                          height={graphHeight}
                          fill="transparent"
                        />
                        {hoveredIndex === i && (
                          <line
                            x1={x}
                            y1={padding}
                            x2={x}
                            y2={height - padding}
                            stroke="#ff477b"
                            strokeWidth="1"
                            strokeDasharray="4"
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
                {/* Tooltip */}
                {hoveredIndex !== null && (
                  <div
                    className="absolute bg-slate-900 text-white p-4 rounded-xl text-[11px] font-bold shadow-2xl pointer-events-none z-50 animate-in fade-in zoom-in-95"
                    style={{ left: mousePos.x + 15, top: mousePos.y - 80 }}
                  >
                    <p className="text-[#ff477b] mb-1">
                      {mData[hoveredIndex].month}
                    </p>
                    <p>Vol: {mData[hoveredIndex].conv.toLocaleString()}</p>
                    <p className="text-blue-400">
                      CPC: ${mData[hoveredIndex].cpc.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Auction Insights Table */}
          {result.competitors && result.competitors.length > 0 && (
            <section className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-12 shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/5 no-print group/container hover:border-white/10 transition-colors relative ">
              <div className="flex items-center space-x-3 mb-8 md:mb-10">
                <div className="w-8 h-8 bg-slate-800 text-white rounded-lg flex items-center justify-center font-black text-xs">
                  02
                </div>
                <h3 className="text-xl md:text-3xl font-black text-white tracking-tighter uppercase flex items-center">
                  Análisis de Competencia — <span className="text-[#ff477b] ml-2">{result.themeContext}</span>
                  <InfoTooltip text="Métricas observadas en las pujas publicitarias (Share of Voice, Overlap) frente a otros competidores del sector." />
                </h3>
              </div>
              <div className="overflow-x-auto pb-4 custom-scrollbar-horizontal">
                <table className="w-full text-left min-w-[500px]">
                  <thead>
                    <tr className="text-[11px] font-black uppercase text-slate-400 border-b border-slate-50">
                      <th className="pb-6">Dominio</th>
                      <th className="pb-6 text-center">Share Imp.</th>
                      <th className="pb-6 text-center">Superposición</th>
                      <th className="pb-6 text-center">Pos. Prom.</th>
                      <th className="pb-6 text-center">Top Página</th>
                      <th className="pb-6 text-center">Abs. Top</th>
                      <th className="pb-6 text-center">Vol. Prom.</th>
                      <th className="pb-6 text-right">Outranking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {result.competitors.map((comp, i) => (
                      <tr
                        key={i}
                        className="group hover:bg-primary hover:text-white hover:border-primary transition-colors"
                      >
                        <td className="py-5 font-black text-xs text-white group-hover:text-[#ff477b]">
                          <div className="flex flex-col">
                            <span>{comp.name}</span>
                            {comp.nicheDominance && (
                              <span className="text-[7px] text-[#ff477b] border border-[#ff477b]/30 px-1.5 py-0.5 rounded mt-1 bg-[#ff477b]/5 self-start">
                                {comp.nicheDominance}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-5 text-center text-xs font-bold text-slate-300">
                          {comp.impressionShare.toFixed(2)}%
                        </td>
                        <td className="py-5 text-center text-xs font-bold text-slate-300">
                          {comp.overlapRate.toFixed(2)}%
                        </td>
                        <td className="py-5 text-center text-xs font-bold text-slate-300">
                          {comp.avgPosition?.toFixed(1) || "-"}
                        </td>
                        <td className="py-5 text-center text-xs font-bold text-slate-300">
                          <div className="flex flex-col items-center">
                            <span>{comp.topOfPageRate.toFixed(2)}%</span>
                            <div className="w-12 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${comp.topOfPageRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-5 text-center text-xs font-bold text-slate-300">
                          <div className="flex flex-col items-center">
                           <span>{comp.absTopOfPageRate.toFixed(2)}%</span>
                            <div className="w-12 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                              <div 
                                className="h-full bg-[#ff477b]" 
                                style={{ width: `${comp.absTopOfPageRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-5 text-center text-xs font-bold text-slate-300">
                          {comp.avgMonthlySearches?.toLocaleString() || "-"}
                        </td>
                        <td className="py-5 text-right text-xs font-black text-emerald-500">
                          {comp.outrankingShare.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Competitor Line Chart — monthly evolution */}
          {result.competitors && result.competitors.length > 0 && (
            result.competitors.some((c: any) => c.monthlySeries && c.monthlySeries.length === 12)
              ? <CompetitorChart competitors={result.competitors} period={result.periodContext} themeContext={result.themeContext} />
              : (
                <section className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                  <p className="text-slate-400 text-sm">Datos históricos mensuales no disponibles para este dominio.</p>
                </section>
              )
          )}

          {/* Campaign Intelligence: Quality Score, Negative Keywords, Ad Extensions */}
          <AdsInsightsPanel
            negativeKeywords={result.negativeKeywords}
            adExtensions={result.adExtensions as any}
            extractedKeywords={result.extractedKeywords as any}
            themeContext={result.themeContext}
          />

          {/* Budget Simulator, Industry Benchmark & Conversion Funnel */}
          <BudgetSimulator
            budgetScenarios={result.budgetScenarios as any}
            conversionFunnel={result.conversionFunnel as any}
            industryBenchmark={result.industryBenchmark as any}
            themeContext={result.themeContext}
            language={lang as any}
          />

          {/* Target y Segmentación */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-4 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/5 group/container hover:border-white/10 transition-colors">
              <div className="flex items-center space-x-3 mb-6 md:mb-8">
                <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center font-black text-xs">
                  03
                </div>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center">
                  {t.location}
                  <InfoTooltip text="Zonas geográficas exactas (regiones y ciudades macro) con mayor probabilidad de rentabilidad (ROAS)." />
                </h4>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-3 tracking-widest">
                    País y Zonas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.recommendedLocations?.map((l, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-[11px] font-bold border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-3 tracking-widest">
                    {t.localities}
                  </p>
                  <div className="grid gap-2">
                    {result.specificLocalities?.map((l, i) => (
                      <div
                        key={i}
                        className="p-3 bg-white/5 rounded-xl text-xs font-bold text-slate-300 border border-white/5 hover:bg-primary hover:text-white hover:border-primary transition-colors"
                      >
                        🏠 {l}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/5 group/container hover:border-white/10 transition-colors">
              <div className="flex items-center space-x-3 mb-6 md:mb-8">
                <div className="w-8 h-8 bg-pink-50 text-pink-500 rounded-lg flex items-center justify-center font-black text-xs">
                  04
                </div>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center">
                  {t.segmentation}
                  <InfoTooltip text="Intereses y perfiles psicológicos o de comportamiento sugeridos en las plataformas publicitarias para segmentar." />
                </h4>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-[11px] font-black text-slate-400 uppercase mb-3 tracking-widest">
                    {t.interests}
                  </p>
                  <div className="grid gap-2">
                    {result.platformInterests?.map((item, i) => (
                      <div
                        key={i}
                        className="p-3 bg-[#ff477b]/10 rounded-xl text-xs font-bold text-pink-300 border border-[#ff477b]/20 hover:bg-[#ff477b]/20 transition-colors"
                      >
                        ✨ {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Creatividad */}
          <section className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3.5rem] p-4 md:p-12 text-white shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative  border border-white/5 group/container hover:border-white/10 transition-colors">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px]"></div>
            <div className="flex items-center justify-between mb-8 md:mb-12">
              <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter flex items-center">
                <span className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center mr-4 text-sm">
                  05
                </span>
                Copywriting & CTAs
                <InfoTooltip text="Textos persuasivos y ganchos psicológicos recomendados para que uses directamente en tus anuncios y copys." />
              </h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
              <div className="space-y-8">
                <div>
                  <p className="text-[11px] font-black text-slate-500 uppercase mb-4 tracking-widest">
                    {t.headlines}
                  </p>
                  <div className="space-y-3">
                    {result.headlines?.map((h, i) => (
                      <div
                        key={i}
                        className="p-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white hover:bg-primary hover:text-white hover:border-primary transition-colors"
                      >
                        "{h}"
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-500 uppercase mb-4 tracking-widest">
                    {t.ctas}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {result.suggestedCTAs?.map((cta, i) => (
                      <span
                        key={i}
                        className="px-5 py-3 bg-[#ff477b] text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#ff477b]/20"
                      >
                        {cta}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-8">
                <div className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem]">
                  <p className="text-[11px] font-black text-[#ff477b] uppercase mb-6 tracking-widest">
                    {t.hooks}
                  </p>
                  <ul className="space-y-5">
                    {result.psychologicalHooks?.map((hook, i) => (
                      <li key={i} className="flex items-start space-x-4">
                        <div className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                          ✓
                        </div>
                        <p className="text-xs text-slate-300 font-medium leading-relaxed">
                          {hook}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Recomendaciones Estratégicas: Plataforma y Reporte */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Mejoras en la Plataforma */}
            <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/5 relative group/container hover:border-white/10 transition-colors">
              <div className="absolute top-0 left-0 w-1 md:w-1.5 h-1/4 bg-blue-500 rounded-l-[3.5rem]"></div>
              <div className="flex items-center space-x-3 mb-6 md:mb-8">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-black text-xs">
                  06
                </div>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center">
                  Mejoras en Plataforma
                  <InfoTooltip text="Optimización técnica directa para tu cuenta de Google Ads: estructura, pujas y mejores prácticas." />
                </h4>
              </div>
              <div className="space-y-4">
                {result.platformRecommendations?.length ? (
                  result.platformRecommendations.map((rec, i) => (
                    <div key={i} className="flex items-start space-x-4 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 hover:bg-blue-500/10 transition-all">
                      <div className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-[11px] shrink-0 mt-0.5 font-black">
                        {i + 1}
                      </div>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed">{rec}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic px-4">Análisis de plataforma en curso...</p>
                )}
              </div>
            </div>

            {/* Optimización de Auditoría */}
            <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-[0_30px_60px_rgba(0,0,0,0.4)] border border-white/5 relative group/container hover:border-white/10 transition-colors">
              <div className="absolute top-0 left-0 w-1 md:w-1.5 h-1/4 bg-[#ff477b] rounded-l-[3.5rem]"></div>
              <div className="flex items-center space-x-3 mb-6 md:mb-8">
                <div className="w-8 h-8 bg-[#ff477b] text-white rounded-lg flex items-center justify-center font-black text-xs">
                  07
                </div>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center">
                  Formato de Auditoría
                  <InfoTooltip text="Sugerencias para mejorar la presentación de estos datos y qué métricas adicionales considerar en el futuro." />
                </h4>
              </div>
              <div className="space-y-4">
                {result.auditRecommendations?.length ? (
                  result.auditRecommendations.map((rec, i) => (
                    <div key={i} className="flex items-start space-x-4 p-4 bg-[#ff477b]/5 rounded-2xl border border-[#ff477b]/10 hover:bg-[#ff477b]/10 transition-all">
                      <div className="w-5 h-5 bg-[#ff477b]/20 text-[#ff477b] rounded-full flex items-center justify-center text-[11px] shrink-0 mt-0.5 font-black">
                        {i + 1}
                      </div>
                      <p className="text-xs text-slate-300 font-medium leading-relaxed">{rec}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic px-4">Procesando recomendaciones de formato...</p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8 no-print">
          <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.4)] text-center relative  group/container hover:border-white/10 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover/container:bg-emerald-500/10 transition-colors"></div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 md:mb-10 flex items-center justify-center">
              {t.market_temp}
              <InfoTooltip text="Nivel de oportunidad y madurez del mercado calificado de 0 a 100. Valores altos indican alta demanda." />
            </p>
            <div className="relative inline-flex items-center justify-center mb-6 md:mb-10">
              <svg className="w-48 h-48 transform -rotate-90 group-hover/container:scale-105 transition-transform duration-500">
                <circle
                  cx="96"
                  cy="96"
                  r="86"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="16"
                  fill="transparent"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="86"
                  stroke={result.marketTempScore && result.marketTempScore > 60 ? "#10b981" : result.marketTempScore && result.marketTempScore < 40 ? "#f43f5e" : "#eab308"}
                  strokeWidth="16"
                  fill="transparent"
                  strokeDasharray={540.35}
                  strokeDashoffset={540.35 - (540.35 * (result.marketTempScore ?? 50)) / 100}
                  className="transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl md:text-6xl font-black text-white tracking-tighter">
                  {result.marketTempScore ?? 50}
                </span>
                <span className={`text-[11px] font-black uppercase tracking-widest mt-1 ${(result.marketTempScore ?? 50) > 60 ? 'text-emerald-500' : (result.marketTempScore ?? 50) < 40 ? 'text-rose-500' : 'text-yellow-500'}`}>
                  {(result.marketTempScore ?? 50) > 75 ? "Oportunidad Óptima" : (result.marketTempScore ?? 50) > 50 ? "Mercado Estable" : "Nicho Frío"}
                </span>
              </div>
            </div>
            
            {result.themeContext && (
              <div className="mt-2 p-3 bg-white/5 border border-white/5 rounded-2xl">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1 leading-tight text-center">
                  Posición de Marca/Término:
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="px-3 py-1 bg-[#ff477b]/10 border border-[#ff477b]/30 rounded-full text-[11px] font-black text-[#ff477b] uppercase tracking-wider">
                    {result.themeContext}
                  </span>
                  <span className="text-[11px] font-bold text-slate-300">
                    vs. Mercado
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.4)] group/container hover:border-white/10 transition-colors relative ">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                {t.keywords} Principales
                <InfoTooltip text="Palabras clave más rentables y relevantes detectadas para la campaña, su volumen estimado y coste por clic." />
              </h4>
              {result.extractedKeywords && result.extractedKeywords.length > 0 && (
                <button
                  onClick={handleDownloadKeywordsCSV}
                  title="Descargar Keywords CSV"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all no-print"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                  CSV
                </button>
              )}
            </div>
            <div className="space-y-2">
              {result.extractedKeywords?.slice(0, 12).map((k, i) => {
                const isTarget = result.themeContext && k.term.toLowerCase().includes(result.themeContext.toLowerCase());
                return (
                  <div
                    key={i}
                    className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
                      isTarget 
                        ? "bg-[#ff477b]/10 border-[#ff477b]/20 hover:bg-[#ff477b]/20" 
                        : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-primary hover:text-white hover:border-primary"
                    }`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">
                          {k.term}
                        </span>
                        {isTarget && (
                          <span className="px-1.5 py-0.5 bg-[#ff477b] text-white text-[7px] font-black rounded uppercase">Target</span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 uppercase font-black">
                        {k.competition}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-black text-white block">
                        {k.volume}
                      </span>
                      <span className="text-[11px] font-black text-emerald-500 uppercase tracking-tighter">
                        {k.cpc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 text-white shadow-[0_30px_60px_rgba(0,0,0,0.5)] border border-emerald-500/20 group/container hover:border-emerald-500/30 transition-colors">
            <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-6 md:mb-8 flex items-center">
              <span className="w-2 h-2 bg-white rounded-full mr-3"></span>
              {t.roadmap} — <span className="text-white ml-2">{result.themeContext}</span>
              <InfoTooltip text="Hoja de ruta táctica priorizada y probada para llevar tus campañas al máximo nivel de ROAS y autoridad." />
            </h4>
            <div className="space-y-4">
              {result.suggestionsForFirstPlace?.map((sug, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-4 p-4 bg-white/10 rounded-2xl border border-white/5 hover:bg-white/20 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-900/40 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-xs font-bold leading-tight">{sug}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Diagnostics */}
      {result && (user?.role === 'superAdmin' || user?.email === 'sanchezfj@me.com' || user?.email === 'sociopuerta@gmail.com') && (
        <AdminDiagnosticPanel result={result} language={lang as any} />
      )}

      {/* Feedback Loop */}
      {(user?.role === 'admin' || user?.role === 'superAdmin' || user?.subscription?.plan === 'Agency') && (
        <section className="mt-20 no-print pb-12">
          <FeedbackWidget 
            feature="search-audit"
            userId={user?.id || "guest"}
            userRole={user?.role}
            context={JSON.stringify({ domain: result.landingUrl, theme: result.themeContext })}
            aiResponse={result.text?.substring(0, 500)}
          />
        </section>
      )}
    </div>
  );
};

export default React.memo(ResultCard);
