import { buildAbsoluteUrl } from "../utils/apiConfig";
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auditAdVideo } from "../services/geminiService";
import { VideoAnalysisResult, Language } from "../types";
import { TRANSLATIONS } from "../constants";
import { authService } from "../services/authService";
// import { generateGoogleStylePDF } from "../utils/exportUtils"; // Removed for dynamic import optimization
import { martechService } from "../services/martechService";
import { Badge } from "./ui/Badge";
import { InfoTooltip } from "./ui/InfoTooltip";
import ResultSkeleton from "./ui/ResultSkeleton";
import { AdminDiagnosticPanel } from "./ui/AdminDiagnosticPanel";
import { FeedbackWidget } from "./ui/FeedbackWidget";
import { useTutorial } from "../hooks/useTutorial";
import TutorialBubble, { TutorialTrigger } from "./ui/TutorialBubble";
import { Mail, Download, FileVideo, Upload, X, Zap, CheckCircle2, Sparkles, Wand2 } from "lucide-react";
import PlatformGauge from "./ui/PlatformGauge";
import { animateImageWithVeo } from "../services/ai/mediaGenerationService";
import Toast, { ToastData } from "./Toast";
import { AdsPlatformPills } from "./ui/AdsPlatformPills";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine
} from "recharts";

interface VideoAuditViewProps {
  language: Language;
  theme: "dark" | "light";
  restoredAudit?: VideoAnalysisResult | null;
  onSaveAudit?: (res: VideoAnalysisResult, q: any) => void;
  prefilledUrl?: string;
}

