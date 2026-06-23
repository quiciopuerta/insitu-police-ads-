import React, { useState, useRef, useEffect } from "react";
import { AuthUser, Language } from "../types";
import { authService } from "../services/authService";
import { TRANSLATIONS } from "../constants";
import LogoIsotype from "./LogoIsotype";
import { ProfileSelector } from "./ui/ProfileSelector";
import { AIContextBadge } from "./ui/AIContextBadge";
import { Download, Monitor } from "lucide-react";
import { ExecutionRouter } from "../services/bridge/ExecutionRouter";
import { userService } from "../services/auth/userService";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  hasResult: boolean;
  onToggleHistory: () => void;
  historyCount: number;
  currentUser: AuthUser | null;
  onLogout: () => void;
  onLogin: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  unreadCount: number;
  theme: "dark" | "light";
  onThemeToggle: () => void;
  onFeatureTabChange?: (tab: string) => void;
  featureTab?: string | null;
  onToggleUpdates?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onToggleHistory,
  historyCount,
  currentUser,
  onLogout,
  onLogin,
  onOpenAdmin,
  onOpenProfile,
  language,
  onLanguageChange,
  unreadCount,
  theme,
  onThemeToggle: _onThemeToggle,
  onFeatureTabChange,
  featureTab,
  onToggleUpdates,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGoogleAdsOpen, setIsGoogleAdsOpen] = useState(false);
  const [isCreativeOpen, setIsCreativeOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const creativeMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isDesktop = ExecutionRouter.isDesktopMode();
  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac');
  const isAuthorizedForDesktop = currentUser && (
    currentUser.subscription?.plan === 'Growth' ||
    currentUser.subscription?.plan === 'Agency' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'superAdmin' ||
    ['admin@insitu.ai', 'sanchezfj@me.com', 'sociopuerta@gmail.com', 'admin@insitu.company', 'contacto@fjsanchez.com'].includes(currentUser.email)
  );

  // Map header item IDs to the featureTab value they produce
  const creativeFeatureMap: Record<string, string> = {
    'gen-ads': 'ads',
    'research-hub': 'research',
    'compare-ai': 'compare',
    'audio': 'audio',
    'retail': 'retail',
    'animate': 'animate',
    'master': 'master',
    'mass-ads': 'mass-ads',
    'creative-lab': 'video',
    'portavoz-ia': 'portavoz',
  };
  const isCreativeItemActive = (itemId: string) =>
    activeTab === 'creative-lab' && featureTab === creativeFeatureMap[itemId];

  const plan = currentUser?.subscription?.plan;
  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.role === 'superAdmin' ||
                  currentUser?.email === 'admin@insitu.ai' || 
                  currentUser?.email === 'sanchezfj@me.com' ||
                  currentUser?.email === 'sociopuerta@gmail.com';
  
  const isSuperAdmin = currentUser?.role === 'superAdmin' || 
                       currentUser?.email === 'admin@insitu.ai' || 
                       currentUser?.email === 'sanchezfj@me.com' || 
                       currentUser?.email === 'sociopuerta@gmail.com' ||
                       currentUser?.email === 'admin@insitu.company' ||
                       currentUser?.email === 'contacto@fjsanchez.com';
  const isCampaignsLocked = !currentUser || !["Agency", "Growth"].includes(plan || "");

  const googleAdsItems = [
    {
      id: "analyzer",
      label: language === "es" ? "Auditoría Google Ads" : "Market Audit",
      description: language === "es" ? "Search & Keywords" : "Search & Keywords",
      locked: false,
    },
    {
      id: "traffic-checker",
      label: language === "es" ? "Competidores" : "Competitor SEO",
      description: language === "es" ? "Análisis de Tráfico" : "Traffic Analysis",
      locked: false,
    },

    {
      id: "campaigns",
      label: language === "es" ? "Optimizador" : "Ads Optimizer",
      description: language === "es" ? "Eficiencia de Presupuesto" : "Budget Efficiency",
      locked: isCampaignsLocked,
    },

    {
      id: "scripts",
      label: language === "es" ? "Generador de Scripts" : "Script Generator",
      description: language === "es" ? "Automatización IA" : "AI Automation",
      locked: false,
    },
    {
      id: "police-ads",
      label: "Police Ads",
      description: language === "es" ? "Centro de Control" : "Command Center",
      locked: false,
    },
  ].filter((item) => {
    // Feature flag check with safe fallback
    if (item.id === "analyzer")
      return authService.getSettings().features?.metrics ?? true;
    if (item.id === "traffic-checker")
      return authService.getSettings().features?.trafficAnalysis ?? true;

    if (item.id === "campaigns")
      return authService.getSettings().features?.campaignsOptimizer ?? true;
    if (item.id === "scripts")
      return authService.getSettings().features?.scriptGenerator ?? true;
    return true;
  });

  const creativeLabGroups = [
    {
      label: language === 'es' ? 'Estudio de Creación' : 'Creation Studio',
      items: [
        // ── Creative Hub (Imagen + Video) — Super Admin Only ──
        { id: "creative-lab", label: "Creative Hub", description: language === 'es' ? "IA Generativa" : "Generative Hub", locked: !isSuperAdmin },
        { id: 'portavoz-ia', label: language === 'es' ? 'Mi Avatar' : 'My Avatar', description: language === 'es' ? 'Avatar & Voice' : 'Avatar & Voice', locked: !isSuperAdmin && typeof window !== 'undefined' && window.location.hostname !== 'localhost' },
        { id: 'animate', label: TRANSLATIONS[language].animate_lab, description: language === 'es' ? "Imagen a Video" : "Image to Video", locked: !isSuperAdmin },
        { id: 'audio', label: TRANSLATIONS[language].audio_hub, description: language === 'es' ? "Clonación y TTS" : "Cloning & TTS", locked: !isSuperAdmin },
        { id: "gen-ads", label: "Ad Copy Lab", description: language === 'es' ? "AI Copywriting" : "AI Copywriting", locked: false },
      ]
    },
    {
      label: language === 'es' ? 'Optimización & Bulk' : 'Bulk & Optimization',
      items: [
        { id: 'retail', label: TRANSLATIONS[language].retail_bulk, description: language === 'es' ? "Catálogo Pro" : "Pro Catalog", locked: !isSuperAdmin },
        { id: 'master', label: TRANSLATIONS[language].video_mastering, description: language === 'es' ? "Mastering Pro" : "Pro Mastering", locked: !isSuperAdmin },
        { id: 'mass-ads', label: TRANSLATIONS[language].mass_ads_lab, description: TRANSLATIONS[language].mass_ads_description, locked: !isSuperAdmin && currentUser?.subscription?.plan !== 'Agency' && currentUser?.subscription?.plan !== 'Growth' },
      ]
    },
    {
      label: language === 'es' ? 'Inteligencia & Strategy' : 'Strategy & Insights',
      items: [
        { id: "research-hub", label: "Research IA", description: language === 'es' ? "Tendencias & UX" : "Trends & UX", locked: false },
        { id: 'compare-ai', label: "Compare AI", description: language === 'es' ? "Creative Benchmark" : "Creative Benchmark", locked: false },
      ]
    }
  ];

  const getHref = (id: string): string => {
    if (id === 'analyzer') return '/';
    return `/${id}`;
  };

  const handleTabClick = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    // Map creative feature IDs to creative-lab with specific featureTab
    if (creativeFeatureMap[id]) {
      onTabChange('creative-lab');
      if (onFeatureTabChange) {
        onFeatureTabChange(creativeFeatureMap[id]);
      }
    } else {
      // Direct tab navigation for non-creative items
      onTabChange(id);
    }

    setIsMenuOpen(false);
    setIsGoogleAdsOpen(false);
    setIsCreativeOpen(false);
  };

  const isGoogleAdsActive = googleAdsItems.some(
    (item) => item.id === activeTab,
  );
  
  const isCreativeLabActive = activeTab === 'creative-lab';

  // Toggle handlers with mutual exclusion
  const toggleGoogleAds = () => {
    setIsGoogleAdsOpen((prev) => !prev);
    setIsCreativeOpen(false);
  };
  const toggleCreative = () => {
    setIsCreativeOpen((prev) => !prev);
    setIsGoogleAdsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsGoogleAdsOpen(false);
      }
      if (
        creativeMenuRef.current &&
        !creativeMenuRef.current.contains(event.target as Node)
      ) {
        setIsCreativeOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeProfile = userService.getCurrentProfile();
  // FORCE OVERRIDE: Align with Google Console naming
  const brandName = "insitu.company";
  const brandIsotype = activeProfile?.isotypeUrl;
  const brandIsotypeVisibility = activeProfile?.isotypeVisibility || "none";

  return (
    <>
    <header className={`${theme === "dark" ? "bg-[#020617]/85 backdrop-blur-3xl border-b border-white/[0.06]" : "bg-white/85 backdrop-blur-2xl border-b border-slate-200 shadow-sm"} sticky top-0 z-[60] no-print transition-all duration-500`} style={theme === 'dark' ? { boxShadow: '0 1px 0 rgba(255,71,123,0.08), 0 4px 24px rgba(0,0,0,0.3)' } : {}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-center h-[72px]">
          <a
            href="/"
            className="flex items-center space-x-4 cursor-pointer shrink-0 group"
            onClick={(e) => handleTabClick("analyzer", e)}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-magenta/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {brandIsotype &&
              (brandIsotypeVisibility === "header" ||
                brandIsotypeVisibility === "both") ? (
                <img
                  src={brandIsotype}
                  alt="Isotype"
                  className="w-12 h-12 object-contain relative z-10"
                />
              ) : (
                <LogoIsotype className="w-12 h-12 text-[#ff477b] relative z-10" />
              )}
            </div>
            <div className="flex flex-col">
              <span className={`${theme === "dark" ? "text-white" : "text-slate-950"} font-black text-xl tracking-tighter leading-none uppercase`}>
                insitu.company
              </span>
              <span className="text-[11px] font-black text-white/20 uppercase tracking-[0.4em] mt-1 group-hover:text-magenta transition-colors">Intelligence Platform</span>
            </div>
          </a>

          <div className="flex lg:hidden items-center gap-4">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${theme === "dark" ? "bg-white/5 text-white/70 hover:text-white" : "bg-slate-100 text-slate-500 hover:text-slate-900"} transition-all active:scale-95`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          <nav className="hidden lg:flex items-center space-x-10">
            {/* Google SEM / SEO Dropdown */}
            <div className="relative group/google h-full flex items-center" ref={dropdownRef}
              onMouseEnter={() => setIsGoogleAdsOpen(true)}
              onMouseLeave={() => setIsGoogleAdsOpen(false)}
            >
              <button
                onClick={toggleGoogleAds}
                className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all py-2 flex items-center gap-2 ${isGoogleAdsActive ? "text-magenta" : "text-white/40 hover:text-white"}`}
              >
                <span>Google Intelligence</span>
                <svg className={`w-3 h-3 transition-transform duration-500 ${isGoogleAdsOpen ? 'rotate-180' : ''} ${isGoogleAdsActive ? 'text-magenta' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
                {isGoogleAdsActive && <div className="absolute -bottom-1 left-0 right-4 h-0.5 bg-magenta rounded-full shadow-[0_0_10px_rgba(255,71,123,0.8)]" />}
              </button>

              <div className={`absolute top-[calc(100%-1.5rem)] left-1/2 -translate-x-1/2 w-72 transition-all duration-500 transform z-50 ${isGoogleAdsOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-4'}`}>
                <div className="bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)] p-3 overflow-hidden mt-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-magenta/5 via-transparent to-cyan/5 pointer-events-none" />
                  {googleAdsItems.map((item) => (
                    <a 
                      key={item.id} 
                      href={getHref(item.id)} 
                      onClick={(e) => handleTabClick(item.id, e)}
                      className={`relative block w-full text-left p-5 rounded-2xl transition-all group/item mb-1 last:mb-0 hover:bg-primary hover:border-primary hover:translate-x-1 ${item.locked ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className="flex items-start gap-4 relative z-10">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${activeTab === item.id ? 'bg-magenta/10 border-magenta/20' : 'bg-white/5 border-white/5 group-hover/item:border-white/20'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${activeTab === item.id ? 'bg-magenta shadow-[0_0_8px_rgba(255,71,123,1)] group-hover/item:bg-white group-hover/item:shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/10 group-hover/item:bg-white'}`} />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${activeTab === item.id ? "text-magenta group-hover/item:text-white" : "text-white group-hover/item:text-white"}`}>
                            {item.label}
                          </span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider mt-1 transition-colors ${activeTab === item.id ? "text-white/30 group-hover/item:text-white/80" : "text-white/30 group-hover/item:text-white/80"}`}>
                            {item.description}
                          </span>
                        </div>
                      </div>
                      {item.locked && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Creative Lab Dropdown */}
            <div className="relative group/creative h-full flex items-center" ref={creativeMenuRef}
              onMouseEnter={() => setIsCreativeOpen(true)}
              onMouseLeave={() => setIsCreativeOpen(false)}
            >
              <button
                onClick={toggleCreative}
                className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all py-2 flex items-center gap-2 ${isCreativeLabActive ? "text-magenta" : "text-white/40 hover:text-white"}`}
              >
                <span>Creative Lab</span>
                <svg className={`w-3 h-3 transition-transform duration-500 ${isCreativeOpen ? 'rotate-180' : ''} ${isCreativeLabActive ? 'text-magenta' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
                 {isCreativeLabActive && <div className="absolute -bottom-1 left-0 right-4 h-0.5 bg-magenta rounded-full shadow-[0_0_10px_rgba(255,71,123,0.8)]" />}
              </button>

              <div className={`absolute top-[calc(100%-1.5rem)] left-1/2 -translate-x-1/2 w-72 transition-all duration-500 transform z-50 ${isCreativeOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-4'}`}>
                <div className="bg-slate-950/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)] p-3 overflow-hidden mt-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-magenta/5 via-transparent to-cyan/5 pointer-events-none" />

                  {creativeLabGroups.map((group) => (
                    <div key={group.label} className="mb-4 last:mb-0">
                      <div className="px-5 mb-2 flex items-center gap-3">
                        <span className="text-[11px] font-black uppercase text-white/20 tracking-[0.3em]">{group.label}</span>
                        <div className="h-px flex-1 bg-white/5" />
                      </div>
                      {group.items.filter(item => {
                        // Creative Hub y labs de generación: solo Super Admin
                        if (['creative-lab', 'animate', 'audio', 'retail', 'master', 'portavoz-ia'].includes(item.id)) return isSuperAdmin;
                        return true;
                      }).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleTabClick(item.id)}
                          className={`relative w-full text-left p-4 rounded-2xl transition-all group/item mb-1 last:mb-0 hover:bg-primary/10 hover:translate-x-1 ${item.locked ? "opacity-50 grayscale" : ""}`}
                        >
                          <div className="flex items-start gap-4 relative z-10">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${isCreativeItemActive(item.id) ? 'bg-magenta/10 border-magenta/20' : 'bg-white/5 border-white/5 group-hover/item:border-white/20'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${isCreativeItemActive(item.id) ? 'bg-magenta shadow-[0_0_8px_rgba(255,71,123,1)]' : 'bg-white/10 group-hover/item:bg-white'}`} />
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${isCreativeItemActive(item.id) ? "text-magenta" : "text-white group-hover/item:text-white"}`}>
                                {item.label}
                              </span>
                              <span className="text-[11px] font-bold uppercase tracking-wider mt-1 text-white/30 group-hover/item:text-white/80 transition-colors">
                                {item.description}
                              </span>
                            </div>
                          </div>
                          {item.locked && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {(authService.getSettings().features?.brandIdentity ?? true) && (
              <button
                onClick={() => handleTabClick("brand-identity")}
                className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all relative py-2 ${activeTab === "brand-identity" ? "text-magenta" : "text-white/40 hover:text-white"} ${(!currentUser || (currentUser.subscription?.plan !== "Agency" && !isAdmin)) ? "opacity-30 grayscale" : ""}`}
              >
                {language === 'es' ? 'Brand Identity' : 'Brand Identity'}
                {activeTab === "brand-identity" && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-magenta rounded-full shadow-[0_0_10px_rgba(255,71,123,0.8)]" />}
                {(!currentUser || (currentUser.subscription?.plan !== "Agency" && !isAdmin)) && (
                   <div className="absolute -top-1 -right-3 text-white/40 scale-75">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                )}
              </button>
            )}



            <button
              onClick={() => handleTabClick("blog")}
              className={`text-[11px] font-black uppercase tracking-[0.2em] transition-all relative py-2 ${activeTab === "blog" ? "text-magenta" : "text-white/40 hover:text-white"}`}
            >
              {language === 'es' ? 'Recursos' : 'Resources'}
              {activeTab === "blog" && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-magenta rounded-full shadow-[0_0_10px_rgba(255,71,123,0.8)]" />}
            </button>
          </nav>

          <div className="flex items-center space-x-6">
            <AIContextBadge />
            <ProfileSelector currentUser={currentUser} theme={theme} language={language} />
            <div className={`hidden sm:flex items-center bg-white/5 border border-white/10 rounded-2xl p-1`}>
              <button
                onClick={() => onLanguageChange("es")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${language === "es" ? "bg-magenta text-white shadow-lg shadow-magenta/20" : "text-white/20 hover:text-white"}`}
              >
                ES
              </button>
              <button
                onClick={() => onLanguageChange("en")}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${language === "en" ? "bg-magenta text-white shadow-lg shadow-magenta/20" : "text-white/20 hover:text-white"}`}
              >
                EN
              </button>
            </div>

            <button
              onClick={onToggleHistory}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-magenta hover:border-magenta/30 hover:bg-magenta/5 transition-all relative group"
            >
              <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {historyCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-magenta text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-[#020617] shadow-lg animate-pulse">
                  {historyCount}
                </span>
              )}
            </button>

            <div className="relative">
              <button
                onClick={onToggleUpdates}
                className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-cyan hover:border-cyan/30 hover:bg-cyan/5 transition-all relative group"
                title="What's New"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center border-2 border-[#020617] shadow-lg animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-4 bg-white/5 hover:bg-primary hover:text-white hover:border-primary p-1.5 pr-5 rounded-[1.5rem] border border-white/10 transition-all group"
                >
                  <div className="relative">
                    <img src={currentUser.picture} alt="" className="w-10 h-10 rounded-2xl shadow-xl border border-white/10 group-hover:border-magenta/50 transition-colors" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan border-2 border-[#020617] shadow-lg" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-[11px] font-black text-white uppercase leading-none tracking-widest">
                      {currentUser.username}
                    </p>
                    <p className="text-[11px] font-black text-magenta uppercase mt-1 tracking-widest">{currentUser.subscription?.plan || 'Free'}</p>
                  </div>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute top-[calc(100%+1rem)] right-0 w-64 bg-slate-950/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)] p-3 z-[100]">
                    <div className="p-4 border-b border-white/5 mb-2">
                       <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Account Control</p>
                       <p className="text-xs font-black text-white uppercase truncate">{currentUser.email}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => { onOpenAdmin(); setIsUserMenuOpen(false); }}
                        className="w-full text-left p-4 hover:bg-indigo-500/10 rounded-2xl transition-all group/item mb-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest group-hover/item:text-indigo-300">Control Panel</span>
                          <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-lg text-[11px] font-black tracking-widest">MASTER</span>
                        </div>
                      </button>
                    )}
                    <button
                      onClick={() => { onOpenProfile(); setIsUserMenuOpen(false); }}
                      className="w-full text-left p-4 hover:bg-primary hover:text-white hover:border-primary rounded-2xl transition-all text-[11px] font-black text-white/50 hover:text-white uppercase tracking-widest mb-1"
                    >
                      My Profile Settings
                    </button>
                    {isAuthorizedForDesktop && !isDesktop && (
                      <a
                        href={isMac ? 'https://insitu.company/download/mac' : 'https://insitu.company/download/windows'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full text-left p-4 hover:bg-cyan/10 rounded-2xl transition-all group/item mb-1 flex items-center justify-between"
                      >
                        <span className="text-[11px] font-black text-cyan uppercase tracking-widest group-hover/item:text-cyan-300">
                          {isMac ? 'Descargar App (Mac)' : 'Descargar App (PC)'}
                        </span>
                        <Download className="w-4 h-4 text-cyan opacity-50 group-hover/item:opacity-100" />
                      </a>
                    )}
                    <button
                      onClick={onLogout}
                      className="w-full text-left p-4 hover:bg-rose-500/10 rounded-2xl transition-all text-[11px] font-black text-rose-500 uppercase tracking-widest"
                    >
                      Terminar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="bg-magenta hover:bg-magenta/90 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_10px_40px_-5px_rgba(255,71,123,0.4)] transition-all active:scale-95 whitespace-nowrap"
              >
                {language === "es" ? "Acceder" : "Login"}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>

      {/* Mobile Menu - Re-engineered for Stitch Premium Aesthetic */}
      <div 
        className={`lg:hidden fixed inset-0 z-[100] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMenuOpen ? "visible" : "invisible"}`}
      >
        {/* Backdrop overlay with blur */}
        <div 
          className={`absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-700 ${isMenuOpen ? "opacity-100" : "opacity-0"}`} 
          onClick={() => setIsMenuOpen(false)}
        />
        
        {/* Slide-out panel */}
        <div className={`absolute top-0 right-0 bottom-0 w-full sm:w-[440px] bg-[#020617]/90 backdrop-blur-3xl flex flex-col shadow-2xl border-l border-white/5 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMenuOpen ? "translate-x-0" : "translate-x-full"} overflow-hidden`}>
          
          {/* Subtle background glow */}
          <div className="absolute top-0 left-0 w-full h-64 bg-magenta/5 blur-[120px] pointer-events-none" />
          
          {/* Header section */}
          <div className="flex-shrink-0 flex items-center justify-between p-8 border-b border-white/5 relative bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-magenta/10 flex items-center justify-center border border-magenta/20">
                <LogoIsotype className="w-4 h-4 text-magenta" />
              </div>
              <span className="text-white font-black uppercase tracking-[0.3em] text-[11px]">Portal de Inteligencia</span>
            </div>
            <button 
                onClick={() => setIsMenuOpen(false)}
                className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-primary hover:text-white hover:border-primary transition-all border border-white/10"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
          </div>

          {/* Navigation content */}
          <div className="flex-1 overflow-y-auto px-6 py-10 space-y-12 custom-scrollbar relative">
            
            {/* Nav Group: Intelligence Core */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-[11px] font-black uppercase text-magenta tracking-[0.4em] opacity-40">Intelligence Core</h3>
                <div className="h-px flex-1 bg-magenta/10" />
              </div>
              <div className="grid gap-4">
                {googleAdsItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`group w-full text-left p-6 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden ${
                      activeTab === item.id 
                        ? "bg-magenta/5 border-magenta/30 shadow-[0_20px_40px_-15px_rgba(255,71,123,0.15)] scale-[1.02]" 
                        : "bg-white/[0.03] border-white/5 hover:border-white/20 active:scale-95"
                    } ${item.locked ? "opacity-50 grayscale" : ""}`}
                  >
                    {/* Active glow effect */}
                    {activeTab === item.id && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-magenta/10 blur-3xl -translate-y-12 translate-x-12" />
                    )}
                    
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex flex-col">
                        <span className={`text-2xl font-black tracking-tighter uppercase leading-none ${activeTab === item.id ? "text-magenta" : "text-white group-hover:text-magenta transition-colors"}`}>
                          {item.label}
                        </span>
                        <span className="text-[11px] text-white/30 font-bold uppercase tracking-widest mt-2">{item.description}</span>
                      </div>
                      <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all duration-500 ${
                        activeTab === item.id 
                          ? "bg-magenta text-white shadow-[0_0_20px_rgba(255,71,123,0.4)]" 
                          : "bg-white/5 text-white/20 group-hover:text-magenta/50"
                      }`}>
                        {item.locked ? (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        ) : (
                           <svg className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Nav Group: Creative AI Lab */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <h3 className="text-[11px] font-black uppercase text-cyan tracking-[0.4em] opacity-40">Creative AI Lab</h3>
                <div className="h-px flex-1 bg-cyan/10" />
              </div>
              <div className="grid gap-4">
                {creativeLabGroups.map((group) => (
                  <div key={group.label} className="space-y-3">
                    <div className="flex items-center gap-4 px-4 py-2 mt-4 first:mt-0">
                      <span className="text-[11px] font-black uppercase text-white/20 tracking-[0.3em] font-mono">{group.label}</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="grid gap-3">
                      {group.items.filter(item => {
                        // Creative Hub y labs de generación: solo Super Admin en móvil
                        if (['creative-lab', 'animate', 'audio', 'retail', 'master', 'portavoz-ia'].includes(item.id)) return isSuperAdmin;
                        return true;
                      }).map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleTabClick(item.id)}
                          className={`group w-full text-left p-6 rounded-[2.5rem] border transition-all duration-500 flex items-center justify-between ${
                            isCreativeItemActive(item.id)
                              ? "bg-cyan/5 border-cyan/30 shadow-[0_20px_40px_-15px_rgba(0,242,254,0.15)]"
                              : "bg-white/[0.03] border-white/5 hover:border-white/20 active:scale-95"
                          } ${item.locked ? "opacity-50 grayscale" : ""}`}
                        >
                          <div className="flex items-center gap-5">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-[11px] tracking-widest transition-all ${
                              isCreativeItemActive(item.id) ? "bg-cyan text-[#020617]" : "bg-white/5 text-white/20 group-hover:text-cyan/50"
                            }`}>
                              {item.locked ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              ) : (
                                item.id === 'creative-lab' ? "HUB" : item.id.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <span className={`text-xl font-black tracking-tighter uppercase ${isCreativeItemActive(item.id) ? "text-cyan" : "text-white group-hover:text-cyan transition-colors"}`}>
                              {item.label}
                            </span>
                          </div>
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                            isCreativeItemActive(item.id) ? "bg-cyan/20 text-cyan" : "bg-white/5 text-white/20"
                          }`}>
                            <svg className="w-5 h-5 transition-transform duration-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                
                {(authService.getSettings().features?.brandIdentity ?? true) && (
                  <button
                    onClick={() => handleTabClick("brand-identity")}
                    className={`group w-full text-left p-6 rounded-[2.5rem] border transition-all duration-500 flex items-center justify-between ${
                      activeTab === "brand-identity" 
                        ? "bg-cyan/5 border-cyan/30 shadow-[0_20px_40px_-15px_rgba(0,242,254,0.15)]" 
                        : "bg-white/[0.03] border-white/5 hover:border-white/20 active:scale-95"
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-[11px] tracking-widest transition-all ${
                        activeTab === "brand-identity" ? "bg-cyan text-[#020617]" : "bg-white/5 text-white/20 group-hover:text-cyan/50"
                      }`}>
                        ID
                      </div>
                      <span className={`text-xl font-black tracking-tighter uppercase ${activeTab === "brand-identity" ? "text-cyan" : "text-white group-hover:text-cyan transition-colors"}`}>
                        ADN de Marca
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </section>

            {/* Resources Banner */}
            <button
              onClick={() => handleTabClick("blog")}
              className="w-full relative group overflow-hidden p-8 rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent transition-all hover:border-magenta/30"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-magenta/20 blur-[60px] translate-x-10 -translate-y-10 group-hover:bg-magenta/30 transition-all duration-700" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex flex-col">
                  <span className="text-2xl font-black uppercase tracking-tighter text-white group-hover:text-magenta transition-colors">{language === 'es' ? 'Recursos' : 'Resources'}</span>
                  <span className="text-[11px] font-bold text-white/30 uppercase tracking-widest mt-1">Estrategias & Guías</span>
                </div>
                <div className="w-12 h-12 rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/50 group-hover:text-magenta group-hover:border-magenta/20 transition-all">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* Footer section (Sticky at bottom) */}
          <div className="flex-shrink-0 p-8 border-t border-white/5 bg-[#020617]/50 backdrop-blur-3xl relative z-20">
            {currentUser ? (
              <div className="space-y-6">
                <div className="flex items-center gap-5 p-5 rounded-[2rem] bg-white/[0.03] border border-white/10 hover:border-magenta/20 transition-all group/profile">
                  <div className="relative">
                    <img 
                      src={currentUser.picture} 
                      className="w-14 h-14 rounded-2xl shadow-2xl border-2 border-magenta/20 group-hover:border-magenta/50 transition-all duration-500" 
                      alt={currentUser.username}
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-[#020617] rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black uppercase text-base text-white truncate tracking-tight">{currentUser.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-magenta/10 text-magenta text-[11px] font-black tracking-widest rounded-full border border-magenta/20">
                        {currentUser.subscription?.plan?.toUpperCase() || 'FREE'}
                      </span>
                      {isAdmin && (
                         <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[11px] font-black tracking-widest rounded-full border border-blue-500/20">
                          ADM
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => { onOpenProfile(); setIsMenuOpen(false); }}
                    className="group relative h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center transition-all hover:bg-primary hover:text-white hover:border-primary hover:border-white/20 active:scale-95 overflow-hidden"
                  >
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white relative z-10 transition-colors group-hover:text-white">Profile</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="group relative h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center transition-all hover:bg-rose-500/20 active:scale-95 overflow-hidden"
                  >
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500 relative z-10">Logout</span>
                  </button>
                </div>

                {isAuthorizedForDesktop && !isDesktop && (
                  <a
                    href={isMac ? 'https://insitu.company/download/mac' : 'https://insitu.company/download/windows'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full h-14 mt-4 rounded-2xl bg-cyan/10 border border-cyan/20 text-cyan text-[11px] font-black uppercase tracking-[0.3em] transition-all hover:bg-cyan/20 shadow-lg shadow-cyan/5 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <span>{isMac ? 'Descargar App (Mac)' : 'Descargar App (PC)'}</span>
                    <Download className="w-4 h-4 opacity-50" />
                  </a>
                )}

                {isAdmin && (
                  <button
                    onClick={() => { onOpenAdmin(); setIsMenuOpen(false); }}
                    className="w-full h-14 mt-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-black uppercase tracking-[0.3em] transition-all hover:bg-indigo-500/20 shadow-lg shadow-indigo-500/5 active:scale-95"
                  >
                    Control Panel Master
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={onLogin}
                  className="w-full bg-magenta p-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-white shadow-[0_20px_40px_-10px_rgba(255,71,123,0.4)] text-[11px] transition-all active:scale-95 active:shadow-inner"
                >
                  Access Platform
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-8 px-2">
               <div className="flex gap-4">
                 <button 
                  onClick={() => onLanguageChange("es")} 
                  className={`text-[11px] font-black uppercase tracking-widest transition-all ${language === 'es' ? 'text-magenta' : 'text-white/20 hover:text-white/40'}`}
                >
                  ES
                </button>
                 <div className="w-px h-2 bg-white/10 mt-1" />
                 <button 
                  onClick={() => onLanguageChange("en")} 
                  className={`text-[11px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'text-magenta' : 'text-white/20 hover:text-white/40'}`}
                >
                  EN
                </button>
               </div>
               <span className="text-[11px] font-bold text-white/10 uppercase tracking-[0.4em]">v{__APP_VERSION__}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
