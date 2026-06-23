import { buildAbsoluteUrl } from "../utils/apiConfig";
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auditAdImage } from "../services/geminiService";
import { ImageAnalysisResult, Language } from "../types";
import { TRANSLATIONS } from "../constants";
import { authService } from "../services/authService";
// import { generateGoogleStylePDF } from "../utils/exportUtils"; // Removed for dynamic import optimization
import { martechService } from "../services/martechService";
import { InfoTooltip } from "./ui/InfoTooltip";
import { Badge } from "./ui/Badge";
import ResultSkeleton from "./ui/ResultSkeleton";
import { AdminDiagnosticPanel } from "./ui/AdminDiagnosticPanel";
import TutorialBubble from "./ui/TutorialBubble";
import { useTutorial } from "../hooks/useTutorial";
import { FeedbackWidget } from "./ui/FeedbackWidget";
import { Mail, Download, ScanEye, ImageIcon, Upload, X, Zap, CheckCircle2, Sparkles, Wand2 } from "lucide-react";
import Toast, { ToastData } from "./Toast";
import { AdsPlatformPills } from "./ui/AdsPlatformPills";
import PlatformGauge from "./ui/PlatformGauge";
import { generateOrEditImage } from "../services/ai/mediaGenerationService";


import { HeatmapOverlay } from "./ui/HeatmapOverlay";
import { SafeZoneOverlay } from "./ui/SafeZoneOverlay";





interface ImageAuditViewProps {
  language: Language;
  theme: "dark" | "light";
  restoredAudit?: ImageAnalysisResult | null;
  onSaveAudit?: (res: ImageAnalysisResult, q: any) => void;
  prefilledUrl?: string;
}

