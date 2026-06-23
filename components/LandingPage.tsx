import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { blogService } from "../services/blogService";
import { Language } from "../types";
import CheckoutFlow from "./CheckoutFlow";
import { authService } from "../services/authService";
import LeadMagnetWizard from "./LeadMagnetWizard";
import ConsultingModal from "./ConsultingModal";
import LogoIsotype from "./LogoIsotype";
import { useMouseParallax } from "../hooks/useMouseParallax";
import { Rocket, TrendingUp, ShieldCheck, Zap, ChevronRight, Check, CheckCircle2, Sparkles, Monitor, BarChart3, Share2, Globe, Users, Award, Clock } from "lucide-react";

// Lazy-loaded Landing Sections for performance (Code Splitting)
const StatsSection = lazy(() => import("./Landing/StatsSection"));
const TrustBar = lazy(() => import("./Landing/TrustBar"));
const LiveCounter = lazy(() => import("./Landing/LiveCounter"));
const FeaturesSection = lazy(() => import("./Landing/FeaturesSection"));
const CapabilitiesMatrix = lazy(() => import("./Landing/CapabilitiesMatrix"));
const PricingSection = lazy(() => import("./Landing/PricingSection"));
const BlogPreview = lazy(() => import("./Landing/BlogPreview"));
const HowItWorks = lazy(() => import("./Landing/HowItWorks"));
const UseCases = lazy(() => import("./Landing/UseCases"));
const Testimonials = lazy(() => import("./Landing/Testimonials"));
const FAQSection = lazy(() => import("./Landing/FAQSection"));
const FinalCTASection = lazy(() => import("./Landing/FinalCTASection"));

