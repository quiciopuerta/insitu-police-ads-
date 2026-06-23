import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  AuthUser,
  Language,
  BrandProfile,
  MassAdConfig,
  MassAdBrief,
  MassAdMedium,
  MassAdMediumSelection,
  MassAdFormat,
  MassAdOverlaySettings,
  MassAdBatchResult,
  MassAdProgress,
  TextPosition,
  CreativePerformanceLog,
} from '../types';
import { TRANSLATIONS, AD_OBJECTIVES } from '../constants';
import { authService } from '../services/authService';
import { generateMassAds, estimateTokenCost } from '../services/ai/massAdGenerationService';
import Toast, { ToastData } from './Toast';
import JSZip from 'jszip';
import { Upload } from 'lucide-react';
import ProductCatalogUploader from './ProductCatalogUploader';
import AdFatigueDetector from './AdFatigueDetector';
import { useTutorial } from '../hooks/useTutorial';
import TutorialBubble, { TutorialTrigger } from './ui/TutorialBubble';
import { API_URL } from '../utils/apiConfig';

// ---------------------------------------------------------------------------
// Media catalog — each medium has its own ad formats
// ---------------------------------------------------------------------------

const MEDIA_CATALOG: MassAdMedium[] = [
  {
    id: 'search',
    name: 'Google Search',
    icon: '🔍',
    formats: [
      { aspectRatio: '16:9', label: 'Search_Display_16x9', placement: 'Responsive Display' },
      { aspectRatio: '1:1', label: 'Search_Square_1x1', placement: 'Discovery / Demand Gen' },
    ],
  },
  {
    id: 'meta',
    name: 'Meta (IG/FB)',
    icon: '📸',
    formats: [
      { aspectRatio: '4:5', label: 'Meta_Feed_4x5', placement: 'Feed (IG & FB)' },
      { aspectRatio: '9:16', label: 'Meta_Stories_9x16', placement: 'Stories & Reels' },
      { aspectRatio: '1:1', label: 'Meta_Square_1x1', placement: 'Carousel / Feed' },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    formats: [
      { aspectRatio: '9:16', label: 'TikTok_Vertical_9x16', placement: 'In-Feed & TopView' },
      { aspectRatio: '1:1', label: 'TikTok_Square_1x1', placement: 'Spark Ads / Carousel' },
    ],
  },
  {
    id: 'display',
    name: 'Display / YouTube',
    icon: '🖥️',
    formats: [
      { aspectRatio: '16:9', label: 'YouTube_Landscape_16x9', placement: 'YouTube Pre-roll / Banner' },
      { aspectRatio: '3:4', label: 'Display_Portrait_3x4', placement: 'Display Network / Pinterest' },
      { aspectRatio: '1:1', label: 'Display_Square_1x1', placement: 'GDN Responsive' },
    ],
  },
  {
    id: 'pmax',
    name: 'Performance Max',
    icon: '⚡',
    formats: [
      { aspectRatio: '16:9', label: 'PMax_Landscape_16x9', placement: 'Landscape Asset' },
      { aspectRatio: '4:5', label: 'PMax_Portrait_4x5', placement: 'Portrait Asset' },
      { aspectRatio: '1:1', label: 'PMax_Square_1x1', placement: 'Square Asset' },
    ],
  },
];

const POSITION_LABELS: Record<TextPosition, string> = {
  topLeft: 'TL', topCenter: 'TC', topRight: 'TR',
  middleLeft: 'ML', center: 'C', middleRight: 'MR',
  bottomLeft: 'BL', bottomCenter: 'BC', bottomRight: 'BR',
};

const FRAMEWORK_OPTIONS = [
  { id: 'auto', label: 'Auto (Antigravity)', icon: '🧠' },
  { id: 'aida', label: 'AIDA', icon: '📐' },
  { id: 'pas', label: 'PAS', icon: '🎯' },
  { id: 'bab', label: 'BAB', icon: '🔄' },
  { id: '4ps', label: '4Ps', icon: '💎' },
];

const DEFAULT_OVERLAY: MassAdOverlaySettings = {
  showLogo: true,
  logoPosition: 'bottomRight',
  logoSize: 0.12,
  showHeadline: true,
  headlinePosition: 'bottomCenter',
  headlineFontSize: 0.05,
  headlineColor: '#FFFFFF',
  headlineBackground: true,
  headlineBackgroundColor: 'rgba(0,0,0,0.55)',
};

// ---------------------------------------------------------------------------
// Scrubbing utility — cleans AI artifacts like "Hook:", "Headline:", etc.
// ---------------------------------------------------------------------------

function scrubCreativeCopy(text: string): string {
  if (!text) return '';
  return text
    // Remove prefixes like "Hook:", "Headline 1:", "0-1s Hook:", "Tagline:", etc.
    .replace(/^(Hook|Headline|Title|Body|CTA|Tagline|Description|Intro|Outro|Gancho|Titulo|Cuerpo|Accion)\s*\d*[:\-]\s*/i, '')
    // Remove numbering like "1.", "1 -", etc. at the start
    .replace(/^\d+[\.\-\s]\s*/, '')
    // Remove common meta-tags like (0-3s), [Hook], etc.
    .replace(/\(\d+-\d+s?\)/gi, '')
    .replace(/\[[^\]]+\]/g, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface MassAdsViewProps {
  currentUser: AuthUser | null;
  language: Language;
  history?: any[];
  onSaveHistory?: (item: any) => void;
}

export default function MassAdsView({ currentUser, language, history, onSaveHistory }: MassAdsViewProps) {
  const t = TRANSLATIONS[language];
  const es = language === 'es';

  // Brand profiles
  const profiles: BrandProfile[] = Array.isArray(currentUser?.brandProfiles) ? currentUser.brandProfiles : [];
  const [selectedBrandIndex, setSelectedBrandIndex] = useState(0);
  const brand = profiles[Math.min(selectedBrandIndex, Math.max(profiles.length - 1, 0))] || null;

  // Brief
  const [brief, setBrief] = useState<MassAdBrief>({
    keywords: '',
    audience: '',
    objective: AD_OBJECTIVES[0]?.id || 'leads',
    copyFramework: 'auto',
    optimizationLevel: 'standard',
    brandContext: brand as BrandProfile,
    customInstructions: '',
  });

  useEffect(() => {
    if (brand) {
      setBrief(prev => ({ ...prev, brandContext: brand }));
      // Auto-default overlay colors from brand palette
      const firstHex = brand.brandColors?.match(/#[0-9A-Fa-f]{3,8}/)?.[0];
      if (firstHex) {
        setOverlay(prev => ({
          ...prev,
          headlineColor: prev.headlineColor === DEFAULT_OVERLAY.headlineColor ? firstHex : prev.headlineColor,
        }));
      }
    }
  }, [brand]);

  // Media selection — each selected medium tracks which formats are active
  const [mediaSelections, setMediaSelections] = useState<MassAdMediumSelection[]>([]);

  // Config
  const [variations, setVariations] = useState(2);
  const [overlay, setOverlay] = useState<MassAdOverlaySettings>(DEFAULT_OVERLAY);

  // Batch state
  const [progress, setProgress] = useState<MassAdProgress | null>(null);
  const [batchResult, setBatchResult] = useState<MassAdBatchResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // FPCE Phase 4: Performance Feedback Log
  const [perfLogs, setPerfLogs] = useState<CreativePerformanceLog[]>([]);
  const [showPerfPanel, setShowPerfPanel] = useState(false);
  const [matrixView, setMatrixView] = useState<'medium' | 'matrix'>('medium');
  const [lastPulseDate, setLastPulseDate] = useState<string | null>(null);

  // Initialize Tutorial
  const { steps: tutorialSteps, currentStep, isVisible: isTutorialVisible, isDismissed: isTutorialDismissed, next, prev, goTo, dismiss, restart } = useTutorial('mass-ads', language);

  // Instant Ads URL Extract (FPCE Phase 1 Expansion)
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
      videoPrompt?: string;
      ttsScript?: string;
      suggestedVoice?: string;
    }
  });

  // Template Library (FPCE Phase 1 Expansion)
  const [templates, setTemplates] = useState<MassAdConfig[]>(() => {
    const saved = localStorage.getItem('insitu_mass_templates');
    return saved ? JSON.parse(saved) : [];
  });
  const [showTemplates, setShowTemplates] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  // Auto-run Batch Queue
  const [batchQueue, setBatchQueue] = useState<MassAdConfig[]>([]);

  // Fetch last pulse date on mount
  useEffect(() => {
    const fetchPulse = async () => {
      try {
        const res = await fetch(`${API_URL}/prompt-rules?feature=market-pulse`);
        if (res.ok) {
          const data = await res.json();
          if (data.rules && data.rules.length > 0) {
            // Rules are ordered by created_at DESC in the backend
            const latest = data.rules[0];
            // Format match "MONTHLY MARKET PULSE (month year)"
            const match = latest.content.match(/\(([^)]+)\)/);
            if (match) setLastPulseDate(match[1]);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch pulse date', e);
      }
    };
    fetchPulse();
  }, []);

  const handleExtractFromUrl = async () => {
    if (!urlState.url.trim() || urlState.isExtracting) return;
    setUrlState(prev => ({ ...prev, isExtracting: true, error: null, applied: false, extracted: null }));
    try {
      const resp = await fetch(`${API_URL}/media-generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'URL_EXTRACT', payload: { url: urlState.url.trim() } })
      });
      const data = await resp.json();
      if (!resp.ok || data.error) throw new Error(data.error || 'Error extrayendo URL');
      const keywords = [data.productName, ...(data.keyBenefits || [])].filter(Boolean).join(', ');
      if (!keywords) {
        setUrlState(prev => ({ ...prev, isExtracting: false, error: 'No se pudieron extraer datos' }));
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
          videoPrompt: data.videoPrompt || '',
          ttsScript: data.ttsScript || '',
          suggestedVoice: data.suggestedVoice || '',
        }
      }));
    } catch (err: any) {
      setUrlState(prev => ({ ...prev, isExtracting: false, error: err.message }));
    }
  };

  const handleApplyExtracted = () => {
    if (!urlState.extracted) return;
    const { productName, keyBenefits, targetAudience, tone, videoPrompt, ttsScript, suggestedVoice } = urlState.extracted;
    const keywords = [productName, ...keyBenefits].filter(Boolean).join(', ');
    setBrief(prev => ({
      ...prev,
      keywords,
      audience: targetAudience || prev.audience,
      tone: tone || prev.tone,
      url: urlState.url,
      videoPrompt: videoPrompt || prev.videoPrompt,
      ttsScript: ttsScript || prev.ttsScript,
      suggestedVoice: suggestedVoice || prev.suggestedVoice
    }));
    setUrlState(prev => ({ ...prev, applied: true }));
  };

  const saveTemplate = () => {
    const configToSave = { brief, variations, media: mediaSelections.filter(m => m.selectedFormats.length > 0), overlaySettings: overlay };
    setTemplates(prev => {
      const next = [...prev, configToSave];
      localStorage.setItem('insitu_mass_templates', JSON.stringify(next));
      return next;
    });
    setToast({ type: 'success', title: 'Template Saved', message: 'The configuration has been saved as a template.' });
  };

  const loadTemplate = (t: MassAdConfig) => {
    setBrief(t.brief);
    setVariations(t.variations);
    setMediaSelections(t.media);
    setOverlay(t.overlaySettings);
    setShowTemplates(false);
  };

  // Build config
  const config = useMemo<MassAdConfig>(() => ({
    brief,
    variations,
    media: mediaSelections.filter(m => m.selectedFormats.length > 0),
    overlaySettings: overlay,
  }), [brief, variations, mediaSelections, overlay]);

  const tokenEstimate = useMemo(() => estimateTokenCost(config), [config]);

  // ---------------------------------------------------------------------------
  // Media toggle helpers
  // ---------------------------------------------------------------------------

  const toggleMedium = (medium: MassAdMedium) => {
    setMediaSelections(prev => {
      const existing = prev.find(m => m.medium.id === medium.id);
      if (existing) {
        // Deselect this medium entirely
        return prev.filter(m => m.medium.id !== medium.id);
      }
      // Select medium with ALL its formats by default
      return [...prev, { medium, selectedFormats: [...medium.formats] }];
    });
  };

  const toggleFormat = (mediumId: string, format: MassAdFormat) => {
    setMediaSelections(prev =>
      prev.map(m => {
        if (m.medium.id !== mediumId) return m;
        const exists = m.selectedFormats.some(f => f.aspectRatio === format.aspectRatio && f.label === format.label);
        return {
          ...m,
          selectedFormats: exists
            ? m.selectedFormats.filter(f => !(f.aspectRatio === format.aspectRatio && f.label === format.label))
            : [...m.selectedFormats, format],
        };
      })
    );
  };

  const isMediumSelected = (id: string) => mediaSelections.some(m => m.medium.id === id);
  const isFormatSelected = (mediumId: string, format: MassAdFormat) =>
    mediaSelections.find(m => m.medium.id === mediumId)?.selectedFormats.some(
      f => f.aspectRatio === format.aspectRatio && f.label === format.label
    ) ?? false;

  // ---------------------------------------------------------------------------
  // Generate Batch
  // ---------------------------------------------------------------------------

  const handleGenerate = async () => {
    if (!currentUser) return;
    if (!brief.keywords.trim()) {
      setToast({ type: 'warning', title: 'Keywords', message: es ? 'Ingresa keywords para generar.' : 'Enter keywords to generate.' });
      return;
    }
    if (config.media.length === 0) {
      setToast({ type: 'warning', title: es ? 'Medios' : 'Media', message: es ? 'Selecciona al menos un medio publicitario.' : 'Select at least one advertising medium.' });
      return;
    }

    const check = authService.checkPlanLimits(currentUser, 'image');
    if (!check.allowed) {
      setToast({ type: 'error', title: 'Plan Limit', message: check.reason || '' });
      return;
    }

    setIsGenerating(true);
    setBatchResult(null);
    setProgress({ phase: 'idle', totalTasks: 0, completedTasks: 0, currentLabel: '', errors: [] });

    try {
      const result = await generateMassAds(config, language, setProgress);
      setBatchResult(result);

      // FPCE Phase 4: Consumption Tracking
      authService.trackTokenUsage(result.totalTokenCost || 0, 'Mass Ad Batch Generation', `${config.media.length} media, ${result.variations.length} total ads`, 'image');

      if (onSaveHistory && result && result.variations) {
        // Strip base64 image data and large blobs to avoid localStorage QuotaExceededError.
        // We only keep metadata and unique IDs for the local history view.
        const lightResult = {
          ...result,
          variations: result.variations.map(v => ({
            ...v,
            adContent: {
              headlines: v.adContent?.headlines?.slice(0, 3) || [],
              descriptions: v.adContent?.descriptions?.slice(0, 2) || [],
              socialCopy: v.adContent?.socialCopy ? 
                `${v.adContent.socialCopy.hook} ${v.adContent.socialCopy.body}`.substring(0, 200) : '',
            },
            images: v.images?.map(img => ({
              id: img.id,
              status: img.status,
              format: img.format,
              // Explicitly remove heavy data
              base64: undefined,
              dataUrl: undefined,
              compositedBlob: undefined
            })) || [],
          })),
        };

        onSaveHistory({
          id: result.id || `mass_${Date.now()}`,
          timestamp: result.timestamp || Date.now(),
          userId: currentUser.id,
          type: 'mass-ads',
          query: {
            keywords: config.brief.keywords,
            mediums: config.media.map(m => m.medium.id),
            variations: config.variations
          },
          result: lightResult,
        });
      }

      const successCount = result.variations.reduce((acc, v) => acc + v.images.filter(i => i.status === 'done').length, 0);
      setToast({
        type: 'success',
        title: es ? 'Batch Completado' : 'Batch Complete',
        message: es
          ? `${successCount} ads generados en ${(result.generationTimeMs / 1000).toFixed(1)}s`
          : `${successCount} ads generated in ${(result.generationTimeMs / 1000).toFixed(1)}s`,
      });
    } catch (err: any) {
      setToast({ type: 'error', title: 'Error', message: err.message || 'Batch generation failed' });
      setProgress(prev => prev ? { ...prev, phase: 'error' } : null);
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Hybrid Recomposite — re-apply overlay with a user-edited headline
  // ---------------------------------------------------------------------------

  const handleRecompositeSingle = async (variationId: string, _imgIdx: number, newHeadline: string) => {
    if (!batchResult) return;

    const varIdx = batchResult.variations.findIndex(v => v.id === variationId);
    if (varIdx < 0) return;

    const variation = batchResult.variations[varIdx];

    // Dynamically import the compositor to avoid circular deps
    const { compositeStaticAd, buildOverlayLayers } = await import('../utils/staticCompositor');

    const updatedImages = await Promise.all(
      variation.images.map(async (img: any) => {
        if (!img.rawImageUrl || img.status === 'error') return img;
        try {
          const { logoLayer, textLayers } = buildOverlayLayers({
            settings: config.overlaySettings,
            headline: newHeadline,
            logoUrl: config.brief.brandContext?.isotypeUrl,
            brandColors: config.brief.brandContext?.brandColors,
            brandTypography: config.brief.brandContext?.typography,
            suggestedColors: variation.adContent?.suggestedColors,
          });
          const result = await compositeStaticAd({
            imageUrl: img.rawImageUrl,
            aspectRatio: img.format.aspectRatio,
            logoLayer,
            textLayers,
          });
          return { ...img, compositedBlob: result.blob, compositedDataUrl: result.dataUrl, status: 'done' };
        } catch (e) {
          console.error('Recomposite failed for img', img.id, e);
          return img;
        }
      })
    );

    setBatchResult(prev => {
      if (!prev) return prev;
      const newVariations = [...prev.variations];
      newVariations[varIdx] = { ...variation, images: updatedImages };
      return { ...prev, variations: newVariations };
    });
  };

  // ---------------------------------------------------------------------------
  // ZIP Download
  // ---------------------------------------------------------------------------

  const handleDownloadZip = async () => {
    if (!batchResult) return;
    const zip = new JSZip();

    const summary: any = {
      generatedAt: new Date().toISOString(),
      config: {
        keywords: config.brief.keywords,
        audience: config.brief.audience,
        objective: config.brief.objective,
        brand: config.brief.brandContext?.brandName,
        variations: config.variations,
        media: config.media.map(m => ({
          medium: m.medium.name,
          formats: m.selectedFormats.map(f => f.placement),
        })),
      },
      variations: [] as any[],
    };

    for (const variation of batchResult.variations) {
      const varSummary: any = {
        medium: variation.mediumName,
        variation: variation.variationIndex + 1,
        headlines: variation.adContent.headlines,
        descriptions: variation.adContent.descriptions,
        socialCopy: variation.adContent.socialCopy,
        images: [] as string[],
      };

      for (const img of variation.images) {
        if (img.compositedBlob) {
          const filename = `${variation.mediumName.replace(/[^a-zA-Z0-9]/g, '_')}/${img.format.label}_v${variation.variationIndex + 1}.png`;
          zip.file(filename, img.compositedBlob);
          varSummary.images.push(filename);
        }
      }
      summary.variations.push(varSummary);
    }

    zip.file('_summary.json', JSON.stringify(summary, null, 2));
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `MassAds_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isReady = brief.keywords.trim() && config.media.length > 0 && brand;
  const totalAds = tokenEstimate.imageCount;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      
      {showUploader && (
        <ProductCatalogUploader
           language={language}
           onClose={() => setShowUploader(false)}
           onRunBatch={async (partialConfigs) => {
             setShowUploader(false);
             if (config.media.length === 0) {
               setToast({ type: 'warning', title: 'Media', message: 'Selecciona al menos un medio primero.' });
               return;
             }
             const fullConfigs: MassAdConfig[] = partialConfigs.map(c => ({
               brief: { ...config.brief, ...c.brief, brandContext: config.brief.brandContext },
               variations: config.variations,
               media: config.media,
               overlaySettings: config.overlaySettings
             }));
             
             // Setup Batch UI Flow
             setBatchResult(null);
             setIsGenerating(true);
             const totalAds = fullConfigs.length * config.variations * config.media.length;
             setProgress({ phase: 'copy', totalTasks: totalAds, completedTasks: 0, currentLabel: 'Starting CSV batch', errors: [] });
             
             try {
               let aggregatedVariations: any[] = [];
               for (const cfg of fullConfigs) {
                 const stepRes = await generateMassAds(cfg, language, (p) => {
                    setProgress(prev => prev ? ({...prev, currentLabel: p.currentLabel}) : p);
                 });
                 if (stepRes && stepRes.variations) {
                   aggregatedVariations = [...aggregatedVariations, ...stepRes.variations];
                   setProgress(prev => prev ? ({...prev, completedTasks: prev.completedTasks + stepRes.variations.length}) : { phase: 'copy', totalTasks: totalAds, completedTasks: stepRes.variations.length, currentLabel: 'Processing...', errors: [] });
                 }
               }
               setBatchResult({ 
                 id: `batch_${Date.now()}`, 
                 timestamp: Date.now(), 
                 variations: aggregatedVariations,
                 config: config,
                 totalTokenCost: 0,
                 generationTimeMs: 0
               });
             } catch (err: any) {
               setToast({ type: 'error', title: 'Batch Error', message: err.message });
             } finally {
               setIsGenerating(false);
             }
           }}
        />
      )}

      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter bg-gradient-to-r from-orange-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">
              {es ? 'Ads Masivos' : 'Mass Ads'}
            </h2>
            <TutorialTrigger isDismissed={isTutorialDismissed} isVisible={isTutorialVisible} language={language} onShow={next} onRestart={restart} />
          </div>
          {lastPulseDate && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                IA Actualizada: {lastPulseDate}
              </span>
            </div>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {es
            ? 'Selecciona medios publicitarios, formatos y genera ads con copy, logo y titulares por plataforma.'
            : 'Select advertising media, formats and generate ads with copy, logo and headlines per platform.'}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-12 gap-10">

        {/* ============================================================ */}
        {/* CONFIG COLUMN */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 space-y-6">

          {/* Brief Card */}
          <div id="mass-step-1" className={`bg-slate-900/50 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl backdrop-blur-md space-y-6 transition-all ${isTutorialVisible && currentStep === 0 ? 'ring-2 ring-orange-500 ring-offset-4 ring-offset-black bg-white/5' : ''}`}>
            <h3 className="text-lg font-black uppercase tracking-tight border-l-4 border-orange-400 pl-4">
              {es ? 'Brief Creativo' : 'Creative Brief'}
            </h3>

            {/* Brand Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                {es ? 'Marca / Proyecto' : 'Brand / Project'}
              </label>
              <select
                value={selectedBrandIndex}
                onChange={(e) => setSelectedBrandIndex(Number(e.target.value))}
                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-orange-400 outline-none transition-all appearance-none"
              >
                {profiles.map((p, i) => (
                  <option key={i} value={i}>{p.brandName}</option>
                ))}
                {profiles.length === 0 && <option disabled>{es ? 'Crea un perfil de marca primero' : 'Create a brand profile first'}</option>}
              </select>
              {/* Brand DNA Badge — shows what brand data feeds into generation */}
              {brand && (
                <div className="bg-slate-950/50 rounded-xl p-3 border border-white/5 space-y-2 mt-2">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Brand DNA Activo</span>
                  <div className="flex flex-wrap gap-1.5">
                    {brand.toneOfVoice && <BrandTag label={es ? 'Tono' : 'Tone'} value={brand.toneOfVoice} />}
                    {brand.brandColors && <BrandTag label={es ? 'Colores' : 'Colors'} value={brand.brandColors} />}
                    {brand.typography && <BrandTag label={es ? 'Tipografía' : 'Typography'} value={brand.typography} />}
                    {brand.industry && <BrandTag label={es ? 'Industria' : 'Industry'} value={brand.industry} />}
                    {brand.adherenceLevel && <BrandTag label="Adherence" value={brand.adherenceLevel} />}
                    {brand.isotypeUrl && <BrandTag label="Logo" value="✓" />}
                    {brand.visualGuidelines && <BrandTag label={es ? 'Guías' : 'Guidelines'} value="✓" />}
                  </div>
                </div>
              )}
            </div>

            {/* Instant Ads URL */}
            <div className="space-y-3 bg-slate-950/30 p-4 rounded-2xl border border-white/5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {es ? 'Instant Ads (Auto-Brief desde URL)' : 'Instant Ads (Auto-Brief from URL)'}
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlState.url}
                  onChange={(e) => setUrlState(prev => ({ ...prev, url: e.target.value, error: null, applied: false }))}
                  placeholder="https://ejemplo.com/producto"
                  className={`flex-1 bg-slate-900 border rounded-xl py-3 px-4 text-sm text-white focus:border-emerald-400 outline-none transition-all placeholder:text-slate-600 ${urlState.applied ? 'border-emerald-400/50' : 'border-white/10'}`}
                />
                <button
                  onClick={handleExtractFromUrl}
                  disabled={!urlState.url.trim() || urlState.isExtracting}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 px-6 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {urlState.isExtracting ? '...' : (es ? 'Extraer' : 'Extract')}
                </button>
              </div>
              {urlState.error && <p className="text-[11px] text-rose-400 pl-1">{urlState.error}</p>}
              
              <AnimatePresence>
                {urlState.extracted && !urlState.applied && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-emerald-950/20 rounded-xl border border-emerald-500/20 mt-3 space-y-3">
                    <div>
                      <p className="text-sm font-bold text-white">{urlState.extracted.productName}</p>
                      <p className="text-[10px] text-slate-500">{urlState.extracted.category}</p>
                    </div>
                    <button onClick={handleApplyExtracted} className="w-full bg-emerald-500 text-slate-950 py-2 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-400">
                      {es ? 'Aplicar al Brief' : 'Apply to Brief'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Keywords */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Keywords</label>
              <textarea
                value={brief.keywords}
                onChange={e => setBrief(prev => ({ ...prev, keywords: e.target.value }))}
                placeholder={es ? 'Ej: zapatillas running, deporte, rendimiento...' : 'E.g.: running shoes, sport, performance...'}
                rows={2}
                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:border-orange-400 outline-none transition-all resize-none placeholder:text-slate-600"
              />
            </div>

            {/* Audience */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                {es ? 'Audiencia' : 'Audience'}
              </label>
              <input
                value={brief.audience}
                onChange={e => setBrief(prev => ({ ...prev, audience: e.target.value }))}
                placeholder={es ? 'Ej: Hombres 25-45 fitness enthusiasts' : 'E.g.: Men 25-45 fitness enthusiasts'}
                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:border-orange-400 outline-none transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Custom Prompt / Instructions */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {es ? 'Instrucciones / Prompt Custom (Opcional)' : 'Instructions / Custom Prompt (Optional)'}
              </label>
              <textarea
                value={brief.customInstructions || ''}
                onChange={e => setBrief(prev => ({ ...prev, customInstructions: e.target.value }))}
                placeholder={es ? 'Ej: Enfócate en el ahorro, usa un tono sarcástico, menciona envío gratis...' : 'E.g.: Focus on savings, use a sarcastic tone, mention free shipping...'}
                rows={3}
                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 px-4 text-sm text-white focus:border-orange-400 outline-none transition-all resize-none placeholder:text-slate-600"
              />
            </div>

            {/* Objective */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                {es ? 'Objetivo' : 'Objective'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AD_OBJECTIVES.map(obj => (
                  <button
                    key={obj.id}
                    onClick={() => setBrief(prev => ({ ...prev, objective: obj.id }))}
                    className={`py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${
                      brief.objective === obj.id
                        ? 'bg-orange-500/20 border-orange-400/40 text-orange-300 shadow-lg shadow-orange-500/10'
                        : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/20'
                    }`}
                  >
                    <span className="text-sm">{obj.icon}</span>
                    <span className="truncate">{obj.label.split('(')[0].trim()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Copy Framework + Tone row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Framework</label>
                <div className="flex flex-wrap gap-1.5">
                  {FRAMEWORK_OPTIONS.map(fw => (
                    <button
                      key={fw.id}
                      onClick={() => setBrief(prev => ({ ...prev, copyFramework: fw.id as any }))}
                      className={`py-1.5 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                        brief.copyFramework === fw.id
                          ? 'bg-orange-500/20 border-orange-400/40 text-orange-300'
                          : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/20'
                      }`}
                    >
                      {fw.icon} {fw.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
                  {es ? 'Tono' : 'Tone'}
                </label>
                <input
                  value={brief.tone || ''}
                  onChange={e => setBrief(prev => ({ ...prev, tone: e.target.value }))}
                  placeholder={es ? 'Profesional...' : 'Professional...'}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:border-orange-400 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* MEDIA SELECTOR — the core of the new UX */}
          {/* ============================================================ */}
          <div id="mass-step-2" className={`bg-slate-900/50 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl backdrop-blur-md space-y-6 transition-all ${isTutorialVisible && currentStep === 1 ? 'ring-2 ring-orange-500 ring-offset-4 ring-offset-black bg-white/5' : ''}`}>
            <h3 className="text-lg font-black uppercase tracking-tight border-l-4 border-purple-400 pl-4">
              {es ? 'Medios & Formatos' : 'Media & Formats'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {es
                ? 'Selecciona los medios publicitarios. Cada medio genera copy específico para esa plataforma.'
                : 'Select advertising media. Each medium generates platform-specific copy.'}
            </p>

            <div className="space-y-3">
              {MEDIA_CATALOG.map(medium => {
                const selected = isMediumSelected(medium.id);
                return (
                  <div key={medium.id} className={`rounded-2xl border transition-all ${
                    selected ? 'bg-purple-500/5 border-purple-400/20' : 'bg-slate-950/30 border-white/5 hover:border-white/10'
                  }`}>
                    {/* Medium header */}
                    <button
                      onClick={() => toggleMedium(medium)}
                      className="w-full px-5 py-4 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all text-[10px] font-black ${
                          selected ? 'border-purple-400 bg-purple-500 text-white' : 'border-slate-600 text-transparent'
                        }`}>
                          {selected && '✓'}
                        </span>
                        <span className="text-lg">{medium.icon}</span>
                        <span className={`text-sm font-black uppercase tracking-wide ${selected ? 'text-purple-300' : 'text-slate-400'}`}>
                          {medium.name}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono">
                        {medium.formats.length} {es ? 'formatos' : 'formats'}
                      </span>
                    </button>

                    {/* Format sub-selections (visible when medium is selected) */}
                    <AnimatePresence>
                      {selected && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 space-y-1.5 border-t border-white/5 pt-3">
                            {medium.formats.map(fmt => {
                              const fmtSelected = isFormatSelected(medium.id, fmt);
                              return (
                                <button
                                  key={fmt.label}
                                  onClick={() => toggleFormat(medium.id, fmt)}
                                  className={`w-full flex items-center justify-between py-2.5 px-4 rounded-xl text-xs transition-all ${
                                    fmtSelected
                                      ? 'bg-purple-500/10 text-purple-300 font-bold'
                                      : 'text-slate-500 hover:bg-white/5'
                                  }`}
                                >
                                  <span className="flex items-center gap-2.5">
                                    <span className={`w-4 h-4 rounded border flex items-center justify-center text-[8px] font-black ${
                                      fmtSelected ? 'border-purple-400 bg-purple-400 text-white' : 'border-slate-600'
                                    }`}>
                                      {fmtSelected && '✓'}
                                    </span>
                                    <span>{fmt.placement}</span>
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-600">{fmt.aspectRatio}</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Batch Settings + Overlays */}
          <div className="grid grid-cols-2 gap-4">
            {/* Variations */}
            <div className="bg-slate-900/50 rounded-[2rem] p-6 border border-white/5 backdrop-blur-md space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  {es ? 'Variaciones' : 'Variations'}
                </label>
                <span className="text-2xl font-black text-orange-400">{variations}</span>
              </div>
              <input
                type="range" min={1} max={5} value={variations}
                onChange={e => setVariations(Number(e.target.value))}
                className="w-full accent-orange-400"
              />
              <p className="text-[9px] text-slate-600">
                {es ? 'Ángulos creativos distintos por medio' : 'Distinct creative angles per medium'}
              </p>
            </div>

            {/* Templates */}
            <div className="bg-slate-900/50 rounded-[2rem] p-6 border border-white/5 backdrop-blur-md space-y-3">
              <div className="flex justify-between items-center relative">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  {es ? 'Templates & Catálogo' : 'Templates & Catalog'}
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setShowUploader(true)} className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded font-bold uppercase transition-colors hover:bg-indigo-500 hover:text-slate-950">
                    <span className="flex items-center gap-1"><Upload className="w-3 h-3" /> CSV</span>
                  </button>
                  <button onClick={() => setShowTemplates(!showTemplates)} className="text-[9px] bg-slate-800 text-slate-400 px-2 py-1 rounded font-bold uppercase transition-colors hover:text-white">
                    {es ? 'Cargar' : 'Load'} ({templates.length})
                  </button>
                  <button onClick={saveTemplate} className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold uppercase transition-colors hover:bg-emerald-500 hover:text-slate-950">
                    {es ? 'Guardar' : 'Save'}
                  </button>
                </div>

                {showTemplates && (
                  <div className="absolute top-10 right-0 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-white/5 max-h-60 overflow-y-auto">
                    {templates.length === 0 ? (
                       <div className="p-4 text-center text-xs text-slate-500">No templates saved yet.</div>
                    ) : (
                      templates.map((t, idx) => (
                        <button key={idx} onClick={() => loadTemplate(t)} className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors group">
                          <p className="text-xs font-bold text-white group-hover:text-emerald-400 truncate">{t.brief.keywords || 'Untitled'}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{t.media.length} medios, {t.variations} vars</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed mt-2">
                {es ? 'Guarda tu config. de medios, overlays y formatos como una plantilla reutilizable.' : 'Save your media, format and overlay config as reusable template.'}
              </p>
            </div>


            {/* Overlay Summary */}
            <div className="bg-slate-900/50 rounded-[2rem] p-6 border border-white/5 backdrop-blur-md space-y-3">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Overlays</label>
              <div className="space-y-2">
                <ToggleRow
                  label="Logo"
                  active={overlay.showLogo}
                  onToggle={() => setOverlay(prev => ({ ...prev, showLogo: !prev.showLogo }))}
                />
                <ToggleRow
                  label="Headline"
                  active={overlay.showHeadline}
                  onToggle={() => setOverlay(prev => ({ ...prev, showHeadline: !prev.showHeadline }))}
                />
              </div>
            </div>
          </div>

          {/* Overlay Details (collapsible) */}
          {(overlay.showLogo || overlay.showHeadline) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="bg-slate-900/50 rounded-[2rem] p-6 border border-white/5 backdrop-blur-md space-y-5"
            >
              <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                {es ? 'Ajustes de Overlay' : 'Overlay Settings'}
              </h4>
              {overlay.showLogo && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-500">Logo</span>
                  {!brand?.isotypeUrl && (
                    <p className="text-[10px] text-amber-400/80 bg-amber-500/10 rounded-xl px-3 py-2 border border-amber-500/20">
                      {es ? 'Tu marca no tiene logo. Sube uno en Brand Identity.' : 'Your brand has no logo. Upload one in Brand Identity.'}
                    </p>
                  )}
                  <div className="flex items-center gap-4">
                    <PositionGrid value={overlay.logoPosition} onChange={(p) => setOverlay(prev => ({ ...prev, logoPosition: p }))} />
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] text-slate-600 font-bold">{Math.round(overlay.logoSize * 100)}%</label>
                      <input type="range" min={5} max={30} value={Math.round(overlay.logoSize * 100)}
                        onChange={e => setOverlay(prev => ({ ...prev, logoSize: Number(e.target.value) / 100 }))}
                        className="w-full accent-emerald-400" />
                    </div>
                  </div>
                </div>
              )}
              {overlay.showHeadline && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-500">Headline</span>
                  <div className="flex items-center gap-4">
                    <PositionGrid value={overlay.headlinePosition} onChange={(p) => setOverlay(prev => ({ ...prev, headlinePosition: p }))} />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input type="color" value={overlay.headlineColor}
                          onChange={e => setOverlay(prev => ({ ...prev, headlineColor: e.target.value }))}
                          className="w-7 h-7 rounded-lg border border-white/10 cursor-pointer bg-transparent" />
                        <button
                          onClick={() => setOverlay(prev => ({ ...prev, headlineBackground: !prev.headlineBackground }))}
                          className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                            overlay.headlineBackground ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300' : 'bg-slate-950/50 border-white/5 text-slate-500'
                          }`}
                        >
                          {es ? 'Pill BG' : 'Pill BG'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Generate Button */}
          <div id="mass-step-3" className={`space-y-3 transition-all ${isTutorialVisible && currentStep === 2 ? 'ring-2 ring-orange-500 ring-offset-4 ring-offset-black p-4 rounded-3xl bg-white/5' : ''}`}>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold px-2">
              <span>{es ? 'Costo estimado' : 'Estimated cost'}</span>
              <span className="text-orange-400 font-black">{tokenEstimate.total} tokens</span>
            </div>
            <p className="text-[10px] text-slate-600 px-2">{tokenEstimate.breakdown}</p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !isReady}
              className="w-full py-5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-orange-500 via-rose-500 to-purple-500 hover:shadow-2xl hover:shadow-orange-500/20 text-white"
            >
              {isGenerating
                ? (es ? 'Generando...' : 'Generating...')
                : (es ? `Generar ${totalAds} Ads en ${config.media.length} ${config.media.length === 1 ? 'medio' : 'medios'}` : `Generate ${totalAds} Ads across ${config.media.length} ${config.media.length === 1 ? 'medium' : 'media'}`)}
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RESULTS COLUMN */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 space-y-8">

          {/* Progress Bar */}
          <AnimatePresence>
            {progress && progress.phase !== 'idle' && progress.phase !== 'done' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-slate-900/50 rounded-[2rem] p-6 border border-white/5 backdrop-blur-md space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-400 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-white">{progress.currentLabel}</span>
                  </div>
                  <span className="text-[11px] font-black text-orange-400">
                    {progress.completedTasks}/{progress.totalTasks}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(['copy', 'images', 'compositing'] as const).map(phase => {
                    const phases = ['copy', 'images', 'compositing', 'packaging', 'done'];
                    const isCurrent = progress.phase === phase;
                    const isDone = phases.indexOf(progress.phase) > phases.indexOf(phase);
                    return (
                      <div key={phase} className="flex-1 flex items-center gap-2">
                        <div className={`h-1.5 flex-1 rounded-full transition-all ${
                          isDone ? 'bg-emerald-400' : isCurrent ? 'bg-orange-400 animate-pulse' : 'bg-slate-800'
                        }`} />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                          isDone ? 'text-emerald-400' : isCurrent ? 'text-orange-400' : 'text-slate-700'
                        }`}>
                          {phase === 'copy' ? 'Copy' : phase === 'images' ? (es ? 'Imgs' : 'Imgs') : 'Overlay'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-400 to-purple-400 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress.totalTasks > 0 ? (progress.completedTasks / progress.totalTasks) * 100 : 0}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {progress.errors.length > 0 && (
                  <div className="text-[10px] text-amber-400/70 space-y-1 max-h-20 overflow-auto">
                    {progress.errors.slice(-3).map((e, i) => <p key={i}>⚠ {e}</p>)}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {!batchResult && !isGenerating && (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
              <div className="w-24 h-24 bg-gradient-to-br from-orange-500/10 to-purple-500/10 rounded-full flex items-center justify-center border border-white/5">
                <svg className="w-10 h-10 text-orange-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-white/30 uppercase tracking-tight">
                  {es ? 'Selecciona medios y genera' : 'Select media and generate'}
                </h3>
                <p className="text-sm text-slate-600 mt-1 max-w-sm">
                  {es
                    ? 'Cada medio genera copy específico para esa plataforma + imágenes en los formatos seleccionados con logo y headlines.'
                    : 'Each medium generates platform-specific copy + images in selected formats with logo and headlines.'}
                </p>
              </div>
            </div>
          )}

          {/* Results — Creative Matrix Dashboard */}
          {batchResult && (
            <div className="space-y-8">
              {/* Top Actions & Matrix Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 backdrop-blur-xl">
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    Creative Matrix Dashboard
                  </h4>
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="font-bold text-white">{batchResult.variations.reduce((a, v) => a + v.images.filter(i => i.status === 'done').length, 0)}</span> ads
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="text-slate-500">{(batchResult.generationTimeMs / 1000).toFixed(1)}s</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="text-slate-500">{batchResult.totalTokenCost} tokens</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center bg-slate-950/60 rounded-xl p-1 border border-white/10">
                    <button 
                      onClick={() => setMatrixView('medium')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${matrixView === 'medium' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white'}`}
                    >
                      {es ? 'Por Medio' : 'By Medium'}
                    </button>
                    <button 
                      onClick={() => setMatrixView('matrix')}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${matrixView === 'matrix' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white'}`}
                    >
                      {es ? 'Vencedores' : 'Top Performers'}
                    </button>
                  </div>

                  <button
                    onClick={handleDownloadZip}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    ZIP
                  </button>
                </div>
              </div>

              {/* Variations Display */}
              <div className="space-y-12">
                {matrixView === 'medium' ? (
                  Array.from(new Set(batchResult.variations.map(v => v.mediumId))).map(mediumId => {
                    const medium = MEDIA_CATALOG.find(m => m.id === mediumId);
                    const mediumVariations = batchResult.variations.filter(v => v.mediumId === mediumId);
                    return (
                      <div key={mediumId} className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                          <span className="text-2xl">{medium?.icon}</span>
                          <span className="text-base font-black uppercase tracking-wide text-white">
                            {medium?.name || mediumId}
                          </span>
                          <span className="text-[10px] text-slate-600 font-mono ml-auto">
                            {mediumVariations.length} {es ? 'variaciones' : 'variations'}
                          </span>
                        </div>
                        <div className="space-y-10">
                          {mediumVariations.map(v => (
                            <VariationCard
                              key={v.id}
                              variation={v}
                              es={es}
                              onPreview={setPreviewImage}
                              overlaySettings={config.overlaySettings}
                              brandContext={config.brief.brandContext}
                              onRecomposite={handleRecompositeSingle}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-10">
                    <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                      <span className="text-xl">🏆</span>
                      <span className="text-base font-black uppercase tracking-wide text-white">
                        {es ? 'Ranking de Rendimiento (Capa 3)' : 'Performance Ranking (Layer 3)'}
                      </span>
                    </div>
                    {[...batchResult.variations]
                      .sort((a, b) => (b.creativeScore?.total || 0) - (a.creativeScore?.total || 0))
                      .map(v => (
                        <VariationCard
                          key={v.id}
                          variation={v}
                          es={es}
                          onPreview={setPreviewImage}
                          showMediumBadge
                          overlaySettings={config.overlaySettings}
                          brandContext={config.brief.brandContext}
                          onRecomposite={handleRecompositeSingle}
                        />
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Feedback Loop */}
              <div className="mt-12">
                <button
                  onClick={() => setShowPerfPanel(p => !p)}
                  className="w-full flex items-center justify-between px-6 py-5 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📊</span>
                    <div className="text-left">
                      <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest block">
                        {es ? 'Feedback de Rendimiento Real (Phase 4)' : 'Real Performance Feedback (Phase 4)'}
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {es ? 'Registra CTR/CPA/ROAS reales para mejorar el scoring futuro' : 'Log real CTR/CPA/ROAS to improve future scoring'}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black transition-transform ${showPerfPanel ? 'rotate-180' : ''}`}>▼</span>
                </button>
                <AnimatePresence>
                  {showPerfPanel && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-900/30 rounded-b-2xl border border-t-0 border-white/5 p-6 space-y-4">
                        <p className="text-[10px] text-slate-500">
                          {es ? 'Datos reales para retroalimentar el modelo.' : 'Real data to feed back into the model.'}
                        </p>
                        {batchResult.variations.filter(v => v.status === 'done').map(variation => (
                          <PerformanceLogRow
                            key={variation.id}
                            variationId={variation.id}
                            label={`${variation.mediumName} - V${variation.variationIndex + 1}`}
                            scoreTotal={variation.creativeScore?.total}
                            existing={perfLogs.find(l => l.variationId === variation.id)}
                            onLog={(log) => {
                              setPerfLogs(prev => [
                                ...prev.filter(l => l.variationId !== log.variationId),
                                log,
                              ]);
                            }}
                            es={es}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-size Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full rounded-2xl shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial Overlay */}
      <TutorialBubble
        steps={tutorialSteps}
        currentStep={currentStep}
        isVisible={isTutorialVisible}
        language={language}
        onNext={next}
        onPrev={prev}
        onGoTo={goTo}
        onDismiss={dismiss}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeadlineEditor — Hybrid AI Propose + User Edit
// ---------------------------------------------------------------------------

interface HeadlineEditorProps {
  variation: any;
  es: boolean;
  overlaySettings: any;
  brandContext: any;
  onRecomposite: (variationId: string, newHeadline: string) => void;
  isRecompositing: boolean;
}

function HeadlineEditor({ variation, es, overlaySettings, brandContext, onRecomposite, isRecompositing }: HeadlineEditorProps) {
  const proposed: string[] = variation.adContent?.headlines || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [editedText, setEditedText] = useState(proposed[0] || '');
  const [isDirty, setIsDirty] = useState(false);

  // Sync when a new chip is selected
  const selectChip = (idx: number) => {
    setActiveIndex(idx);
    setEditedText(proposed[idx]);
    setIsDirty(false);
  };

  const handleTextChange = (val: string) => {
    setEditedText(val);
    setIsDirty(val !== proposed[activeIndex]);
  };

  const handleApply = () => {
    onRecomposite(variation.id, editedText);
    setIsDirty(false);
  };

  if (proposed.length === 0) return null;

  return (
    <div className="bg-slate-950/70 rounded-2xl border border-white/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <span className="text-orange-400">✦</span>
          {es ? 'Titulares propuestos — elige o edita' : 'Proposed Headlines — pick or edit'}
        </span>
        {isDirty && (
          <span className="text-[9px] text-amber-400/80 font-bold animate-pulse">
            {es ? 'Cambio sin aplicar' : 'Unsaved change'}
          </span>
        )}
      </div>

      {/* Headline Chips */}
      <div className="flex flex-wrap gap-1.5">
        {proposed.map((h: string, i: number) => (
          <button
            key={i}
            onClick={() => selectChip(i)}
            className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all text-left max-w-[200px] truncate ${
              i === activeIndex && !isDirty
                ? 'bg-orange-500/20 border-orange-400/40 text-orange-200'
                : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/15 hover:text-slate-300'
            }`}
            title={h}
          >
            {i + 1}. {h.substring(0, 35)}{h.length > 35 ? '…' : ''}
          </button>
        ))}
      </div>

      {/* Editable field */}
      <div className="flex gap-2 items-start">
        <div className="flex-1 relative">
          <textarea
            value={editedText}
            onChange={e => handleTextChange(e.target.value)}
            rows={2}
            maxLength={120}
            className={`w-full bg-slate-900 rounded-xl border px-3 py-2.5 text-sm font-bold text-white resize-none outline-none transition-all placeholder:text-slate-600 ${
              isDirty ? 'border-amber-400/50 shadow-sm shadow-amber-400/10' : 'border-white/10 focus:border-orange-400/50'
            }`}
            placeholder={es ? 'Edita el titular aquí...' : 'Edit the headline here...'}
          />
          <span className="absolute bottom-2 right-2 text-[9px] text-slate-700 font-mono">
            {editedText.length}/120
          </span>
        </div>
        <button
          onClick={handleApply}
          disabled={isRecompositing || editedText.trim() === ''}
          title={es ? 'Re-aplicar overlay con este texto' : 'Re-apply overlay with this text'}
          className={`shrink-0 h-full px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex flex-col items-center justify-center gap-1 min-w-[72px] ${
            isRecompositing
              ? 'bg-slate-900 border-white/5 text-slate-600 cursor-wait'
              : isDirty
              ? 'bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500 hover:text-slate-950'
              : 'bg-orange-500/15 border-orange-400/30 text-orange-300 hover:bg-orange-500 hover:text-slate-950'
          }`}
        >
          {isRecompositing
            ? <><span className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" /><span className="text-[8px]">{es ? 'Aplicando' : 'Applying'}</span></>
            : <><span className="text-base">🎨</span><span>{es ? 'Aplicar' : 'Apply'}</span></>
          }
        </button>
      </div>

      {/* Status hint */}
      <p className="text-[9px] text-slate-700 leading-relaxed">
        {es
          ? 'La IA propone titulares basados en tu brief. Puedes elegir uno o escribir el tuyo. "Aplicar" re-composita las imágenes al instante.'
          : 'AI proposes headlines from your brief. Pick one or write your own. "Apply" re-composites the images instantly.'
        }
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variation Card — High-density creative preview + insights
// ---------------------------------------------------------------------------

interface VariationCardProps {
  variation: any;
  es: boolean;
  onPreview: (img: string) => void;
  showMediumBadge?: boolean;
  overlaySettings?: any;
  brandContext?: any;
  onRecomposite?: (variationId: string, imgIdx: number, newHeadline: string) => Promise<void>;
}

function VariationCard({ variation, es, onPreview, showMediumBadge, overlaySettings, brandContext, onRecomposite }: VariationCardProps) {
  const [showInsights, setShowInsights] = useState(false);
  const [showFatigue, setShowFatigue] = useState(false);
  const [isRecompositing, setIsRecompositing] = useState(false);
  const medium = MEDIA_CATALOG.find(m => m.id === variation.mediumId);

  const handleRecomposite = async (variationId: string, newHeadline: string) => {
    if (!onRecomposite) return;
    setIsRecompositing(true);
    try {
      await onRecomposite(variationId, -1, newHeadline); // -1 = all images
    } finally {
      setIsRecompositing(false);
    }
  };

  return (
    <div key={variation.id} className="space-y-5 pl-2 group">
      {/* Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
           <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest">
            {es ? 'Variación' : 'Variation'} {variation.variationIndex + 1}
          </span>
        </div>
        
        {showMediumBadge && medium && (
          <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-lg border border-purple-400/20 flex items-center gap-1.5">
            {medium.icon} {medium.name}
          </span>
        )}

        {variation.creativeScore && (
          <div className="flex items-center gap-1">
            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${variation.creativeScore.tier === 'top' ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300' : variation.creativeScore.tier === 'mid' ? 'bg-amber-500/15 border-amber-400/30 text-amber-300' : 'bg-rose-500/15 border-rose-400/30 text-rose-300'}`}>
              {variation.creativeScore.tier === 'top' ? '🏆' : variation.creativeScore.tier === 'mid' ? '⚡' : '⚠️'}{' '}CS: {variation.creativeScore.total}/100
            </span>
            {variation.visionResults && (
              <button 
                onClick={() => { setShowInsights(!showInsights); setShowFatigue(false); }}
                className="text-[9px] font-black uppercase text-orange-400 hover:text-white transition-colors flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-400/20"
              >
                🔍 {es ? 'VER INSIGHTS' : 'VIEW INSIGHTS'}
              </button>
            )}
            <button 
              onClick={() => { setShowFatigue(!showFatigue); setShowInsights(false); }}
              className="text-[9px] font-black uppercase text-rose-400 hover:text-white transition-colors flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-400/20"
            >
              🚨 {es ? 'FATIGA' : 'FATIGUE'}
            </button>
          </div>
        )}
      </div>

      {/* ── HYBRID HEADLINE EDITOR ── */}
      {variation.adContent?.headlines?.length > 0 && (
        <HeadlineEditor
          variation={variation}
          es={es}
          overlaySettings={overlaySettings}
          brandContext={brandContext}
          onRecomposite={handleRecomposite}
          isRecompositing={isRecompositing}
        />
      )}

      {/* Images Grid */}
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-opacity ${isRecompositing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {variation.images.map((img: any) => (
          <div key={img.id} className="group relative">
            {img.status === 'done' && img.compositedDataUrl ? (
              <div
                className="rounded-2xl overflow-hidden border border-white/5 cursor-pointer hover:border-white/20 transition-all hover:shadow-2xl hover:-translate-y-1"
                onClick={() => onPreview(img.compositedDataUrl)}
              >
                <img src={img.compositedDataUrl} alt={img.format.placement} className="w-full h-auto" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">
                    {img.format.placement}
                  </span>
                  <span className="text-[9px] text-white/50">{img.format.aspectRatio}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-slate-900/30 p-4 min-h-[120px] flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-[9px] text-slate-600">{img.format.placement}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Vision Insights Detail */}
      <AnimatePresence>
        {showInsights && variation.visionResults && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-orange-500/5 rounded-3xl p-6 border border-orange-400/20 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-orange-400 uppercase tracking-widest flex items-center gap-2">
                🧠 Neuro-Visual Analysis (Gemini Vision)
              </h5>
              <button onClick={() => setShowInsights(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{es ? 'Puntos de Atención' : 'Attention Hubs'}</span>
                  <div className="flex flex-wrap gap-2">
                    {variation.visionResults.areasOfInterest?.map((aoi: string, i: number) => (
                      <span key={i} className="text-[10px] bg-slate-900 border border-white/5 text-slate-300 px-3 py-1 rounded-full">{aoi}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-slate-950/40 rounded-2xl border border-white/5">
                  <p className="text-[11px] text-slate-400 italic leading-relaxed">
                    "{variation.visionResults.recommendation}"
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <ScoreBar label={es ? 'Contraste' : 'Contrast'} value={variation.visionResults.visualHierarchy || 0} max={20} color="blue" />
                <ScoreBar label={es ? 'Escaneabilidad' : 'Scannability'} value={variation.visionResults.brandConsistency || 0} max={20} color="purple" />
                <ScoreBar label={es ? 'Impacto CTA' : 'CTA Impact'} value={variation.visionResults.ctaPower || 0} max={25} color="orange" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Ad Fatigue Analysis */}
      <AnimatePresence>
        {showFatigue && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-rose-500/5 rounded-3xl p-6 border border-rose-400/20 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                  🚨 {es ? 'Análisis de Fatiga en Tiempo Real' : 'Real-time Ad Fatigue Analysis'}
                </h5>
                <button onClick={() => setShowFatigue(false)} className="text-slate-500 hover:text-white transition-colors">✕</button>
              </div>
              <AdFatigueDetector 
                language={es ? 'es' : 'en'}
              />
              <p className="text-[9px] text-slate-500 italic px-2">
                {es ? '* Este análisis utiliza métricas proyectadas basadas en el Creative Score y benchmarks de la industria.' : '* This analysis uses projected metrics based on Creative Score and industry benchmarks.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showInsights && variation.creativeScore && (
        <div className="bg-slate-950/60 rounded-2xl p-4 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Creative Score Summary</span>
            <span className={`text-xs font-black ${variation.creativeScore.tier === 'top' ? 'text-emerald-400' : variation.creativeScore.tier === 'mid' ? 'text-amber-400' : 'text-rose-400'}`}>{variation.creativeScore.total}/100</span>
          </div>
          <div className="space-y-1.5 opacity-60">
            <ScoreBar label="CTA" value={variation.creativeScore.ctaPower} max={25} color="orange" />
            <ScoreBar label="Platform" value={variation.creativeScore.platformFit} max={20} color="teal" />
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-slate-500">{label}</span>
      <button
        onClick={onToggle}
        className={`w-9 h-5 rounded-full transition-all relative ${active ? 'bg-emerald-500' : 'bg-slate-700'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${active ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function BrandTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] bg-white/5 text-white/50 px-2 py-0.5 rounded-md border border-white/5">
      <span className="font-black text-emerald-400/70">{label}:</span>
      <span className="truncate max-w-[100px]">{value}</span>
    </span>
  );
}

function PositionGrid({ value, onChange }: { value: TextPosition; onChange: (p: TextPosition) => void }) {
  const positions: TextPosition[] = [
    'topLeft', 'topCenter', 'topRight',
    'middleLeft', 'center', 'middleRight',
    'bottomLeft', 'bottomCenter', 'bottomRight',
  ];
  return (
    <div className="grid grid-cols-3 gap-0.5 w-20 shrink-0">
      {positions.map(pos => (
        <button
          key={pos}
          onClick={() => onChange(pos)}
          className={`w-6 h-6 rounded text-[7px] font-black transition-all ${
            value === pos
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
              : 'bg-slate-800 text-slate-600 hover:bg-slate-700'
          }`}
          title={pos}
        >
          {POSITION_LABELS[pos]}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FPCE Phase 3: Creative Score dimension bar
// ---------------------------------------------------------------------------

const SCORE_COLORS: Record<string, string> = {
  orange: 'bg-orange-500',
  purple: 'bg-purple-500',
  blue:   'bg-blue-500',
  teal:   'bg-teal-500',
  pink:   'bg-pink-500',
};

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-slate-600 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${SCORE_COLORS[color] ?? 'bg-white'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[9px] font-black text-slate-500 w-8 text-right">{value}/{max}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FPCE Phase 4: Performance Log Row (real KPI feedback per variation)
// ---------------------------------------------------------------------------

interface PerformanceLogRowProps {
  variationId: string;
  label: string;
  scoreTotal?: number;
  existing?: CreativePerformanceLog;
  onLog: (log: CreativePerformanceLog) => void;
  es: boolean;
}

function PerformanceLogRow({ variationId, label, scoreTotal, existing, onLog, es }: PerformanceLogRowProps) {
  const [ctr, setCtr]     = React.useState(existing?.ctr?.toString() ?? '');
  const [cpa, setCpa]     = React.useState(existing?.cpa?.toString() ?? '');
  const [roas, setRoas]   = React.useState(existing?.roas?.toString() ?? '');
  const [note, setNote]   = React.useState(existing?.userNote ?? '');
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    onLog({
      variationId,
      mediumId: variationId.split('-')[1] ?? '',
      loggedAt: Date.now(),
      ctr:  ctr  ? parseFloat(ctr)  : undefined,
      cpa:  cpa  ? parseFloat(cpa)  : undefined,
      roas: roas ? parseFloat(roas) : undefined,
      userNote: note || undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-slate-900/50 rounded-xl p-3 border border-white/5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400">{label}</span>
        {scoreTotal !== undefined && (
          <span className="text-[9px] text-slate-600">
            {es ? 'Score pred.' : 'Pred. Score'}: <span className="text-amber-400 font-bold">{scoreTotal}</span>
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'CTR %', val: ctr, set: setCtr },
          { label: 'CPA $', val: cpa, set: setCpa },
          { label: 'ROAS x', val: roas, set: setRoas },
        ].map(({ label: l, val, set }) => (
          <div key={l}>
            <label className="text-[9px] text-slate-600 block mb-0.5">{l}</label>
            <input
              type="number"
              step="0.01"
              value={val}
              onChange={e => set(e.target.value)}
              className="w-full bg-slate-800 border border-white/5 rounded-lg px-2 py-1 text-[10px] text-white focus:border-orange-400/50 focus:outline-none"
            />
          </div>
        ))}
      </div>
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={es ? 'Nota (opcional)...' : 'Note (optional)...'}
        className="w-full bg-slate-800 border border-white/5 rounded-lg px-2 py-1 text-[10px] text-white placeholder-slate-600 focus:border-orange-400/50 focus:outline-none"
      />
      <button
        onClick={handleSave}
        className={`w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${saved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30' : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-400/20'}`}
      >
        {saved ? (es ? 'Guardado' : 'Saved') : (es ? 'Registrar KPIs' : 'Log KPIs')}
      </button>
    </div>
  );
}
