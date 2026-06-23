import React, { useState, useRef, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Image as ImageIcon,
  Mic,
  Sparkles,
  RefreshCw,
  Download,
  Edit3,
  Play,
  Pause,
  Volume2,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileVideo,
  Layers,
  ShoppingBag,
  Wand2,
  Trash2,
  Globe,
  Music,
  ShieldCheck,
  Heart,
  Save,
  Library,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Clock,
  Brain,
  Check,
  ExternalLink,
  Settings2,
  UserRound,
} from 'lucide-react';

import {
  generateAdVideo,
  generateLtxVideo,
  generateProImage,
  generateOrEditImage,
  animateImageWithVeo,
  generateFluxImage,
  generateAudio,
  VOICE_LIST,
  analyzeVoice,
  saveVoiceover,
  getVoiceoverList,
  masterVideo,
  masterProductImage,
  removeImageBackground,
  upscaleImage,
  restoreFace,
  outpaintImage,
  generateMultiStageVideo,
  generateSegmentVideo,
  extractLastFrame,
  generateWithReflection,
  generateMultiChannel,
  extractFromUrl,
  generateAudioScript,
} from '../services/ai/mediaGenerationService';
const MultiStageVideoComposer = React.lazy(() => import('./MultiStageVideoComposer').then(m => ({ default: m.MultiStageVideoComposer })));
import { PlatformFormatSelector } from './ui/PlatformFormatSelector';
import { AdsPlatformPills } from './ui/AdsPlatformPills';
import { MediaEditorView } from './LazyComponents';
import JSZip from 'jszip';
// generateCaptions is loaded lazily via dynamic import inside the handler function
import { TRANSLATIONS } from '../constants';
import { proxiedAssetUrl } from '../utils/apiConfig';
import { Language, AuthUser, AdVideoOptions, AdAnimationOptions, RetailProduct, RetailLayout, SavedVoice, MultiStageVideoState, VideoSegment, VideoTransition, ImageLayer, AudioLayer, SavedVoice as SavedVoiceType, SegmentEditProps, TextLayer, Caption } from '../types';
import { userService } from '../services/auth/userService';
const GenAdsView = React.lazy(() => import('./GenAdsView'));
const MassAdsView = React.lazy(() => import('./MassAdsView'));
const ResearchHub = React.lazy(() => import('./ResearchHub'));
const CompareCreativesView = React.lazy(() => import('./CompareCreativesView'));
const FlowWorkspace = React.lazy(() => import('./FlowWorkspace'));
const PortavozIAView = React.lazy(() => import('./PortavozIAView').then(m => ({ default: m.PortavozIAView })));
import { AudioLabView } from './AudioLabView';


// Simple cn helper to replace tailwind-merge dependency
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');



/**
 * CaptionOverlay — High-end animated subtitle renderer.
 * Synchronizes with the provided current time and displays active captions.
 */
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
            {/* Subtle progress line under caption */}
            <div className="absolute -bottom-1 left-4 right-4 h-[1px] bg-[#ff477b]/30 overflow-hidden rounded-full">
              <motion.div 
                className="h-full bg-[#ff477b]"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ 
                  duration: (activeCaption.endMs - activeCaption.startMs) / 1000, 
                  ease: "linear" 
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const VideoAuditView = React.lazy(() => import('./VideoAuditView'));
const ImageAuditView = React.lazy(() => import('./ImageAuditView'));
const AutomationRulesView = React.lazy(() => import('./AutomationRulesView'));
import { mixAndDownload, canMixInBrowser } from '../utils/videoMixer';