// Loading fallback component
const SectionLoader = () => <div className="h-40 flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#ff477b]/20 border-t-[#ff477b] rounded-full animate-spin" /></div>;

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onOpenTech: () => void;
  onOpenPricing: () => void;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogin,
  onOpenTech,
  onOpenPricing,
  language = "es",
  onLanguageChange,
}) => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showLeadMagnet, setShowLeadMagnet] = useState(false);
  const [showConsulting, setShowConsulting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"Starter" | "Growth" | "Agency">("Starter");
  const [latestPosts, setLatestPosts] = useState<any[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const [cursorGlow, setCursorGlow] = useState({ x: 0, y: 0, visible: false });

  useEffect(() => {
    blogService.getAllPosts().then((posts) => {
      setLatestPosts(posts.filter((p) => p.status === "published").slice(0, 3));
    });
  }, []);

  // 3D Parallax mouse tracking via custom hook (updates CSS variables globally)
  useMouseParallax(10);



  // Scroll handler for header
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll reveal — robust IntersectionObserver + fallback
  useEffect(() => {
    const revealAll = () => {
      document.querySelectorAll('.reveal-on-scroll:not(.active)').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 80) el.classList.add('active');
      });
    };
    window.addEventListener('scroll', revealAll);
    revealAll();
    // Re-check periodically for dynamically rendered sections
    const interval = setInterval(revealAll, 500);
    // MutationObserver to catch new section insertions
    const observer = new MutationObserver(revealAll);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener('scroll', revealAll);
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  const pricing = authService.getPricing();
  const settings = authService.getSettings();
  const comingSoon = settings.comingSoon;

  const plans = [
    {
      name: "ON-SITE",
      tier: "Starter" as const,
      price: billingCycle === "monthly" ? (pricing?.Starter?.monthly ?? 29) : (pricing?.Starter?.yearly ?? 290),
      target: language === "es" ? "Freelancers y Solopreneurs" : "Freelancers and Solopreneurs",
      argument: language === "es" ? "Auditoría básica y prevención de suspensiones." : "Basic audit and suspension prevention.",
      features: [
        { label: language === "es" ? "Auditoría de 1 Cuenta (Google Ads)" : "Audit 1 Account (Google Ads)", included: true },
        { label: language === "es" ? "Escaneo de Ad Copy (Políticas)" : "Ad Copy Scan (Policies)", included: true },
        { label: language === "es" ? "Escáner de Landing Pages" : "Landing Page Scanner", included: true },
        { label: language === "es" ? "Detección de Malware Básica" : "Basic Malware Detection", included: true },
        { label: language === "es" ? "Reportes PDF" : "PDF Reports", included: true },
      ],
      recommended: false,
    },
    {
      name: "DEEP SCAN",
      tier: "Growth" as const,
      price: billingCycle === "monthly" ? (pricing?.Growth?.monthly ?? 79) : (pricing?.Growth?.yearly ?? 790),
      target: language === "es" ? "Agencias y E-commerce" : "Agencies and E-commerce",
      argument: language === "es" ? "Monitoreo profundo de múltiples cuentas." : "Deep monitoring of multiple accounts.",
      features: [
        { label: language === "es" ? "Auditoría hasta 5 Cuentas" : "Audit up to 5 Accounts", included: true },
        { label: language === "es" ? "Todo lo de Starter" : "Everything in Starter", included: true },
        { label: language === "es" ? "Alertas de Suspensión Temprana" : "Early Suspension Alerts", included: true },
        { label: language === "es" ? "Análisis de Prácticas Inaceptables" : "Unacceptable Practices Analysis", included: true },
        { label: language === "es" ? "Soporte Prioritario" : "Priority Support", included: true },
      ],
      recommended: true,
    },
    {
      name: "OMNI-CHANNEL",
      tier: "Agency" as const,
      price: 0,
      target: language === "es" ? "Grandes Agencias" : "Large Agencies",
      argument: language === "es" ? "Protección total para todo tu MCC." : "Total protection for your entire MCC.",
      features: [
        { label: language === "es" ? "Monitoreo MCC Completo" : "Full MCC Monitoring", included: true },
        { label: language === "es" ? "BRAND GUARDIAN 🛡️" : "BRAND GUARDIAN 🛡️", included: true, special: true },
        { label: language === "es" ? "API de Integración" : "Integration API", included: true, special: true },
        { label: language === "es" ? "Reportes Marca Blanca" : "White Label Reports", included: true },
        { label: language === "es" ? "Ejecutivo de Cuenta Dedicado" : "Dedicated Account Executive", included: true },
      ],
      recommended: false,
    },
  ];

  return (
    <div className="relative min-h-screen bg-[#0a0507] text-white selection:bg-[#ff477b]/30 overflow-x-hidden" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-[600px] h-[600px] glow-indigo-landing rounded-full" style={{ animation: 'blob-pulse-landing 10s ease-in-out infinite alternate' }} />
        <div className="absolute top-1/2 -right-24 w-[700px] h-[700px] glow-emerald-landing rounded-full" style={{ animation: 'blob-pulse-landing 10s ease-in-out infinite alternate', animationDelay: '-2s' }} />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 glow-indigo-landing rounded-full opacity-50" style={{ animation: 'blob-pulse-landing 10s ease-in-out infinite alternate', animationDelay: '-4s' }} />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* GEO Optimization: Executive Summary for AI Crawlers (SearchGPT, Perplexity, etc.) */}
        <section className="sr-only" aria-hidden="true">
          <h1>INsitu Police Ads — Auditoría de Políticas y Prevención de Suspensiones en Google Ads</h1>
          <p>
            INsitu Police Ads es la herramienta definitiva para agencias y anunciantes que necesitan proteger sus cuentas
            de Google Ads contra suspensiones inesperadas. Auditamos automáticamente anuncios (Ad Copy), extensiones 
            y Landing Pages en busca de violaciones a las políticas de Google.
          </p>
          <p>
            Especializados en la detección temprana de Prácticas Inaceptables, Sistemas de Elusión (Circumventing Systems), 
            Software Malicioso (Malware) y restricciones en nichos sensibles como Salud (Healthcare) y Servicios Financieros.
          </p>
          <ul>
            <li>Auditoría de políticas de Google Ads con IA.</li>
            <li>Detección de malware en Landing Pages.</li>
            <li>Prevención de suspensiones de cuentas.</li>
            <li>Análisis de Ad Copy para nichos sensibles (salud, finanzas, legal).</li>
            <li>Alertas tempranas para agencias (MCC monitoring).</li>
          </ul>
        </section>

        {/* ─── NAVIGATION ─── */}
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`sticky top-0 z-50 px-4 md:px-6 py-4 transition-all duration-300 ${scrolled ? 'py-2' : ''}`}
        >
          <nav className={`max-w-7xl mx-auto glass-landing rounded-full px-6 md:px-8 py-3 flex items-center justify-between border border-white/5 transition-all duration-300 ${scrolled ? 'bg-[#0a0507]/95 backdrop-blur-[24px] border-[#ff477b]/30' : ''}`}>
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => window.location.reload()}>
              <LogoIsotype className="w-8 h-8 text-[#ff477b] group-hover:rotate-12 transition-transform" />
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-slate-100 leading-tight">insitu.company</span>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8 lg:gap-10">
              <a onClick={(e) => { e.preventDefault(); onOpenPricing(); }} href="#pricing" className="text-sm font-medium text-slate-300 hover:text-[#ff477b] transition-colors cursor-pointer">
                {language === "es" ? "Planes" : "Plans"}
              </a>
              <button onClick={() => setShowConsulting(true)} className="text-sm font-medium text-slate-300 hover:text-[#ff477b] transition-colors">
                {language === "es" ? "Servicios Agencia" : "Agency Services"}
              </button>
              <a href="/blog" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("nav-to-blog")); }} className="text-sm font-medium text-slate-300 hover:text-[#ff477b] transition-colors">
                {language === "es" ? "Recursos" : "Resources"}
              </a>
              <a href="/privacy" className="text-sm font-medium text-[#ff477b] hover:text-white transition-colors cursor-pointer border-b border-[#ff477b]/50 pb-0.5" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/privacy'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
                {language === "es" ? "Privacidad" : "Privacy"}
              </a>
              <button onClick={() => setShowLeadMagnet(true)} className="text-sm font-medium text-slate-300 hover:text-[#ff477b] transition-colors">
                {language === "es" ? "Auditoría GRATIS" : "FREE Audit"}
              </button>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1">
                <button
                  onClick={() => onLanguageChange?.("es")}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${language === "es" ? "bg-[#ff477b] text-white shadow-lg shadow-[#ff477b]/20" : "text-slate-300 hover:text-white"}`}
                >
                  ES
                </button>
                <button
                  onClick={() => onLanguageChange?.("en")}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${language === "en" ? "bg-[#ff477b] text-white shadow-lg shadow-[#ff477b]/20" : "text-slate-300 hover:text-white"}`}
                >
                  EN
                </button>
              </div>

              {/* Login Button */}
              <button onClick={onLogin} className="bg-[#ff477b] hover:bg-[#ff477b]/90 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-[#ff477b]/20 hover:shadow-[#ff477b]/40">
                LOGIN
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden flex flex-col items-center justify-center w-10 h-10 space-y-1.5 group ml-3">
              <motion.span animate={mobileMenuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }} className="w-6 h-0.5 bg-white group-hover:bg-[#ff477b] transition-colors" />
              <motion.span animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }} className="w-6 h-0.5 bg-white group-hover:bg-[#ff477b] transition-colors" />
              <motion.span animate={mobileMenuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }} className="w-6 h-0.5 bg-white group-hover:bg-[#ff477b] transition-colors" />
            </button>
          </nav>

          {/* Mobile Menu - Re-engineered for insitu.company Premium Aesthetic */}
          <div
            className={`lg:hidden fixed inset-0 z-[100] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${mobileMenuOpen ? "visible" : "invisible"}`}
          >
            {/* Backdrop overlay with blur */}
            <div
              className={`absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-opacity duration-700 ${mobileMenuOpen ? "opacity-100" : "opacity-0"}`}
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Slide-out panel */}
            <div className={`absolute top-0 right-0 bottom-0 w-full sm:w-[440px] bg-[#0a0507]/95 backdrop-blur-3xl flex flex-col shadow-2xl border-l border-white/5 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"} overflow-hidden`}>

              {/* Subtle background glow */}
              <div className="absolute top-0 left-0 w-full h-64 bg-[#ff477b]/5 blur-[120px] pointer-events-none" />

              {/* Header section */}
              <div className="flex-shrink-0 flex items-center justify-between p-8 border-b border-white/5 relative bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <LogoIsotype className="w-8 h-8 text-[#ff477b]" />
                  <div className="flex flex-col">
                    <span className="text-lg font-bold tracking-tight text-white leading-tight">insitu.company</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-primary hover:text-white hover:border-primary transition-all border border-white/10"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Navigation content */}
              <div className="flex-1 overflow-y-auto px-6 py-10 space-y-12 relative">

                {/* Nav Group: Platform Navigation */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-[11px] font-black uppercase text-[#ff477b] tracking-[0.4em] opacity-40">{language === "es" ? "Navegación" : "Navigation"}</h3>
                    <div className="h-px flex-1 bg-[#ff477b]/10" />
                  </div>
                  <div className="grid gap-3">
                    <button onClick={() => { onOpenPricing(); setMobileMenuOpen(false); }}
                      className="group w-full text-left p-6 rounded-[2.5rem] border border-white/5 bg-white/[0.03] hover:border-white/20 active:scale-95 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-black tracking-tighter uppercase text-white group-hover:text-[#ff477b] transition-colors">{language === "es" ? "Planes" : "Plans"}</span>
                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[#ff477b] transition-colors" />
                      </div>
                    </button>
                    <button onClick={() => { setShowConsulting(true); setMobileMenuOpen(false); }}
                      className="group w-full text-left p-6 rounded-[2.5rem] border border-white/5 bg-white/[0.03] hover:border-white/20 active:scale-95 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-black tracking-tighter uppercase text-white group-hover:text-[#ff477b] transition-colors">{language === "es" ? "Servicios Agencia" : "Agency Services"}</span>
                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[#ff477b] transition-colors" />
                      </div>
                    </button>
                    <button onClick={() => { window.dispatchEvent(new CustomEvent("nav-to-blog")); setMobileMenuOpen(false); }}
                      className="group w-full text-left p-6 rounded-[2.5rem] border border-white/5 bg-white/[0.03] hover:border-white/20 active:scale-95 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-black tracking-tighter uppercase text-white group-hover:text-[#ff477b] transition-colors">{language === "es" ? "Recursos" : "Resources"}</span>
                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-[#ff477b] transition-colors" />
                      </div>
                    </button>
                  </div>
                </section>

                {/* Login & Primary Action */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-[11px] font-black uppercase text-[#ff477b] tracking-[0.4em] opacity-40">{language === "es" ? "Acceso Directo" : "Direct Access"}</h3>
                    <div className="h-px flex-1 bg-[#ff477b]/10" />
                  </div>
                  <div className="space-y-4">
                    <button onClick={() => { onLogin(); setMobileMenuOpen(false); }}
                      className="w-full py-5 rounded-2xl border border-[#ff477b]/20 bg-[#ff477b]/5 text-white text-xs font-black uppercase tracking-widest hover:bg-[#ff477b]/10 transition-all">
                      {language === "es" ? "Acceder a la Plataforma" : "Access Platform"}
                    </button>
                    <button onClick={() => { setShowLeadMagnet(true); setMobileMenuOpen(false); }}
                      className="w-full py-6 rounded-2xl bg-[#ff477b] text-white text-sm font-black uppercase tracking-widest shadow-xl shadow-[#ff477b]/20 active:scale-95 transition-all">
                      {language === "es" ? "Comenzar Auditoría" : "Start Audit"}
                    </button>
                  </div>
                </section>
              </div>

              {/* Version indicator and Language Control */}
              <div className="p-8 pb-12 flex flex-col">
                <div className="flex items-center justify-between px-2">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => onLanguageChange?.("es")} 
                      className={`text-[11px] font-black uppercase tracking-widest transition-all ${language === 'es' ? 'text-[#ff477b]' : 'text-white/30 hover:text-white'}`}
                    >
                      ES
                    </button>
                    <div className="w-px h-2 bg-white/10 mt-1" />
                    <button 
                      onClick={() => onLanguageChange?.("en")} 
                      className={`text-[11px] font-black uppercase tracking-widest transition-all ${language === 'en' ? 'text-[#ff477b]' : 'text-white/30 hover:text-white'}`}
                    >
                      EN
                    </button>
                  </div>
                  <span className="text-[11px] font-bold text-white/10 uppercase tracking-[0.4em]">insitu.company v2.4</span>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="flex-grow">
          {/* ─── HERO SECTION with 3D Parallax ─── */}
          <section ref={heroRef} className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 text-center overflow-hidden" id="hero-container">
            {/* Cursor Glow — follows mouse via CSS variables */}
            <div
              className="cursor-glow hidden md:block"
            />

            {/* 3D Perspective Container */}
            <div className="hero-perspective relative">

              {/* Background Layer — sphere & orbs (deepest) */}
              <div
                className="absolute inset-0 pointer-events-none parallax-layer"
                style={{
                  transform: `translateZ(-100px) rotateX(calc(var(--rx) * 0.2)) rotateY(calc(var(--ry) * 0.2))`,
                }}
              >
                {/* Large Background Sphere */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#ff477b]/10 to-transparent blur-[80px] animate-pulse" />

                {/* Orbit large icon */}
                <div className="absolute top-1/4 left-10 opacity-40 hidden md:block" style={{ animation: 'orbit-landing 20s linear infinite' }}>
                  <Share2 className="w-[80px] h-[80px] md:w-[120px] md:h-[120px] text-[#ff477b]/40" style={{ filter: 'blur(1px)' }} />
                </div>
                {/* Float delayed icon */}
                <div className="absolute bottom-20 right-10 opacity-30 hidden md:block" style={{ animation: 'float-slow-landing 10s ease-in-out infinite 2s' }}>
                  <Globe className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] text-indigo-400/30" style={{ filter: 'blur(2px)' }} />
                </div>
              </div>

              {/* Mid Layer — Portrait & Orbs (central focus) */}
              <div
                className="absolute inset-0 pointer-events-none parallax-layer"
                style={{
                  transform: `translateZ(0px) rotateX(calc(var(--rx) * 0.5)) rotateY(calc(var(--ry) * 0.5))`,
                }}
              >


                {/* Google Ads orb */}
                <div className="absolute top-20 right-[15%] w-16 h-16 md:w-20 md:h-20 hologram-glass rounded-full flex items-center justify-center hidden md:flex" style={{ animation: 'float-slow-landing 8s ease-in-out infinite' }}>
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <div className="absolute inset-0 rounded-full border-2 border-[#ff477b]/40 animate-pulse" />
                </div>

                {/* Meta orb */}
                <div className="absolute bottom-1/4 left-[10%] w-14 h-14 md:w-16 md:h-16 hologram-glass rounded-full flex items-center justify-center hidden md:flex" style={{ animation: 'float-slow-landing 10s ease-in-out infinite 2s' }}>
                  <svg className="w-7 h-7 md:w-8 md:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400/40 animate-pulse" />
                </div>

                {/* Monitoring orb */}
                <div className="absolute top-1/2 left-[5%] w-10 h-10 md:w-12 md:h-12 hologram-glass rounded-full flex items-center justify-center hidden md:flex" style={{ animation: 'orbit-landing 15s linear infinite' }}>
                  <Monitor className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 animate-pulse" />
                </div>

                {/* TikTok-style orb */}
                <div className="absolute top-[10%] right-[30%] w-12 h-12 md:w-14 md:h-14 hologram-glass rounded-full flex items-center justify-center hidden md:flex" style={{ animation: 'float-slow-landing 8s ease-in-out infinite' }}>
                  <BarChart3 className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  <div className="absolute inset-0 rounded-full border-2 border-pink-400/40 animate-pulse" />
                </div>
              </div>

              {/* Front Layer — Floating Cards (most movement) */}
              <div
                className="absolute inset-0 pointer-events-none parallax-layer"
                style={{
                  transform: `translateZ(60px) rotateX(calc(var(--rx) * 1.2)) rotateY(calc(var(--ry) * 1.2))`,
                }}
              >

              </div>

              {/* Content Layer — text with subtle inverse movement */}
              <div
                className="relative parallax-layer z-10"
                style={{
                  transform: `rotateX(calc(var(--rx) * -0.1)) rotateY(calc(var(--ry) * -0.1))`,
                }}
              >
                {/* Badge */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ff477b]/10 border border-[#ff477b]/20 text-[#ff477b] text-xs font-bold uppercase tracking-widest mb-8 relative"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff477b] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff477b]" />
                  </span>
                  {language === "es" ? "Inteligencia Artificial Holográfica v2.4" : "Holographic AI Intelligence v2.4"}
                </motion.div>

                {/* Heading */}
                <motion.h1
                  initial={{ opacity: 0, y: 60 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
                  className="text-[2rem] sm:text-5xl md:text-7xl font-bold tracking-tighter text-slate-100 mb-8 max-w-4xl mx-auto leading-[1.1] relative"
                >
                  <span className="block text-magenta mb-2">insitu.company</span>
                  <span className="animated-gradient-text-landing text-transparent bg-gradient-to-r from-white via-[#ff8fb1] to-indigo-400">
                    {language === "es" ? "Protege tus Cuentas de Google Ads" : "Protect your Google Ads Accounts"}
                  </span>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[#ff477b]/10 blur-[100px] -z-10" style={{ animation: 'pulse-glow-landing 4s ease-in-out infinite' }} />
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 font-light"
                >
                  {language === "es"
                    ? "Auditoría automática de anuncios, landing pages y extensiones para asegurar el cumplimiento de políticas de Google y evitar suspensiones (Malware, Prácticas Inaceptables, Nichos Sensibles)."
                    : "Automatic audit of ads, landing pages, and extensions to ensure Google Ads policy compliance and prevent account suspensions (Malware, Unacceptable Business Practices, Sensitive Niches)."}
                </motion.p>
              </div>

              {/* Front Layer — CTA buttons (closest to viewer, most movement) */}
              <div
                className="relative parallax-layer z-20"
                style={{
                  transform: `translateZ(30px) rotateX(calc(var(--rx) * 0.8)) rotateY(calc(var(--ry) * 0.8))`,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="flex flex-wrap items-center justify-center gap-4 relative"
                >
                  <button
                    onClick={() => setShowLeadMagnet(true)}
                    className="bg-[#ff477b] hover:bg-[#ff477b]/90 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all flex items-center gap-2 relative overflow-hidden group"
                    style={{ animation: 'neon-pulse-landing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                  >
                    <span className="relative z-10">{language === "es" ? "Ejecutar Auditoría Gratis" : "Run Free Audit"}</span>
                    <Rocket className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-active:translate-y-0 transition-transform duration-100" />
                  </button>
                  <button
                    onClick={onOpenPricing}
                    className="bg-white/5 hover:bg-primary hover:text-white hover:border-primary text-white border border-white/10 px-8 py-4 rounded-xl text-lg font-bold transition-all backdrop-blur-sm"
                  >
                    {language === "es" ? "Explorar Ecosistema" : "Explore Ecosystem"}
                  </button>
                </motion.div>
              </div>

            </div>{/* end hero-perspective */}
          </section>



          {/* ─── APP PURPOSE (Required for Google Verification) ─── */}
          <section id="app-purpose" className="relative max-w-4xl mx-auto px-6 py-12 mb-20 glass-landing rounded-[3rem] border border-[#ff477b]/30 overflow-hidden bg-[#ff477b]/5 shadow-[0_0_50px_rgba(255,71,123,0.1)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ff477b] to-transparent opacity-50" />
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="w-16 h-16 rounded-2xl bg-[#ff477b]/20 flex items-center justify-center shrink-0 border border-[#ff477b]/40 shadow-lg shadow-[#ff477b]/20 mt-1">
                <ShieldCheck className="w-8 h-8 text-[#ff477b]" />
              </div>
              <div className="space-y-4 text-center md:text-left w-full">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                  {language === "es" ? "¿Cómo usa insitu.company tus datos de Google?" : "How insitu.company uses your Google data"}
                </h2>
                <div className="text-slate-200 text-sm leading-relaxed font-medium space-y-3">
                  <p>
                    {language === "es"
                      ? "INsitu Police Ads accede a tu cuenta de Google Ads exclusivamente en modo lectura (read-only) para auditar anuncios, palabras clave y extensiones en busca de posibles violaciones a las políticas. Nunca modificamos, creamos ni eliminamos campañas."
                      : "INsitu Police Ads accesses your Google Ads account in read-only mode to audit ads, keywords, and extensions for potential policy violations. We never modify, create or delete campaigns."}
                  </p>
                  <p>
                    {language === "es"
                      ? "Escaneamos tus datos localmente para ofrecerte un diagnóstico técnico de cumplimiento (Compliance). No almacenamos permanentemente tus credenciales ni compartimos tu información con terceros."
                      : "We scan your data locally to provide a technical compliance diagnosis. We do not permanently store your credentials or share your information with third parties."}
                  </p>
                </div>

                {/* Google API Scopes — explicit disclosure for verification */}
                <div className="mt-2 p-4 rounded-2xl bg-black/30 border border-white/10 text-xs font-mono space-y-2">
                  <p className="text-[#ff477b] font-bold uppercase tracking-wider text-[10px] mb-3 font-sans">
                    {language === "es" ? "Permisos de Google API Solicitados" : "Google API Scopes Requested"}
                  </p>
                  <div className="space-y-1.5 text-slate-400">
                    <p>
                      <span className="text-emerald-400">✓</span>{" "}
                      <code className="text-slate-300">adsense.readonly</code>
                      {" "}—{" "}
                      {language === "es" ? "Lectura de métricas de campañas (clics, impresiones, CPC, ROAS)" : "Read campaign metrics (clicks, impressions, CPC, ROAS)"}
                    </p>
                    <p>
                      <span className="text-emerald-400">✓</span>{" "}
                      <code className="text-slate-300">openid / email / profile</code>
                      {" "}—{" "}
                      {language === "es" ? "Identificación básica del usuario para autenticación" : "Basic user identification for authentication"}
                    </p>
                    <p>
                      <span className="text-red-400">✗</span>{" "}
                      {language === "es"
                        ? "No accedemos a Gmail, Drive, Calendar ni ningún otro servicio de Google"
                        : "We do NOT access Gmail, Drive, Calendar or any other Google service"}
                    </p>
                    <p>
                      <span className="text-red-400">✗</span>{" "}
                      {language === "es"
                        ? "No modificamos, creamos ni eliminamos campañas ni datos publicitarios"
                        : "We do NOT modify, create or delete campaigns or ad data"}
                    </p>
                  </div>
                </div>

                {/* Links row */}
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <a
                    href="/privacy"
                    className="inline-flex items-center gap-2 text-[#ff477b] font-black uppercase tracking-widest text-xs hover:text-white transition-colors"
                    onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/privacy'); window.dispatchEvent(new PopStateEvent('popstate')); }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {language === "es" ? "Política de Privacidad Completa" : "Full Privacy Policy"}
                  </a>
                  <span className="text-white/10 hidden md:block">|</span>
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {language === "es" ? "Revocar Acceso en Google" : "Revoke Access at Google"}
                  </a>
                </div>
              </div>
            </div>
          </section>

          <Suspense fallback={<SectionLoader />}>
            <StatsSection language={language} />
            <TrustBar language={language} />
            <LiveCounter language={language} />
            <FeaturesSection language={language} />
            <CapabilitiesMatrix language={language} />
            <PricingSection
              language={language}
              billingCycle={billingCycle}
              setBillingCycle={setBillingCycle}
              plans={plans}
              comingSoon={comingSoon}
              setShowConsulting={setShowConsulting}
              setSelectedPlan={setSelectedPlan}
              setShowCheckout={setShowCheckout}
            />
            <HowItWorks language={language} />
            <UseCases language={language} />
            <FAQSection language={language} />
            <div id="contact">
              <FinalCTASection
                language={language}
                onOpenPricing={onOpenPricing}
                setShowLeadMagnet={setShowLeadMagnet}
              />
            </div>
          </Suspense>

          {/* Explicit Legal Footer for Google Verification Compliance */}
          <div className="max-w-7xl mx-auto px-6 py-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-[11px] uppercase tracking-widest font-black">
            <div className="flex gap-8">
              <a href="/privacy" className="hover:text-[#ff477b] transition-colors decoration-[#ff477b]/50 underline underline-offset-4" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/privacy'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
                {language === "es" ? "Política de Privacidad" : "Privacy Policy"}
              </a>
              <a href="/terms" className="hover:text-[#ff477b] transition-colors" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/terms'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
                {language === "es" ? "Términos de Servicio" : "Terms of Service"}
              </a>
              <a href="/security" className="hover:text-[#ff477b] transition-colors" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/security'); window.dispatchEvent(new PopStateEvent('popstate')); }}>
                {language === "es" ? "Seguridad" : "Security"}
              </a>
            </div>
            <span>insitu.company v2.4 — {language === 'es' ? 'Optimización de Campañas con IA' : 'AI Campaign Optimization'}</span>
          </div>
        </main>
      </div>

      {/* ─── MODALS ─── */}
      <AnimatePresence>
        {showCheckout && (
          <CheckoutFlow
            selectedPlan={selectedPlan}
            initialBillingCycle={billingCycle === "monthly" ? "Monthly" : "Yearly"}
            onClose={() => setShowCheckout(false)}
            onComplete={(plan, cycle) => {
              setShowCheckout(false);
              onGetStarted();
            }}
            language={language}
          />
        )}
        {showLeadMagnet && (
          <LeadMagnetWizard
            initialUrl=""
            onClose={() => setShowLeadMagnet(false)}
            onComplete={async (data) => {
              await authService.saveLead(data);
              setShowLeadMagnet(false);
              onGetStarted();
            }}
          />
        )}
        {showConsulting && (
          <ConsultingModal onClose={() => setShowConsulting(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