const ImageAuditView: React.FC<ImageAuditViewProps> = ({
  language,
  theme,
  restoredAudit,
  onSaveAudit,
  prefilledUrl,
}) => {
  const t = TRANSLATIONS[language];
  const tutorial = useTutorial('image-audit', language);
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    size: string;
    type: string;
    name: string;
  } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditStep, setAuditStep] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<"markers" | "glow" | "gaze-path">("markers");
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [heatmapWarning, setHeatmapWarning] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Sprint 1 — A/B Slider "Aplicar Sugerencia IA"
  const [fixedImageUrl, setFixedImageUrl] = useState<string | null>(null);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [abSliderValue, setAbSliderValue] = useState(50);

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

  // Load state from local storage on mount
  // Load state from local storage or restoredAudit on mount
  React.useEffect(() => {
    if (restoredAudit) {
      setResult(restoredAudit);
      setImagePreview(null); // the user will see the audit details, though we lack the image source unless we saved it (base64 is too big for local storage sometimes, but ok for now)
      return;
    }

    try {
      const savedResult = localStorage.getItem("insitu_img_audit_result");
      const savedPreview = localStorage.getItem("insitu_img_audit_preview");
      if (savedResult && savedPreview) {
        setResult(JSON.parse(savedResult));
        setImagePreview(savedPreview);
      }
    } catch (e) {
      console.error("Failed to load saved audit", e);
    }
  }, [restoredAudit]);

  React.useEffect(() => {
    if (prefilledUrl) {
      const fetchMedia = async () => {
        try {
          const response = await fetch(prefilledUrl);
          const blob = await response.blob();
          
          // Create a File object from the blob
          const fileName = prefilledUrl.split('/').pop()?.split('?')[0] || "prefilled-image.jpg";
          const file = new File([blob], fileName, { type: blob.type });
          
          setFile(file);
          setFileInfo({
            name: fileName,
            size: (blob.size / 1024).toFixed(1) + " KB",
            type: blob.type.split("/")[1].toUpperCase(),
          });
          
          // Create preview
          const reader = new FileReader();
          reader.onload = (e) => setImagePreview(e.target?.result as string);
          reader.readAsDataURL(file);
          
          setResult(null);
        } catch (e) {
          console.error("Error fetching prefilled image:", e);
          setError(language === "es" 
            ? "No se pudo cargar la imagen automáticamente por restricciones de seguridad (CORS). Intente descargarla y subirla manualmente." 
            : "Could not load image automatically due to security restrictions (CORS). Try downloading and uploading it manually.");
        }
      };
      fetchMedia();
    }
  }, [prefilledUrl, language]);

  // Save state to local storage when result changes
  React.useEffect(() => {
    if (result && imagePreview) {
      try {
        localStorage.setItem("insitu_img_audit_result", JSON.stringify(result));
        localStorage.setItem("insitu_img_audit_preview", imagePreview);
      } catch (e) {
        console.error("Failed to save audit", e);
      }
    }
  }, [result, imagePreview]);

  const handleReset = () => {
    setFile(null);
    setFileInfo(null);
    setImagePreview(null);
    setResult(null);
    setMarketingObjective("Conversion");
    setAdPlatform("Universal / Multiplatform");
    try {
      localStorage.removeItem("insitu_img_audit_result");
      localStorage.removeItem("insitu_img_audit_preview");
    } catch (e) {
      console.error("Error clearing storage", e);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onFileChange = (e: any) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileInfo({
        name: selectedFile.name,
        size: (selectedFile.size / 1024).toFixed(1) + " KB",
        type: selectedFile.type.split("/")[1].toUpperCase(),
      });
      setResult(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const AUDIT_STEPS_IMG = [
    language === 'es' ? 'Cargando imagen...' : 'Loading image...',
    language === 'es' ? 'Análisis neural...' : 'Neural analysis...',
    language === 'es' ? 'Calculando métricas...' : 'Calculating metrics...',
    language === 'es' ? 'Generando recomendaciones...' : 'Generating recommendations...',
  ];

  const startAuditProgress = () => {
    setAuditProgress(0);
    setAuditStep(0);
    let p = 0;
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      p += p < 15 ? 5 : p < 40 ? 3 : p < 70 ? 1.5 : p < 88 ? 0.6 : 0.2;
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

  // Sprint 1 — "Aplicar Sugerencia IA" handler
  const handleApplyFix = async () => {
    if (!result?.growthVerdict?.priorityFix || !imagePreview) return;
    const plan = user?.subscription?.plan || "Starter";
    const isAdminUser = user?.role === 'superAdmin' || user?.role === 'admin';
    if (!isAdminUser && plan === "Starter") {
      setToast({
        title: language === "es" ? "Plan Growth requerido" : "Growth Plan Required",
        message: language === "es"
          ? "Esta función requiere plan Growth o Agency. Actualiza tu plan."
          : "This feature requires Growth or Agency plan. Upgrade to use it.",
        type: "warning",
      });
      return;
    }
    setIsApplyingFix(true);
    setFixedImageUrl(null);
    setAbSliderValue(50);
    try {
      const base64 = imagePreview.replace(/^data:image\/[^;]+;base64,/, "");
      const prompt = `Aplica esta corrección exacta a la imagen publicitaria: ${result.growthVerdict.priorityFix}. Mantén la composición base, el texto y los elementos principales. Plataforma objetivo: ${adPlatform}. Objetivo: ${marketingObjective}. Mejora contraste, jerarquía visual y atracción del CTA manteniendo fidelidad a la marca.`;
      const url = await generateOrEditImage(prompt, base64, "1:1");
      if (url) {
        setFixedImageUrl(url);
        authService.trackTokenUsage(50, "Aplicar Sugerencia IA — Imagen 3.0", undefined, 'image');
        setToast({
          title: language === "es" ? "✨ Mejora aplicada" : "✨ Fix Applied",
          message: language === "es"
            ? "La imagen mejorada está lista. Usa el slider para comparar."
            : "Improved image is ready. Use the slider to compare.",
          type: "success",
        });
      }
    } catch (err: any) {
      setToast({
        title: language === "es" ? "Error al aplicar mejora" : "Fix Error",
        message: err?.message || (language === "es" ? "No se pudo generar la imagen mejorada." : "Could not generate improved image."),
        type: "error",
      });
    } finally {
      setIsApplyingFix(false);
    }
  };

  const handleAudit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    startAuditProgress();

    try {
      // Check limits using unified service logic (audit = vision query, uses text quota)
      if (user) {
        const check = authService.checkPlanLimits(user, 'text');
        if (!check.allowed) {
          setError(check.reason);
          setLoading(false);
          return;
        }
      }
      // Read file as base64 via Promise
      const base64Data = await new Promise<{base64: string, detectedMime: string}>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("File read error"));
        reader.readAsDataURL(file);
        reader.onload = () => {
          const fullDataUrl = reader.result as string;
          const mimeMatch = fullDataUrl.match(/^data:image\/([^;]+);base64,/);
          const detectedMime = mimeMatch ? `image/${mimeMatch[1]}` : file.type;
          const base64 = fullDataUrl.replace(/^data:image\/[^;]+;base64,/, "");
          resolve({ base64, detectedMime });
        };
      });

      console.log("Enviando imagen a auditar con contexto...");
      const analysis = await auditAdImage(base64Data.base64, base64Data.detectedMime, language, {
        objective: marketingObjective,
        platform: adPlatform,
        brand: isBrandSafetyVerified ? user?.brandProfile : undefined,
      });
      console.log("Resultado de auditoría (raw):", analysis);
      
      if (!analysis.analysisPoints || analysis.analysisPoints.length === 0) {
        console.warn("ADVERTENCIA: No se recibieron puntos de calor (empty analysisPoints).");
        setHeatmapWarning(true);
      } else {
        console.log(`✅ HEATMAP: ${analysis.analysisPoints.length} puntos de calor recibidos.`);
        setHeatmapWarning(false);
      }
      
      martechService.trackEngagement('run_audit', {
        objective: marketingObjective,
        platform: adPlatform,
        fileName: file.name
      });
      
      setResult(analysis);
      authService.trackTokenUsage(150, `Auditoría Imagen: ${file.name}`, undefined, 'image');
      onSaveAudit?.(analysis, {
        fileName: file.name,
        objective: marketingObjective,
      });
      
      completeAuditProgress();
      setLoading(false);

    } catch (err: any) {
      console.error("Error en handleAudit:", err);
      completeAuditProgress();
      const msg = language === "es"
        ? "Error en el análisis. Intente devuelta o verifique el formato."
        : "Analysis error. Please try again or check format.";
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
      console.log("Iniciando descarga de PDF (Safe Mode)...");
      const baseFileName = `Auditoria_Imagen_Insitu_${language === "es" ? "ES" : "EN"}_${new Date().toISOString().split("T")[0]}.pdf`;
      
      // Ensure result has valid score
      const cleanResult = {
        ...result,
        overallRating: result.overallRating || "0/10"
      };

      const { generateGoogleStylePDF } = await import("../utils/exportUtils");
      await generateGoogleStylePDF("image", cleanResult, baseFileName, language, {
        imagePreview: imagePreview || undefined,
        user: user,
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
      console.error("Error CRITICO al generar PDF:", error);
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
      const baseFileName = `Auditoria_Imagen_Insitu_${language === "es" ? "ES" : "EN"}_${new Date().toISOString().split("T")[0]}.pdf`;
      const cleanResult = { ...result, overallRating: result.overallRating || "0/10" };
      const pdfBase64 = await generateGoogleStylePDF("image", cleanResult, baseFileName, language, { 
        imagePreview: imagePreview || undefined,
        user, 
        action: "return",
        context: { objective: marketingObjective, platform: adPlatform }
      }) as string;
      if (!pdfBase64) throw new Error("PDF generation returned empty");
      const emailResp = await fetch(buildAbsoluteUrl('/.netlify/functions/api-send-report'), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": user?.id || ""
        },
        body: JSON.stringify({
          email: emailStr,
          pdfBase64,
          fileName: baseFileName,
          domain: adPlatform || "Análisis de Imagen",
          reportType: "Auditoría de Imagen IA",
          language
        })
      });
      if (!emailResp.ok) {
        const errData = await emailResp.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${emailResp.status}`);
      }
      setToast({
        title: language === "es" ? "Email Enviado" : "Email Sent",
        message: language === "es" ? `Reporte enviado a ${emailStr}` : `Report sent to ${emailStr}`,
        type: "success"
      });
    } catch (err: any) {
      console.error("[EmailReport] Error:", err);
      const errMsg = err?.message || "";
      setToast({ 
        title: language === "es" ? "Error de Envío" : "Send Error",
        message: errMsg || (language === "es" ? "No se pudo enviar el email." : "Could not send email."), 
        type: "error" 
      }); 
    } finally {
      setIsSendingEmail(false);
    }
  };
  return (
    <div className={`min-h-screen selection:bg-primary/30 selection:text-white transition-colors duration-500 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
      {/* Tutorial Bubble */}
      <TutorialBubble
        steps={tutorial.steps}
        currentStep={tutorial.currentStep}
        isVisible={tutorial.isVisible}
        language={language}
        onNext={tutorial.next}
        onPrev={tutorial.prev}
        onGoTo={tutorial.goTo}
        onDismiss={tutorial.dismiss}
      />
      {/* Notifications */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full animate-pulse-slow animation-delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 space-y-20 relative z-10">
        <div className="text-center space-y-8 relative z-10">
          <Badge label="Neuro-Market Intelligence Engine" />

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
                      ? "La imagen se ha cargado. Haz clic en el botón de abajo para iniciar el análisis neuronal." 
                      : "The image has been loaded. Click the button below to initiate the neural analysis."}
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

          <h2 className={`text-4xl md:text-7xl lg:text-[10rem] font-black tracking-tighter leading-none uppercase italic drop-shadow-2xl ${theme === "dark" ? "text-white" : "text-slate-950"}`}>
            GROWTH <br />
            <span className="text-gradient-magenta inline-block transform -skew-x-6">{t.creative_audit!}</span>
          </h2>
          <p className={`${theme === "dark" ? "text-slate-400" : "text-slate-500"} font-medium text-xl max-w-2xl mx-auto leading-relaxed italic`}>
            {language === "es"
              ? "Escáner neuro-visual profundo para maximizar el ROAS y la retención mediante IA predictiva."
              : "Deep neuro-visual scanner to maximize ROAS and retention using predictive AI."}
          </p>
        </div>

        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 pb-12 w-full relative z-10"
          >
            {/* Brand DNA Section */}
            {user?.brandProfile?.brandName && (
              <div className={`md:col-span-2 ${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} p-8 rounded-[3rem] flex items-center justify-between group transition-all hover:neon-magenta-glow relative`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
                <div className="flex items-center gap-5 relative z-10">
                  <div className={`w-16 h-16 ${theme === "dark" ? "bg-slate-950 border-white/10" : "bg-slate-50 border-slate-200"} rounded-[1.5rem] flex items-center justify-center border group-hover:border-primary/30 shadow-2xl transition-all`}>
                    {user.brandProfile.isotypeUrl ? (
                      <img
                        src={user.brandProfile.isotypeUrl}
                        className="w-10 h-10 object-contain"
                        alt="Brand Isotype"
                      />
                    ) : (
                      <span className="text-primary text-2xl font-black">
                        {user.brandProfile.brandName[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-primary uppercase tracking-[0.3em] leading-none mb-2 text-left">
                      Brand Identity Core
                    </p>
                    <p className={`text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"} group-hover:text-primary transition-colors tracking-tight`}>
                      {user.brandProfile.brandName}
                    </p>
                  </div>
                </div>
                <div className={`text-right ${theme === "dark" ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"} px-8 py-4 rounded-[2rem] border relative z-10 transition-all group-hover:border-white/10 group-hover:bg-primary hover:text-white hover:border-primary`}>
                  {isBrandSafetyVerified && (
                    <div className="flex items-center justify-end gap-1 mb-2">
                      <svg
                        className="w-3 h-3 text-emerald-500"
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
                      <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">
                        Brand Safety Verified
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 leading-none">
                    Compliance State
                  </p>
                  <div className="flex items-center gap-2 justify-end">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${user.brandProfile.adherenceLevel === "Strict" ? "bg-rose-500 shadow-[0_0_15px_#f43f5e]" : "bg-emerald-500 shadow-[0_0_15px_#10b981]"}`}
                    ></span>
                    <p
                      className={`text-[12px] font-black uppercase tracking-[0.2em] ${user.brandProfile.adherenceLevel === "Strict" ? "text-rose-400" : "text-emerald-400"}`}
                    >
                      {user.brandProfile.adherenceLevel}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Campaign Objective Selector */}
            <div className={`${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} p-8 flex flex-col justify-between rounded-[3rem] space-y-6 relative group`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors"></div>
              <label className="text-[11px] font-black text-primary uppercase tracking-[0.3em] px-2 block relative z-10 text-left">
                {language === "es"
                  ? "Objetivo Estratégico"
                  : "Strategic Objective"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10 w-full mb-auto pb-4">
                {[
                  {
                    id: "Awareness",
                    label: language === "es" ? "Reconocimiento" : "Awareness",
                    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                  },
                  {
                    id: "Consideration",
                    label:
                      language === "es" ? "Consideración" : "Consideration",
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
                    className={`flex flex-col items-center justify-center p-4 md:p-5 w-full rounded-[1.5rem] md:rounded-[2rem] transition-all border group/btn flex-1 ${
                      marketingObjective === item.id
                        ? (theme === "dark" 
                            ? "bg-white border-white shadow-[0_20px_40px_-12px_rgba(255,255,255,0.3)] scale-[1.03]" 
                            : "bg-primary border-primary shadow-[0_20px_40px_-12px_rgba(255,73,124,0.3)] scale-[1.03]")
                        : (theme === "dark" 
                            ? "bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:bg-primary hover:text-white hover:border-primary" 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-primary hover:text-white hover:border-primary")
                    } z-20`}
                  >
                    <svg
                      className={`w-6 h-6 mb-3 transition-colors ${marketingObjective === item.id 
                        ? (theme === "dark" ? "text-primary" : "text-white") 
                        : (theme === "dark" ? "text-white/20 group-hover/btn:text-white/60" : "text-slate-300 group-hover/btn:text-slate-500")}`}
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
                      className={`text-[11px] font-black uppercase tracking-widest ${marketingObjective === item.id 
                        ? (theme === "dark" ? "text-slate-900" : "text-white") 
                        : ""}`}
                    >
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ads Platform Selector — Pill Scrollbar */}
            <div className={`${theme === "dark" ? "glass-card border-white/10" : "bg-white border-slate-200 shadow-xl"} p-8 flex flex-col justify-between rounded-[3rem] space-y-4 relative group text-left`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors"></div>
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
        )}

        {!result && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl mx-auto relative"
          >
            {/* Premium Upload Card */}
            <motion.div
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
              {/* Ambient glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full -ml-48 -mb-48 pointer-events-none" />

              <div className="p-10 md:p-16 relative z-10">
                {!fileInfo ? (
                  /* Empty state */
                  <label className="cursor-pointer flex flex-col items-center gap-8">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className={`relative w-36 h-36 ${theme === 'dark' ? 'bg-slate-950/80 border-white/10' : 'bg-white border-slate-200'} rounded-[2.5rem] flex items-center justify-center border-2 shadow-2xl`}
                    >
                      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#ff477b]/10 via-transparent to-indigo-500/10" />
                      <ScanEye className={`w-14 h-14 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                      <div className="absolute -inset-1 rounded-[2.7rem] border border-[#ff477b]/20 animate-pulse" />
                    </motion.div>

                    <div className="text-center space-y-3">
                      <p className={`text-2xl font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {language === 'es' ? 'Inyectar Creativo' : 'Inject Creative'}
                      </p>
                      <p className={`text-[11px] font-bold uppercase tracking-[0.3em] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        {language === 'es' ? 'Arrastra o haz clic · JPG PNG WEBP · Max 5MB' : 'Drag or click · JPG PNG WEBP · Max 5MB'}
                      </p>
                    </div>

                    <div className="relative group/cta">
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#ff477b] to-indigo-600 rounded-full blur-lg opacity-40 group-hover/cta:opacity-70 transition-opacity" />
                      <span className="relative flex items-center gap-3 bg-gradient-to-r from-[#ff477b] to-indigo-600 text-white px-12 py-5 rounded-full font-black text-xs uppercase tracking-[0.25em] shadow-2xl hover:brightness-110 active:scale-95 transition-all">
                        <Upload className="w-4 h-4" />
                        {language === 'es' ? 'Seleccionar Imagen' : 'Select Image'}
                      </span>
                    </div>

                    <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                  </label>
                ) : (
                  /* Image loaded state */
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Thumbnail */}
                    <div className="relative group/thumb flex-shrink-0">
                      <img
                        src={imagePreview!}
                        alt="Preview"
                        className="h-52 w-52 rounded-[2rem] object-cover shadow-2xl border border-white/10"
                      />
                      <div className="absolute inset-0 rounded-[2rem] bg-black/50 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity backdrop-blur-sm">
                        <label className="cursor-pointer flex flex-col items-center gap-2">
                          <Upload className="w-6 h-6 text-white" />
                          <span className="text-[11px] font-black text-white uppercase tracking-widest">{language === 'es' ? 'Cambiar' : 'Replace'}</span>
                          <input type="file" className="hidden" accept="image/*" onChange={onFileChange} />
                        </label>
                      </div>
                    </div>

                    {/* Meta pills + actions */}
                    <div className="flex-1 flex flex-col gap-6 w-full">
                      <div className="flex flex-wrap gap-2">
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[11px] font-black uppercase tracking-widest text-slate-400">
                          <ImageIcon className="w-3 h-3" /> {fileInfo.name.length > 22 ? fileInfo.name.slice(0, 22) + '...' : fileInfo.name}
                        </span>
                        <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[11px] font-black uppercase tracking-widest text-indigo-400">{fileInfo.type}</span>
                        <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[11px] font-black uppercase tracking-widest text-emerald-400">{fileInfo.size}</span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        {/* CTA Audit */}
                        <div className="relative group/cta flex-1">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ff477b] to-indigo-600 rounded-[2rem] blur opacity-50 group-hover/cta:opacity-80 transition-opacity" />
                          <button
                            onClick={handleAudit}
                            disabled={loading}
                            className="relative w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#ff477b] to-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-70 overflow-hidden"
                          >
                            {loading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                                <span>{language === 'es' ? 'Analizando...' : 'Analyzing...'}</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                <span>{t.run_audit || (language === 'es' ? 'Ejecutar Auditoría' : 'Run Audit')}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Discard */}
                        <button
                          onClick={() => { setFile(null); setFileInfo(null); setImagePreview(null); }}
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
                          theme === 'dark' ? 'border-white/5 text-slate-600 bg-white/3' : 'border-slate-200 text-slate-400 bg-slate-50'
                        }`}>
                          {language === 'es' ? '⚡ 150 tokens' : '⚡ 150 tokens'}
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
                    <ScanEye className="w-5 h-5 text-[#ff477b] animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white uppercase tracking-[0.3em]">Neuro-Visual Scanner</p>
                    <p className="text-[11px] text-slate-500 font-medium">{AUDIT_STEPS_IMG[auditStep]}</p>
                  </div>
                  <div className="ml-auto text-[11px] font-black text-[#ff477b] tabular-nums">{auditProgress}%</div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#ff477b] to-indigo-500 rounded-full"
                    style={{ width: `${auditProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                {/* Steps */}
                <div className="flex gap-2 mt-4">
                  {AUDIT_STEPS_IMG.map((step, i) => (
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-12 pb-20"
          >
            {/* Strategic Context Header (The Filter/Layer) */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={`flex flex-col md:flex-row flex-wrap items-start md:items-center gap-6 ${theme === "dark" ? "glass-panel" : "bg-white border border-slate-200 shadow-xl"} px-6 md:px-10 py-6 rounded-[2rem] md:rounded-[3rem]`}
            >
              <div className={`flex items-center gap-4 pr-8 border-r ${theme === "dark" ? "border-white/10" : "border-slate-200"}`}>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                  <svg
                    className="w-5 h-5 text-primary"
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
                <p className={`text-[11px] font-black ${theme === "dark" ? "text-slate-400" : "text-slate-500"} uppercase tracking-[0.3em]`}>
                  Analysis Context
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className={`px-6 py-3 ${theme === "dark" ? "bg-white/5" : "bg-slate-50"} backdrop-blur-md border border-primary/30 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-[0_0_30px_rgba(255,73,124,0.1)] group`}>
                  <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_15px_theme(colors.primary)]"></span>
                  <span className="text-slate-500">Objective:</span>
                  <span className={`${theme === "dark" ? "text-primary" : "text-rose-600"} group-hover:scale-110 transition-transform`}>
                    {marketingObjective}
                  </span>
                </div>
                <div className={`px-6 py-3 ${theme === "dark" ? "bg-white/5" : "bg-slate-50"} backdrop-blur-md border border-indigo-500/30 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-[0_0_30px_rgba(99,102,241,0.1)] group`}>
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_15px_#6366F1]"></span>
                  <span className="text-slate-500">Platform:</span>
                  <span className="text-indigo-500 group-hover:scale-110 transition-transform">
                    {adPlatform}
                  </span>
                </div>
              </div>

              <div className="flex-grow"></div>

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownloadPdf}
                  className="bg-white/5 hover:bg-white/10 text-white px-8 md:px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center gap-4 border border-white/20 shadow-2xl min-w-[200px] justify-center"
                >
                  <Download className="w-5 h-5" />
                  <span>{language === "es" ? "DESCARGAR PDF" : "DOWNLOAD PDF"}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSendingEmail}
                  onClick={handleSendEmailReport}
                  className="bg-gradient-to-r from-primary to-indigo-600 text-white px-8 md:px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:shadow-[0_20px_40px_rgba(255,71,123,0.3)] transition-all flex items-center gap-4 border border-white/20 shadow-2xl relative min-w-[220px] justify-center disabled:opacity-50"
                >
                  {isSendingEmail ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Mail className="w-5 h-5" />
                  )}
                  <span>
                    {isSendingEmail 
                      ? (language === "es" ? "ENVIANDO..." : "SENDING...")
                      : (language === "es" ? "ENVIAR POR EMAIL" : "RECEIVE BY EMAIL")}
                  </span>
                </motion.button>
              </div>

              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleReset}
                title={
                  language === "es" ? "Reiniciar auditoría" : "Reset audit"
                }
                className={`${theme === "dark" ? "bg-white/5 text-rose-400 border-rose-500/20" : "bg-slate-50 text-rose-500 border-slate-200 shadow-sm"} px-6 md:px-8 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-rose-500/10 hover:text-rose-600 transition-all flex items-center gap-3 border group overflow-hidden relative`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <svg
                  className="w-5 h-5 transition-transform group-hover:-rotate-180 duration-500 relative z-10"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="relative z-10 hidden md:inline">
                  {language === "es" ? "Nueva Auditoría" : "New Audit"}
                </span>
              </motion.button>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-12">
              {/* Left Column: Visual Analysis & Heatmap */}
              <div className="lg:col-span-5 space-y-12">
                {/* Scorecard: Futuristic Glassmorphism */}
                <motion.div
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className={`${theme === "dark" ? "glass-panel" : "bg-white border border-slate-200 shadow-2xl"} rounded-[2rem] md:rounded-[4rem] p-8 md:p-16 text-center relative group w-full`}
                >
                  <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full group-hover:bg-primary/20 transition-all duration-1000"></div>
                  <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 blur-[120px] rounded-full"></div>

                  <div className="relative z-10 space-y-10">
                    <p className={`text-[12px] font-black ${theme === "dark" ? "text-slate-500" : "text-slate-400"} uppercase tracking-[0.4em] mb-6`}>
                      {t.overall_rating}
                    </p>

                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-white/5 blur-[80px] rounded-full scale-[2]"></div>
                      <motion.h3
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, type: "spring" }}
                        className={`text-6xl md:text-9xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"} tracking-tighter relative z-10 drop-shadow-[0_0_50px_rgba(255,255,255,0.3)] leading-none w-full break-keep whitespace-nowrap px-4 italic transform -skew-x-6`}
                      >
                        {result?.overallRating && result.overallRating !== "NaN" ? result.overallRating : "0/10"}
                      </motion.h3>
                    </div>

                    <div className="flex justify-center gap-4">
                      <div className="px-8 py-3 bg-gradient-to-r from-primary to-indigo-600 rounded-full text-[11px] font-black uppercase tracking-widest text-white shadow-[0_15px_30px_theme(colors.primary/40%)] border border-white/20">
                        PREMIUM NEURO-AUDIT
                      </div>
                    </div>

                    {/* Sprint 1 ① — PlatformGauge animated scores */}
                    <div className="grid grid-cols-3 gap-4 pt-10">
                      {Object.entries(result?.scores || {}).map(
                        ([key, val], idx) => (
                          <motion.div
                            key={key}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 + idx * 0.15 }}
                            className={`p-4 ${theme === "dark" ? "bg-white/3 border-white/5" : "bg-slate-50 border-slate-200 shadow-sm"} rounded-[2rem] border backdrop-blur-md flex items-center justify-center`}
                          >
                            <PlatformGauge
                              score={val as number}
                              platform={key.charAt(0).toUpperCase() + key.slice(1)}
                              size={100}
                              theme={theme}
                              animationDelay={0.5 + idx * 0.2}
                            />
                          </motion.div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* New Neuro-Predictive Metrics Panel */}
                  {result?.predictiveMetrics && (
                    <div className="mt-8 pt-8 border-t border-white/5 space-y-6 text-left">
                      <h5 className={`text-[11px] font-black ${theme === "dark" ? "text-slate-400" : "text-slate-500"} uppercase tracking-widest mb-4 flex items-center gap-2`}>
                        {t.neuronal_analysis}
                        <InfoTooltip
                          text={
                            language === "es"
                              ? "Métricas predictivas simulando la respuesta cognitiva y emocional del cerebro humano al ver el anuncio."
                              : "Predictive metrics simulating the cognitive and emotional response of the human brain when viewing the ad."
                          }
                        />
                      </h5>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          {
                            label: t.cognitive_demand,
                            val:
                              result?.predictiveMetrics?.cognitiveDemand ||
                              result?.predictiveMetrics?.cognitiveLoad ||
                              0,
                            inverse: true,
                            tooltip:
                              language === "es"
                                ? "Nivel de esfuerzo mental requerido para procesar el anuncio completo."
                                : "Mental effort required to process the complete ad.",
                          },
                          {
                            label: t.clarity_score,
                            val: result?.predictiveMetrics?.clarityScore,
                            tooltip:
                              language === "es"
                                ? "Claridad con la que se entiende la propuesta de valor y el mensaje principal."
                                : "Clarity with which the value proposition and main message are understood.",
                          },
                          {
                            label: t.focus_score,
                            val: result?.predictiveMetrics?.focusScore,
                            tooltip:
                              language === "es"
                                ? "Capacidad de guiar instintivamente la vista del usuario hacia el Call to Action."
                                : "Ability to instinctively guide the user's eye towards the Call to Action.",
                          },
                          {
                            label: t.engagement,
                            val: result?.predictiveMetrics?.engagementScore,
                            tooltip:
                              language === "es"
                                ? "Predicción algorítmica de la respuesta emocional y retención de interés."
                                : "Algorithmic prediction of emotional response and interest retention.",
                          },
                           {
                            label: t.recall_potential,
                            val: result?.predictiveMetrics?.recallScore,
                            tooltip:
                              language === "es"
                                ? "Probabilidad estadística de que la marca o producto sea recordado tras 24 horas."
                                : "Statistical probability that the brand or product will be remembered after 24 hours.",
                          },
                          {
                            label: language === "es" ? "Contraste" : "Contrast",
                            val: result?.predictiveMetrics?.contrastScore || 0,
                            tooltip:
                              language === "es"
                                ? "Equilibrio lumínico y cromático entre elementos y fondo."
                                : "Light and chromatic balance between elements and background.",
                          },
                          {
                            label: language === "es" ? "Legibilidad" : "Legibility",
                            val: result?.predictiveMetrics?.legibilityScore || 0,
                            tooltip:
                              language === "es"
                                ? "Claridad del texto y capacidad de lectura rápida."
                                : "Text clarity and rapid reading capability.",
                          },
                          {
                            label: language === "es" ? "Safe Zone" : "Safe Zone",
                            val: result?.predictiveMetrics?.safeZoneScore || 0,
                            tooltip:
                              language === "es"
                                ? "Cumplimiento de márgenes de seguridad para la plataforma seleccionada."
                                : "Compliance with safety margins for the selected platform.",
                          },
                        ].map((m, i) => (
                          <div
                            key={i}
                            className={`${theme === "dark" ? "glass-card hover:neon-cyan-glow" : "bg-white border border-slate-200 shadow-sm hover:shadow-md"} p-4 rounded-2xl transition-all group relative`}
                          >
                            <div className="text-[11px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2 relative z-10">
                              {m.label}
                              <InfoTooltip text={m.tooltip} />
                            </div>
                            <div className="flex items-end justify-between">
                              <span
                                className={`text-2xl font-black ${m.inverse ? (m.val < 40 ? "text-emerald-500" : m.val < 70 ? "text-yellow-500" : "text-rose-500") : m.val > 70 ? "text-emerald-500" : m.val > 40 ? "text-yellow-500" : "text-rose-500"}`}
                              >
                                {m.val}
                              </span>
                              <div className={`w-12 h-1 ${theme === "dark" ? "bg-white/10" : "bg-slate-100"} rounded-full overflow-hidden mb-2`}>
                                <div
                                  className={`h-full ${m.inverse ? (m.val < 40 ? "bg-emerald-500" : m.val < 70 ? "bg-yellow-500" : "bg-rose-500") : m.val > 70 ? "bg-emerald-500" : m.val > 40 ? "bg-yellow-500" : "bg-rose-500"}`}
                                  style={{ width: `${m.val}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* AOI Dashboard */}
                      {result?.aoiScores && (
                        <div className="space-y-4 pt-4">
                          <p className={`text-[11px] font-black ${theme === "dark" ? "text-slate-400" : "text-slate-500"} uppercase tracking-widest`}>
                            {t.benchmark_label}
                          </p>
                          {[
                            {
                              label: t.aoi_brand,
                              val: result?.aoiScores?.brand,
                              color: "bg-blue-400",
                            },
                            {
                              label: t.aoi_product,
                              val: result?.aoiScores?.product,
                              color: "bg-[#ff477b]",
                            },
                            {
                              label: t.aoi_cta,
                              val: result?.aoiScores?.cta,
                              color: "bg-emerald-400",
                            },
                          ].map((aoi, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-[11px] font-bold">
                                <span className={theme === "dark" ? "text-slate-300" : "text-slate-500"}>
                                  {aoi.label}
                                </span>
                                <span className={theme === "dark" ? "text-white" : "text-slate-900"}>{aoi.val}%</span>
                              </div>
                              <div className={`w-full h-1.5 ${theme === "dark" ? "bg-white/5" : "bg-slate-100"} rounded-full overflow-hidden`}>
                                <div
                                  className={`h-full ${aoi.color} shadow-lg`}
                                  style={{ width: `${aoi.val}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Scanpath Visualization */}
                      {result?.scanpath && result?.scanpath?.length > 0 && (
                        <div className={`space-y-4 pt-4 border-t ${theme === "dark" ? "border-white/5" : "border-slate-100"}`}>
                          <p className={`text-[11px] font-black ${theme === "dark" ? "text-slate-400" : "text-slate-500"} uppercase tracking-widest`}>
                            {t.scanpath}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {result?.scanpath?.map((step, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 bg-[#ff477b] text-white rounded-full text-[11px] font-black shadow-lg shadow-[#ff477b]/20">
                                  {i + 1}
                                </span>
                                <span className={`text-[11px] font-bold ${theme === "dark" ? "text-slate-300 bg-white/5 border-white/5" : "text-slate-600 bg-slate-50 border-slate-200"} px-2 py-1 rounded-lg border`}>
                                  {step.label}
                                </span>
                                {i < (result?.scanpath?.length || 0) - 1 && (
                                  <span className="text-slate-400 text-[11px]">
                                    →
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Attention Dashboard Table (Neurons Style) */}
                      {result?.elementAttention && result?.elementAttention?.length > 0 && (
                        <div className={`space-y-4 pt-4 border-t ${theme === "dark" ? "border-white/5" : "border-slate-100"}`}>
                          <p className={`text-[11px] font-black ${theme === "dark" ? "text-emerald-400" : "text-emerald-500"} uppercase tracking-widest`}>
                            {language === "es" ? "Dashboard de Atención por Elemento" : "Attention Dashboard by Element"}
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-[11px] border-collapse">
                              <thead>
                                <tr className={theme === "dark" ? "text-slate-500" : "text-slate-400"}>
                                  <th className="text-left py-2 capitalize">{language === "es" ? "Elemento" : "Element"}</th>
                                  <th className="text-right py-2">{language === "es" ? "Atención" : "Attention"}</th>
                                  <th className="text-right py-2">{language === "es" ? "Tiempo" : "Time"}</th>
                                  <th className="text-right py-2">{language === "es" ? "Alcance" : "Reach"}</th>
                                </tr>
                              </thead>
                              <tbody className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
                                {result?.elementAttention?.map((ea, i) => (
                                  <tr key={i} className={`border-b ${theme === "dark" ? "border-white/5" : "border-slate-50"}`}>
                                    <td className="py-2 font-bold">{ea.element}</td>
                                    <td className={`py-2 text-right font-black ${ea.totalAttention > 70 ? "text-emerald-400" : ea.totalAttention > 40 ? "text-yellow-400" : "text-rose-400"}`}>
                                      {ea.totalAttention}%
                                    </td>
                                    <td className="py-2 text-right">{ea.timeSpent}s</td>
                                    <td className="py-2 text-right">{ea.percentageSeen}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Platform Policy Compliance Audit */}
                      {result.complianceIssues && result.complianceIssues.length > 0 && (
                        <div className={`space-y-4 pt-4 border-t ${theme === "dark" ? "border-rose-500/20" : "border-rose-100"} bg-rose-500/5 p-4 rounded-2xl`}>
                          <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                            {language === "es" ? "Cumplimiento de Políticas Publicitarias" : "Advertising Policy Compliance"}
                          </p>
                          <div className="space-y-2">
                            {result.complianceIssues.map((issue, i) => (
                              <div key={i} className={`text-[11px] flex items-start gap-2 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                                <span className="mt-1">⚠</span>
                                <p className="font-medium">{issue}</p>
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px] font-bold text-rose-400 italic mt-2">
                             {language === "es" 
                               ? "* Estas son recomendaciones basadas en IA. Valide siempre con el soporte oficial de la plataforma." 
                               : "* These are AI-based recommendations. Always validate with official platform support."}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* Heatmap Viewer: Immersive Frame */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  className={`${theme === "dark" ? "glass-panel" : "bg-white border border-slate-200 shadow-2xl"} p-6 md:p-12 relative group w-full`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                   <div className="flex flex-wrap justify-between items-center mb-12 relative z-10 gap-6">
                    <div className="flex flex-col">
                      <h5 className="text-[12px] font-black text-[#ff477b] uppercase tracking-[0.4em] mb-2 flex items-center">
                        {t.visual_analysis}
                        <InfoTooltip text="Detección de puntos focales e intensidades de atención para priorizar elementos dentro de la imagen." />
                      </h5>
                      <div className="flex gap-4">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                          Neuromapping Engine v3.1 Active
                        </p>
                        {adPlatform !== "Universal / Multiplatform" && (
                          <button 
                            onClick={() => setShowSafeZones(!showSafeZones)}
                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${showSafeZones ? "bg-rose-500 text-white" : "bg-white/5 text-slate-500 border border-white/10"}`}
                          >
                            Safe Zones {showSafeZones ? "ON" : "OFF"}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <div className={`flex rounded-xl p-1 ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"} border`}>
                        {(["markers", "glow", "gaze-path"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => {
                              setHeatmapMode(m);
                              if (!showHeatmap) setShowHeatmap(true);
                            }}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${heatmapMode === m && showHeatmap ? "bg-[#ff477b] text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                          >
                            {m.replace("-", " ")}
                          </button>
                        ))}
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${showHeatmap ? "bg-[#ff477b] text-white shadow-[0_10px_30px_rgba(255,73,124,0.3)] border-white/20" : (theme === "dark" ? "bg-white/5 text-slate-400 hover:bg-primary hover:text-white hover:border-primary border-white/10" : "bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200")}`}
                      >
                        {showHeatmap ? t.hide_heatmap : t.view_heatmap}
                      </motion.button>
                    </div>
                  </div>

                  {/* Heatmap Legend */}
                  <div className={`flex flex-wrap items-center gap-4 md:gap-8 mb-8 px-6 py-4 ${theme === "dark" ? "bg-black/20 border-white/5" : "bg-slate-50 border-slate-200"} rounded-2xl border`}>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                      Leyenda Neuromapping:
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_10px_#ef4444]"></span>
                      <span className="text-[11px] text-slate-300 font-medium">
                        Alta Atención (Rojo)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-[#22c55e] shadow-[0_0_10px_#22c55e]"></span>
                      <span className="text-[11px] text-slate-300 font-medium">
                        Atención Media (Verde)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-[#3b82f6] shadow-[0_0_10px_#3b82f6]"></span>
                      <span className="text-[11px] text-slate-300 font-medium">
                        Atención Baja (Azul)
                      </span>
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.5)] bg-black transition-all duration-700 group-hover:scale-[1.02] group-hover:shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
                    <img
                      src={imagePreview!}
                      alt="Analyzed Ad"
                      className={`w-full h-auto object-contain block transition-opacity duration-700 ${showHeatmap ? "opacity-60 grayscale-[0.3]" : "opacity-100"}`}
                    />
                     <AnimatePresence>
                       {showHeatmap && (result.analysisPoints || result.predictiveMetrics?.scanpath) && (
                        <HeatmapOverlay 
                          points={heatmapMode === "gaze-path" 
                            ? (result.predictiveMetrics?.scanpath?.map(p => ({ ...p, relevance: 10 })) || result.analysisPoints) 
                            : result.analysisPoints} 
                          mode={heatmapMode}
                          theme={theme}
                        />
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {showSafeZones && (
                        <SafeZoneOverlay 
                          platform={adPlatform.includes("TikTok") ? "TikTok" : adPlatform.includes("Meta") || adPlatform.includes("Facebook") || adPlatform.includes("Instagram") ? "Meta" : "Generic"}
                          theme={theme}
                          violations={result?.safeZoneCompliance?.violations}
                        />
                      )}
                    </AnimatePresence>
                    {heatmapWarning && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-amber-500/90 text-black text-[11px] font-bold rounded-xl shadow-lg backdrop-blur-sm z-40 whitespace-nowrap">
                        <span>⚠️</span>
                        <span>Puntos de atención no disponibles para esta imagen</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Right Column: Text & Strategic Analysis */}
              <div className="lg:col-span-7 space-y-10">
                {/* Main Diagnosis */}
                <motion.div
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className={`${theme === "dark" ? "glass-panel" : "bg-white border border-slate-200 shadow-2xl"} p-6 md:p-12 relative`}
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full"></div>

                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <h4 className={`text-[12px] font-black ${theme === "dark" ? "text-[#ff477b]" : "text-rose-500"} uppercase tracking-[0.4em] mb-3 leading-none flex items-center`}>
                        {t.executive_summary}
                        <InfoTooltip text="Análisis general sobre la viabilidad de la imagen para convertir usuarios y captar tráfico cualificado." />
                      </h4>
                      <h3 className={`text-4xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"} tracking-tighter leading-tight uppercase italic`}>
                        Strategic{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-indigo-400">
                          Diagnosis
                        </span>
                      </h3>
                    </div>
                    <div className="flex gap-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleReset}
                        className={`${theme === "dark" ? "bg-white/5 text-slate-400 border-white/10" : "bg-slate-100 text-slate-600 border-slate-200"} px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary hover:text-white transition-all border`}
                      >
                        {language === "es" ? "Nueva Auditoría" : "New Audit"}
                      </motion.button>
                    </div>
                  </div>

                  <div className="space-y-8 relative z-10">
                    <div className="relative">
                      <div className="absolute -left-6 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#ff477b] to-indigo-600 rounded-full"></div>
                      <p className={`font-black leading-relaxed text-2xl tracking-tight ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                        {result?.executiveSummary || result?.overallRating}
                      </p>
                    </div>
                    <p className={`${theme === "dark" ? "text-slate-400 border-white/10" : "text-slate-500 border-slate-200"} text-lg font-medium pl-4 border-l leading-relaxed italic`}>
                      "{result?.visualCritique}"
                    </p>
                  </div>

                  {/* Neuromarketing Diagnosis */}
                  {result.neuroDiagnosis && (
                    <div className={`mt-12 pt-10 border-t ${theme === "dark" ? "border-white/10" : "border-slate-100"} grid md:grid-cols-3 gap-8`}>
                      {[
                        {
                          label: t.face_bias,
                          val: result.neuroDiagnosis.faceBias,
                          icon: (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          ),
                          color:
                            "bg-blue-500/10 text-blue-400 border-blue-500/20",
                        },
                        {
                          label: t.composition_rules,
                          val: result.neuroDiagnosis.ruleOfThirds,
                          icon: (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 10h16M4 15h16M10 4v16M15 4v16"
                              />
                            </svg>
                          ),
                          color:
                            "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                        },
                        {
                          label: "Cognitive Gestalt",
                          val: result.neuroDiagnosis.gestaltLaws,
                          icon: (
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
                              />
                            </svg>
                          ),
                          color:
                            "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        },
                      ].map((d, i) => (
                        <div key={i} className="space-y-4 group/item">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover/item:scale-110 duration-500 ${d.color}`}
                          >
                            {d.icon}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                              {d.label}
                            </p>
                            <p className={`text-[12px] ${theme === "dark" ? "text-slate-300" : "text-slate-600"} font-bold leading-relaxed`}>
                              {d.val}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
                {/* Advanced CRO & Landing Page UX Analysis */}
                {result?.croAnalysis && (
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    className={`${theme === "dark" ? "glass-panel neon-magenta-glow" : "bg-white border border-slate-200 shadow-2xl"} p-6 md:p-12 relative overflow-hidden group`}
                  >
                    <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#ff477b]/10 blur-[150px] rounded-full -ml-64 -mt-64 animate-pulse-slow"></div>
                    <div className="relative z-10 space-y-12">
                      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b ${theme === "dark" ? "border-white/10" : "border-slate-100"}`}>
                        <div className="space-y-4">
                          <div className="inline-flex items-center gap-3 px-6 py-2 bg-[#ff477b]/10 border border-[#ff477b]/30 rounded-full text-[#ff477b] text-[11px] font-black uppercase tracking-[0.3em]">
                            <span className="w-2 h-2 bg-[#ff477b] rounded-full animate-ping"></span>
                            Senior CRO Audit
                          </div>
                          <h4 className={`text-4xl md:text-6xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"} tracking-tighter uppercase italic leading-none`}>
                            UX <span className="text-[#ff477b]">FRICTION</span>
                          </h4>
                        </div>

                        {/* Traffic Context */}
                        <div className={`${theme === "dark" ? "bg-slate-950 border-white/5" : "bg-slate-50 border-slate-200"} p-6 rounded-[1.5rem] border flex gap-8 shadow-2xl`}>
                          <div>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">
                              Source
                            </p>
                            <p className="text-sm font-bold text-white">
                              {result?.croAnalysis?.trafficContext?.source ||
                                "N/A"}
                            </p>
                          </div>
                          <div className="w-px bg-white/10"></div>
                          <div>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">
                              Device
                            </p>
                            <p className="text-sm font-bold text-white">
                              {result?.croAnalysis?.trafficContext?.deviceMode ||
                                "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-6 md:gap-12">
                        {/* Left: Scroll & Friction */}
                        <div className="space-y-8">
                          {/* Drop-off */}
                          <div className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"} p-6 rounded-3xl border`}>
                            <div className="flex items-center justify-between mb-4">
                              <h5 className={`text-sm font-black ${theme === "dark" ? "text-slate-300" : "text-slate-600"} uppercase tracking-widest`}>
                                Critical Drop-off
                              </h5>
                              <span className="text-2xl font-black text-[#ff477b]">
                                {
                                  result?.croAnalysis?.scrollAnalysis
                                    ?.criticalDropOffPoint
                                }
                              </span>
                            </div>
                            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"} font-medium leading-relaxed mb-4`}>
                              <span className={theme === "dark" ? "text-white" : "text-slate-900"}>Reason:</span>{" "}
                              {result?.croAnalysis?.scrollAnalysis?.dropOffReason}
                            </p>
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-3 h-3 rounded-full ${result?.croAnalysis?.scrollAnalysis?.ctaVisibleBeforeDropOff ? "bg-emerald-500" : "bg-[#ff477b]"}`}
                              ></div>
                              <p className="text-xs font-bold text-slate-300">
                                {result?.croAnalysis?.scrollAnalysis
                                  ?.ctaVisibleBeforeDropOff
                                  ? "CTA is visible before users leave."
                                  : "CRITICAL: CTA is NOT visible before massive drop-off."}
                              </p>
                            </div>
                          </div>

                          {/* Friction Log */}
                          <div>
                            <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                              Interaction Friction Log
                            </h5>
                            <div className="space-y-4">
                              {(result?.croAnalysis?.interactionFriction || [])?.map(
                                (fric, i) => (
                                  <div
                                    key={i}
                                    className={`flex gap-4 p-4 ${theme === "dark" ? "bg-slate-950/50 border-white/5" : "bg-white border-slate-200 shadow-sm"} rounded-2xl border`}
                                  >
                                    <div className="mt-1">
                                      <div
                                        className={`w-2 h-2 rounded-full ${fric.severity === "CRITICAL" ? "bg-[#ff477b] animate-pulse" : fric.severity === "MODERATE" ? "bg-amber-500" : "bg-blue-500"}`}
                                      ></div>
                                    </div>
                                    <div>
                                      <p className={`text-[11px] font-black ${theme === "dark" ? "text-[#ff477b]" : "text-rose-600"} uppercase tracking-wider mb-1`}>
                                        {fric.type}
                                      </p>
                                      <p className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-slate-900"} mb-2`}>
                                        {fric.element}
                                      </p>
                                      <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"} italic`}>
                                        "{fric.uxHypothesis}"
                                      </p>
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Roadmap & Attention */}
                        <div className="space-y-8">
                          {/* Priority Fix */}
                          <div className="bg-gradient-to-br from-[#ff477b]/20 to-indigo-500/10 p-1 rounded-3xl">
                            <div className={`${theme === "dark" ? "bg-slate-950" : "bg-white"} p-6 md:p-8 rounded-[1.4rem] h-full shadow-xl`}>
                              <div className="flex items-center justify-between mb-6">
                                <h5 className={`text-sm font-black ${theme === "dark" ? "text-white" : "text-slate-900"} uppercase tracking-widest flex items-center gap-3`}>
                                  <span className="w-6 h-6 rounded-full bg-[#ff477b]/20 flex items-center justify-center text-[#ff477b]">
                                    ⚡
                                  </span>
                                  Priority Fix
                                </h5>
                                <div className="text-right">
                                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                                    Est. Uplift
                                  </p>
                                  <p className="text-xl font-black text-emerald-400">
                                    {
                                      result?.croAnalysis?.conversionRoadmap
                                        ?.estimatedConversionUplift
                                    }
                                  </p>
                                </div>
                              </div>
                              <p className={`text-lg md:text-xl ${theme === "dark" ? "text-white" : "text-slate-900"} font-bold leading-relaxed`}>
                                {
                                  result?.croAnalysis?.conversionRoadmap
                                    ?.priorityFix
                                }
                              </p>
                            </div>
                          </div>

                          {/* Secondary Optimizations */}
                          <div>
                            <h5 className={`text-xs font-black text-slate-500 uppercase tracking-widest mb-4 border-b ${theme === "dark" ? "border-white/10" : "border-slate-100"} pb-4`}>
                              Secondary Optimizations
                            </h5>
                            <ul className="space-y-3">
                              {(result?.croAnalysis?.conversionRoadmap?.secondaryOptimizations || [])?.map(
                                (opt, i) => (
                                  <li
                                    key={i}
                                    className={`flex gap-4 items-start text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"} font-medium`}
                                  >
                                    <span className={`${theme === "dark" ? "text-[#ff477b]" : "text-rose-500"} font-black mt-0.5`}>
                                      {(i + 1).toString().padStart(2, "0")}
                                    </span>
                                    {opt}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>

                          {/* High Attention Zones */}
                          {result?.croAnalysis?.scrollAnalysis
                            ?.highAttentionZones &&
                            (result?.croAnalysis?.scrollAnalysis?.highAttentionZones || [])
                              .length > 0 && (
                              <div>
                                <h5 className={`text-xs font-black text-slate-500 uppercase tracking-widest mb-4 border-b ${theme === "dark" ? "border-white/10" : "border-slate-100"} pb-4`}>
                                  High Attention Zones
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                  {(result?.croAnalysis?.scrollAnalysis?.highAttentionZones || [])?.map(
                                    (zone, i) => (
                                      <span
                                        key={i}
                                        className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-full border border-indigo-500/30"
                                      >
                                        {zone}
                                      </span>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Growth Verdict & Strategy Card */}
                {result.growthVerdict && (
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    className={`${theme === "dark" ? "glass-panel border-blue-500/30 neon-cyan-glow" : "bg-white border border-slate-200 shadow-2xl"} p-6 md:p-12 relative group`}
                  >
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full -mr-64 -mt-64 animate-pulse"></div>
                    <div className="relative z-10 space-y-12">
                      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b ${theme === "dark" ? "border-white/10" : "border-slate-100"}`}>
                        <div className="space-y-4">
                          <div className={`inline-flex items-center gap-3 px-6 py-2 ${theme === "dark" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-blue-50 border-blue-200 text-blue-600"} rounded-full text-[11px] font-black uppercase tracking-[0.3em]`}>
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></span>
                            Expert Growth Verdict
                          </div>
                          <h4 className={`text-4xl md:text-6xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"} tracking-tighter uppercase italic leading-none`}>
                            GROWTH{" "}
                            <span className="text-blue-500">DIAGNOSIS</span>
                          </h4>
                        </div>

                        {/* Uplift Meter */}
                        <div className={`${theme === "dark" ? "bg-slate-950 border-white/5" : "bg-slate-50 border-slate-200"} p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border flex flex-wrap items-center justify-center gap-6 md:gap-10 shadow-2xl w-full md:w-auto`}>
                          <div className="text-center w-full sm:w-auto flex-shrink-0">
                            <p className="text-[11px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-2 whitespace-nowrap">
                              Target Match
                            </p>
                            <p className={`text-4xl md:text-5xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                              {result.audienceMatchScore || 85}%
                            </p>
                          </div>
                          <div className="hidden sm:block h-16 w-px bg-white/10"></div>
                          <div className="text-center w-full sm:w-auto flex-shrink-0">
                            <p className="text-[11px] md:text-xs font-black text-emerald-500 uppercase tracking-widest mb-2">
                              Est. Uplift
                            </p>
                            <p className="text-4xl md:text-5xl font-black text-emerald-400">
                              {result.growthVerdict.conversionUpliftPotential ||
                                "+12%"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-6 md:gap-16">
                        <div className="space-y-10">
                          <div>
                            <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                              <span className="w-8 h-[1px] bg-emerald-500/30"></span>
                              {language === "es"
                                ? "FORTALEZAS CLAVE"
                                : "CORE STRENGTHS"}
                              <InfoTooltip text="Aspectos específicos positivos que favorecen fuertemente el engagement o la acción de tu cliente ideal." />
                            </div>
                            <div className="space-y-4">
                              {(result.growthVerdict.strengths || []).map(
                                (s, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-4 group/item"
                                  >
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover/item:scale-150 transition-transform"></div>
                                    <p className={`text-[14px] font-medium ${theme === "dark" ? "text-slate-300 group-hover/item:text-white" : "text-slate-600 group-hover/item:text-slate-900"} leading-relaxed transition-colors`}>
                                      {s}
                                    </p>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                              <span className="w-8 h-[1px] bg-rose-500/30"></span>
                              {language === "es"
                                ? "PUNTOS DE FUGA"
                                : "FRICTION POINTS"}
                              <InfoTooltip text="Carencias o bloqueos visuales/cognitivos responsables de una potencial pérdida de rendimiento (CTR bajo)." />
                            </div>
                            <div className="space-y-4">
                              {(result.growthVerdict.weaknesses || []).map(
                                (w, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-4 group/item"
                                  >
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 group-hover/item:scale-150 transition-transform"></div>
                                    <p className={`text-[14px] font-medium ${theme === "dark" ? "text-slate-300 group-hover/item:text-white" : "text-slate-600 group-hover/item:text-slate-900"} leading-relaxed transition-colors`}>
                                      {w}
                                    </p>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Sprint 1 ② — Priority Fix + Aplicar con Imagen 3 + A/B Slider */}
                        <div className={`${theme === "dark" ? "bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/20" : "bg-blue-50 border-blue-100"} p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border shadow-inner relative group/fix`}>
                          <div className="absolute -top-10 -right-10 text-[6rem] md:text-[10rem] font-black text-white/5 italic">
                            #1
                          </div>
                          <div className="text-[11px] font-black text-blue-400 uppercase tracking-[0.3em] mb-6 md:mb-8 relative z-10 flex items-center">
                            Priority Fix to Scale
                            <InfoTooltip text="La corrección principal recomendada que debes implementar para escalar el anuncio con mayor éxito." />
                          </div>
                          <h5 className={`text-xl md:text-2xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"} leading-relaxed uppercase italic mb-8 relative z-10 pr-12`}>
                            {result.growthVerdict.priorityFix}
                          </h5>

                          {/* Buttons row */}
                          <div className="relative z-10 flex flex-wrap items-center gap-3 mb-4">
                            <div className="px-8 py-3 bg-white text-slate-950 rounded-full font-black text-[11px] uppercase tracking-widest cursor-default">
                              Growth Insight Active
                            </div>
                            {imagePreview && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleApplyFix}
                                disabled={isApplyingFix}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full font-black text-[11px] uppercase tracking-widest shadow-lg hover:shadow-[0_10px_30px_rgba(99,102,241,0.35)] transition-all disabled:opacity-60"
                              >
                                {isApplyingFix ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>{language === "es" ? "Generando..." : "Generating..."}</span>
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="w-3.5 h-3.5" />
                                    <span>✨ {language === "es" ? "Aplicar con Imagen 3" : "Apply with Imagen 3"}</span>
                                  </>
                                )}
                              </motion.button>
                            )}
                          </div>

                          {/* A/B Before/After Slider */}
                          <AnimatePresence>
                            {fixedImageUrl && imagePreview && (
                              <motion.div
                                initial={{ opacity: 0, y: 20, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="relative z-10 space-y-4 overflow-hidden pt-2"
                              >
                                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                                  ← {language === "es" ? "Arrastra para comparar" : "Drag to compare"} →
                                </p>
                                <div className="relative w-full aspect-square max-w-xs mx-auto rounded-[1.5rem] overflow-hidden border border-indigo-500/40 shadow-2xl select-none">
                                  {/* AFTER — AI improved (background) */}
                                  <img src={fixedImageUrl} alt="IA Mejorada" className="absolute inset-0 w-full h-full object-cover" />
                                  {/* BEFORE — original (clipped left) */}
                                  <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - abSliderValue}% 0 0)` }}>
                                    <img src={imagePreview} alt="Original" className="absolute inset-0 w-full h-full object-cover" />
                                  </div>
                                  {/* Labels */}
                                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/75 backdrop-blur-sm rounded-full text-[11px] font-black text-white uppercase tracking-widest pointer-events-none">ANTES</span>
                                  <span className="absolute top-3 right-3 px-2.5 py-1 bg-indigo-600/80 backdrop-blur-sm rounded-full text-[11px] font-black text-white uppercase tracking-widest pointer-events-none">DESPUÉS IA ✨</span>
                                  {/* Divider line + handle */}
                                  <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)] pointer-events-none" style={{ left: `${abSliderValue}%` }}>
                                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-white rounded-full shadow-xl flex items-center justify-center">
                                      <svg className="w-3.5 h-3.5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 9l-3 3 3 3m8-6l3 3-3 3" />
                                      </svg>
                                    </div>
                                  </div>
                                  {/* Invisible range input */}
                                  <input
                                    type="range" min={0} max={100} value={abSliderValue}
                                    onChange={(e) => setAbSliderValue(Number(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                                  />
                                </div>
                                <a
                                  href={fixedImageUrl} download="imagen-mejorada-ia.png"
                                  target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all"
                                >
                                  <Download className="w-3 h-3" />
                                  {language === "es" ? "Descargar versión mejorada" : "Download improved version"}
                                </a>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Copywriting & Recommendations */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  className={`${theme === "dark" ? "glass-panel" : "bg-white border border-slate-200 shadow-2xl"} p-6 md:p-12 relative`}
                >
                  <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full"></div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-12">
                      <div className={`w-12 h-12 rounded-2xl ${theme === "dark" ? "bg-white/5 border-white/10 text-indigo-400" : "bg-indigo-50 border-indigo-100 text-indigo-600"} border flex items-center justify-center font-black`}>
                        02
                      </div>
                      <h5 className={`text-3xl font-black ${theme === "dark" ? "text-white" : "text-slate-900"} tracking-tighter uppercase italic leading-none flex items-center`}>
                        {t.copywriting_ctas}
                        <InfoTooltip text="Textos complementarios adaptados para el anuncio y sugerencia de llamadas a la acción." />
                      </h5>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 md:gap-12">
                      <div className="space-y-10">
                        <div className="grid grid-cols-2 gap-6 pb-6 border-b border-slate-700/50">
                          <div>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                              {t.suggested_titles}
                            </p>
                            <div className="space-y-2">
                              {(result.headlines || []).slice(0, 2).map((h, i) => (
                                <p key={i} className={`text-xs font-bold ${theme === "dark" ? "text-slate-300" : "text-slate-700"} bg-white/5 p-2 rounded border border-white/5`}>{h}</p>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                              {t.ctas}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(result.suggestedCTAs || []).map((cta, i) => (
                                <span key={i} className="px-3 py-1 bg-indigo-500/10 text-indigo-300 rounded text-[10px] font-bold border border-indigo-500/20">{cta}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className={`p-6 rounded-2xl border relative shadow-inner ${theme === "dark" ? "bg-slate-950/50 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                          <p className={`text-[11px] font-black ${theme === "dark" ? "text-brand-neon" : "text-brand-neon-light"} uppercase tracking-[0.2em] mb-4 flex items-center gap-2`}>
                            Justificación del Copy (Psicología)
                          </p>
                          <div className="space-y-3">
                            {(result.creativeReferences || []).map((ref, i) => (
                              <p key={i} className={`text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                                <span className="font-bold text-white mr-2">{ref.referenceId}:</span>{ref.description}
                              </p>
                            )) || (
                              <p className="text-xs text-white/50">Selecciona una referencia arriba para inspirar la redacción.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="relative">
                        <div className={`absolute inset-0 bg-gradient-to-br from-brand-neon/5 to-transparent rounded-3xl -m-4 opacity-50 z-0`} />
                        <div className="relative z-10 w-full flex flex-col gap-6">
                           <div className={`p-8 rounded-[2.5rem] ${theme === 'dark' ? 'bg-slate-900/50 border-white/5' : 'bg-white border-slate-200 shadow-xl'} border relative overflow-hidden`}>
                              <h3 className={`text-xs font-black tracking-widest uppercase mb-6 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>Psicología de Conversión</h3>
                              <div className="space-y-6">
                                {result.justification && (
                                  <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>Justificación Estratégica</p>
                                    <p className={`text-sm font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{result.justification}</p>
                                  </div>
                                )}
                                {result.neuroAnalysis && (
                                  <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>Análisis Neuromarketing</p>
                                    <p className={`text-sm font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{result.neuroAnalysis}</p>
                                  </div>
                                )}
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Psychological Hooks — Sección original restaurada */}
                    {(result.psychologicalHooks || []).length > 0 && (
                      <div className={`mt-8 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border relative shadow-inner ${theme === "dark" ? "bg-slate-950/50 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                        <div className="absolute top-0 right-0 p-8">
                          <span className={`text-[4rem] font-black ${theme === "dark" ? "text-white/5" : "text-slate-900/5"} leading-none select-none italic`}>
                            #1
                          </span>
                        </div>
                        <p className={`text-[11px] font-black ${theme === "dark" ? "text-[#ff477b]" : "text-rose-600"} uppercase tracking-[0.2em] mb-8 flex items-center gap-2`}>
                          <span className="w-2 h-2 bg-[#ff477b] rounded-full animate-pulse"></span>
                          {t.hooks} ({result.marketingObjective || "Strategic"})
                        </p>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {result.psychologicalHooks.map((hook, i) => (
                            <motion.div
                              key={i}
                              whileHover={{ x: 5 }}
                              className={`flex items-start gap-4 p-4 rounded-2xl ${theme === "dark" ? "hover:bg-primary hover:text-white hover:border-primary" : "hover:bg-primary hover:text-white hover:border-primary"} transition-all`}
                            >
                              <span className={`flex-shrink-0 w-8 h-8 rounded-full ${theme === "dark" ? "bg-[#ff477b]/10 text-[#ff477b]" : "bg-rose-50 text-rose-600"} flex items-center justify-center text-xs font-black`}>
                                {i + 1}
                              </span>
                              <span className={`text-[14px] font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"} leading-relaxed tracking-tight`}>
                                {hook}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>


                {/* AI Improvement Prompt */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  className={`${theme === "dark" ? "bg-indigo-600/10 backdrop-blur-2xl border-indigo-500/30" : "bg-indigo-50 border-indigo-100"} p-6 md:p-10 rounded-[2rem] md:rounded-[3.5rem] border relative`}
                >
                  <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px]"></div>
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <h5 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.3em] flex items-center gap-3">
                      <span className="w-10 h-[2px] bg-indigo-500/30"></span>
                      {t.improvement_prompt}
                      <InfoTooltip
                        text={
                          language === "es"
                            ? "Prompt optimizado listo para copiar y pegar en Midjourney o similar para generar iteraciones visuales ganadoras."
                            : "Optimized prompt ready to copy and paste into Midjourney or similar to generate winning visual iterations."
                        }
                      />
                    </h5>
                    <motion.button
                      whileHover={{
                        scale: 1.05,
                        backgroundColor: theme === "dark" ? "rgba(99, 102, 241, 0.2)" : "rgba(99, 102, 241, 0.1)",
                      }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        navigator.clipboard.writeText(
                          result.improvementPrompt || "",
                        )
                      }
                      className={`p-4 ${theme === "dark" ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-white text-indigo-600 border-indigo-100"} rounded-2xl transition-all flex items-center gap-3 border shadow-sm`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-[11px] font-black uppercase tracking-widest">
                        {t.copy_prompt}
                      </span>
                    </motion.button>
                  </div>
                  <div className="relative z-10">
                    <div className={`${theme === "dark" ? "bg-slate-950/80 border-indigo-500/20" : "bg-white border-indigo-100"} p-8 rounded-[2rem] border shadow-2xl relative group`}>
                      <div className="absolute top-4 right-6 text-[11px] font-black text-indigo-500/30 uppercase tracking-widest">
                        Growth Engine v2
                      </div>
                      <p className={`text-[13px] font-mono ${theme === "dark" ? "text-indigo-300/90" : "text-indigo-600"} leading-relaxed break-words selection:bg-indigo-500/30`}>
                        {result.improvementPrompt ||
                          (language === "es"
                            ? "Prompt de mejora no disponible para este análisis (Se generará en futuros escaneos)."
                            : "Improvement prompt not available for this analysis (Will be generated on future scans).")}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* ═══════════════════════════════════════════════════════
                    NEURO-CREATIVE SCORE (NCS) — TRIBE v2-Inspired Panel
                    ═══════════════════════════════════════════════════════ */}
                {result.neuroCreativeScore && (
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className={`${theme === "dark" ? "glass-panel border-white/10" : "bg-white border-slate-200 shadow-2xl"} p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border relative overflow-hidden`}
                  >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-6 mb-10 relative z-10">
                      <div>
                        <p className="text-[11px] font-black text-violet-400 uppercase tracking-[0.4em] mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                          {language === "es" ? "Neuro-Creative Score · Metodología TRIBE v2" : "Neuro-Creative Score · TRIBE v2 Methodology"}
                        </p>
                        <h4 className={`text-2xl font-black tracking-tight ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                          {language === "es" ? "Segmentación Cognitiva Predictiva" : "Predictive Cognitive Segmentation"}
                        </h4>
                        <p className={`text-[11px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"} font-medium mt-1 mb-4`}>
                          {result.neuroCreativeScore.executiveInsight}
                        </p>
                        {result.neuroCreativeScore.overallRecommendation && (
                          <div className={`mt-4 p-4 rounded-xl border ${theme === 'dark' ? 'bg-violet-500/10 border-violet-500/20' : 'bg-violet-50 border-violet-100'}`}>
                            <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">
                              {TRANSLATIONS[language].recommended_action}
                            </p>
                            <p className={`text-xs leading-relaxed font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                              {result.neuroCreativeScore.overallRecommendation}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Composite Score Pill */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className={`relative flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 ${
                          result.neuroCreativeScore.tier === "elite" ? "border-violet-500 shadow-[0_0_40px_rgba(139,92,246,0.4)]" :
                          result.neuroCreativeScore.tier === "strong" ? "border-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.3)]" :
                          result.neuroCreativeScore.tier === "average" ? "border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]" :
                          "border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
                        } ${theme === "dark" ? "bg-slate-950" : "bg-white"}`}>
                          <span className={`text-3xl font-black ${
                            result.neuroCreativeScore.tier === "elite" ? "text-violet-400" :
                            result.neuroCreativeScore.tier === "strong" ? "text-cyan-400" :
                            result.neuroCreativeScore.tier === "average" ? "text-yellow-400" : "text-rose-400"
                          }`}>
                            {result.neuroCreativeScore.composite}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>NCS</span>
                          {/* Tier badge */}
                          <span className={`absolute -bottom-3 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white ${
                            result.neuroCreativeScore.tier === "elite" ? "bg-violet-500" :
                            result.neuroCreativeScore.tier === "strong" ? "bg-cyan-500" :
                            result.neuroCreativeScore.tier === "average" ? "bg-yellow-500" : "bg-rose-500"
                          }`}>
                            {result.neuroCreativeScore.tier}
                          </span>
                        </div>

                        {/* KPIs column */}
                        <div className="space-y-3">
                          <div className={`px-4 py-2 rounded-xl ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"} border`}>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              {language === "es" ? "Δ Benchmark" : "Δ Benchmark"}
                            </p>
                            <p className={`text-base font-black ${(result.neuroCreativeScore.benchmarkDelta || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {(result.neuroCreativeScore.benchmarkDelta || 0) >= 0 ? "+" : ""}{result.neuroCreativeScore.benchmarkDelta}
                            </p>
                          </div>
                          <div className={`px-4 py-2 rounded-xl ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"} border`}>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              {language === "es" ? "Recall Pred." : "Pred. Recall"}
                            </p>
                            <p className="text-base font-black text-cyan-400">{result.neuroCreativeScore.predictedRecall}%</p>
                          </div>
                          <div className={`px-4 py-2 rounded-xl ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"} border`}>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                              {language === "es" ? "Engagement Lift" : "Engagement Lift"}
                            </p>
                            <p className={`text-base font-black ${(result.neuroCreativeScore.predictedEngagementLift || "").startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}>
                              {result.neuroCreativeScore.predictedEngagementLift}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 4 ROI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 relative z-10">
                      {[
                        {
                          key: "attentionROI" as const,
                          label: language === "es" ? "Atención Visual" : "Visual Attention",
                          weight: "30%",
                          icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                          color: "from-violet-500 to-indigo-500",
                          glow: "shadow-[0_0_20px_rgba(139,92,246,0.2)]",
                          border: "border-violet-500/20",
                        },
                        {
                          key: "emotionROI" as const,
                          label: language === "es" ? "Carga Emocional" : "Emotional Load",
                          weight: "25%",
                          icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
                          color: "from-rose-500 to-pink-500",
                          glow: "shadow-[0_0_20px_rgba(244,63,94,0.2)]",
                          border: "border-rose-500/20",
                        },
                        {
                          key: "decisionROI" as const,
                          label: language === "es" ? "Gatillos de Decisión" : "Decision Triggers",
                          weight: "25%",
                          icon: "M13 10V3L4 14h7v7l9-11h-7z",
                          color: "from-amber-500 to-orange-500",
                          glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]",
                          border: "border-amber-500/20",
                        },
                        {
                          key: "cognitiveLoadROI" as const,
                          label: language === "es" ? "Carga Cognitiva" : "Cognitive Load",
                          weight: "20%",
                          icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
                          color: "from-cyan-500 to-teal-500",
                          glow: "shadow-[0_0_20px_rgba(6,182,212,0.2)]",
                          border: "border-cyan-500/20",
                          inverse: true,
                        },
                      ].map((roi) => {
                        const roiData = result.neuroCreativeScore![roi.key];
                        if (!roiData) return null;
                        const score = roiData.score ?? 0;
                        const isGood = roi.inverse ? score >= 70 : score >= 70;
                        const scoreColor = isGood ? "text-emerald-400" : score >= 45 ? "text-yellow-400" : "text-rose-400";
                        const barColor = isGood ? "bg-emerald-500" : score >= 45 ? "bg-yellow-500" : "bg-rose-500";
                        return (
                          <div
                            key={roi.key}
                            className={`${theme === "dark" ? "bg-white/3 border-white/8" : "bg-slate-50 border-slate-200"} border ${roi.border} rounded-[1.5rem] p-5 space-y-4 hover:${roi.glow} transition-all duration-300 group`}
                          >
                            {/* ROI Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${roi.color} flex items-center justify-center flex-shrink-0`}>
                                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={roi.icon} />
                                  </svg>
                                </div>
                                <div>
                                  <p className={`text-[10px] font-black ${theme === "dark" ? "text-slate-400" : "text-slate-500"} uppercase tracking-widest leading-none`}>
                                    {roi.label}
                                  </p>
                                  <p className="text-[9px] text-slate-600 uppercase tracking-widest">
                                    {language === "es" ? `Peso: ${roi.weight}` : `Weight: ${roi.weight}`}
                                    {roi.inverse ? (language === "es" ? " · Invertida" : " · Inverted") : ""}
                                  </p>
                                </div>
                              </div>
                              {/* Confidence badge */}
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                roiData.confidence === "high" ? "bg-emerald-500/10 text-emerald-400" :
                                roiData.confidence === "medium" ? "bg-yellow-500/10 text-yellow-400" :
                                "bg-slate-500/10 text-slate-500"
                              }`}>
                                {roiData.confidence}
                              </span>
                            </div>

                            {/* Score */}
                            <div className="flex items-end gap-2">
                              <span className={`text-4xl font-black ${scoreColor} leading-none`}>{score}</span>
                              <span className={`text-[10px] font-bold ${theme === "dark" ? "text-slate-600" : "text-slate-400"} pb-1`}>/100</span>
                            </div>

                            {/* Score bar */}
                            <div className={`w-full h-1.5 ${theme === "dark" ? "bg-white/8" : "bg-slate-200"} rounded-full overflow-hidden`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${score}%` }}
                                transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
                                className={`h-full ${barColor} rounded-full`}
                              />
                            </div>

                            {/* Dominant elements */}
                            {roiData.dominantElements && roiData.dominantElements.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {roiData.dominantElements.slice(0, 3).map((el, i) => (
                                  <span key={i} className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${theme === "dark" ? "bg-white/5 border-white/10 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-500"} border`}>
                                    {el}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Recommendation */}
                            {roiData.recommendation && (
                              <p className={`text-[10px] ${theme === "dark" ? "text-slate-400" : "text-slate-500"} leading-relaxed border-t ${theme === "dark" ? "border-white/5" : "border-slate-100"} pt-3`}>
                                {roiData.recommendation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Formula footnote */}
                    <p className={`text-[9px] font-mono ${theme === "dark" ? "text-slate-700" : "text-slate-300"} mt-6 text-right relative z-10`}>
                      NCS = (Atención×0.30) + (Emoción×0.25) + (Decisión×0.25) + (Carga×0.20) · Inspired by Meta TRIBE v2
                    </p>
                  </motion.div>
                )}

                {/* Bottom Suggestions & Compliance */}
                <div className="grid md:grid-cols-2 gap-8">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    className={`${theme === "dark" ? "glass-card" : "bg-white border border-slate-200 shadow-xl"} p-6 md:p-10 rounded-[2rem] md:rounded-[3rem]`}
                  >
                    <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">
                      {t.suggestions}
                    </h5>
                    <div className="space-y-5">
                      {(result.creativeSuggestions || []).map((s, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-4 p-4 rounded-2xl ${theme === "dark" ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"} border hover:border-emerald-500/30 transition-all duration-500`}
                        >
                          <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[11px] font-black">
                            ✓
                          </span>
                          <span className={`text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-600"} leading-relaxed tracking-tight`}>
                            {s}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className={`${theme === "dark" ? "glass-card" : "bg-white border border-slate-200 shadow-xl"} p-6 md:p-10 rounded-[2rem] md:rounded-[3rem]`}
                  >
                    <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">
                      {t.compliance_issues}
                    </h5>
                    {(result.complianceIssues || []).length > 0 ? (
                      <div className="space-y-5">
                        {(result.complianceIssues || []).map((issue, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-4 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/30 transition-all duration-500"
                          >
                            <span className="text-rose-400 text-lg">⚠</span>
                            <span className="text-sm font-medium text-rose-300 leading-relaxed tracking-tight">
                              {issue}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`h-full flex flex-col items-center justify-center gap-6 p-8 ${theme === "dark" ? "bg-emerald-500/5 border-emerald-500/10" : "bg-emerald-50 border-emerald-100"} rounded-[2.5rem] border border-dashed`}>
                        <div className={`w-20 h-20 rounded-full ${theme === "dark" ? "bg-emerald-500/10" : "bg-white"} flex items-center justify-center shadow-sm`}>
                          <svg
                            className="w-10 h-10 text-emerald-400"
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
                        <div className="text-center">
                          <span className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.4em]">
                            {t.safe_label}
                          </span>
                          <p className={`text-[11px] ${theme === "dark" ? "text-slate-500" : "text-slate-400"} font-bold uppercase mt-2 tracking-widest`}>
                            Brand Safety Verified
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
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
              feature="image-audit"
              userId={user?.id || "guest"}
              userRole={user?.role}
              context={JSON.stringify({ fileName: fileInfo?.name, objective: marketingObjective, platform: adPlatform })}
              aiResponse={result?.executiveSummary?.substring(0, 500)}
            />
          </section>
        )}
      </div>
    </div>
  );
};

export default ImageAuditView;
