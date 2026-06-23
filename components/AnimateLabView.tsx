import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  RefreshCw,
  Download,
  Play,
  Volume2,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  Layers,
  Wand2,
  Music,
  ShieldCheck,
  Library,
  ChevronDown,
  MessageSquare,
  Clock,
  Brain
} from 'lucide-react';
import {
  animateImageWithVeo,
  generateAudio,
  VOICE_LIST
} from '../services/ai/mediaGenerationService';
import { PlatformFormatSelector } from './ui/PlatformFormatSelector';
import { generateCaptions } from '../utils/whisperCaptions';
import { TRANSLATIONS } from '../constants';
import { proxiedAssetUrl } from '../utils/apiConfig';
import { Language, AuthUser, Caption } from '../types';
import { mixAndDownload, canMixInBrowser } from '../utils/videoMixer';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

const MUSIC_LIBRARY = [
  { id: 'm1',  name: 'Cinematic Epic',    category: 'Cinematic',  url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_73155fd4e6.mp3' },
  { id: 'm2',  name: 'Dramatic Score',    category: 'Cinematic',  url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3' },
  { id: 'm4',  name: 'Epic Trailer',      category: 'Cinematic',  url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_8aa6c0e58b.mp3' },
  { id: 'm5',  name: 'Upbeat Tech',       category: 'Corporate',  url: 'https://cdn.pixabay.com/audio/2021/01/18/audio_d14f48b9f7.mp3' },
  { id: 'm6',  name: 'Minimal Corporate', category: 'Corporate',  url: 'https://cdn.pixabay.com/audio/2021/11/25/audio_9bc5396556.mp3' },
  { id: 'm7',  name: 'Innovation Drive',  category: 'Corporate',  url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
  { id: 'm8',  name: 'Summer Energetic',  category: 'Energetic',  url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_bb3e524177.mp3' },
  { id: 'm9',  name: 'Electric Rush',     category: 'Energetic',  url: 'https://cdn.pixabay.com/audio/2022/10/16/audio_7b6d3f8e9a.mp3' },
  { id: 'm10', name: 'Pulse Beat',        category: 'Energetic',  url: 'https://cdn.pixabay.com/audio/2021/10/25/audio_af7d4c3b9e.mp3' },
  { id: 'm11', name: 'Inspiring Hope',    category: 'Emotional',  url: 'https://cdn.pixabay.com/audio/2022/08/23/audio_635fd1d53a.mp3' },
  { id: 'm12', name: 'Gentle Journey',    category: 'Emotional',  url: 'https://cdn.pixabay.com/audio/2022/02/07/audio_4e5e9f7a2e.mp3' },
  { id: 'm13', name: 'Deep Focus',        category: 'Ambient',    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_cb6e5b0c2e.mp3' },
  { id: 'm14', name: 'Calm Flow',         category: 'Ambient',    url: 'https://cdn.pixabay.com/audio/2021/12/05/audio_8b78f5f7a1.mp3' },
  { id: 'm15', name: 'Space Drift',       category: 'Ambient',    url: 'https://cdn.pixabay.com/audio/2022/01/04/audio_d3a9b27fa1.mp3' },
  { id: 'm16', name: 'Lo-Fi Chill',       category: 'Ambient',    url: 'https://cdn.pixabay.com/audio/2022/05/17/audio_69c3f73a5a.mp3' },
];

const CaptionOverlay: React.FC<{ 
  captions: Caption[] | null; 
  currentTimeMs: number; 
  isVisible: boolean;
}> = ({ captions, currentTimeMs, isVisible }) => {
  if (!captions || !isVisible) return null;
  const activeCaption = captions.find(c => currentTimeMs >= c.startMs && currentTimeMs <= c.endMs);
  return (
    <div className="absolute left-0 right-0 bottom-16 z-20 flex justify-center pointer-events-none px-8">
      <AnimatePresence mode="wait">
        {activeCaption && (
          <motion.div
            key={activeCaption.text}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-2 shadow-2xl text-center"
          >
            <span className="text-sm md:text-base font-bold text-white tracking-wide drop-shadow-sm leading-tight inline-block max-w-[280px] md:max-w-[400px]">
              {activeCaption.text}
            </span>
            <div className="absolute -bottom-1 left-4 right-4 h-[1px] bg-[#ff477b]/30 overflow-hidden rounded-full">
              <motion.div 
                className="h-full bg-[#ff477b]"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: (activeCaption.endMs - activeCaption.startMs) / 1000, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ErrorDisplay: React.FC<{ error: string; isAdmin: boolean }> = ({ error, isAdmin }) => {
  let message = error;
  let debugContent = null;
  try {
    const trimmed = error.trim();
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      message = parsed.details || parsed.message || (typeof parsed.error === 'string' ? parsed.error : "AI Error");
      if (isAdmin) {
        debugContent = (
          <div className="mt-2 p-3 bg-black/60 rounded-xl text-[11px] font-mono overflow-auto max-h-60 border border-white/10 select-all">
            <p className="text-rose-300 font-bold mb-1 flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-rose-400" /> DEBUG INFO (SUPER ADMIN)
            </p>
            <div className="space-y-1 mb-2 opacity-80 border-b border-white/5 pb-2">
              <p><span className="text-rose-400/70">TASK:</span> {parsed.type || 'UNKNOWN'}</p>
              {parsed.meta?.apiKeyMasked && (
                <p>
                  <span className="text-rose-400/70">KEY:</span> {parsed.meta.apiKeyMasked}
                  <span className="ml-2 text-white/20 text-[7px] italic">({parsed.meta.apiKeySource})</span>
                </p>
              )}
            </div>
            {parsed.details && parsed.message && parsed.details !== parsed.message && (
               <p className="text-rose-200/50 mb-1">{parsed.message}</p>
            )}
            <pre className="whitespace-pre-wrap opacity-60 text-xs text-rose-100">{parsed.details || (typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error, null, 2))}</pre>
            {parsed.stack && (
              <pre className="whitespace-pre-wrap opacity-25 mt-3 pt-2 border-t border-white/5 text-[11px] bg-black/20 p-2 rounded leading-tight">
                {parsed.stack}
              </pre>
            )}
          </div>
        );
      }
    }
  } catch (e) {}
  return (
    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col gap-1 text-rose-500 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-[11px] font-bold uppercase tracking-wider">{message}</p>
      </div>
      {debugContent}
    </div>
  );
};

export interface AnimateLabViewProps {
  currentUser: AuthUser | null;
  language: Language;
  audioState?: any;
}

const AnimateLabView: React.FC<AnimateLabViewProps> = ({
  currentUser,
  language,
  audioState
}) => {
  const t = TRANSLATIONS[language];
  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.role === 'superAdmin' ||
                  currentUser?.email === 'admin@insitu.ai' || 
                  currentUser?.email === 'sanchezfj@me.com' ||
                  currentUser?.email === 'sociopuerta@gmail.com' ||
                  currentUser?.email === 'contacto@fjsanchez.com' || 
                  currentUser?.email === 'admin@insitu.company';
  const isSuperAdmin = currentUser?.role === 'superAdmin' || 
                       currentUser?.email === 'admin@insitu.ai' || 
                       currentUser?.email === 'sanchezfj@me.com' ||
                       currentUser?.email === 'sociopuerta@gmail.com' ||
                       currentUser?.email === 'qa_tester@insitu.company';

  const brandProfile = currentUser?.brandProfile;
  const hasBrandContext = !!(brandProfile?.brandName && brandProfile?.industry && brandProfile?.toneOfVoice && brandProfile?.valueProposition);
  const [useBrandContext, setUseBrandContext] = useState(true);
  const [showAdvancedCinema, setShowAdvancedCinema] = useState(false);

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const [animationState, setAnimationState] = useState({
    sourceImage: null as string | null,
    prompt: '',
    format: '9:16' as '9:16' | '16:9',
    ttsText: '',
    ttsVoice: 'Default' as string,
    ttsLanguage: 'Spanish',
    ttsDialect: 'Neutral',
    ttsTone: 'Professional',
    ttsEmotion: 'Neutral',
    ttsPitch: 1.0,
    ttsSpeed: 1.0,
    videoUrl: null as string | null,
    audioUrl: null as string | null,
    isAnimating: false,
    error: null as string | null,
    pollingProgress: null as { attempt: number; max: number } | null,
    musicSource: 'none' as 'none' | 'library' | 'upload',
    selectedMusicUrl: '',
    uploadedMusicUrl: null as string | null,
    musicVolume: 0.4,
    voiceoverOffset: 0,
    isMixing: false,
    mixProgress: 0,

    motionIntensity: 0.5,
    cameraMotionSpeed: 0.5,
    styleReferencePower: 0.5,
    autoSubtitles: false,
    captions: null as Caption[] | null,
    isGeneratingCaptions: false,
    styleImage: null as string | null,
    subjectImage: null as string | null,
    expandedPrompt: null as string | null,
    platform: 'Universal / Multiplatform' as string,
  });

  const [animationLabTime, setAnimationLabTime] = useState(0);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionProgress, setCaptionProgress] = useState<{ stage: string; pct: number } | null>(null);

  const animVideoRef = useRef<HTMLVideoElement>(null);
  const animMusicRef = useRef<HTMLAudioElement>(null);
  const animVoiceoverRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if ((animationState.format as string) === '1:1') {
      setAnimationState(prev => ({ ...prev, format: '16:9' }));
    }
  }, [animationState.format]);

  useEffect(() => {
    if (!isAdmin) return;
    const handleExpansion = (e: Event) => {
      const { expanded } = (e as CustomEvent).detail;
      setAnimationState(prev => ({ ...prev, expandedPrompt: expanded }));
    };
    window.addEventListener('prompt-expanded', handleExpansion);
    return () => window.removeEventListener('prompt-expanded', handleExpansion);
  }, [isAdmin]);

  const buildBrandPrefix = () => {
    if (!hasBrandContext || !brandProfile || !useBrandContext) return '';
    const lines = [
      `[BRANDING IDENTITY — Goal: Consistent visual alignment]`,
      `Brand Name: ${brandProfile.brandName}`,
      `Industry/Sector: ${brandProfile.industry}`,
      `Brand Personality & Tone: ${brandProfile.toneOfVoice}`,
      `Core Value Proposition: ${brandProfile.valueProposition}`,
    ];
    if (brandProfile.targetAudience) lines.push(`Target Audience: ${brandProfile.targetAudience}`);
    if (brandProfile.brandColors) lines.push(`Color Palette: ${brandProfile.brandColors}`);
    if (brandProfile.typography) lines.push(`Typography Style: ${brandProfile.typography}`);
    if (brandProfile.visualGuidelines) lines.push(`Visual Guidelines: ${brandProfile.visualGuidelines}`);
    
    return [
      "--- BRAND IDENTITY CONTEXT ---",
      ...lines,
      "--- USER REQUEST (PRIORITY) ---",
      "Interpret the following request while respecting the brand context above:",
      ""
    ].join('\n') + '\n';
  };

  const brandPrefix = buildBrandPrefix();

  const convertToJpeg = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const handleReferenceUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'style' | 'subject'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE && !isSuperAdmin) {
      setToast({ 
        message: language === 'es' ? 'Límite de 2MB excedido. Los Super Admins tienen acceso ilimitado.' : '2MB limit exceeded. Super Admins have unlimited access.', 
        type: 'error' 
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const jpeg = await convertToJpeg(dataUrl);
      const key = type === 'style' ? 'styleImage' : 'subjectImage';
      setAnimationState((prev) => ({ ...prev, [key]: jpeg }));
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setAnimationState(prev => ({ ...prev, sourceImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateCaptions = async (audioUrl: string) => {
    setIsGeneratingCaptions(true);
    setCaptionProgress(null);
    try {
      const { generateCaptions } = await import('../utils/whisperCaptions');
      const captions = await generateCaptions(audioUrl, {
        model: 'gemini',
        onProgress: (stage, pct) => setCaptionProgress({ stage, pct }),
      });
      setAnimationState(prev => ({ ...prev, captions }));
    } catch (err: any) {
      console.error('[Captions] Error:', err);
      const isCrossOriginIsolationError =
        err?.message?.includes('crossOriginIsolated') ||
        err?.message?.includes('SharedArrayBuffer') ||
        err?.message?.includes('cross-origin isolated');

      if (isCrossOriginIsolationError) {
        const msg = language === 'es'
          ? '⚠️ Subtítulos automáticos requieren aislamiento cross-origin (COOP/COEP). El administrador debe activar estos headers para habilitar Whisper Web.'
          : '⚠️ Auto-captions require cross-origin isolation (COOP/COEP headers). Ask the admin to enable them to unlock Whisper Web.';
        setAnimationState(prev => ({ ...prev, error: msg }));
      } else {
        alert(language === 'es'
          ? `No se pudieron generar subtítulos: ${err.message}`
          : `Could not generate captions: ${err.message}`);
      }
    } finally {
      setIsGeneratingCaptions(false);
      setCaptionProgress(null);
    }
  };

  const handleAnimate = async () => {
    if (!animationState.sourceImage || !animationState.prompt) return;
    setAnimationState(prev => ({ ...prev, isAnimating: true, error: null }));
    try {
      const sourceDataUrl = animationState.sourceImage;
      const finalImageBase64 = sourceDataUrl.startsWith('data:image/webp') || !sourceDataUrl.startsWith('data:image/jpeg')
        ? (await convertToJpeg(sourceDataUrl)).split(',')[1]
        : sourceDataUrl.split(',')[1];

      const finalFormat = (animationState.format as string) === '1:1' ? '9:16' : animationState.format;
      
      const url = await animateImageWithVeo(
        finalImageBase64,
        brandPrefix + animationState.prompt,
        finalFormat,
        (attempt, max) => setAnimationState(prev => ({ ...prev, pollingProgress: { attempt, max } })),
        6,
        {
          motionIntensity: animationState.motionIntensity,
          cameraMotionSpeed: animationState.cameraMotionSpeed,
          styleReferencePower: animationState.styleReferencePower,
          styleReference: animationState.styleImage || undefined,
          subjectReference: animationState.subjectImage || undefined,
        }
      );
      let audioUrl = null;
      if (animationState.ttsText) {
        audioUrl = await generateAudio({
          text: animationState.ttsText,
          voice: animationState.ttsVoice,
          audioData: animationState.ttsVoice === 'Clonada' && audioState?.sampleAudio ? audioState.sampleAudio : undefined,
          language: animationState.ttsLanguage,
          dialect: animationState.ttsDialect,
          tone: animationState.ttsTone,
          emotion: animationState.ttsEmotion,
          pitch: animationState.ttsPitch,
          speed: animationState.ttsSpeed
        }).catch((e: any) => { console.warn("[Animation] Audio generation failed (non-critical):", e?.message); return null; });
      }

      let captions = null;
      if (animationState.autoSubtitles && (audioUrl || url)) {
        try {
          setAnimationState(prev => ({ ...prev, isGeneratingCaptions: true }));
          const { generateCaptions } = await import('../utils/whisperCaptions');
          captions = await generateCaptions(audioUrl || url, {
            videoUrl: audioUrl ? undefined : url,
          });
        } catch (capErr) {
          console.error('[Captions] Animation subtitling failed:', capErr);
        }
      }

      setAnimationState(prev => ({ 
        ...prev, 
        videoUrl: url, 
        audioUrl: audioUrl, 
        captions,
        isAnimating: false, 
        isGeneratingCaptions: false,
        pollingProgress: null 
      }));
      console.log(language === 'es' ? '¡Animación completada!' : 'Animation completed!');
    } catch (err: any) {
      const errorPayload = err.serverStack
        ? JSON.stringify({ message: err.message, stack: err.serverStack, type: 'ANIMATE' })
        : err.message;
      setAnimationState(prev => ({ ...prev, isAnimating: false, error: errorPayload, pollingProgress: null }));
      console.error(err.message);
    }
  };

  const TechnicalBriefButton: React.FC<{ prompt: string | null }> = ({ prompt }) => {
    const [show, setShow] = useState(false);
    if (!isSuperAdmin || !prompt) return null;

    return (
      <div className="mt-4">
        <button
          onClick={() => setShow(!show)}
          className="flex items-center gap-2 px-4 py-2 bg-[#ff477b]/10 border border-[#ff477b]/30 rounded-full text-[10px] font-black uppercase tracking-widest text-[#ff477b] hover:bg-[#ff477b]/20 transition-all"
        >
          <ShieldCheck className="w-3 h-3" />
          {show ? (language === 'es' ? 'Ocultar Brief Técnico' : 'Hide Technical Brief') : (language === 'es' ? 'Ver Brief Técnico (Super Admin)' : 'View Technical Brief')}
        </button>
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3"
            >
              <div className="p-4 bg-black/40 border border-white/10 rounded-2xl">
                <p className="text-[10px] text-white/50 mb-2 uppercase font-bold tracking-widest">Veo 3.1 Prompt:</p>
                <p className="text-xs text-white/80 whitespace-pre-wrap font-mono">{prompt}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      key="animate-lab"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-white/5 p-8 md:p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-2xl"
    >
      <div className="lg:col-span-12 mb-8">
        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] mb-4 block">{t.creative_lab} / {t.animate_lab}</span>
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
          Bring Images <br /> <span className="text-gradient-magenta">to Life</span>.
        </h1>
      </div>

      <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-10">
          <div className="space-y-6">
            <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Imagen Base</label>
            <label className={cn(
              "w-full aspect-video flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] cursor-pointer hover:bg-white/5 transition-all group overflow-hidden relative",
              animationState.sourceImage ? "border-solid border-[#ff477b]/50" : "border-white/10"
            )}>
              {animationState.sourceImage ? (
                <img src={animationState.sourceImage} className="w-full h-full object-cover" />
              ) : (
                <>
                  <Wand2 className="w-8 h-8 mb-4 text-white/20 group-hover:text-[#ff477b] transition-colors" />
                  <span className="text-xs font-black uppercase tracking-widest text-white/20">Seleccionar Imagen para Animar</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>

          <PlatformFormatSelector
            value={animationState.format}
            onChange={(r) => setAnimationState(prev => ({ ...prev, format: r as '9:16' | '16:9' }))}
            mode="video"
            label={language === 'es' ? 'Formato de Plataforma' : 'Platform Format'}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Dirección de Movimiento</label>
              {hasBrandContext && (
                <button
                  onClick={() => setUseBrandContext(!useBrandContext)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all",
                    useBrandContext 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-white/5 border-white/10 text-white/30"
                  )}
                >
                  <Brain className={cn("w-3 h-3", useBrandContext ? "animate-pulse" : "opacity-30")} />
                  {useBrandContext ? 'Cerebro Activo' : 'Sin Contexto'}
                </button>
              )}
            </div>
            <textarea
              value={animationState.prompt}
              onChange={(e) => setAnimationState(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="Ej: Haz que el cabello se mueva con el viento sutilmente y las nubes avancen..."
              className="w-full bg-transparent border-none p-0 text-xl font-light text-white placeholder-white/10 focus:ring-0 resize-none min-h-[80px]"
            />
            <div className="h-px bg-white/10" />
          </div>


          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-widest text-[#ff477b]/80 flex items-center gap-2">
               <Mic className="w-3 h-3" /> Locución AI (Opcional)
            </label>
                                <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10 space-y-6">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <Mic className="w-3 h-3 text-[#ff477b]" />
                     <span className="text-[11px] uppercase font-black tracking-widest text-white/60">Audio Sincronizado</span>
                  </div>
                  <select 
                    value={animationState.ttsVoice}
                    onChange={(e) => setAnimationState(prev => ({ ...prev, ttsVoice: e.target.value as any }))}
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-black uppercase tracking-widest text-[#ff477b] focus:ring-1 focus:ring-[#ff477b]"
                  >
                    {VOICE_LIST.map(v => (
                      <option key={v.id} value={v.id}>{v.name} {v.type === 'DYNAMIC' ? '(Premium)' : ''}</option>
                    ))}
                  </select>
               </div>

               {/* Cargar desde Fábrica de Audio */}
               {currentUser?.savedVoices && currentUser.savedVoices.length > 0 && (
                 <div className="flex items-center gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
                   <Library className="w-3 h-3 text-[#ff477b] flex-shrink-0" />
                   <select
                     defaultValue=""
                     onChange={e => {
                       const sv = currentUser.savedVoices!.find((v: any) => v.id === e.target.value);
                       if (sv) setAnimationState(prev => ({ ...prev, audioUrl: sv.url }));
                     }}
                     className="flex-1 bg-transparent text-[11px] font-black uppercase tracking-widest text-white outline-none cursor-pointer"
                   >
                     <option value="" disabled>Cargar desde Fábrica de Audio...</option>
                     {(Array.isArray(currentUser.savedVoices) ? currentUser.savedVoices : []).map((sv: any) => (
                       <option key={sv.id} value={sv.id}>{sv.name}</option>
                     ))}
                   </select>
                 </div>
               )}

               <textarea
                 value={animationState.ttsText}
                 onChange={(e) => setAnimationState(prev => ({ ...prev, ttsText: e.target.value }))}
                 placeholder="Ej: Descubre la nueva fragancia que despierta tus sentidos..."
                 className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-light text-white placeholder-white/20 focus:ring-1 focus:ring-[#ff477b] resize-none min-h-[60px]"
               />

               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[7px] font-black uppercase tracking-widest text-white/30">Idioma</label>
                    <select 
                      value={animationState.ttsLanguage}
                      onChange={(e) => setAnimationState(prev => ({ ...prev, ttsLanguage: e.target.value }))}
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-2 py-1 text-[11px] font-black uppercase text-white/60 focus:ring-1 focus:ring-[#ff477b] appearance-none"
                    >
                      <option value="Spanish">Español</option>
                      <option value="English">English</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] font-black uppercase tracking-widest text-white/30">Tono</label>
                    <select 
                      value={animationState.ttsTone}
                      onChange={(e) => setAnimationState(prev => ({ ...prev, ttsTone: e.target.value }))}
                      className="w-full bg-black/20 border border-white/5 rounded-lg px-2 py-1 text-[11px] font-black uppercase text-white/60 focus:ring-1 focus:ring-[#ff477b] appearance-none"
                    >
                      <option value="Professional">Profesional</option>
                      <option value="Friendly">Cercano</option>
                    </select>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <div className="flex justify-between">
                        <label className="text-[7px] font-black uppercase tracking-widest text-white/30">Pitch {animationState.ttsPitch}x</label>
                     </div>
                     <input type="range" min="0.5" max="1.5" step="0.1" value={animationState.ttsPitch} onChange={(e) => setAnimationState(prev => ({ ...prev, ttsPitch: parseFloat(e.target.value) }))} className="w-full accent-[#ff477b] h-0.5" />
                  </div>
                  <div className="space-y-2">
                     <div className="flex justify-between">
                        <label className="text-[7px] font-black uppercase tracking-widest text-white/30">Speed {animationState.ttsSpeed}x</label>
                     </div>
                     <input type="range" min="0.5" max="2.0" step="0.1" value={animationState.ttsSpeed} onChange={(e) => setAnimationState(prev => ({ ...prev, ttsSpeed: parseFloat(e.target.value) }))} className="w-full accent-[#ff477b] h-0.5" />
                  </div>
               </div>
            </div>
          </div>

          {/* Music section — Animation Lab */}
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
              <Music className="w-3 h-3" /> Música de Fondo (Opcional)
            </label>
            <div className="flex flex-col gap-3">
              <select
                value={animationState.musicSource}
                onChange={e => setAnimationState(p => ({ ...p, musicSource: e.target.value as any, selectedMusicUrl: '', uploadedMusicUrl: null }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest text-white focus:ring-2 focus:ring-[#ff477b]"
              >
                <option value="none">Sin Música</option>
                <option value="library">De Librería</option>
                <option value="upload">Subir Archivo (.mp3)</option>
              </select>
              {animationState.musicSource === 'library' && (
                <select
                  value={animationState.selectedMusicUrl}
                  onChange={e => setAnimationState(p => ({ ...p, selectedMusicUrl: e.target.value }))}
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white"
                >
                  <option value="">Seleccionar Pista...</option>
                  {(['Cinematic','Corporate','Energetic','Emotional','Ambient'] as const).map(cat => (
                    <optgroup key={cat} label={cat}>
                      {MUSIC_LIBRARY.filter(m => m.category === cat).map(m => (
                        <option key={m.id} value={m.url}>{m.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
              {animationState.musicSource === 'upload' && (
                <label className="w-full py-2 px-4 border border-dashed border-white/20 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all text-white/60">
                  <Volume2 className="w-4 h-4" />
                  <span className="text-[11px] font-black uppercase tracking-widest">{animationState.uploadedMusicUrl ? "Cambiado" : "Subir MP3"}</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setAnimationState(p => ({ ...p, uploadedMusicUrl: URL.createObjectURL(f) }));
                  }} />
                </label>
              )}
              {animationState.musicSource !== 'none' && (
                <div className="flex items-center gap-4 py-3 bg-white/5 rounded-2xl px-5">
                  <Volume2 className={`w-4 h-4 ${animationState.musicVolume > 0 ? 'text-[#ff477b]' : 'text-white/20'}`} />
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={animationState.musicVolume}
                    onChange={e => setAnimationState(p => ({ ...p, musicVolume: parseFloat(e.target.value) }))}
                    className="flex-1 accent-[#ff477b]"
                  />
                  <span className="text-[11px] font-black text-white/40 w-8">{Math.round(animationState.musicVolume * 100)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Veo 3.1 Advanced Cinematic Controls (Animation) */}
          <div className="pt-2 px-6 border-t border-white/5 space-y-4">
            <button
              onClick={() => setShowAdvancedCinema(!showAdvancedCinema)}
              className="flex items-center gap-2 group mb-4"
            >
              <div className="w-5 h-5 flex items-center justify-center rounded-lg bg-black/40 border border-white/5 group-hover:bg-[#47b2ff]/20 group-hover:border-[#47b2ff]/30 transition-all">
                <ChevronDown className={cn('w-3 h-3 transition-transform', showAdvancedCinema && 'rotate-180')} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">
                {language === 'es' ? 'Cinematografía Veo 3.0 / 3.1' : 'Veo 3.0 / 3.1 Cinematography'}
              </span>
            </button>

            <AnimatePresence>
              {showAdvancedCinema && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3 p-4 rounded-2xl bg-black/20 border border-white/5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-black uppercase tracking-widest text-[#47b2ff]">Intensidad Movimiento</label>
                        <span className="text-[11px] font-black text-white/60">{(animationState.motionIntensity * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.1"
                        value={animationState.motionIntensity}
                        onChange={(e) => setAnimationState(prev => ({ ...prev, motionIntensity: parseFloat(e.target.value) }))}
                        className="w-full accent-[#47b2ff] h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="space-y-3 p-4 rounded-2xl bg-black/20 border border-white/5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-black uppercase tracking-widest text-[#47b2ff]">Velocidad Cámara</label>
                        <span className="text-[11px] font-black text-white/60">{(animationState.cameraMotionSpeed * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.1"
                        value={animationState.cameraMotionSpeed}
                        onChange={(e) => setAnimationState(prev => ({ ...prev, cameraMotionSpeed: parseFloat(e.target.value) }))}
                        className="w-full accent-[#47b2ff] h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="space-y-3 p-4 rounded-2xl bg-black/20 border border-white/5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-black uppercase tracking-widest text-[#47b2ff]">Fuerza Estilo</label>
                        <span className="text-[11px] font-black text-white/60">{(animationState.styleReferencePower * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range" min="0" max="1" step="0.1"
                        value={animationState.styleReferencePower}
                        onChange={(e) => setAnimationState(prev => ({ ...prev, styleReferencePower: parseFloat(e.target.value) }))}
                        className="w-full accent-[#47b2ff] h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Subtitles Toggle (Animation) */}
          <div className="p-5 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#47b2ff]/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-[#47b2ff]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-widest text-white/80">
                  {language === 'es' ? 'Subtítulos IA' : 'AI Subtitles'}
                </span>
                <span className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">
                  {language === 'es' ? 'Transcripción y Estilo' : 'Transcription & Styling'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setAnimationState(prev => ({ ...prev, autoSubtitles: !prev.autoSubtitles }))}
              className={cn(
                "relative w-10 h-5 rounded-full transition-all duration-300",
                animationState.autoSubtitles ? "bg-[#47b2ff]" : "bg-white/10"
              )}
            >
              <span className={cn(
                "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300",
                animationState.autoSubtitles ? "translate-x-5" : "translate-x-0"
              )} />
            </button>
          </div>

          <button
            onClick={handleAnimate}
            disabled={animationState.isAnimating || !animationState.sourceImage}
            className="w-full group relative overflow-hidden bg-[#ff477b] text-white py-10 rounded-3xl font-black uppercase tracking-widest transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            <div className="relative flex items-center justify-center gap-4">
              {animationState.isAnimating ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <Play className="w-6 h-6" />
              )}
              <span>
                {animationState.isAnimating
                  ? language === 'es' ? "Inyectando Vida con Veo 3.1..." : "Injecting Life with Veo 3.1..."
                  : language === 'es' ? "Animar Imagen con Veo 3.1" : "Animate Image with Veo 3.1"}
              </span>
            </div>
          </button>

          {/* Visual Consistency Uploaders (Style & Subject) */}
          {!animationState.isAnimating && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <label className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-white/10 transition-all cursor-pointer hover:bg-white/5">
                <Layers className="w-4 h-4 mb-2 text-white/30" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Style Ref</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReferenceUpload(e, 'style')} />
              </label>
              <label className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-white/10 transition-all cursor-pointer hover:bg-white/5">
                <CheckCircle2 className="w-4 h-4 mb-2 text-white/30" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Subject Ref</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReferenceUpload(e, 'subject')} />
              </label>
            </div>
          )}

          <TechnicalBriefButton prompt={animationState.expandedPrompt} />

          {animationState.pollingProgress && (
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-[#ff477b] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
                  {language === 'es' ? "Renderizando con Veo 3.0 / 3.1..." : "Rendering with Veo 3.0 / 3.1..."} ({animationState.pollingProgress.attempt}/{animationState.pollingProgress.max})
                </p>
                <p className="text-[11px] text-white/30 mt-0.5">
                  ~{Math.max(0, (animationState.pollingProgress.max - animationState.pollingProgress.attempt) * 6)}s {language === 'es' ? 'restantes' : 'remaining'}
                </p>
              </div>
            </div>
          )}

          {animationState.error && (
            <ErrorDisplay error={animationState.error} isAdmin={isAdmin} />
          )}
        </div>

        <div className="space-y-8">
          <div className={cn(
            "w-full rounded-[3.5rem] bg-black/60 border border-white/10 overflow-hidden relative shadow-2xl transition-all duration-700",
            animationState.format === '16:9' ? "aspect-video" : "aspect-[9/16] max-h-[700px]"
          )}>
            {animationState.videoUrl ? (
              <>
                <video
                  ref={animVideoRef}
                  src={proxiedAssetUrl(animationState.videoUrl)}
                  autoPlay loop controls
                  className="w-full h-full object-cover"
                  onTimeUpdate={(e) => setAnimationLabTime(e.currentTarget.currentTime * 1000)}
                  onPlay={() => {
                    const t = animVideoRef.current?.currentTime ?? 0;
                    const offset = animationState.voiceoverOffset;
                    if (animMusicRef.current) {
                      animMusicRef.current.volume = animationState.musicVolume;
                      animMusicRef.current.currentTime = t;
                      animMusicRef.current.play().catch(() => {});
                    }
                    if (animVoiceoverRef.current) {
                      if (offset > 0) {
                        setTimeout(() => animVoiceoverRef.current?.play().catch(() => {}), offset * 1000);
                      } else {
                        animVoiceoverRef.current.currentTime = t;
                        animVoiceoverRef.current.play().catch(() => {});
                      }
                    }
                  }}
                  onPause={() => {
                    animVoiceoverRef.current?.pause();
                    animMusicRef.current?.pause();
                  }}
                  onSeeked={() => {
                    const t = animVideoRef.current?.currentTime ?? 0;
                    if (animVoiceoverRef.current) animVoiceoverRef.current.currentTime = Math.max(0, t - animationState.voiceoverOffset);
                    if (animMusicRef.current) animMusicRef.current.currentTime = t;
                  }}
                />
                {/* Subtitle Overlay */}
                <CaptionOverlay 
                  captions={animationState.captions}
                  currentTimeMs={animationLabTime}
                  isVisible={animationState.autoSubtitles}
                />

                {isGeneratingCaptions && (
                   <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in transition-all">
                      <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center relative bg-black/20 mb-4">
                         <MessageSquare className="w-5 h-5 animate-pulse text-[#47b2ff]" />
                         <div className="absolute inset-0 rounded-full border-t-2 border-[#47b2ff] animate-spin" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                         {language === 'es' ? 'Modelando Subtítulos...' : 'Modeling Subtitles...'}
                      </span>
                   </div>
                )}

                {animationState.audioUrl && (
                  <audio ref={animVoiceoverRef} src={proxiedAssetUrl(animationState.audioUrl)} preload="auto" style={{ display: 'none' }} />
                )}
                {animationState.musicSource !== 'none' && (animationState.selectedMusicUrl || animationState.uploadedMusicUrl) && (
                  <audio ref={animMusicRef} src={proxiedAssetUrl(animationState.selectedMusicUrl || animationState.uploadedMusicUrl!)} loop preload="auto" style={{ display: 'none' }} />
                )}
              </>
            ) : animationState.sourceImage ? (
              <div className="w-full h-full relative group">
                <img 
                  src={animationState.sourceImage} 
                  className="w-full h-full object-cover opacity-60 grayscale-[0.3] brightness-75 transition-all duration-700 group-hover:opacity-80 group-hover:grayscale-0 group-hover:brightness-100" 
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/20 backdrop-blur-[2px]">
                   <div className="p-6 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl animate-pulse">
                      <Play className="w-12 h-12 text-[#ff477b]" />
                   </div>
                   <span className="text-[11px] font-black uppercase tracking-[0.5em] text-white/40">Listo para Animar</span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-6 opacity-10">
                <FileVideo className="w-32 h-32" />
                <span className="text-[11px] font-black uppercase tracking-[0.5em]">Realism Lab Output</span>
              </div>
            )}

            {animationState.isAnimating && (
              <div className="absolute inset-0 bg-white/5 backdrop-blur-2xl flex items-center justify-center z-10">
                 <div className="scale-150 border-4 border-[#ff477b] border-t-transparent rounded-full w-12 h-12 animate-spin" />
              </div>
            )}
          </div>

          {/* Audio Mix Panel — visible when there's a video + voiceover */}
          {animationState.videoUrl && animationState.audioUrl && (
            <div className="p-5 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                  <Music className="w-3 h-3 text-[#ff477b]" /> Mezcla de Audio
                </label>
                <a href={animationState.audioUrl} download="locution.wav" className="text-white/30 hover:text-white transition-colors" title="Descargar locución">
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
              {/* Voiceover offset */}
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#ff477b] shrink-0" />
                <span className="text-[11px] font-black uppercase text-white/40 w-28 shrink-0">Locución +{animationState.voiceoverOffset}s</span>
                <input
                  type="range" min="0" max="10" step="0.5"
                  value={animationState.voiceoverOffset}
                  onChange={e => setAnimationState(p => ({ ...p, voiceoverOffset: parseFloat(e.target.value) }))}
                  className="flex-1 accent-[#ff477b] h-0.5"
                />
              </div>
              {/* Music volume — only if music selected */}
              {animationState.musicSource !== 'none' && (animationState.selectedMusicUrl || animationState.uploadedMusicUrl) && (
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-[11px] font-black uppercase text-white/40 w-28 shrink-0">Música {Math.round(animationState.musicVolume * 100)}%</span>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={animationState.musicVolume}
                    onChange={e => {
                      const vol = parseFloat(e.target.value);
                      setAnimationState(p => ({ ...p, musicVolume: vol }));
                      if (animMusicRef.current) animMusicRef.current.volume = vol;
                    }}
                    className="flex-1 accent-purple-400 h-0.5"
                  />
                </div>
              )}
              <p className="text-[11px] text-white/20 font-medium">
                {canMixInBrowser()
                  ? (language === 'es' ? 'Preview sincronizado · "Mezclar y Descargar" incrusta el audio en el video' : 'Synced preview · "Mix & Download" embeds audio into the video')
                  : (language === 'es' ? 'Preview sincronizado · Descarga video y locución por separado (Chrome recomendado)' : 'Synced preview · Download separately (Chrome recommended for mix)')}
              </p>
            </div>
          )}

          {/* Download CTA — Animation Lab */}
          {animationState.videoUrl && (
            <div className="mt-4 flex flex-col gap-2">
              {/* Mix & Download — only if audio present and browser supports it */}
              {(animationState.audioUrl || (animationState.musicSource !== 'none' && (animationState.selectedMusicUrl || animationState.uploadedMusicUrl))) && canMixInBrowser() && (
                <button
                  disabled={animationState.isMixing}
                  onClick={async () => {
                    setAnimationState(p => ({ ...p, isMixing: true, mixProgress: 0 }));
                    try {
                      await mixAndDownload({
                        videoUrl: animationState.videoUrl!,
                        voiceoverUrl: animationState.audioUrl,
                        musicUrl: animationState.musicSource !== 'none' ? (animationState.selectedMusicUrl || animationState.uploadedMusicUrl) : null,
                        musicVolume: animationState.musicVolume,
                        filename: `animacion_mix_${animationState.format.toLowerCase()}_${Date.now()}.webm`,
                        onProgress: (pct) => setAnimationState(p => ({ ...p, mixProgress: pct })),
                      });
                    } catch (e: any) {
                      alert(e.message || 'Error al mezclar audio');
                    } finally {
                      setAnimationState(p => ({ ...p, isMixing: false, mixProgress: 0 }));
                    }
                  }}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#ff477b] to-purple-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {animationState.isMixing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{language === 'es' ? `Mezclando... ${Math.round(animationState.mixProgress)}%` : `Mixing... ${Math.round(animationState.mixProgress)}%`}</span>
                    </>
                  ) : (
                    <>
                      <Music className="w-5 h-5" />
                      {language === 'es' ? 'Mezclar y Descargar' : 'Mix & Download'}
                    </>
                  )}
                </button>
              )}
              {/* Plain video download */}
              <button
                onClick={async () => {
                  const url = animationState.videoUrl!;
                  const filename = `animacion_veo_${animationState.format.toLowerCase()}_${Date.now()}.mp4`;
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  document.body.appendChild(a);
                  a.href = url;
                  a.download = filename;
                  a.target = '_blank';
                  a.rel = 'noopener';
                  a.click();
                  document.body.removeChild(a);
                }}
                className="w-full flex items-center justify-center gap-3 bg-white text-[#0a0f1e] py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
              >
                <Download className="w-5 h-5" />
                {language === 'es' ? 'Descargar Solo Video' : 'Download Animation Only'}
              </button>
              {/* Auto-captions (Whisper) — available when audio or video is present */}
              {(animationState.audioUrl || animationState.videoUrl) && (
                <button
                  disabled={isGeneratingCaptions}
                  onClick={() => handleGenerateCaptions((animationState.audioUrl || animationState.videoUrl)!)}
                  className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs border border-white/10 transition-all disabled:opacity-50"
                >
                  {isGeneratingCaptions ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
                      <span className="tabular-nums">{captionProgress ? `${captionProgress.stage} ${captionProgress.pct}%` : '...'}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[#ff477b]">CC</span>
                      <span>{animationState.captions ? (language === 'es' ? `Subtítulos listos (${animationState.captions.length})` : `Captions ready (${animationState.captions.length})`) : (language === 'es' ? 'Generar Subtítulos' : 'Generate Captions')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AnimateLabView;
