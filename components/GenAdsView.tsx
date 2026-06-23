import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Debug Error Boundary
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GenAdsView ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-20 bg-slate-950 text-white flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20">
            <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">Fallo Crítico en Lab</h2>
          <p className="text-slate-400 max-w-md">Se detectó un error al renderizar el laboratorio de anuncios. Detalles: {this.state.error?.message}</p>
          <pre className="p-4 bg-slate-900 rounded-xl text-[11px] text-rose-400 font-mono text-left max-w-2xl overflow-auto border border-white/5">
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

import { 
  AuthUser, 
  Language, 
  AdGenerationResult, 
  GenAdsParams,
  BrandProfile,
  AppNotification
} from '../types';
import { TRANSLATIONS, AD_OBJECTIVES } from '../constants';
import { adsGenerationService } from '../services/ai/adsGenerationService';
import { extractFromUrl } from '../services/ai/mediaGenerationService';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import Toast, { ToastData } from './Toast';
import AuthGate from './AuthGate';
import { AdReferenceSelector } from './ui/AdReferenceSelector';
import { AdMockup } from './ui/AdMockup';
import { AdReference, AD_REFERENCES_REPOSITORY } from '../data/adReferences';
import { InfoTooltip } from './ui/InfoTooltip';
import { Sparkles, Brain, BookOpen, ExternalLink } from 'lucide-react';
import { AdReferenceLibrary } from './ui/AdReferenceLibrary';

interface GenAdsViewProps {
  currentUser: AuthUser | null;
  language: Language;
  onLogin?: (user: AuthUser) => void;
  onCancel?: (reason?: 'back' | 'cancel') => void;
  onSendToImageLab?: (prompt: string) => void;
  history?: any[]; // Allow any for now, filter for gen-ads inside
  onSaveHistory?: (item: any) => void;
}