const VideoAuditView: React.FC<VideoAuditViewProps> = ({
  language,
  theme,
  restoredAudit,
  onSaveAudit,
  prefilledUrl,
}) => {
  const t = TRANSLATIONS[language];
  const [file, setFile] = useState<File | Blob | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    size: string;
    type: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditStep, setAuditStep] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const { steps: tutorialSteps, currentStep, isVisible: isTutorialVisible, isDismissed: isTutorialDismissed, next: nextTutorialStep, prev: prevTutorialStep, goTo: goToTutorialStep, dismiss: dismissTutorial, restart: restartTutorial } = useTutorial('video-audit', language);
  
  // Sprint 1 — Video Feature ① "Regenerar Escena"
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [regeneratedVideos, setRegeneratedVideos] = useState<Record<number, string>>({});
  const [regProgress, setRegProgress] = useState<{ attempt: number; max: number; stage: string } | null>(null);

  // New Context Fields
  const [marketingObjective, setMarketingObjective] =
    useState<string>("Conversion");
  const [adPlatform, setAdPlatform] = useState<string>(
    "Universal / Multiplatform",
  );
  const user = authService.getCurrentUser();

  const isProfileComplete = !!(
    user?.brandProfile?.brandName &&
    user?.brandProfile?.industry &&
    user?.brandProfile?.valueProposition &&
    user?.brandProfile?.targetAudience &&
    user?.brandProfile?.toneOfVoice &&
    user?.brandProfile?.keyMessages &&
    (user?.brandProfile?.keyMessages?.length || 0) > 0 &&
    user?.brandProfile?.brandColors &&
    user?.brandProfile?.typography &&
    user?.brandProfile?.complianceRules
  );
  const isAgency = user?.subscription?.plan === "Agency";
  const isBrandSafetyVerified = isProfileComplete;

  React.useEffect(() => {
    if (restoredAudit) {
      setResult(restoredAudit);
      setFile(null); // No local file available when restored
    }
  }, [restoredAudit]);

  React.useEffect(() => {
    if (prefilledUrl) {
      const fetchMedia = async () => {
        try {
          const response = await fetch(prefilledUrl);
          const blob = await response.blob();
          setFile(blob);
          setFileInfo({
            name: "Prefilled Video",
            size: (blob.size / 1024 / 1024).toFixed(1) + " MB",
            type: blob.type.split("/")[1].toUpperCase(),
          });
          setResult(null);
        } catch (e) {
          console.error("Error fetching prefilled video:", e);
          setError(language === "es" 
            ? "No se pudo cargar el video automáticamente por restricciones de seguridad (CORS). Intente descargarlo y subirlo." 
            : "Could not load video automatically due to security restrictions (CORS). Try downloading and uploading it.");
        }
      };
      fetchMedia();
    }
  }, [prefilledUrl, language]);

  const onFileChange = (e: any) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileInfo({
        name: selectedFile.name,
        size: (selectedFile.size / 1024 / 1024).toFixed(1) + " MB",
        type: selectedFile.type.split("/")[1].toUpperCase(),
      });
      setResult(null);
    }
  };

  // Helper to extract frame
  const extractVideoFrame = (
    videoFile: File | Blob,
    time: number,
  ): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(videoFile);
      video.currentTime = time;
      video.muted = true;
      video.playsInline = true;

      const onUnload = () => {
        URL.revokeObjectURL(video.src);
      };

      video.onloadedmetadata = () => {
        if (video.duration < time) video.currentTime = video.duration / 2;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            onUnload();
            resolve(dataUrl);
          } else {
            onUnload();
            resolve("");
          }
        } catch (e) {
          console.warn("Frame extract error", e);
          onUnload();
          resolve("");
        }
      };

      video.onerror = () => {
        onUnload();
        resolve("");
      };
    });
  };

  const handleReset = () => {
    setFile(null);
    setFileInfo(null);
    setResult(null);
    setError(null);
    setMarketingObjective("Conversion");
    setAdPlatform("Universal");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const AUDIT_STEPS_VIDEO = [
    language === 'es' ? 'Extrayendo frames...' : 'Extracting frames...',
    language === 'es' ? 'Análisis de retención...' : 'Retention analysis...',
    language === 'es' ? 'Mapeo de atención...' : 'Attention mapping...',
    language === 'es' ? 'Generando veredicto...' : 'Generating verdict...',
  ];

  const startAuditProgress = () => {
    setAuditProgress(0);
    setAuditStep(0);
    let p = 0;
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      p += p < 10 ? 4 : p < 30 ? 2.5 : p < 55 ? 1.5 : p < 80 ? 0.8 : 0.2;
      const capped = Math.min(Math.round(p), 95);
      setAuditProgress(capped);
      setAuditStep(capped < 25 ? 0 : capped < 55 ? 1 : capped < 80 ? 2 : 3);
      if (capped >= 95) clearInterval(progressIntervalRef.current!);
    }, 220);
  };

  const completeAuditProgress = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setAuditProgress(100);
    setAuditStep(3);
    setTimeout(() => { setAuditProgress(0); setAuditStep(0); }, 800);
  };

  // Sprint 1 — Feature ① "Regenerar Escena" handler
  const handleRegenerateScene = async (idx: number, timestamp: string, description: string) => {
    if (!file || !result) return;
    const plan = user?.subscription?.plan || "Starter";
    const isAgencyOrSuperAdmin = user?.role === 'superAdmin' || plan === 'Agency';
    
    if (!isAgencyOrSuperAdmin) {
      setToast({
        title: language === "es" ? "Requiere Plan Agencia" : "Agency Plan Required",
        message: language === "es"
          ? "Esta función avanzada es exclusiva del Plan Agencia. ¡Actualiza para activarla!"
          : "This advanced feature is exclusive to the Agency Plan. Upgrade now to activate!",
        type: "warning",
      });
      return;
    }

    setRegeneratingIdx(idx);
    try {
      // 1. Convert timestamp (e.g. "0:04") to seconds
      const parts = timestamp.split(':').map(Number);
      const seconds = parts.length > 1 ? parts[0] * 60 + parts[1] : parts[0];
      
      // 2. Extract frame at that time
      const frameBase64Full = await extractVideoFrame(file, seconds);
      const base64 = frameBase64Full.replace(/^data:image\/[^;]+;base64,/, "");

      // 3. Generate new video via Veo 3.1 (animateImageWithVeo)
      const prompt = `Premium advertisement scene. ${description}. Professional cinematic lighting, high-end commercial quality, smooth motion. Following brand tone: ${user?.brandProfile?.toneOfVoice || "professional"}.`;
      
      const videoUrl = await animateImageWithVeo(base64, prompt, "9:16", (attempt, max, stage) => {
        setRegProgress({ attempt, max, stage: stage || 'Generating...' });
      });
      
      if (videoUrl) {
         setRegeneratedVideos(prev => ({ ...prev, [idx]: videoUrl }));
         authService.trackTokenUsage(150, "Regenerar Escena con Veo 3.1", undefined, 'image');
         setToast({
           title: language === "es" ? "✨ Escena Regenerada" : "✨ Scene Regenerated",
           message: language === "es" ? "Veo 3.1 ha creado una nueva versión cinemática de este frame." : "Veo 3.1 has created a new cinematic version of this frame.",
           type: "success",
         });
      }
    } catch (err: any) {
      setToast({
        title: language === "es" ? "Error de regeneración" : "Regeneration Error",
        message: err?.message || "Error en Veo 3.1 Engine.",
        type: "error",
      });
    } finally {
      setRegeneratingIdx(null);
      setRegProgress(null);
    }
  };

  const handleAudit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    startAuditProgress();

    try {
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          resolve(true);
        };
      });

      const duration = video.duration;

      // Check limits using unified service logic
      if (user) {
        const check = authService.checkPlanLimits(user, 'text'); // Video uses 'text' or we can add 'video' - using text as a proxy for premium queries
        if (!check.allowed) {
          setError(check.reason);
          setLoading(false);
          return;
        }
      }

      const plan = user?.subscription?.plan || "Starter";
      const isAdminUser = user?.role === 'superAdmin' || user?.role === 'admin';
      const maxDuration = isAdminUser
        ? Infinity
        : plan === "Agency" ? 1200 : plan === "Growth" ? 240 : 0;

      if (duration > maxDuration) {
        const limitText =
          maxDuration === 0
            ? "no incluye análisis de video"
            : `máximo ${maxDuration / 60} minutos`;
        setError(
          language === "es"
            ? `Tu plan (${plan}) ${limitText}. Este video dura ${Math.floor(duration / 60)}:${Math.floor(
                duration % 60,
              )
                .toString()
                .padStart(2, "0")}.`
            : `Your plan (${plan}) ${limitText}. This video is ${Math.floor(duration / 60)}:${Math.floor(
                duration % 60,
              )
                .toString()
                .padStart(2, "0")} long.`,
        );
        setLoading(false);
        return;
      }

      console.log("Extracting 7 strategic frames and auditing with context...");
      const f1 = await extractVideoFrame(file, 0.5);
      const f2 = await extractVideoFrame(file, Math.min(2, duration / 5));
      const f3 = await extractVideoFrame(file, Math.min(5, duration / 3.5));
      const f4 = await extractVideoFrame(file, duration / 2.5);
      const f5 = await extractVideoFrame(file, duration / 1.8);
      const f6 = await extractVideoFrame(file, duration / 1.3);
      const f7 = await extractVideoFrame(file, duration - 1);
      // Keep original data URLs for display, strip prefix only for API
      const stripDataUrl = (dataUrl: string) => {
        if (dataUrl.startsWith('data:')) {
          const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
          return match ? match[1] : dataUrl;
        }
        return dataUrl;
      };
      const rawFrames = [f1, f2, f3, f4, f5, f6, f7].filter((f) => f.length > 100);
      const apiFrames = rawFrames.map(stripDataUrl);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          console.log("File loaded. Starting AI Video Audit...");
          const base64 = (reader.result as string).split(",")[1];
          const analysis = await auditAdVideo(
            base64,
            (file as File).type,
            language,
            apiFrames,
            {
              objective: marketingObjective,
              platform: adPlatform,
              brand: isBrandSafetyVerified ? user?.brandProfile : undefined,
            },
          );

          console.log("Analysis completed successfully.");
          // Map extracted frames (with data URL prefix) back for display
          const enrichedAnalysis = {
            ...analysis,
            keyframes: (analysis.keyframes || []).map((kf, i) => ({
              ...kf,
              imageUrl: kf.imageUrl || (i < rawFrames.length ? rawFrames[i] : undefined)
            }))
          };
          setResult(enrichedAnalysis);
          authService.trackTokenUsage(300, `Auditoría Video: ${(file as File).name || "video"}`, undefined, 'text');
          martechService.trackEngagement('run_audit', {
            type: 'video_audit',
            objective: marketingObjective,
            platform: adPlatform,
            fileName: (file as File).name || "video"
          });
          onSaveAudit?.(enrichedAnalysis, {
            fileName: (file as File).name || "video",
            platform: adPlatform,
          });
          completeAuditProgress();
        } catch (err: any) {
          console.error("Error in Video Audit flow:", err);
          completeAuditProgress();
          setError(
            language === "es"
              ? "Error en el análisis de video. El archivo puede ser demasiado grande o no compatible."
              : "Video analysis error. The file may be too large or incompatible.",
          );
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        console.error("FileReader error");
        completeAuditProgress();
        setError("Error al leer el archivo.");
        setLoading(false);
      };
    } catch (err: any) {
      console.error(err);
      const msg = language === "es"
        ? "Error en el análisis. Intente nuevamente."
        : "Analysis error. Please try again.";
      setError(msg);
      setToast({
        title: language === "es" ? "Error de Análisis" : "Analysis Error",
        message: msg,
        type: "error"
      });
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    try {
      console.log("Iniciando descarga de PDF (Video)...");
      const baseFileName = `Auditoria_Video_Insitu_${language === "es" ? "ES" : "EN"}_${new Date().toISOString().split("T")[0]}.pdf`;
      
      const cleanResult = {
        ...result,
        overallRating: result.overallRating || "0/10"
      };

      const { generateGoogleStylePDF } = await import("../utils/exportUtils");
      await generateGoogleStylePDF("video", cleanResult, baseFileName, language, {
        user,
        action: "download",
        context: {
          objective: marketingObjective,
          platform: adPlatform
        }
      });
      
      setToast({
        title: language === "es" ? "Descarga Iniciada" : "Download Started",
        message: language === "es" ? "Tu reporte se está descargando." : "Your report is downloading.",
        type: "success"
      });
      console.log("PDF generado correctamente.");
    } catch (error) {
      console.error("Error al generar PDF de Video:", error);
      setToast({ 
        title: language === "es" ? "Error de Exportación" : "Export Error",
        message: language === "es" ? "No se pudo generar el PDF." : "Could not generate PDF.", 
        type: "error" 
      }); 
    }
  };

  const handleSendEmailReport = async () => {
    if (!result) return;
    const emailStr = user?.email || "";
    if (!emailStr) {
      setToast({
        title: language === "es" ? "Inicia Sesión" : "Sign In",
        message: language === "es" ? "Debes estar registrado para recibir el reporte por email." : "You must be signed in to receive the report by email.",
        type: "warning"
      });
      return;
    }
    setIsSendingEmail(true);
    try {
      const { generateGoogleStylePDF } = await import("../utils/exportUtils");
      const baseFileName = `Auditoria_Video_Insitu_${language === "es" ? "ES" : "EN"}_${new Date().toISOString().split("T")[0]}.pdf`;
      const cleanResult = { ...result, overallRating: result.overallRating || "0/10" };
      const pdfBase64 = await generateGoogleStylePDF("video", cleanResult, baseFileName, language, { 
        user, 
        action: "return",
        context: { objective: marketingObjective, platform: adPlatform }
      }) as string;
      if (!pdfBase64) throw new Error("PDF generation returned empty");
      await fetch(buildAbsoluteUrl('/.netlify/functions/api-send-report'), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": user?.id || ""
        },
        body: JSON.stringify({
          email: emailStr,
          pdfBase64,
          fileName: baseFileName,
          domain: adPlatform || "Auditoría de Video",
          reportType: "Auditoría de Video IA",
          language
        })
      });
      setToast({
        title: language === "es" ? "Email Enviado" : "Email Sent",
        message: language === "es" ? `Reporte enviado a ${emailStr}` : `Report sent to ${emailStr}`,
        type: "success"
      });
    } catch (err) {
      console.error("[EmailReport] Error:", err);
      setToast({ 
        title: language === "es" ? "Error de Envío" : "Send Error",
        message: language === "es" ? "No se pudo enviar el email." : "Could not send email.", 
        type: "error" 
      }); 
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className={`min-h-screen selection:bg-[#ff477b]/30 selection:text-white transition-colors duration-500 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
      {/* Notifications */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      {/* Premium Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#ff477b]/10 blur-[120px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40px] md:text-[80px] lg:text-[180px] font-black text-white/[0.02] uppercase tracking-[0.2em] pointer-events-none select-none whitespace-nowrap">NEURO-VIDEO</div>
        <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[40px] md:text-[80px] lg:text-[180px] font-black text-white/[0.02] uppercase tracking-[0.2em] pointer-events-none select-none whitespace-nowrap animation-delay-1000">PREDICTIVE</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 space-y-16 relative z-10">
        <div className={`text-center space-y-8 relative z-10 ${theme === "dark" ? "text-white" : "text-slate-950"}`}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Badge label="Neuro-Video Intelligence v3.1" />
            <TutorialTrigger isDismissed={isTutorialDismissed} isVisible={isTutorialVisible} language={language} onShow={() => nextTutorialStep()} onRestart={restartTutorial} />
          </div>

          {/* Status indicator and instructions */}
          {!result && !loading && file && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mb-8 p-6 ${theme === "dark" ? "bg-indigo-500/10 border-indigo-500/20" : "bg-indigo-50 border-indigo-200"} border rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl relative z-20 max-w-4xl mx-auto`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 ${theme === "dark" ? "bg-indigo-500/20" : "bg-indigo-200"} rounded-2xl flex items-center justify-center`}>
                  <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
                </div>
                <div className="text-left">
                  <h3 className={`text-sm font-black ${theme === "dark" ? "text-white" : "text-indigo-900"} uppercase tracking-widest`}>
                    {language === "es" ? "ESTADO: LISTO PARA AUDITORÍA" : "STATUS: READY FOR AUDIT"}
                  </h3>
                  <p className={`text-[11px] ${theme === "dark" ? "text-slate-400" : "text-indigo-700"} font-medium`}>
                    {language === "es" 
                      ? "El video se ha cargado. Haz clic en el botón de abajo para iniciar el análisis neuronal." 
                      : "The video has been loaded. Click the button below to initiate the neural analysis."}
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 ${theme === "dark" ? "bg-slate-900/50" : "bg-white"} rounded-full border border-white/5`}>
                <span className={`text-[11px] font-black ${theme === "dark" ? "text-slate-500" : "text-indigo-400"} uppercase tracking-widest`}>
                  {language === "es" ? "Análisis Manual" : "Manual Analysis"}
                </span>
              </div>
            </motion.div>
          )}

          <motion.h2
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1 }}
            className={`text-4xl md:text-7xl lg:text-[10rem] font-black tracking-tighter leading-none uppercase italic drop-shadow-2xl ${theme === "dark" ? "text-white" : "text-slate-950"}`}
          >
            MOTION <br />
            <span className="text-gradient-magenta inline-block transform -skew-x-6">
              {t.video_audit!}
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={`${theme === "dark" ? "text-slate-400" : "text-slate-500"} font-medium text-xl max-w-3xl mx-auto leading-relaxed italic`}
          >
            {language === "es"
              ? "Análisis narrativo y atención neuronal por fotograma para contenidos dinámicos de alto impacto."
              : "Narrative analysis and neuronal attention mapping for high-impact dynamic content."}
          </motion.p>
        </div>

        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 pb-12 w-full relative z-10 text-left"
          >
            {/* Brand DNA Section */}
            {user?.brandProfile?.brandName && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`md:col-span-2 ${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] flex items-center justify-between group transition-all hover:neon-magenta-glow relative`}
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#ff477b]/5 blur-[60px] rounded-full -mr-20 -mt-20 group-hover:bg-[#ff477b]/10 transition-colors"></div>
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center border border-white/10 group-hover:border-[#ff477b]/40 shadow-2xl transition-all duration-500">
                    {user.brandProfile.isotypeUrl ? (
                      <img
                        src={user.brandProfile.isotypeUrl}
                        className="w-12 h-12 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                        alt="Brand Isotype"
                      />
                    ) : (
                      <span className="text-[#ff477b] text-3xl font-black italic">
                        {user.brandProfile.brandName[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-[#ff477b] uppercase tracking-[0.4em] leading-none mb-2.5">
                      Brand DNA Active
                    </p>
                    <p className={`text-3xl font-black ${theme === "dark" ? "text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-400" : "text-slate-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-900 group-hover:to-slate-500"} transition-all tracking-tighter`}>
                      {user.brandProfile.brandName}
                    </p>
                  </div>
                </div>
                <div className="text-right bg-white/5 px-10 py-5 rounded-[2.5rem] border border-white/5 relative z-10 transition-all group-hover:border-white/10 group-hover:bg-primary hover:text-white hover:border-primary shadow-sm">
                  {isBrandSafetyVerified && (
                    <div className="flex items-center justify-end gap-1 mb-2">
                      <svg
                        className="w-3 h-3 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                        Brand Safety Verified
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 leading-none">
                    Sync Status
                  </p>
                  <div className="flex items-center gap-3 justify-end">
                    <span
                      className={`w-3 h-3 rounded-full ${user.brandProfile.adherenceLevel === "Strict" ? "bg-rose-500 animate-pulse shadow-[0_0_20px_#f43f5e]" : "bg-emerald-500 shadow-[0_0_20px_#10b981]"}`}
                    ></span>
                    <p
                      className={`text-[13px] font-black uppercase tracking-[0.2em] ${user.brandProfile.adherenceLevel === "Strict" ? "text-rose-400" : "text-emerald-400"}`}
                    >
                      {user.brandProfile.adherenceLevel}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Campaign Objective Selector */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} flex flex-col justify-between p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] space-y-8 relative group`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff477b]/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-[#ff477b]/10 transition-colors"></div>
              <label className="text-[11px] font-black text-[#ff477b] uppercase tracking-[0.4em] px-4 block relative z-10">
                {language === "es" ? "Estrategia" : "Strategy"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 w-full mb-auto pb-4">
                {[
                  {
                    id: "Awareness",
                    label: language === "es" ? "Reconocimiento" : "Branding",
                    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                  },
                  {
                    id: "Consideration",
                    label: language === "es" ? "Interés" : "Interest",
                    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
                  },
                  {
                    id: "Conversion",
                    label: language === "es" ? "Crecimiento" : "Growth",
                    icon: "M13 10V3L4 14h7v7l9-11h-7z",
                  },
                  {
                    id: "Loyalty",
                    label: language === "es" ? "Fidelización" : "Loyalty",
                    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
                  },
                ].map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setMarketingObjective(item.id as any)}
                    className={`flex flex-col items-center justify-center p-4 md:p-6 w-full rounded-[1.5rem] md:rounded-[2.5rem] transition-all border group/btn flex-1 ${
                      marketingObjective === item.id
                        ? theme === "dark" 
                          ? "bg-white border-white shadow-[0_20px_50px_-10px_rgba(255,255,255,0.2)]" 
                          : "bg-slate-900 border-slate-900 shadow-[0_20px_50px_-10px_rgba(15,23,42,0.2)]"
                        : theme === "dark"
                          ? "bg-white/5 border-white/5 text-slate-500 hover:border-white/20 hover:bg-primary hover:text-white hover:border-primary"
                          : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-primary hover:text-white hover:border-primary"
                    }`}
                  >
                    <svg
                      className={`w-7 h-7 mb-4 transition-colors ${marketingObjective === item.id ? "text-[#ff477b]" : "text-white/10 group-hover/btn:text-white/40"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d={item.icon}
                      />
                    </svg>
                    <span
                      className={`text-[11px] font-black uppercase tracking-widest ${marketingObjective === item.id ? (theme === "dark" ? "text-slate-950" : "text-white") : ""}`}
                    >
                      {item.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Video Platform Selector — Pill Scrollbar */}
            <motion.div
              id="platform-selector"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} flex flex-col justify-between p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] space-y-4 relative group`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors"></div>
              <div className="relative z-10">
                <AdsPlatformPills
                  value={adPlatform}
                  onChange={setAdPlatform}
                  theme={theme}
                  language={language}
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {!result && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-w-5xl mx-auto relative"
          >
            {/* Premium Video Upload Card */}
            <motion.div
              id="upload-container"
              className={`relative rounded-[3.5rem] border-2 transition-all duration-500 overflow-hidden ${
                isDragOver
                  ? 'border-[#ff477b] shadow-[0_0_60px_rgba(255,71,123,0.25)] bg-[#ff477b]/5'
                  : fileInfo
                  ? (theme === 'dark' ? 'border-white/10 bg-white/5 backdrop-blur-2xl' : 'border-slate-200 bg-white shadow-2xl')
                  : (theme === 'dark' ? 'border-white/10 bg-white/5 backdrop-blur-2xl hover:border-[#ff477b]/40 hover:shadow-[0_0_40px_rgba(255,71,123,0.1)]' : 'border-slate-200 bg-white shadow-xl hover:border-[#ff477b]/30')
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) onFileChange({ target: { files: [dropped] } } as any);
              }}
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff477b]/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full -ml-48 -mb-48 pointer-events-none" />

              <div className="p-10 md:p-16 relative z-10">
                {!fileInfo ? (
                  <label className="cursor-pointer flex flex-col items-center gap-8">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className={`relative w-36 h-36 ${theme === 'dark' ? 'bg-slate-950/80 border-white/10' : 'bg-white border-slate-200'} rounded-[2.5rem] flex items-center justify-center border-2 shadow-2xl`}
                    >
                      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#ff477b]/10 via-transparent to-indigo-500/10" />
                      <FileVideo className={`w-14 h-14 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                      <div className="absolute -inset-1 rounded-[2.7rem] border border-[#ff477b]/20 animate-pulse" />
                    </motion.div>

                    <div className="text-center space-y-3">
                      <p className={`text-2xl font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {language === 'es' ? 'Cargar Video Creativo' : 'Load Creative Video'}
                      </p>
                      <p className={`text-[11px] font-bold uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        {language === 'es' ? 'Arrastra o haz clic · MP4 MOV WEBM · Max 50MB' : 'Drag or click · MP4 MOV WEBM · Max 50MB'}
                      </p>
                    </div>

                    <div className="relative group/cta">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#ff477b] to-indigo-600 rounded-full blur-lg opacity-40 group-hover/cta:opacity-70 transition-opacity" />
                      <span className="relative flex items-center gap-3 bg-gradient-to-r from-[#ff477b] to-indigo-600 text-white px-12 py-5 rounded-full font-black text-xs uppercase tracking-[0.25em] shadow-2xl hover:brightness-110 active:scale-95 transition-all">
                        <Upload className="w-4 h-4" />
                        {language === 'es' ? 'Seleccionar Video' : 'Select Video'}
                      </span>
                    </div>

                    <input type="file" className="hidden" accept="video/*" onChange={onFileChange} />
                  </label>
                ) : (
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Video icon + meta */}
                    <div className={`w-52 h-40 ${theme === 'dark' ? 'bg-slate-950/60 border-white/10' : 'bg-slate-100 border-slate-200'} rounded-[2rem] flex items-center justify-center border-2 flex-shrink-0 relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-[#ff477b]/10 to-indigo-500/10" />
                      <FileVideo className="w-16 h-16 text-[#ff477b]/60" />
                    </div>

                    <div className="flex-1 flex flex-col gap-6 w-full">
                      <div className="flex flex-wrap gap-2">
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${
                          theme === 'dark' ? 'bg-white/5 border border-white/10 text-slate-400' : 'bg-slate-100 border border-slate-200 text-slate-500'
                        }`}>
                          <FileVideo className="w-3 h-3" /> {fileInfo.name.length > 24 ? fileInfo.name.slice(0, 24) + '...' : fileInfo.name}
                        </span>
                        <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-400">{fileInfo.type}</span>
                        <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[11px] font-black uppercase tracking-widest text-emerald-400">{fileInfo.size}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <div className="relative group/cta flex-1">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ff477b] to-indigo-600 rounded-[2rem] blur opacity-50 group-hover/cta:opacity-80 transition-opacity" />
                          <button
                            onClick={handleAudit}
                            disabled={loading}
                            className="relative w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#ff477b] to-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-70"
                          >
                            {loading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                                <span>{language === 'es' ? 'Analizando...' : 'Analyzing...'}</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                <span>{language === 'es' ? 'Ejecutar Auditoría' : 'Run Audit'}</span>
                              </>
                            )}
                          </button>
                        </div>
                        <button
                          onClick={() => { setFile(null); setFileInfo(null); setResult(null); }}
                          className={`flex items-center justify-center gap-2 px-6 py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-widest border transition-all ${
                            theme === 'dark' ? 'border-white/10 text-slate-500 hover:border-rose-500/30 hover:text-rose-400 hover:bg-rose-500/5' : 'border-slate-200 text-slate-400 hover:border-rose-300 hover:text-rose-500'
                          }`}
                        >
                          <X className="w-4 h-4" />
                          {language === 'es' ? 'Descartar' : 'Discard'}
                        </button>
                      </div>

                      {!loading && (
                        <span className={`text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full border w-fit ${
                          theme === 'dark' ? 'border-white/5 text-slate-600' : 'border-slate-200 text-slate-400 bg-slate-50'
                        }`}>
                          {language === 'es' ? '⚡ 300 tokens' : '⚡ 300 tokens'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Animated progress popup */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] w-[92vw] max-w-md"
            >
              <div className="bg-[#0a0f1e]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#ff477b]/20 flex items-center justify-center flex-shrink-0">
                    <FileVideo className="w-5 h-5 text-[#ff477b] animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Neuro-Video Scanner</p>
                    <p className="text-[11px] text-slate-500 font-medium">{AUDIT_STEPS_VIDEO[auditStep]}</p>
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
                  {AUDIT_STEPS_VIDEO.map((_, i) => (
                    <div key={i} className={`flex-1 flex items-center gap-1.5 transition-all ${
                      i < auditStep ? 'opacity-100' : i === auditStep ? 'opacity-100' : 'opacity-30'
                    }`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        i < auditStep ? 'bg-emerald-500' : i === auditStep ? 'bg-[#ff477b] animate-pulse' : 'bg-white/10'
                      }`}>
                        {i < auditStep ? <CheckCircle2 className="w-3 h-3 text-white" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/60" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto bg-rose-500/10 border border-rose-500/20 p-6 rounded-[2rem] text-rose-400 font-black text-center text-xs uppercase tracking-widest backdrop-blur-2xl flex items-center justify-center gap-3 shadow-[inset_0_0_30px_rgba(244,63,94,0.05)]"
          >
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {loading && !result && (
          <div className="mt-12">
            <ResultSkeleton />
          </div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12 pb-24"
          >
            {/* Strategic Framework Badge Layer */}
            <div className={`flex flex-wrap items-center gap-6 ${theme === "dark" ? "glass-panel" : "bg-white border border-slate-200 shadow-xl"} px-10 py-6 rounded-[3rem] relative group`}>
              <div className={`absolute inset-0 bg-gradient-to-r ${theme === "dark" ? "from-[#ff477b]/5" : "from-rose-50/50"} to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}></div>
              <div className="flex items-center gap-4 pr-8 border-r border-white/10">
                <div className="p-3 bg-[#ff477b]/10 rounded-2xl border border-[#ff477b]/20">
                  <svg
                    className="w-5 h-5 text-[#ff477b]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  Analysis Intelligence
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={`px-6 py-3 ${theme === "dark" ? "bg-slate-950/60 border-[#ff477b]/30 text-white" : "bg-slate-50 border-rose-200 text-slate-900"} backdrop-blur-xl border rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-inner`}
                >
                  <span className="w-2 h-2 bg-[#ff477b] rounded-full animate-pulse shadow-[0_0_12px_#ff477b]"></span>
                  <span className="text-slate-500">Focus:</span>
                  <span className={theme === "dark" ? "text-[#ff477b]" : "text-rose-600"}>{marketingObjective}</span>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className={`px-6 py-3 ${theme === "dark" ? "bg-slate-950/60 border-indigo-500/30 text-white" : "bg-slate-50 border-indigo-200 text-slate-900"} backdrop-blur-xl border rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-inner`}
                >
                  <span className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_12px_#6366F1]"></span>
                  <span className="text-slate-500">Platform:</span>
                  <span className={theme === "dark" ? "text-indigo-400" : "text-indigo-600"}>{adPlatform}</span>
                </motion.div>
              </div>

              <div className="flex-grow"></div>

              <div className="flex flex-wrap gap-4 mt-6 sm:mt-0 items-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReset}
                  className={`${theme === "dark" ? "bg-white/5 border-white/10 text-white hover:bg-primary/20" : "bg-white border-slate-200 text-slate-900"} border px-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 transition-all relative z-10`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {language === "es" ? "Nueva" : "New"}
                </motion.button>
                
                <motion.button
                  id="export-report"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownloadPdf}
                  className="bg-white/5 hover:bg-white/10 text-white px-8 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center gap-4 border border-white/20 shadow-2xl min-w-[180px] justify-center"
                >
                  <Download className="w-5 h-5" />
                  <span>{language === "es" ? "PDF" : "PDF"}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSendingEmail}
                  onClick={handleSendEmailReport}
                  className="bg-gradient-to-r from-primary to-indigo-600 text-white px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:shadow-[0_20px_40px_rgba(255,71,123,0.3)] transition-all flex items-center gap-4 border border-white/20 shadow-2xl relative min-w-[240px] justify-center disabled:opacity-50 group"
                >
                  {isSendingEmail ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Mail className="w-5 h-5 transition-transform group-hover:scale-110" />
                  )}
                  <span>
                    {isSendingEmail 
                      ? (language === "es" ? "ENVIANDO..." : "SENDING...")
                      : (language === "es" ? "RECIBIR POR EMAIL" : "RECEIVE BY EMAIL")}
                  </span>
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left Column: Main Analysis */}
              <div className="lg:col-span-8 space-y-12">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${theme === "dark" ? "glass-panel" : "bg-white border border-slate-200 shadow-xl"} p-6 md:p-12 rounded-[2rem] md:rounded-[4rem] relative group`}
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff477b]/5 blur-[80px] rounded-full -mr-32 -mt-32"></div>

                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h4 className={`text-[11px] font-black ${theme === "dark" ? "text-[#ff477b]" : "text-rose-600"} uppercase tracking-[0.4em] mb-3 flex items-center`}>
                        {t.executive_summary}
                        <InfoTooltip text="Evaluación profunda sobre el flujo narrativo y la capacidad de cautivar al espectador desde los primeros segundos." />
                      </h4>
                      <h3 className={`text-4xl font-black ${theme === "dark" ? "text-white" : "text-slate-950"} tracking-tighter leading-tight italic`}>
                        Neuro-Cognitive{" "}
                        <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme === "dark" ? "from-white to-slate-500" : "from-slate-900 to-slate-500"}`}>
                          Verdict
                        </span>
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="relative">
                      <div className={`absolute -left-12 top-0 bottom-0 w-1 bg-gradient-to-b from-[#ff477b] to-indigo-600 rounded-full ${theme === "dark" ? "opacity-50" : "opacity-30"}`}></div>
                      <p className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"} leading-tight tracking-tight pl-4 italic transform -skew-x-6`}>
                        {result?.executiveSummary || result?.overallRating}
                      </p>
                    </div>

                    <div className={`${theme === "dark" ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100 shadow-inner"} backdrop-blur-xl p-8 rounded-[2.5rem] border`}>
                      <p className={`${theme === "dark" ? "text-slate-400" : "text-slate-600"} text-lg font-medium leading-relaxed italic`}>
                        "{result?.narrativeCritique}"
                      </p>
                    </div>

                    {result?.descriptiveAnalysis && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8 relative"
                      >
                        <div className="absolute top-0 left-4 bottom-0 w-px bg-gradient-to-b from-indigo-500/50 to-transparent"></div>
                        <div className="pl-10">
                          <h5 className={`text-[11px] font-black ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"} uppercase tracking-widest mb-4`}>Análisis Descriptivo Premium</h5>
                          <div className={`${theme === "dark" ? "text-slate-300" : "text-slate-600"} text-sm leading-relaxed space-y-4 whitespace-pre-line`}>
                            {result.descriptiveAnalysis}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Platform-Native Retention & Clicks Chart */}
                {result?.retentionCurve && result.retentionCurve.length > 0 && (
                  <motion.div
                    id="retention-chart"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`${theme === "dark" ? "glass-panel border-white/5" : "bg-white border-slate-200 shadow-xl"} p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] relative overflow-hidden group border`}
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[80px] rounded-full -mr-32 -mt-32"></div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                      <div className="flex flex-wrap gap-3">
                        <div className={`flex items-center gap-2 ${theme === "dark" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-blue-50 border-blue-100 text-blue-600"} px-4 py-2 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.2)] border`}>
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                          <span className="text-[11px] font-black uppercase tracking-widest">Predicción de Acción</span>
                        </div>
                        <div className={`flex items-center gap-2 ${theme === "dark" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-600"} px-4 py-2 rounded-full border`}>
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-[11px] font-black uppercase tracking-widest">Predicción de Retención</span>
                        </div>
                      </div>

                      {/* Scorecard: Futuristic Animated Gauges */}
                      <div className="grid grid-cols-3 gap-4 pt-10">
                        {Object.entries(result?.scores || {}).map(([key, val], idx) => (
                          <motion.div
                            key={key}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1 * idx }}
                            className={`p-4 ${theme === "dark" ? "bg-white/3 border-white/5" : "bg-slate-50 border-slate-200 shadow-sm"} rounded-[2rem] border backdrop-blur-md flex items-center justify-center`}
                          >
                            <PlatformGauge
                              score={val as number}
                              platform={key.charAt(0).toUpperCase() + key.slice(1)}
                              size={110}
                              theme={theme}
                              animationDelay={0.4 + idx * 0.1}
                            />
                          </motion.div>
                        ))}
                      </div>

                      <div className={`flex items-center gap-4 ${theme === "dark" ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"} px-4 py-2 rounded-xl border mt-8`}>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">Comparación de video</span>
                        <div className={`w-8 h-4 ${theme === "dark" ? "bg-white/10" : "bg-slate-200"} rounded-full relative cursor-pointer group-hover:bg-blue-500/20 transition-colors`}>
                          <div className={`absolute right-0.5 top-0.5 w-3 h-3 ${theme === "dark" ? "bg-white/30" : "bg-white"} rounded-full shadow-sm`}></div>
                        </div>
                      </div>
                    </div>

                      <div className="h-[380px] w-full relative">
                      {/* Legend Labels Overlay */}
                      <div className={`absolute left-0 top-0 text-[11px] font-black uppercase tracking-widest ${theme === "dark" ? "text-blue-400" : "text-blue-600"} z-10`}>
                        Acción Predicha (Clics)
                      </div>
                      <div className={`absolute right-0 top-0 text-[11px] font-black uppercase tracking-widest ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"} z-10 text-right animate-pulse`}>
                        ✨ Momento Peak: {result.predictiveMetrics.peakAttentionTimestamp || "N/A"}
                      </div>

                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={result.retentionCurve} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                          {(() => {
                            const ts = result.predictiveMetrics.peakAttentionTimestamp ?? "";
                            const [m, s] = ts.includes(':') ? ts.split(':').map(Number) : [NaN, NaN];
                            const peakSec = isNaN(m) || isNaN(s) ? null : m * 60 + s;
                            if (peakSec === null) return null;
                            return (
                              <ReferenceLine
                                x={peakSec}
                                stroke="#f472b6"
                                strokeDasharray="3 3"
                                label={{
                                  value: "PEAK",
                                  position: "top",
                                  fill: "#f472b6",
                                  fontSize: 10,
                                  fontWeight: "900"
                                }}
                              />
                            );
                          })()}
                          <defs>
                            <linearGradient id="colorRetentionAd" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="0" stroke={theme === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.05)"} vertical={false} />
                          <XAxis 
                            dataKey="second" 
                            stroke="rgba(255,255,255,0.1)" 
                            fontSize={10} 
                            tickFormatter={(v) => `${v}s`}
                            axisLine={true}
                            tickLine={true}
                            tick={{ fill: theme === "dark" ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)', fontWeight: 600 }}
                          />
                          <YAxis 
                            yAxisId="clicks"
                            stroke={theme === "dark" ? "#2563eb" : "#2563eb"} 
                            fontSize={10} 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme === "dark" ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.7)', fontWeight: 700 }}
                            domain={[0, 'auto']}
                          />
                          <YAxis 
                            yAxisId="retention"
                            orientation="right"
                            stroke={theme === "dark" ? "#10b981" : "#10b981"} 
                            fontSize={10} 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme === "dark" ? 'rgba(16, 185, 129, 0.5)' : 'rgba(16, 185, 129, 0.7)', fontWeight: 700 }}
                            domain={[0, 100]}
                          />
                          <RechartsTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className={`${theme === "dark" ? "bg-slate-900/95 border-white/10 shadow-blue-500/10" : "bg-white border-slate-200 shadow-xl"} backdrop-blur-xl p-4 rounded-xl border min-w-[140px] shadow-2xl space-y-3`}>
                                    <p className={`text-xs font-black ${theme === "dark" ? "text-white border-white/5" : "text-slate-900 border-slate-100"} mb-3 border-b pb-2`}>{data.second}s</p>
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center gap-6">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        <span className="text-[11px] font-bold text-slate-400">Acción Estimada</span>
                                      </div>
                                      <div className="flex justify-between items-center gap-6">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        <span className="text-[11px] font-bold text-slate-400">Retención Predicha</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area 
                            yAxisId="retention"
                            type="monotone" 
                            dataKey="retention" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorRetentionAd)" 
                            isAnimationActive={true}
                          />
                          <Line 
                            yAxisId="clicks"
                            type="monotone" 
                            dataKey="clicks" 
                            stroke="#3b82f6" 
                            strokeWidth={4} 
                            dot={false}
                            activeDot={{ r: 8, strokeWidth: 0, fill: "#3b82f6" }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-6 flex justify-center">
                       <p className={`text-[11px] font-bold ${theme === "dark" ? "text-slate-500 bg-white/5 border-white/5" : "text-slate-400 bg-slate-50 border-slate-100"} uppercase tracking-widest px-4 py-1.5 rounded-full border italic`}>
                         Predictive Performance Analysis inspired by {adPlatform} Manager
                       </p>
                    </div>
                  </motion.div>
                )}

                {/* Suggestions Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] group transition-all`}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-emerald-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                        {t.suggested_edits}
                        <InfoTooltip text="Recomendaciones precisas de cortes, ritmo o adiciones (textos, transiciones) para mejorar el performance." />
                      </h5>
                    </div>
                    <ul className="space-y-4">
                      {(result.suggestedEdits || []).map((s, i) => (
                        <li
                          key={i}
                          className={`flex items-start gap-4 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"} group/li`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 group-hover/li:scale-150 transition-transform"></span>
                          <span className="leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] transition-all`}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-indigo-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                      <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                        {t.segmentation}
                        <InfoTooltip text="Sugerencias de públicos, intereses y nichos que responderán mejor a este formato y mensaje en las plataformas." />
                      </h5>
                    </div>
                    <ul className="space-y-4">
                      {(result.suggestedSegmentation || []).map((s, i) => (
                        <li
                          key={i}
                          className={`flex items-start gap-4 text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"} group/li`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 group-hover/li:scale-150 transition-transform"></span>
                          <span className="leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </div>

                {/* ── Compliance Checker ─────────────────────────────────────── */}
                {(() => {
                  const issues: string[] = (result as any).complianceIssues || [];
                  const platformScores: Record<string, number> = (result as any).scores || {};
                  const allPlatforms = [
                    { key: 'google', label: 'Google Ads', color: 'blue' },
                    { key: 'meta', label: 'Meta Ads', color: 'indigo' },
                    { key: 'tiktok', label: 'TikTok Ads', color: 'pink' },
                  ] as const;

                  const selectedPlatformKey = adPlatform.toLowerCase();
                  const platforms = adPlatform.includes("Universal")
                    ? allPlatforms
                    : allPlatforms.filter(p => selectedPlatformKey.includes(p.key.toLowerCase()));
                  const getStatus = (score: number) =>
                    score >= 70 ? 'pass' : score >= 45 ? 'warn' : 'fail';
                  const statusStyles = {
                    pass: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Apto', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    warn: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Revisar', bg: 'bg-amber-500/10 border-amber-500/20' },
                    fail: { dot: 'bg-rose-400', text: 'text-rose-400', label: 'No apto', bg: 'bg-rose-500/10 border-rose-500/20' },
                  };
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className={`${theme === 'dark' ? 'glass-card border-white/10' : 'bg-white border-slate-200 shadow-xl'} p-6 md:p-10 rounded-[2rem] md:rounded-[3rem]`}
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                          <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          Compliance Checker
                        </h5>
                      </div>

                      {/* Platform pass/fail */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {platforms.map(({ key, label }) => {
                          const score = platformScores[key] ?? 0;
                          const status = getStatus(score);
                          const style = statusStyles[status];
                          return (
                            <div key={key} className={`p-4 rounded-2xl border ${style.bg} text-center`}>
                              <div className={`w-2.5 h-2.5 rounded-full ${style.dot} mx-auto mb-2`} />
                              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                              <p className={`text-[11px] font-black ${style.text}`}>{style.label}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{score}/100</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Issues list */}
                      {issues.length > 0 ? (
                        <ul className="space-y-2">
                          {issues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-3 p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                              <span className="text-rose-400 text-sm mt-0.5 flex-shrink-0">⚠</span>
                              <p className={`text-[11px] font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{issue}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-emerald-400 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Sin problemas de cumplimiento detectados
                        </p>
                      )}
                    </motion.div>
                  );
                })()}
                {/* ──────────────────────────────────────────────────────────── */}

                {/* Keyframes Visual Gallery */}
                {result.keyframes && result.keyframes.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} p-6 md:p-12 rounded-[2rem] md:rounded-[4rem] relative group transition-all`}
                  >
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 blur-[100px] rounded-full -mr-40 -mt-40"></div>
                    <h4 className={`text-[11px] font-black ${theme === "dark" ? "text-[#ff477b]" : "text-rose-600"} uppercase tracking-[0.4em] mb-10 flex items-center`}>
                      Peak Performance{" "}
                      <span className={theme === "dark" ? "text-white ml-2" : "text-slate-900 ml-2"}>Frames</span>
                      <InfoTooltip text="Fotogramas clave detectados con mayor intensidad de atención y retención visual que impulsan el CTR." />
                    </h4>
                    <div className="grid md:grid-cols-3 gap-10">
                      {(result.keyframes || []).map((kf, i) => (
                        <motion.div
                          key={i}
                          whileHover={{ y: -10 }}
                          className="space-y-6 group/kf"
                        >
                          <div className={`relative rounded-[2rem] overflow-hidden border ${theme === "dark" ? "border-white/10 bg-slate-900" : "border-slate-200 bg-slate-50"} aspect-video shadow-2xl group-hover/kf:border-[#ff477b]/30 transition-all duration-500`}>
                            {kf.imageUrl && (
                              <>
                                <img
                                  src={kf.imageUrl}
                                  alt={kf.timestamp}
                                  className="w-full h-full object-cover group-hover/kf:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                                <div className="absolute inset-0">
                                  {(kf.analysisPoints || []).map((p, pi) => (
                                    <div
                                      key={pi}
                                      className="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 group/point"
                                      style={{
                                        top: `${p.y}%`,
                                        left: `${p.x}%`,
                                        width: `${(p.relevance || 5) * 2.5}%`,
                                        height: `${(p.relevance || 5) * 2.5}%`,
                                        background: `radial-gradient(circle, rgba(255, 73, 124, 0.7) 0%, rgba(255, 73, 124, 0) 70%)`,
                                        filter: "blur(12px)",
                                        mixBlendMode: "screen",
                                      }}
                                    >
                                      <div className={`opacity-0 group-hover/point:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-48 ${theme === "dark" ? "bg-slate-950/90 border-white/10" : "bg-white/90 border-slate-200 shadow-xl"} backdrop-blur-xl border p-4 rounded-[1.5rem] shadow-3xl transition-all duration-300 pointer-events-none z-50`}>
                                        <p className="text-[11px] font-black text-[#ff477b] uppercase tracking-widest leading-tight mb-2">
                                          {p.label}
                                        </p>
                                        {p.details && (
                                          <p className="text-[11px] text-slate-400 leading-tight">
                                            {p.details}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                            <div className={`absolute bottom-4 left-4 px-4 py-2 ${theme === "dark" ? "bg-slate-950/80 border-white/10" : "bg-white/80 border-slate-200"} backdrop-blur-xl rounded-xl border shadow-lg`}>
                              <p className={`text-[11px] font-black ${theme === "dark" ? "text-white" : "text-slate-900"} uppercase tracking-widest leading-none`}>
                                {kf.timestamp}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <p className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-600"} leading-relaxed italic border-l-2 border-[#ff477b] pl-4`}>
                              "{kf.description}"
                            </p>
                            
                            {/* Actions bar for keyframe */}
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                               {regeneratedVideos[i] ? (
                                 <motion.button
                                   whileHover={{ scale: 1.05 }}
                                   whileTap={{ scale: 0.95 }}
                                   onClick={() => window.open(regeneratedVideos[i], '_blank')}
                                   className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-emerald-500/20 transition-all"
                                 >
                                   <FileVideo className="w-3.5 h-3.5" />
                                   {language === "es" ? "VER NUEVA VERSIÓN" : "VIEW NEW VERSION"}
                                 </motion.button>
                               ) : (
                                 <motion.button
                                   whileHover={{ scale: 1.05 }}
                                   whileTap={{ scale: 0.95 }}
                                   disabled={regeneratingIdx !== null || !file}
                                   onClick={() => handleRegenerateScene(i, kf.timestamp, kf.description)}
                                   className={`px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-xl transition-all ${
                                      theme === "dark" 
                                        ? (user?.role === 'superAdmin' || user?.subscription?.plan === 'Agency' ? "bg-white text-slate-950" : "bg-white/10 text-slate-500 cursor-not-allowed") 
                                        : (user?.role === 'superAdmin' || user?.subscription?.plan === 'Agency' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed")
                                   } disabled:opacity-50`}
                                 >
                                   {regeneratingIdx === i ? (
                                     <div className="flex flex-col items-start gap-1.5 min-w-[140px]">
                                       <div className="flex items-center gap-2">
                                         <div className={`w-3 h-3 border-2 ${theme === 'dark' ? 'border-orange-400 border-t-white' : 'border-slate-300 border-t-slate-950'} rounded-full animate-spin`} />
                                         <span className="text-[9px] opacity-80">{regProgress?.stage || (language === "es" ? "INICIANDO..." : "INITIALIZING...")}</span>
                                       </div>
                                       <div className={`w-full h-1 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'} rounded-full overflow-hidden`}>
                                         <motion.div 
                                           className="h-full bg-gradient-to-r from-orange-400 to-amber-300" 
                                           initial={{ width: 0 }}
                                           animate={{ width: `${((regProgress?.attempt || 0) / (regProgress?.max || 40)) * 100}%` }}
                                         />
                                       </div>
                                       <span className="text-[8px] opacity-40 tabular-nums">Attempt {regProgress?.attempt || 0}/{regProgress?.max || 40}</span>
                                     </div>
                                   ) : (
                                     <>
                                       <Wand2 className="w-3.5 h-3.5" />
                                       <span>{language === "es" ? "REGENERAR CON VEO 2.0" : "REGENERATE WITH VEO 2.0"}</span>
                                     </>
                                   )}
                                 </motion.button>
                               )}
                               
                               {!file && !regeneratedVideos[i] && (
                                 <span className="text-[11px] text-slate-500 italic">
                                    {language === "es" ? "* Requiere video local cargado" : "* Requires local video loaded"}
                                 </span>
                               )}
                            </div>
                            {kf.communicationAnalysis && (
                              <div className={`${theme === "dark" ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"} p-4 rounded-2xl border`}>
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Communication Intel</p>
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                  {kf.communicationAnalysis}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right Column: Score & Neuro Metrics */}
              <div className="lg:col-span-4 space-y-8">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} rounded-[2rem] md:rounded-[4rem] p-6 md:p-12 text-center relative group h-full flex flex-col justify-between`}
                >
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[#ff477b]/10 blur-[120px] rounded-full group-hover:bg-[#ff477b]/20 transition-all duration-1000"></div>
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 blur-[120px] rounded-full"></div>

                  <div className="relative z-10 space-y-10 flex-grow py-6">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex justify-center items-center">
                      {t.overall_rating}
                      <InfoTooltip text="Score general del nivel de calidad técnica, visual y persuasiva del anuncio calificado de 0 a 100." />
                    </p>

                    <div className="relative flex justify-center py-4">
                      <div className="absolute inset-0 bg-[#ff477b]/10 blur-[80px] rounded-full scale-150 animate-pulse-slow"></div>
                      <PlatformGauge 
                        score={Number(result?.overallRating || 0)} 
                        size={320}
                        theme={theme}
                        platform={adPlatform} 
                      />
                    </div>

                    <div className="flex flex-col items-center gap-4">
                      <div className={`w-full h-px bg-gradient-to-r from-transparent ${theme === "dark" ? "via-white/10" : "via-slate-200"} to-transparent`}></div>
                      <div className="px-10 py-3 bg-gradient-to-r from-[#ff477b] to-[#7C3AED] rounded-full text-[11px] font-black uppercase tracking-[0.3em] text-white shadow-3xl">
                        A-CLASS ASSET
                      </div>
                    </div>

                    {result?.predictiveMetrics && (
                      <div className={`space-y-8 text-left border-t ${theme === "dark" ? "border-white/10" : "border-slate-100"} pt-10`}>
                        <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 px-2 flex items-center">
                          Neuro-Retention Engine
                          <InfoTooltip text="Métricas avanzadas que evalúan el gancho inicial, el nivel de retención de atención y la saturación cognitiva del video." />
                        </h5>
                        <div className="grid grid-cols-1 gap-5">
                          {[
                            {
                              label:
                                language === "es"
                                  ? "POTENCIA DE HOOK"
                                  : "HOOK STRENGTH",
                              val: result?.hookStrength || 0,
                              icon: "M13 10V3L4 14h7v7l9-11h-7z",
                            },
                            {
                              label:
                                language === "es"
                                  ? "SCORE DE RETENCIÓN"
                                  : "RETENTION SCORE",
                              val: result?.retentionScore || 0,
                              icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                            },
                            {
                              label:
                                language === "es"
                                  ? "ESFUERZO COGNITIVO"
                                  : "COGNITIVE LOAD",
                              val: result?.predictiveMetrics?.avgCognitiveLoad,
                              inverse: true,
                              icon: "M11 19l-7-7 7-7m8 14l-7-7 7-7",
                            },
                            {
                              label:
                                language === "es"
                                  ? "CLARIDAD VISUAL"
                                  : "VISUAL CLARITY",
                              val: result?.predictiveMetrics?.clarityScore,
                              icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                            },
                          ].map((m, i) => (
                            <motion.div
                              key={i}
                              whileHover={{ x: 10 }}
                              className={`${theme === "dark" ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100 shadow-sm"} backdrop-blur-3xl p-6 rounded-[2rem] border group/metric shadow-inner`}
                            >
                              <div className="flex justify-between items-center mb-3">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                  {m.label}
                                </p>
                                <span
                                  className={`text-2xl font-black italic ${m.inverse ? (m.val < 40 ? "text-emerald-400" : "text-rose-400") : m.val > 70 ? "text-emerald-400" : "text-yellow-400"}`}
                                >
                                  {m.val}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${m.val}%` }}
                                  className={`h-full ${m.inverse ? (m.val < 40 ? "bg-emerald-400" : "bg-rose-400") : m.val > 70 ? "bg-emerald-400" : "bg-yellow-400"}`}
                                ></motion.div>
                              </div>
                            </motion.div>
                          ))}

                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className={`${theme === "dark" ? "bg-gradient-to-br from-indigo-500/20 to-transparent border-indigo-500/30 shadow-2xl" : "bg-slate-50 border-indigo-100 shadow-xl"} p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border mt-4`}
                          >
                            <div className="flex items-center gap-4 mb-3">
                              <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <svg
                                  className="w-4 h-4 text-indigo-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">
                                Peak Attention
                              </p>
                            </div>
                            <p className={`text-3xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"} italic tracking-tighter`}>
                              {result?.predictiveMetrics?.peakAttentionTimestamp || "N/A"}
                            </p>
                            <p className="text-[11px] text-indigo-300/50 uppercase font-bold mt-2 tracking-widest">
                              Temporal Peak Detection
                            </p>
                          </motion.div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* ── Neuro-Creative Score (NCS) Panel ─────────────────────────── */}
            {result?.neuroCreativeScore && (() => {
              const ncs = result.neuroCreativeScore!;
              const tierConfig: Record<string, { label: string; color: string; glow: string; bg: string }> = {
                elite:   { label: 'Elite',   color: 'text-emerald-400', glow: 'shadow-emerald-500/30', bg: 'bg-emerald-500/10 border-emerald-500/30' },
                strong:  { label: 'Strong',  color: 'text-blue-400',    glow: 'shadow-blue-500/30',    bg: 'bg-blue-500/10 border-blue-500/30'    },
                average: { label: 'Average', color: 'text-amber-400',   glow: 'shadow-amber-500/30',   bg: 'bg-amber-500/10 border-amber-500/30'  },
                weak:    { label: 'Weak',    color: 'text-rose-400',    glow: 'shadow-rose-500/30',    bg: 'bg-rose-500/10 border-rose-500/30'    },
              };
              const tier = tierConfig[ncs.tier?.toLowerCase()] ?? tierConfig.average;
              const roiIcons: Record<string, string> = {
                attentionROI:    'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
                emotionROI:      'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
                decisionROI:     'M13 10V3L4 14h7v7l9-11h-7z',
                cognitiveLoadROI: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
              };
              const roiLabels: Record<string, string> = {
                attentionROI:    'Atención Visual',
                emotionROI:      'Carga Emocional',
                decisionROI:     'Gatillo de Decisión',
                cognitiveLoadROI: 'Carga Cognitiva',
              };
              const roiColors: Record<string, string> = {
                attentionROI:    '#3b82f6',
                emotionROI:      '#ec4899',
                decisionROI:     '#f59e0b',
                cognitiveLoadROI: '#8b5cf6',
              };
              const roiBg: Record<string, string> = {
                attentionROI:    'bg-blue-500/10 border-blue-500/20',
                emotionROI:      'bg-pink-500/10 border-pink-500/20',
                decisionROI:     'bg-amber-500/10 border-amber-500/20',
                cognitiveLoadROI: 'bg-violet-500/10 border-violet-500/20',
              };
              return (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`${theme === 'dark' ? 'glass-panel border-white/5' : 'bg-white border-slate-200 shadow-xl'} p-8 md:p-12 rounded-[2rem] md:rounded-[4rem] border relative overflow-hidden`}
                >
                  {/* Background glow */}
                  <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/5 blur-[100px] rounded-full -mr-48 -mt-48 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-[100px] rounded-full -ml-48 -mb-48 pointer-events-none" />

                  {/* Header */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 relative z-10">
                    <div>
                      <p className={`text-[11px] font-black uppercase tracking-[0.4em] mb-2 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                        Neuro-Creative Score™
                      </p>
                      <h3 className={`text-3xl font-black tracking-tighter ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        Análisis de Impacto{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">
                          Cognitivo
                        </span>
                      </h3>
                      <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        Inspirado en TRIBE v2 · Meta AI Research · 4 ROIs segmentados
                      </p>
                    </div>
                    {/* Composite Score */}
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-center">
                        <div className="relative">
                          <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
                            <circle cx="50" cy="50" r="40" fill="none" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="8"/>
                            <circle
                              cx="50" cy="50" r="40" fill="none"
                              stroke="url(#ncsGradVideo)" strokeWidth="8"
                              strokeLinecap="round"
                              strokeDasharray={`${(ncs.composite / 100) * 251.2} 251.2`}
                            />
                            <defs>
                              <linearGradient id="ncsGradVideo" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8b5cf6"/>
                                <stop offset="100%" stopColor="#ec4899"/>
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{ncs.composite}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">/100</span>
                          </div>
                        </div>
                        <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${tier.bg} ${tier.color} shadow-lg ${tier.glow}`}>
                          {tier.label}
                        </span>
                      </div>
                      {/* KPI Deltas */}
                      <div className="space-y-3">
                        {[
                          { label: 'Δ Benchmark',       val: ncs.benchmarkDelta,          unit: 'pts', positive: (ncs.benchmarkDelta || 0) >= 0   },
                          { label: 'Recall Potential',  val: ncs.predictedRecall,         unit: '%',   positive: (ncs.predictedRecall || 0) >= 50  },
                          { label: 'Engagement Lift',   val: ncs.predictedEngagementLift, unit: '',    positive: (ncs.predictedEngagementLift || "").startsWith('+') },
                        ].map((kpi) => (
                          <div key={kpi.label} className={`flex items-center justify-between gap-6 px-4 py-2 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{kpi.label}</span>
                            <span className={`text-sm font-black ${kpi.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {kpi.positive && !String(kpi.val).startsWith('+') && !String(kpi.val).startsWith('-') && String(kpi.val) !== '0' ? '+' : ''}{kpi.val}{kpi.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Executive Insight */}
                  <div className={`mb-10 p-6 rounded-2xl border ${theme === 'dark' ? 'bg-violet-500/5 border-violet-500/20' : 'bg-violet-50 border-violet-100'}`}>
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${theme === 'dark' ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-500/10 text-violet-600'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                          Insight Ejecutivo (CxO Report)
                        </p>
                        <p className={`text-sm font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                          {ncs.executiveInsight}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ROI Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 relative z-10">
                    {([
                      { key: 'attentionROI',    label: 'Atención Visual',    icon: roiIcons.attentionROI },
                      { key: 'emotionROI',      label: 'Carga Emocional',    icon: roiIcons.emotionROI },
                      { key: 'decisionROI',     label: 'Gatillo Decisión',   icon: roiIcons.decisionROI },
                      { key: 'cognitiveLoadROI', label: 'Carga Cognitiva',    icon: roiIcons.cognitiveLoadROI },
                    ] as const).map((roi) => {
                      const roiData = ncs[roi.key];
                      if (!roiData) return null;
                      
                      const color  = roiColors[roi.key]  ?? '#8b5cf6';
                      const bg     = roiBg[roi.key]      ?? 'bg-violet-500/10 border-violet-500/20';
                      const icon   = roi.icon;
                      const label  = roi.label;
                      
                      // Handle confidence which can be string "high|medium|low" or number
                      const confidenceNum = typeof roiData.confidence === 'number' ? roiData.confidence : 
                                          roiData.confidence === 'high' ? 0.9 : 
                                          roiData.confidence === 'medium' ? 0.6 : 0.3;
                      
                      const confColor = confidenceNum >= 0.7 ? 'text-emerald-400' : confidenceNum >= 0.4 ? 'text-amber-400' : 'text-rose-400';
                      return (
                        <motion.div
                          key={roi.key}
                          whileHover={{ y: -4, scale: 1.02 }}
                          className={`${theme === 'dark' ? 'bg-white/5 border-white/5 hover:bg-white/8' : 'bg-slate-50 border-slate-100 hover:bg-slate-100 shadow-sm'} border rounded-[1.5rem] p-6 transition-all duration-300`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className={`p-2.5 rounded-xl border ${bg}`}>
                              <svg className="w-4 h-4" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                              </svg>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${confColor}`}>
                              {Math.round(confidenceNum * 100)}% conf.
                            </span>
                          </div>
                          <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            {label}
                          </p>
                          <p className={`text-3xl font-black tracking-tighter mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {roiData.score}<span className="text-base font-bold text-slate-500">/100</span>
                          </p>
                          <div className={`w-full h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'} mb-4`}>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${roiData.score}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: `linear-gradient(90deg, ${color}99, ${color})` }}
                            />
                          </div>
                          {roiData.recommendation && (
                            <p className={`text-[11px] leading-relaxed ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'} border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'} pt-3`}>
                              {roiData.recommendation}
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Video-specific: Peak Attention Correlation note */}
                  {result?.predictiveMetrics?.peakAttentionTimestamp && (
                    <div className={`mt-6 flex items-center gap-3 px-5 py-3 rounded-xl border ${theme === 'dark' ? 'bg-violet-500/5 border-violet-500/10' : 'bg-violet-50 border-violet-100'} relative z-10`}>
                      <span className="text-violet-400 text-base">⚡</span>
                      <p className={`text-[11px] font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className="font-black text-violet-400">Peak Attention</span> detectado en{' '}
                        <span className={`font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{result.predictiveMetrics.peakAttentionTimestamp}</span>
                        {' '}— correlaciona con el ROI de mayor score en este análisis NCS.
                      </p>
                    </div>
                  )}

                  {/* Overall recommendation */}
                  {ncs.overallRecommendation && (
                    <div className={`mt-5 px-6 py-4 rounded-2xl border ${theme === 'dark' ? 'bg-gradient-to-r from-violet-500/10 to-pink-500/5 border-violet-500/20' : 'bg-gradient-to-r from-violet-50 to-pink-50 border-violet-100'} relative z-10`}>
                      <p className={`text-[11px] font-black uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-violet-400' : 'text-violet-600'}`}>
                        {TRANSLATIONS[language].ncs_recommendation}
                      </p>
                      <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{ncs.overallRecommendation}</p>
                    </div>
                  )}
                </motion.div>
              );
            })()}
            {/* ─────────────────────────────────────────────────────────────── */}
          </motion.div>
        )}
        {/* Admin Diagnostics */}
        {result && (user?.role === 'superAdmin' || user?.email === 'sanchezfj@me.com' || user?.email === 'sociopuerta@gmail.com') && (
          <AdminDiagnosticPanel result={result} language={language as any} />
        )}

        {/* Feedback Loop */}
        {result && (user?.role === 'admin' || user?.role === 'superAdmin' || user?.subscription?.plan === 'Agency') && (
          <section className="mt-20 no-print">
            <FeedbackWidget
              feature="video-audit"
              userId={user?.id || "guest"}
              userRole={user?.role}
              context={JSON.stringify({ fileName: fileInfo?.name, platform: adPlatform })}
              aiResponse={result?.narrativeCritique?.substring(0, 500)}
            />
          </section>
        )}
      </div>
      <TutorialBubble
        steps={tutorialSteps}
        currentStep={currentStep}
        isVisible={isTutorialVisible}
        language={language}
        onNext={nextTutorialStep}
        onPrev={prevTutorialStep}
        onGoTo={goToTutorialStep}
        onDismiss={dismissTutorial}
      />
    </div>
  );
};

export default VideoAuditView;
