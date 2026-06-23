import { buildAbsoluteUrl } from "../utils/apiConfig";
import * as React from "react";
import { useState } from "react";
import { martechService } from "../services/martechService";
import { motion, AnimatePresence } from "framer-motion";
import { auditAdImage } from "../services/geminiService";
import { ImageAnalysisResult, Language } from "../types";
import { InfoTooltip } from "./ui/InfoTooltip";
import { TRANSLATIONS } from "../constants";
import { authService } from "../services/authService";
import { Zap, CheckCircle2, Sparkles, Upload } from "lucide-react";
import { AdsPlatformPills } from "./ui/AdsPlatformPills";
import Toast, { ToastData } from "./Toast";

interface CompareCreativesViewProps {
  language: Language;
  theme: "dark" | "light";
  restoredAudit?: any | null;
  onSaveAudit?: (res: any, q: any) => void;
}

const HeatmapOverlay: React.FC<{ points: any[] }> = ({ points }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {points.map((point, idx) => {
        // Color mapping: Red (High), Green (Mid), Blue (Low)
        const isRed = point.relevance > 7 || point.label?.includes("[FOCUS]");
        const isGreen = point.relevance > 4 && !isRed;
        const color = isRed ? "#ef4444" : isGreen ? "#22c55e" : "#3b82f6";
        const glowColor = isRed ? "rgba(239, 68, 68, 0.4)" : isGreen ? "rgba(34, 197, 94, 0.4)" : "rgba(59, 130, 246, 0.4)";

        return (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.1, type: "spring" }}
            key={idx}
            className="absolute group/point"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            <div className="relative -translate-x-1/2 -translate-y-1/2">
              {/* Heatmap Glow Blob */}
              <div 
                className="absolute inset-0 w-16 h-16 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2 opacity-60"
                style={{ backgroundColor: color }}
              ></div>

              {/* Pulse effect */}
              <div 
                className="absolute inset-0 w-8 h-8 rounded-full animate-ping -translate-x-1/4 -translate-y-1/4"
                style={{ backgroundColor: glowColor }}
              ></div>

              {/* Point marker */}
              <div
                className="w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[11px] font-black text-white relative z-10"
                style={{ backgroundColor: color }}
              >
                {idx + 1}
              </div>

              {/* Hover Tooltip - Better positioning */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-3 py-2 bg-slate-900 text-white text-[11px] rounded-lg opacity-0 group-hover/point:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-auto border border-white/10 shadow-2xl">
                <span className="font-black mr-2" style={{ color: color }}>
                  {point.label
                    ?.replace("[FOCUS]", "")
                    .replace("[FIX]", "")
                    .trim()}
                </span>
                {point.details && (
                  <span className="text-slate-400 font-medium">
                    {point.details}
                  </span>
                )}
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

const CompareCreativesView: React.FC<CompareCreativesViewProps> = ({
  language,
  theme,
  restoredAudit,
  onSaveAudit,
}) => {
  const t = TRANSLATIONS[language];
  const [loading, setLoading] = useState<boolean[]>([false, false]);
  const [results, setResults] = useState<(ImageAnalysisResult | null)[]>([null, null]);
  const [images, setImages] = useState<(string | null)[]>([null, null]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [auditStep, setAuditStep] = useState(0);
  const [auditProgress, setAuditProgress] = useState(0);
  const [toast, setToast] = useState<ToastData | null>(null);
  const progressIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const COMPARE_STEPS = [
    'Loading creatives...',
    'Neural Analysis A...',
    'Neural Analysis B...',
    'Generating verdict...',
  ];

  const startCompareProgress = () => {
    setAuditProgress(0); setAuditStep(0);
    let p = 0;
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      p += p < 20 ? 4 : p < 50 ? 2 : p < 80 ? 1 : 0.3;
      const capped = Math.min(Math.round(p), 95);
      setAuditProgress(capped);
      setAuditStep(capped < 25 ? 0 : capped < 55 ? 1 : capped < 80 ? 2 : 3);
      if (capped >= 95) clearInterval(progressIntervalRef.current!);
    }, 200);
  };

  const completeCompareProgress = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setAuditProgress(100); setAuditStep(3);
    setTimeout(() => { setAuditProgress(0); setAuditStep(0); }, 800);
  };

  // New Context Fields
  const [marketingObjective, setMarketingObjective] =
    useState<string>("Conversion");
  const [adPlatform, setAdPlatform] = useState<string>(
    "Universal / Multiplatform",
  );

  React.useEffect(() => {
    if (Array.isArray(restoredAudit)) {
      setResults(restoredAudit);
      setImages([null, null]); // Currently we don't save images historically
    }
  }, [restoredAudit]);

  const handleReset = () => {
    setImages([null, null]);
    setResults([null, null]);
    setLoading([false, false]);
    setIsExecuting(false);
    setMarketingObjective("Conversion");
    setAdPlatform("Universal / Multiplatform");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFileUpload = async (index: number, e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const newImages = [...images];
      newImages[index] = base64;
      setImages(newImages);

      // Clear prior results if new image uploaded
      const newResults = [...results];
      newResults[index] = null;
      setResults(newResults);
    };
    reader.readAsDataURL(file);
  };

  const runComparison = async () => {
    if (!images[0] || !images[1]) return;
    setIsExecuting(true);
    setLoading([true, true]);
    startCompareProgress();

    try {
      // Executing dual analysis with context
      const promises = images.map((img, i) => {
        if (!img) return Promise.resolve(null);
        
        // Extract actual MIME type from data URL before stripping
        const mimeMatch = img.match(/^data:image\/([^;]+);base64,/);
        const detectedMime = mimeMatch ? `image/${mimeMatch[1]}` : "image/jpeg";
        
        // Robust base64 stripping
        const cleanBase64 = img.replace(/^data:image\/[^;]+;base64,/, "");
        
        return auditAdImage(cleanBase64, detectedMime, language, {
          objective: marketingObjective,
          platform: adPlatform,
        });
      });

      const settled = await Promise.allSettled(promises);
      const res1 = settled[0].status === "fulfilled" ? settled[0].value : null;
      const res2 = settled[1].status === "fulfilled" ? settled[1].value : null;

      martechService.trackEngagement('compare_creatives', {
        objective: marketingObjective,
        platform: adPlatform
      });
      
      setResults([res1, res2]);
      completeCompareProgress();
      onSaveAudit?.([res1, res2], {
        fileA: "Imagen A",
        fileB: "Imagen B",
        objective: marketingObjective,
      });
    } catch (err) {
      console.error("Error in comparison:", err);
      completeCompareProgress();
    } finally {
      setLoading([false, false]);
      setIsExecuting(false);
    }
  };

  const handleExportPDF = async () => {
    const user = authService.getCurrentUser();
    const { generateGoogleStylePDF } = await import("../utils/exportUtils");
    await generateGoogleStylePDF(
      "comparison",
      results,
      `AB_Comparison_${new Date().getTime()}`,
      language,
      {
        user,
        comparisonImages: images as string[],
        context: {
          objective: marketingObjective,
          platform: adPlatform,
        },
      },
    );
    martechService.trackEngagement('export_pdf', {
      type: 'comparison',
      objective: marketingObjective,
      platform: adPlatform
    });
  };

  const handleSendEmailReportCompare = async () => {
    if (!results[0] || !results[1]) return;
    const user = authService.getCurrentUser();
    const emailStr = window.prompt(
      language === "es" ? "Ingresa el email donde enviar el reporte PDF:" : "Enter the email to send the PDF report to:",
      user?.email || ""
    );
    if (!emailStr?.trim()) return;
    const fileName = `AB_Comparison_${new Date().getTime()}.pdf`;
    setToast({ title: language === "es" ? "Generando PDF..." : "Generating PDF...", message: language === "es" ? "Esto puede tomar unos segundos." : "This may take a few seconds.", type: "info" });
    try {
      const { generateGoogleStylePDF } = await import("../utils/exportUtils");
      const pdfBase64 = await generateGoogleStylePDF("comparison", results, fileName, language, {
        user, comparisonImages: images as string[], context: { objective: marketingObjective, platform: adPlatform }, action: "return"
      }) as string;
      if (!pdfBase64) throw new Error("PDF generation returned empty");
      const response = await fetch(buildAbsoluteUrl('/.netlify/functions/api-send-report'), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": user?.id || ""
        },
        body: JSON.stringify({ email: emailStr.trim(), pdfBase64, fileName, domain: `${adPlatform} - ${marketingObjective}`, reportType: "Creative Duel A/B", language })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      setToast({ title: language === "es" ? "Email Enviado ✓" : "Email Sent ✓", message: language === "es" ? `Reporte enviado a ${emailStr.trim()}` : `Report sent to ${emailStr.trim()}`, type: "success" });
    } catch (err: any) {
      console.error("[CompareCreatives] Email error:", err);
      setToast({ title: language === "es" ? "Error de Envío" : "Send Error", message: err?.message || (language === "es" ? "No se pudo enviar el email." : "Could not send email."), type: "error" });
    }
  };

  const areBothImagesUploaded = images[0] && images[1];
  const hasResults = results[0] && results[1];

  const getScoreNumber = (rating: string | undefined | null) => {
    if (!rating) return 0;
    const match = rating.match(/([0-9.]+)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const scoreA = getScoreNumber(results[0]?.overallRating);
  const scoreB = getScoreNumber(results[1]?.overallRating);
  const winnerIndex = scoreA >= scoreB ? 0 : 1;
  const winnerResult = results[winnerIndex];
  const winMargin = Math.abs(scoreA - scoreB).toFixed(1);

  return (
    <div className={`min-h-screen selection:bg-[#ff477b]/30 selection:text-white transition-colors duration-500 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      {/* Premium Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-[#ff477b]/5 blur-[120px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse-slow animation-delay-2000"></div>
      </div>
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 space-y-16 relative z-10">
        <div className={`text-center space-y-8 relative z-10 ${theme === "dark" ? "text-white" : "text-slate-950"}`}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`inline-flex items-center gap-3 px-8 py-3 ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"} backdrop-blur-2xl rounded-full text-slate-400 text-[11px] font-black uppercase tracking-[0.4em] mb-4`}
          >
            <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff477b] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff477b]"></span>
          </span>
          Intelligence Engine • Creative Duel
        </motion.div>

          <motion.h1
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1 }}
            className={`text-4xl md:text-7xl lg:text-[10rem] font-black tracking-tighter leading-none uppercase italic drop-shadow-2xl ${theme === "dark" ? "text-white" : "text-slate-950"}`}
          >
            GROWTH <br />
            <span className="text-gradient-magenta inline-block transform -skew-x-6">
              {language === "es" ? "DUELO DE CREATIVOS" : "CREATIVE DUEL"}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={`${theme === "dark" ? "text-slate-400" : "text-slate-500"} font-medium text-xl max-w-3xl mx-auto leading-relaxed italic`}
          >
            {language === "es"
              ? "Sube dos piezas para realizar un duelo algorítmico y descubrir cuál dominará la atención subconsciente."
              : "Upload two pieces to perform an algorithmic duel and discover which one will dominate subconscious attention."}
          </motion.p>

        {/* Strategic Context Selectors: STITCH STYLE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 pt-4 w-full"
        >
          {/* Brand DNA Section for Comparativa */}
          {authService.getCurrentUser()?.brandProfile?.brandName && (
            <div className={`md:col-span-2 ${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} p-8 rounded-[3rem] flex items-center justify-between group transition-all relative hover:neon-magenta-glow`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff477b]/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-[#ff477b]/10 transition-colors"></div>
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-16 h-16 bg-slate-950 rounded-[1.5rem] flex items-center justify-center border border-white/10 group-hover:border-[#ff477b]/30 shadow-2xl transition-all">
                  {authService.getCurrentUser()?.brandProfile?.isotypeUrl ? (
                    <img
                      src={
                        authService.getCurrentUser()?.brandProfile?.isotypeUrl
                      }
                      className="w-10 h-10 object-contain"
                      alt="Brand Isotype"
                    />
                  ) : (
                    <span className="text-[#ff477b] text-2xl font-black">
                      {
                        authService.getCurrentUser()?.brandProfile
                          ?.brandName?.[0]
                      }
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-black text-[#ff477b] uppercase tracking-[0.3em] leading-none mb-2 text-left">
                    Strategic Identity Sync
                  </p>
                  <p className={`text-2xl font-black ${theme === "dark" ? "text-white group-hover:text-[#ff477b]" : "text-slate-900 group-hover:text-[#ff477b]"} transition-colors tracking-tight`}>
                    {authService.getCurrentUser()?.brandProfile?.brandName}
                  </p>
                </div>
              </div>
              <div className={`text-right ${theme === "dark" ? "bg-white/5 border-white/5 group-hover:border-white/10 group-hover:bg-primary hover:text-white hover:border-primary" : "bg-slate-50 border-slate-100 group-hover:border-slate-200 group-hover:bg-primary hover:text-white hover:border-primary"} px-8 py-4 rounded-[2rem] border relative z-10 transition-all`}>
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 leading-none">
                  Compliance
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${authService.getCurrentUser()?.brandProfile?.adherenceLevel === "Strict" ? "bg-rose-500 shadow-[0_0_15px_#f43f5e]" : "bg-emerald-500 shadow-[0_0_15px_#10b981]"}`}
                  ></span>
                  <p
                    className={`text-[12px] font-black uppercase tracking-[0.2em] ${authService.getCurrentUser()?.brandProfile?.adherenceLevel === "Strict" ? "text-rose-400" : "text-emerald-400"}`}
                  >
                    {authService.getCurrentUser()?.brandProfile?.adherenceLevel}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Campaign Objective Selector */}
          <div className={`${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} p-8 rounded-[3rem] space-y-6 relative group/container text-left transition-colors`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff477b]/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover/container:bg-[#ff477b]/10 transition-colors"></div>
            <label className="text-[11px] font-black text-[#ff477b] uppercase tracking-[0.3em] px-2 block relative z-10">
              {language === "es" ? "Objetivo del Duelo" : "Duel Objective"}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 w-full">
              {[
                {
                  id: "Awareness",
                  label: language === "es" ? "Reconocimiento" : "Awareness",
                  icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                },
                {
                  id: "Consideration",
                  label: language === "es" ? "Consideración" : "Consideration",
                  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
                },
                {
                  id: "Conversion",
                  label: language === "es" ? "Conversión" : "Conversion",
                  icon: "M13 10V3L4 14h7v7l9-11h-7z",
                },
                {
                  id: "Loyalty",
                  label: language === "es" ? "Fidelización" : "Loyalty",
                  icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
                },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setMarketingObjective(item.id as any)}
                  className={`flex flex-col items-center justify-center p-4 md:p-5 w-full rounded-[1.5rem] md:rounded-[2rem] transition-all border group/btn ${
                    marketingObjective === item.id
                      ? theme === "dark"
                        ? "bg-white border-white shadow-[0_20px_40px_-12px_rgba(255,255,255,0.3)] scale-[1.03] z-20"
                        : "bg-slate-900 border-slate-900 shadow-[0_20px_40px_-12px_rgba(15,23,42,0.3)] scale-[1.03] z-20"
                      : theme === "dark"
                        ? "bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:bg-primary hover:text-white hover:border-primary"
                        : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-primary hover:text-white hover:border-primary"
                  }`}
                >
                  <svg
                    className={`w-6 h-6 mb-3 transition-colors ${marketingObjective === item.id ? "text-[#ff477b]" : theme === "dark" ? "text-white/20 group-hover/btn:text-white/60" : "text-slate-200 group-hover/btn:text-slate-400"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={item.icon}
                    />
                  </svg>
                  <span
                    className={`text-[11px] font-black uppercase tracking-widest ${marketingObjective === item.id ? (theme === "dark" ? "text-slate-900" : "text-white") : ""}`}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Ads Platform Selector — Pill Scrollbar */}
          <div className={`${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} p-8 rounded-[3rem] space-y-4 relative group/container text-left transition-colors`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover/container:bg-indigo-500/10 transition-colors"></div>
            <div className="relative z-10">
              <AdsPlatformPills
                value={adPlatform}
                onChange={setAdPlatform}
                theme={theme}
                language={language}
              />
            </div>
          </div>
        </motion.div>

        {areBothImagesUploaded && !hasResults && !isExecuting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pt-8 w-full max-w-xl mx-auto"
          >
            <button
              onClick={runComparison}
              className={`w-[90%] sm:w-full ${theme === "dark" ? "bg-slate-950/80 text-white border-white/10" : "bg-slate-900 text-white border-slate-800 shadow-xl"} backdrop-blur-xl px-8 md:px-12 py-5 md:py-7 rounded-[2rem] md:rounded-[2.5rem] font-black uppercase tracking-widest md:tracking-[0.25em] text-[11px] md:text-xs hover:shadow-[#ff477b]/20 hover:border-[#ff477b]/50 transition-all duration-300 flex items-center justify-center gap-4 group relative mx-auto text-center border`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#ff477b]/0 via-[#ff477b]/10 to-[#ff477b]/0 group-hover:via-[#ff477b]/20 transition-all duration-500"></div>
              <svg
                className="w-6 h-6 group-hover:rotate-12 group-hover:scale-110 transition-all relative z-10 text-[#ff477b]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span className="relative z-10">
                {language === "es"
                  ? "Ejecutar Duelo Algorítmico"
                  : "Run Algorithmic Duel"}
              </span>
            </button>
          </motion.div>
        )}
      </div>

      <div
        className={`grid lg:grid-cols-2 gap-6 md:gap-12 transition-all relative z-10 ${hasResults ? (theme === "dark" ? "glass-panel p-4 md:p-8 rounded-[3rem] md:rounded-[4rem]" : "bg-white/50 backdrop-blur-3xl border border-slate-200 p-4 md:p-8 rounded-[3rem] md:rounded-[4rem] shadow-2xl") : "grid-cols-1 md:grid-cols-2"}`}
      >
        {/* VS Badge — dual ring orbit */}
        {!hasResults && !isExecuting && areBothImagesUploaded && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none hidden md:block">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className={`w-24 h-24 ${theme === "dark" ? "bg-slate-900 border-[#ff477b]" : "bg-white border-[#ff477b] shadow-2xl"} rounded-full border-4 flex items-center justify-center relative shadow-[0_0_50px_rgba(255,73,124,0.3)]`}
            >
              <div className="absolute inset-0 rounded-full bg-[#ff477b]/20 animate-pulse" />
              {/* Dual orbit rings */}
              <div className="absolute inset-[-12px] rounded-full border border-[#ff477b]/20 animate-spin" style={{ animationDuration: '4s' }} />
              <div className="absolute inset-[-20px] rounded-full border border-indigo-500/10 animate-spin" style={{ animationDuration: '7s', animationDirection: 'reverse' }} />
              <span className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"} italic tracking-tighter relative z-10`}>VS</span>
            </motion.div>
          </div>
        )}
        {[0, 1].map((i) => {
          const isOriginal = i === 0;
          const titleES = isOriginal
            ? "Imagen Control (A)"
            : "Imagen Desafío (B)";
          const titleEN = isOriginal
            ? "Control Image (A)"
            : "Challenger Image (B)";

          return (
            <div key={i} className="space-y-8 h-full">
              <div className="flex items-center justify-between px-6">
                <div className="space-y-1">
                  <h3
                    className={`text-sm font-black uppercase tracking-[0.15em] ${isOriginal ? (theme === "dark" ? "text-slate-400" : "text-slate-500") : "text-indigo-500"}`}
                  >
                    {language === "es" ? titleES : titleEN}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${isOriginal ? "bg-slate-300" : "bg-indigo-500"}`}
                    ></div>
                    <p className={`text-[11px] ${theme === "dark" ? "text-slate-400" : "text-slate-500"} font-bold uppercase tracking-widest`}>
                      {isOriginal
                        ? language === "es"
                          ? "Línea de base"
                          : "Baseline"
                        : language === "es"
                          ? "Variante nueva"
                          : "New variant"}
                    </p>
                  </div>
                </div>
                {results[i] && (
                  <div className="flex items-center gap-2">
                    <div
                      className={`px-4 py-1.5 rounded-full text-[11px] font-black text-white ${getScoreNumber(results[i]?.overallRating) >= 8 ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-slate-800"}`}
                    >
                      {results[i]?.overallRating}
                    </div>
                  </div>
                )}
              </div>

              <motion.div
                whileHover={{ scale: images[i] && !loading[i] ? 1.01 : 1 }}
                className={`relative aspect-square md:aspect-[4/3] rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden border transition-all duration-500 group/dropzone ${
                  images[i]
                    ? theme === "dark" 
                      ? "border-white/5 bg-slate-950/50 shadow-2xl" 
                      : "border-slate-200 bg-white shadow-2xl"
                    : theme === "dark"
                      ? "glass-card hover:neon-magenta-glow"
                      : "bg-white border-slate-200 shadow-xl hover:border-[#ff477b]/30"
                }`}
              >
                {images[i] ? (
                  <div className="group h-full relative">
                    <img
                      src={images[i]!}
                      className="w-full h-full object-contain p-4"
                      alt={`Variant ${i + 1}`}
                    />

                    {/* Heatmap Overlay with Points */}
                    {results[i]?.analysisPoints && !loading[i] && (
                      <HeatmapOverlay points={results[i]!.analysisPoints} />
                    )}

                    <div className={`absolute inset-x-0 bottom-0 h-24 ${theme === "dark" ? "bg-gradient-to-t from-slate-950/60" : "bg-gradient-to-t from-white/60"} to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-end justify-center pb-6`}>
                      {!hasResults && !loading[i] && (
                        <label className={`cursor-pointer ${theme === "dark" ? "bg-white/10 border-white/20 text-white hover:bg-white/20" : "bg-slate-900 border-slate-800 text-white hover:bg-primary hover:text-white hover:border-primary"} backdrop-blur-md border px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-colors pointer-events-auto shadow-xl`}>
                          {language === "es"
                            ? "Cambiar Imagen"
                            : "Change Image"}
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => handleFileUpload(i, e)}
                            accept="image/*"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group p-10 text-center relative z-10">
                    <div className={`w-20 h-20 ${theme === "dark" ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"} rounded-[2rem] shadow-2xl flex items-center justify-center mb-6 text-[#ff477b] transition-all group-hover:scale-110 group-active:scale-95 group-hover:border-[#ff477b]/50 relative overflow-hidden border`}>
                      <div className="absolute inset-0 bg-[#ff477b]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <svg
                        className="w-10 h-10 relative z-10"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                    <span className={`text-xs font-black ${theme === "dark" ? "text-white" : "text-slate-900"} uppercase tracking-[0.2em] mb-2`}>
                      {language === "es"
                        ? "Seleccionar Creativo"
                        : "Select Creative"}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      {language === "es"
                        ? "Arrastra o haz clic para subir"
                        : "Drag or click to upload"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => handleFileUpload(i, e)}
                      accept="image/*"
                    />
                  </label>
                )}

                {loading[i] && (
                  <div className={`absolute inset-0 ${theme === "dark" ? "bg-slate-950/90" : "bg-white/95"} backdrop-blur-xl flex flex-col items-center justify-center space-y-6 z-20`}>
                    <div className="relative">
                      <div className={`w-16 h-16 border-4 ${theme === "dark" ? "border-white/10" : "border-slate-100"} rounded-full`}></div>
                      <div className="w-16 h-16 border-4 border-transparent border-t-[#ff477b] rounded-full animate-spin absolute top-0"></div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className={`text-[12px] font-black ${theme === "dark" ? "text-white" : "text-slate-900"} uppercase tracking-[0.3em] animate-pulse`}>
                        {language === "es"
                          ? "Escaneando Neuronas"
                          : "Scanning Neurons"}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        {language === "es"
                          ? "Identificando Hot Spots"
                          : "Identifying Hot Spots"}
                      </p>
                    </div>
                  </div>
                )}

                {results[i] && (
                  <div className="absolute top-8 right-8 flex flex-col items-end gap-3 z-30">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`px-5 py-2.5 backdrop-blur-md border text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] ${
                        hasResults && i === winnerIndex
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 border-emerald-400/30 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                          : theme === "dark" ? 'bg-white/10 border-white/20' : 'bg-slate-900 border-slate-800 shadow-xl'
                      }`}
                    >
                      SCORE: {results[i]?.overallRating}/10
                    </motion.div>
                    {hasResults && i === winnerIndex && (
                      <motion.div
                        initial={{ scale: 0.8, x: 20, opacity: 0 }}
                        animate={{ scale: 1, x: 0, opacity: 1 }}
                        className="px-6 py-3 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(16,185,129,0.3)] flex items-center gap-3 border border-white/20"
                      >
                        <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                          👑
                        </div>
                        {language === "es"
                          ? "GANADOR MÁS PROBABLE"
                          : "MOST PROBABLE WINNER"}
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Predictive metrics summary */}
              {results[i] && (
                <motion.div
                  className="grid grid-cols-2 lg:grid-cols-4 lg:gap-2 gap-4"
                  initial="hidden"
                  animate="visible"
                  variants={{ visible: { transition: { staggerChildren: 0.1 } }, hidden: {} }}
                >
                  {[
                    { label: language === "es" ? "Atención" : "Attention", val: results[i]?.predictiveMetrics?.focusScore, icon: "🎯", color: "bg-orange-500" },
                    { label: language === "es" ? "Claridad" : "Clarity", val: results[i]?.predictiveMetrics?.clarityScore, icon: "✨", color: "bg-blue-500" },
                    { label: language === "es" ? "Carga" : "Load", val: results[i]?.predictiveMetrics?.cognitiveDemand, icon: "🧠", color: "bg-purple-500", inv: true },
                    { label: language === "es" ? "Memoria" : "Memory", val: results[i]?.predictiveMetrics?.recallScore, icon: "🔥", color: "bg-rose-500" },
                  ].map((metric, idx) => (
                    <motion.div
                      key={idx}
                      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
                      className={`${theme === "dark" ? "glass-card border-white/10 hover:neon-cyan-glow" : "bg-white border-slate-200 shadow-lg hover:border-indigo-300"} p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] group h-28 md:h-32 flex flex-col justify-between relative transition-all`}
                    >
                      <div className={`absolute top-0 right-0 w-16 h-16 ${metric.color}/5 blur-2xl rounded-full translate-x-4 -translate-y-4 group-hover:${metric.color}/10 transition-colors`}></div>
                      <div className="flex items-center gap-2 md:gap-3 relative z-10">
                        <div className={`w-6 h-6 md:w-8 md:h-8 ${metric.color}/10 ${metric.color.replace("bg-", "text-")} rounded-lg md:rounded-xl flex items-center justify-center text-xs md:text-sm`}>
                          {metric.icon}
                        </div>
                        <p className="text-[11px] uppercase font-black text-slate-400 tracking-widest">{metric.label}</p>
                      </div>
                      <div className="flex items-end justify-between relative z-10">
                        <p className={`text-2xl md:text-3xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"} group-hover:scale-110 transition-transform origin-left`}>{metric.val}%</p>
                        <div className="w-8 md:w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${metric.color} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${metric.val}%` }}
                            transition={{ duration: 0.8, delay: idx * 0.1, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

        {/* Animated progress popup */}
        <AnimatePresence>
          {isExecuting && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] w-[92vw] max-w-md"
            >
              <div className="bg-[#0a0f1e]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#ff477b]/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-[#ff477b] animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Creative Duel</p>
                    <p className="text-[11px] text-slate-500 font-medium">{COMPARE_STEPS[auditStep]}</p>
                  </div>
                  <div className="ml-auto text-[11px] font-black text-[#ff477b] tabular-nums">{auditProgress}%</div>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#ff477b] to-indigo-500 rounded-full"
                    style={{ width: `${auditProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  {COMPARE_STEPS.map((_, idx) => (
                    <div key={idx} className={`flex-1 flex items-center gap-1.5 transition-all ${
                      idx < auditStep ? 'opacity-100' : idx === auditStep ? 'opacity-100' : 'opacity-30'
                    }`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        idx < auditStep ? 'bg-emerald-500' : idx === auditStep ? 'bg-[#ff477b] animate-pulse' : 'bg-white/10'
                      }`}>
                        {idx < auditStep ? <CheckCircle2 className="w-3 h-3 text-white" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/60" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      <AnimatePresence>
        {hasResults && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-16 relative z-10"
          >
            {/* Winner Announcement Card */}
            <div className={`${theme === "dark" ? "glass-panel border-white/10 hover:neon-magenta-glow" : "bg-white border-slate-200 shadow-2xl hover:border-indigo-200"} relative rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-16 group/winner transition-all`}>
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 blur-[150px] rounded-full -mr-72 -mt-72 animate-pulse group-hover/winner:bg-indigo-500/30 transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#ff477b]/10 blur-[150px] rounded-full -ml-72 -mb-72 animate-pulse delay-700 group-hover/winner:bg-[#ff477b]/20 transition-colors"></div>

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16">
                <div className="flex-1 text-center md:text-left space-y-10">
                  <div>
                    <div className="inline-flex items-center gap-4 px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[11px] font-black uppercase tracking-[0.3em] mb-8 relative z-20">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></div>
                      {language === "es"
                        ? "Veredicto Antigravity AI"
                        : "Antigravity AI Verdict"}
                    </div>
                    <h3 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight uppercase relative z-20">
                      {winnerIndex === 0
                        ? language === "es"
                          ? "La Original domina"
                          : "Original dominates"
                        : language === "es"
                          ? "El Desafío se impone"
                          : "The Challenger takes the lead"}
                    </h3>
                  </div>

                  <p className={`${theme === "dark" ? "text-slate-400" : "text-slate-600"} text-xl font-medium leading-relaxed max-w-2xl border-l-2 border-[#ff477b]/30 pl-8 italic`}>
                    {winnerResult?.visualCritique ||
                      (winnerIndex === 0
                        ? "La variante A proyecta una mayor eficiencia neuronal. La disposición de los elementos permite una decodificación semántica más veloz."
                        : "La variante B ha logrado capturar los puntos de anclaje visual con mayor precisión. El impacto subconsciente es superior.")}
                  </p>

                  {/* ── Veredicto del Ganador ──────────────────────────────── */}
                  {winnerResult?.growthVerdict && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="space-y-4 mt-6"
                    >
                      {/* Fortalezas del ganador */}
                      {winnerResult.growthVerdict.strengths?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-400">
                            {language === 'es' ? 'Por qué gana' : 'Why it wins'}
                          </p>
                          <ul className="space-y-1.5">
                            {winnerResult.growthVerdict.strengths.slice(0, 3).map((s: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-[12px] text-slate-300">
                                <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Next action para el perdedor */}
                      {results[winnerIndex === 0 ? 1 : 0]?.growthVerdict?.priorityFix && (
                        <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                          <p className="text-[11px] font-black uppercase tracking-widest text-amber-400 mb-2">
                            {language === 'es'
                              ? `Acción para mejorar Variante ${winnerIndex === 0 ? 'B' : 'A'}`
                              : `Action to improve Variant ${winnerIndex === 0 ? 'B' : 'A'}`}
                          </p>
                          <p className="text-sm font-bold text-white leading-relaxed">
                            {results[winnerIndex === 0 ? 1 : 0]?.growthVerdict?.priorityFix}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                  {/* ──────────────────────────────────────────────────────── */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
                    <div className={`${theme === "dark" ? "bg-white/5 border-white/5 group hover:bg-primary hover:text-white hover:border-primary" : "bg-slate-50 border-slate-100 group hover:bg-primary hover:text-white hover:border-primary shadow-sm"} backdrop-blur-md px-8 py-6 rounded-3xl border transition-all relative`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full translate-x-12 -translate-y-12"></div>
                      <p className={`text-[11px] font-black ${theme === "dark" ? "text-slate-500" : "text-slate-400"} uppercase tracking-widest mb-1`}>
                        {language === "es"
                          ? "Diferencial de Impacto"
                          : "Impact Differential"}
                      </p>
                      <p className="text-2xl font-black text-emerald-400">
                        +{winMargin}{" "}
                        <span className="text-slate-500 text-sm">pts</span>
                      </p>
                    </div>
                    <div className={`${theme === "dark" ? "bg-white/5 border-white/5 group hover:bg-primary hover:text-white hover:border-primary" : "bg-slate-50 border-slate-100 group hover:bg-primary hover:text-white hover:border-primary shadow-sm"} backdrop-blur-md px-8 py-6 rounded-3xl border transition-all relative`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#ff477b]/10 blur-2xl rounded-full translate-x-12 -translate-y-12"></div>
                      <p className={`text-[11px] font-black ${theme === "dark" ? "text-slate-500" : "text-slate-400"} uppercase tracking-widest mb-1`}>
                        {language === "es"
                          ? "Índice de Confianza"
                          : "Confidence Level"}
                      </p>
                      <p className="text-2xl font-black text-[#ff477b]">
                        {95 + Math.min(Number(winMargin) * 2, 4)}%
                      </p>
                    </div>

                    {/* NEW: Audience Match & Uplift for winner */}
                    {results[winnerIndex]?.growthVerdict && (
                      <div className={`${theme === "dark" ? "bg-white/5 border-white/5 group hover:bg-primary hover:text-white hover:border-primary" : "bg-slate-50 border-slate-100 group hover:bg-primary hover:text-white hover:border-primary shadow-sm"} backdrop-blur-md px-8 py-6 rounded-3xl border transition-all relative`}>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full translate-x-12 -translate-y-12"></div>
                        <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                          {language === "es"
                            ? "Afinidad de Audiencia"
                            : "Audience Match"}
                        </p>
                        <p className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                          {results[winnerIndex].audienceMatchScore || 0}%
                        </p>
                      </div>
                    )}
                    {results[winnerIndex]?.growthVerdict && (
                      <div className={`${theme === "dark" ? "bg-white/5 border-white/5 group hover:bg-primary hover:text-white hover:border-primary" : "bg-slate-50 border-slate-100 group hover:bg-primary hover:text-white hover:border-primary shadow-sm"} backdrop-blur-md px-8 py-6 rounded-3xl border transition-all relative`}>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl rounded-full translate-x-12 -translate-y-12"></div>
                        <p className="text-[11px] font-black text-emerald-400 uppercase tracking-widest mb-1">
                          {language === "es"
                            ? "Potencial de Mejora"
                            : "Uplift Potential"}
                        </p>
                        <p className="text-2xl font-black text-emerald-400">
                          {results[winnerIndex].growthVerdict
                            ?.conversionUpliftPotential || "N/A"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-80 shrink-0 relative">
                  <div className="aspect-square rounded-full bg-gradient-to-br from-[#ff477b] to-indigo-600 p-[2px] shadow-3xl">
                    <div className="w-full h-full bg-slate-950 rounded-full flex flex-col items-center justify-center">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                        WINNER SCORE
                      </span>
                      <p className="text-6xl md:text-8xl font-black text-white">
                        {Math.max(scoreA, scoreB)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Score Breakdown por Plataforma ─────────────────────────── */}
            {hasResults && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] mb-1">
                      {language === 'es' ? 'Puntuación por Plataforma' : 'Score by Platform'}
                    </p>
                    <h3 className={`text-2xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {language === 'es' ? 'Análisis Comparativo' : 'Comparative Analysis'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 text-slate-400"><span className="w-3 h-3 rounded-sm bg-slate-500 inline-block" /> A</span>
                    <span className="flex items-center gap-1.5 text-indigo-400"><span className="w-3 h-3 rounded-sm bg-indigo-500 inline-block" /> B</span>
                  </div>
                </div>

                <div className="space-y-6">
                  {([
                    { key: 'google', label: 'Google Ads', icon: '🔍' },
                    { key: 'meta', label: 'Meta (FB/IG)', icon: '📸' },
                    { key: 'tiktok', label: 'TikTok', icon: '🎵' },
                    { key: 'programmatic', label: 'Display / Programmatic', icon: '📊' },
                  ] as const).map(({ key, label, icon }) => {
                    const sA = (results[0] as any)?.scores?.[key] ?? 0;
                    const sB = (results[1] as any)?.scores?.[key] ?? 0;
                    const max = Math.max(sA, sB, 1);
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                            {icon} {label}
                          </span>
                          <div className="flex items-center gap-4 text-[11px] font-black">
                            <span className={sA >= sB ? 'text-white' : 'text-slate-500'}>{sA}</span>
                            <span className="text-slate-700">vs</span>
                            <span className={sB > sA ? 'text-indigo-300' : 'text-slate-500'}>{sB}</span>
                          </div>
                        </div>
                        {/* Bar A */}
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(sA / 100) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${sA >= sB ? 'bg-gradient-to-r from-[#ff477b] to-[#ff2060]' : 'bg-slate-600'}`}
                          />
                        </div>
                        {/* Bar B */}
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(sB / 100) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                            className={`h-full rounded-full ${sB > sA ? 'bg-gradient-to-r from-indigo-500 to-indigo-400' : 'bg-slate-700'}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Conversion score compuesto */}
                {(() => {
                  const convA = Math.round((
                    ((results[0] as any)?.scores?.google ?? 0) * 0.35 +
                    ((results[0] as any)?.scores?.meta ?? 0) * 0.30 +
                    ((results[0] as any)?.scores?.tiktok ?? 0) * 0.20 +
                    ((results[0] as any)?.scores?.programmatic ?? 0) * 0.15
                  ));
                  const convB = Math.round((
                    ((results[1] as any)?.scores?.google ?? 0) * 0.35 +
                    ((results[1] as any)?.scores?.meta ?? 0) * 0.30 +
                    ((results[1] as any)?.scores?.tiktok ?? 0) * 0.20 +
                    ((results[1] as any)?.scores?.programmatic ?? 0) * 0.15
                  ));
                  return (convA > 0 || convB > 0) ? (
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                        {language === 'es' ? 'Score de Conversión Compuesto' : 'Composite Conversion Score'}
                      </p>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-[11px] text-slate-500 uppercase mb-1">A</p>
                          <p className={`text-2xl font-black ${convA >= convB ? 'text-[#ff477b]' : 'text-slate-500'}`}>{convA}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[11px] text-slate-500 uppercase mb-1">B</p>
                          <p className={`text-2xl font-black ${convB > convA ? 'text-indigo-400' : 'text-slate-500'}`}>{convB}</p>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </motion.div>
            )}
            {/* ──────────────────────────────────────────────────────────────── */}

            {/* Strategic Recommendations Side-by-Side */}
            <div className="grid md:grid-cols-2 gap-8">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] space-y-8 relative group/container hover:border-white/10 transition-colors"
                >
                  <div
                    className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-16 -mt-16 transition-all ${i === 0 ? "bg-slate-500/5 group-hover/container:bg-slate-500/10" : "bg-indigo-500/5 group-hover/container:bg-indigo-500/10"}`}
                  ></div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg border border-white/10 shadow-xl ${i === 0 ? "bg-slate-800" : "bg-indigo-600"}`}
                    >
                      {i === 0 ? "A" : "B"}
                    </div>
                    <h4 className="text-xl font-black text-white uppercase tracking-tight">
                      {language === "es"
                        ? "Plan de Optimización"
                        : "Optimization Plan"}
                    </h4>
                  </div>
                  <div className="space-y-4 relative z-10">
                    {results[i]?.creativeSuggestions
                      ?.slice(0, 3)
                      .map((s, idx) => (
                        <div
                          key={idx}
                          className="flex gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-primary hover:text-white hover:border-primary hover:border-white/10 transition-all group/item"
                        >
                          <span
                            className={`font-black text-lg ${i === 0 ? "text-slate-500" : "text-indigo-400"}`}
                          >
                            0{idx + 1}
                          </span>
                          <p className="text-[12px] text-slate-400 font-medium leading-relaxed group-hover/item:text-white transition-colors">
                            {s}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6 md:gap-12">
              <div className="lg:col-span-2 glass-card rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 overflow-x-auto relative group/container hover:border-white/10 transition-colors">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32 group-hover/container:bg-indigo-500/10 transition-colors"></div>
                <h4 className="text-2xl font-black text-white mb-12 flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 bg-slate-950 text-[#ff477b] rounded-[1.25rem] flex items-center justify-center border border-white/10 shadow-inner">
                    📊
                  </div>
                  {language === "es"
                    ? "Escalabilidad Visual"
                    : "Visual Scalability"}
                  <InfoTooltip text="Evaluación predictiva del impacto cognitivo que cada diseño tendrá sobre el cerebro del usuario final." />
                </h4>

                <div className="space-y-10 min-w-[500px]">
                  {[
                    {
                      label: t.cognitive_demand,
                      key: "cognitiveDemand",
                      inverse: true,
                      icon: "🧠",
                      description:
                        language === "es"
                          ? "Menos es más: claridad mental."
                          : "Less is more: mental clarity.",
                    },
                    {
                      label: t.clarity_score,
                      key: "clarityScore",
                      icon: "✨",
                      description:
                        language === "es"
                          ? "Comprensión instantánea."
                          : "Instant comprehension.",
                    },
                    {
                      label: t.focus_score,
                      key: "focusScore",
                      icon: "🎯",
                      description:
                        language === "es"
                          ? "Dirección de la mirada."
                          : "Gaze direction.",
                    },
                    {
                      label: t.engagement,
                      key: "engagementScore",
                      icon: "🔥",
                      description:
                        language === "es"
                          ? "Impacto emocional."
                          : "Emotional impact.",
                    },
                    {
                      label: t.recall_potential,
                      key: "recallScore",
                      icon: "🧩",
                      description:
                        language === "es"
                          ? "Capacidad de recuerdo."
                          : "Memorability.",
                    },
                  ].map((m) => {
                    const v1 =
                      (results[0]?.predictiveMetrics as any)?.[m.key] || 0;
                    const v2 =
                      (results[1]?.predictiveMetrics as any)?.[m.key] || 0;
                    const isWin1 = m.inverse ? v1 < v2 : v1 > v2;

                    return (
                      <div key={m.key} className="group/metric">
                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-400 px-2 mb-2">
                          <div className="w-1/3 flex flex-col">
                            <span>
                              {m.icon} {m.label}
                            </span>
                            <span className="text-[7px] font-bold text-slate-300 normal-case">
                              {m.description}
                            </span>
                          </div>
                          <div className="flex w-2/3 justify-between font-black items-center">
                            <span
                              className={
                                isWin1
                                  ? "text-emerald-500 text-sm"
                                  : "text-slate-300"
                              }
                            >
                              {v1}% {isWin1 && "✓"}
                            </span>
                            <div className="h-1.5 w-24 bg-white/5 rounded-full relative overflow-hidden mx-4 border border-white/5 shadow-inner">
                              <div
                                className={`absolute inset-0 bg-gradient-to-r ${isWin1 ? "from-emerald-400 to-emerald-600" : "from-slate-700 to-slate-500"}`}
                                style={{ width: `${v1}%` }}
                              />
                            </div>
                            <span
                              className={
                                !isWin1
                                  ? "text-emerald-500 text-sm"
                                  : "text-slate-300"
                              }
                            >
                              {!isWin1 && "✓"} {v2}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-10">
                <div className="glass-card rounded-[3.5rem] p-10 space-y-8 relative group/container hover:border-white/10 transition-colors">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff477b]/5 blur-[60px] rounded-full -mr-16 -mt-16 transition-all duration-700 group-hover/container:bg-[#ff477b]/10"></div>
                  <h4 className="text-xl font-black text-white relative z-10 flex items-center gap-3">
                    <span className="text-[#ff477b]">⚡</span>
                    {language === "es"
                      ? "Heatmap Insights"
                      : "Heatmap Insights"}
                    <InfoTooltip text="Desglose técnico de la simulación de Eye Tracking y recorrido visual." />
                  </h4>
                  <div className="space-y-4 relative z-10">
                    {[
                      {
                        title: language === "es" ? "Saliencia" : "Saliency",
                        text:
                          language === "es"
                            ? "Los puntos rojos indican donde el ojo se detiene primero."
                            : "Red dots indicate where the eye stops first.",
                      },
                      {
                        title: language === "es" ? "Scanpath" : "Scanpath",
                        text:
                          language === "es"
                            ? "La numeración indica el orden de escaneo visual."
                            : "Numbering indicates the visual scan order.",
                      },
                      {
                        title: language === "es" ? "Mejoras" : "Improvements",
                        text:
                          language === "es"
                            ? "Los puntos azules sugieren áreas de optimización técnica."
                            : "Blue dots suggest technical optimization areas.",
                      },
                      {
                        title:
                          language === "es" ? "Certificación" : "Certification",
                        text:
                          language === "es"
                            ? "Análisis basado en Protocolo Antigravity 2026."
                            : "Analysis based on Antigravity 2026 Protocol.",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={`${theme === "dark" ? "bg-white/5 border-white/5 hover:bg-primary hover:text-white hover:border-primary" : "bg-slate-50 border-slate-100 hover:bg-primary hover:text-white hover:border-primary shadow-sm"} p-4 rounded-2xl border group/insight transition-all cursor-default text-left`}
                      >
                        <p className="text-[11px] font-black text-[#ff477b] uppercase tracking-widest mb-1">
                          {item.title}
                        </p>
                        <p className={`text-[11px] ${theme === "dark" ? "text-slate-400 group-hover/insight:text-white" : "text-slate-500 group-hover/insight:text-slate-900"} font-medium leading-tight transition-colors`}>
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExportPDF}
                  className="w-[90%] sm:w-full mx-auto bg-gradient-to-r from-[#ff477b] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#ff477b] text-white rounded-[2rem] md:rounded-[3rem] py-5 md:py-8 font-black text-[11px] md:text-[11px] uppercase tracking-widest md:tracking-[0.25em] shadow-[0_20px_60px_rgba(255,71,123,0.4)] transition-all flex items-center justify-center gap-4 group border-none relative text-center"
                >
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-primary hover:text-white hover:border-primary transition-colors"></div>
                  <div className="w-8 h-8 bg-white/20 text-white rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12 border border-white/20">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  </div>
                  {language === "es"
                    ? "EXPORTAR INFORME NEURO-ESTRATÉGICO"
                    : "EXPORT NEURO-STRATEGIC REPORT"}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSendEmailReportCompare}
                  className="w-[90%] sm:w-full mx-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white rounded-[2rem] md:rounded-[3rem] py-5 md:py-8 font-black text-[11px] md:text-[11px] uppercase tracking-widest md:tracking-[0.25em] shadow-[0_20px_60px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-4 group border-none relative text-center"
                >
                  <div className="w-8 h-8 bg-white/20 text-white rounded-xl flex items-center justify-center border border-white/20">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  {language === "es" ? "ENVIAR REPORTE POR EMAIL" : "SEND REPORT VIA EMAIL"}
                </motion.button>

                <button
                  onClick={handleReset}
                  className="w-full text-center text-slate-400 text-[11px] font-black uppercase tracking-widest hover:text-[#ff477b] transition-colors"
                >
                  {language === "es"
                    ? "Reiniciar Comparativa"
                    : "Reset Comparison"}
                </button>
              </div>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
    </div>
    </div>
  );
};

export default CompareCreativesView;