function GenAdsViewContent({ currentUser, language, onLogin, onCancel, onSendToImageLab, history: globalHistory, onSaveHistory }: GenAdsViewProps) {
  console.log("[GenAdsView] Render init - currentUser:", currentUser?.id, "lang:", language);
  
  // Validation logs
  useEffect(() => {
    console.log("[GenAdsView] Constants Validation:", {
      TRANSLATIONS_EXISTS: !!TRANSLATIONS,
      LANG_EXISTS_IN_T: !!TRANSLATIONS[language],
      AD_OBJECTIVES_EXISTS: !!AD_OBJECTIVES,
      AD_OBJECTIVES_LEN: AD_OBJECTIVES?.length
    });
  }, [language]);

  const t = TRANSLATIONS[language];
  
  const [params, setParams] = useState<GenAdsParams>(() => {
    console.log("[GenAdsView] Initializing state params...");
    return {
      keywords: '',
      audience: '',
      objective: (AD_OBJECTIVES && AD_OBJECTIVES.length > 0) ? AD_OBJECTIVES[0].id : '',
      platform: 'search', 
      optimizationLevel: 'standard',
      brandContext: undefined
    };
  });
  
  const [loading, setLoading] = useState(false); // Replaced isGenerating
  const [result, setResult] = useState<AdGenerationResult | null>(null);
  const [selectedReference, setSelectedReference] = useState<AdReference | null>(null);

  // Instant Ads from URL state
  const [urlState, setUrlState] = useState({
    url: '',
    isExtracting: false,
    error: null as string | null,
    applied: false,
    extracted: null as null | {
      productName: string;
      category: string;
      keyBenefits: string[];
      targetAudience: string;
      tone: string;
    }
  });

  const handleExtractFromUrl = async () => {
    if (!urlState.url.trim() || urlState.isExtracting) return;
    setUrlState(prev => ({ ...prev, isExtracting: true, error: null, applied: false, extracted: null }));
    try {
      const data = await extractFromUrl(urlState.url.trim());
      if (data.error) throw new Error(data.error);
      const keywords = [data.productName, ...(data.keyBenefits || [])].filter(Boolean).join(', ');
      if (!keywords) {
        setUrlState(prev => ({
          ...prev,
          isExtracting: false,
          error: language === 'es'
            ? 'No se pudieron extraer datos del sitio (posible bloqueo anti-bot). Ingresa los datos manualmente.'
            : 'Could not extract data from this site (possible anti-bot block). Enter data manually.'
        }));
        return;
      }
      setUrlState(prev => ({
        ...prev,
        isExtracting: false,
        extracted: {
          productName: data.productName || '',
          category: data.category || '',
          keyBenefits: data.keyBenefits || [],
          targetAudience: data.targetAudience || '',
          tone: data.tone || '',
        }
      }));
    } catch (err: any) {
      setUrlState(prev => ({ ...prev, isExtracting: false, error: err.message }));
    }
  };

  const handleApplyExtracted = () => {
    if (!urlState.extracted) return;
    const { productName, keyBenefits, targetAudience, tone } = urlState.extracted;
    const keywords = [productName, ...keyBenefits].filter(Boolean).join(', ');
    setParams(prev => ({
      ...prev,
      keywords,
      audience: targetAudience || prev.audience,
      tone: tone || prev.tone,
    }));
    setUrlState(prev => ({ ...prev, applied: true, extracted: null }));
    showToast({ type: 'success', title: language === 'es' ? 'URL analizada' : 'URL analyzed', message: `Datos de "${productName}" aplicados al generador.` });
  };
  const [history, setHistory] = useState<AdGenerationResult[]>([]);
  const [feedback, setFeedback] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'copy' | 'visual' | 'neuro'>('copy');
  const [refining, setRefining] = useState(false); // New state for refinement loading
  const [toast, setToast] = useState<ToastData | null>(null); // Local Toast state

  const showToast = (data: ToastData) => setToast(data);
  const [activeView, setActiveView] = useState<'creative' | 'logic' | 'prompt'>('creative'); // This was added in the snippet but not used elsewhere, keeping it for now.

  // Load brand profiles safely
  const profiles = Array.isArray(currentUser?.brandProfiles) ? currentUser?.brandProfiles : [];
  const [selectedBrandIndex, setSelectedBrandIndex] = useState(0);
  const [manualBrandName, setManualBrandName] = useState('');

  // Default to manual mode if no profiles
  useEffect(() => {
    if (profiles.length === 0 && selectedBrandIndex !== -1) {
      setSelectedBrandIndex(-1);
    }
  }, [profiles.length, selectedBrandIndex]);

  useEffect(() => {
    if (selectedBrandIndex === -1) {
      // Manual brand name mode
      setParams(prev => {
        const manualContext: Partial<BrandProfile> = {
          brandName: manualBrandName || (language === 'es' ? 'Marca Genérica' : 'Generic Brand'),
          industry: language === 'es' ? 'No especificada' : 'Not specified',
          valueProposition: language === 'es' ? 'IA debe inferir del tema' : 'AI should infer from topic',
          targetAudience: language === 'es' ? 'IA debe inferir del tema' : 'AI should infer from topic',
          toneOfVoice: language === 'es' ? 'Adaptativo' : 'Adaptive',
          adherenceLevel: 'Creative',
          keyMessages: [],
          complianceRules: 'N/A',
          visualGuidelines: 'N/A'
        };
        // Only update if it actually changed to avoid effect loops
        if (prev.brandContext?.brandName === manualContext.brandName && prev.brandContext?.id === undefined) return prev;
        return { ...prev, brandContext: manualContext as BrandProfile };
      });
    } else if (profiles.length > 0) {
      const idx = Math.min(selectedBrandIndex, profiles.length - 1);
      if (idx !== selectedBrandIndex) {
        setSelectedBrandIndex(idx);
        return; // Next effect run will handle the param update
      }
      setParams(prev => {
        if (prev.brandContext === profiles[idx]) return prev;
        return { ...prev, brandContext: profiles[idx] };
      });
    } else {
      setParams(prev => {
        if (prev.brandContext === undefined) return prev;
        return { ...prev, brandContext: undefined };
      });
    }
  }, [selectedBrandIndex, profiles, manualBrandName, language]);

  // Sync with global history — Restored robustness
  useEffect(() => {
    if (Array.isArray(globalHistory)) {
      const genAdsItems = globalHistory
        .filter(item => item.type === 'gen-ads' && item.result)
        .map(item => item.result as AdGenerationResult);
      setHistory(genAdsItems);
    }
  }, [globalHistory]);

  const handleGenerate = async () => {
    if (!currentUser) {
      showToast({ type: 'error', title: 'Acceso Denegado', message: 'Debes iniciar sesión para generar anuncios.' });
      return;
    }
    if (!params.keywords) {
      showToast({ type: 'error', title: 'Error', message: language === 'es' ? 'Ingresa palabras clave o tema' : 'Enter keywords or topic' });
      return;
    }

    setLoading(true); // Use loading state
    try {
      const res = await adsGenerationService.generateAdContent(params, language);
      setResult(res); // Use 'res' instead of 'data'
      setHistory(prev => [res, ...prev]); // Use 'res' instead of 'data'
      
      // Persist to global history
      if (onSaveHistory) {
        onSaveHistory({
          type: 'gen-ads',
          query: params,
          result: res
        });
      }
      
      showToast({ type: 'success', title: 'Generación Exitosa', message: 'Tus anuncios están listos para revisar.' });
    } catch (error) {
      console.error('Generation error:', error);
      showToast({ type: 'error', title: 'Error de IA', message: 'No pudimos generar los anuncios. Reintenta en un momento.' });
    } finally {
      setLoading(false); // Use loading state
    }
  };

  const handleReferenceSelect = (ref: AdReference | null) => {
    setSelectedReference(ref);
    if (ref) {
      setParams(prev => ({
        ...prev,
        copyFramework: (['aida', 'pas', 'bab'].includes(ref.id) ? ref.id : 'auto') as any,
        customInstructions: `
[ESTRATEGIA DE COPIA]: ${ref.copyFramework}
[DIRECCIÓN CREATIVA VISUAL]: ${ref.visualFramework}
[IMPACTO PSICOLÓGICO]: ${ref.neuroImpact || 'N/A'}
`.trim()
      }));
    }
  };

  const handleRefine = async () => {
    if (!result || !feedback) return;

    setRefining(true); // Use refining state
    try {
      const res = await adsGenerationService.refineAdContent(result, feedback, language);
      setResult(res);
      setHistory(prev => [res, ...prev]); // Reconstructed based on original logic
      
      // Persist to global history
      if (onSaveHistory) {
        onSaveHistory({
          type: 'gen-ads',
          query: { ...params, customInstructions: feedback },
          result: res
        });
      }
      
      setFeedback('');
      showToast({ type: 'success', title: 'Refinamiento Completado', message: 'Hemos ajustado el contenido según tu feedback.' });
    } catch (error) {
      console.error('Refinement error:', error);
      showToast({ type: 'error', title: 'Error de IA', message: 'No pudimos procesar el feedback.' });
    } finally {
      setRefining(false); // Use refining state
    }
  };

  const handleCopy = (text: string) => { // Renamed from copyToClipboard
    navigator.clipboard.writeText(text);
    showToast({ type: 'success', title: 'Copiado', message: 'Texto copiado al portapapeles.', duration: 2000 });
  };

  if (!currentUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <AuthGate 
          onLogin={onLogin || (() => {})} 
          onCancel={onCancel || (() => {})} 
          language={language} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 pt-10 px-4 md:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic text-white flex items-center gap-4">
              {t.gen_ads_lab ? t.gen_ads_lab.split(' ')[0] : 'Gen-Ads'} <span className="text-magenta">{t.gen_ads_lab ? t.gen_ads_lab.split(' ').slice(1).join(' ') : 'Laboratory'}</span>
              <span className="text-[11px] bg-magenta/10 border border-magenta/20 px-2 py-0.5 rounded text-magenta font-black tracking-widest uppercase align-middle">Beta</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-2xl">
              {language === 'es' 
                ? 'Diseña campañas de alto impacto visual y algorítmico utilizando el Protocolo Antigravity de Neuromarketing.' 
                : 'Design high-impact visual and algorithmic campaigns using the Antigravity Neuromarketing Protocol.'}
            </p>
          </div>
          
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t.generation_history} ({history.length})
          </button>
        </div>

        <div className="grid lg:grid-cols-12 gap-10">
          
          {/* Config Column */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900/50 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl backdrop-blur-md space-y-8">
              <h3 className="text-lg font-black uppercase tracking-tight border-l-4 border-magenta pl-4">Configuración</h3>
              
              <div className="space-y-6">
                {/* Brand Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Marca / Proyecto</label>
                  <select 
                    value={selectedBrandIndex}
                    onChange={(e) => setSelectedBrandIndex(Number(e.target.value))}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-magenta outline-none transition-all appearance-none"
                  >
                    {Array.isArray(profiles) && profiles.map((p, i) => (
                      <option key={i} value={i}>{p.brandName}</option>
                    ))}
                    <option value={-1}>{language === 'es' ? '✍️ Escribir marca manualmente' : '✍️ Type brand manually'}</option>
                  </select>

                  {selectedBrandIndex === -1 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-2"
                    >
                      <input
                        type="text"
                        value={manualBrandName}
                        onChange={(e) => setManualBrandName(e.target.value)}
                        placeholder={language === 'es' ? 'Escribe el nombre de la marca...' : 'Type brand name...'}
                        className="w-full bg-magenta/5 border border-magenta/20 rounded-2xl py-3 px-4 text-sm font-bold text-white focus:border-magenta outline-none transition-all placeholder:text-magenta/30"
                      />
                      <p className="text-[10px] text-slate-500 mt-2 pl-1 leading-relaxed">
                        {language === 'es' 
                          ? 'Al escribir manualmente, la IA no usará el ADN de marca guardado, sino que se adaptará a este nombre.' 
                          : 'When typing manually, the AI won\'t use saved brand DNA and will adapt to this name instead.'}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Platform Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Plataforma</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'search', label: 'Google Search', icon: '🔍' }, // Changed id
                      { id: 'meta', label: 'Meta (IG/FB)', icon: '📸' }, // Changed id
                      { id: 'tiktok', label: 'TikTok', icon: '🎵' }, // Changed id
                      { id: 'pmax', label: 'P-Max', icon: '⚡' } // Changed id
                    ].map(plat => ( // Changed p to plat
                      <button
                        key={plat.id}
                        onClick={() => setParams({ ...params, platform: plat.id as 'search' | 'meta' | 'tiktok' | 'display' | 'pmax' })}
                        className={`py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${params.platform === plat.id ? 'bg-magenta border-magenta text-white shadow-lg shadow-magenta/20' : 'bg-slate-950/50 border-white/5 text-slate-400 hover:border-white/20'}`}
                      >
                        <span>{plat.icon}</span>
                        {plat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Instant Ads from URL */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                    {language === 'es' ? 'URL del Producto (opcional)' : 'Product URL (optional)'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlState.url}
                      onChange={(e) => setUrlState(prev => ({ ...prev, url: e.target.value, error: null, applied: false }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleExtractFromUrl()}
                      placeholder="https://miproducto.com"
                      className="flex-1 bg-slate-950/50 border border-white/10 rounded-2xl py-3 px-4 text-sm font-bold text-white focus:border-magenta outline-none transition-all placeholder:text-slate-600"
                    />
                    <button
                      onClick={handleExtractFromUrl}
                      disabled={!urlState.url.trim() || urlState.isExtracting}
                      className="px-4 py-3 bg-magenta/10 border border-magenta/20 text-magenta rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-magenta/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0"
                    >
                      {urlState.isExtracting
                        ? <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      }
                      {urlState.isExtracting ? '...' : (language === 'es' ? 'Extraer' : 'Extract')}
                    </button>
                  </div>
                  {urlState.error && <p className="text-[11px] text-rose-400 pl-1">{urlState.error}</p>}
                  {urlState.applied && !urlState.extracted && (
                    <p className="text-[11px] text-emerald-400 pl-1">✓ {language === 'es' ? 'Keywords y audiencia auto-completados' : 'Keywords and audience auto-filled'}</p>
                  )}

                  {/* Preview card — datos extraídos antes de aplicar */}
                  <AnimatePresence>
                    {urlState.extracted && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">
                              {language === 'es' ? 'Producto detectado' : 'Product detected'}
                            </p>
                            <p className="text-sm font-bold text-white">{urlState.extracted.productName}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{urlState.extracted.category}</p>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest px-2 py-1 bg-magenta/10 text-magenta rounded-lg border border-magenta/20 flex-shrink-0">Gemini</span>
                        </div>
                        {urlState.extracted.keyBenefits.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {urlState.extracted.keyBenefits.map((b, i) => (
                              <span key={i} className="text-[11px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-slate-400">{b}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          {urlState.extracted.targetAudience && <span>{language === 'es' ? 'Audiencia' : 'Audience'}: {urlState.extracted.targetAudience}</span>}
                          {urlState.extracted.tone && <span>Tono: {urlState.extracted.tone}</span>}
                        </div>
                        <button
                          onClick={handleApplyExtracted}
                          className="w-full py-2.5 bg-magenta text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-magenta/80 active:scale-95 transition-all"
                        >
                          {language === 'es' ? 'Aplicar al formulario' : 'Apply to form'}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                    {t.keywords}
                    {urlState.applied && params.keywords && (
                      <span className="text-[11px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 rounded-full normal-case tracking-normal font-bold">Auto</span>
                    )}
                  </label>
                  <textarea
                    value={params.keywords}
                    onChange={(e) => setParams({ ...params, keywords: e.target.value })}
                    className={`w-full bg-slate-950/50 border rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-magenta outline-none transition-all placeholder:text-slate-600 resize-none ${urlState.applied && params.keywords ? 'border-emerald-400/30' : 'border-white/10'}`}
                    rows={3}
                    placeholder={language === 'es' ? 'Ej: Zapatillas de running, maratón, oferta verano...' : 'Ex: Running shoes, marathon, summer sale...'}
                  />
                </div>

                {/* Audience */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                    {language === 'es' ? 'Audiencia Objetivo' : 'Target Audience'}
                    {urlState.applied && params.audience && (
                      <span className="text-[11px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 rounded-full normal-case tracking-normal font-bold">Auto</span>
                    )}
                  </label>
                  <textarea
                    value={params.audience}
                    onChange={(e) => setParams({ ...params, audience: e.target.value })}
                    className={`w-full bg-slate-950/50 border rounded-2xl py-3 px-4 text-sm font-bold text-white focus:border-magenta outline-none transition-all placeholder:text-slate-600 resize-none ${urlState.applied && params.audience ? 'border-emerald-400/30' : 'border-white/10'}`}
                    rows={2}
                    placeholder={language === 'es' ? 'Ej: Emprendedores 25-45, interesados en finanzas...' : 'Ex: Entrepreneurs 25-45, interested in finance...'}
                  />
                </div>

                {/* Tone */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                    {language === 'es' ? 'Tono de Comunicación' : 'Communication Tone'}
                    {urlState.applied && params.tone && (
                      <span className="text-[11px] bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 px-1.5 py-0.5 rounded-full normal-case tracking-normal font-bold">Auto</span>
                    )}
                  </label>
                  <select
                    value={params.tone || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, tone: e.target.value }))}
                    className={`w-full bg-slate-950/50 border rounded-2xl py-3 px-4 text-sm font-bold text-white focus:border-magenta outline-none transition-all appearance-none ${urlState.applied && params.tone ? 'border-emerald-400/30' : 'border-white/10'}`}
                  >
                    <option value="">{language === 'es' ? 'Automático (IA decide)' : 'Automatic (AI decides)'}</option>
                    <option value="profesional">{language === 'es' ? 'Profesional' : 'Professional'}</option>
                    <option value="amigable">{language === 'es' ? 'Amigable / Cercano' : 'Friendly / Approachable'}</option>
                    <option value="urgente">{language === 'es' ? 'Urgente / Directo' : 'Urgent / Direct'}</option>
                    <option value="luxury">Luxury / Premium</option>
                    <option value="casual">{language === 'es' ? 'Casual / Conversacional' : 'Casual / Conversational'}</option>
                    <option value="inspirador">{language === 'es' ? 'Inspirador / Motivacional' : 'Inspiring / Motivational'}</option>
                  </select>
                </div>

                {/* Objective */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{t.objective}</label>
                  <div className="space-y-2">
                    {Array.isArray(AD_OBJECTIVES) && AD_OBJECTIVES.map(obj => (
                      <button
                        key={obj.id}
                        onClick={() => setParams({ ...params, objective: obj.id })}
                        className={`w-full p-3 rounded-xl text-left border text-[11px] font-bold uppercase transition-all flex items-center justify-between ${params.objective === obj.id ? 'bg-slate-800 border-white/20 text-white' : 'bg-slate-950/30 border-white/5 text-slate-500'}`}
                      >
                        <span>{obj.icon} {obj.label}</span>
                        {params.objective === obj.id && <div className="w-2 h-2 bg-magenta rounded-full"></div>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-magenta" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Dirección de Arte / Ref. Externa</h4>
                      <InfoTooltip text="Aquí puedes pegar una URL de referencia o dar instrucciones específicas sobre el estilo visual (ej: 'Mismo estilo que el framework pero con luz de neón azul')." />
                    </div>
                    <textarea 
                      value={params.customInstructions}
                      onChange={(e) => setParams({...params, customInstructions: e.target.value})}
                      placeholder="Pega aquí URLs de la Ad Library o especifica cambios en la dirección de arte..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-magenta/50 focus:border-magenta/50 transition-all min-h-[80px] font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-between mb-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-magenta" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Framework de Copia</h4>
                      <InfoTooltip text="Selecciona una metodología de redacción publicitaria para guiar la generación del anuncio." />
                    </div>
                    <button 
                      onClick={() => setIsLibraryOpen(true)}
                      className="text-[9px] font-black uppercase tracking-widest text-magenta hover:text-white transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Biblioteca
                    </button>
                  </div>
                  <AdReferenceSelector 
                    selectedId={selectedReference?.id || null}
                    onSelect={handleReferenceSelect}
                    isGenerating={loading}
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={loading} // Use loading state
                  className="w-full py-5 bg-magenta text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-magenta/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? ( // Use loading state
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  )}
                  {t.generate_now}
                </button>
              </div>
            </div>
          </div>

          {/* Result Column */}
          <div className="lg:col-span-8 space-y-8">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-8"
                >
                  {/* Results Dashboard */}
                  <div className="bg-slate-900/80 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-xl overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-white/5">
                      {[
                        { id: 'copy', label: t.social_copy, icon: '✍️' },
                        { id: 'visual', label: t.visual_prompts, icon: '🎨' },
                        { id: 'neuro', label: t.neuro_logic_insight, icon: '🧠' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex-1 py-5 text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                          <span className="mr-2">{tab.icon}</span>
                          {tab.label}
                          {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-magenta" />}
                        </button>
                      ))}
                    </div>

                    <div className="p-8 md:p-12">
                      {activeTab === 'copy' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4">
                          {/* Headlines for Search */}
                          {result.headlines && result.headlines.length > 0 && (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">{t.ad_headlines}</h4>
                                <button onClick={() => handleCopy(result.headlines!.join('\n'))} className="text-[11px] text-magenta hover:underline font-black uppercase tracking-widest">{t.copy_all}</button>
                              </div>
                              <div className="grid md:grid-cols-2 gap-3">
                                {result.headlines.map((h, i) => (
                                  <div key={i} className="bg-slate-950/50 p-4 rounded-xl border border-white/5 flex justify-between items-center group">
                                    <span className="text-sm font-bold">{h}</span>
                                    <span className="text-[11px] text-slate-600 group-hover:text-white cursor-pointer" onClick={() => handleCopy(h)}>{h.length}/30</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Descriptions */}
                          {result.descriptions && result.descriptions.length > 0 && (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">{t.ad_descriptions}</h4>
                              </div>
                              <div className="space-y-3">
                                {result.descriptions.map((d, i) => (
                                  <div key={i} className="bg-slate-950/50 p-4 rounded-xl border border-white/5 flex justify-between items-start group">
                                    <span className="text-sm font-medium text-slate-300 flex-1">{d}</span>
                                    <button onClick={() => handleCopy(d)} className="text-magenta opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Social Copy (Hook/Body/CTA) */}
                          <div className="grid lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-7 space-y-6">
                              <div className="space-y-4 bg-magenta/5 border border-magenta/10 rounded-3xl p-8">
                                <h4 className="text-xs font-black uppercase tracking-widest text-magenta flex items-center gap-2">
                                  <Sparkles className="w-4 h-4" />
                                  {t.social_copy}
                                </h4>
                                <div className="space-y-6">
                                  <div>
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2">Hook</span>
                                    <p className="text-lg font-black text-white italic">"{result.socialCopy?.hook}"</p>
                                  </div>
                                  <div>
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-2">Body</span>
                                    <p className="text-sm font-medium text-slate-300 leading-relaxed">{result.socialCopy?.body}</p>
                                  </div>
                                  <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <span className="text-xs font-black uppercase tracking-widest text-white">CTA: {result.socialCopy?.cta}</span>
                                    <button onClick={() => handleCopy(`${result.socialCopy?.hook}\n\n${result.socialCopy?.body}\n\n${result.socialCopy?.cta}`)} className="p-2 bg-magenta rounded-xl text-white shadow-lg shadow-magenta/20">
                                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Platform Practices */}
                              {result.platformBestPractices && result.platformBestPractices.length > 0 && (
                                <div className="bg-slate-900/50 rounded-3xl p-6 border border-white/5">
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                                    <Brain className="w-3 h-3" />
                                    Algorithmic Best Practices
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {result.platformBestPractices.map((practice, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-400">
                                        <div className="w-1 h-1 rounded-full bg-magenta/50" />
                                        {practice}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Ad Mockup Preview */}
                            <div className="lg:col-span-5">
                              <div className="sticky top-8">
                                <div className="flex items-center gap-2 mb-4 pl-2">
                                  <div className="w-2 h-2 rounded-full bg-brand-neon animate-pulse" />
                                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Mockup Interactivo</h4>
                                  <InfoTooltip text="Esta es una previsualización de cómo se verá tu anuncio en redes sociales." />
                                </div>
                                
                                <AdMockup 
                                  brandName={params.brandContext?.brandName || "Tu Marca"}
                                  primaryText={result.socialCopy?.body || ""}
                                  headline={result.headlines?.[0] || ""}
                                  cta={result.socialCopy?.cta || "Ver más"}
                                  imageUrl={result.creativePrompts?.insitu_placeholder || "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000&auto=format&fit=crop"}
                                  referenceLabel={selectedReference?.name}
                                />

                                <div className="mt-6 flex flex-col gap-3">
                                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">Visual Direction</span>
                                    <p className="text-xs text-white/70 italic leading-relaxed">
                                      {result.creativePrompts?.visualStyle}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'visual' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4">
                          <div className="bg-slate-950/50 p-8 rounded-3xl border border-white/5 space-y-6">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 bg-magenta/10 rounded-2xl flex items-center justify-center border border-magenta/20">
                                <span className="text-2xl">📸</span>
                              </div>
                              <div>
                                <h4 className="text-lg font-black uppercase tracking-tight">{t.visual_style}</h4>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{result.creativePrompts?.visualStyle}</p>
                              </div>
                            </div>
                            
                            <div className="space-y-6">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-magenta rounded-full animate-pulse"></div>
                                    <span className="text-[11px] font-black text-magenta uppercase tracking-widest">{t.prompt_insitu || 'Prompt INsitu Image Lab'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {onSendToImageLab && result.creativePrompts?.insitu && (
                                      <button
                                        onClick={() => onSendToImageLab(result.creativePrompts!.insitu)}
                                        className="text-[11px] text-emerald-400 font-black uppercase tracking-widest h-6 px-3 bg-emerald-400/10 rounded-full border border-emerald-400/20 hover:bg-emerald-400/20 transition-colors flex items-center gap-1"
                                      >
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        {language === 'es' ? 'Generar imagen' : 'Generate image'}
                                      </button>
                                    )}
                                    <button onClick={() => handleCopy(result.creativePrompts?.insitu || '')} className="text-[11px] text-magenta font-black uppercase tracking-widest h-6 px-3 bg-magenta/10 rounded-full border border-magenta/20">Copy</button>
                                  </div>
                                </div>
                                <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-magenta/10 text-sm font-mono text-cyan-300 leading-relaxed">
                                  {result.creativePrompts?.insitu}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Appearance / UI Simulation info could go here */}
                          <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-3xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </div>
                            <div>
                              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400 block mb-1">{t.platform_safe_zones}</span>
                              <p className="text-xs text-slate-300 font-medium">Este prompt considera las áreas de interfaz de {params.platform} para evitar obstruir elementos clave.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'neuro' && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4">
                          {/* Neuro Logic Summary */}
                          <div className="bg-gradient-to-br from-magenta/20 to-purple-600/20 p-10 rounded-[2.5rem] border border-magenta/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-magenta/10 rounded-full blur-3xl group-hover:bg-magenta/20 transition-all duration-1000"></div>
                            <div className="relative z-10 space-y-6">
                              <h4 className="text-2xl font-black italic tracking-tighter uppercase text-white border-l-4 border-magenta pl-6">{t.neuro_logic_insight}</h4>
                              <p className="text-lg font-medium text-slate-200 leading-relaxed italic">"{result.creativePrompts?.neuroLogic}"</p>
                              
                              <div className="grid md:grid-cols-2 gap-4 pt-6">
                                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                  <span className="text-[11px] font-black text-magenta uppercase tracking-widest block mb-2">Neuro-Quality Score</span>
                                  <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black text-white">{result.neuroQualityScore}</span>
                                    <span className="text-sm font-bold text-slate-500 mb-1">/100</span>
                                  </div>
                                </div>
                                <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                  <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest block mb-2">{t.best_platform}</span>
                                  <span className="text-xl font-bold text-white uppercase">{params.platform.replace('-', ' ')}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Platform Best Practices */}
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5 space-y-4">
                              <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Industry Checkmarks</h5>
                              <ul className="space-y-3">
                                {result.platformBestPractices?.map((rule, idx) => (
                                  <li key={idx} className="flex items-center gap-3 text-xs font-bold text-slate-300">
                                    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    {rule}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5 space-y-6">
                              <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Design Tokens</h5>
                              <div className="space-y-4">
                                <div>
                                  <span className="text-[11px] font-medium text-slate-600 uppercase tracking-widest block mb-2">Typography</span>
                                  <p className="text-sm font-black text-white">{result.suggestedTypography}</p>
                                </div>
                                <div>
                                  <span className="text-[11px] font-medium text-slate-600 uppercase tracking-widest block mb-2">Paleta Sugerida</span>
                                  <div className="flex gap-3">
                                    {result.suggestedColors?.map((color, idx) => (
                                      <div key={idx} className="group relative">
                                        <div className="w-10 h-10 rounded-xl border border-white/10 shadow-lg" style={{ backgroundColor: color }}></div>
                                        <span className="absolute -bottom-6 left-0 text-[11px] font-black text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">{color}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Refinement Loop */}
                  <div className="bg-slate-900/50 rounded-[2.5rem] p-4 md:p-6 border border-white/5 shadow-2xl backdrop-blur-md">
                    <div className="flex flex-col md:flex-row gap-4">
                      <input
                        type="text"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder={language === 'es' ? 'Ej: Hazlo más urgente, enfocado en el precio, sin usar "gratis"...' : 'Ex: Make it more urgent, price-focused, without using "free"...'}
                        className="flex-1 bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-magenta outline-none transition-all placeholder:text-slate-700"
                        onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                      />
                      <button
                        onClick={handleRefine}
                        disabled={refining || !feedback} // Use refining state
                        className="px-8 py-4 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-magenta transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        {t.refine_result}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-[600px] flex flex-col items-center justify-center text-center space-y-8 px-8">
                  <div className="w-24 h-24 bg-magenta/5 rounded-[2rem] border border-magenta/10 flex items-center justify-center">
                    <svg className="w-12 h-12 text-magenta/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">{language === 'es' ? 'Listo para Generar Éxito' : 'Ready for Success'}</h3>
                    <p className="text-slate-500 font-medium max-w-sm">{language === 'es' ? 'Ingresa los detalles de tu campaña para que la IA diseñe piezas ganadoras.' : 'Enter your campaign details for the AI to design winning pieces.'}</p>
                  </div>
                  {/* Steps guide */}
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-600 flex-wrap justify-center">
                    <span className={`px-3 py-1.5 rounded-xl border transition-colors ${params.platform ? 'bg-magenta/10 border-magenta/20 text-magenta' : 'bg-white/5 border-white/10'}`}>
                      1 · {language === 'es' ? 'Plataforma' : 'Platform'}
                    </span>
                    <span className="text-slate-700">→</span>
                    <span className={`px-3 py-1.5 rounded-xl border transition-colors ${params.keywords ? 'bg-magenta/10 border-magenta/20 text-magenta' : 'bg-white/5 border-white/10'}`}>
                      2 · Keywords
                    </span>
                    <span className="text-slate-700">→</span>
                    <span className="px-3 py-1.5 rounded-xl border bg-white/5 border-white/10">
                      3 · {language === 'es' ? 'Generar' : 'Generate'}
                    </span>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Library Modal */}
      <AdReferenceLibrary 
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        selectedId={selectedReference?.id || null}
        onSelect={handleReferenceSelect}
      />

      {/* Local Toast Rendering */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      {/* History Slide-over (Simple Overlay) */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex justify-end"
            onClick={() => setShowHistory(false)}
          >
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-slate-900 h-full shadow-2xl border-l border-white/5 p-8 overflow-y-auto space-y-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black uppercase tracking-tight">{t.generation_history}</h3>
                <button onClick={() => setShowHistory(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-4">
                {history.length === 0 ? (
                  <p className="text-slate-500 text-sm font-medium">{t.no_history}</p>
                ) : (
                  history.map((h, i) => (
                    <button
                      key={h.id}
                      onClick={() => { setResult(h); setShowHistory(false); }}
                      className="w-full bg-slate-950/50 p-6 rounded-2xl border border-white/5 border-l-4 border-l-magenta text-left hover:bg-slate-800 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-black text-magenta uppercase tracking-widest">{h.type.replace('-', ' ')}</span>
                        <span className="text-[11px] text-slate-600">{new Date(h.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm font-bold text-white mb-2 line-clamp-1 truncate">{h.headlines?.[0] || h.socialCopy?.hook}</p>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2">{h.socialCopy?.body}</p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GenAdsView(props: GenAdsViewProps) {
  return (
    <ErrorBoundary>
      <GenAdsViewContent {...props} />
    </ErrorBoundary>
  );
}
