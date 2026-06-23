import { buildAbsoluteUrl } from "../utils/apiConfig";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from "recharts";
import { getCampaignAudit } from "../services/geminiService";
import {
  listAccessibleCustomers,
  getRecentCampaignPerformance,
  getAuctionInsights,
  pingGoogleAds,
  type GoogleAdsPingResult,
} from "../services/googleAdsService";
import { 
  CampaignAudit, 
  GoogleUser, 
  AdsAccount, 
  Language, 
  AuctionInsight, 
  CampaignPerformance,
  AuthUser
} from "../types";
import { TRANSLATIONS } from "../constants";
import { authService } from "../services/authService";
// import { generateGoogleStylePDF } from "../utils/exportUtils"; // Removed for dynamic import optimization
import { martechService } from "../services/martechService";
import { InfoTooltip } from "./ui/InfoTooltip";
import Toast, { ToastData } from "./Toast";

interface AdsOptimizerViewProps {
  language: Language;
  onSaveAudit?: (result: CampaignAudit, query: any) => void;
  restoredAudit?: CampaignAudit | null;
  currentUser: AuthUser | null;
  onUpdateUser: (user: AuthUser) => void;
}

const AdsOptimizerView: React.FC<AdsOptimizerViewProps> = ({ 
  language, 
  onSaveAudit, 
  restoredAudit,
  currentUser,
  onUpdateUser
}) => {
  const t = TRANSLATIONS[language];
  const [step, setStep] = useState<"initial" | "connecting" | "picker" | "connected">("initial");
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accounts, setAccounts] = useState<AdsAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AdsAccount | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(language === "es" ? "Últimos 30 días" : "Last 30 days");
  const [isLoading, setIsLoading] = useState(false);
  const [audit, setAudit] = useState<CampaignAudit | null>(null);
  const [competitors, setCompetitors] = useState<AuctionInsight[]>([]);
  const [performanceData, setPerformanceData] = useState<CampaignPerformance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [pingResult, setPingResult] = useState<GoogleAdsPingResult | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  useEffect(() => {
    if (restoredAudit) {
      setAudit(restoredAudit);
      setStep("connected");
    }
  }, [restoredAudit]);

  useEffect(() => {
    const savedAdsUser = sessionStorage.getItem("insitu_ads_user");
    // currentUser is now a prop
    
    if (savedAdsUser) {
      const parsedUser = JSON.parse(savedAdsUser);
      setUser(parsedUser);
      loadAccounts(parsedUser.accessToken);
    } else if (currentUser?.linkedGoogleAds?.accessToken) {
      const adsUser: GoogleUser = {
        name: currentUser.linkedGoogleAds.name,
        email: currentUser.linkedGoogleAds.email,
        picture: currentUser.linkedGoogleAds.picture,
        accessToken: currentUser.linkedGoogleAds.accessToken
      };
      setUser(adsUser);
      loadAccounts(adsUser.accessToken);
    }
  }, []);

  const handleRunDiagnostic = async () => {
    const token = user?.accessToken || currentUser?.linkedGoogleAds?.accessToken;
    if (!token) {
      setPingResult({ httpStatus: 0, ok: false, googleStatus: 'NO_TOKEN', googleReason: 'No hay token de acceso disponible. Vincula tu cuenta primero.', googleMessage: null, devTokenConfigured: false, devTokenLength: 0, accessTokenPrefix: '(none)', apiVersion: 'N/A', accounts: [] });
      return;
    }
    setIsPinging(true);
    setPingResult(null);
    const result = await pingGoogleAds(token);
    setPingResult(result);
    setIsPinging(false);
  };

  const loadAccounts = async (token: string) => {
    setStep("connecting");
    setError(null);
    try {
      const accessibleAccounts = await listAccessibleCustomers(token);
      setAccounts(accessibleAccounts);
      setStep("picker");
    } catch (err: any) {
      setStep("initial");
      setError(err.message || (language === 'es' ? "Error al cargar cuentas" : "Error loading accounts"));
    }
  };

  const handleSelectAccount = (acc: AdsAccount) => {
    setSelectedAccount(acc);
    setStep("connected");
    setAudit(null);
  };

  const handleLink = () => {
    const settings = authService.getSettings();
    if (!settings.googleAuth?.clientId) {
      setError(language === "es" ? "Google OAuth no está configurado en los ajustes." : "Google OAuth is not configured in settings.");
      return;
    }

    if (!(window as any).google) {
      setError(language === "es" ? "Servicios de Google no cargados. Recarga la página." : "Google Services not loaded. Please reload.");
      return;
    }

    setStep("connecting");

    // Use initCodeClient instead of initTokenClient to get a refresh_token
    const client = (window as any).google.accounts.oauth2.initCodeClient({
      client_id: settings.googleAuth.clientId,
      scope: "https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
      ux_mode: 'popup',
      callback: async (authResponse: any) => {
        if (authResponse.error) {
          setStep("initial");
          setError(authResponse.error_description || authResponse.error);
          return;
        }

        const { code } = authResponse;
        if (!code) {
          setStep("initial");
          setError("No se recibió código de autorización.");
          return;
        }

        try {
          // Exchange code for tokens on the server
          const exchangeRes = await fetch(buildAbsoluteUrl('/.netlify/functions/api-auth/google/link'), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, userId: currentUser?.id }),
          });

          if (!exchangeRes.ok) {
            const err = await exchangeRes.json();
            throw new Error(err.error || "Error intercambiando código");
          }

          const { linkedGoogleAds } = await exchangeRes.json();

          const adsUser: GoogleUser = {
            name: linkedGoogleAds.name || "User",
            email: linkedGoogleAds.email || "",
            picture: linkedGoogleAds.picture || "",
            accessToken: linkedGoogleAds.accessToken
          };

          // Update local AuthUser state
          if (currentUser) {
            onUpdateUser({
              ...currentUser,
              linkedGoogleAds
            });
          }

          martechService.trackAdConnection('google_ads', 'connected', adsUser.email);
          setToast({ 
            title: language === 'es' ? "Éxito" : "Success", 
            message: language === 'es' ? "Google Ads vinculado exitosamente (Sesión Persistente)" : "Google Ads linked successfully (Persistent Session)", 
            type: 'success' 
          });

          setUser(adsUser);
          sessionStorage.setItem("insitu_ads_user", JSON.stringify(adsUser));
          loadAccounts(adsUser.accessToken);
        } catch (err: any) {
          console.error("[AdsOptimizer] OAuth exchange error:", err);
          setError(err.message);
          setStep("initial");
        }
      },
    });

    client.findAllAccounts ? client.findAllAccounts() : client.requestCode();
  };

  const handleUnlink = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const updatedUser = await authService.updateProfile(currentUser.id, {
        linkedGoogleAds: null as any
      });
      if (updatedUser) {
        onUpdateUser(updatedUser);
        martechService.trackAdConnection('google_ads', 'disconnected');
        setUser(null);
        setAccounts([]);
        setSelectedAccount(null);
        setAudit(null);
        setStep("initial");
        sessionStorage.removeItem("insitu_ads_user");
        setToast({ 
          title: language === 'es' ? "Éxito" : "Success", 
          message: language === 'es' ? "Cuenta desvinculada" : "Account unlinked", 
          type: 'info' 
        });
      }
    } catch (err: any) {
      setToast({ title: "Error", message: "Error al desvincular", type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAudit = async () => {
    if (!selectedAccount || !user) return;
    setIsLoading(true);
    setError(null);
    try {
      const performance = await getRecentCampaignPerformance(
        user.accessToken,
        selectedAccount.id,
        selectedPeriod,
      );
      setPerformanceData(performance);

      const competitorsRaw = await getAuctionInsights(
        user.accessToken,
        selectedAccount.id,
        selectedPeriod,
      );
      setCompetitors(competitorsRaw);

      const perfString = performance
        .map(p => `- Campaign: ${p.campaignName}, CTR: ${(p.ctr * 100).toFixed(2)}%, CPC: $${p.cpc.toFixed(4)}, Impressions: ${p.impressions}, Clicks: ${p.clicks}`)
        .join("\n");
        
      const compString = competitorsRaw
        .map(c => `- Dominio: ${c.domain}, ImpShare: ${(c.impressionShare * 100).toFixed(2)}%, Outranking: ${(c.outrankingShare || 0 * 100).toFixed(2)}%`)
        .join("\n");

      const result = await getCampaignAudit(
        `PERFORMANCE DATA:\n${perfString}`,
        language,
        compString
      );
      setAudit(result);

      if (onSaveAudit) {
        onSaveAudit(result, {
          accountId: selectedAccount.id,
          accountName: selectedAccount.name,
          period: selectedPeriod
        });
      }
    } catch (e: any) {
      setError("Error auditando cuenta: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!audit || !selectedAccount) return;
    const fileName = `Optimizer_Ads_${selectedAccount.id}_${language}.pdf`;
    const { generateGoogleStylePDF } = await import("../utils/exportUtils");
    await generateGoogleStylePDF("campaign", audit, fileName, language, {
      user: authService.getCurrentUser(),
    });
  };

  const handleSendEmailReport = async () => {
    if (!audit || !selectedAccount) return;
    const currentUser = authService.getCurrentUser();
    const emailStr = window.prompt(
      language === "es" ? "Ingresa el email donde enviar el reporte PDF:" : "Enter the email to send the PDF report to:",
      currentUser?.email || ""
    );
    if (!emailStr?.trim()) return;
    const fileName = `Optimizer_Ads_${selectedAccount.id}_${language}.pdf`;
    setToast({ title: language === "es" ? "Generando PDF..." : "Generating PDF...", message: language === "es" ? "Esto puede tomar unos segundos." : "This may take a few seconds.", type: "info" });
    try {
      const { generateGoogleStylePDF } = await import("../utils/exportUtils");
      const pdfBase64 = await generateGoogleStylePDF("campaign", audit, fileName, language, { user: currentUser, action: "return" }) as string;
      if (!pdfBase64) throw new Error("PDF generation returned empty");
      const response = await fetch(buildAbsoluteUrl('/.netlify/functions/api-send-report'), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Id": currentUser?.id || ""
        },
        body: JSON.stringify({ email: emailStr.trim(), pdfBase64, fileName, domain: selectedAccount.name, reportType: "Auditoría Ads Optimizer", language })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }
      setToast({ title: language === "es" ? "Email Enviado ✓" : "Email Sent ✓", message: language === "es" ? `Reporte enviado a ${emailStr.trim()}` : `Report sent to ${emailStr.trim()}`, type: "success" });
    } catch (err: any) {
      console.error("[AdsOptimizer] Email error:", err);
      setToast({ title: language === "es" ? "Error de Envío" : "Send Error", message: err?.message || (language === "es" ? "No se pudo enviar el email." : "Could not send email."), type: "error" });
    }
  };

  if (step === "initial" || step === "connecting")
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[180px] rounded-full animate-pulse"></div>
        </div>

        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[11px] font-black uppercase tracking-[0.2em] mb-8 relative z-10 shadow-lg shadow-blue-500/5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          {language === 'es' ? 'Motor de Inteligencia SEM' : 'SEM Intelligence Engine'}
        </div>
        
        <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 uppercase tracking-tight leading-tight relative z-10">
          Potencia tu <span className="text-gradient-purple">Estrategia</span>
        </h2>
        
        <p className="text-slate-400 max-w-xl mb-12 text-base md:text-lg font-medium leading-relaxed relative z-10 italic">
          {language === 'es' 
              ? 'Conecta Google Ads para auditar tus campañas con IA, analizar competidores reales y optimizar tu presupuesto con precisión quirúrgica.' 
              : 'Connect Google Ads to audit campaigns with AI, analyze real competitors, and optimize your budget with surgical precision.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md relative z-10">
          <button
            onClick={handleLink}
            disabled={step === "connecting"}
            className="flex-1 px-8 py-5 bg-white text-black hover:bg-neutral-200 rounded-2xl md:rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/10 border-none"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.5 3L3.5 14.5L9 20L20 8.5L14.5 3Z" fill="#FBBC04"/>
              <path d="M14.5 3L3.5 14.5L4.5 15.5L15.5 4L14.5 3Z" fill="#F9AB00"/>
              <path d="M9 20L20 8.5L19 7.5L8 19L9 20Z" fill="#F9AB00"/>
            </svg>
            {step === "connecting" ? t.loadingAccount : (language === 'es' ? '🔗 Vincular Google Ads' : '🔗 Link Google Ads')}
          </button>
          
          <button
            onClick={() => {
              const demoUser: GoogleUser = { name: "Demo User", email: "demo@insitu.ai", picture: "", accessToken: "demo_token" };
              setUser(demoUser);
              loadAccounts("demo_token");
            }}
            className="flex-1 px-8 py-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl md:rounded-[2rem] font-black text-[11px] uppercase tracking-widest transition-all border border-white/10 backdrop-blur-md active:scale-95"
          >
            {language === 'es' ? '✨ Explora con Demo' : '✨ Explore with Demo'}
          </button>
        </div>

        {/* ── Admin Diagnostic Panel ─────────────────────────────────────── */}
        {(currentUser?.role === 'admin' || currentUser?.role === 'superAdmin') && (
          <div className="w-full max-w-lg relative z-10 mt-4">
            <button
              onClick={handleRunDiagnostic}
              disabled={isPinging}
              className="w-full px-6 py-3 bg-slate-800/60 hover:bg-slate-800/80 border border-white/10 hover:border-amber-500/40 rounded-2xl text-amber-400 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPinging ? (
                <><div className="w-3 h-3 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" /> Diagnosticando...</>
              ) : (
                <>🔬 {language === 'es' ? 'Diagnóstico de Conexión (Admin)' : 'Connection Diagnostic (Admin)'}</>
              )}
            </button>

            {pingResult && (
              <div className={`mt-3 p-5 rounded-2xl border text-left text-[11px] font-mono space-y-2 ${
                pingResult.ok
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
              }`}>
                <p className="font-black text-[12px] mb-3 uppercase tracking-widest">
                  {pingResult.ok ? '✅ Conexión OK' : `❌ Error ${pingResult.httpStatus}`}
                </p>
                <div className="space-y-1 text-slate-300">
                  <p><span className="text-slate-500">Google Status:</span> <strong>{pingResult.googleStatus || 'OK'}</strong></p>
                  {pingResult.googleReason && <p><span className="text-slate-500">Reason Code:</span> <strong className="text-rose-400">{pingResult.googleReason}</strong></p>}
                  {pingResult.googleMessage && <p><span className="text-slate-500">Message:</span> {pingResult.googleMessage.substring(0, 120)}</p>}
                  <p><span className="text-slate-500">Dev Token:</span> {pingResult.devTokenConfigured ? `✅ Configurado (${pingResult.devTokenLength} chars)` : '❌ NO configurado'}</p>
                  <p><span className="text-slate-500">Access Token:</span> {pingResult.accessTokenPrefix ?? '(none)'}... {(pingResult.accessTokenPrefix ?? '').startsWith('ya29') ? '✅ formato válido' : '⚠️ formato inesperado'}</p>
                  <p><span className="text-slate-500">API Version:</span> {pingResult.apiVersion}</p>
                  {pingResult.ok && <p><span className="text-slate-500">Cuentas:</span> {pingResult.accounts.length} encontradas</p>}
                </div>
                {!pingResult.ok && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    {(pingResult.googleReason ?? '').includes('DEVELOPER_TOKEN') && (
                      <p className="text-amber-300">⚠️ <strong>Acción requerida:</strong> El Developer Token no está aprobado. Ve a <a href="https://ads.google.com/home/tools/manager-accounts/" target="_blank" className="underline">Google Ads API Center</a> y activa el token.</p>
                    )}
                    {((pingResult.googleReason ?? '') === 'UNAUTHENTICATED' || pingResult.httpStatus === 401) && !(pingResult.googleReason ?? '').includes('DEVELOPER_TOKEN') && (
                      <p className="text-amber-300">⚠️ <strong>Acción requerida:</strong> El access token expiró. Desvincula y vuelve a vincular la cuenta Google Ads.</p>
                    )}
                    {pingResult.httpStatus === 0 && (
                      <p className="text-amber-300">⚠️ <strong>Error de red:</strong> La Netlify Function no respondió. Verifica el despliegue.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20 max-w-7xl mx-auto">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      <div className="text-center space-y-4 md:space-y-6 px-4">
        <h2 className="text-4xl md:text-7xl font-black text-white tracking-tight uppercase leading-[1.1]">
          Ads <span className="text-gradient-magenta">Optimizer</span>
        </h2>
        <p className="text-slate-400 font-medium text-base md:text-lg max-w-2xl mx-auto italic px-2">
          {language === "es" 
            ? "Auditoría en tiempo real para maximizar el rendimiento de tu cuenta de Google Ads."
            : "Real-time audit to maximize your Google Ads account performance."}
        </p>
        {user && (
          <div className="flex items-center justify-center">
            {user.accessToken === 'demo_token' ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Demo Mode</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live API · {user.email}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-3 md:p-4 flex flex-col md:flex-row gap-4 shadow-2xl">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="flex-grow bg-slate-800/50 text-white py-4 px-6 md:px-8 rounded-xl md:rounded-2xl text-base md:text-lg font-bold outline-none border border-white/5 appearance-none cursor-pointer"
          >
            <option value={language === "es" ? "Últimos 30 días" : "Last 30 days"}>{language === "es" ? "📅 30 Días" : "📅 30 Days"}</option>
            <option value={language === "es" ? "Últimos 90 días" : "Last 90 days"}>{language === "es" ? "📅 90 Días" : "📅 90 Days"}</option>
            <option value={language === "es" ? "Últimos 12 meses" : "Last 12 months"}>{language === "es" ? "📅 12 Meses" : "📅 12 Months"}</option>
          </select>
          <button
            onClick={handleAudit}
            disabled={isLoading || !selectedAccount}
            className="w-full md:w-auto px-12 py-4 bg-[#ff477b] text-white rounded-xl md:rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 active:scale-95"
          >
            {isLoading ? "..." : (language === "es" ? "Ejecutar Auditoría" : "Run Audit")}
          </button>
        </div>
      </div>

      <div className="bg-slate-900/60 p-6 md:p-10 rounded-3xl md:rounded-[3rem] border border-white/5 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl mx-4">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500/20 rounded-xl md:rounded-2xl flex items-center justify-center border border-blue-500/20 text-blue-400 shrink-0">
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth={2} /></svg>
          </div>
          <div className="min-w-0 flex-grow">
            <h3 className="text-xl md:text-2xl font-black truncate">{selectedAccount?.name || (language === "es" ? "Selecciona Cuenta" : "Select Account")}</h3>
            <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
              {selectedAccount?.id || "---"}
              {user?.email && <span className="text-slate-700 hidden md:inline">• {user.email}</span>}
            </p>
          </div>
          <button 
            onClick={handleUnlink}
            className="px-4 py-2 border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            {language === 'es' ? 'Desvincular' : 'Unlink'}
          </button>
        </div>
        {step === "picker" && (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex justify-between items-center">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                {language === 'es' ? `Cuentas Disponibles (${accounts.length})` : `Available Accounts (${accounts.length})`}
              </p>
              <button 
                onClick={() => user?.accessToken && loadAccounts(user.accessToken)}
                className="text-[11px] font-black text-blue-400 uppercase hover:text-white transition-colors"
              >
                {language === 'es' ? '🔄 Actualizar' : '🔄 Refresh'}
              </button>
            </div>
            <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar`}>
              {accounts.map(acc => (
                <button 
                  key={acc.id} 
                  onClick={() => handleSelectAccount(acc)} 
                  className={`px-4 py-3 bg-white/5 hover:bg-primary/20 hover:text-white hover:border-primary/50 rounded-xl text-[12px] font-bold border border-white/5 transition-all text-left flex justify-between items-center group ${selectedAccount?.id === acc.id ? 'border-primary bg-primary/10' : ''}`}
                >
                  <span className="truncate mr-2">{acc.name}</span>
                  <span className="text-[9px] opacity-40 group-hover:opacity-100">{acc.id}</span>
                </button>
              ))}
            </div>
            {accounts.length === 0 && (
              <p className="text-sm text-yellow-500/70 italic">
                {language === 'es' ? 'No se encontraron cuentas vinculadas a este perfil.' : 'No accounts found linked to this profile.'}
              </p>
            )}
          </div>
        )}
      </div>

      {audit && (
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/80 border border-white/5 rounded-3xl md:rounded-[3rem] p-6 md:p-10 text-center sticky top-24 mx-4 md:mx-0">
              <p className="text-[11px] font-black text-[#ff477b] uppercase tracking-widest mb-4 md:mb-8">{t.health_score}</p>
              <div className="text-5xl md:text-7xl font-black text-white mb-2">{audit.healthScore}</div>
              <div className="text-[11px] uppercase font-bold text-slate-500">OPTIMIZATION INDEX</div>
              <button onClick={handleDownloadPdf} className="w-full mt-8 md:mt-10 bg-gradient-to-r from-[#ff477b] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#ff477b] text-white rounded-xl md:rounded-2xl py-4 md:py-5 font-black text-[11px] uppercase shadow-[0_10px_30px_rgba(255,71,123,0.3)] transition-all active:scale-95 border-none">
                {t.download_pdf}
              </button>
              <button onClick={handleSendEmailReport} className="w-full mt-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-purple-600 hover:to-indigo-500 text-white rounded-xl md:rounded-2xl py-4 md:py-5 font-black text-[11px] uppercase shadow-[0_10px_30px_rgba(99,102,241,0.3)] transition-all active:scale-95 border-none flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {language === "es" ? "Enviar por Email" : "Send via Email"}
              </button>
            </motion.div>
          </div>

          <div className="lg:col-span-8 space-y-10">
            {performanceData.length > 0 && (
              <div className="bg-slate-900/80 border border-white/5 rounded-3xl md:rounded-[3rem] p-6 md:p-10 mx-4 md:mx-0 overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase">{language === "es" ? "Impresiones vs CPC" : "Impressions vs CPC"}</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#ff477b]" /><span className="text-[11px] text-slate-400 font-black">IMP</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#3b82f6]" /><span className="text-[11px] text-slate-400 font-black">CPC</span></div>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="campaignName" hide />
                      <YAxis yAxisId="left" orientation="left" stroke="#ff477b" fontSize={10} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={10} tickFormatter={(v) => `$${v}`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }} />
                      <Area yAxisId="left" type="monotone" dataKey="impressions" fill="#ff477b" stroke="#ff477b" fillOpacity={0.1} />
                      <Line yAxisId="right" type="monotone" dataKey="cpc" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {competitors.length > 0 && (
              <div className="bg-slate-900/80 border border-white/5 rounded-3xl md:rounded-[3rem] p-6 md:p-10 mx-4 md:mx-0">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase mb-6 md:mb-8">{language === "es" ? "Top 5 Competidores" : "Top 5 Competitors"}</h3>
                <div className="space-y-3 md:space-y-4">
                  {competitors.slice(0, 5).map((comp, i) => (
                    <div key={i} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-white">{comp.domain}</span>
                        <span className="text-[11px] md:text-[11px] text-slate-500 font-bold uppercase tracking-wider">OUTRANKING: {((comp.outrankingShare || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex gap-6 md:gap-8 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                        <div className="text-left md:text-center flex-1 md:flex-initial"><p className="text-[11px] md:text-[11px] text-slate-500 font-black mb-0.5">MKT SHARE</p><p className="text-base md:text-lg font-black text-[#ff477b]">{(comp.impressionShare * 100).toFixed(1)}%</p></div>
                        <div className="text-left md:text-center flex-1 md:flex-initial"><p className="text-[11px] md:text-[11px] text-slate-500 font-black mb-0.5">OVERLAP</p><p className="text-base md:text-lg font-black text-blue-400">{((comp.overlapRate || 0) * 100).toFixed(1)}%</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-slate-900/80 border border-white/5 rounded-3xl md:rounded-[3rem] p-8 md:p-12 mx-4 md:mx-0">
              <h3 className="text-xl md:text-2xl font-black text-white uppercase mb-6 md:mb-8">{t.strategic_diagnosis}</h3>
              <div className="prose prose-invert max-w-none text-slate-400 text-sm md:text-base font-medium leading-relaxed whitespace-pre-wrap">
                {audit.analysis}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdsOptimizerView;
