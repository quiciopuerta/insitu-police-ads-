import { buildAbsoluteUrl } from "../utils/apiConfig";
import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrafficCheckResult, AuthUser, Language } from "../types";
import { performTrafficCheck } from "../services/geminiService";

import { martechService } from "../services/martechService";
import { InfoTooltip } from "./ui/InfoTooltip";
const SEOGapAnalysis = lazy(() => import("./SEOGapAnalysis"));
import PageSpeedWidget from "./PageSpeedWidget";
import { FeedbackWidget } from "./ui/FeedbackWidget";
import Toast, { ToastData } from "./Toast";
import { AdminDiagnosticPanel } from "./ui/AdminDiagnosticPanel";
import { FeatureGate } from "./ui/FeatureGate";
import { SearchConsolePanel } from "./SearchConsolePanel";
import { TrendingUp, Globe, BarChart3, ShieldCheck, Zap } from "lucide-react";

interface TrafficCheckerProps {
  user: AuthUser | null;
  onUpgrade: () => void;
  language: Language;
  restoredAudit?: TrafficCheckResult | null;
  onSaveAudit?: (res: TrafficCheckResult, q: any) => void;
}

const TrafficChecker: React.FC<TrafficCheckerProps> = ({
  user,
  onUpgrade,
  language,
  restoredAudit,
  onSaveAudit,
}) => {
  const [domain, setDomain] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Global");
  const [selectedPeriod, setSelectedPeriod] = useState<
    "30d" | "90d" | "6m" | "12m"
  >("90d");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TrafficCheckResult | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [auditHistory, setAuditHistory] = useState<
    { domain: string; result: TrafficCheckResult }[]
  >([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'competitors' | 'keywords' | 'diagnosis'>('overview');
  const [showAllSections, setShowAllSections] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const storedHistory = localStorage.getItem("insitu_traffic_history");
    if (storedHistory) {
      try {
        setAuditHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Error loading history", e);
      }
    }

    // Inicializar o limpiar el contador basado en el tiempo
    const storedUsage = localStorage.getItem("insitu_free_traffic_usage_data");
    if (storedUsage) {
      const { count, timestamp } = JSON.parse(storedUsage);
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

      // Si han pasado más de 7 días, reiniciar contador
      if (Date.now() - timestamp > sevenDaysInMs) {
        setUsageCount(0);
        localStorage.removeItem("insitu_free_traffic_usage_data");
      } else {
        setUsageCount(count);
      }
    }
  }, []);

  useEffect(() => {
    if (restoredAudit) {
      setResult(restoredAudit);
      setDomain(restoredAudit.domain || "");
    }
  }, [restoredAudit]);

  const isAdminUser = user?.role === 'superAdmin' || user?.role === 'admin';
  const isGrowthPlan =
    isAdminUser ||
    user?.subscription?.plan === "Growth" ||
    user?.subscription?.plan === "Agency";
  // Permitir uso si es Growth/Agency O si no ha alcanzado límite (incluso sin user - anónimo)
  const hasReachedLimit = !isGrowthPlan && usageCount >= 2;

 
  const handleCheck = async (e?: React.FormEvent, forceRefresh: boolean = false) => {
    if (e) e.preventDefault();
    if (!domain) return;

    if (hasReachedLimit) {
      // The FeatureGate will handle the UI prompt, so this should not be reachable
      // via the button, but keeping as safety.
      onUpgrade();
      return;
    }

    if (
      user &&
      user.usageLimit &&
      (user.totalTokensUsed || 0) >= user.usageLimit
    ) {
      alert(
        language === "es"
          ? "Has alcanzado tu límite de tokens. Contacta al administrador."
          : "You have reached your token limit. Contact administrator.",
      );
      return;
    }

    setIsAnalyzing(true);
    try {
      const data = await performTrafficCheck(
        domain,
        selectedCountry,
        language,
        selectedPeriod,
        forceRefresh
      );
      setResult(data);
      onSaveAudit?.(data, {
        domain,
        country: selectedCountry,
        period: selectedPeriod,
      });

      const newHistory = [
        { domain, result: data },
        ...auditHistory.filter((h) => h.domain !== domain),
      ].slice(0, 5);
      setAuditHistory(newHistory);
      localStorage.setItem(
        "insitu_traffic_history",
        JSON.stringify(newHistory),
      );

      if (!isGrowthPlan) {
        const newCount = usageCount + 1;
        setUsageCount(newCount);

        // Guardar uso con timestamp actual o mantener el original si ya existe para contar los 7 días desde el primer uso
        const storedUsage = localStorage.getItem(
          "insitu_free_traffic_usage_data",
        );
        const timestamp = storedUsage
          ? JSON.parse(storedUsage).timestamp
          : Date.now();

        localStorage.setItem(
          "insitu_free_traffic_usage_data",
          JSON.stringify({
            count: newCount,
            timestamp: timestamp,
          }),
        );
      }

      martechService.trackEngagement('run_audit', {
        type: 'traffic_audit',
        domain: domain,
        country: selectedCountry,
        period: selectedPeriod
      });
    } catch (error: any) {
      console.error("Error checking traffic", error);
      const msg = error.message || (language === "es" ? "Error desconocido" : "Unknown error");
      setToast({
        type: "error",
        title: language === "es" ? "Error de Neuronal Link" : "Neural Link Error",
        message: (language === "es"
          ? "Error al analizar el dominio: "
          : "Error analyzing domain: ") + msg
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setDomain("");
    setSelectedCountry("Global");
    setSelectedPeriod("90d");
    setActiveTab('overview');
    setShowAllSections(false);
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    try {
      const fileName = `traffic_report_${domain.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      console.log(`[TrafficChecker] Initiating PDF download: ${fileName}`);
      
      // Dynamic import to optimize bundle size
      const { generateGoogleStylePDF } = await import("../utils/exportUtils");
      
      await generateGoogleStylePDF("traffic", result, fileName, language, { user });
      martechService.trackEngagement('export_pdf', {
        type: 'traffic_audit',
        format: 'pdf',
        domain: domain
      });
    } catch (error) {
      console.error("CRITICAL ERROR generating Traffic PDF:", error);
      alert(
        language === "es"
          ? `Error al generar el PDF: ${(error as any).message || "Error desconocido"}. Por favor, inténtalo de nuevo.`
          : `Error generating PDF: ${(error as any).message || "Unknown error"}. Please try again.`,
      );
    }
  };

  const handleSendEmailReport = async () => {
    if (!result) return;
    const emailStr = window.prompt(
      language === "es" ? "Ingresa el email donde enviar el reporte PDF:" : "Enter the email to send the PDF report to:",
      user?.email || ""
    );
    if (!emailStr?.trim()) return;
    const fileName = `traffic_report_${domain.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
    setToast({ title: language === "es" ? "Generando PDF..." : "Generating PDF...", message: language === "es" ? "Esto puede tomar unos segundos." : "This may take a few seconds.", type: "info" });
    try {
      const { generateGoogleStylePDF } = await import("../utils/exportUtils");
      const pdfBase64 = await generateGoogleStylePDF("traffic", result, fileName, language, { user, action: "return" }) as string;
      if (!pdfBase64) throw new Error("PDF generation returned empty");
      const response = await fetch(buildAbsoluteUrl('/.netlify/functions/api-send-report'), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(user?.id ? { "X-User-Id": user.id } : {})
        },
        body: JSON.stringify({ email: emailStr.trim(), pdfBase64, fileName, domain, reportType: "Auditoría de Tráfico SEO", language })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      setToast({ title: language === "es" ? "Email Enviado ✓" : "Email Sent ✓", message: language === "es" ? `Reporte enviado a ${emailStr.trim()}` : `Report sent to ${emailStr.trim()}`, type: "success" });
    } catch (err: any) {
      console.error("[TrafficChecker] Email error:", err);
      setToast({ title: language === "es" ? "Error de Envío" : "Send Error", message: err?.message || (language === "es" ? "No se pudo enviar el email." : "Could not send email."), type: "error" });
    }
  };

  const handleDownloadCSV = async () => {
    if (!result) return;
    try {
      // Dynamic import to optimize bundle size
      const { generateAgencyExport } = await import("../utils/exportUtils");
      
      generateAgencyExport(result, domain);
      martechService.trackEngagement('export_pdf', {
        type: 'traffic_audit',
        format: 'csv',
        domain: domain
      });
    } catch (error) {
      console.error("Error generating CSV:", error);
      alert(
        language === "es"
          ? "Error al generar los archivos CSV. Inténtalo de nuevo."
          : "Error generating CSV. Please try again.",
      );
    }
  };

  const isSuperAdmin = user?.role === 'superAdmin' || user?.email === 'sanchezfj@me.com' || user?.email === 'sociopuerta@gmail.com';

  return (
    <div className="min-h-screen text-white pb-32 selection:bg-[#ff477b]/30 selection:text-white">
      {/* Notifications */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      {/* Premium Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff477b]/10 blur-[120px] rounded-full animate-pulse-slow animation-delay-2000"></div>
        <div className="absolute top-[30%] right-[10%] w-[20%] h-[20%] bg-blue-500/5 blur-[80px] rounded-full animate-pulse-slow animation-delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-20 relative z-10">
        <div className="mb-20 text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 md:gap-3 px-4 md:px-8 py-2 md:py-3 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full text-slate-400 text-[11px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] mb-4 shadow-2xl text-center max-w-[90vw]"
          >
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            Intelligence Engine • Web Traffic
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1 }}
            className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-tight uppercase"
          >
            Deep Scan: <br />
            <span className="text-white">
              {language === "es" ? "Tráfico Competitivo" : "Competitor Traffic"}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-slate-400 font-medium text-sm md:text-xl max-w-3xl mx-auto leading-relaxed border-x-0 md:border-x border-white/5 px-2 md:px-12"
          >
            Unleash the full potential of domain intelligence with neural-link analysis.
          </motion.p>
        </div>

        <FeatureGate
          user={user}
          allowedPlans={['Growth', 'Agency']}
          featureName={language === 'es' ? 'Deep Scan: Tráfico' : 'Deep Scan: Traffic'}
          language={language}
          onUpgrade={onUpgrade}
        >
          <form
            onSubmit={handleCheck}
            className="mb-24 space-y-8 max-w-5xl mx-auto"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="glass-panel p-4 flex flex-col md:flex-row gap-4 relative group"
            >
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 blur-[120px] rounded-full -mr-40 -mt-40 group-hover:bg-indigo-500/10 transition-all duration-1000"></div>
              <div className="relative md:w-1/3 z-10">
                <label htmlFor="country-select" className="sr-only">{language === 'es' ? 'País' : 'Country'}</label>
                <select
                  id="country-select"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-[2.5rem] py-4 md:py-7 px-6 md:px-10 text-xs md:text-[12px] font-black uppercase tracking-[0.2em] outline-none appearance-none cursor-pointer hover:bg-primary hover:text-white hover:border-primary transition-all shadow-inner focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                >
                  <option value="Global">🌐 Global (Worldwide)</option>
                  <optgroup label="North America" className="bg-slate-900">
                    <option value="United States">🇺🇸 United States</option>
                    <option value="Canada">🇨🇦 Canada</option>
                    <option value="Mexico">🇲🇽 Mexico</option>
                  </optgroup>
                  <optgroup label="Latam & South America">
                    <option value="Argentina">🇦🇷 Argentina</option>
                    <option value="Bolivia">🇧🇴 Bolivia</option>
                    <option value="Brazil">🇧🇷 Brazil</option>
                    <option value="Chile">🇨🇱 Chile</option>
                    <option value="Colombia">🇨🇴 Colombia</option>
                    <option value="Costa Rica">🇨🇷 Costa Rica</option>
                    <option value="Dominican Republic">
                      🇩🇴 Dominican Republic
                    </option>
                    <option value="Ecuador">🇪🇨 Ecuador</option>
                    <option value="El Salvador">🇸🇻 El Salvador</option>
                    <option value="Guatemala">🇬🇹 Guatemala</option>
                    <option value="Honduras">🇭🇳 Honduras</option>
                    <option value="Panama">🇵🇦 Panama</option>
                    <option value="Paraguay">🇵🇾 Paraguay</option>
                    <option value="Peru">🇵🇪 Peru</option>
                    <option value="Uruguay">🇺🇾 Uruguay</option>
                    <option value="Venezuela">🇻🇪 Venezuela</option>
                  </optgroup>
                  <optgroup label="Europe">
                    <option value="Austria">🇦🇹 Austria</option>
                    <option value="Belgium">🇧🇪 Belgium</option>
                    <option value="Bulgaria">🇧🇬 Bulgaria</option>
                    <option value="Croatia">🇭🇷 Croatia</option>
                    <option value="Czech Republic">🇨🇿 Czech Republic</option>
                    <option value="Denmark">🇩🇰 Denmark</option>
                    <option value="Finland">🇫🇮 Finland</option>
                    <option value="France">🇫🇷 France</option>
                    <option value="Germany">🇩🇪 Germany</option>
                    <option value="Greece">🇬🇷 Greece</option>
                    <option value="Hungary">🇭🇺 Hungary</option>
                    <option value="Ireland">🇮🇪 Ireland</option>
                    <option value="Italy">🇮🇹 Italy</option>
                    <option value="Netherlands">🇳🇱 Netherlands</option>
                    <option value="Norway">🇳🇴 Norway</option>
                    <option value="Poland">🇵🇱 Poland</option>
                    <option value="Portugal">🇵🇹 Portugal</option>
                    <option value="Romania">🇷🇴 Romania</option>
                    <option value="Russia">🇷🇺 Russia</option>
                    <option value="Serbia">🇷🇸 Serbia</option>
                    <option value="Slovakia">🇸🇰 Slovakia</option>
                    <option value="Spain">🇪🇸 Spain</option>
                    <option value="Sweden">🇸🇪 Sweden</option>
                    <option value="Switzerland">🇨🇭 Switzerland</option>
                    <option value="Turkey">🇹🇷 Turkey</option>
                    <option value="Ukraine">🇺🇦 Ukraine</option>
                    <option value="United Kingdom">🇬🇧 United Kingdom</option>
                  </optgroup>
                  <optgroup label="Asia Pacific">
                    <option value="Australia">🇦🇺 Australia</option>
                    <option value="China">🇨🇳 China</option>
                    <option value="Hong Kong">🇭🇰 Hong Kong</option>
                    <option value="India">🇮🇳 India</option>
                    <option value="Indonesia">🇮🇩 Indonesia</option>
                    <option value="Japan">🇯🇵 Japan</option>
                    <option value="Malaysia">🇲🇾 Malaysia</option>
                    <option value="New Zealand">🇳🇿 New Zealand</option>
                    <option value="Philippines">🇵🇭 Philippines</option>
                    <option value="Singapore">🇸🇬 Singapore</option>
                    <option value="South Korea">🇰🇷 South Korea</option>
                    <option value="Taiwan">🇹🇼 Taiwan</option>
                    <option value="Thailand">🇹🇭 Thailand</option>
                    <option value="Vietnam">🇻🇳 Vietnam</option>
                  </optgroup>
                  <optgroup label="Middle East & Africa">
                    <option value="Egypt">🇪🇬 Egypt</option>
                    <option value="Israel">🇮🇱 Israel</option>
                    <option value="Morocco">🇲🇦 Morocco</option>
                    <option value="Nigeria">🇳🇬 Nigeria</option>
                    <option value="Saudi Arabia">🇸🇦 Saudi Arabia</option>
                    <option value="South Africa">🇿🇦 South Africa</option>
                    <option value="United Arab Emirates">
                      🇦🇪 United Arab Emirates
                    </option>
                  </optgroup>
                </select>
              </div>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 hidden md:block">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              <div className="relative flex-grow flex flex-col md:flex-row items-stretch md:items-center bg-transparent md:bg-slate-950/50 rounded-none md:rounded-[2.5rem] border-none md:border md:border-white/5 shadow-none md:shadow-inner z-10 md:group-hover:border-indigo-500/30 transition-all p-0 gap-4 md:gap-0">
                <label htmlFor="domain-input" className="sr-only">{language === 'es' ? 'Dominio a analizar' : 'Domain to analyze'}</label>
                <input
                  id="domain-input"
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="ejemplo.com"
                  className="w-full bg-white/5 md:bg-transparent border border-white/10 md:border-transparent rounded-[2.5rem] md:rounded-none py-5 md:py-7 px-6 md:px-10 text-center md:text-left text-base md:text-2xl font-black focus:outline-none placeholder:text-slate-700 tracking-tight shadow-inner md:shadow-none transition-all"
                />
                <p className="text-[11px] text-slate-500 text-center md:text-left px-6 md:px-10 pb-1 md:pb-0">
                  {language === "es"
                    ? "Solo el dominio, sin https:// (ej: ejemplo.com)"
                    : "Domain only, no https:// (e.g. example.com)"}
                </p>
                <motion.button
                  whileHover={
                    isAnalyzing || !domain
                      ? {}
                      : {
                          scale: 1.05,
                          boxShadow: "0 20px 50px rgba(255, 71, 123, 0.4)",
                        }
                  }
                  whileTap={isAnalyzing || !domain ? {} : { scale: 0.95 }}
                  type="submit"
                  disabled={isAnalyzing || !domain}
                  className={`w-full md:w-auto md:mr-3 px-4 md:px-10 py-5 md:py-5 rounded-[2.5rem] md:rounded-[2rem] font-black text-xs md:text-[12px] uppercase tracking-[0.2em] md:tracking-[0.4em] transition-all flex items-center justify-center gap-2 md:gap-4 shrink-0 overflow-hidden relative group min-h-[44px] ${
                    isAnalyzing || !domain
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-transparent"
                      : "bg-primary text-white shadow-[0_0_20px_rgba(255,71,123,0.4)] hover:shadow-[0_0_40px_rgba(255,71,123,0.8)] animate-neon-pulse border border-transparent"
                  }`}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative z-10 flex items-center gap-2 md:gap-4">
                    {isAnalyzing ? (
                      <div className="w-5 h-5 border-3 border-theme-border-hover border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg
                        className="w-5 h-5 transition-transform group-hover:translate-x-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    )}
                    <span className="whitespace-nowrap">
                      {isAnalyzing
                        ? language === "es"
                          ? "Analizando"
                          : "Analyzing"
                        : language === "es"
                          ? "Escaneo Profundo"
                          : "Deep Scan"}
                    </span>
                  </span>
                </motion.button>
              </div>
            </motion.div>

            {/* ── Period Selector ───────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 md:gap-3 justify-center flex-wrap px-2"
            >
              <span className="text-[11px] md:text-xs text-slate-500 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] w-full text-center md:w-auto md:text-left mb-2 md:mb-0">
                {language === "es" ? "Período" : "Period"}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(["30d", "90d", "6m", "12m"] as const).map((p) => {
                  const labels: Record<string, Record<string, string>> = {
                    "30d": { es: "30d", en: "30d" },
                    "90d": { es: "90d", en: "90d" },
                    "6m": { es: "6m", en: "6m" },
                    "12m": { es: "12m", en: "12m" },
                  };
                  const isActive = selectedPeriod === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedPeriod(p)}
                      className={`px-5 md:px-5 py-3 md:py-2 rounded-full text-xs md:text-[11px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] border transition-all duration-200 min-h-[44px] md:min-h-0 ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-primary hover:text-white hover:border-primary hover:text-white hover:border-white/20"
                      }`}
                    >
                      {labels[p][language === "es" ? "es" : "en"]}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {auditHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap gap-3 justify-center mt-6"
              >
                <span className="text-xs text-slate-500 font-black uppercase tracking-widest flex items-center mr-2">
                  <svg
                    className="w-3.5 h-3.5 mr-2 text-indigo-400"
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
                  {language === "es"
                    ? "Memoria de Análisis:"
                    : "Analysis Memory:"}
                </span>
                {auditHistory.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDomain(item.domain);
                      setResult(item.result);
                    }}
                    className="px-4 py-2.5 bg-white/5 hover:bg-primary hover:text-white hover:border-primary border border-white/5 hover:border-indigo-500/30 rounded-full text-xs font-bold text-slate-300 transition-all flex items-center gap-2 shadow-sm min-h-[44px]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_#6366f1]"></span>
                    {item.domain}
                  </button>
                ))}
              </motion.div>
            )}

            <div className="flex flex-col md:flex-row justify-center items-center gap-6 mt-8">
              {!isGrowthPlan && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                  <span
                    className={`w-2 h-2 rounded-full ${usageCount >= 2 ? "bg-red-500" : "bg-emerald-500 anim-pulse"}`}
                  ></span>
                  <span className="text-[11px] font-black tracking-widest text-slate-500 uppercase">
                    {language === "es" ? "Consultas gratís:" : "Free queries:"}{" "}
                    {Math.max(0, 2 - usageCount)} / 2
                  </span>
                </div>
              )}
              {user && user.usageLimit && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                  <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
                    Tokens:{" "}
                    <span className="text-indigo-400">
                      {user.totalTokensUsed?.toLocaleString() || 0}
                    </span>{" "}
                    / {user.usageLimit.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </form>
        </FeatureGate>

        {/* --- Agente de SEO (Search Console) - Hidden as requested --- */}
        {/*
        <div className="mb-24">
          <FeatureGate
             user={user}
             allowedPlans={['Growth', 'Agency']}
             featureName={language === 'es' ? 'Agente SEO (Search Console)' : 'SEO Agent (Search Console)'}
             language={language}
             onUpgrade={onUpgrade}
          >
            <SearchConsolePanel user={user} language={language} />
          </FeatureGate>
        </div>
        */}

        {/* Export Buttons - Conditional by Plan */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-6 mb-12 p-8 bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 shadow-2xl"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-[1.5rem] flex items-center justify-center border border-indigo-500/20 group">
                <svg
                  className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight italic">
                  {language === "es" ? "Exportación de Datos" : "Data Export"}
                </h3>
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em]">
                  {user?.subscription?.plan === "Starter" &&
                    (language === "es"
                      ? "Plan actual: Starter (Bloqueado)"
                      : "Current plan: Starter (Locked)")}
                  {user?.subscription?.plan === "Growth" &&
                    (language === "es"
                      ? "Deep Scan: PDF Habilitado"
                      : "Deep Scan: PDF Enabled")}
                  {user?.subscription?.plan === "Agency" &&
                    (language === "es"
                      ? "Agencia de Inteligencia: Exportación Maestra"
                      : "Intelligence Agency: Master Export")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              {/* Growth y Agency: Email PDF Button */}
              {(user?.subscription?.plan === "Growth" ||
                user?.subscription?.plan === "Agency") && (
                <button
                  onClick={handleSendEmailReport}
                  className="px-10 py-5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-[0_10px_30px_rgba(99,102,241,0.3)] transition-all flex items-center gap-3 group border-none"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:-translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {language === "es" ? "Enviar por Email" : "Send via Email"}
                </button>
              )}

              {/* Growth y Agency: PDF Button */}
              {(user?.subscription?.plan === "Growth" ||
                user?.subscription?.plan === "Agency") && (
                <button
                  onClick={handleDownloadPDF}
                  className="px-10 py-5 bg-gradient-to-r from-[#ff477b] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#ff477b] text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-[0_10px_30px_rgba(255,71,123,0.3)] transition-all flex items-center gap-3 group border-none"
                >
                  <svg
                    className="w-4 h-4 transition-transform group-hover:-translate-y-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3"
                    />
                  </svg>
                  {language === "es" ? "Reporte PDF" : "PDF Report"}
                </button>
              )}

              {/* Agency & Growth: CSV Button */}
              {(user?.subscription?.plan === "Agency" ||
                user?.subscription?.plan === "Growth") && (
                <button
                  onClick={handleDownloadCSV}
                  className="px-10 py-5 bg-[#ff477b] text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:brightness-110 transition-all shadow-[0_10px_30px_rgba(255,73,124,0.2)] flex items-center gap-3 group"
                >
                  <svg
                    className="w-4 h-4 transition-transform group-hover:rotate-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {language === "es" ? "Exportar CSV" : "Export CSV"}
                </button>
              )}

              {/* Starter: Upgrade Message */}
              {user?.subscription?.plan === "Starter" && (
                <button
                  onClick={onUpgrade}
                  className="px-10 py-5 bg-white/5 border border-white/10 text-slate-400 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:border-[#ff477b] hover:text-[#ff477b] transition-all flex items-center gap-3"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  {language === "es"
                    ? "Upgrade para Exportar"
                    : "Upgrade to Export"}
                </button>
              )}

              {/* Reset Button — always visible when results are shown */}
              <button
                onClick={handleReset}
                title={
                  language === "es" ? "Reiniciar auditoría" : "Reset audit"
                }
                className="ml-auto px-8 py-4 bg-white/5 border border-rose-500/20 text-rose-400 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-rose-500/10 hover:border-rose-400/40 hover:text-rose-300 transition-all flex items-center gap-3 group"
              >
                <svg
                  className="w-4 h-4 transition-transform group-hover:-rotate-180 duration-500"
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
                {language === "es" ? "Nueva Auditoría" : "New Audit"}
              </button>
            </div>
          </motion.div>
        )}

        {/* Data Verification Layers (Trusted Source Badges) */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-10 mb-16"
          >
            <div className="flex flex-wrap items-center gap-3 justify-center">
              <span className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em] mr-4 flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {language === "es" ? "Fuentes Verificadas:" : "Verified Sources:"}
              </span>
              {[
                { id: 'Open PageRank', label: 'Domain Authority (PR)', color: 'border-blue-500/30 text-blue-400' },
                { id: 'URLScan.io', label: 'Tech Stack (UrlScan)', color: 'border-amber-500/30 text-amber-400' },
                { id: 'IANA RDAP', label: 'WHOIS / Domain Age', color: 'border-indigo-500/30 text-indigo-400' },
                { id: 'Wayback Machine', label: 'Site History (Archive)', color: 'border-pink-500/30 text-pink-400' },
                { id: 'Serper.dev', label: 'Live Google SERP', color: 'border-emerald-500/30 text-emerald-400' },
                { id: 'Tavily AI', label: 'Competitor Intelligence', color: 'border-purple-500/30 text-purple-400' },
                { id: 'Common Crawl', label: 'Backlink Index', color: 'border-slate-500/30 text-slate-400' },
                { id: 'Sitemap XML', label: 'Indexed Pages', color: 'border-teal-500/30 text-teal-400' },
                { id: 'BuiltWith API', label: 'Technology Stack', color: 'border-cyan-500/30 text-cyan-400' },
                { id: 'Google Search Console', label: 'Owner Insights (GSC)', color: 'border-green-500/30 text-green-400' },
              ].map(source => {
                const isUsed = result?.realDataCollected?.some(s => s.includes(source.id)) || 
                               (result?.dataSource && result.dataSource.includes(source.id));
                if (!isUsed) return null;
                return (
                  <div key={source.id} className={`px-4 py-2 bg-white/5 border ${source.color} rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl`}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    {source.label}
                  </div>
                );
              })}
              {result?.webSourcesUsed && result.webSourcesUsed.length > 0 && (
                <div className="px-4 py-2 bg-white/5 border border-rose-500/30 text-rose-400 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Search Grounding (Live)
                </div>
              )}
            </div>

            {/* Technical Verification Audit Details */}
            {result?.realDataDetails && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6">
                {result.realDataDetails?.domainAge && (
                  <div className="bg-white/5 rounded-3xl p-5 border border-white/5 flex flex-col items-center text-center">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest mb-1">Domain Age</span>
                    <span className="text-lg font-black text-indigo-400 italic">+{result.realDataDetails.domainAge} Years</span>
                    <span className="text-[10px] text-slate-600 uppercase font-bold mt-1">Source: IANA RDAP</span>
                  </div>
                )}
                {result.realDataDetails?.firstSeenYear && (
                  <div className="bg-white/5 rounded-3xl p-5 border border-white/5 flex flex-col items-center text-center">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest mb-1">First Seen (Web)</span>
                    <span className="text-lg font-black text-emerald-400 italic">{result.realDataDetails.firstSeenYear}</span>
                    <span className="text-[10px] text-slate-600 uppercase font-bold mt-1">Source: Archive.org</span>
                  </div>
                )}
                {result.realDataDetails?.sitemapPages !== undefined && result.realDataDetails?.sitemapPages !== null && (
                  <div className="bg-white/5 rounded-3xl p-5 border border-white/5 flex flex-col items-center text-center">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest mb-1">Sitemap Pages</span>
                    <span className="text-lg font-black text-amber-400 italic">~{result.realDataDetails.sitemapPages}</span>
                    <span className="text-[10px] text-slate-600 uppercase font-bold mt-1">Source: Sitemap.xml</span>
                  </div>
                )}
                {result.realDataDetails?.commoncrawlBacklinks !== undefined && result.realDataDetails?.commoncrawlBacklinks !== null && (
                  <div className="bg-white/5 rounded-3xl p-5 border border-white/5 flex flex-col items-center text-center">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest mb-1">Index References</span>
                    <span className="text-lg font-black text-teal-400 italic">{result.realDataDetails.commoncrawlBacklinks}</span>
                    <span className="text-[10px] text-slate-600 uppercase font-bold mt-1">Source: Common Crawl</span>
                  </div>
                )}
                {result.realDataDetails?.techStack && result.realDataDetails.techStack.length > 0 && (
                  <div className="bg-white/5 rounded-3xl p-5 border border-white/5 flex flex-col items-center text-center md:col-span-1">
                    <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest mb-1">Tech Stack</span>
                    <div className="flex flex-wrap justify-center gap-1 mt-1">
                      {result.realDataDetails.techStack.slice(0, 3).map((tech, idx) => (
                        <span key={idx} className="text-[8px] font-black bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">{tech}</span>
                      ))}
                      {result.realDataDetails.techStack.length > 3 && (
                        <span className="text-[8px] font-black bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">+{result.realDataDetails.techStack.length - 3}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-600 uppercase font-bold mt-2">Source: BuiltWith</span>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Skeleton Loading State ─────────────────────────── */}
        {isAnalyzing && !result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Metric cards skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass-panel p-8 rounded-[2rem] text-center">
                  <div className="w-10 h-10 bg-white/5 rounded-full mx-auto mb-6 animate-pulse" />
                  <div className="h-8 bg-white/5 rounded-xl mx-auto mb-3 w-2/3 animate-pulse" />
                  <div className="h-3 bg-white/5 rounded mx-auto w-3/4 animate-pulse" />
                </div>
              ))}
            </div>
            {/* Two-column skeleton */}
            <div className="grid md:grid-cols-2 gap-10">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="glass-card p-8 rounded-[2rem]">
                  <div className="h-5 bg-white/5 rounded w-1/3 mb-8 animate-pulse" />
                  <div className="space-y-4">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-12 bg-white/5 rounded-xl animate-pulse" style={{ animationDelay: `${j * 150}ms` }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Competitors skeleton */}
            <div className="glass-panel p-8 rounded-[2rem]">
              <div className="h-6 bg-white/5 rounded w-1/4 mb-8 animate-pulse" />
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {hasReachedLimit && !result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] bg-gradient-to-tr from-slate-900 to-indigo-950/30 border border-indigo-500/30 text-center"
            >
              <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                <svg
                  className="w-10 h-10 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-black mb-4 uppercase">
                {language === "es" ? "Herramienta Limitada" : "Limited Tool"}
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                {language === "es"
                  ? "Has alcanzado el límite de uso gratuito. Desbloquea consultas ilimitadas y análisis profundos con el plan "
                  : "You have reached the free usage limit. Unlock unlimited queries and deep analysis with the "}
                <span className="text-white font-bold">DEEP SCAN</span>.
              </p>
              <button
                onClick={onUpgrade}
                className="bg-[#ff477b] text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-[#ff477b]/20 hover:scale-105 transition-all"
              >
                {language === "es" ? "Actualizar Ahora" : "Upgrade Now"}
              </button>
            </motion.div>
          )}

          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="space-y-8"
            >
              {result.isCached && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-cyan-500/10 border border-cyan-500/20 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-2xl">⚡</div>
                    <div>
                      <p className="text-sm font-black text-white uppercase tracking-tight">
                        {language === 'es' ? 'Datos recuperados del historial' : 'Data retrieved from history'}
                      </p>
                      <p className="text-[11px] text-slate-400 uppercase font-bold tracking-[0.2em] mt-0.5">
                        {language === 'es' 
                          ? `Análisis previa del ${new Date(result.cachedAt!).toLocaleDateString()}` 
                          : `Previous analysis from ${new Date(result.cachedAt!).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCheck(undefined, true)}
                    className="w-full md:w-auto px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-cyan-500/20 min-h-[44px]"
                  >
                    {language === 'es' ? 'Forzar Nueva Auditoría' : 'Force New Audit'}
                  </button>
                </motion.div>
              )}

              {result.dataQuality && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center gap-3 md:gap-4 px-4 md:px-6 py-4 bg-white/5 border border-white/10 rounded-3xl"
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${
                      result.dataQuality.confidenceScore > 80 ? 'bg-emerald-500/20 text-emerald-400' :
                      result.dataQuality.confidenceScore > 50 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-rose-500/20 text-rose-400'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">
                      {language === 'es' ? 'Fiabilidad:' : 'Confidence:'}
                    </span>
                    <span className={`text-xs font-black ${
                      result.dataQuality.confidenceScore > 80 ? 'text-emerald-400' :
                      result.dataQuality.confidenceScore > 50 ? 'text-amber-400' :
                      'text-rose-400'
                    }`}>
                      {result.dataQuality.confidenceScore}%
                    </span>
                  </div>

                  <div className="h-4 w-px bg-white/10 hidden md:block"></div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">
                      {language === 'es' ? 'Fuente:' : 'Source:'}
                    </span>
                    <span className="text-xs font-black text-white uppercase italic">
                      {result.dataQuality.sourceReliability}
                    </span>
                  </div>

                  <div className="h-4 w-px bg-white/10 hidden md:block"></div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">
                      {language === 'es' ? 'Método:' : 'Method:'}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      {result.dataQuality.validationMethod}
                    </span>
                  </div>
                </motion.div>
              )}

              {result.temporalInsight && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-white/5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`p-3 rounded-2xl ${result.temporalInsight.trend === 'improving' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {result.temporalInsight.trend === 'improving' ? '📈' : '📉'}
                    </div>
                    <div>
                      <h4 className="text-lg font-black uppercase italic tracking-tight text-white/90">
                        {language === 'es' ? 'Evolución Temporal' : 'Temporal Evolution'}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em]">
                        {language === 'es' ? 'Comparativa vs Auditoría Anterior' : 'Vs Previous Audit Comparison'}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-slate-300 text-sm leading-relaxed mb-8 max-w-2xl font-medium">
                    {result.temporalInsight.diff}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { label: 'Tráfico', val: result.temporalInsight.metrics.trafficChange, suffix: '%' },
                      { label: 'Autoridad (DA)', val: result.temporalInsight.metrics.daChange, suffix: '' },
                      { label: 'Keywords', val: result.temporalInsight.metrics.keywordsChange, suffix: '%' }
                    ].map((m, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                        <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-1">{m.label}</p>
                        <p className={`text-xl font-black ${m.val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.val > 0 ? '+' : ''}{m.val}{m.suffix}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  {
                    label: "Domain Authority",
                    value: result.domainAuthority,
                    icon: "🛡️",
                    color: "from-cyan-500/10 to-blue-500/10",
                    glow: "bg-cyan-500",
                  },
                  {
                    label:
                      language === "es"
                        ? "Tráfico Orgánico"
                        : "Organic Traffic",
                    value: result.organicTraffic?.toLocaleString() || "0",
                    icon: "🚀",
                    color: "from-emerald-500/10 to-cyan-500/10",
                    glow: "bg-cyan-400",
                  },
                  {
                    label:
                      language === "es"
                        ? "Keywords Orgánicas"
                        : "Organic Keywords",
                    value: result.organicKeywords?.toLocaleString() || "0",
                    icon: "🔑",
                    color: "from-purple-500/10 to-[#ff477b]/10",
                    glow: "bg-purple-500",
                  },
                  {
                    label: "Backlinks",
                    value: result.backlinks?.toLocaleString() || "0",
                    icon: "🔗",
                    color: "from-[#ff477b]/10 to-pink-500/10",
                    glow: "bg-[#ff477b]",
                  },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`glass-panel p-8 rounded-[2rem] text-center relative group transition-all hover:scale-[1.02]`}
                  >
                    {/* Trend Indicator */}
                    {result.trends && (
                      <div className="absolute top-4 right-4 flex items-center gap-1">
                        {i === 0 && result.trends.da && (
                           <span aria-label={result.trends.da === 'up' ? 'trending up' : result.trends.da === 'down' ? 'trending down' : 'stable'} className={`text-xs font-black ${result.trends.da === 'up' ? 'text-emerald-400' : result.trends.da === 'down' ? 'text-rose-400' : 'text-slate-500'}`}>
                             {result.trends.da === 'up' ? '↑' : result.trends.da === 'down' ? '↓' : '→'}
                           </span>
                        )}
                        {i === 1 && result.trends.traffic && (
                           <span aria-label={result.trends.traffic === 'up' ? 'trending up' : result.trends.traffic === 'down' ? 'trending down' : 'stable'} className={`text-xs font-black ${result.trends.traffic === 'up' ? 'text-emerald-400' : result.trends.traffic === 'down' ? 'text-rose-400' : 'text-slate-500'}`}>
                             {result.trends.traffic === 'up' ? '↑' : result.trends.traffic === 'down' ? '↓' : '→'}
                           </span>
                        )}
                        {i === 2 && result.trends.keywords && (
                           <span aria-label={result.trends.keywords === 'up' ? 'trending up' : result.trends.keywords === 'down' ? 'trending down' : 'stable'} className={`text-xs font-black ${result.trends.keywords === 'up' ? 'text-emerald-400' : result.trends.keywords === 'down' ? 'text-rose-400' : 'text-slate-500'}`}>
                             {result.trends.keywords === 'up' ? '↑' : result.trends.keywords === 'down' ? '↓' : '→'}
                           </span>
                        )}
                        {i === 3 && result.trends.backlinks && (
                           <span aria-label={result.trends.backlinks === 'up' ? 'trending up' : result.trends.backlinks === 'down' ? 'trending down' : 'stable'} className={`text-xs font-black ${result.trends.backlinks === 'up' ? 'text-emerald-400' : result.trends.backlinks === 'down' ? 'text-rose-400' : 'text-slate-500'}`}>
                             {result.trends.backlinks === 'up' ? '↑' : result.trends.backlinks === 'down' ? '↓' : '→'}
                           </span>
                        )}
                      </div>
                    )}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    ></div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-primary hover:text-white hover:border-primary transition-all"></div>
                    <div
                      className={`absolute bottom-0 left-0 w-full h-1 ${stat.glow} opacity-0 group-hover:opacity-100 transition-opacity`}
                    ></div>

                    <div className="relative z-10">
                      <div className="text-4xl mb-6 transform group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-500 drop-shadow-2xl">
                        {stat.icon}
                      </div>
                      <div className="text-4xl font-black text-white mb-2 tracking-tighter drop-shadow-md group-hover:text-indigo-50 transition-colors">
                        {stat.value}
                      </div>
                      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-300 transition-colors">
                        {stat.label}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* ── Tab Navigation ─────────────────────────────────────── */}
              <div className="sticky top-0 z-20 -mx-6 md:-mx-12 px-6 md:px-12 py-4 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div role="tablist" aria-label={language === 'es' ? 'Secciones de resultados' : 'Results sections'} className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 pb-1 snap-x snap-mandatory">
                  {([
                    { id: 'overview' as const, label: language === 'es' ? 'Resumen' : 'Overview', icon: '📊' },
                    { id: 'competitors' as const, label: language === 'es' ? 'Competencia' : 'Competitors', icon: '🏆' },
                    { id: 'keywords' as const, label: 'Keywords', icon: '🔑' },
                    { id: 'diagnosis' as const, label: language === 'es' ? 'Diagnóstico' : 'Diagnosis', icon: '🧠' },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`tabpanel-${tab.id}`}
                      onClick={() => { setActiveTab(tab.id); setShowAllSections(false); }}
                      className={`flex items-center gap-2 px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap snap-start transition-all min-h-[44px] ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                      }`}
                    >
                      <span className="text-sm">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                  <div className="ml-auto hidden lg:flex">
                    <button
                      onClick={() => setShowAllSections(!showAllSections)}
                      className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                        showAllSections
                          ? 'bg-white/10 text-white border border-white/10'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {showAllSections ? (language === 'es' ? 'Vista Tabs' : 'Tab View') : (language === 'es' ? 'Ver Todo' : 'View All')}
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
              {/* ── Tab: Overview ───────────────────────────────────────── */}
              {(activeTab === 'overview' || showAllSections) && (
              <motion.div key="tab-overview" id="tabpanel-overview" role="tabpanel" aria-labelledby="tab-overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-10">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] relative group/container transition-colors"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full -mr-32 -mt-32 transition-all group-hover/container:bg-cyan-500/10"></div>
                  <h3 className="text-2xl font-black mb-10 border-l-4 border-cyan-500 pl-6 uppercase tracking-tighter italic flex items-center relative z-10 text-white/90">
                    {language === "es" ? "Top Páginas" : "Top Pages"}
                    <InfoTooltip text="Páginas del dominio con mayor cantidad de tráfico orgánico estimado y número de palabras clave posicionadas." />
                  </h3>
                  <div className="space-y-6">
                    {(result.topPages || []).map((page, i) => (
                      <div
                        key={i}
                        className="group flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-transparent hover:border-white/10 hover:bg-white/[0.07] transition-all"
                      >
                        <div className="min-w-0 pr-4">
                          <div className="text-sm font-bold text-white truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                            {page.url}
                          </div>
                          <div className="text-[11px] font-black uppercase text-slate-500 mt-1.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {page.keywords} Keywords
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl font-black text-white tracking-tighter">
                            {page.visits}
                          </div>
                          <div className="text-[11px] font-black uppercase text-slate-500 tracking-widest">
                            {language === "es" ? "Visitas" : "Visits"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] relative group/container transition-colors overflow-hidden"
                >
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#ff477b]/5 blur-[80px] rounded-full -ml-32 -mb-32 transition-all group-hover/container:bg-[#ff477b]/10"></div>
                  <h3 className="text-xl md:text-2xl font-black mb-8 md:mb-10 border-l-4 border-[#ff477b] pl-6 uppercase tracking-tighter italic flex items-center relative z-10 text-white/90">
                    {language === "es" ? "Tráfico Geográfico" : "Geo Traffic"}
                    <InfoTooltip text="Distribución porcentual del tráfico web según el país de origen de los visitantes." />
                  </h3>
                  <div className="space-y-8 relative z-10">
                    {(result.trafficByCountry || []).map((country, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
                            <span className="text-lg opacity-80">
                              {country.country.split(" ")[0]}
                            </span>
                            {country.country.split(" ").slice(1).join(" ")}
                          </span>
                          <span className="text-lg font-black text-[#ff477b] leading-none">
                            {country.percentage}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${country.percentage}%` }}
                            transition={{
                              duration: 1.5,
                              ease: "easeOut",
                              delay: i * 0.1,
                            }}
                            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-[#ff477b] rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              </motion.div>
              )}

              {/* ── Tab: Competitors ───────────────────────────────────── */}
              {(activeTab === 'competitors' || showAllSections) && (
              <motion.div key="tab-competitors" id="tabpanel-competitors" role="tabpanel" aria-labelledby="tab-competitors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              {/* SEO Gap Analysis Visualization */}
              <Suspense fallback={<div className="w-full h-40 flex items-center justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
                <SEOGapAnalysis result={result} language={language} />
              </Suspense>

              {/* Market Trends & Insights */}
              {result.marketTrends && result.marketTrends.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-white/10 relative overflow-hidden"
                >
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full"></div>
                  <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter italic flex items-center gap-4 text-white/90">
                    <span className="text-blue-400">🌐</span>
                    {language === "es" ? "Tendencias del Mercado 2026" : "2026 Market Trends"}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {result.marketTrends.map((trend, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-slate-300 font-medium leading-relaxed group-hover:text-white transition-colors">
                          {trend}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Competitors Section */}
              {result.competitors && result.competitors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] relative group/container transition-all"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/container:opacity-10 transition-opacity">
                    <svg
                      className="w-32 h-32 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
                    </svg>
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>

                  <h3 className="text-2xl md:text-3xl font-black mb-8 md:mb-12 uppercase tracking-tighter flex items-center gap-4 italic relative z-10 text-white/90">
                    {language === "es"
                      ? "Análisis de Competencia"
                      : "Market Competition"}
                    <InfoTooltip text="Principales dominios competidores detectados orgánicamente, su nivel de dificultad y métricas de tráfico estimado." />
                  </h3>
                  <div className="grid gap-4 md:gap-6 relative z-10">
                    {result.competitors
                      .sort((a, b) => a.position - b.position)
                      .slice(0, 5)
                      .map((competitor, i) => (
                        <motion.div
                          key={i}
                          whileHover={{ x: 10 }}
                          className="flex flex-col p-6 md:p-8 bg-white/5 rounded-[2rem] border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.08] transition-all group relative overflow-hidden"
                        >
                          {/* Primary row */}
                          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8">
                            <div className="flex items-center gap-4 md:gap-8 flex-1 min-w-0">
                              <div className="flex-shrink-0 relative">
                                <div
                                  className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl shadow-2xl ${
                                    i === 0
                                      ? "bg-gradient-to-br from-amber-300 to-yellow-600 text-white"
                                      : i === 1
                                        ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white"
                                        : i === 2
                                          ? "bg-gradient-to-br from-orange-400 to-orange-700 text-white"
                                          : "bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {competitor.position}
                                </div>
                                {i < 3 && (
                                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-slate-900 rounded-full flex items-center justify-center text-[8px] font-black drop-shadow-lg">
                                    ★
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="text-2xl font-black text-white truncate group-hover:text-indigo-400 transition-colors uppercase tracking-tight">
                                  {competitor.domain}
                                </div>
                                <div className="flex items-center gap-6 mt-3">
                                  <span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                                    {competitor.commonKeywords?.toLocaleString() ||
                                      "0"}{" "}
                                    {language === "es"
                                      ? "Keywords Comunes"
                                      : "Common Keywords"}
                                  </span>
                                  <span
                                    className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${
                                      competitor.competitionLevel === "Alta" ||
                                      competitor.competitionLevel === "Alto"
                                        ? "bg-red-500/20 text-red-400 border border-red-500/20"
                                        : competitor.competitionLevel ===
                                              "Media" ||
                                            competitor.competitionLevel ===
                                              "Medio"
                                          ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/20"
                                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                                    }`}
                                  >
                                    {competitor.competitionLevel} Level
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0 ml-4 bg-slate-950/50 p-4 rounded-2xl border border-white/5 px-8">
                              <div className="text-2xl font-black text-indigo-400 tracking-tighter">
                                {competitor.trafficSource === "Estimación IA" ? "~" : ""}
                                {competitor.trafficVolume?.toLocaleString() || "0"}
                              </div>
                              <div className="text-[11px] font-black uppercase text-slate-500 tracking-widest mt-1">
                                {language === "es" ? "Visitas / mes" : "Visits / mo"}
                              </div>
                              {competitor.trafficSource && (
                                <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
                                  competitor.trafficSource === "Estimación IA"
                                    ? "text-amber-500/70"
                                    : "text-emerald-400/80"
                                }`}>
                                  {competitor.trafficSource === "Estimación IA" ? "~ Est. IA" : competitor.trafficSource}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Enriched metrics pills */}
                          {(competitor.domainAuthority !== undefined ||
                            competitor.avgPosition !== undefined ||
                            competitor.organicKeywords !== undefined ||
                            competitor.strategy ||
                            competitor.gapInsight) && (
                            <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/5">
                              {competitor.domainAuthority !== undefined && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300">
                                  DA{" "}
                                  <span className="text-white ml-1">
                                    {competitor.domainAuthority}
                                  </span>
                                </span>
                              )}
                              {competitor.avgPosition !== undefined && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-purple-300">
                                  {language === "es"
                                    ? "Pos. Prom."
                                    : "Avg. Pos."}{" "}
                                  <span className="text-white ml-1">
                                    #{competitor.avgPosition}
                                  </span>
                                </span>
                              )}
                              {competitor.organicKeywords !== undefined && (
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-300">
                                  {language === "es" ? "KWs" : "KWs"}{" "}
                                  <span className="text-white ml-1">
                                    {competitor.organicKeywords?.toLocaleString()}
                                  </span>
                                </span>
                              )}
                              {(competitor.gapInsight ||
                                competitor.strategy) && (
                                <span
                                  className="text-[11px] text-slate-500 font-medium italic md:ml-2 truncate max-w-full md:max-w-xs col-span-2"
                                  title={
                                    competitor.gapInsight || competitor.strategy
                                  }
                                >
                                  💡{" "}
                                  {competitor.gapInsight || competitor.strategy}
                                </span>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                  </div>
                </motion.div>
              )}

              </motion.div>
              )}

              {/* ── Tab: Keywords ──────────────────────────────────────── */}
              {(activeTab === 'keywords' || showAllSections) && (
              <motion.div key="tab-keywords" id="tabpanel-keywords" role="tabpanel" aria-labelledby="tab-keywords" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
              {/* Top Organic Keywords Section */}
              {result.keywordsList && result.keywordsList.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] relative group/container transition-colors"
                >
                  <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full -ml-32 -mt-32 transition-all group-hover/container:bg-amber-500/10"></div>
                  <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter italic flex items-center gap-4 relative z-10 text-white/90">
                    <span className="text-amber-400">🔑</span>
                    {language === "es" ? "Top Palabras Clave" : "Top Keywords"}
                    <InfoTooltip text="Palabras clave con mayor volumen de búsqueda y su dificultad estimada para competir orgánicamente." />
                  </h3>
                  {/* Desktop table */}
                  <div className="overflow-x-auto relative z-10 hidden md:block">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] uppercase font-black tracking-widest text-slate-500">
                          <th className="py-4 px-4">
                            {language === "es" ? "Palabra Clave" : "Keyword"}
                          </th>
                          <th className="py-4 px-4 text-center">Vol.</th>
                          <th className="py-4 px-4 text-center">KD %</th>
                          <th className="py-4 px-4 text-center">Pos.</th>
                          <th className="py-4 px-4 text-right">Intent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.keywordsList.map((kw, i) => (
                          <tr
                            key={i}
                            className="border-b border-white/5 hover:bg-primary hover:text-white hover:border-primary transition-colors"
                          >
                            <td className="py-4 px-4 font-bold text-white uppercase text-sm tracking-tight">
                              {kw.term}
                            </td>
                            <td className="py-4 px-4 text-center text-slate-300 font-medium">
                              {kw.volume?.toLocaleString() || "0"}
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span
                                className={`px-2 py-1 rounded text-[11px] font-black ${
                                  kw.difficulty > 70
                                    ? "bg-red-500/20 text-red-400"
                                    : kw.difficulty > 40
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-emerald-500/20 text-emerald-400"
                                }`}
                              >
                                {kw.difficulty}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center text-indigo-400 font-bold">
                              {kw.position || "-"}
                            </td>
                            <td className="py-4 px-4 text-right text-xs text-slate-400 uppercase tracking-wider">
                              {kw.intent || "INFO"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile cards */}
                  <div className="grid grid-cols-1 gap-3 relative z-10 md:hidden">
                    {result.keywordsList.map((kw, i) => (
                      <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-white uppercase text-sm tracking-tight truncate mr-2">{kw.term}</span>
                          <span className="text-xs text-slate-400 uppercase tracking-wider shrink-0">{kw.intent || "INFO"}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <span className="text-[11px] text-slate-500 font-black uppercase block">Vol</span>
                            <span className="text-sm text-slate-300 font-medium">{kw.volume?.toLocaleString() || "0"}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 font-black uppercase block">Pos</span>
                            <span className="text-sm text-indigo-400 font-bold">{kw.position || "-"}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 font-black uppercase block">KD</span>
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-black ${
                              kw.difficulty > 70 ? "bg-red-500/20 text-red-400" :
                              kw.difficulty > 40 ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-emerald-500/20 text-emerald-400"
                            }`}>{kw.difficulty}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Backlinks Section */}
              {result.backlinksList && result.backlinksList.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="glass-card p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] relative group/container transition-colors"
                >
                  <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#ff477b]/5 blur-[80px] rounded-full -mr-32 -mb-32 transition-all group-hover/container:bg-[#ff477b]/10"></div>
                  <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter italic flex items-center gap-4 relative z-10 text-white/90">
                    <span className="text-[#ff477b]">🔗</span>
                    {language === "es"
                      ? "Backlinks Principales"
                      : "Top Backlinks"}
                    <InfoTooltip text="Enlaces entrantes de mayor autoridad que apuntan al dominio." />
                  </h3>
                  {/* Desktop list */}
                  <div className="space-y-4 relative z-10 hidden md:block">
                    {(result.backlinksList || []).map((bl, i) => (
                      <div
                        key={i}
                        className="p-5 bg-white/5 rounded-2xl border border-white/5 flex flex-row gap-4 items-center justify-between hover:border-pink-500/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-indigo-300 truncate mb-1">
                            {bl.url}
                          </div>
                          <div className="text-[11px] uppercase font-black text-slate-500 tracking-widest flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded bg-white/10">
                              {bl.type || "DoFollow"}
                            </span>
                            <span>{bl.quality || "Medium"} Quality</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-center bg-slate-950/50 rounded-xl px-4 py-2 border border-white/5">
                          <div className="text-xl font-black text-white">
                            {bl.authority}
                          </div>
                          <div className="text-[11px] uppercase tracking-widest text-slate-500">
                            DA
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Mobile cards */}
                  <div className="grid grid-cols-1 gap-3 relative z-10 md:hidden">
                    {(result.backlinksList || []).map((bl, i) => (
                      <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="text-sm text-indigo-300 truncate mb-2">{bl.url}</div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-white/10 text-[11px] uppercase font-black text-slate-400">{bl.type || "DoFollow"}</span>
                            <span className="text-[11px] uppercase font-black text-slate-500">{bl.quality || "Medium"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-950/50 rounded-lg px-3 py-1 border border-white/5">
                            <span className="text-[11px] text-slate-500 font-black uppercase">DA</span>
                            <span className="text-base font-black text-white">{bl.authority}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              </motion.div>
              )}

              {/* ── Tab: Diagnosis ─────────────────────────────────────── */}
              {(activeTab === 'diagnosis' || showAllSections) && (
              <motion.div key="tab-diagnosis" id="tabpanel-diagnosis" role="tabpanel" aria-labelledby="tab-diagnosis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">

              {/* PageSpeed Insights Visualization */}
              <PageSpeedWidget initialUrl={result.domain} language={language} />

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-panel p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] relative group/container hover:neon-magenta-glow transition-all ring-1 ring-[#ff477b]/20"
              >
                <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-[#ff477b]/5 blur-[120px] rounded-full -mr-32 -mt-32 group-hover/container:bg-[#ff477b]/10 transition-all duration-700"></div>
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 mb-8 md:mb-12 relative z-10">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#ff477b] via-purple-600 to-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg shadow-[#ff477b]/30 shrink-0">
                    AI
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-2xl lg:text-4xl font-black uppercase tracking-tighter leading-none flex items-center text-white">
                      {language === "es" ? "Diagnóstico Estratégico" : "Strategic Diagnosis"}
                      <InfoTooltip text={language === "es" ? "Diagnóstico avanzado impulsado por IA sobre la salud SEO del dominio, detectando fortalezas y puntos críticos." : "Advanced AI-powered diagnosis of the domain's SEO health, detecting strengths and critical points."} />
                    </h3>
                    <p className="text-[11px] md:text-xs font-black text-cyan-400 uppercase tracking-[0.2em] md:tracking-[0.4em] mt-2 md:mt-3 drop-shadow-md">
                      {language === "es" ? "Verificación SEO por Enlace Neuronal" : "Neural Link SEO Verification"}
                    </p>
                  </div>
                </div>
                <div className="space-y-6 relative z-10">
                  {Array.isArray(result.seoCritique) ? (
                    result.seoCritique.map((point, i) => (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i}
                        className="flex gap-4 md:gap-6 p-5 md:p-6 bg-white/5 rounded-2xl md:rounded-[2rem] border border-white/5 hover:bg-primary hover:text-white hover:border-primary transition-all group/item"
                      >
                        <div className="mt-1 w-2 h-2 rounded-full bg-[#ff477b] shrink-0 shadow-[0_0_10px_#ff477b] group-hover/item:scale-150 transition-transform" />
                        <p className="text-base md:text-xl text-slate-200 font-medium leading-relaxed tracking-tight">
                          {point}
                        </p>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-2xl text-slate-200 font-medium leading-relaxed italic">
                      {result.seoCritique}
                    </p>
                  )}
                </div>
              </motion.div>
              </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {result && (
          <div className="mt-12 no-print">
            <FeedbackWidget
              feature="TrafficChecker_Audit"
              userId={user?.id || "guest"}
              userRole={user?.role}
              context={JSON.stringify({ domain: result.domain, period: result.period })}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TrafficChecker;