interface CreativeLabViewProps {
  currentUser: AuthUser | null;
  language: Language;
  onLogin: (user: AuthUser) => void;
  onCancel: () => void;
  onAudit?: (ad: { url: string; type: string }) => void;
  initialLab?: 'video' | 'image' | 'animate' | 'audio' | 'retail' | 'master' | 'ads' | 'mass-ads' | 'research' | 'compare' | 'image-audit' | 'video-audit' | 'flow' | 'portavoz';
  prefilledMedia?: { url: string; type: 'image' | 'video' } | null;
  restoredAudit?: any | null;
  history?: any[];
  onSaveHistory?: (item: any) => void;
}

 
const LoadingView = ({ message = 'Cargando motor de IA...' }: { message?: string }) => (
  <div className="w-full min-h-[500px] flex flex-col items-center justify-center p-12 space-y-8 bg-white/[0.02] border border-white/5 rounded-[3.5rem] backdrop-blur-3xl relative overflow-hidden group">
    {/* Animated Shimmer Background */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
    
    <div className="relative">
      <div className="w-24 h-24 rounded-full border-2 border-white/5 flex items-center justify-center relative">
        <RefreshCw className="w-8 h-8 animate-spin text-[#ff477b] opacity-80" />
        <div className="absolute inset-0 rounded-full border-t-2 border-[#ff477b] animate-spin-[2s_linear_infinite]" />
      </div>
      {/* Subtle pulse ring */}
      <div className="absolute inset-0 rounded-full bg-[#ff477b]/10 animate-ping opacity-20" />
    </div>
    
    <div className="text-center space-y-3 relative z-10">
      <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#ff477b] drop-shadow-[0_0_10px_rgba(255,71,123,0.3)]">
        INsitu AI Engine
      </h3>
      <p className="text-[13px] font-bold text-white/50 tracking-wider">
        {message}
      </p>
    </div>

    {/* Skeleton modules simulation */}
    <div className="w-full max-w-md space-y-4 opacity-10">
      <div className="flex gap-4">
        <div className="h-12 w-12 rounded-2xl bg-white" />
        <div className="flex-1 space-y-2 py-1">
          <div className="h-2 bg-white rounded-full w-3/4" />
          <div className="h-2 bg-white rounded-full w-1/2" />
        </div>
      </div>
      <div className="h-32 w-full rounded-2xl bg-white" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-10 rounded-xl bg-white" />
        <div className="h-10 rounded-xl bg-white" />
      </div>
    </div>
  </div>
);

 

const MUSIC_LIBRARY = [
  // Cinematic
  { id: 'm1',  name: 'Cinematic Epic',    category: 'Cinematic',  url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_73155fd4e6.mp3' },
  { id: 'm2',  name: 'Dramatic Score',    category: 'Cinematic',  url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3' },
  { id: 'm4',  name: 'Epic Trailer',      category: 'Cinematic',  url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_8aa6c0e58b.mp3' },
  // Corporate
  { id: 'm5',  name: 'Upbeat Tech',       category: 'Corporate',  url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d14f48b9f7.mp3' },
  { id: 'm6',  name: 'Minimal Corporate', category: 'Corporate',  url: 'https://cdn.pixabay.com/audio/2021/11/25/audio_9bc5396556.mp3' },
  { id: 'm7',  name: 'Innovation Drive',  category: 'Corporate',  url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3' },
  // Energetic
  { id: 'm8',  name: 'Summer Energetic',  category: 'Energetic',  url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_bb3e524177.mp3' },
  { id: 'm9',  name: 'Electric Rush',     category: 'Energetic',  url: 'https://cdn.pixabay.com/audio/2022/10/16/audio_7b6d3f8e9a.mp3' },
  { id: 'm10', name: 'Pulse Beat',        category: 'Energetic',  url: 'https://cdn.pixabay.com/audio/2021/10/25/audio_af7d4c3b9e.mp3' },
  // Emotional
  { id: 'm11', name: 'Inspiring Hope',    category: 'Emotional',  url: 'https://cdn.pixabay.com/audio/2022/08/23/audio_635fd1d53a.mp3' },
  { id: 'm12', name: 'Gentle Journey',    category: 'Emotional',  url: 'https://cdn.pixabay.com/audio/2022/02/07/audio_4e5e9f7a2e.mp3' },
  // Ambient
  { id: 'm13', name: 'Deep Focus',        category: 'Ambient',    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_cb6e5b0c2e.mp3' },
  { id: 'm14', name: 'Calm Flow',         category: 'Ambient',    url: 'https://cdn.pixabay.com/audio/2021/12/05/audio_8b78f5f7a1.mp3' },
  { id: 'm15', name: 'Space Drift',       category: 'Ambient',    url: 'https://cdn.pixabay.com/audio/2022/01/04/audio_d3a9b27fa1.mp3' },
  { id: 'm16', name: 'Lo-Fi Chill',       category: 'Ambient',    url: 'https://cdn.pixabay.com/audio/2022/05/17/audio_69c3f73a5a.mp3' },
];

const RETAIL_LAYOUTS: RetailLayout[] = [
  { id: 'l1', name: 'Premium Studio', image: 'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?q=80&w=1080&h=1080&auto=format&fit=crop' },
  { id: 'l2', name: 'Minimal Retail', image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1080&h=1080&auto=format&fit=crop' },
  { id: 'l3', name: 'E-commerce Luxury', image: 'https://images.unsplash.com/photo-1540959733332-e94e7bf71fef?q=80&w=1080&h=1080&auto=format&fit=crop' },
];

const ErrorDisplay: React.FC<{ error: string; isAdmin: boolean }> = ({ error, isAdmin }) => {
  let message = error;
  let debugContent = null;

  try {
    const trimmed = error.trim();
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      
      // Select the best message for the user header
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
  } catch (e) {
    // Falls back to raw string display
  }

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

export const CreativeLabView: React.FC<CreativeLabViewProps> = ({ 
  currentUser, 
  language, 
  onLogin, 
  onCancel, 
  onAudit,
  initialLab = 'video',
  prefilledMedia = null,
  restoredAudit = null,
  history = [],
  onSaveHistory
}) => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
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

  const [activeLab, setActiveLab] = useState<'video' | 'image' | 'animate' | 'audio' | 'retail' | 'master' | 'ads' | 'mass-ads' | 'research' | 'compare' | 'image-audit' | 'video-audit' | 'rules' | 'flow' | 'portavoz'>(initialLab || 'video');

  // Security check: Redirect non-superAdmins from restricted labs
  useEffect(() => {
    const restrictedLabs = ['animate', 'audio', 'retail', 'master'];
    if (activeLab && restrictedLabs.includes(activeLab) && !isSuperAdmin) {
      setActiveLab('image'); // Fallback to safe lab
    }
  }, [activeLab, isSuperAdmin]);

  // Sync activeLab when navigating from Header while CreativeLabView is already mounted
  useEffect(() => {
    if (initialLab) setActiveLab(initialLab);
  }, [initialLab]);

  // Update URL internally when lab changes
  useEffect(() => {
    if (activeLab) {
      const newPath = `/creative-lab/${activeLab}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState(null, '', newPath);
      }
    }
  }, [activeLab]);

  const [lastMediaMeta, setLastMediaMeta] = useState<{ type: string, meta: any } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const handleMeta = (e: Event) => {
      const customEvent = e as CustomEvent;
      setLastMediaMeta(customEvent.detail);
    };

    window.addEventListener('media-gen-meta', handleMeta);
    
    // Catch prompt expansion for Super Admin transparency
    const handleExpansion = (e: Event) => {
      const { expanded } = (e as CustomEvent).detail;
      if (activeLab === 'video') setVideoLabState(prev => ({ ...prev, expandedPrompt: expanded }));
      if (activeLab === 'image') setImageLabState(prev => ({ ...prev, expandedPrompt: expanded }));
      if (activeLab === 'animate') setAnimationState(prev => ({ ...prev, expandedPrompt: expanded }));
    };
    window.addEventListener('prompt-expanded', handleExpansion);

    return () => {
      window.removeEventListener('media-gen-meta', handleMeta);
      window.removeEventListener('prompt-expanded', handleExpansion);
    };
  }, [isAdmin, activeLab]);

  // Video Lab State
  const [videoLabState, setVideoLabState] = useState({
    prompt: '',
    sourceVideo: null as string | null,
    format: '9:16' as '9:16' | '16:9',
    videoUrl: null as string | null,
    audioUrl: null as string | null,
    isGenerating: false,
    musicVolume: 0.5,
    sceneAspects: '',
    musicSource: 'none' as 'none' | 'library' | 'upload',
    selectedMusicUrl: '',
    uploadedMusicUrl: null as string | null,
    ttsText: '',
    ttsVoice: 'Default' as string,
    ttsLanguage: 'Spanish',
    ttsDialect: 'Neutral',
    ttsTone: 'Professional',
    ttsEmotion: 'Neutral',
    ttsPitch: 1.0,
    ttsSpeed: 1.0,
    error: null as string | null,
    audioError: null as string | null,
    pollingProgress: null as { attempt: number; max: number } | null,
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
    videoModel: 'veo' as 'veo' | 'ltx',
  });

  // URL → Video Extract State
  const [urlExtractState, setUrlExtractState] = useState({
    url: '',
    isExtracting: false,
    extracted: null as null | {
      productName: string;
      category: string;
      keyBenefits: string[];
      targetAudience: string;
      tone: string;
      videoPrompt: string;
      ttsScript: string;
      suggestedVoice: string;
    },
    error: null as string | null,
    isOpen: false,
    applied: false,
  });

  // Video Mastering State
  const [masteringState, setMasteringState] = useState({
    sourceVideo: null as string | null,
    masterType: 'cinematic' as 'cinematic' | 'luxury' | 'extreme',
    enhancedVideo: null as string | null,
    isProcessing: false,
    error: null as string | null,
    notImplemented: false,
  });

  const [masterMode, setMasterMode] = useState<'video' | 'image'>('video');
  const [imageMasteringState, setImageMasteringState] = useState({
    sourceImage: null as string | null,
    processedImage: null as string | null,
    isProcessing: false,
    error: null as string | null,
    activeTool: 'upscale' as 'upscale' | 'remove_bg',
  });

  // Multi-Stage Video State
  const [multiStageState, setMultiStageState] = useState<MultiStageVideoState>({
    isActive: false,
    totalDuration: 18,
    segments: [],
    segmentOrder: [],
    currentStageIndex: 0,
    isGenerating: false,
    isComposing: false,
    composedVideoUrl: null,
    storyboardConfirmed: false,
    isEditing: false,
    transition: 'crossfade',
    transitionDurationSeconds: 0.5,
    error: null,
    pollingProgress: null,
    textLayers: [],
    imageLayers: [],
    audioLayers: [],
    segmentEditProps: {},
    aspectRatio: '9:16',
  });

  // Cross-lab Asset State: Mi Avatar → Flow Lab Ingredient Archive
  const [avatarAssets, setAvatarAssets] = useState<{id: string; url: string; type: 'video'; name: string}[]>([]);

  const handleAvatarAssetSaved = (asset: {id: string; url: string; type: 'video'; name: string}) => {
    setAvatarAssets(prev => {
      if (prev.find(a => a.id === asset.id)) return prev;
      return [asset, ...prev];
    });
  };

  // Image Lab State
  const [imageLabState, setImageLabState] = useState({
    sourceImage: null as string | null,
    prompt: '',
    aspectRatio: '9:16',
    resultImage: null as string | null,
    isProcessing: false,
    error: null as string | null,
    useReflection: false,
    useMultiChannel: false,
    multiChannelResults: null as { tiktok: string; instagram: string; youtube: string } | null,
    reflectionScore: null as number | null,
    styleImage: null as string | null,
    subjectImage: null as string | null,
    expandedPrompt: null as string | null,
    platform: 'Universal / Multiplatform' as string,
    imageModel: 'imagen' as 'imagen' | 'flux',
  });

  // Editor State
  const [editorConfig, setEditorConfig] = useState<{
    isOpen: boolean;
    mediaUrl: string;
    originalUrl?: string;
    mediaType: 'image' | 'video';
    improvements?: string[];
  }>({
    isOpen: false,
    mediaUrl: '',
    mediaType: 'image'
  });
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

  const [videoLabTime, setVideoLabTime] = useState(0);
  const [animationLabTime, setAnimationLabTime] = useState(0);

  // Auto-switch format from 1:1 to 16:9 for animation/video lab
  useEffect(() => {
    if (activeLab === 'animate' && (animationState.format as string) === '1:1') { // Fallback handling if somehow user had it saved
      setAnimationState(prev => ({ ...prev, format: '16:9' }));
    }
    if (activeLab === 'video' && (videoLabState.format as string) === '1:1') { // Fallback handling
      setVideoLabState(prev => ({ ...prev, format: '16:9' }));
    }
  }, [activeLab, animationState.format, videoLabState.format]);

  // Audio Lab State
  const [audioState, setAudioState] = useState({
    text: '',
    voice: 'Zephyr' as string,
    language: 'Spanish',
    dialect: 'Neutral',
    tone: 'Professional',
    emotion: 'Neutral',
    pitch: 1.0,
    speed: 1.0,
    audioUrl: null as string | null,
    isGenerating: false,
    sampleAudio: null as string | null,
    isCloning: false,
    isRecording: false,
    recordingTime: 0,
    error: null as string | null,
    isPreviewing: false,
    previewUrl: null as string | null,
    activeTab: 'generator' as 'generator' | 'library',
    voiceAnalysis: null as any | null,
    isAnalyzingVoice: false,
    voiceListCollapsed: false,
    aiPrompt: '',
    isGeneratingScript: false,
    aiScriptGenerated: false,
    recentClips: [] as any[],
    isLoadingHistory: false,
    isMixing: false,
    mixProgress: 0,
  });

  // Retail Lab State
  const [retailState, setRetailState] = useState({
    products: [] as RetailProduct[],
    selectedLayoutId: 'l1',
    customLayout: null as string | null,
    ecommercePlatform: 'generico' as 'generico' | 'amazon' | 'shopify' | 'instagram' | 'woocommerce',
    aiMasteringEnabled: true, // New: Enable AI-powered background removal and stylization
    isProcessing: false,
    processingProgress: null as string | null,
    error: null as string | null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio sync refs — Animation Lab
  const animVideoRef = useRef<HTMLVideoElement>(null);
  const animVoiceoverRef = useRef<HTMLAudioElement>(null);
  const animMusicRef = useRef<HTMLAudioElement>(null);

  // Audio sync refs — Video Lab
  const videoLabVideoRef = useRef<HTMLVideoElement>(null);
  const videoLabVoiceoverRef = useRef<HTMLAudioElement>(null);
  const videoLabMusicRef = useRef<HTMLAudioElement>(null);

  // Handlers
  // Brand context — injected into generation prompts for any user with a configured BrandProfile
  const brandProfile = currentUser?.brandProfile;
  const hasBrandContext =
    !!(brandProfile?.brandName && brandProfile?.industry && brandProfile?.toneOfVoice && brandProfile?.valueProposition);
  const [useBrandContext, setUseBrandContext] = useState(true);
  const [showAdvancedVoice, setShowAdvancedVoice] = useState(false);
  const [showAdvancedCinema, setShowAdvancedCinema] = useState(false);
  const [videoLabCaptions, setVideoLabCaptions] = useState<Caption[] | null>(null);
  const [animCaptions, setAnimCaptions] = useState<Caption[] | null>(null);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionProgress, setCaptionProgress] = useState<{ stage: string; pct: number } | null>(null);

  const convertToJpeg = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Added for external image URLs
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
    type: 'style' | 'subject',
    lab: 'video' | 'image' | 'animate'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 2MB Limit for non-SuperAdmins
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
      
      const setter = lab === 'video' ? setVideoLabState : lab === 'image' ? setImageLabState : setAnimationState;
      const key = type === 'style' ? 'styleImage' : 'subjectImage';
      
      setter((prev: any) => ({ ...prev, [key]: jpeg }));
    };
    reader.readAsDataURL(file);
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
              className="overflow-hidden"
            >
              <div className="mt-2 p-4 bg-black/40 border border-[#ff477b]/20 rounded-2xl text-[11px] font-mono text-[#ff477b]/80 leading-relaxed italic">
                <p className="mb-2 opacity-100 not-italic font-black flex items-center gap-2">
                  <Globe className="w-3 h-3" /> 
                  PROMPT EXPANDIDO (MANDATORY ENGLISH)
                </p>
                {prompt}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ── Audio Hub History ───────────────────────────────────────────────────────
  useEffect(() => {
    if (activeLab === 'audio' && audioState.activeTab === 'library' && currentUser?.id) {
      const loadHistory = async () => {
         setAudioState(prev => ({ ...prev, isLoadingHistory: true }));
         try {
           const history = await getVoiceoverList(currentUser.id);
           setAudioState(prev => ({ ...prev, recentClips: Array.isArray(history) ? history : [], isLoadingHistory: false }));
         } catch (e) {
           console.error("Failed to load voiceover history", e);
           setAudioState(prev => ({ ...prev, isLoadingHistory: false }));
         }
      };
      loadHistory();
    }
  }, [activeLab, audioState.activeTab, currentUser]);

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

  const handleVideoGenerate = async () => {
    if (!videoLabState.prompt && !videoLabState.ttsText) return;
    setVideoLabState(prev => ({ ...prev, isGenerating: true, error: null }));
    try {
      // If prompt is empty but ttsText is present, use ttsText as basis for prompt
      const finalPrompt = brandPrefix + (videoLabState.prompt || `A cinematic video matching this narration: ${videoLabState.ttsText}`);
      
      let url;
      if (videoLabState.videoModel === 'ltx') {
        url = await generateLtxVideo(
          finalPrompt,
          {
            format: videoLabState.format === '9:16' ? 'Social' : 'Landscape',
            duration: 6,
            platform: videoLabState.platform,
            objective: urlExtractState.extracted?.productName || 'General Ad',
            brandProfile: currentUser?.brandProfile,
          },
          (attempt, max) => setVideoLabState(prev => ({ ...prev, pollingProgress: { attempt, max } }))
        );
      } else {
        url = await generateAdVideo(
          finalPrompt,
          videoLabState.format,
          videoLabState.musicVolume,
          videoLabState.sceneAspects,
          (attempt, max) => setVideoLabState(prev => ({ ...prev, pollingProgress: { attempt, max } })),
          6, // default duration (Veo 3.0 / 3.1 supports [4, 6, 8])
          {
            motionIntensity: videoLabState.motionIntensity,
            cameraMotionSpeed: videoLabState.cameraMotionSpeed,
            styleReferencePower: videoLabState.styleReferencePower,
            styleReference: videoLabState.styleImage || undefined,
            subjectReference: videoLabState.subjectImage || undefined,
          }
        );
      }

      let audioUrl = null;
      let audioError: string | null = null;
      if (videoLabState.ttsText) {
        try {
          audioUrl = await generateAudio({
            text: videoLabState.ttsText,
            voice: videoLabState.ttsVoice,
            audioData: videoLabState.ttsVoice === 'Clonada' && audioState.sampleAudio ? audioState.sampleAudio : undefined,
            language: videoLabState.ttsLanguage,
            dialect: videoLabState.ttsDialect,
            tone: videoLabState.ttsTone,
            emotion: videoLabState.ttsEmotion,
            pitch: videoLabState.ttsPitch,
            speed: videoLabState.ttsSpeed
          });
        } catch (audioErr: any) {
          audioError = audioErr?.message || 'Error al generar la locución';
        }
      }

      let captions = null;
      if (videoLabState.autoSubtitles && (audioUrl || url)) {
        try {
          setVideoLabState(prev => ({ ...prev, isGeneratingCaptions: true }));
          captions = await generateCaptions(audioUrl, {
            videoUrl: audioUrl ? undefined : url,
          });
        } catch (capErr) {
          console.error('[Captions] Failed to generate subtitles:', capErr);
        }
      }

      setVideoLabState(prev => ({ 
        ...prev, 
        videoUrl: url, 
        audioUrl: audioUrl, 
        audioError, 
        captions,
        isGenerating: false, 
        isGeneratingCaptions: false,
        pollingProgress: null 
      }));
      console.log(language === 'es' ? '¡Video y locución generados!' : 'Video and voiceover generated!');
    } catch (err: any) {
      const errorPayload = err.serverStack 
        ? JSON.stringify({ message: err.message, stack: err.serverStack, type: err.taskType || 'VIDEO_GEN' })
        : err.message;
      setVideoLabState(prev => ({ ...prev, isGenerating: false, error: errorPayload, pollingProgress: null }));
      console.error(err.message);
    }
  };

  const handleMasterVideo = async () => {
    if (!masteringState.sourceVideo) return;
    setMasteringState(prev => ({ ...prev, isProcessing: true, error: null }));
    try {
      const result = await masterVideo(masteringState.sourceVideo, masteringState.masterType);
      if (result && result.url) {
        setMasteringState(prev => ({ 
          ...prev, 
          enhancedVideo: result.url, 
          isProcessing: false,
          // Store applied filters for UI reference if needed
        }));
        console.log(language === 'es' ? '¡Mastering completado!' : 'Mastering complete!');
      } else {
        throw new Error(language === 'es' ? 'No se pudo masterizar el video.' : 'Could not master the video.');
      }
    } catch (err: any) {
      if (err.message?.includes('NOT_IMPLEMENTED') || err.code === 'NOT_IMPLEMENTED' || err.status === 501) {
        setMasteringState(prev => ({ ...prev, isProcessing: false, error: null, notImplemented: true }));
      } else {
        const errorPayload = err.serverStack
          ? JSON.stringify({ message: err.message, stack: err.serverStack, type: 'VIDEO_MASTER' })
          : err.message;
        setMasteringState(prev => ({ ...prev, isProcessing: false, error: errorPayload }));
      }
      console.error(err.message);
    }
  };

  const handleMasterImage = async () => {
    if (!imageMasteringState.sourceImage) return;
    setImageMasteringState(prev => ({ ...prev, isProcessing: true, error: null }));
    try {
      let resultUrl = '';
      if (imageMasteringState.activeTool === 'upscale') {
        resultUrl = await upscaleImage(imageMasteringState.sourceImage);
      } else if (imageMasteringState.activeTool === 'remove_bg') {
        resultUrl = await removeImageBackground(imageMasteringState.sourceImage);
      } else if (imageMasteringState.activeTool === 'restore_face') {
        resultUrl = await restoreFace(imageMasteringState.sourceImage);
      } else if (imageMasteringState.activeTool === 'outpaint') {
        resultUrl = await outpaintImage(imageMasteringState.sourceImage, "highly detailed background extension, seamless, high quality");
      }
      
      setImageMasteringState(prev => ({ 
        ...prev, 
        processedImage: resultUrl, 
        isProcessing: false 
      }));
      console.log(language === 'es' ? '¡Imagen procesada!' : 'Image processed!');
    } catch (err: any) {
      setImageMasteringState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: err.message 
      }));
      console.error(err.message);
    }
  };

  const handleMultiStageGenerate = async () => {
    if (!videoLabState.prompt && !videoLabState.ttsText) return;
    const totalSegments = Math.round(multiStageState.totalDuration / 6);
    const initialSegments: VideoSegment[] = Array.from({ length: totalSegments }, (_, i) => ({
      id: `seg_${i}`,
      index: i,
      prompt: videoLabState.prompt || videoLabState.ttsText,
      status: 'pending' as const,
      operationName: null,
      videoUrl: null,
      thumbnailDataUrl: null,
      errorMessage: null,
      durationSeconds: 6,
      type: 'video',
    }));

    setMultiStageState(prev => ({
      ...prev,
      isGenerating: true,
      segments: initialSegments,
      segmentOrder: (initialSegments || []).map(s => s.id),
      currentStageIndex: 0,
      error: null,
      composedVideoUrl: null,
      storyboardConfirmed: false,
      isEditing: false,
    }));

    // Generate Audio in parallel if ttsText is provided
    let audioUrlPromise: Promise<string> | null = null;
    if (videoLabState.ttsText) {
      audioUrlPromise = generateAudio({
        text: videoLabState.ttsText,
        voice: videoLabState.ttsVoice,
        audioData: videoLabState.ttsVoice === 'Clonada' && audioState.sampleAudio ? audioState.sampleAudio : undefined,
        language: videoLabState.ttsLanguage,
        dialect: videoLabState.ttsDialect,
        tone: videoLabState.ttsTone,
        emotion: videoLabState.ttsEmotion,
        pitch: videoLabState.ttsPitch,
        speed: videoLabState.ttsSpeed
      }).catch(err => {
        console.error("Audio generation failed in multi-stage:", err);
        return ""; // Return empty string to handle error downstream
      });
    }

    const finalPrompt = brandPrefix + (videoLabState.prompt || `A cinematic video matching this narration: ${videoLabState.ttsText}`);
    const plannedSegments = initialSegments.map(seg => ({
      subPrompt: seg.prompt,
      durationSeconds: seg.durationSeconds,
    }));
    const gen = generateMultiStageVideo(
      { prompt: finalPrompt, format: videoLabState.format, plannedSegments },
      (segmentIndex, attempt, max) =>
        setMultiStageState(prev => ({ ...prev, pollingProgress: { attempt, max } }))
    );

    for await (const event of gen) {
      if (event.type === 'stage_started') {
        setMultiStageState(prev => ({
          ...prev,
          currentStageIndex: event.segmentIndex,
          segments: (prev.segments || []).map(s =>
            s.index === event.segmentIndex ? { ...s, status: 'generating' } : s
          ),
        }));
      } else if (event.type === 'stage_completed') {
        setMultiStageState(prev => ({
          ...prev,
          pollingProgress: null,
          segments: (prev.segments || []).map(s =>
            s.index === event.segmentIndex
              ? { ...s, status: 'completed', videoUrl: event.videoUrl!, thumbnailDataUrl: event.thumbnailDataUrl ?? null }
              : s
          ),
        }));
      } else if (event.type === 'stage_failed') {
        setMultiStageState(prev => ({
          ...prev,
          isGenerating: false,
          pollingProgress: null,
          segments: (prev.segments || []).map(s =>
            s.index === event.segmentIndex
              ? { ...s, status: 'error', errorMessage: event.errorMessage ?? 'Error desconocido' }
              : s
          ),
          error: `Segmento ${event.segmentIndex + 1} falló: ${event.errorMessage}`,
        }));
        return;
      } else if (event.type === 'all_done') {
        let finalAudioUrl = "";
        if (audioUrlPromise) {
          finalAudioUrl = await audioUrlPromise;
        }

        setMultiStageState(prev => ({ 
          ...prev, 
          isGenerating: false, 
          pollingProgress: null,
          audioLayers: finalAudioUrl ? [
            ...prev.audioLayers.filter(al => al.type !== 'voiceover'),
            {
              id: `vo_${Date.now()}`,
              type: 'voiceover',
              url: finalAudioUrl,
              volume: 1,
              startSecond: 0,
              fadeInSeconds: 0.5,
              fadeOutSeconds: 0.5
            }
          ] : prev.audioLayers
        }));

        if (finalAudioUrl) {
          setVideoLabState(prev => ({ ...prev, audioUrl: finalAudioUrl, audioError: null }));
        } else if (videoLabState.ttsText) {
          setVideoLabState(prev => ({ ...prev, audioError: language === 'es' ? 'No se pudo generar la locución' : 'Could not generate voiceover' }));
        }
      }
    }
  };

  const handleRetrySegment = async (
    index: number,
    options?: {
      cameraMotion?: 'PAN'|'TILT'|'ZOOM'|'DOLLY'|null;
      motionIntensity?: number;
      durationSeconds?: number;
      styleReference?: string | null;
      subjectReference?: string | null;
    }
  ) => {
    // Determine which prompt to use: the specific segment prompt or global fallback
    const targetSegment = (multiStageState.segments || []).find(s => s.index === index);
    const segmentPrompt = targetSegment?.prompt || videoLabState.prompt || `A cinematic video matching this narration: ${videoLabState.ttsText}`;
    const finalPrompt = brandPrefix + segmentPrompt;

    setMultiStageState(prev => ({
      ...prev,
      isGenerating: true,
      error: null,
      segments: (prev.segments || []).map(s =>
        s.index === index ? { ...s, status: 'generating', errorMessage: null } : s
      ),
    }));

    try {
      const prevSegment = (multiStageState.segments || [])[index - 1];
      let videoUrl: string | null;
      let thumbnailDataUrl: string | null = null;

      if (targetSegment?.type === 'image') {
        const imageUrl = await generateProImage(finalPrompt, videoLabState.format);
        videoUrl = imageUrl;
        thumbnailDataUrl = imageUrl; // For images, the thumbnail is the image itself
      } else {
        // Handle generation: first segment or missing seed uses standard Gen, others use Animate (Image-to-Video)
        if (index === 0 || !prevSegment?.thumbnailDataUrl) {
          videoUrl = await generateSegmentVideo(
            finalPrompt,
            videoLabState.format,
            index,
            options?.durationSeconds || targetSegment?.durationSeconds || 6,
            (attempt, max) => setMultiStageState(prev => ({ ...prev, pollingProgress: { attempt, max } })),
            {
              cameraMotion: options?.cameraMotion ?? undefined,
              motionIntensity: options?.motionIntensity ?? undefined,
              styleReference: options?.styleReference ?? undefined,
              subjectReference: options?.subjectReference ?? undefined,
            }
          );
        } else {
          const jpegBase64 = prevSegment.thumbnailDataUrl.startsWith('data:image/webp')
            ? (await convertToJpeg(prevSegment.thumbnailDataUrl)).split(',')[1]
            : prevSegment.thumbnailDataUrl.replace(/^data:image\/(jpeg|jpg|png|webp);base64,/, '');

          videoUrl = await animateImageWithVeo(
            jpegBase64,
            finalPrompt,
            videoLabState.format,
            (attempt, max, stage) => setMultiStageState(prev => ({ ...prev, pollingProgress: { attempt, max, stage } })),
            options?.durationSeconds || targetSegment?.durationSeconds || 6,
            {
              cameraMotion: options?.cameraMotion ?? undefined,
              motionIntensity: options?.motionIntensity ?? undefined,
              styleReference: options?.styleReference ?? undefined,
              subjectReference: options?.subjectReference ?? undefined,
            }
          );
        }

        if (!videoUrl) throw new Error('No video URL returned');

        try { 
          thumbnailDataUrl = await extractLastFrame(videoUrl); 
        } catch (frameErr) { 
          console.warn('Frame extraction failed for retried segment:', frameErr);
          /* non-fatal fallback: use a placeholder or null */ 
        }
      }

      setMultiStageState(prev => ({
        ...prev,
        isGenerating: false,
        pollingProgress: null,
        segments: (prev.segments || []).map(s =>
          s.index === index ? { ...s, status: 'completed', videoUrl, thumbnailDataUrl } : s
        ),
      }));
    } catch (err: any) {
      console.error('Segment regeneration error:', err);
      setMultiStageState(prev => ({
        ...prev,
        isGenerating: false,
        pollingProgress: null,
        segments: (prev.segments || []).map(s =>
          s.index === index ? { ...s, status: 'error', errorMessage: err.message } : s
        ),
        error: err.message,
      }));
    }
  };

  const handleAddFlowSegment = () => {
    const newIndex = multiStageState.segments.length;
    const newSegment: VideoSegment = {
      id: `seg_${Date.now()}`,
      index: newIndex,
      prompt: videoLabState.prompt || (language === 'es' ? 'Nueva escena cinematográfica' : 'New cinematic scene'),
      status: 'pending',
      operationName: null,
      videoUrl: null,
      thumbnailDataUrl: null,
      errorMessage: null,
      durationSeconds: 6,
      type: 'video'
    };

    setMultiStageState(prev => ({
      ...prev,
      segments: [...prev.segments, newSegment],
      segmentOrder: [...prev.segmentOrder, newSegment.id]
    }));

    setToast({
      message: language === 'es' ? 'Nueva escena añadida al final' : 'New scene added at the end',
      type: 'success'
    });
  };

  const handleAddTextLayer = () => {
    const id = `text_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newLayer: TextLayer = {
      id,
      text: language === 'es' ? 'Nuevo Texto' : 'New Text',
      startSecond: 0,
      durationSeconds: 6,
      enterAnimation: 'fadeIn',
      enterDurationSeconds: 0.8,
      exitAnimation: 'fadeOut',
      exitDurationSeconds: 0.6,
      position: 'center',
      fontSize: 0.07,
      color: '#ffffff',
      fontWeight: '900',
      fontFamily: 'sans-serif',
      shadow: true,
      background: false,
      backgroundColor: 'rgba(0,0,0,0.65)',
    };
    setMultiStageState(prev => ({ ...prev, textLayers: [...prev.textLayers, newLayer] }));
  };

  const handleUpdateTextLayer = (id: string, updates: Partial<TextLayer>) => {
    setMultiStageState(prev => ({
      ...prev,
      textLayers: (prev.textLayers || []).map(l => l.id === id ? { ...l, ...updates } : l)
    }));
  };

  const handleRemoveTextLayer = (id: string) => {
    setMultiStageState(prev => ({
      ...prev,
      textLayers: (prev.textLayers || []).filter(l => l.id !== id)
    }));
  };

  const handleCompose = async (filter: string = '') => {
    // Use segmentOrder to determine composition order
    const orderedSegments = (multiStageState.segmentOrder || [])
      .map(id => (multiStageState.segments || []).find(s => s.id === id))
      .filter((s): s is VideoSegment => !!s && s.status === 'completed' && !!s.videoUrl);

    if (orderedSegments.length === 0) return;
    const urls = (orderedSegments || []).map(s => s.videoUrl!);

    setMultiStageState(prev => ({ ...prev, isComposing: true, error: null }));

    try {
      const { composeVideos } = await import('../utils/videoComposer');
      const blob = await composeVideos({
        segments: urls,
        transition: multiStageState.transition,
        transitionDurationSeconds: multiStageState.transitionDurationSeconds,
        outputFrameRate: 30,
        textLayers: multiStageState.textLayers,
        imageLayers: multiStageState.imageLayers,
        audioLayers: multiStageState.audioLayers,
        segmentEditProps: multiStageState.segmentEditProps,
        segmentIds: (orderedSegments || []).map(s => s.id),
        globalFilter: filter,
      });
      const composedUrl = URL.createObjectURL(blob);
      setMultiStageState(prev => ({ ...prev, isComposing: false, composedVideoUrl: composedUrl }));
      setVideoLabState(prev => ({ ...prev, videoUrl: composedUrl }));
    } catch (err: any) {
      setMultiStageState(prev => ({ ...prev, isComposing: false, error: err.message }));
    }
  };

  // Image layer handlers
  const handleAddImageLayer = () => {
    const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newLayer: ImageLayer = {
      id,
      type: 'image',
      src: '',
      startSecond: 0,
      durationSeconds: multiStageState.totalDuration,
      position: 'bottomRight',
      widthFraction: 0.15,
      opacity: 0.9,
      enterAnimation: 'fadeIn',
      exitAnimation: 'none',
    };
    setMultiStageState(prev => ({ ...prev, imageLayers: [...(prev.imageLayers || []), newLayer] }));
  };

  const handleUpdateImageLayer = (id: string, updates: Partial<ImageLayer>) => {
    setMultiStageState(prev => ({
      ...prev,
      imageLayers: (prev.imageLayers || []).map(l => l.id === id ? { ...l, ...updates } : l),
      hasChanges: true
    }));
  };

  const handleRemoveImageLayer = (id: string) => {
    setMultiStageState(prev => ({
      ...prev,
      imageLayers: (prev.imageLayers || []).filter(l => l.id !== id),
      hasChanges: true
    }));
  };

  const handleAddAudioLayer = (layerData: Omit<AudioLayer, 'id'>) => {
    const id = `aud_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    setMultiStageState(prev => ({
      ...prev,
      audioLayers: [...(prev.audioLayers || []), { id, ...layerData }],
    }));
  };

  const handleUpdateAudioLayer = (id: string, updates: Partial<AudioLayer>) => {
    setMultiStageState(prev => ({
      ...prev,
      audioLayers: (prev.audioLayers || []).map(l => l.id === id ? { ...l, ...updates } : l),
      hasChanges: true
    }));
  };

  const handleRemoveAudioLayer = (id: string) => {
    setMultiStageState(prev => ({
      ...prev,
      audioLayers: (prev.audioLayers || []).filter(l => l.id !== id),
      hasChanges: true
    }));
  };

  // Segment edit props handler
  const handleUpdateSegmentEditProps = (segId: string, updates: Partial<SegmentEditProps>) => {
    setMultiStageState(prev => ({
      ...prev,
      segmentEditProps: {
        ...(prev.segmentEditProps || {}),
        [segId]: {
          trimStartSeconds: 0,
          trimEndSeconds: 0,
          playbackSpeed: 1,
          brightness: 1,
          contrast: 1,
          saturation: 1,
          ...(prev.segmentEditProps?.[segId] || {}),
          ...updates,
        },
      },
    }));
  };

  // Segment reorder handler
  const handleReorderSegments = (newOrder: string[]) => {
    setMultiStageState(prev => ({ ...prev, segmentOrder: newOrder }));
  };

  const canUseMultiStage = isSuperAdmin || currentUser?.subscription?.plan === 'Agency';

  const [multiFormatState, setMultiFormatState] = useState({ isGenerating: false, error: null as string | null });

  const handleMultiFormatDownload = async () => {
    if (!imageLabState.prompt || multiFormatState.isGenerating) return;
    setMultiFormatState({ isGenerating: true, error: null });
    try {
      const formats: Array<{ ratio: string; label: string }> = [
        { ratio: '9:16',  label: 'Instagram_Facebook_9x16' },
        { ratio: '16:9', label: 'YouTube_16x9' },
        { ratio: '9:16', label: 'Feed_Instagram_9x16' },
        { ratio: '3:4',  label: 'Feed_Portrait_3x4' },
      ];
      const imagePrompt = brandPrefix + imageLabState.prompt;
      const results = await Promise.allSettled(
        (formats || []).map(f => generateProImage(imagePrompt, f.ratio))
      );
      const zip = new JSZip();
      const ts = Date.now();
      for (let i = 0; i < formats.length; i++) {
        const res = results[i];
        if (res.status !== 'fulfilled' || !res.value) continue;
        const url = res.value;
        let blob: Blob;
        if (url.startsWith('data:')) {
          const base64 = url.split(',')[1];
          const bin = atob(base64);
          const bytes = new Uint8Array(bin.length);
          for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
          blob = new Blob([bytes], { type: 'image/png' });
        } else {
          blob = await fetch(url).then(r => r.blob());
        }
        zip.file(`${formats[i].label}_${ts}.png`, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `multiformat_${ts}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      setMultiFormatState({ isGenerating: false, error: null });
    } catch (err: any) {
      setMultiFormatState({ isGenerating: false, error: err.message });
    }
  };

  const handleImageGenerate = async () => {
    if (!imageLabState.prompt) return;
    setImageLabState(prev => ({ ...prev, isProcessing: true, error: null }));
    try {
      const imagePrompt = brandPrefix + imageLabState.prompt;

      // Bloque 6 — Multi-Channel Generation
      if (imageLabState.useMultiChannel) {
        const multiResults = await generateMultiChannel(imagePrompt, currentUser?.brandProfile || null, (channel) => {
          console.log(`[MultiChannel] Generating ${channel}...`);
        });
        setImageLabState(prev => ({
          ...prev,
          resultImage: multiResults.instagram,
          multiChannelResults: multiResults,
          isProcessing: false
        }));
        return;
      }

      // Bloque 5 — Reflection Loop
      if (imageLabState.useReflection && !imageLabState.sourceImage) {
        const reflectionResult = await generateWithReflection(
          imagePrompt,
          currentUser?.brandProfile || null,
          imageLabState.aspectRatio,
          2
        );
        setImageLabState(prev => ({
          ...prev,
          resultImage: reflectionResult.imageUrl,
          reflectionScore: reflectionResult.score,
          isProcessing: false
        }));
        console.log(`[Reflection] Score: ${reflectionResult.score}/10, Attempts: ${reflectionResult.attempts}`);
        return;
      }

      // Standard Image Generation
      let url;
      if (imageLabState.sourceImage) {
        url = await generateOrEditImage(
          imagePrompt,
          imageLabState.sourceImage.split(',')[1],
          imageLabState.aspectRatio,
          // Support for references even in edit mode
          {
            styleReference: imageLabState.styleImage || undefined,
            subjectReference: imageLabState.subjectImage || undefined
          } as any
        );
      } else {
        if (imageLabState.imageModel === 'flux') {
          url = await generateFluxImage(
            imagePrompt,
            {
              aspectRatio: imageLabState.aspectRatio,
              brandContext: currentUser?.brandProfile ? JSON.stringify(currentUser.brandProfile) : undefined
            }
          );
        } else {
          url = await generateProImage(
            imagePrompt,
            {
              aspectRatio: imageLabState.aspectRatio,
              styleReference: imageLabState.styleImage || undefined,
              subjectReference: imageLabState.subjectImage || undefined,
              brandContext: currentUser?.brandProfile ? JSON.stringify(currentUser.brandProfile) : undefined
            }
          );
        }
      }

      if (!url) {
        throw new Error(language === 'es' ? 'La IA no pudo generar la imagen. Intenta con otro prompt.' : 'AI could not generate the image. Try another prompt.');
      }

      setImageLabState(prev => ({ ...prev, resultImage: url, isProcessing: false }));
      console.log(language === 'es' ? '¡Imagen generada!' : 'Image generated!');
    } catch (err: any) {
      const errorPayload = err.serverStack
        ? JSON.stringify({ message: err.message, stack: err.serverStack, type: 'IMAGE_GEN' })
        : err.message;
      setImageLabState(prev => ({ ...prev, isProcessing: false, error: errorPayload }));
      console.error(err.message);
    }
  };

  const handleAnimate = async () => {
    if (!animationState.sourceImage || !animationState.prompt) return;
    setAnimationState(prev => ({ ...prev, isAnimating: true, error: null }));
    try {
      // Veo 3.0 / 3.1 Cinematic requires JPEG/PNG. Convert to JPEG if source is webp or other formats.
      const sourceDataUrl = animationState.sourceImage;
      const finalImageBase64 = sourceDataUrl.startsWith('data:image/webp') || !sourceDataUrl.startsWith('data:image/jpeg')
        ? (await convertToJpeg(sourceDataUrl)).split(',')[1]
        : sourceDataUrl.split(',')[1];

      // Guard against 1:1 which is not supported by Veo 3.0 / 3.1
      const finalFormat = (animationState.format as string) === '1:1' ? '9:16' : animationState.format; // Auto-correction
      
      const url = await animateImageWithVeo(
        finalImageBase64,
        brandPrefix + animationState.prompt,
        finalFormat,
        (attempt, max) => setAnimationState(prev => ({ ...prev, pollingProgress: { attempt, max } })),
        6, // duration (Veo 3.0 / 3.1 supports [4, 6, 8])
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
          audioData: animationState.ttsVoice === 'Clonada' && audioState.sampleAudio ? audioState.sampleAudio : undefined,
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
          captions = await generateCaptions(audioUrl, {
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

  const handleAudioGenerate = async () => {
    if (!audioState.text) return;
    setAudioState(prev => ({ ...prev, isGenerating: true, error: null }));
    try {
      const url = await generateAudio({
        text: audioState.text,
        voice: audioState.voice,
        audioData: audioState.voice === 'Clonada' && audioState.sampleAudio ? audioState.sampleAudio : undefined,
        language: audioState.language,
        dialect: audioState.dialect,
        tone: audioState.tone,
        emotion: audioState.emotion,
        pitch: audioState.pitch,
        speed: audioState.speed
      });
      
      if (url && currentUser) {
        // Optimized background save for ephemeral history (7 days)
        try {
          await saveVoiceover({
            userId: currentUser.id,
            voiceLabel: audioState.voice,
            scriptText: audioState.text,
            audioUrl: url,
            provider: 'google-gemini-tts'
          });
        } catch (saveErr) {
          console.warn("Failed to persist voiceover in history", saveErr);
        }
      }

      setAudioState(prev => ({ ...prev, audioUrl: url, isGenerating: false }));
    } catch (err: any) {
      const errorPayload = err.serverStack 
        ? JSON.stringify({ message: err.message, stack: err.serverStack, type: 'AUDIO_GEN' })
        : err.message;
      setAudioState(prev => ({ ...prev, isGenerating: false, error: errorPayload }));
    }
  };

  const handlePreviewVoice = async (voice: string) => {
    setAudioState(prev => ({ ...prev, isPreviewing: true }));
    try {
      const previewText = language === 'es' 
        ? `Hola, soy ${voice}. Esta es una prueba de mi voz neural optimizada para Insitu AI.` 
        : `Hello, I am ${voice}. This is a test of my neural voice optimized for Insitu AI.`;
      
      const url = await generateAudio({
        text: previewText,
        voice: voice,
        language: language === 'es' ? 'Spanish' : 'English',
        dialect: 'Neutral',
        tone: 'Professional',
        emotion: 'Neutral',
        pitch: 1.0,
        speed: 1.0
      });
      if (url) {
        const audio = new Audio(url);
        audio.play();
      }
    } catch (e) {
      console.error("Preview failed", e);
    } finally {
      setAudioState(prev => ({ ...prev, isPreviewing: false }));
    }
  };

  const handleSaveToLibrary = async () => {
    if (!currentUser || !audioState.audioUrl) return;

    const newVoice: SavedVoice = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Locución ${audioState.voice} - ${new Date().toLocaleDateString()}`,
      voiceType: audioState.voice,
      url: audioState.audioUrl,
      timestamp: Date.now(),
      text: audioState.text,
      language: audioState.language,
      dialect: audioState.dialect,
      tone: audioState.tone,
      emotion: audioState.emotion,
      pitch: audioState.pitch,
      speed: audioState.speed
    };

    const success = await userService.saveVoice(currentUser.id, newVoice);
    if (success) {
      setToast({ 
        message: language === 'es' ? "Guardado en tu Biblioteca con éxito" : "Saved to your Library successfully", 
        type: 'success' 
      });
      // Force refresh of local user data if needed or relied on state sync
    } else {
      setToast({ 
        message: language === 'es' ? "Error al guardar en Biblioteca" : "Error saving to Library", 
        type: 'error' 
      });
    }
  };

  const handleRemoveFromLibrary = async (voiceId: string) => {
    if (!currentUser) return;
    await userService.removeVoice(currentUser.id, voiceId);
  };

  const handleLoadFromLibrary = (voice: SavedVoice) => {
    setAudioState(prev => ({
      ...prev,
      text: voice.text || '',
      voice: voice.voiceType as any,
      language: voice.language || 'Spanish',
      dialect: voice.dialect || 'Neutral',
      tone: voice.tone || 'Professional',
      emotion: voice.emotion || 'Neutral',
      pitch: voice.pitch || 1.0,
      speed: voice.speed || 1.0,
      activeTab: 'generator',
      audioUrl: voice.url
    }));
  };

  const handleStartRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setToast({ message: "Navegador no compatible con grabación", type: 'error' });
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' };
      const recorder = new MediaRecorder(stream, options);
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
           setAudioState(prev => ({ ...prev, sampleAudio: reader.result as string }));
           setToast({ message: "Muestra capturada. Ya puedes clonar.", type: 'success' });
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setAudioState(prev => ({ ...prev, isRecording: true, recordingTime: 0 }));
      setToast({ message: "Grabando muestra... ¡habla ahora!", type: 'info' });
      
      recordingIntervalRef.current = setInterval(() => {
        setAudioState(prev => ({ ...prev, recordingTime: prev.recordingTime + 1 }));
      }, 1000);
    } catch (err) {
      console.error("Recording failed", err);
      setToast({ message: "Error al acceder al micrófono", type: 'error' });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && audioState.isRecording) {
      mediaRecorderRef.current.stop();
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      setAudioState(prev => ({ ...prev, isRecording: false }));
    }
  };

  const handleAnalyzeVoice = async () => {
    if (!audioState.sampleAudio || audioState.isAnalyzingVoice) return;
    setAudioState(prev => ({ ...prev, isAnalyzingVoice: true }));
    try {
      const analysis = await analyzeVoice(audioState.sampleAudio);
      setAudioState(prev => ({ ...prev, voiceAnalysis: analysis, isAnalyzingVoice: false }));
    } catch (err: any) {
      const errorPayload = err.serverStack 
        ? JSON.stringify({ message: err.message, stack: err.serverStack, type: 'VOICE_ANALYZE' })
        : err.message;
      setAudioState(prev => ({ ...prev, isAnalyzingVoice: false, error: errorPayload }));
      console.error(err.message);
    }
  };

  const handleUrlExtract = async () => {
    if (!urlExtractState.url.trim() || urlExtractState.isExtracting) return;
    setUrlExtractState(prev => ({ ...prev, isExtracting: true, error: null, extracted: null, applied: false }));
    try {
      const data = await extractFromUrl(urlExtractState.url.trim());
      if (data.error) throw new Error(data.error);
      setUrlExtractState(prev => ({ ...prev, isExtracting: false, extracted: data }));
    } catch (err: any) {
      setUrlExtractState(prev => ({ ...prev, isExtracting: false, error: err.message }));
    }
  };

  const handleApplyUrlData = () => {
    if (!urlExtractState.extracted) return;
    const { videoPrompt, ttsScript, suggestedVoice } = urlExtractState.extracted;
    setVideoLabState(prev => ({
      ...prev,
      prompt: videoPrompt || prev.prompt,
      ttsText: ttsScript || prev.ttsText,
      ttsVoice: suggestedVoice || prev.ttsVoice,
    }));
    setUrlExtractState(prev => ({ ...prev, applied: true }));
  };

  const handleGenerateAudioScript = async () => {
    if (!audioState.aiPrompt.trim() || audioState.isGeneratingScript) return;
    setAudioState(prev => ({ ...prev, isGeneratingScript: true, aiScriptGenerated: false }));
    try {
      const data = await generateAudioScript(audioState.aiPrompt, brandPrefix || undefined);
      if (data.script) {
        setAudioState(prev => ({
          ...prev,
          text: data.script.text || prev.text,
          voice: data.script.voice || prev.voice,
          tone: data.script.tone || prev.tone,
          emotion: data.script.emotion || prev.emotion,
          language: data.script.language || prev.language,
          dialect: data.script.dialect || prev.dialect,
          isGeneratingScript: false,
          aiScriptGenerated: true,
        }));
      } else {
        throw new Error('No script returned');
      }
    } catch (err: any) {
      setAudioState(prev => ({ ...prev, isGeneratingScript: false, error: err.message }));
    }
  };

  const blobToBase64 = async (url: string): Promise<string> => {
    if (url.startsWith('data:')) return url;
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Error converting blob to base64", e);
      return url;
    }
  };

  const handleRetailProcess = async () => {
    if (retailState.products.length === 0) return;
    setRetailState(prev => ({ ...prev, isProcessing: true, error: null, processingProgress: null }));
    try {
      let layoutUrl: string | null = null;
      if (retailState.selectedLayoutId === 'custom' && retailState.customLayout) {
        layoutUrl = retailState.customLayout;
      } else if (retailState.selectedLayoutId !== 'none') {
        const layout = RETAIL_LAYOUTS.find(l => l.id === retailState.selectedLayoutId);
        if (layout) layoutUrl = layout.image;
      }

      const total = retailState.products.length;
      const updatedProducts: RetailProduct[] = [...retailState.products];

      for (let i = 0; i < total; i++) {
        const p = retailState.products[i];
        
        // Mark as processing
        updatedProducts[i] = { ...p, status: 'processing' };
        setRetailState(prev => ({ ...prev, products: [...updatedProducts], processingProgress: `${i + 1} / ${total}` }));

        let sourceForCanvas = p.originalImage;

        // Phase 1: AI Mastering (Background swap/optimization)
        if (retailState.aiMasteringEnabled) {
          try {
            const base64 = await blobToBase64(p.originalImage);
            const aiResult = await masterProductImage(base64, retailState.ecommercePlatform);
            if (aiResult?.url) {
              sourceForCanvas = aiResult.url;
            }
          } catch (aiErr: any) {
            console.error(`AI Mastering failed for ${p.id}, falling back:`, aiErr);
          }
        }

        const w = retailState.ecommercePlatform === 'instagram' ? 1080 : 1000;
        const h = retailState.ecommercePlatform === 'instagram' ? 1350 : 1000;

        const result = await new Promise<RetailProduct>((resolve) => {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve({ ...updatedProducts[i], status: 'error' });

          const renderProduct = (imageUrl: string) => {
            const img = new Image();
            if (imageUrl.startsWith('http')) img.crossOrigin = "anonymous";
            img.onload = () => {
              const scale = Math.min((w * 0.85) / img.width, (h * 0.85) / img.height);
              const dw = img.width * scale;
              const dh = img.height * scale;
              ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
              try {
                resolve({ ...updatedProducts[i], processedImage: canvas.toDataURL('image/jpeg', 0.95), status: 'completed' });
              } catch {
                resolve({ ...updatedProducts[i], status: 'error' });
              }
            };
            img.onerror = () => resolve({ ...updatedProducts[i], status: 'error' });
            img.src = imageUrl;
          };

          // If a layout is selected, draw it as background
          if (layoutUrl) {
            const lay = new Image();
            if (layoutUrl.startsWith('http')) lay.crossOrigin = "anonymous";
            lay.onload = () => {
              const scale = Math.max(w / lay.width, h / lay.height);
              ctx.drawImage(lay, (w - lay.width * scale) / 2, (h - lay.height * scale) / 2, lay.width * scale, lay.height * scale);
              renderProduct(sourceForCanvas);
            };
            lay.onerror = () => {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, w, h);
              renderProduct(sourceForCanvas);
            };
            lay.src = layoutUrl;
          } else if (retailState.aiMasteringEnabled && sourceForCanvas !== p.originalImage) {
            // If AI Mastering did its job and NO layout is selected, we just use the AI result directly as the final image
            // No need to draw on canvas unless we want to ensure specific size
            renderProduct(sourceForCanvas);
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
            renderProduct(sourceForCanvas);
          }
        });

        updatedProducts[i] = result;
        setRetailState(prev => ({
          ...prev,
          products: [...updatedProducts],
        }));
      }

      setRetailState(prev => ({ ...prev, isProcessing: false, processingProgress: null }));
      console.log(language === 'es' ? '¡Procesamiento completo!' : 'Processing complete!');
    } catch (err: any) {
      const errorPayload = err.serverStack
        ? JSON.stringify({ message: err.message, stack: err.serverStack, type: 'RETAIL_PROCESS' })
        : err.message;
      setRetailState(prev => ({ ...prev, isProcessing: false, processingProgress: null, error: errorPayload }));
      console.error(err.message);
    }
  };

  const handleGenerateCaptions = async (audioUrl: string, section: 'video' | 'anim') => {
    setIsGeneratingCaptions(true);
    setCaptionProgress(null);
    try {
      const { generateCaptions } = await import('../utils/whisperCaptions');
      const captions = await generateCaptions(audioUrl, {
        model: 'gemini',
        onProgress: (stage, pct) => setCaptionProgress({ stage, pct }),
      });
      if (section === 'video') setVideoLabCaptions(captions);
      else setAnimCaptions(captions);
    } catch (err: any) {
      console.error('[Captions] Error:', err);
      const isCrossOriginIsolationError =
        err?.message?.includes('crossOriginIsolated') ||
        err?.message?.includes('SharedArrayBuffer') ||
        err?.message?.includes('cross-origin isolated');

      if (isCrossOriginIsolationError) {
        // This is a known browser/server config limitation — not a user error.
        // Show a non-blocking toast-style message instead of a disruptive alert.
        const msg = language === 'es'
          ? '⚠️ Subtítulos automáticos requieren aislamiento cross-origin (COOP/COEP). El administrador debe activar estos headers para habilitar Whisper Web.'
          : '⚠️ Auto-captions require cross-origin isolation (COOP/COEP headers). Ask the admin to enable them to unlock Whisper Web.';
        // Use videoLabState.error channel as a non-blocking notice
        if (section === 'video') {
          setVideoLabState(prev => ({ ...prev, error: msg }));
        } else {
          setAnimationState(prev => ({ ...prev, error: msg }));
        }
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

  const handleDownloadZip = async () => {
    const completed = (retailState.products || []).filter(p => p.processedImage);
    if (completed.length === 0) {
      setRetailState(prev => ({ ...prev, error: 'No hay imágenes procesadas para descargar. Procesa al menos un producto primero.' }));
      return;
    }
    
    const zip = new JSZip();
      (retailState.products || []).forEach((p) => {
      if (p.processedImage) {
        const base64Data = p.processedImage.split(',')[1];
        // Preserve original filename if available, else use a fallback
        const originalName = p.name ? p.name.split('.')[0] : `producto_${Math.random().toString(36).substr(2, 5)}`;
        zip.file(`${originalName}_optimized.jpg`, base64Data, { base64: true });
      }
    });
    
    zip.generateAsync({ type: 'blob' }).then((content) => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retail_optimized_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'image' | 'animate' | 'retail' | 'layout') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (target === 'retail') {
      const newProducts: RetailProduct[] = Array.from(files).map((file, i) => {
        const url = URL.createObjectURL(file);
        // We need base64 for the service, so we'll convert it
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          setRetailState(prev => ({
            ...prev,
            products: (prev.products || []).map(p => p.id === `p-${i}-${Date.now()}` ? { ...p, originalImage: reader.result as string } : p)
          }));
        };
        return {
          id: `p-${i}-${Date.now()}`,
          name: file.name,
          originalImage: url,
          processedImage: null,
          status: 'pending' as const
        };
      });
      setRetailState(prev => ({ ...prev, products: [...(prev.products || []), ...newProducts] }));
    } else if (target === 'layout') {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setRetailState(prev => ({ ...prev, customLayout: reader.result as string, selectedLayoutId: 'custom' }));
      };
      reader.readAsDataURL(file);
    } else {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (target === 'image') setImageLabState(prev => ({ ...prev, sourceImage: reader.result as string }));
        if (target === 'animate') setAnimationState(prev => ({ ...prev, sourceImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const labGroups = [
    {
      title: language === 'es' ? 'Estudio de Creación' : 'Creation Studio',
      id: 'creation',
      items: [
        { id: 'video', name: t.video_lab, icon: Video, color: 'text-indigo-400', description: language === 'es' ? 'Prompt to Movie' : 'Prompt to Movie' },
        { id: 'image', name: t.image_lab, icon: ImageIcon, color: 'text-emerald-400', description: language === 'es' ? 'Generación Pro' : 'Pro Generation' },
        { id: 'animate', name: t.animate_lab, icon: Wand2, color: 'text-amber-400', description: language === 'es' ? 'Image to Video' : 'Image to Video' },
        { id: 'audio', name: t.audio_hub, icon: Mic, color: 'text-rose-400', description: language === 'es' ? 'TTS & Clonación' : 'TTS & Cloning' },
        { id: 'portavoz', name: language === 'es' ? 'Mi Avatar' : 'My Avatar', icon: UserRound, color: 'text-pink-400', description: language === 'es' ? 'ADN Vocal + Mi Avatar' : 'Voice DNA + My Avatar' },
        { id: 'flow', name: language === 'es' ? 'Flow Lab' : 'Flow Lab', icon: Edit3, color: 'text-cyan-400', description: language === 'es' ? 'Edición Cinematográfica' : 'Cinematic Editing' },
        { id: 'ads', name: 'Ad Copy Lab', icon: Sparkles, color: 'text-[#ff477b]', description: language === 'es' ? 'Copywriting IA' : 'AI Copywriting' },
      ].filter(item => isSuperAdmin || !['animate', 'audio'].includes(item.id))
    },
    {
      title: language === 'es' ? 'Optimización & Bulk' : 'Bulk & Optimization',
      id: 'bulk',
      items: [
        { id: 'retail', name: t.retail_bulk, icon: ShoppingBag, color: 'text-blue-400', description: language === 'es' ? 'E-commerce Pro' : 'Pro E-commerce' },
        { id: 'master', name: t.video_mastering, icon: RefreshCw, color: 'text-purple-400', description: language === 'es' ? 'Mastering Pro' : 'Pro Mastering' },
        { id: 'mass-ads', name: language === 'es' ? 'Ads Masivos' : 'Mass Ads', icon: Layers, color: 'text-orange-400', description: language === 'es' ? 'Creación Masiva' : 'Mass Creation' },
      ].filter(item => isSuperAdmin || !['retail', 'master'].includes(item.id))
    },
    {
      title: language === 'es' ? 'Inteligencia & Strategy' : 'Strategy & Insights',
      id: 'insights',
      items: [
        { id: 'research', name: 'Research Lab', icon: Globe, color: 'text-violet-400', description: language === 'es' ? 'Trend Intelligence' : 'Trend Intelligence' },
        { id: 'compare', name: 'Compare Lab', icon: Layers, color: 'text-indigo-300', description: language === 'es' ? 'Benchmark IA' : 'Benchmark AI' },
        { id: 'image-audit', name: language === 'es' ? 'Auditoría Visual' : 'Visual Audit', icon: ImageIcon, color: 'text-emerald-400', description: language === 'es' ? 'Neuro-Visual Scan' : 'Neuro-Visual Scan' },
        { id: 'video-audit', name: language === 'es' ? 'Auditoría de Video' : 'Video Audit', icon: Video, color: 'text-indigo-400', description: language === 'es' ? 'Retention Scan' : 'Retention Scan' },
        { id: 'rules', name: language === 'es' ? 'Rules Lab' : 'Rules Lab', icon: Settings2, color: 'text-amber-400', description: language === 'es' ? 'Automation Rules' : 'Automation Rules' },
      ]
    }
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">

      {/* ── New UX Header ───────────────────────────────────────────── */}
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-violet-500/30 border border-fuchsia-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-fuchsia-400" style={{ fontVariationSettings: "'FILL' 1", fontSize: '18px' }}>palette</span>
              </div>
              <h1 className="font-headline text-2xl font-bold text-white tracking-tight">
                {language === 'es' ? 'Creative Lab' : 'Creative Lab'}
              </h1>
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-pulse" />
                {language === 'es' ? 'IA Activa' : 'AI Active'}
              </span>
            </div>
            <p className="text-sm text-gray-400 max-w-2xl">
              {language === 'es'
                ? 'Generación multimodal: video, imagen, audio y copywriting publicitario.'
                : 'Multimodal generation: video, image, audio and ad copywriting.'}
            </p>
          </div>
        </div>

        {/* ── Lab Groups Navigation ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(labGroups || []).map((group) => (
          <div key={group.id} className="space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 pl-2 mb-1.5">{group.title}</h3>
            <div className="glass-card border border-white/8 rounded-2xl p-1.5 backdrop-blur-xl border-t border-t-white/10">
              <div className="flex flex-col gap-0.5">
                {(group.items || []).map((lab) => {
                  const isActive = activeLab === lab.id;
                  const isLocked = ['animate', 'audio', 'retail', 'master'].includes(lab.id) && !isSuperAdmin;
                  
                  const accentColors: Record<string, string> = {
                    video: 'border-indigo-500/40 shadow-indigo-500/10',
                    image: 'border-emerald-500/40 shadow-emerald-500/10',
                    animate: 'border-amber-500/40 shadow-amber-500/10',
                    audio: 'border-rose-500/40 shadow-rose-500/10',
                    portavoz: 'border-pink-500/40 shadow-pink-500/10',
                    flow: 'border-cyan-500/40 shadow-cyan-500/10',
                    ads: 'border-fuchsia-500/40 shadow-fuchsia-500/10',
                    retail: 'border-blue-500/40 shadow-blue-500/10',
                    master: 'border-purple-500/40 shadow-purple-500/10',
                    'mass-ads': 'border-orange-500/40 shadow-orange-500/10',
                    research: 'border-violet-500/40 shadow-violet-500/10',
                    compare: 'border-indigo-300/40 shadow-indigo-300/10',
                    'image-audit': 'border-emerald-500/40 shadow-emerald-500/10',
                    'video-audit': 'border-indigo-500/40 shadow-indigo-500/10',
                    rules: 'border-amber-500/40 shadow-amber-500/10',
                  };
                  const accent = accentColors[lab.id] || 'border-white/10';

                  return (
                    <button
                      key={lab.id}
                      onClick={() => !isLocked && setActiveLab(lab.id as any)}
                      disabled={isLocked}
                      className={cn(
                        "flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl transition-all duration-200 group relative border",
                        isActive
                          ? `bg-white/8 ${accent} shadow-md`
                          : "border-transparent text-white/40 hover:text-white hover:bg-white/5 hover:border-white/10",
                        isLocked && "opacity-20 cursor-not-allowed grayscale"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center border transition-colors flex-shrink-0",
                          isActive ? "bg-white/10 border-white/20" : "bg-white/5 border-white/5 group-hover:border-white/10"
                        )}>
                          <lab.icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : lab.color)} />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className={cn("text-[11px] font-bold uppercase tracking-wide", isActive ? "text-white" : "")}>{lab.name}</span>
                          <span className={cn(
                            "text-[10px] font-medium tracking-tight",
                            isActive ? "text-white/50" : "text-white/30"
                          )}>
                            {lab.description}
                          </span>
                        </div>
                      </div>
                      
                      {isLocked ? (
                        <ShieldCheck className="w-3 h-3 text-white/20" />
                      ) : (
                        isActive && (
                          <motion.div 
                            layoutId="active-nav-dot"
                            className="w-1 h-1 bg-magenta rounded-full shadow-[0_0_8px_rgba(255,71,123,0.8)]"
                          />
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          ))}
        </div>
      </header>

      {/* Brandbook active indicator */}
      {hasBrandContext && brandProfile && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-5 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">
              {language === 'es' ? 'Brandbook activo' : 'Brandbook active'}
            </span>
            <span className="text-[11px] font-bold text-white/70">{brandProfile.brandName}</span>
            {brandProfile.toneOfVoice && (
              <span className="text-[11px] text-white/30 hidden sm:inline">· {brandProfile.toneOfVoice}</span>
            )}
          </div>
          <button
            onClick={() => setUseBrandContext(prev => !prev)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
              useBrandContext
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/5 text-white/30 border border-white/10'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${useBrandContext ? 'bg-emerald-400' : 'bg-white/20'}`} />
            {useBrandContext
              ? (language === 'es' ? 'Aplicando brand' : 'Applying brand')
              : (language === 'es' ? 'Brand pausado' : 'Brand paused')}
          </button>
        </motion.div>
      )}

      <div className="relative min-h-[600px]">
        <AnimatePresence mode="wait">
          {/* VIDEO LAB */}
          {activeLab === 'video' && (
            <motion.div
              key="video-lab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-white/5 p-8 md:p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-2xl"
            >
              <div className="lg:col-span-12 mb-8">
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] mb-4 block">{t.creative_lab} / {t.video_lab}</span>
                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                  Prompt to AI <br /> <span className="text-gradient-magenta">Cinematic Video</span>.
                </h1>
              </div>

              {/* ── URL → Video Panel (Creatify-style) ───────────────────────── */}
              <div className="lg:col-span-12 mb-2">
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
                  {/* Header toggle */}
                  <button
                    onClick={() => setUrlExtractState(prev => ({ ...prev, isOpen: !prev.isOpen }))}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#ff477b]/10 border border-[#ff477b]/20 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-[#ff477b]" />
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#ff477b]">URL → Video</p>
                        <p className="text-[11px] text-white/30 font-light">Pega la URL de tu producto y Gemini auto-genera el video prompt y script</p>
                      </div>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform", urlExtractState.isOpen && "rotate-180")} />
                  </button>

                  {/* Expandable body */}
                  <AnimatePresence>
                    {urlExtractState.isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 space-y-4">
                          {/* URL input row */}
                          <div className="flex gap-3">
                            <input
                              type="url"
                              value={urlExtractState.url}
                              onChange={(e) => setUrlExtractState(prev => ({ ...prev, url: e.target.value, error: null, extracted: null, applied: false }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleUrlExtract()}
                              placeholder="https://miproducto.com/landing"
                              className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#ff477b]/40 transition-colors"
                            />
                            <button
                              onClick={handleUrlExtract}
                              disabled={!urlExtractState.url.trim() || urlExtractState.isExtracting}
                              className="px-5 py-3 bg-[#ff477b] text-white text-[11px] font-black uppercase tracking-widest rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ff2060] transition-colors flex items-center gap-2"
                            >
                              {urlExtractState.isExtracting ? (
                                <><RefreshCw className="w-3 h-3 animate-spin" /> Analizando...</>
                              ) : (
                                <><Sparkles className="w-3 h-3" /> Extraer</>
                              )}
                            </button>
                          </div>

                          {/* Error state */}
                          {urlExtractState.error && (
                            <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                              <p className="text-[11px] text-rose-300">{urlExtractState.error}</p>
                            </div>
                          )}

                          {/* Extracted data card */}
                          {urlExtractState.extracted && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="space-y-4"
                            >
                              <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-1">Producto detectado</p>
                                    <p className="text-base font-bold text-white">{urlExtractState.extracted.productName}</p>
                                    <p className="text-[11px] text-white/40 mt-0.5">{urlExtractState.extracted.category} · Tono: {urlExtractState.extracted.tone}</p>
                                  </div>
                                  <span className="text-[11px] font-black uppercase tracking-widest px-2 py-1 bg-[#ff477b]/10 text-[#ff477b] rounded-lg border border-[#ff477b]/20 flex-shrink-0">Gemini</span>
                                </div>

                                {/* Benefits */}
                                {urlExtractState.extracted.keyBenefits?.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {((urlExtractState.extracted?.keyBenefits) || []).map((b, i) => (
                                      <span key={i} className="text-[11px] px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-white/60">{b}</span>
                                    ))}
                                  </div>
                                )}

                                {/* Script preview */}
                                <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                                  <p className="text-[11px] font-black uppercase tracking-widest text-white/30 mb-1.5">Script generado</p>
                                  <p className="text-[12px] text-white/70 italic leading-relaxed">"{urlExtractState.extracted.ttsScript}"</p>
                                </div>

                                {/* Audience */}
                                <p className="text-[11px] text-white/40">Audiencia: {urlExtractState.extracted.targetAudience}</p>
                              </div>

                              {/* Apply button */}
                              {urlExtractState.applied ? (
                                <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-black uppercase tracking-widest">
                                  <CheckCircle2 className="w-4 h-4" /> Campos rellenados automáticamente
                                </div>
                              ) : (
                                <button
                                  onClick={handleApplyUrlData}
                                  className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#ff477b]/30 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2"
                                >
                                  <Wand2 className="w-3.5 h-3.5 text-[#ff477b]" /> Usar estos datos en el Video Lab
                                </button>
                              )}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {/* ────────────────────────────────────────────────────────────── */}

              <div className="lg:col-span-5 space-y-10">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> Escribe tu visión
                      {urlExtractState.applied && (
                        <span className="text-[11px] font-black text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full normal-case tracking-normal">Auto-rellenado</span>
                      )}
                    </label>
                    {hasBrandContext && (
                      <button
                        onClick={() => setUseBrandContext(!useBrandContext)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all",
                          useBrandContext 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                            : "bg-white/5 border-white/10 text-white/30"
                        )}
                        title={language === 'es' ? "Aplica el ADN de tu marca" : "Applies brand context"}
                      >
                        <Brain className={cn("w-3 h-3", useBrandContext ? "animate-pulse" : "opacity-30")} />
                        {useBrandContext ? 'Cerebro Activo' : 'Sin Contexto'}
                      </button>
                    )}
                  </div>
                  <textarea 
                    value={videoLabState.prompt}
                    onChange={(e) => setVideoLabState(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Describe la escena: un producto de lujo en un entorno minimalista con iluminación cinematográfica..."
                    className="w-full bg-transparent border-none p-0 text-xl font-light text-white placeholder-white/10 focus:ring-0 resize-none min-h-[120px]"
                  />
                  <div className="h-px bg-gradient-to-r from-[#ff477b] to-transparent opacity-30" />
                  
                  {/* Reference Video Upload */}
                  <div className="flex flex-col gap-3 p-4 bg-white/5 rounded-2xl border border-dashed border-white/10 hover:border-[#ff477b]/50 transition-all group">
                     <label className="cursor-pointer flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                           <Video className="w-4 h-4 text-[#ff477b]" />
                           <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Video de Referencia (Clonado)</span>
                        </div>
                        <input 
                           type="file" 
                           accept="video/*" 
                           onChange={(e) => {
                             const f = e.target.files?.[0];
                             if (f) setVideoLabState(prev => ({ ...prev, sourceVideo: URL.createObjectURL(f) }));
                           }}
                           className="hidden" 
                        />
                        <div className="px-3 py-1 bg-white/10 rounded-full text-[11px] font-black uppercase tracking-widest group-hover:bg-[#ff477b] group-hover:text-white transition-all">Sube Referencia</div>
                     </label>
                     {videoLabState.sourceVideo && (
                       <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10">
                          <video src={proxiedAssetUrl(videoLabState.sourceVideo)} className="w-full h-full object-cover" />
                          <button 
                             onClick={() => setVideoLabState(prev => ({ ...prev, sourceVideo: null }))}
                             className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white/60 hover:text-white"
                          >
                             <Trash2 className="w-3 h-3" />
                          </button>
                       </div>
                     )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> {language === 'es' ? 'Modelo de Video' : 'Video Model'}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setVideoLabState(prev => ({ ...prev, videoModel: 'veo' }))}
                        className={cn(
                          "px-4 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all",
                          videoLabState.videoModel === 'veo'
                            ? "bg-[#ff477b]/10 border-[#ff477b]/40 text-[#ff477b]"
                            : "bg-white/5 border-white/10 text-white/30 hover:bg-white/[0.08]"
                        )}
                      >
                        Veo 3.1 Cinematic
                      </button>
                      <button
                        onClick={() => setVideoLabState(prev => ({ ...prev, videoModel: 'ltx' }))}
                        className={cn(
                          "px-4 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all",
                          videoLabState.videoModel === 'ltx'
                            ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400"
                            : "bg-white/5 border-white/10 text-white/30 hover:bg-white/[0.08]"
                        )}
                      >
                        LTX-2.3 Pro
                      </button>
                    </div>
                  </div>

                  <PlatformFormatSelector
                    value={videoLabState.format}
                    onChange={(r) => setVideoLabState(prev => ({ ...prev, format: r as '9:16' | '16:9' }))}
                    mode="video"
                    label={language === 'es' ? 'Formato de Plataforma' : 'Platform Format'}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Música & Audio</label>
                    <div className="flex flex-col gap-4">
                      <select 
                        value={videoLabState.musicSource}
                        onChange={(e) => setVideoLabState(prev => ({ ...prev, musicSource: e.target.value as any }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest text-white focus:ring-2 focus:ring-[#ff477b]"
                      >
                        <option value="none">Sin Música (Muted)</option>
                        <option value="library">De Librería Cinematic</option>
                        <option value="upload">Subir Archivo (.mp3)</option>
                      </select>
                      
                      {videoLabState.musicSource === 'library' && (
                        <select
                          value={videoLabState.selectedMusicUrl}
                          onChange={(e) => setVideoLabState(prev => ({ ...prev, selectedMusicUrl: e.target.value }))}
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

                      {videoLabState.musicSource === 'upload' && (
                        <label className="w-full py-2 px-4 border border-dashed border-white/20 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all text-white/60">
                           <Volume2 className="w-4 h-4" />
                           <span className="text-[11px] font-black uppercase tracking-widest">{videoLabState.uploadedMusicUrl ? "Cambiado" : "Subir MP3"}</span>
                           <input type="file" accept="audio/*" className="hidden" onChange={(e) => {
                             const f = e.target.files?.[0];
                             if (f) setVideoLabState(prev => ({ ...prev, uploadedMusicUrl: URL.createObjectURL(f) }));
                           }} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[11px] font-black uppercase tracking-widest text-white/40">BGM Volume</label>
                   <div className="flex items-center gap-4 py-3 bg-white/5 rounded-2xl px-6">
                      <Volume2 className={cn("w-4 h-4", videoLabState.musicVolume > 0 ? "text-[#ff477b]" : "text-white/20")} />
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        value={videoLabState.musicVolume}
                        onChange={(e) => setVideoLabState(prev => ({ ...prev, musicVolume: parseFloat(e.target.value) }))}
                        className="flex-1 accent-[#ff477b]"
                      />
                      <span className="text-[11px] font-black text-white/40 w-8">{Math.round(videoLabState.musicVolume * 100)}%</span>
                   </div>
                </div>
                       {/* Narration Section */}
                <div className="p-8 bg-[#ff477b]/5 rounded-[2.5rem] border border-[#ff477b]/20 space-y-8">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-[#ff477b]/20 flex items-center justify-center">
                            <Mic className="w-4 h-4 text-[#ff477b]" />
                         </div>
                         <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Locución AI Pro</h4>
                      </div>
                      <select 
                         value={videoLabState.ttsVoice}
                         onChange={(e) => setVideoLabState(prev => ({ ...prev, ttsVoice: e.target.value as any }))}
                         className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white outline-none focus:border-[#ff477b]/50 transition-all cursor-pointer"
                      >
                         {VOICE_LIST.map(v => (
                           <option key={v.id} value={v.id}>{v.name}{v.type === 'DYNAMIC' ? ' (Premium)' : ''}</option>
                         ))}
                      </select>
                   </div>

                   {/* Cargar desde Fábrica de Audio */}
                   {currentUser?.savedVoices && currentUser.savedVoices.length > 0 && (
                     <div className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/10">
                       <Library className="w-3 h-3 text-[#ff477b] flex-shrink-0" />
                       <select
                         defaultValue=""
                         onChange={e => {
                           const sv = currentUser.savedVoices!.find(v => v.id === e.target.value);
                           if (sv) setVideoLabState(prev => ({ ...prev, audioUrl: sv.url }));
                         }}
                         className="flex-1 bg-transparent text-[11px] font-black uppercase tracking-widest text-white outline-none cursor-pointer"
                       >
                         <option value="" disabled>Cargar desde Fábrica de Audio...</option>
                         {(Array.isArray(currentUser.savedVoices) ? currentUser.savedVoices : []).map(sv => (
                           <option key={sv.id} value={sv.id}>{sv.name}</option>
                         ))}
                       </select>
                     </div>
                   )}

                   <div className="space-y-4">
                      <textarea
                        value={videoLabState.ttsText}
                        onChange={(e) => setVideoLabState(prev => ({ ...prev, ttsText: e.target.value }))}
                        placeholder="Escribe el guión comercial aquí..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-light text-white placeholder-white/20 focus:ring-1 focus:ring-[#ff477b] resize-none min-h-[100px] leading-relaxed"
                      />
                   </div>

                   {/* Voice options: Idioma + Tono siempre visibles */}
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-white/30">Idioma</label>
                        <select
                          value={videoLabState.ttsLanguage}
                          onChange={(e) => setVideoLabState(prev => ({ ...prev, ttsLanguage: e.target.value }))}
                          className="w-full bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-[11px] font-black uppercase text-white/60 focus:ring-1 focus:ring-[#ff477b] appearance-none"
                        >
                          <option value="Spanish">Español</option>
                          <option value="English">English</option>
                          <option value="Portuguese">Português</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black uppercase tracking-widest text-white/30">Tono</label>
                        <select
                          value={videoLabState.ttsTone}
                          onChange={(e) => setVideoLabState(prev => ({ ...prev, ttsTone: e.target.value }))}
                          className="w-full bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-[11px] font-black uppercase text-white/60 focus:ring-1 focus:ring-[#ff477b] appearance-none"
                        >
                          <option value="Professional">Profesional</option>
                          <option value="Friendly">Cercano</option>
                          <option value="Urgent">Urgente</option>
                        </select>
                      </div>
                   </div>

                   {/* Opciones avanzadas: accordion colapsable */}
                   <div>
                     <button
                       onClick={() => setShowAdvancedVoice(v => !v)}
                       className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/30 hover:text-white/50 transition-colors"
                     >
                       <ChevronDown className={cn('w-3 h-3 transition-transform', showAdvancedVoice && 'rotate-180')} />
                       {language === 'es' ? 'Opciones avanzadas de voz' : 'Advanced voice options'}
                     </button>
                     <AnimatePresence>
                       {showAdvancedVoice && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ duration: 0.2 }}
                           className="overflow-hidden"
                         >
                           <div className="pt-4 grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                               <label className="text-[11px] font-black uppercase tracking-widest text-white/30">Dialecto</label>
                               <select
                                 value={videoLabState.ttsDialect}
                                 onChange={(e) => setVideoLabState(prev => ({ ...prev, ttsDialect: e.target.value }))}
                                 className="w-full bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-[11px] font-black uppercase text-white/60 focus:ring-1 focus:ring-[#ff477b] appearance-none"
                               >
                                 <option value="Neutral">Neutral</option>
                                 <option value="Mexican">México</option>
                                 <option value="Spanish">España</option>
                               </select>
                             </div>
                             <div className="space-y-2">
                               <label className="text-[11px] font-black uppercase tracking-widest text-white/30">Emoción</label>
                               <select
                                 value={videoLabState.ttsEmotion}
                                 onChange={(e) => setVideoLabState(prev => ({ ...prev, ttsEmotion: e.target.value }))}
                                 className="w-full bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-[11px] font-black uppercase text-white/60 focus:ring-1 focus:ring-[#ff477b] appearance-none"
                               >
                                 <option value="Neutral">Neutral</option>
                                 <option value="Happy">Feliz</option>
                                 <option value="Serious">Serio</option>
                               </select>
                             </div>
                             <div className="space-y-3">
                               <label className="text-[11px] font-black uppercase tracking-widest text-white/30">Pitch {videoLabState.ttsPitch}x</label>
                               <input
                                 type="range" min="0.5" max="1.5" step="0.1"
                                 value={videoLabState.ttsPitch}
                                 onChange={(e) => setVideoLabState(prev => ({ ...prev, ttsPitch: parseFloat(e.target.value) }))}
                                 className="w-full accent-[#ff477b] h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                               />
                             </div>
                             <div className="space-y-3">
                               <label className="text-[11px] font-black uppercase tracking-widest text-white/30">Speed {videoLabState.ttsSpeed}x</label>
                               <input
                                 type="range" min="0.5" max="2.0" step="0.1"
                                 value={videoLabState.ttsSpeed}
                                 onChange={(e) => setVideoLabState(prev => ({ ...prev, ttsSpeed: parseFloat(e.target.value) }))}
                                 className="w-full accent-[#ff477b] h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                               />
                             </div>
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>
                </div>

                {/* Veo 3.0 / 3.1 Advanced Cinematic Controls */}
                <div className="pt-2 px-6 border-t border-white/5 space-y-4">
                  <button
                    onClick={() => setShowAdvancedCinema(!showAdvancedCinema)}
                    className="flex items-center gap-2 group mb-4"
                  >
                    <div className="w-5 h-5 flex items-center justify-center rounded-lg bg-black/40 border border-white/5 group-hover:bg-[#ff477b]/20 group-hover:border-[#ff477b]/30 transition-all">
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
                              <label className="text-[11px] font-black uppercase tracking-widest text-[#ff477b]">Intensidad Movimiento</label>
                              <span className="text-[11px] font-black text-white/60">{(videoLabState.motionIntensity * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range" min="0" max="1" step="0.1"
                              value={videoLabState.motionIntensity}
                              onChange={(e) => setVideoLabState(prev => ({ ...prev, motionIntensity: parseFloat(e.target.value) }))}
                              className="w-full accent-[#ff477b] h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                            />
                          </div>
                          <div className="space-y-3 p-4 rounded-2xl bg-black/20 border border-white/5">
                            <div className="flex justify-between items-center">
                              <label className="text-[11px] font-black uppercase tracking-widest text-[#ff477b]">Velocidad Cámara</label>
                              <span className="text-[11px] font-black text-white/60">{(videoLabState.cameraMotionSpeed * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range" min="0" max="1" step="0.1"
                              value={videoLabState.cameraMotionSpeed}
                              onChange={(e) => setVideoLabState(prev => ({ ...prev, cameraMotionSpeed: parseFloat(e.target.value) }))}
                              className="w-full accent-[#ff477b] h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                            />
                          </div>
                          <div className="space-y-3 p-4 rounded-2xl bg-black/20 border border-white/5">
                            <div className="flex justify-between items-center">
                              <label className="text-[11px] font-black uppercase tracking-widest text-[#ff477b]">Fuerza Estilo</label>
                              <span className="text-[11px] font-black text-white/60">{(videoLabState.styleReferencePower * 100).toFixed(0)}%</span>
                            </div>
                            <input
                              type="range" min="0" max="1" step="0.1"
                              value={videoLabState.styleReferencePower}
                              onChange={(e) => setVideoLabState(prev => ({ ...prev, styleReferencePower: parseFloat(e.target.value) }))}
                              className="w-full accent-[#ff477b] h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Subtitles Toggle */}
                <div className="mx-6 p-5 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#ff477b]/10 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-[#ff477b]" />
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
                    onClick={() => setVideoLabState(prev => ({ ...prev, autoSubtitles: !prev.autoSubtitles }))}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-all duration-300",
                      videoLabState.autoSubtitles ? "bg-[#ff477b]" : "bg-white/10"
                    )}
                  >
                    <span className={cn(
                      "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300",
                      videoLabState.autoSubtitles ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>

                   {/* Multi-Stage Toggle */}
                   {canUseMultiStage && (
                     <div className="p-5 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <Layers className="w-4 h-4 text-[#ff477b]" />
                           <span className="text-[11px] font-black uppercase tracking-widest text-white/60">
                             {language === 'es' ? 'Modo Multi-Segmento' : 'Multi-Segment Mode'}
                           </span>
                         </div>
                         <button
                           onClick={() => setMultiStageState(prev => ({ ...prev, isActive: !prev.isActive, segments: [], error: null, composedVideoUrl: null, storyboardConfirmed: false }))}
                           className={cn(
                             "relative w-10 h-5 rounded-full transition-all duration-300",
                             multiStageState.isActive ? "bg-[#ff477b]" : "bg-white/10"
                           )}
                         >
                           <span className={cn(
                             "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300",
                             multiStageState.isActive ? "translate-x-5" : "translate-x-0"
                           )} />
                         </button>
                       </div>
                       {multiStageState.isActive && (
                         <div className="space-y-2">
                           <label className="text-[11px] uppercase tracking-widest text-white/30">
                             {language === 'es' ? 'Duración Total' : 'Total Duration'}
                           </label>
                           <div className="flex flex-wrap gap-2">
                             {[6, 8, 10, 12, 15, 18, 24].map(d => (
                               <button
                                 key={d}
                                 onClick={() => setMultiStageState(prev => ({ ...prev, totalDuration: d }))}
                                 className={cn(
                                   "flex-1 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                                   multiStageState.totalDuration === d
                                     ? "bg-gradient-to-r from-[#ff477b] to-[#ff6b35] text-white"
                                     : "bg-white/5 text-white/40 hover:bg-white/10"
                                 )}
                               >
                                 {d}s · {Math.ceil(d / 6)} {language === 'es' ? 'seg' : 'segs'}
                               </button>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                   )}

                   <button
                     onClick={multiStageState.isActive ? handleMultiStageGenerate : handleVideoGenerate}
                     disabled={(multiStageState.isActive ? multiStageState.isGenerating : videoLabState.isGenerating) || (!videoLabState.prompt && !videoLabState.ttsText)}
                     className="w-full group relative overflow-hidden bg-white text-[#0a0f1e] py-10 rounded-[2rem] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <div className="absolute inset-0 bg-gradient-to-r from-[#ff477b]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                     <div className="relative flex items-center justify-center gap-4">
                       {(multiStageState.isActive ? multiStageState.isGenerating : videoLabState.isGenerating) ? (
                         <>
                           <RefreshCw className="w-6 h-6 animate-spin text-[#ff477b]" />
                           <span>{language === 'es' ? 'Generando Obra Maestra...' : 'Generating...'}</span>
                         </>
                       ) : multiStageState.isActive ? (
                         <>
                           <Layers className="w-6 h-6 text-[#ff477b]" />
                           <span>{language === 'es' ? `Generar ${Math.ceil(multiStageState.totalDuration / 6)} Segmentos (${multiStageState.totalDuration}s)` : `Generate ${Math.ceil(multiStageState.totalDuration / 6)} Segments (${multiStageState.totalDuration}s)`}</span>
                         </>
                       ) : (
                         <>
                           <Video className="w-6 h-6 text-[#ff477b]" />
                           <span>Generar Video Cinematic</span>
                         </>
                       )}
                     </div>
                   </button>

                   {/* Visual Consistency Uploaders (Style & Subject) */}
                   {!multiStageState.isActive && !videoLabState.isGenerating && (
                     <div className="grid grid-cols-2 gap-3 mt-4">
                       <label className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-white/10 transition-all cursor-pointer hover:bg-white/5">
                         <Layers className="w-4 h-4 mb-2 text-white/30" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Style Ref</span>
                         <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReferenceUpload(e, 'style', 'video')} />
                       </label>
                       <label className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-white/10 transition-all cursor-pointer hover:bg-white/5">
                         <CheckCircle2 className="w-4 h-4 mb-2 text-white/30" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Subject Ref</span>
                         <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReferenceUpload(e, 'subject', 'video')} />
                       </label>
                     </div>
                   )}

                   {videoLabState.pollingProgress && (
                     <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl animate-pulse">
                       <RefreshCw className="w-4 h-4 animate-spin text-[#ff477b] flex-shrink-0" />
                       <div className="flex-1 min-w-0">
                         <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
                           {language === 'es' ? `Renderizando con Veo 3.0 / 3.1... (${videoLabState.pollingProgress.attempt}/${videoLabState.pollingProgress.max})` : `Rendering with Veo 3.0 / 3.1... (${videoLabState.pollingProgress.attempt}/${videoLabState.pollingProgress.max})`}
                         </p>
                         <p className="text-[11px] text-white/30 mt-0.5">
                           ~{Math.max(0, (videoLabState.pollingProgress.max - videoLabState.pollingProgress.attempt) * 6)}s restantes
                         </p>
                       </div>
                     </div>
                   )}

                   {videoLabState.error && (
                     <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <ErrorDisplay error={videoLabState.error} isAdmin={isAdmin} />
                     </div>
                   )}
                </div>


              <div className="lg:col-span-7">
                {/* Multi-Stage Composer */}
                {multiStageState.isActive && (multiStageState.isGenerating || multiStageState.segments.length > 0) && (
                  <div className="mb-6 p-6 bg-white/3 border border-white/10 rounded-3xl backdrop-blur-xl">
                    <Suspense fallback={<LoadingView message={language === 'es' ? 'Cargando compositor...' : 'Loading composer...'} />}>
                      <MultiStageVideoComposer
                        state={multiStageState}
                        language={language}
                        onConfirmStoryboard={() => setMultiStageState(prev => ({ ...prev, storyboardConfirmed: true, isEditing: true }))}
                        onRetrySegment={handleRetrySegment}
                        onTransitionChange={(t: VideoTransition) => setMultiStageState(prev => ({ ...prev, transition: t }))}
                        onTransitionDurationChange={(d: number) => setMultiStageState(prev => ({ ...prev, transitionDurationSeconds: d }))}
                        onCompose={handleCompose}
                        onAddTextLayer={handleAddTextLayer}
                        onUpdateTextLayer={handleUpdateTextLayer}
                        onRemoveTextLayer={handleRemoveTextLayer}
                        onAddImageLayer={handleAddImageLayer}
                        onUpdateImageLayer={handleUpdateImageLayer}
                        onRemoveImageLayer={handleRemoveImageLayer}
                        onUpdateSegmentEditProps={handleUpdateSegmentEditProps}
                        onReorderSegments={handleReorderSegments}
                        savedVoices={currentUser?.savedVoices}
                        musicLibraryItems={MUSIC_LIBRARY}
                        onAddAudioLayer={handleAddAudioLayer}
                        onUpdateAudioLayer={handleUpdateAudioLayer}
                        onRemoveAudioLayer={handleRemoveAudioLayer}
                      />
                    </Suspense>
                  </div>
                )}

                {/* Refine panel — visible only when there is a result */}
                {videoLabState.videoUrl && !videoLabState.isGenerating && (
                  <div className="mb-4 p-5 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 text-[#ff477b]" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Refinar resultado</span>
                    </div>
                    <textarea
                      value={videoLabState.prompt}
                      onChange={e => setVideoLabState(prev => ({ ...prev, prompt: e.target.value }))}
                      className="w-full bg-transparent text-sm text-white placeholder-white/20 resize-none focus:outline-none min-h-[56px] leading-relaxed"
                      placeholder="Ajusta el prompt para refinar el video..."
                    />
                    <div className="flex flex-wrap gap-2">
                      {["más dramático", "mejor iluminación", "cámara lenta", "colores vibrantes", "más minimalista", "close-up del producto"].map(chip => (
                        <button
                          key={chip}
                          onClick={() => setVideoLabState(prev => ({ ...prev, prompt: prev.prompt ? `${prev.prompt}, ${chip}` : chip }))}
                          className="text-[11px] uppercase tracking-wider bg-white/5 border border-white/10 rounded-full px-3 py-1 hover:bg-white/10 transition-all text-white/40 hover:text-white"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleVideoGenerate}
                      className="w-full bg-[#ff477b]/15 border border-[#ff477b]/30 rounded-2xl py-2.5 text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] hover:bg-[#ff477b]/25 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3 h-3" /> Refinar y Regenerar
                    </button>
                  </div>
                )}
                <div className={cn(
                  "w-full rounded-[2.5rem] bg-black/40 border border-white/10 overflow-hidden relative shadow-2xl",
                  videoLabState.format === '16:9' ? "aspect-video" : "aspect-[9/16] max-h-[600px]"
                )}>
                  {videoLabState.videoUrl ? (
                    <div className="w-full h-full relative">
                      <video
                        ref={videoLabVideoRef}
                        src={proxiedAssetUrl(videoLabState.videoUrl)}
                        autoPlay
                        loop
                        controls
                        className="w-full h-full object-cover"
                        onTimeUpdate={(e) => setVideoLabTime(e.currentTarget.currentTime * 1000)}
                        onPlay={() => {
                          const t = videoLabVideoRef.current?.currentTime ?? 0;
                          const offset = videoLabState.voiceoverOffset;
                          if (videoLabMusicRef.current) {
                            videoLabMusicRef.current.volume = videoLabState.musicVolume;
                            videoLabMusicRef.current.currentTime = t;
                            videoLabMusicRef.current.play().catch(() => {});
                          }
                          if (videoLabVoiceoverRef.current) {
                            if (offset > 0) {
                              setTimeout(() => videoLabVoiceoverRef.current?.play().catch(() => {}), offset * 1000);
                            } else {
                              videoLabVoiceoverRef.current.currentTime = t;
                              videoLabVoiceoverRef.current.play().catch(() => {});
                            }
                          }
                        }}
                        onPause={() => {
                          videoLabVoiceoverRef.current?.pause();
                          videoLabMusicRef.current?.pause();
                        }}
                        onSeeked={() => {
                          const t = videoLabVideoRef.current?.currentTime ?? 0;
                          if (videoLabVoiceoverRef.current) videoLabVoiceoverRef.current.currentTime = Math.max(0, t - videoLabState.voiceoverOffset);
                          if (videoLabMusicRef.current) videoLabMusicRef.current.currentTime = t;
                        }}
                      />
                      {/* Subtitle Overlay */}
                      <CaptionOverlay 
                        captions={videoLabState.captions}
                        currentTimeMs={videoLabTime}
                        isVisible={videoLabState.autoSubtitles}
                      />
                      
                      {videoLabState.isGeneratingCaptions && (
                         <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in transition-all">
                            <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center relative bg-black/20 mb-4">
                               <MessageSquare className="w-5 h-5 animate-pulse text-[#ff477b]" />
                               <div className="absolute inset-0 rounded-full border-t-2 border-[#ff477b] animate-spin" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                               {language === 'es' ? 'Traduciendo a Subtítulos...' : 'Converting to Subtitles...'}
                            </span>
                         </div>
                      )}

                      {/* Hidden synced audio tracks */}
                      {videoLabState.audioUrl && (
                        <audio ref={videoLabVoiceoverRef} src={proxiedAssetUrl(videoLabState.audioUrl)} preload="auto" style={{ display: 'none' }} />
                      )}
                      {videoLabState.musicSource !== 'none' && (videoLabState.selectedMusicUrl || videoLabState.uploadedMusicUrl) && (
                        <audio ref={videoLabMusicRef} src={proxiedAssetUrl(videoLabState.selectedMusicUrl || videoLabState.uploadedMusicUrl!)} loop preload="auto" style={{ display: 'none' }} />
                      )}
                      <div className="absolute top-8 right-8 z-10 flex gap-3">
                        <button 
                          onClick={() => setEditorConfig({
                            isOpen: true,
                            mediaUrl: videoLabState.videoUrl!,
                            originalUrl: videoLabState.sourceVideo || undefined,
                            mediaType: 'video',
                            improvements: [
                              language === 'es' ? 'Añadir transiciones dinámicas' : 'Add dynamic transitions',
                              language === 'es' ? 'Mejorar gradación de color' : 'Enhance color grading',
                              language === 'es' ? 'Aumentar resolución a 4K' : 'Upscale to 4K'
                            ]
                          })}
                          className="bg-emerald-500/80 backdrop-blur-xl border border-emerald-500/50 p-3 rounded-xl hover:bg-emerald-500 transition-all flex items-center gap-2 group"
                          title={language === 'es' ? "Mejorar con IA" : "Improve with AI"}
                        >
                          <Wand2 className="w-5 h-5 text-white" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-white hidden group-hover:block">Improve</span>
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 opacity-10">
                      <Video className="w-24 h-24" />
                      <span className="text-xs font-black uppercase tracking-[0.5em]">Video Preview Area</span>
                    </div>
                  )}
                  {videoLabState.isGenerating && (
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center gap-6">
                      <div className="w-16 h-16 relative">
                        <div className="absolute inset-0 border-4 border-[#ff477b]/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-[#ff477b] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-[#ff477b] animate-pulse">Renderizando Inteligencia...</span>
                    </div>
                  )}
                </div>

                {/* Audio generation error */}
                {videoLabState.audioError && !videoLabState.audioUrl && (
                  <div className="mt-4 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-3">
                    <span className="text-lg">🎙️</span>
                    <p className="text-red-400 text-xs"><span className="font-bold">Locución no generada:</span> {videoLabState.audioError}. El video se generó sin narración.</p>
                  </div>
                )}

                {/* Audio Mix Panel — visible when there's a video + voiceover */}
                {videoLabState.videoUrl && videoLabState.audioUrl && (
                  <div className="mt-6 p-5 bg-white/5 rounded-2xl border border-white/10 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                        <Music className="w-3 h-3 text-[#ff477b]" /> Mezcla de Audio
                      </label>
                      <a href={videoLabState.audioUrl} download="narration.wav" className="text-white/30 hover:text-white transition-colors" title="Descargar locución">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    {/* Voiceover offset */}
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-[#ff477b] shrink-0" />
                      <span className="text-[11px] font-black uppercase text-white/40 w-28 shrink-0">Locución +{videoLabState.voiceoverOffset}s</span>
                      <input
                        type="range" min="0" max="10" step="0.5"
                        value={videoLabState.voiceoverOffset}
                        onChange={e => setVideoLabState(p => ({ ...p, voiceoverOffset: parseFloat(e.target.value) }))}
                        className="flex-1 accent-[#ff477b] h-0.5"
                      />
                    </div>
                    {/* Music volume — only if music selected */}
                    {videoLabState.musicSource !== 'none' && (videoLabState.selectedMusicUrl || videoLabState.uploadedMusicUrl) && (
                      <div className="flex items-center gap-3">
                        <Volume2 className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="text-[11px] font-black uppercase text-white/40 w-28 shrink-0">Música {Math.round(videoLabState.musicVolume * 100)}%</span>
                        <input
                          type="range" min="0" max="1" step="0.05"
                          value={videoLabState.musicVolume}
                          onChange={e => {
                            const vol = parseFloat(e.target.value);
                            setVideoLabState(p => ({ ...p, musicVolume: vol }));
                            if (videoLabMusicRef.current) videoLabMusicRef.current.volume = vol;
                          }}
                          className="flex-1 accent-purple-400 h-0.5"
                        />
                      </div>
                    )}
                    <p className="text-[11px] text-white/20 font-medium">
                      {canMixInBrowser()
                        ? (language === 'es' ? 'Preview sincronizado · "Mezclar y Descargar" incrusta el audio en el video' : 'Synced preview · "Mix & Download" embeds audio into the video')
                        : (language === 'es' ? 'Preview sincronizado · Descarga video y locución por separado (Chrome recomendado para mezcla)' : 'Synced preview · Download video and voiceover separately (Chrome recommended for mix)')}
                    </p>
                  </div>
                )}

                {/* Download CTA — Video Lab */}
                {videoLabState.videoUrl && (
                  <div className="mt-4 flex flex-col gap-2">
                    {/* Mix & Download — only if audio present and browser supports it */}
                    {(videoLabState.audioUrl || (videoLabState.musicSource !== 'none' && (videoLabState.selectedMusicUrl || videoLabState.uploadedMusicUrl))) && canMixInBrowser() && (
                      <button
                        disabled={videoLabState.isMixing}
                        onClick={async () => {
                          setVideoLabState(p => ({ ...p, isMixing: true, mixProgress: 0 }));
                          try {
                            await mixAndDownload({
                              videoUrl: videoLabState.videoUrl!,
                              voiceoverUrl: videoLabState.audioUrl,
                              musicUrl: videoLabState.musicSource !== 'none' ? (videoLabState.selectedMusicUrl || videoLabState.uploadedMusicUrl) : null,
                              musicVolume: videoLabState.musicVolume,
                              filename: `video_mix_${videoLabState.format.toLowerCase()}_${Date.now()}.webm`,
                              onProgress: (pct) => setVideoLabState(p => ({ ...p, mixProgress: pct })),
                            });
                          } catch (e: any) {
                            alert(e.message || 'Error al mezclar audio');
                          } finally {
                            setVideoLabState(p => ({ ...p, isMixing: false, mixProgress: 0 }));
                          }
                        }}
                        className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#ff477b] to-purple-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        {videoLabState.isMixing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{language === 'es' ? `Mezclando... ${Math.round(videoLabState.mixProgress)}%` : `Mixing... ${Math.round(videoLabState.mixProgress)}%`}</span>
                          </>
                        ) : (
                          <>
                            <Music className="w-5 h-5" />
                            {language === 'es' ? 'Mezclar y Descargar' : 'Mix & Download'}
                          </>
                        )}
                      </button>
                    )}
                    {/* Plain video download (no audio) */}
                    <button
                      onClick={async () => {
                        const url = videoLabState.videoUrl!;
                        const filename = `video_${videoLabState.format.toLowerCase()}_${Date.now()}.mp4`;
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
                      {language === 'es' ? 'Descargar Solo Video' : 'Download Video Only'}
                    </button>
                    <TechnicalBriefButton prompt={videoLabState.expandedPrompt} />
                    {/* Auto-captions (Whisper) — available when audio or video is present */}
                    {(videoLabState.audioUrl || videoLabState.videoUrl) && (
                      <button
                        disabled={isGeneratingCaptions}
                        onClick={() => handleGenerateCaptions((videoLabState.audioUrl || videoLabState.videoUrl)!, 'video')}
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
                            <span>{videoLabCaptions ? (language === 'es' ? `Subtítulos listos (${videoLabCaptions.length})` : `Captions ready (${videoLabCaptions.length})`) : (language === 'es' ? 'Generar Subtítulos' : 'Generate Captions')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* IMAGE LAB */}
          {activeLab === 'image' && (
            <motion.div
              key="image-lab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-white/5 p-8 md:p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-2xl"
            >
              <div className="lg:col-span-12 mb-8">
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] mb-4 block">{t.creative_lab} / {t.image_lab}</span>
                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                  Pro-Level <br /> <span className="text-gradient-magenta">Ad Imaging</span>.
                </h1>
              </div>

              <div className="lg:col-span-5 space-y-10">
                <div className="space-y-6">
                  <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Origen de Imagen</label>
                  {!imageLabState.sourceImage ? (
                    <label className="w-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2rem] cursor-pointer hover:bg-white/5 transition-all group">
                      <Plus className="w-6 h-6 mb-2 text-white/20 group-hover:text-[#ff477b] transition-colors" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-white/20 group-hover:text-white transition-colors">Subir para Editar</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'image')} />
                    </label>
                  ) : (
                    <div className="relative group rounded-[2rem] overflow-hidden">
                      <img src={imageLabState.sourceImage} className="w-full h-32 object-cover opacity-60" />
                      <button 
                        onClick={() => setImageLabState(prev => ({ ...prev, sourceImage: null }))}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-6 h-6 text-rose-500" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Prompt Creativo</label>
                    {hasBrandContext && (
                      <button
                        onClick={() => setUseBrandContext(!useBrandContext)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all",
                          useBrandContext 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                            : "bg-white/5 border-white/10 text-white/30"
                        )}
                        title={language === 'es' ? "Aplica el ADN de tu marca al prompt" : "Applies your brand DNA to the prompt"}
                      >
                        <Brain className={cn("w-3 h-3", useBrandContext ? "animate-pulse" : "opacity-30")} />
                        {useBrandContext ? 'Cerebro Activo' : 'Sin Contexto'}
                      </button>
                    )}
                  </div>
                  <textarea 
                    value={imageLabState.prompt}
                    onChange={(e) => setImageLabState(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder={imageLabState.sourceImage ? "Describe cambios: cambia el fondo por uno urbano..." : "Describe la imagen pro: un perfume rodeado de cristales..."}
                    className="w-full bg-transparent border-none p-0 text-xl font-light text-white placeholder-white/10 focus:ring-0 resize-none min-h-[100px]"
                  />
                  <div className="h-px bg-gradient-to-r from-[#ff477b] to-transparent opacity-30" />
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> {language === 'es' ? 'Motor de Imagen' : 'Image Engine'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setImageLabState(prev => ({ ...prev, imageModel: 'imagen' }))}
                      className={cn(
                        "px-4 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all",
                        imageLabState.imageModel === 'imagen'
                          ? "bg-[#ff477b]/10 border-[#ff477b]/40 text-[#ff477b]"
                          : "bg-white/5 border-white/10 text-white/30 hover:bg-white/[0.08]"
                      )}
                    >
                      Imagen 3
                    </button>
                    <button
                      onClick={() => setImageLabState(prev => ({ ...prev, imageModel: 'flux' }))}
                      className={cn(
                        "px-4 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all",
                        imageLabState.imageModel === 'flux'
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                          : "bg-white/5 border-white/10 text-white/30 hover:bg-white/[0.08]"
                      )}
                    >
                      Flux.1 Pro
                    </button>
                  </div>
                </div>

                <PlatformFormatSelector
                  value={imageLabState.aspectRatio}
                  onChange={(r) => setImageLabState(prev => ({ ...prev, aspectRatio: r }))}
                  mode="image"
                  label={language === 'es' ? 'Formato de Plataforma' : 'Platform Format'}
                />

                <div className="space-y-4">
                  {/* Bloque 5 & 6 Options */}
                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <label className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed transition-all cursor-pointer hover:bg-white/5",
                        imageLabState.styleImage ? "border-[#ff477b]/50 bg-[#ff477b]/5" : "border-white/10"
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <Layers className={cn("w-3 h-3", imageLabState.styleImage ? "text-[#ff477b]" : "text-white/30")} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Style Ref</span>
                        </div>
                        {imageLabState.styleImage ? (
                          <div className="relative w-full h-8 group/ref">
                            <img src={imageLabState.styleImage} className="w-full h-full object-cover rounded-md opacity-60" />
                            <button onClick={(e) => { e.preventDefault(); setImageLabState(prev => ({ ...prev, styleImage: null })); }} className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/ref:opacity-100 transition-opacity">
                              <Trash2 className="w-2 h-2 text-rose-500" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[8px] text-white/20">Upload Style</span>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReferenceUpload(e, 'style', 'image')} />
                      </label>

                      <label className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed transition-all cursor-pointer hover:bg-white/5",
                        imageLabState.subjectImage ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10"
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className={cn("w-3 h-3", imageLabState.subjectImage ? "text-emerald-500" : "text-white/30")} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Subject Ref</span>
                        </div>
                        {imageLabState.subjectImage ? (
                          <div className="relative w-full h-8 group/ref">
                            <img src={imageLabState.subjectImage} className="w-full h-full object-cover rounded-md opacity-60" />
                            <button onClick={(e) => { e.preventDefault(); setImageLabState(prev => ({ ...prev, subjectImage: null })); }} className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/ref:opacity-100 transition-opacity">
                              <Trash2 className="w-2 h-2 text-rose-500" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[8px] text-white/20">Upload Object</span>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReferenceUpload(e, 'subject', 'image')} />
                      </label>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                      <input
                        type="checkbox"
                        id="useReflection"
                        checked={imageLabState.useReflection ?? false}
                        onChange={(e) => setImageLabState(prev => ({ ...prev, useReflection: e.target.checked }))}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="useReflection" className="flex-1 cursor-pointer">
                        <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400">🔄 Reflection Loop</div>
                        <div className="text-[11px] text-emerald-300/70">Auto-evalúa marca. Regenera si score &lt; 6</div>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                      <input
                        type="checkbox"
                        id="useMultiChannel"
                        checked={imageLabState.useMultiChannel ?? false}
                        onChange={(e) => setImageLabState(prev => ({ ...prev, useMultiChannel: e.target.checked }))}
                        className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
                      />
                      <label htmlFor="useMultiChannel" className="flex-1 cursor-pointer">
                        <div className="text-[11px] font-black uppercase tracking-widest text-blue-400">📱 Multi-Canal</div>
                        <div className="text-[11px] text-blue-300/70">Genera 3 versiones: TikTok, Instagram, YouTube</div>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={handleImageGenerate}
                    disabled={imageLabState.isProcessing || !imageLabState.prompt}
                    className="w-full group relative overflow-hidden bg-white text-[#0a0f1e] py-10 rounded-[2rem] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="relative flex items-center justify-center gap-4">
                      {imageLabState.isProcessing ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-[#ff477b]" />
                      ) : (
                        <Sparkles className="w-6 h-6 text-[#ff477b]" />
                      )}
                      <span>{imageLabState.sourceImage ? "Editar Imagen con IA" : "Generar Imagen Pro"}</span>
                    </div>
                  </button>

                  {imageLabState.error && (
                    <ErrorDisplay error={imageLabState.error} isAdmin={isAdmin} />
                  )}
                </div>
              </div>

              <div className="lg:col-span-7">
                {/* Refine panel — visible only when there is a result */}
                {imageLabState.resultImage && !imageLabState.isProcessing && (
                  <div className="mb-4 p-5 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 text-[#ff477b]" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">Refinar resultado</span>
                    </div>
                    <textarea
                      value={imageLabState.prompt}
                      onChange={e => setImageLabState(prev => ({ ...prev, prompt: e.target.value }))}
                      className="w-full bg-transparent text-sm text-white placeholder-white/20 resize-none focus:outline-none min-h-[56px] leading-relaxed"
                      placeholder="Ajusta el prompt para refinar la imagen..."
                    />
                    <div className="flex flex-wrap gap-2">
                      {["más dramático", "fondo blanco", "iluminación suave", "estilo minimalista", "mayor detalle", "colores vibrantes"].map(chip => (
                        <button
                          key={chip}
                          onClick={() => setImageLabState(prev => ({ ...prev, prompt: prev.prompt ? `${prev.prompt}, ${chip}` : chip }))}
                          className="text-[11px] uppercase tracking-wider bg-white/5 border border-white/10 rounded-full px-3 py-1 hover:bg-white/10 transition-all text-white/40 hover:text-white"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleImageGenerate}
                      className="w-full bg-[#ff477b]/15 border border-[#ff477b]/30 rounded-2xl py-2.5 text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] hover:bg-[#ff477b]/25 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3 h-3" /> Refinar y Regenerar
                    </button>
                  </div>
                )}

                {/* Bloque 6 — Multi-Channel Results */}
                {imageLabState.multiChannelResults && !imageLabState.isProcessing && (
                  <div className="mb-4 p-5 bg-blue-500/5 border border-blue-500/20 rounded-3xl backdrop-blur-xl space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-400">3 Versiones Generadas</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'tiktok', label: '9:16\nTikTok' },
                        { key: 'instagram', label: '1:1\nInstagram' },
                        { key: 'youtube', label: '16:9\nYouTube' }
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => setImageLabState(prev => ({
                            ...prev,
                            resultImage: imageLabState.multiChannelResults![key as keyof typeof imageLabState.multiChannelResults]
                          }))}
                          className="relative aspect-square rounded-xl overflow-hidden border border-blue-500/30 hover:border-blue-500/60 transition-all group"
                        >
                          <img
                            src={imageLabState.multiChannelResults[key as keyof typeof imageLabState.multiChannelResults]}
                            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[7px] font-black uppercase tracking-wider text-blue-300 whitespace-pre text-center">{label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bloque 5 — Reflection Score Badge */}
                {imageLabState.reflectionScore !== null && !imageLabState.isProcessing && (
                  <div className="mb-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl backdrop-blur-xl flex items-center gap-3">
                    <div className="w-12 h-12 flex items-center justify-center bg-emerald-500/20 rounded-full">
                      <span className="text-[14px] font-black text-emerald-400">{imageLabState.reflectionScore}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Brand Alignment</div>
                      <div className="text-[11px] text-emerald-300/70">
                        {imageLabState.reflectionScore >= 8 ? '✅ Excelente alineación con tu marca' :
                         imageLabState.reflectionScore >= 6 ? '✓ Bien alineada con tus directrices' :
                         '⚠ Regenerada automáticamente'}
                      </div>
                    </div>
                  </div>
                )}

                <div className={cn(
                  "w-full rounded-[2.5rem] bg-black/40 border border-white/10 overflow-hidden relative shadow-2xl",
                  imageLabState.aspectRatio === '9:16' ? "aspect-[9/16]" :
                  imageLabState.aspectRatio === '16:9' ? "aspect-video" :
                  imageLabState.aspectRatio === '3:4' ? "aspect-[3/4] max-h-[600px]" : "aspect-[9/16] max-h-[600px]"
                )}>
                  {imageLabState.resultImage ? (
                    <img src={imageLabState.resultImage} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-6 opacity-10">
                      <ImageIcon className="w-24 h-24" />
                      <span className="text-xs font-black uppercase tracking-[0.5em]">Result Preview Area</span>
                    </div>
                  )}
                  {imageLabState.isProcessing && (
                    <div className="absolute inset-0 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center gap-6">
                      <div className="w-16 h-16 border-4 border-[#ff477b] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-[#ff477b] animate-pulse">Creando Arte Digital...</span>
                    </div>
                  )}
                  {imageLabState.resultImage && (
                    <div className="absolute top-6 right-6 flex gap-2">
                      <button
                        onClick={async () => {
                          const jpegImage = await convertToJpeg(imageLabState.resultImage!);
                          setAnimationState(prev => ({ 
                            ...prev, 
                            sourceImage: jpegImage,
                            videoUrl: null,
                            error: null
                          }));
                          setActiveLab('animate');
                        }}
                        className="bg-amber-500/80 backdrop-blur-xl border border-amber-500/50 p-3 rounded-xl hover:bg-amber-500 transition-all flex items-center gap-2 group"
                        title={language === 'es' ? "Animar Imagen" : "Animate Image"}
                      >
                        <Play className="w-5 h-5 text-white" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-white hidden group-hover:block">{language === 'es' ? 'Animar' : 'Animate'}</span>
                      </button>
                      <button
                        onClick={() => setEditorConfig({
                          isOpen: true,
                          mediaUrl: imageLabState.resultImage!,
                          originalUrl: imageLabState.sourceImage || undefined,
                          mediaType: 'image',
                          improvements: [
                            language === 'es' ? 'Mejorar enfoque y nitidez' : 'Enhance focus and sharpness',
                            language === 'es' ? 'Optimizar balance de blancos' : 'Optimize white balance',
                            language === 'es' ? 'Eliminar ruido digital' : 'Remove digital noise'
                          ]
                        })}
                        className="bg-emerald-500/80 backdrop-blur-xl border border-emerald-500/50 p-3 rounded-xl hover:bg-emerald-500 transition-all flex items-center gap-2 group"
                        title={language === 'es' ? "Mejorar con IA" : "Improve with IA"}
                      >
                        <Wand2 className="w-5 h-5 text-white" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-white hidden group-hover:block">Improve</span>
                      </button>
                      <button
                        onClick={() => onAudit?.({ url: imageLabState.resultImage!, type: 'image' })}
                        className="bg-[#ff477b]/80 backdrop-blur-xl border border-[#ff477b]/50 p-3 rounded-xl hover:bg-[#ff477b] transition-all flex items-center gap-2 group"
                        title="Analizar con IA"
                      >
                        <ShieldCheck className="w-5 h-5 text-white" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-white hidden group-hover:block">Audit</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Download CTAs */}
                {imageLabState.resultImage && (
                  <div className="mt-4 flex flex-col gap-3">
                    <button
                      onClick={async () => {
                        const url = imageLabState.resultImage!;
                        const filename = `imagen_${imageLabState.aspectRatio.replace(':', 'x')}_${Date.now()}.png`;
                        if (url.startsWith('data:')) {
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = filename;
                          a.click();
                        } else {
                          try {
                            const blob = await fetch(url).then(r => r.blob());
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = filename;
                            a.click();
                            URL.revokeObjectURL(blobUrl);
                          } catch {
                            window.open(url, '_blank');
                          }
                        }
                      }}
                      className="w-full flex items-center justify-center gap-3 bg-white text-[#0a0f1e] py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white/90 active:scale-[0.98] transition-all"
                    >
                      <Download className="w-5 h-5" />
                      {language === 'es' ? 'Descargar Imagen' : 'Download Image'}
                    </button>
                    <TechnicalBriefButton prompt={imageLabState.expandedPrompt} />
                    <button
                      onClick={handleMultiFormatDownload}
                      disabled={multiFormatState.isGenerating}
                      className="w-full flex items-center justify-center gap-3 bg-white/10 border border-white/20 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white/15 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {multiFormatState.isGenerating
                        ? <RefreshCw className="w-5 h-5 animate-spin" />
                        : <Layers className="w-5 h-5" />
                      }
                      {multiFormatState.isGenerating
                        ? (language === 'es' ? 'Generando todos los formatos...' : 'Generating all formats...')
                        : (language === 'es' ? 'Descargar Todos los Formatos (.ZIP)' : 'Download All Formats (.ZIP)')
                      }
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ANIMATION LAB */}
          {activeLab === 'animate' && (
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
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'animate')} />
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
                               const sv = currentUser.savedVoices!.find(v => v.id === e.target.value);
                               if (sv) setAnimationState(prev => ({ ...prev, audioUrl: sv.url }));
                             }}
                             className="flex-1 bg-transparent text-[11px] font-black uppercase tracking-widest text-white outline-none cursor-pointer"
                           >
                             <option value="" disabled>Cargar desde Fábrica de Audio...</option>
                             {(Array.isArray(currentUser.savedVoices) ? currentUser.savedVoices : []).map(sv => (
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
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReferenceUpload(e, 'style', 'animate')} />
                      </label>
                      <label className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-white/10 transition-all cursor-pointer hover:bg-white/5">
                        <CheckCircle2 className="w-4 h-4 mb-2 text-white/30" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Subject Ref</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReferenceUpload(e, 'subject', 'animate')} />
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

                        {animationState.isGeneratingCaptions && (
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
                          onClick={() => handleGenerateCaptions((animationState.audioUrl || animationState.videoUrl)!, 'anim')}
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
                              <span>{animCaptions ? (language === 'es' ? `Subtítulos listos (${animCaptions.length})` : `Captions ready (${animCaptions.length})`) : (language === 'es' ? 'Generar Subtítulos' : 'Generate Captions')}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* AUDIO HUB */}
          {activeLab === 'audio' && (
            <AudioLabView
              language={language}
              currentUser={currentUser}
              audioState={audioState}
              setAudioState={setAudioState}
              handlePreviewVoice={handlePreviewVoice}
              handleStartRecording={handleStartRecording}
              handleStopRecording={handleStopRecording}
              handleAnalyzeVoice={handleAnalyzeVoice}
              handleGenerateAudioScript={handleGenerateAudioScript}
              handleAudioGenerate={handleAudioGenerate}
              handleSaveToLibrary={handleSaveToLibrary}
              handleRemoveFromLibrary={handleRemoveFromLibrary}
              handleLoadFromLibrary={handleLoadFromLibrary}
              isSuperAdmin={isSuperAdmin}
              t={t}
              proxiedAssetUrl={proxiedAssetUrl}
            />
          )}

          {/* RETAIL BULK */}
          {activeLab === 'retail' && (
            <motion.div
              key="retail-lab"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col gap-12 bg-white/5 p-8 md:p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-2xl"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] mb-4 block">{t.creative_lab} / {t.retail_bulk}</span>
                  <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
                    Bulk Product <br /> <span className="text-gradient-magenta">Gen Mastering</span>.
                  </h1>
                </div>
                <button
                  onClick={handleRetailProcess}
                  disabled={retailState.isProcessing || retailState.products.length === 0}
                  className="bg-white text-[#0a0f1e] px-12 py-8 rounded-3xl font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-4 disabled:opacity-20"
                >
                  {retailState.isProcessing ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-[#ff477b]" />
                  ) : (
                    <Layers className="w-6 h-6 text-[#ff477b]" />
                  )}
                  <span>
                    {retailState.processingProgress
                      ? `Procesando ${retailState.processingProgress}...`
                      : `Procesar ${retailState.products.length} Productos`}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-3 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Layout Studio</label>
                      <label className="text-[11px] font-black uppercase tracking-widest text-white hover:text-[#ff477b] cursor-pointer flex items-center gap-2">
                        <Plus className="w-3 h-3" /> Añadir
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'layout')} />
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {retailState.customLayout && (
                        <div className="group relative rounded-2xl overflow-hidden border-2 aspect-video transition-all border-[#ff477b] shadow-xl shadow-[#ff477b]/10 mb-4">
                          <img src={retailState.customLayout} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 top-auto h-1/2 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between p-4">
                             <span className="text-[11px] font-black uppercase tracking-widest text-white">Custom Layout</span>
                             <button onClick={() => setRetailState(prev => ({ ...prev, customLayout: null, selectedLayoutId: 'l1' }))} className="text-rose-400 hover:text-rose-500 bg-black/50 p-2 rounded-full backdrop-blur-md transition-all">
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        </div>
                      )}

                      {RETAIL_LAYOUTS.map((layout) => (
                        <button
                          key={layout.id}
                          onClick={() => setRetailState(prev => ({ ...prev, selectedLayoutId: layout.id }))}
                          className={cn(
                            "group relative rounded-2xl overflow-hidden border-2 transition-all aspect-video",
                            retailState.selectedLayoutId === layout.id ? "border-[#ff477b] scale-[1.02] shadow-xl shadow-[#ff477b]/10" : "border-transparent hover:border-white/20"
                          )}
                        >
                          <img src={layout.image} className="w-full h-full object-cover" />
                          <div className={cn(
                            "absolute inset-0 flex items-center justify-center bg-black/40",
                            retailState.selectedLayoutId === layout.id ? "opacity-0" : "opacity-100"
                          )}>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white">{layout.name}</span>
                          </div>
                        </button>
                      ))}
                      
                      <button
                        onClick={() => setRetailState(prev => ({ ...prev, selectedLayoutId: 'none' }))}
                        className={cn(
                          "group relative rounded-2xl overflow-hidden border-2 transition-all aspect-video flex flex-col items-center justify-center bg-white/5",
                          retailState.selectedLayoutId === 'none' ? "border-[#ff477b] scale-[1.02] shadow-xl shadow-[#ff477b]/10" : "border-transparent border-dashed border-white/20 hover:border-white/40"
                        )}
                      >
                         <div className="w-full h-full bg-white opacity-20"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[11px] font-black uppercase tracking-widest text-black mix-blend-difference">Sin Layout (Blanco)</span>
                         </div>
                      </button>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Plataforma Objetivo</label>
                      <select 
                        value={retailState.ecommercePlatform}
                        onChange={(e) => setRetailState(prev => ({ ...prev, ecommercePlatform: e.target.value as any }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest text-white focus:ring-2 focus:ring-[#ff477b]"
                      >
                        <option value="generico">Genérico 1:1 (1000px)</option>
                        <option value="instagram">Instagram 4:5 (1080x1350)</option>
                        <option value="amazon">Amazon / MercadoLibre</option>
                        <option value="shopify">Shopify Full</option>
                        <option value="woocommerce">Woocommerce (Pro)</option>
                      </select>
                    </div>

                    <div className="space-y-4 pt-4">
                      <div className="flex items-center justify-between p-4 bg-[#ff477b]/5 rounded-2xl border border-[#ff477b]/20">
                        <div className="flex items-center gap-3">
                          <Wand2 className={cn("w-4 h-4", retailState.aiMasteringEnabled ? "text-[#ff477b]" : "text-white/20")} />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black uppercase tracking-widest text-white">Gen Mastering</span>
                            <span className="text-[11px] text-white/40 uppercase tracking-tighter">Quitar Fondo + IA</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setRetailState(prev => ({ ...prev, aiMasteringEnabled: !prev.aiMasteringEnabled }))}
                          className={cn(
                            "relative w-10 h-5 rounded-full transition-all duration-300",
                            retailState.aiMasteringEnabled ? "bg-[#ff477b]" : "bg-white/10"
                          )}
                        >
                          <span className={cn(
                            "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300",
                            retailState.aiMasteringEnabled ? "translate-x-5" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    </div>

                  <div className="space-y-4 pt-4">
                      <button
                        onClick={handleDownloadZip}
                        disabled={retailState.products.filter(p => p.processedImage).length === 0}
                        className="w-full bg-[#ff477b] text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#ff477b]/90 transition-colors disabled:opacity-20 disabled:grayscale"
                      >
                        <Download className="w-5 h-5" />
                        <span>Exportar Todos (.ZIP)</span>
                      </button>
                    </div>

                    {retailState.error && (
                      <div className="pt-4 border-t border-white/10">
                        <ErrorDisplay error={retailState.error} isAdmin={isAdmin} />
                      </div>
                    )}

                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <div 
                        onClick={() => window.dispatchEvent(new CustomEvent('toggle-expert-chat', { detail: { open: true } }))}
                        className="p-6 bg-white/5 rounded-2xl border border-white/10 group cursor-pointer hover:border-[#ff477b]/50 transition-all flex items-center gap-4"
                      >
                         <div className="w-10 h-10 rounded-full bg-[#ff477b]/20 flex items-center justify-center text-[#ff477b]">
                           <Mic className="w-5 h-5" />
                         </div>
                         <div className="flex-1">
                           <p className="text-[11px] font-black uppercase tracking-widest text-white">¿Necesitas ayuda?</p>
                           <p className="text-[11px] text-white/40">Habla con el Agente Experto para optimizar tus layouts.</p>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-9 space-y-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] cursor-pointer hover:bg-white/5 transition-all group">
                       <Plus className="w-8 h-8 mb-4 text-white/20 group-hover:text-[#ff477b] transition-colors" />
                       <span className="px-6 text-center text-[11px] font-black uppercase tracking-widest text-white/20">Agregar Catálogo</span>
                       <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'retail')} />
                    </label>

                    {(retailState.products || []).map((product) => (
                      <div key={product.id} className="aspect-square bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden relative group">
                        {product.processedImage ? (
                          <img src={product.processedImage} className="w-full h-full object-cover animate-in fade-in duration-1000" />
                        ) : (
                          <div className="w-full h-full relative">
                            <img src={product.originalImage} className="w-full h-full object-cover opacity-30 blur-sm" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 gap-3">
                              {product.status === 'processing' ? (
                                <RefreshCw className="w-6 h-6 animate-spin text-[#ff477b]" />
                              ) : product.status === 'error' ? (
                                <AlertCircle className="w-6 h-6 text-rose-500" />
                              ) : (
                                <ImageIcon className="w-6 h-6 text-white/20" />
                              )}
                              <span className="text-[11px] font-black uppercase tracking-widest text-white/40 text-center truncate w-full">{product.name}</span>
                            </div>
                          </div>
                        )}
                        
                         <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all z-20">
                            {product.processedImage && (
                              <>
                                <button 
                                  onClick={() => onAudit?.({ url: product.processedImage!, type: 'image' })}
                                  className="w-8 h-8 bg-black/60 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-[#ff477b]"
                                  title="Analizar con IA"
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = product.processedImage!;
                                    a.download = `${product.name?.split('.')[0] || 'retail_product'}_optimized.jpg`;
                                    a.click();
                                  }}
                                  className="w-8 h-8 bg-black/60 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-[#ff477b]"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button 
                             onClick={() => setRetailState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== product.id) }))}
                             className="w-8 h-8 bg-black/60 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-rose-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>

                  {retailState.products.length > 0 && (
                    <div className="flex justify-end p-4">
                      <button 
                        onClick={() => setRetailState(prev => ({ ...prev, products: [] }))}
                        className="text-[11px] font-black uppercase tracking-widest text-rose-500/60 hover:text-rose-500 flex items-center gap-2"
                      >
                        <Trash2 className="w-3 h-3" /> Limpiar Todo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* MASTERING LAB */}
          {activeLab === 'master' && (
            <motion.div
              key="master-lab"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col gap-8 bg-white/5 p-8 md:p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-2xl"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] mb-4 block">
                    {t.creative_lab} / {masterMode === 'video' ? t.video_mastering : (language === 'es' ? 'Mastering de Imagen' : 'Image Mastering')}
                  </span>
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
                    AI {masterMode === 'video' ? 'Video' : 'Image'} <br /> 
                    <span className="text-gradient-magenta">Elite Mastering</span>.
                  </h1>
                </div>
                
                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10">
                  <button 
                    onClick={() => setMasterMode('video')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      masterMode === 'video' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
                    )}
                  >
                    <Video className="w-3.5 h-3.5" /> Video
                  </button>
                  <button 
                    onClick={() => setMasterMode('image')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      masterMode === 'image' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
                    )}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Imagen
                  </button>
                </div>
              </div>

              {masterMode === 'video' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-5 space-y-10">
                    <div className="space-y-6">
                      <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Video Original</label>
                      {!masteringState.sourceVideo ? (
                        <label className="w-full aspect-video flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] cursor-pointer hover:bg-white/5 transition-all group overflow-hidden">
                           <RefreshCw className="w-8 h-8 mb-4 text-white/20 group-hover:text-[#ff477b] transition-colors" />
                           <span className="text-[11px] font-black uppercase tracking-widest text-white/20 group-hover:text-white transition-colors">Subir para Masterizar</span>
                           <input type="file" accept="video/*" className="hidden" onChange={(e) => {
                             const f = e.target.files?.[0];
                             if (f) setMasteringState(prev => ({ ...prev, sourceVideo: URL.createObjectURL(f) }));
                           }} />
                        </label>
                      ) : (
                        <div className="relative group rounded-[2.5rem] overflow-hidden aspect-video border border-white/20">
                          <video src={masteringState.sourceVideo} className="w-full h-full object-cover" autoPlay muted loop />
                          <button 
                            onClick={() => setMasteringState(prev => ({ ...prev, sourceVideo: null, enhancedVideo: null }))}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-8 h-8 text-rose-500" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Tipo de Masterizado</label>
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { id: 'cinematic', name: 'Cinematic Gradual', desc: 'Color y nitidez balanceada.' },
                          { id: 'luxury', name: 'Luxury Glossy', desc: 'Brillos premium y fluidez.' },
                          { id: 'extreme', name: 'Ultra Sharp 4K', desc: 'Máximo detalle y contraste.' }
                        ].map(type => (
                          <button 
                            key={type.id}
                            onClick={() => setMasteringState(prev => ({ ...prev, masterType: type.id as any }))}
                            className={cn(
                              "p-6 rounded-2xl border-2 text-left transition-all",
                              masteringState.masterType === type.id ? "bg-[#ff477b]/10 border-[#ff477b] shadow-lg shadow-[#ff477b]/10" : "bg-white/5 border-transparent hover:border-white/10"
                            )}
                          >
                            <p className="text-[11px] font-black uppercase tracking-widest text-white">{type.name}</p>
                            <p className="text-[11px] text-white/40 mt-1">{type.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button
                        onClick={handleMasterVideo}
                        disabled={masteringState.isProcessing || !masteringState.sourceVideo}
                        className="w-full bg-white text-[#0a0f1e] py-10 rounded-[2rem] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      >
                        <div className="relative flex items-center justify-center gap-4">
                          {masteringState.isProcessing ? (
                            <RefreshCw className="w-6 h-6 animate-spin text-[#ff477b]" />
                          ) : (
                            <Sparkles className="w-6 h-6 text-[#ff477b]" />
                          )}
                          <span>Procesar Masterizado Elite</span>
                        </div>
                      </button>

                      {masteringState.notImplemented && (
                        <div className="mt-4 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4">
                          <span className="text-xl">🚧</span>
                          <div>
                            <p className="text-amber-400 font-bold text-sm">Función en desarrollo</p>
                            <p className="text-amber-300/70 text-xs mt-0.5">El masterizado de video con IA estará disponible próximamente. Por ahora puedes descargar el video original.</p>
                          </div>
                        </div>
                      )}
                      {masteringState.error && !masteringState.notImplemented && (
                        <ErrorDisplay error={masteringState.error} isAdmin={isAdmin} />
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="w-full rounded-[3rem] bg-black/40 border border-white/10 overflow-hidden relative shadow-2xl aspect-video flex flex-col items-center justify-center">
                       {masteringState.enhancedVideo ? (
                         <div className="w-full h-full relative">
                            <video 
                              src={masteringState.enhancedVideo} 
                              autoPlay 
                              loop 
                              controls
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-8 left-8 px-4 py-2 bg-[#ff477b] rounded-full text-[11px] font-black uppercase tracking-widest text-white animate-pulse">
                               AI Mastered Mode
                            </div>
                            <div className="absolute top-8 right-8 flex gap-3">

                              <button 
                                onClick={() => {
                                   const a = document.createElement('a');
                                   a.href = masteringState.enhancedVideo!;
                                   a.download = `mastered_video_${Date.now()}.mp4`;
                                   a.click();
                                }}
                                className="bg-white/10 backdrop-blur-xl border border-white/20 p-3 rounded-xl hover:bg-white/20 transition-all"
                                title={language === 'es' ? "Descargar Video" : "Download Video"}
                              >
                                <Download className="w-5 h-5 text-white" />
                              </button>
                            </div>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center justify-center gap-6 opacity-10">
                            <Video className="w-24 h-24" />
                            <span className="text-xs font-black uppercase tracking-[0.5em]">Video Master Preview</span>
                         </div>
                       )}

                       {masteringState.isProcessing && (
                         <div className="absolute inset-0 bg-white/5 backdrop-blur-2xl flex flex-col items-center justify-center gap-6 z-20">
                            <div className="w-16 h-16 border-4 border-[#ff477b] border-t-transparent rounded-full animate-spin" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-[#ff477b] animate-pulse italic">Aplicando Algoritmos de Mastering...</span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                  <div className="lg:col-span-5 space-y-10">
                    <div className="space-y-6">
                      <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Imagen Original</label>
                      {!imageMasteringState.sourceImage ? (
                        <label className="w-full aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] cursor-pointer hover:bg-white/5 transition-all group overflow-hidden">
                           <RefreshCw className="w-8 h-8 mb-4 text-white/20 group-hover:text-[#ff477b] transition-colors" />
                           <span className="text-[11px] font-black uppercase tracking-widest text-white/20 group-hover:text-white transition-colors text-center px-6">
                             Subir Imagen para<br/>Procesamiento Elite
                           </span>
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                             const f = e.target.files?.[0];
                             if (f) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setImageMasteringState(prev => ({ 
                                    ...prev, 
                                    sourceImage: reader.result as string,
                                    processedImage: null 
                                  }));
                                };
                                reader.readAsDataURL(f);
                             }
                           }} />
                        </label>
                      ) : (
                        <div className="relative group rounded-[2.5rem] overflow-hidden aspect-square border border-white/20">
                          <img src={imageMasteringState.sourceImage} className="w-full h-full object-contain bg-black/40" />
                          <button 
                            onClick={() => setImageMasteringState(prev => ({ ...prev, sourceImage: null, processedImage: null }))}
                            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-8 h-8 text-rose-500" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Herramienta de Inteligencia</label>
                      <div className="grid grid-cols-1 gap-4">
                        {[
                          { id: 'upscale', name: 'AI Upscaler 4K', desc: 'Aumenta resolución y detalle.', icon: Sparkles },
                          { id: 'remove_bg', name: 'Background Remover', desc: 'Elimina el fondo con precisión.', icon: Wand2 },
                          { id: 'restore_face', name: 'AI Face Restore', desc: 'Repara caras borrosas o con ruido.', icon: UserRound },
                          { id: 'outpaint', name: 'Generative Expand', desc: 'Expande los bordes de la imagen.', icon: Layers }
                        ].map(tool => (
                          <button 
                            key={tool.id}
                            onClick={() => setImageMasteringState(prev => ({ ...prev, activeTool: tool.id as any }))}
                            className={cn(
                              "p-6 rounded-2xl border-2 text-left transition-all flex items-start gap-4",
                              imageMasteringState.activeTool === tool.id ? "bg-[#ff477b]/10 border-[#ff477b] shadow-lg shadow-[#ff477b]/10" : "bg-white/5 border-transparent hover:border-white/10"
                            )}
                          >
                            <div className={cn(
                              "p-3 rounded-xl",
                              imageMasteringState.activeTool === tool.id ? "bg-[#ff477b] text-white" : "bg-white/5 text-white/40"
                            )}>
                              <tool.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-[11px] font-black uppercase tracking-widest text-white">{tool.name}</p>
                              <p className="text-[11px] text-white/40 mt-1">{tool.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button
                        onClick={handleMasterImage}
                        disabled={imageMasteringState.isProcessing || !imageMasteringState.sourceImage}
                        className="w-full bg-white text-[#0a0f1e] py-10 rounded-[2rem] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                      >
                        <div className="relative flex items-center justify-center gap-4">
                          {imageMasteringState.isProcessing ? (
                            <RefreshCw className="w-6 h-6 animate-spin text-[#ff477b]" />
                          ) : (
                            <Sparkles className="w-6 h-6 text-[#ff477b]" />
                          )}
                          <span>Ejecutar Algoritmo AI</span>
                        </div>
                      </button>

                      {imageMasteringState.error && (
                        <ErrorDisplay error={imageMasteringState.error} isAdmin={isAdmin} />
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="w-full rounded-[3rem] bg-black/40 border border-white/10 overflow-hidden relative shadow-2xl aspect-square flex flex-col items-center justify-center">
                       {imageMasteringState.processedImage ? (
                         <div className="w-full h-full relative p-8">
                            <img 
                              src={imageMasteringState.processedImage} 
                              className="w-full h-full object-contain"
                            />
                            <div className="absolute top-8 left-8 px-4 py-2 bg-[#ff477b] rounded-full text-[11px] font-black uppercase tracking-widest text-white animate-pulse">
                               AI Processed
                            </div>
                            <div className="absolute top-8 right-8 flex gap-3">
                              <button 
                                onClick={() => {
                                   const a = document.createElement('a');
                                   a.href = imageMasteringState.processedImage!;
                                   a.download = `insitu_ai_processed_${Date.now()}.png`;
                                   a.click();
                                }}
                                className="bg-white/10 backdrop-blur-xl border border-white/20 p-3 rounded-xl hover:bg-white/20 transition-all"
                                title={language === 'es' ? "Descargar Imagen" : "Download Image"}
                              >
                                <Download className="w-5 h-5 text-white" />
                              </button>
                            </div>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center justify-center gap-6 opacity-10">
                            <ImageIcon className="w-24 h-24" />
                            <span className="text-xs font-black uppercase tracking-[0.5em]">AI Master Preview</span>
                         </div>
                       )}

                       {imageMasteringState.isProcessing && (
                         <div className="absolute inset-0 bg-white/5 backdrop-blur-2xl flex flex-col items-center justify-center gap-6 z-20">
                            <div className="w-16 h-16 border-4 border-[#ff477b] border-t-transparent rounded-full animate-spin" />
                            <span className="text-[11px] font-black uppercase tracking-widest text-[#ff477b] animate-pulse italic">
                              {imageMasteringState.activeTool === 'upscale' ? 'Aumentando Resolución...' : 
                               imageMasteringState.activeTool === 'remove_bg' ? 'Extrayendo Sujeto...' :
                               imageMasteringState.activeTool === 'restore_face' ? 'Restaurando Rostros...' :
                               'Expandiendo Imagen...'}
                            </span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}


          {/* AD COPY LAB */}
          {activeLab === 'ads' && (
            <motion.div
              key="ads-lab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <Suspense fallback={<LoadingView message={language === 'es' ? 'Cargando Ad Copy Lab...' : 'Loading Ad Copy Lab...'} />}>
                <GenAdsView 
                  currentUser={currentUser} 
                  language={language} 
                  onSendToImageLab={(prompt: string) => {
                    setImageLabState(prev => ({ ...prev, prompt }));
                    setActiveLab('image');
                  }} 
                  history={history}
                  onSaveHistory={onSaveHistory}
                />
              </Suspense>
            </motion.div>
          )}

          {/* MASS ADS LAB */}
          {activeLab === 'mass-ads' && (
            <motion.div
              key="mass-ads-lab"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <Suspense fallback={<LoadingView message={language === 'es' ? 'Cargando Ads Masivos...' : 'Loading Mass Ads...'} />}>
                <MassAdsView
                  currentUser={currentUser}
                  language={language}
                  history={history}
                  onSaveHistory={onSaveHistory}
                />
              </Suspense>
            </motion.div>
          )}

          {/* RESEARCH LAB */}
          {activeLab === 'research' && (
            <motion.div
              key="research-lab"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Suspense fallback={<LoadingView message={language === 'es' ? 'Cargando Research Hub...' : 'Loading Research Hub...'} />}>
                <ResearchHub 
                  currentUser={currentUser} 
                  language={language} 
                  onLogin={() => onLogin(currentUser!)} 
                  onCancel={onCancel}
                  history={history}
                  onSaveHistory={onSaveHistory}
                />
              </Suspense>
            </motion.div>
          )}

          {/* COMPARE LAB */}
          {activeLab === 'compare' && (
            <motion.div
              key="compare-lab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Suspense fallback={<LoadingView message={language === 'es' ? 'Cargando Compare Lab...' : 'Loading Compare Lab...'} />}>
                <CompareCreativesView 
                  language={language} 
                  theme={currentUser?.settings?.theme === 'light' ? 'light' : 'dark'}
                  restoredAudit={restoredAudit?.type === 'compare' ? restoredAudit.result : null}
                  onSaveAudit={(res, q) => onSaveHistory?.({ type: 'compare', result: res, query: q })}
                />
              </Suspense>
            </motion.div>
          )}


          {/* IMAGE AUDIT LAB */}
          {activeLab === 'image-audit' && (
            <motion.div
              key="image-audit-lab"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Suspense fallback={<LoadingView message={language === 'es' ? 'Analizando visión...' : 'Analyzing vision...'} />}>
                <ImageAuditView 
                  language={language}
                  theme={currentUser?.settings?.theme === 'light' ? 'light' : 'dark'}
                  restoredAudit={restoredAudit?.type === 'image' ? (restoredAudit.result as any) : null} 
                  onSaveAudit={(res, q) => onSaveHistory?.({ type: 'image', result: res, query: q })}
                />
              </Suspense>
            </motion.div>
          )}

          {/* VIDEO AUDIT LAB */}
          {activeLab === 'video-audit' && (
            <motion.div
              key="video-audit-lab"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-white/5 p-4 md:p-8 rounded-[3.5rem] border border-white/10 backdrop-blur-2xl min-h-[800px] overflow-hidden"
            >
              <VideoAuditView 
                language={language}
                theme={currentUser?.settings?.theme === 'light' ? 'light' : 'dark'}
                prefilledUrl={prefilledMedia?.type === 'video' ? prefilledMedia.url : undefined}
                restoredAudit={restoredAudit?.type === "video" ? restoredAudit.result : null}
                onSaveAudit={(res, q) => onSaveHistory?.({ type: 'video', result: res, query: q })}
              />
            </motion.div>
          )}

          {/* AUTOMATION RULES LAB */}
          {activeLab === 'rules' && (
            <motion.div
              key="rules-lab"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-white/5 p-4 md:p-8 rounded-[3.5rem] border border-white/10 backdrop-blur-2xl min-h-[800px] overflow-hidden"
            >
              <React.Suspense fallback={<LoadingView message={language === 'es' ? 'Cargando Rules Lab...' : 'Loading Rules Lab...'} />}>
                <AutomationRulesView
                  currentUser={currentUser}
                  language={language}
                />
              </React.Suspense>
            </motion.div>
          )}

          {activeLab === 'flow' && (
            <motion.div
              key="flow-lab"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-white/5 p-4 md:p-8 rounded-[3.5rem] border border-white/10 backdrop-blur-2xl min-h-[800px] overflow-hidden"
            >
              <React.Suspense fallback={<LoadingView message={language === 'es' ? 'Cargando Flow Lab...' : 'Loading Flow Lab...'} />}>
                <FlowWorkspace
                  state={multiStageState}
                  language={language}
                  onUpdateState={(updates) => setMultiStageState(prev => ({ ...prev, ...updates }))}
                  onGenerateScene={handleRetrySegment}
                  onAddScene={handleAddFlowSegment}
                  onCompose={handleCompose}
                  isComposing={multiStageState.isComposing}
                  brandContext={useBrandContext ? brandProfile : null}
                  brandPrefix={brandPrefix}
                  initialAssets={avatarAssets}
                />
              </React.Suspense>
            </motion.div>
          )}

          {activeLab === 'portavoz' && (
            <motion.div
              key="portavoz-lab"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-white/5 p-4 md:p-8 rounded-[3.5rem] border border-white/10 backdrop-blur-2xl min-h-[800px] overflow-hidden"
            >
              <React.Suspense fallback={<LoadingView message={language === 'es' ? 'Cargando Portavoz IA...' : 'Loading Portavoz IA...'} />}>
                <PortavozIAView
                  language={language}
                  currentUser={currentUser}
                  brandIdentity={brandProfile}
                  brandContext={useBrandContext ? brandProfile : null}
                  brandPrefix={brandPrefix}
                  onSaveHistory={onSaveHistory}
                  onAssetSaved={handleAvatarAssetSaved}
                  restoredAudit={restoredAudit?.type === 'avatar' ? restoredAudit : null}
                />
              </React.Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Persistent Notification System (Toast) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-8 right-8 z-[999] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 min-w-[320px] backdrop-blur-xl",
              toast.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              toast.type === 'error' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
              "bg-[#ff477b]/10 border-[#ff477b]/20 text-[#ff477b]"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              toast.type === 'success' ? "bg-emerald-500/20" :
              toast.type === 'error' ? "bg-rose-500/20" :
              "bg-[#ff477b]/20"
            )}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
               toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
               <Sparkles className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm tracking-tight">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-white/20 hover:text-white transition-colors p-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <motion.div 
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 4, ease: "linear" }}
              onAnimationComplete={() => setToast(null)}
              className={cn(
                "absolute bottom-0 left-0 right-0 h-1 origin-left rounded-full",
                toast.type === 'success' ? "bg-emerald-500" :
                toast.type === 'error' ? "bg-rose-500" :
                "bg-[#ff477b]"
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caption generation progress overlay */}
      <AnimatePresence>
        {isGeneratingCaptions && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] w-[92vw] max-w-md"
          >
            <div className="bg-[#0a0f1e]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#ff477b]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#ff477b] text-sm font-black">CC</span>
                </div>
                <div>
                  <p className="text-[11px] font-black text-white uppercase tracking-[0.3em]">
                    {language === 'es' ? 'Generando Subtítulos' : 'Generating Captions'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {captionProgress ? captionProgress.stage : (language === 'es' ? 'Iniciando Whisper...' : 'Starting Whisper...')}
                  </p>
                </div>
                <div className="ml-auto text-[11px] font-black text-[#ff477b] tabular-nums">
                  {captionProgress?.pct ?? 0}%
                </div>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#ff477b] to-indigo-500 rounded-full"
                  style={{ width: `${captionProgress?.pct ?? 0}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL COMPONENTS */}
      <AnimatePresence>
        {editorConfig.isOpen && (
          <Suspense fallback={<LoadingView message={language === 'es' ? 'Cargando editor de medios...' : 'Loading media editor...'} />}>
            <MediaEditorView 
              mediaUrl={editorConfig.mediaUrl}
              originalUrl={editorConfig.originalUrl}
              mediaType={editorConfig.mediaType}
              improvements={editorConfig.improvements}
              language={language}
              onClose={() => setEditorConfig(prev => ({ ...prev, isOpen: false }))}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* SUPER ADMIN: Last Generated Model Info */}
      {isAdmin && lastMediaMeta && (
        <motion.div 
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          className="fixed bottom-6 right-6 z-[100] bg-[#0a0f1e]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 flex flex-col gap-3 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] min-w-[280px] pointer-events-none overflow-hidden"
        >
          {/* Animated Glow Background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff477b]/10 blur-[60px] -mr-16 -mt-16" />
          
          <div className="flex items-center justify-between gap-4 relative z-10">
             <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#ff477b]/20 flex items-center justify-center">
                   <ShieldCheck className="w-3.5 h-3.5 text-[#ff477b]" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">AI Execution Meta</span>
             </div>
             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black uppercase text-emerald-500 tracking-widest">Active</span>
             </div>
          </div>

          <div className="space-y-3 relative z-10">
            <div className="flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-widest text-white/20 mb-1">Process Type</span>
              <div className="flex items-center gap-2">
                 <div className="px-2 py-1 bg-white/5 rounded-md border border-white/5 text-[11px] font-mono text-white/70">
                   {lastMediaMeta.type}
                 </div>
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-widest text-white/20 mb-1">AI Model Engine</span>
              <div className="text-[11px] font-mono text-[#ff477b] bg-[#ff477b]/5 p-2 rounded-lg border border-[#ff477b]/10 break-all leading-tight">
                {lastMediaMeta.meta.modelUsed || 'Unknown Engine'}
              </div>
            </div>

            {lastMediaMeta.meta.apiKeySource && (
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest pt-2 border-t border-white/5">
                <span className="text-white/20">Secret Sourcing</span>
                <span className="text-[#ff477b]/60">{lastMediaMeta.meta.apiKeySource}</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CreativeLabView;
