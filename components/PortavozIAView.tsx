import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserRound,
  Mic,
  Video,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Play,
  Download,
  Clock,
  ExternalLink,
  Brain,
  Upload,
  X
} from 'lucide-react';
import { Language, AuthUser, HistoryItem } from '../types';
import { TRANSLATIONS } from '../constants';
import { Teleprompter } from './ui/Teleprompter';
import { portavozService, blobToBase64 } from '../services/ai/portavozService';
import { generateAdVideo } from '../services/ai/mediaGenerationService';
import Toast, { ToastData } from './Toast';
import { ImageIcon, Plus, Zap, Loader2 } from 'lucide-react';
import { mixAndDownloadMP4, canMixInBrowser } from '../utils/videoMixer';
import { proxiedAssetUrl } from '../utils/apiConfig';
import { useTutorial } from '../hooks/useTutorial';
import TutorialBubble, { TutorialTrigger } from './ui/TutorialBubble';

interface AvatarAsset {
  id: string;
  url: string;
  type: 'video';
  name: string;
}

interface PortavozIAViewProps {
  language: Language;
  currentUser: AuthUser | null;
  brandIdentity?: any;
  brandContext?: any;
  brandPrefix?: string;
  onSaveHistory?: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'userId'>) => void;
  onAssetSaved?: (asset: AvatarAsset) => void;
  onBack?: () => void;
  restoredAudit?: any;
}

