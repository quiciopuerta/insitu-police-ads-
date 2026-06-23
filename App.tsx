import { useState, useEffect, Suspense, Component, ErrorInfo, ReactNode } from "react";

// ── Error Boundary ───────────────────────────────────────────────
// Prevents a single component crash from unmounting the entire React tree.
// React 19 unmounts the root on unhandled errors → entire page goes black.
class AppErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-white/60">
          <div className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center text-3xl">⚠</div>
          <div className="text-center space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#ff477b]">Error al cargar el módulo</p>
            <p className="text-[10px] text-white/40 max-w-xs">{this.state.error?.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import SEOHead from "./components/SEOHead";
import {
  AdsOptimizerView,
  ImageAuditView,
  VideoAuditView,
  BrandIdentity,
  AdminDashboard,
  ProfileView,
  TechnologyPage,
  PricingPage,
  HistoryPanel,
  BlogView,
  TrafficChecker,
  PrivacyPolicy,
  SupportPage,
  PaymentModal,
  GlossaryView,
  MetricsView,
  TermsOfService,
  SecurityPage,
  ContactPage,
  ResultSkeleton,
  LandingPage,
  CommandCenterHome,
  ResultCard,
  Header,
  Sidebar,
  Footer,
  SearchInterface,
  ExpertAgent,
  AuthGate,
  CreativeLabView,
  GenAdsView,
  FunnelArchitectView,
  MassAdsView,
  AutomationRulesView,
  PortavozIAView,
  ScriptGeneratorView,
  PoliceAdsDashboard,
} from "./components/LazyComponents";
import { FeatureGate } from "./components/ui/FeatureGate";
import ReloadPrompt from "./components/ReloadPrompt";
import { AnalyticsProvider } from "./components/AnalyticsProvider";
import { API_URL } from "./utils/apiConfig";
import { seedBlogIfEmpty } from "./utils/blogSeedData";

import { authService } from "./services/authService";
import { useAuth } from "./hooks/useAuth";
import { useAnalysis } from "./hooks/useAnalysis";
import { useNavigation } from "./hooks/useNavigation";
import { useGlobalSettings } from "./hooks/useGlobalSettings";
import { Language, AppNotification } from "./types";
import Toast from "./components/Toast";
import InAppOverlay from "./components/InAppOverlay";
import SubscriptionGate from "./components/SubscriptionGate";
import { LongTermFeedbackPopup } from "./components/ui/LongTermFeedbackPopup";

import { notificationService } from "./services/notificationService";
import { releaseService } from "./services/releaseService";
import SpotlightModal from "./components/SpotlightModal";
import ReleaseIntelPanel from "./components/ReleaseIntelPanel";
import AuroraToast from "./components/ui/AuroraToast";
import type { PlatformUpdate, TabType } from "./types";
import { historyService } from "./services/historyService";
import { LocalAIManager } from "./components/ui/LocalAIManager";
import { DesktopSubscriptionGate } from "./components/ui/DesktopSubscriptionGate";
import { ExecutionRouter } from "./services/bridge/ExecutionRouter";


const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 border-4 border-[#ff477b]/20 rounded-full"></div>
      <div className="absolute inset-0 border-4 border-[#ff477b] border-t-transparent rounded-full animate-spin"></div>
    </div>
    <p className="text-[#ff477b] font-medium animate-pulse">Inspirando inteligencia...</p>
  </div>
);

const App = () => {
  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem("insitu_lang") as Language) || "es",
  );

  const {
    currentUser,
    setCurrentUser,
    showAuth,
    setShowAuth,
    isProfileOpen,
    setIsProfileOpen,
    isPricingOpen,
    setIsPricingOpen,
    checkoutTier,
    setCheckoutTier,
    handleLogin,
    handleLogout,
    handleSelectPlan,
    isPrivacyOpen,
    setIsPrivacyOpen,
    isTermsOpen,
    setIsTermsOpen,
    isGlossaryOpen,
    setIsGlossaryOpen,
  } = useAuth(language);
  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.role === 'superAdmin' || 
                  currentUser?.email === 'admin@insitu.ai' || 
                  currentUser?.email === 'sanchezfj@me.com' ||
                  currentUser?.email === 'sociopuerta@gmail.com' ||
                  currentUser?.email === 'admin@insitu.company' ||
                  currentUser?.email === 'contacto@fjsanchez.com';

  const isSuperAdmin = currentUser?.role === 'superAdmin' || 
                       currentUser?.email === 'admin@insitu.ai' || 
                       currentUser?.email === 'sanchezfj@me.com' || 
                       currentUser?.email === 'sociopuerta@gmail.com' ||
                       currentUser?.email === 'admin@insitu.company' ||
                       currentUser?.email === 'contacto@fjsanchez.com';

  const [theme] = useState<"dark" | "light">("dark");
  const [restoreParams, setRestoreParams] = useState<any>(undefined);
  const [restoredAudit, setRestoredAudit] = useState<any>(null);
  const [campaignContext, setCampaignContext] = useState<string>("");
  const [prefilledMedia, setPrefilledMedia] = useState<{ url: string; type: 'video' | 'image' } | null>(null);
  const [funnelResult, setFunnelResult] = useState<any>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [activeNotifications, setActiveNotifications] = useState<AppNotification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<AppNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [spotlightUpdate, setSpotlightUpdate] = useState<PlatformUpdate | null>(null);
  const [auroraToastUpdate, setAuroraToastUpdate] = useState<PlatformUpdate | null>(null);
  const [isReleasePanelOpen, setIsReleasePanelOpen] = useState(false);


  const { settings: globalSettings } = useGlobalSettings();

  useEffect(() => {
    if (isPricingOpen) {
      import("./services/martechService").then(({ martechService }) => {
        martechService.trackPageView("/pricing", "View: Pricing");
      });
    }
  }, [isPricingOpen]);

  useEffect(() => {
    if (isProfileOpen) {
      import("./services/martechService").then(({ martechService }) => {
        martechService.trackPageView("/profile", "View: Profile");
      });
    }
  }, [isProfileOpen]);

  useEffect(() => {
    if (isPrivacyOpen) {
      import("./services/martechService").then(({ martechService }) => {
        martechService.trackPageView("/privacy", "View: Privacy Policy");
      });
    }
  }, [isPrivacyOpen]);

  useEffect(() => {
    if (isTermsOpen) {
      import("./services/martechService").then(({ martechService }) => {
        martechService.trackPageView("/terms", "View: Terms of Service");
      });
    }
  }, [isTermsOpen]);

  useEffect(() => {
    if (isGlossaryOpen) {
      import("./services/martechService").then(({ martechService }) => {
        martechService.trackPageView("/glossary", "View: Glossary");
      });
    }
  }, [isGlossaryOpen]);

  useEffect(() => {
    if (isSupportOpen) {
      import("./services/martechService").then(({ martechService }) => {
        martechService.trackPageView("/support", "View: Support");
      });
    }
  }, [isSupportOpen]);

  const {
    loading,
    result,
    setResult,
    error,
    setError,
    isQuotaError,
    setIsQuotaError,
    history,
    setHistory,
    handleSearch,
    addHistoryItem,
    deleteHistoryItem,
  } = useAnalysis(currentUser, language, backendOnline);

  const {
    activeTab,
    setActiveTab,
    featureTab,
    setFeatureTab,
    isHistoryOpen,
    setIsHistoryOpen,
    isAdminOpen,
    setIsAdminOpen,
    isTechOpen,
    setIsTechOpen,
    selectedBlogPost,
    setSelectedBlogPost
  } = useNavigation();

  useEffect(() => {
    seedBlogIfEmpty();
    import("./services/blogService").then(({ blogService }) => {
      blogService.preFetchPosts();
    });
    
    // Only poll backend health in development
    if (import.meta.env.DEV) {
      const checkBackend = async () => {
        try {
          // Robustly determine backend base URL from API_URL
          let healthUrl = API_URL.endsWith("/api") ? API_URL.replace("/api", "") : API_URL;
          
          // If relative, use current origin
          if (!healthUrl || healthUrl === "" || healthUrl.startsWith("/")) {
            healthUrl = window.location.origin;
          }
          
          const res = await fetch(healthUrl, { method: "GET" });
          setBackendOnline(res.ok);
        } catch (err) {
          setBackendOnline(false);
        }
      };
      checkBackend();
      const interval = setInterval(checkBackend, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    const syncModalsWithUrl = () => {
      const path = window.location.pathname.slice(1).split('/')[0];
      if (["privacy", "terms", "glossary", "pricing", "technology", "security", "contact", "admin"].includes(path)) {
        setIsPrivacyOpen(path === "privacy");
        setIsTermsOpen(path === "terms");
        setIsGlossaryOpen(path === "glossary");
        setIsPricingOpen(path === "pricing");
        setIsTechOpen(path === "technology");
        setIsSecurityOpen(path === "security");
        setIsContactOpen(path === "contact");
        setIsSupportOpen(path === "support");

        if (path === "admin") {
          if (isAdmin) {
            setIsAdminOpen(true);
          } else {
            window.history.replaceState({}, "", "/");
            setIsAdminOpen(false);
            setActiveTab("analyzer");
          }
        }
      } else {
        setIsPrivacyOpen(false);
        setIsTermsOpen(false);
        setIsGlossaryOpen(false);
        setIsPricingOpen(false);
        setIsTechOpen(false);
        setIsSecurityOpen(false);
        setIsContactOpen(false);
        setIsSupportOpen(false);
        setIsAdminOpen(false);
      }
    };
    syncModalsWithUrl();
    window.addEventListener("popstate", syncModalsWithUrl);
    return () => window.removeEventListener("popstate", syncModalsWithUrl);
  }, [setIsPrivacyOpen, setIsTermsOpen, setIsGlossaryOpen, setIsPricingOpen, setIsTechOpen, setIsAdminOpen, currentUser]);

  useEffect(() => {
    setIsPrivacyOpen(false);
    setIsTermsOpen(false);
    setIsGlossaryOpen(false);
    setIsPricingOpen(false);
    setIsTechOpen(false);
    setIsAdminOpen(false);
  }, [activeTab]);

  useEffect(() => {
    const path = window.location.pathname.slice(1).split('/')[0];
    let newPath = "";
    if (isPrivacyOpen && path !== "privacy") newPath = "/privacy";
    else if (isTermsOpen && path !== "terms") newPath = "/terms";
    else if (isGlossaryOpen && path !== "glossary") newPath = "/glossary";
    else if (isPricingOpen && path !== "pricing") newPath = "/pricing";
    else if (isTechOpen && path !== "technology") newPath = "/technology";
    else if (isSecurityOpen && path !== "security") newPath = "/security";
    else if (isContactOpen && path !== "contact") newPath = "/contact";
    else if (isSupportOpen && path !== "support") newPath = "/support";
    else if (isAdminOpen && path !== "admin") newPath = "/admin";

    if (newPath && newPath !== window.location.pathname) {
      window.history.pushState({}, "", newPath);
    }
  }, [isPrivacyOpen, isTermsOpen, isGlossaryOpen, isPricingOpen, isTechOpen, isSecurityOpen, isContactOpen, isSupportOpen, isAdminOpen]);

  useEffect(() => {
    if (isTechOpen) {
      import("./services/martechService").then(({ martechService }) => {
        martechService.trackPageView("/technology", "View: Technology");
      });
    }
  }, [isTechOpen]);

  useEffect(() => {
    if (!currentUser) return;
    const pollNotifications = async () => {
      // Don't poll if the tab is hidden
      if (document.hidden) return;
      
      try {
        const { notifications, unreadCount } = await notificationService.getAllNotifications(currentUser.id);
        setUnreadCount(unreadCount);
        setAllNotifications(notifications);

        const existingIds = new Set([
          ...activeNotifications.map(n => n.id),
          ...(currentNotification ? [currentNotification.id] : [])
        ]);

        const freshNotifs = notifications.filter(n => !n.read && !existingIds.has(n.id));
        
        if (freshNotifs.length > 0) {
          setActiveNotifications((prev) => [...prev, ...freshNotifs]);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };
    pollNotifications();
    const interval = setInterval(pollNotifications, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.id, activeNotifications, currentNotification]);

  // ── One-shot WOW notification check after login ──────────────────────────
  useEffect(() => {
    if (!currentUser?.id) return;
    // Small delay so the UI settles after login before showing the modal
    const t = setTimeout(async () => {
      const update = await releaseService.checkPendingUpdate(currentUser.id);
      if (update) {
        if (update.type === 'major') {
          setSpotlightUpdate(update);
        } else {
          setAuroraToastUpdate(update);
        }
        // Pre-mark as read so it won't show again on refresh
        releaseService.markRead(currentUser.id, update.id, "in_app_modal");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [currentUser?.id]);

  useEffect(() => {
    if (activeNotifications.length > 0 && !currentNotification) {
      const next = activeNotifications[0];
      setCurrentNotification(next);
      setActiveNotifications((prev) => prev.slice(1));
      if (currentUser) {
        // Track as opened/read
        notificationService.markAsRead(currentUser.id, next.id);
        
        if (!next.id.startsWith('comp_')) {
          (notificationService as any).trackEvent(currentUser.id, 'OPENED', next.campaignId || 'direct', next.id);
        }
      }
      if (next.type === 'custom' || next.type === 'weekly-insights' || next.type === 'competitor') {
        setShowOverlay(true);
      }
    }
  }, [activeNotifications, currentNotification, currentUser]);

  useEffect(() => {
    if (isAdminOpen) {
      import("./services/martechService").then(({ martechService }) => {
        martechService.trackPageView("/admin", "View: Admin");
      });
    }
  }, [isAdminOpen]);

  const handleMarkNotificationRead = async (id: string) => {
    if (!currentUser) return;
    await notificationService.markAsRead(currentUser.id, id);
    // Refresh list locally to show as read immediately
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    // Unread count will refresh on next poll or we can manually decrement if we're sure
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("insitu_lang", lang);
  };

  const handleThemeToggle = () => {};

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const handleOpenSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setError(null);
      setIsQuotaError(false);
    } else {
      window.open("https://ai.google.dev/gemini-api/docs/billing", "_blank");
    }
  };

  const userHistory = history.filter((item) => item.userId === currentUser?.id);

  const isSubscriptionExpired = currentUser && 
    !isAdmin && 
    currentUser.subscription?.expiryDate > 0 && 
    Date.now() > currentUser.subscription.expiryDate;

  return (
    <div className={`min-h-screen w-screen antialiased flex relative transition-colors duration-300 bg-[#020617] text-white font-body`}>
      <AnalyticsProvider />
      <LocalAIManager currentUser={currentUser} />
      <DesktopSubscriptionGate currentUser={currentUser} language={language} />

      {/* Multi-layer Spatial Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Base dark */}
        <div className="absolute inset-0 bg-[#020617]" />
        {/* Top-right nebula — magenta */}
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(255,71,123,0.18) 0%, transparent 65%)' }} />
        {/* Bottom-left nebula — violet */}
        <div className="absolute -bottom-1/4 -left-1/4 w-[55vw] h-[55vw] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)' }} />
        {/* Center depth wash */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(13,7,32,0.7) 0%, transparent 70%)' }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      </div>

      <SEOHead
        activeTab={activeTab}
        language={language}
        isPricingOpen={isPricingOpen}
        isTechOpen={isTechOpen}
        isPrivacyOpen={isPrivacyOpen}
        isTermsOpen={isTermsOpen}
        isGlossaryOpen={isGlossaryOpen}
        isSecurityOpen={isSecurityOpen}
        isContactOpen={isContactOpen}
        isAdminOpen={isAdminOpen}
      />

      <Suspense fallback={<PageLoader />}>
        {isPrivacyOpen && (
          <PrivacyPolicy language={language} onClose={() => setIsPrivacyOpen(false)} />
        )}
        {isTermsOpen && (
          <TermsOfService language={language} onClose={() => setIsTermsOpen(false)} />
        )}
      </Suspense>

      <>
      {globalSettings.maintenanceMode && !isAdmin && (
        <div className="fixed inset-0 z-[9999] bg-[#0a0f1e] flex flex-col items-center justify-center text-white">
          <div className="w-16 h-16 mb-8 text-amber-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-3">{language === 'es' ? 'Mantenimiento' : 'Maintenance'}</h1>
          <p className="text-slate-400 text-sm max-w-md text-center leading-relaxed">
            {language === 'es' ? 'Estamos realizando mejoras en la plataforma. Volveremos en breve. Gracias por tu paciencia.' : 'We are making improvements to the platform. We will be back shortly. Thank you for your patience.'}
          </p>
          <div className="mt-8 flex space-x-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}

      {(!currentUser && activeTab === "analyzer") || activeTab === "blog" ? null : (
        <Suspense fallback={null}>
          <Sidebar
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab as TabType)}
            hasResult={!!result}
            onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
            historyCount={userHistory.length}
            unreadCount={unreadCount}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            language={language}
            onLanguageChange={handleLanguageChange}
            onLogin={() => setShowAuth(true)}
            theme="dark"
            onThemeToggle={() => {}}
            onFeatureTabChange={setFeatureTab}
            featureTab={featureTab}
            onToggleUpdates={() => setIsReleasePanelOpen(true)}
          />
        </Suspense>
      )}

      <main className="relative z-10 flex-1 min-h-screen overflow-y-auto flex flex-col custom-scrollbar">
        {backendOnline === false && (
          <div className="bg-rose-500/10 border-b border-rose-500/20 py-3 px-4 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 animate-in slide-in-from-top duration-500 relative z-[60]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
              <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-rose-500">
                {language === "es" ? "Servidor AI Desconectado" : "AI Server Offline"}
              </p>
            </div>
            <div className="hidden md:block w-px h-3 bg-rose-500/30"></div>
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-tight text-rose-400/80">
              {language === "es" ? "Por favor, inicia el backend con 'npm run server' para habilitar el motor de IA." : "Please start the backend with 'npm run server' to enable the AI engine."}
            </p>
          </div>
        )}
        <div className="w-full p-6 lg:p-10">
        <AppErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          {activeTab === "analyzer" && (
            <div className="w-full">
              {!currentUser ? (
                <LandingPage
                  onGetStarted={() => setShowAuth(true)}
                  onLogin={() => setShowAuth(true)}
                  onOpenTech={() => setIsTechOpen(true)}
                  onOpenPricing={() => setIsPricingOpen(true)}
                  language={language}
                  onLanguageChange={handleLanguageChange}
                />
              ) : (
                <CommandCenterHome 
                  language={language} 
                  onNavigate={(tab) => setActiveTab(tab as TabType)} 
                />
              )}
            </div>
          )}

          {activeTab === "police-ads" && (
            <div className="space-y-16 animate-in fade-in zoom-in-95 duration-500">
              {!currentUser ? (
                <AuthGate onLogin={handleLogin} onCancel={() => {}} language={language} />
              ) : (
                <PoliceAdsDashboard currentUser={currentUser} />
              )}
            </div>
          )}

          {activeTab === "search" && (
            <div className="space-y-16 animate-in fade-in zoom-in-95 duration-500">
              {!currentUser ? (
                <AuthGate onLogin={handleLogin} onCancel={() => {}} language={language} />
              ) : (
                <>
                  <div className="text-center mb-16 space-y-6">
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight">
                      {language === "es" ? "Auditoría" : "Audit"}{" "}
                      <span className="text-gradient-magenta drop-shadow-[0_0_15px_rgba(255,73,124,0.3)]">SEM</span>.
                    </h1>
                  </div>
                  <SearchInterface 
                    onSearch={handleSearch} 
                    isLoading={loading} 
                    language={language} 
                    initialValues={restoreParams} 
                    onNavigateToOptimizer={() => setActiveTab('campaigns')}
                  />
                  <div id="results-section" className="mt-20">
                    {loading && !result && (
                      <div className="mt-8">
                        <ResultSkeleton />
                      </div>
                    )}
                    {error && (
                      <div className="max-w-3xl mx-auto">
                        <div className={`p-10 rounded-[2.5rem] border ${isQuotaError ? "bg-amber-50 border-amber-200" : "bg-rose-50 border-rose-200"} shadow-2xl`}>
                          <div className="flex items-start space-x-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isQuotaError ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"}`}>
                              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                            <div className="space-y-4">
                              <h3 className={`text-xl font-black uppercase tracking-tight ${isQuotaError ? "text-amber-900" : "text-rose-900"}`}>
                                {isQuotaError ? (language === "es" ? "Cuota Excedida (429)" : "Quota Limit Reached (429)") : (language === "es" ? "Error de Sistema" : "System Error")}
                              </h3>
                              <p className={`text-sm font-medium ${isQuotaError ? "text-amber-700" : "text-rose-700"} leading-relaxed`}>
                                {isQuotaError ? (language === "es" ? "Límite alcanzado. Vincula tu propia API Key." : "Limit reached. Link your API Key.") : error}
                              </p>
                              {isQuotaError && (
                                <button onClick={handleOpenSelectKey} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl">
                                  {language === "es" ? "Vincular API Key" : "Link API Key"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}


            {result && !loading && (
              <div className="mt-8 transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
                <ResultCard 
                  result={result} 
                  onElevateToFunnel={(res) => {
                    setFunnelResult(res);
                    setActiveTab("funnel-architect");
                  }}
                />
              </div>
            )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "traffic-checker" && (
            <TrafficChecker
              user={currentUser}
              onUpgrade={() => setIsPricingOpen(true)}
              language={language}
              restoredAudit={restoredAudit?.type === "traffic" ? restoredAudit.result : null}
              onSaveAudit={(res, q) => addHistoryItem({ type: "traffic", result: res, query: q })}
            />
          )}

          {(activeTab === "image-ai" || activeTab === "image-audit") && (!currentUser ? (
              <AuthGate onLogin={handleLogin} onCancel={() => setActiveTab("analyzer")} language={language} />
            ) : (
              <FeatureGate
                user={currentUser}
                allowedPlans={['Growth', 'Agency']}
                featureName={language === 'es' ? 'Auditoría de Imagen' : 'Image Audit'}
                language={language}
                onUpgrade={() => setIsPricingOpen(true)}
              >
                <ImageAuditView
                  language={language}
                  theme={theme}
                  prefilledUrl={prefilledMedia?.type === 'image' ? prefilledMedia.url : undefined}
                  restoredAudit={restoredAudit?.type === "image" ? restoredAudit.result : null}
                  onSaveAudit={(res, q) => addHistoryItem({ type: "image", result: res, query: q })}
                />
              </FeatureGate>
            ))}
          {(activeTab === "video-ai" || activeTab === "video-audit") && (!currentUser ? (
              <AuthGate onLogin={handleLogin} onCancel={() => setActiveTab("analyzer")} language={language} />
            ) : (
              <FeatureGate
                user={currentUser}
                allowedPlans={['Growth', 'Agency']}
                featureName={language === 'es' ? 'Auditoría de Video' : 'Video Audit'}
                language={language}
                onUpgrade={() => setIsPricingOpen(true)}
              >
                <VideoAuditView
                  language={language}
                  theme={theme}
                  prefilledUrl={prefilledMedia?.type === 'video' ? prefilledMedia.url : undefined}
                  restoredAudit={restoredAudit?.type === "video" ? restoredAudit.result : null}
                  onSaveAudit={(res, q) => addHistoryItem({ type: "video", result: res, query: q })}
                />
              </FeatureGate>
            ))}
          {activeTab === "brand-identity" && (!currentUser ? (
              <AuthGate onLogin={handleLogin} onCancel={() => setActiveTab("analyzer")} language={language} />
            ) : (
              <FeatureGate
                user={currentUser}
                allowedPlans={['Agency']}
                featureName="Brand Identity"
                language={language}
                onUpgrade={() => setIsPricingOpen(true)}
              >
                <BrandIdentity currentUser={currentUser} language={language} onUpdateUser={setCurrentUser} />
              </FeatureGate>
            ))}
          {activeTab === "metrics" && <MetricsView searchResult={result} />}
          {activeTab === "blog" && <BlogView language={language} initialPost={selectedBlogPost} onPostViewed={() => setSelectedBlogPost(null)} />}
          {activeTab === "campaigns" && (
              <FeatureGate
                user={currentUser}
                allowedPlans={['Growth', 'Agency']}
                featureName={language === 'es' ? 'Optimizador' : 'Ads Optimizer'}
                language={language}
                onUpgrade={() => setIsPricingOpen(true)}
              >
                <AdsOptimizerView 
                  language={language} 
                  restoredAudit={restoredAudit?.type === "campaign" ? restoredAudit.result : null}
                  currentUser={currentUser}
                  onUpdateUser={setCurrentUser}
                  onSaveAudit={(res, q) => {
                    addHistoryItem({ type: "campaign", result: res, query: q });
                    setCampaignContext(`DATOS DE CAMPAÑA:\n${res.analysis}\nScore: ${res.healthScore}\nIssues: ${res.criticalIssues.join(", ")}`);
                  }}
                />
              </FeatureGate>
            )}
          {activeTab === "creative-lab" && (
            <FeatureGate
              user={currentUser}
              allowedPlans={['Growth', 'Agency']}
              featureName="Creative Lab"
              language={language}
              onUpgrade={() => setIsPricingOpen(true)}
            >
              <CreativeLabView 
                currentUser={currentUser} 
                language={language} 
                onLogin={handleLogin} 
                onCancel={() => setActiveTab("analyzer")} 
                onAudit={(ad) => {
                  setPrefilledMedia({ url: ad.url, type: ad.type as any });
                  setFeatureTab(ad.type === 'video' ? 'video-audit' : 'image-audit');
                  setActiveTab('creative-lab');
                }}
                initialLab={featureTab as any}
                prefilledMedia={prefilledMedia}
                restoredAudit={restoredAudit}
                history={history}
                onSaveHistory={addHistoryItem}
              />
            </FeatureGate>
          )}

          {activeTab === "gen-ads" && (
            <FeatureGate
              user={currentUser}
              allowedPlans={['Growth', 'Agency']}
              featureName="Gen-Ads AI"
              language={language}
              onUpgrade={() => setIsPricingOpen(true)}
            >
              <GenAdsView 
                currentUser={currentUser} 
                language={language} 
                onLogin={handleLogin} 
                onCancel={() => setActiveTab("analyzer")} 
                history={history}
                onSaveHistory={addHistoryItem}
              />
            </FeatureGate>
          )}

          {activeTab === "mass-ads" && (
            <FeatureGate
              user={currentUser}
              allowedPlans={['Growth', 'Agency']}
              featureName="Ads Masivos"
              language={language}
              onUpgrade={() => setIsPricingOpen(true)}
            >
              <MassAdsView
                currentUser={currentUser}
                language={language}
                history={history}
                onSaveHistory={addHistoryItem}
              />
            </FeatureGate>
          )}

          {activeTab === "automation-rules" && (
            <FeatureGate
              user={currentUser}
              allowedPlans={['Growth', 'Agency']}
              featureName="Automation Rules"
              language={language}
              onUpgrade={() => setIsPricingOpen(true)}
            >
              <AutomationRulesView
                currentUser={currentUser}
                language={language}
              />
            </FeatureGate>
          )}

          {activeTab === "portavoz" && (
            <Suspense fallback={<PageLoader />}>
              <PortavozIAView
                currentUser={currentUser}
                language={language}
                onBack={() => setActiveTab('analyzer')}
              />
            </Suspense>
          )}

          {activeTab === "scripts" && (
            <Suspense fallback={<PageLoader />}>
              <ScriptGeneratorView language={language} />
            </Suspense>
          )}

          {activeTab === "funnel-architect" && (
             <FeatureGate
               user={currentUser}
               allowedPlans={['Agency']}
               featureName="Funnel Architect"
               language={language}
               onUpgrade={() => setIsPricingOpen(true)}
             >
               <FunnelArchitectView 
                 result={funnelResult} 
                 onBack={() => setActiveTab("analyzer")}
                 language={language}
               />
             </FeatureGate>
          )}


          {/* Catch-all Debug for Unknown Tabs */}
          {!['search', 'analyzer', 'image-ai', 'video-ai', 'image-audit', 'video-audit', 'traffic-checker', 'brand-identity', 'metrics', 'blog', 'campaigns', 'creative-lab', 'gen-ads', 'research-hub', 'funnel-architect', 'mass-ads', 'automation-rules', 'portavoz', 'scripts', 'police-ads'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
               <h2 className="text-2xl font-black text-white uppercase italic">Tab: {activeTab}</h2>
               <p className="text-rose-400 font-bold">No view mapped for this identifier.</p>
               <button onClick={() => setActiveTab('analyzer')} className="bg-white/10 px-6 py-2 rounded-full text-xs font-black uppercase">Volver al Inicio</button>
            </div>
          )}
        </Suspense>
        </AppErrorBoundary>
        </div>
        <Suspense fallback={null}>
          <Footer language={language} />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        {isTechOpen && <TechnologyPage onClose={() => setIsTechOpen(false)} currentUser={currentUser} />}
        {isPricingOpen && <PricingPage onClose={() => setIsPricingOpen(false)} onGetStarted={() => setShowAuth(true)} onSelectPlan={handleSelectPlan} currentUser={currentUser} language={language} />}
        {showAuth && <AuthGate onLogin={handleLogin} onCancel={() => setShowAuth(false)} language={language} />}
        {checkoutTier && (
          <PaymentModal
            tier={checkoutTier}
            onClose={() => setCheckoutTier(null)}
            onSuccess={() => {
              setCheckoutTier(null);
              const updatedUser = authService.getCurrentUser();
              if (updatedUser) setCurrentUser(updatedUser);
            }}
          />
        )}
        <HistoryPanel
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          history={userHistory}
          onLoadItem={async (item) => {
            let fullItem = item;
            // Lazy load result if missing (due to list view optimization)
            if (!item.result && item.id && currentUser) {
              const detailed = await historyService.getHistoryItem(currentUser.id, item.id);
              if (detailed) fullItem = detailed;
            }

            if (fullItem.type === "search") {
              setResult(fullItem.result);
              setRestoreParams(fullItem.query);
              setActiveTab("analyzer");
            } else {
              setRestoredAudit(fullItem);
              if (fullItem.type === "image") setActiveTab("image-ai");
              else if (fullItem.type === "video") setActiveTab("video-ai");
              else if (fullItem.type === "comparison") setActiveTab("compare-ai");
              else if (fullItem.type === "traffic") setActiveTab("traffic-checker");
              else if (fullItem.type === "campaign") setActiveTab("campaigns");
              else if (fullItem.type === "gen-ads") setActiveTab("gen-ads");
              else if (fullItem.type === "mass-ads") setActiveTab("mass-ads");
            }
            setIsHistoryOpen(false);
          }}
          onDeleteItem={(id) => deleteHistoryItem(id)}
          onClearAll={async () => {
            if (currentUser) {
              const toDelete = history.filter(h => h.userId === currentUser.id);
              for (const item of toDelete) {
                await deleteHistoryItem(item.id);
              }
            }
          }}
          language={language}
        />
        {isAdminOpen && (
          <AdminDashboard
            history={history}
            language={language}
            onClearHistory={() => setHistory([])}
            onClose={() => { setIsAdminOpen(false); setActiveTab("analyzer"); }}
          />
        )}
        {isProfileOpen && <ProfileView user={currentUser} onUpdate={setCurrentUser} onClose={() => { setIsProfileOpen(false); setActiveTab("analyzer"); }} />}
        {isGlossaryOpen && <GlossaryView onClose={() => setIsGlossaryOpen(false)} language={language} />}
        {isSecurityOpen && <SecurityPage onClose={() => setIsSecurityOpen(false)} language={language} />}
        {isContactOpen && <ContactPage onClose={() => setIsContactOpen(false)} language={language} />}
        {isSupportOpen && <SupportPage onClose={() => setIsSupportOpen(false)} language={language} />}
      </Suspense>

      <Suspense fallback={null}>
        <ExpertAgent
          language={language}
          currentUser={currentUser}
          onUpgrade={() => setIsPricingOpen(true)}
          currentView={activeTab}
          campaignContext={campaignContext}
          comingSoon={globalSettings.comingSoon}
        />
      </Suspense>
      <ReloadPrompt />
      {showOverlay && currentNotification && (
        <InAppOverlay 
          notification={currentNotification}
          language={language}
          onClose={() => setShowOverlay(false)}
          onAction={(url) => {
            if (currentUser) {
              (notificationService as any).trackEvent(currentUser.id, 'CLICKED', currentNotification.campaignId || 'direct', currentNotification.id);
            }
            if (url) window.open(url, '_blank');
            setShowOverlay(false);
          }}
        />
      )}
      {isSubscriptionExpired && (
        <SubscriptionGate 
          user={currentUser} 
          language={language} 
          onUpgrade={() => setIsPricingOpen(true)} 
        />
      )}
      {currentUser && <LongTermFeedbackPopup userId={currentUser.id} />}
      {/* WOW Notifications */}
      {spotlightUpdate && (
        <SpotlightModal
          update={spotlightUpdate}
          language={language}
          onClose={() => setSpotlightUpdate(null)}
          onGoToFeature={(tab) => { setActiveTab(tab as TabType); setSpotlightUpdate(null); }}
        />
      )}
      {auroraToastUpdate && (
        <AuroraToast
          show={!!auroraToastUpdate}
          type={auroraToastUpdate.type}
          title={language === 'es' ? auroraToastUpdate.title_es : auroraToastUpdate.title_en}
          message={language === 'es' ? auroraToastUpdate.description_es : auroraToastUpdate.description_en}
          onClose={() => setAuroraToastUpdate(null)}
        />
      )}
      <ReleaseIntelPanel
        isOpen={isReleasePanelOpen}
        onClose={() => setIsReleasePanelOpen(false)}
        language={language}
        userId={currentUser?.id}
        userNotifications={allNotifications}
        onMarkRead={handleMarkNotificationRead}
      />
      </>
    </div>
  );
};

export default App;