export const PortavozIAView: React.FC<PortavozIAViewProps> = ({
  language,
  currentUser,
  brandIdentity,
  brandContext,
  brandPrefix,
  onSaveHistory,
  onAssetSaved,
  onBack,
  restoredAudit
}) => {
  const t = TRANSLATIONS[language];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [voiceSampleBase64, setVoiceSampleBase64] = useState<string | null>(null);
  const [voiceSampleReady, setVoiceSampleReady] = useState(false);
  const [hasSavedProfile, setHasSavedProfile] = useState<boolean>(false);

  // Initialize Tutorial
  const { steps, currentStep, isVisible, isDismissed, next, prev, goTo, dismiss, restart } = useTutorial('portavoz', language);

  // Load saved voice profile on mount
  useEffect(() => {
    const saved = localStorage.getItem('insitu_voice_profile');
    if (saved) {
      setVoiceSampleBase64(saved);
      setVoiceSampleReady(true);
      setHasSavedProfile(true);
    }
  }, []);

  // Restore history logic
  useEffect(() => {
    if (restoredAudit && restoredAudit.type === 'avatar') {
      const { query, result } = restoredAudit;
      if (query?.script) setFinalScript(query.script);
      if (query?.visualType) setSelectedVisual(query.visualType as any);
      if (result?.videoUrl) setResultVideoUrl(result.videoUrl);
      setStep(3); // Jump to final step to see the result
    }
  }, [restoredAudit]);

  const [finalScript, setFinalScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [selectedVisual, setSelectedVisual] = useState<'ai' | 'stock' | 'custom'>('stock');
  const [selectedStockActor, setSelectedStockActor] = useState<number>(1);
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);
  const [avatarStage, setAvatarStage] = useState('');
  const [customAvatarFile, setCustomAvatarFile] = useState<File | null>(null);
  const [customAvatarPreview, setCustomAvatarPreview] = useState<string | null>(null);
  const [readingWpm, setReadingWpm] = useState<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isSavedToLab, setIsSavedToLab] = useState(false);
  const [savedAudioUrl, setSavedAudioUrl] = useState<string | null>(null);

  const STOCK_ACTORS = [
    { id: 1, name: 'The Mentor (Alex)', url: 'https://storage.googleapis.com/insitu-ai-testing/stock-avatar-1.mp4', thumb: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=400&h=400&fit=crop' },
    { id: 2, name: 'The Visionary (Elena)', url: 'https://storage.googleapis.com/insitu-ai-testing/stock-avatar-2.mp4', thumb: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop' },
    { id: 3, name: 'The Catalyst (Marcus)', url: 'https://storage.googleapis.com/insitu-ai-testing/stock-avatar-3.mp4', thumb: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop' },
    { id: 4, name: 'The Analyst (Sofia)', url: 'https://storage.googleapis.com/insitu-ai-testing/stock-avatar-4.mp4', thumb: 'https://images.unsplash.com/photo-1594744803329-e58b31de3957?w=400&h=400&fit=crop' },
    { id: 5, name: 'The Professor (Strategy)', url: 'https://storage.googleapis.com/insitu-ai-testing/stock-avatar-1.mp4', thumb: 'https://images.unsplash.com/photo-1542103749-8ef59b94f47e?w=400&h=400&fit=crop' },
    { id: 6, name: 'The Heist (Berlin Style)', url: 'https://storage.googleapis.com/insitu-ai-testing/stock-avatar-2.mp4', thumb: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop' },
    { id: 7, name: 'The Regency (Diamond)', url: 'https://storage.googleapis.com/insitu-ai-testing/stock-avatar-3.mp4', thumb: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop' },
    { id: 8, name: 'The Tech Billionaire', url: 'https://storage.googleapis.com/insitu-ai-testing/stock-avatar-4.mp4', thumb: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop' },
    { id: 9, name: 'The Witcher (Geralt)', url: 'https://storage.googleapis.com/insitu-ai-testing/stock-avatar-1.mp4', thumb: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop' },
    { id: 10, name: 'The Cyberpunk (V)', url: 'https://storage.googleapis.com/insitu-ai-testing/stock-avatar-2.mp4', thumb: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=400&h=400&fit=crop' },
    { id: 11, name: 'The Royal (Crown)', url: 'https://storage.googleapis.com/insitu-ai-testing/stock-avatar-3.mp4', thumb: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&h=400&fit=crop' },
    { id: 12, name: 'The Detective (Lupin)', url: 'https://storage.googleapis.com/insitu-ai-testing/stock-avatar-4.mp4', thumb: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop' },
  ];

  const handleMixResult = async (videoUrl: string, audioUrl: string) => {
    if (!canMixInBrowser()) {
       setToast({
         title: 'Navegador no compatible',
         message: language === 'es' ? 'Usa Chrome o Edge para mezclar el avatar.' : 'Use Chrome or Edge to mix the avatar.',
         type: 'error'
       });
       return;
    }

    try {
      setGenerationProgress(80);
      await mixAndDownloadMP4({
        videoUrl,
        voiceoverUrl: audioUrl,
        filename: `mi_avatar_${Date.now()}.mp4`,
        onProgress: (p) => setGenerationProgress(80 + (p * 0.2))
      });
      setToast({
        title: language === 'es' ? 'Avatar Listo' : 'Avatar Ready',
        message: language === 'es' ? 'El video se ha mezclado y descargado.' : 'The video has been mixed and downloaded.',
        type: 'success'
      });
      setGenerationProgress(100);
    } catch (err: any) {
      setToast({ title: 'Error de Mezcla', message: err.message, type: 'error' });
    }
  };

  // Security gate
  const isSuperAdmin = currentUser?.role === 'superAdmin' ||
                       currentUser?.email === 'admin@insitu.ai' ||
                       currentUser?.email === 'sanchezfj@me.com' ||
                       currentUser?.email === 'sociopuerta@gmail.com' ||
                       currentUser?.email === 'contacto@fjsanchez.com' ||
                       currentUser?.email === 'admin@insitu.company';

  const isLocalTester = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  if (!isSuperAdmin && !isLocalTester) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <ShieldCheck className="w-16 h-16 text-rose-500/50" />
        <h2 className="text-2xl font-black text-white">Módulo Restringido</h2>
        <p className="text-white/40 max-w-md">Mi Avatar está en fase de despliegue exclusivo para SuperAdmin.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-8 bg-black/40 p-8 md:p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-3xl shadow-2xl relative overflow-hidden"
    >
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
      
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#ff477b]/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header section */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] block">
              {t.creative_lab} / Mi Avatar
            </span>
            <TutorialTrigger isDismissed={isDismissed} isVisible={isVisible} language={language} onShow={restart} onRestart={restart} />
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
            High-Fidelity <br /> <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-rose-500 bg-clip-text text-transparent">Mi Avatar</span>.
          </h1>
          <p className="mt-6 text-lg text-white/40 max-w-xl font-medium leading-relaxed">
            {language === 'es'
              ? 'Clonación de voz y generación de avatares realistas utilizando inteligencia artificial avanzada.'
              : 'Voice cloning and realistic avatar generation using advanced artificial intelligence.'}
          </p>
        </div>

        {/* Steps Breadcrumb */}
        <div className="flex items-center gap-4 p-2 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all ${
                step === s ? 'bg-[#ff477b] text-white' : 'text-white/30'
              }`}
            >
              <span className="text-xs font-black">{s}</span>
              {step === s && (
                <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                  {s === 1 ? (language === 'es' ? 'Voz' : 'Voice') :
                   s === 2 ? (language === 'es' ? 'Visual' : 'Visual') :
                   (language === 'es' ? 'Script' : 'Script')}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Wizard Area */}
      <div className="relative z-10 mt-8 min-h-[500px] border border-white/10 rounded-[2.5rem] bg-white/5 overflow-hidden flex flex-col items-center justify-start p-12">
        {/* ─── STEP 1: Voice Recording ─── */}
        {step === 1 && (
          <div id="port-step-1" className={`w-full max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 transition-all ${isVisible && currentStep === 0 ? 'ring-2 ring-[#ff477b] ring-offset-4 ring-offset-black rounded-[2rem] p-2 bg-white/5' : ''}`}>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center shrink-0 ring-1 ring-purple-500/30">
                <Mic className="w-10 h-10 text-purple-400" />
              </div>
              <div className="space-y-2 text-center md:text-left">
                <h2 className="text-3xl font-black text-white">Identidad Vocal</h2>
                <p className="text-white/40 max-w-xl">
                  {language === 'es'
                    ? 'Lee el guion de consentimiento para capturar tu voz. La IA la replicará al generar el audio del avatar.'
                    : 'Read the consent script to capture your voice. The AI will replicate it when generating the avatar audio.'}
                </p>
              </div>

                {hasSavedProfile && step === 1 && (
                  <div className="md:ml-auto flex flex-col items-end gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#ff477b] bg-[#ff477b]/10 px-3 py-1 rounded-full">
                      {language === 'es' ? 'Perfil Guardado Activo' : 'Saved Profile Active'}
                    </span>
                  </div>
                )}
              </div>

              {voiceSampleReady && (
                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setStep(2)}
                  className="w-full mt-4 md:mt-0 px-10 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-3"
                >
                  {language === 'es' ? 'Continuar con Voz Actual' : 'Continue with Current Voice'} <ChevronRight className="w-4 h-4" />
                </motion.button>
              )}

              <div className="relative pt-8 border-t border-white/10">
                <Teleprompter
                  language={language}
                  userName={currentUser?.username || brandIdentity?.brandName}
                  onRecordingComplete={async (blob, _script, wpm) => {
                    try {
                      const base64 = await blobToBase64(blob);
                      setVoiceSampleBase64(base64);
                      setVoiceSampleReady(true);
                      setHasSavedProfile(true);
                      setReadingWpm(wpm);
                      localStorage.setItem('insitu_voice_profile', base64);
                      setToast({
                        title: language === 'es' ? 'Voz Capturada' : 'Voice Captured',
                        message: language === 'es' ? 'Muestra lista para replicación.' : 'Sample ready for replication.',
                        type: 'success'
                      });
                    } catch (err: any) {
                      setToast({ title: 'Error', message: err.message, type: 'error' });
                    }
                  }}
                />
              </div>
          </div>
        )}

        {/* ─── STEP 2: Visual Base ─── */}
        {step === 2 && (
          <div id="port-step-2" className={`w-full max-w-5xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 transition-all ${isVisible && currentStep === 1 ? 'ring-2 ring-[#ff477b] ring-offset-4 ring-offset-black rounded-[2rem] p-2 bg-white/5' : ''}`}>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-24 h-24 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto md:mx-0 ring-1 ring-pink-500/30">
                <UserRound className="w-10 h-10 text-pink-400" />
              </div>
              <div className="space-y-2 text-center md:text-left">
                <h2 className="text-3xl font-black text-white">Base Visual</h2>
                <p className="text-white/40 max-w-xl">
                  {language === 'es'
                    ? 'Define el avatar que recibirá la voz. Usaremos Google Veo 3.1 para generar presencia visual.'
                    : 'Define the avatar that will receive the voice. We will use Google Veo 3.1 for visual presence.'}
                </p>
              </div>

              <div className="md:ml-auto flex gap-4">
                <button
                  onClick={() => onBack ? onBack() : setStep(1)}
                  className="px-6 py-4 bg-white/5 text-white/40 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:text-white transition-all"
                >
                  {language === 'es' ? 'Volver' : 'Back'}
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={isGeneratingAvatar}
                  className={`px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-3 ${
                    isGeneratingAvatar
                      ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/10'
                      : 'bg-white text-black hover:scale-105 active:scale-95 shadow-xl shadow-white/10'
                  }`}
                >
                  {language === 'es' ? 'Siguiente Paso' : 'Next Step'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Option A: AI Generation */}
              <div
                onClick={() => setSelectedVisual('ai')}
                className={`group relative p-8 bg-white/5 border rounded-[2.5rem] transition-all cursor-pointer ${
                  selectedVisual === 'ai' ? 'border-[#ff477b] bg-white/10 ring-1 ring-[#ff477b]/50' : 'border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="absolute top-6 right-6">
                  <Sparkles className={`w-6 h-6 ${selectedVisual === 'ai' ? 'text-[#ff477b]' : 'text-purple-400'}`} />
                </div>
                <div className="space-y-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${selectedVisual === 'ai' ? 'bg-[#ff477b]/20' : 'bg-purple-500/20'}`}>
                    <Brain className={`w-8 h-8 ${selectedVisual === 'ai' ? 'text-[#ff477b]' : 'text-purple-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white mb-2">IA Generator</h3>
                    <p className="text-xs text-white/40 leading-relaxed uppercase font-bold tracking-wider">
                      {language === 'es' ? 'Genera un avatar publicitario con Veo 3.1.' : 'Generate an advertising avatar with Veo 3.1.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Option B: Stock Actors */}
              <div
                onClick={() => setSelectedVisual('stock')}
                className={`group relative p-8 bg-white/5 border rounded-[2.5rem] transition-all cursor-pointer ${
                  selectedVisual === 'stock' ? 'border-[#ff477b] bg-white/10 ring-1 ring-[#ff477b]/50' : 'border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="absolute top-6 right-6">
                  <Video className={`w-6 h-6 ${selectedVisual === 'stock' ? 'text-[#ff477b]' : 'text-pink-400'}`} />
                </div>
                <div className="space-y-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${selectedVisual === 'stock' ? 'bg-[#ff477b]/20' : 'bg-pink-500/20'}`}>
                    <UserRound className={`w-8 h-8 ${selectedVisual === 'stock' ? 'text-[#ff477b]' : 'text-pink-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white mb-2">Stock Actors</h3>
                    <p className="text-xs text-white/40 leading-relaxed uppercase font-bold tracking-wider">
                      {language === 'es' ? 'Usa avatares pre-entrenados.' : 'Use pre-trained avatars.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Option C: Custom Upload */}
              <div
                onClick={() => setSelectedVisual('custom')}
                className={`group relative p-8 bg-white/5 border rounded-[2.5rem] transition-all cursor-pointer ${
                  selectedVisual === 'custom' ? 'border-[#ff477b] bg-white/10 ring-1 ring-[#ff477b]/50' : 'border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="absolute top-6 right-6">
                  <Download className={`w-6 h-6 ${selectedVisual === 'custom' ? 'text-[#ff477b]' : 'text-emerald-400'}`} />
                </div>
                <div className="space-y-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${selectedVisual === 'custom' ? 'bg-[#ff477b]/20' : 'bg-emerald-500/20'}`}>
                    <ImageIcon className={`w-8 h-8 ${selectedVisual === 'custom' ? 'text-[#ff477b]' : 'text-emerald-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white mb-2">Custom Avatar</h3>
                    <p className="text-xs text-white/40 leading-relaxed uppercase font-bold tracking-wider">
                      {language === 'es' ? 'Sube tu propio video.' : 'Upload your own video.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedVisual === 'ai' && (
                <div className="p-10 bg-gradient-to-br from-purple-500/10 to-rose-500/10 border border-white/10 rounded-[2.5rem] space-y-8">
                  <textarea
                    value={avatarPrompt}
                    onChange={(e) => setAvatarPrompt(e.target.value)}
                    placeholder={language === 'es' ? "Describe al actor..." : "Describe the actor..."}
                    className="w-full bg-transparent border-none text-2xl font-light text-white focus:ring-0 min-h-[100px]"
                  />
                  <button
                    onClick={async () => {
                       setIsGeneratingAvatar(true);
                       try {
                         if (!avatarPrompt.trim()) {
                           throw new Error(language === 'es' ? 'Describe al actor primero.' : 'Describe the actor first.');
                         }
                         const videoUrl = await generateAdVideo(avatarPrompt, 'Portrait');
                         if (!videoUrl) {
                           throw new Error(language === 'es' ? 'Veo no generó video. Revisa tus credenciales GCP.' : 'Veo failed to generate video. Check your GCP credentials.');
                         }
                         setGeneratedAvatarUrl(videoUrl);
                         setToast({
                           title: language === 'es' ? 'Avatar Generado' : 'Avatar Generated',
                           message: language === 'es' ? 'Presencia visual lista para mezclar.' : 'Visual presence ready to mix.',
                           type: 'success'
                         });
                       } catch (err: any) {
                         setToast({
                           title: language === 'es' ? 'Error generando avatar' : 'Error generating avatar',
                           message: err.message,
                           type: 'error'
                         });
                       } finally {
                         setIsGeneratingAvatar(false);
                       }
                    }}
                    className="px-10 py-5 bg-white text-black rounded-2xl font-black uppercase text-xs"
                  >
                    {isGeneratingAvatar ? 'Generando...' : 'Generar con Veo 3.1'}
                  </button>
                </div>
              )}
              {selectedVisual === 'stock' && (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                   {STOCK_ACTORS.map(actor => (
                     <button key={actor.id} onClick={() => setSelectedStockActor(actor.id)} className={`relative aspect-square rounded-2xl overflow-hidden ring-2 ${selectedStockActor === actor.id ? 'ring-[#ff477b]' : 'ring-white/10'}`}>
                        <img src={actor.thumb} className="w-full h-full object-cover" alt="" />
                     </button>
                   ))}
                 </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ─── STEP 3: Final Generation ─── */}
        {step === 3 && (
          <div className="w-full max-w-5xl space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div id="port-step-3" className={`space-y-6 transition-all ${isVisible && currentStep === 2 ? 'ring-2 ring-[#ff477b] ring-offset-4 ring-offset-black rounded-[2rem] p-2 bg-white/5' : ''}`}>
              <h2 className="text-3xl font-black text-white">Guion y Síntesis</h2>
              <textarea
                value={finalScript}
                onChange={(e) => setFinalScript(e.target.value)}
                placeholder="Escribe lo que el avatar debe decir..."
                className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-2xl font-light text-white focus:ring-0 min-h-[200px]"
              />
              <button
                disabled={isGenerating || !finalScript}
                onClick={async () => {
                   setIsGenerating(true);
                   setGenerationProgress(10);
                   try {
                     // Validate visual selection
                     if (selectedVisual === 'ai' && !generatedAvatarUrl) {
                       throw new Error(language === 'es' ? 'Debes generar el avatar con Veo primero.' : 'You must generate the avatar with Veo first.');
                     }
                     if (selectedVisual === 'custom' && !customAvatarPreview) {
                       throw new Error(language === 'es' ? 'Debes subir un video personalizado.' : 'You must upload a custom video.');
                     }

                     // 1. Generate Voice
                     setGenerationProgress(30);
                     const speechRes = await portavozService.generateSpeech(finalScript, voiceSampleBase64 || undefined, { uploadToGCS: true });

                     // 2. Determine Video
                     let videoUrl = "";
                     if (selectedVisual === 'ai' && generatedAvatarUrl) videoUrl = generatedAvatarUrl;
                     else if (selectedVisual === 'stock') videoUrl = STOCK_ACTORS.find(a => a.id === selectedStockActor)?.url || "";
                     else if (selectedVisual === 'custom' && customAvatarPreview) videoUrl = customAvatarPreview;

                     // 3. Mix
                     const finalAudioUrl = speechRes.audioUrl || (speechRes.audioBase64 ? `data:${speechRes.audioMimeType || 'audio/mpeg'};base64,${speechRes.audioBase64}` : "");

                     if (videoUrl && finalAudioUrl) {
                        setResultVideoUrl(videoUrl);
                        setSavedAudioUrl(finalAudioUrl);
                        setIsSavedToLab(false);
                        await handleMixResult(videoUrl, finalAudioUrl);
                        
                        // Save to history
                        if (onSaveHistory) {
                          onSaveHistory({
                            type: 'avatar',
                            query: { script: finalScript, visualType: selectedVisual },
                            result: { videoUrl, audioUrl: finalAudioUrl }
                          } as any);
                        }
                     } else {
                        throw new Error(language === 'es' ? "Falta audio o video para la mezcla." : "Missing audio or video for mixing.");
                     }
                   } catch (err: any) {
                     setToast({ title: 'Error', message: err.message, type: 'error' });
                   } finally {
                     setIsGenerating(false);
                     setGenerationProgress(0);
                   }
                }}
                className="w-full py-10 bg-white text-black rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl flex items-center justify-center gap-4"
              >
                {isGenerating ? `Procesando (${generationProgress}%)` : 'Generar Mi Avatar'}
              </button>
            </div>

            {resultVideoUrl && (
              <div id="port-step-4" className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 transition-all ${isVisible && currentStep === 3 ? 'ring-2 ring-[#ff477b] ring-offset-4 ring-offset-black rounded-[2rem] p-2 bg-white/5' : ''}`}>
                {/* Video Preview */}
                <div className="aspect-video rounded-[3.5rem] overflow-hidden border border-white/10 bg-black/40 relative group">
                  <video src={proxiedAssetUrl(resultVideoUrl)} controls className="w-full h-full object-contain" />
                  <div className="absolute top-5 left-5 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-[#ff477b] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff477b] animate-pulse" />
                    Mi Avatar · Listo
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Download button */}
                  <a
                    href={resultVideoUrl}
                    download={`mi_avatar_${Date.now()}.mp4`}
                    className="flex-1 py-5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 group"
                  >
                    <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    {language === 'es' ? 'Descargar Video' : 'Download Video'}
                  </a>

                  {/* Save to Flow Lab */}
                  <button
                    onClick={() => {
                      if (!onAssetSaved || isSavedToLab) return;
                      const asset: AvatarAsset = {
                        id: `avatar_${Date.now()}`,
                        url: resultVideoUrl,
                        type: 'video',
                        name: `Mi Avatar — ${new Date().toLocaleTimeString()}`
                      };
                      onAssetSaved(asset);
                      setIsSavedToLab(true);
                      setToast({
                        title: language === 'es' ? 'Guardado en Flow Lab' : 'Saved to Flow Lab',
                        message: language === 'es'
                          ? 'El avatar está disponible en el Ingredient Archive del Flow Lab.'
                          : 'The avatar is now available in the Flow Lab Ingredient Archive.',
                        type: 'success'
                      });
                    }}
                    disabled={!onAssetSaved || isSavedToLab}
                    className={`flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 ${
                      isSavedToLab
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 cursor-default'
                        : 'bg-gradient-to-r from-[#ff477b] to-purple-600 text-white hover:shadow-[0_0_30px_rgba(255,71,123,0.4)] hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {isSavedToLab ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {language === 'es' ? 'Guardado en Flow Lab' : 'Saved to Flow Lab'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {language === 'es' ? 'Guardar en Flow Lab' : 'Send to Flow Lab'}
                      </>
                    )}
                  </button>
                </div>

                {/* Retry */}
                <button
                  onClick={() => { setResultVideoUrl(null); setSavedAudioUrl(null); setIsSavedToLab(false); }}
                  className="w-full py-3 text-white/30 hover:text-white/60 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  {language === 'es' ? '↩ Generar de nuevo' : '↩ Generate again'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tutorial Overlay */}
      <TutorialBubble
        steps={steps}
        currentStep={currentStep}
        isVisible={isVisible}
        language={language}
        onNext={next}
        onPrev={prev}
        onGoTo={goTo}
        onDismiss={dismiss}
      />
    </motion.div>
  );
};

export default PortavozIAView;
