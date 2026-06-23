import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, Sparkles, RefreshCw, Download, Volume2,
  CheckCircle2, AlertCircle, FileVideo, Wand2, Globe,
  Music, ShieldCheck, ChevronDown, Clock, Check, Settings2,
} from 'lucide-react';
import {
  generateAdVideo, generateLtxVideo, generateAudio, VOICE_LIST,
  generateMultiStageVideo, generateSegmentVideo, extractLastFrame,
  extractFromUrl, animateImageWithVeo,
} from '../services/ai/mediaGenerationService';
import { mixAndDownload, canMixInBrowser } from '../utils/videoMixer';
import { TRANSLATIONS } from '../constants';
import { Language, AuthUser, MultiStageVideoState, VideoSegment, TextLayer, ImageLayer, AudioLayer, SegmentEditProps, Caption } from '../types';
import { PlatformFormatSelector } from './ui/PlatformFormatSelector';
import { cn } from '../utils/cn';
import { proxiedAssetUrl } from '../utils/apiConfig';
import { MultiStageVideoComposer } from './MultiStageVideoComposer';

const MUSIC_LIBRARY = [
  { id: 'm1',  name: 'Cinematic Epic',    category: 'Cinematic',  url: 'https://cdn.pixabay.com/audio/2022/03/24/audio_73155fd4e6.mp3' },
  { id: 'm2',  name: 'Dramatic Score',    category: 'Cinematic',  url: 'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3' },
  { id: 'm5',  name: 'Upbeat Tech',       category: 'Corporate',  url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_d14f48b9f7.mp3' },
  { id: 'm8',  name: 'Summer Energetic',  category: 'Energetic',  url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_bb3e524177.mp3' },
  { id: 'm11', name: 'Inspiring Hope',    category: 'Emotional',  url: 'https://cdn.pixabay.com/audio/2022/08/23/audio_635fd1d53a.mp3' },
  { id: 'm13', name: 'Deep Focus',        category: 'Ambient',    url: 'https://cdn.pixabay.com/audio/2022/03/15/audio_cb6e5b0c2e.mp3' },
];

interface VideoLabViewProps {
  currentUser: AuthUser | null;
  language: Language;
}

const convertToJpeg = (dataUrl: string): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      canvas.width = img.width; canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

const VideoLabView: React.FC<VideoLabViewProps> = ({ currentUser, language }) => {
  const t = TRANSLATIONS[language];
  const isSuperAdmin = currentUser?.role === 'superAdmin' || ['admin@insitu.ai','sanchezfj@me.com','sociopuerta@gmail.com','qa_tester@insitu.company'].includes(currentUser?.email || '');
  const brandProfile = currentUser?.brandProfile;
  const hasBrandContext = !!(brandProfile?.brandName && brandProfile?.industry && brandProfile?.toneOfVoice && brandProfile?.valueProposition);
  const [useBrandContext, setUseBrandContext] = useState(true);
  const [showAdvancedVoice, setShowAdvancedVoice] = useState(false);
  const [showAdvancedCinema, setShowAdvancedCinema] = useState(false);
  const [clonedAudioSample] = useState<string | null>(null);

  const [videoLabState, setVideoLabState] = useState({
    prompt: '', format: '9:16' as '9:16' | '16:9', videoUrl: null as string | null,
    audioUrl: null as string | null, isGenerating: false, musicVolume: 0.5, sceneAspects: '',
    musicSource: 'none' as 'none' | 'library' | 'upload', selectedMusicUrl: '',
    uploadedMusicUrl: null as string | null, ttsText: '', ttsVoice: 'Default' as string,
    ttsLanguage: 'Spanish', ttsDialect: 'Neutral', ttsTone: 'Professional', ttsEmotion: 'Neutral',
    ttsPitch: 1.0, ttsSpeed: 1.0, error: null as string | null, audioError: null as string | null,
    pollingProgress: null as { attempt: number; max: number } | null, voiceoverOffset: 0,
    isMixing: false, mixProgress: 0, motionIntensity: 0.5, cameraMotionSpeed: 0.5,
    styleReferencePower: 0.5, autoSubtitles: false, captions: null as Caption[] | null,
    isGeneratingCaptions: false, styleImage: null as string | null, subjectImage: null as string | null,
    expandedPrompt: null as string | null, platform: 'Universal / Multiplatform' as string,
    videoModel: 'veo' as 'veo' | 'ltx',
  });

  const [urlExtractState, setUrlExtractState] = useState({
    url: '', isExtracting: false, extracted: null as null | { productName: string; category: string; keyBenefits: string[]; targetAudience: string; tone: string; videoPrompt: string; ttsScript: string; suggestedVoice: string }, error: null as string | null, isOpen: false, applied: false,
  });

  const [multiStageState, setMultiStageState] = useState<MultiStageVideoState>({
    isActive: false, totalDuration: 18, segments: [], segmentOrder: [], currentStageIndex: 0,
    isGenerating: false, isComposing: false, composedVideoUrl: null, storyboardConfirmed: false,
    isEditing: false, transition: 'crossfade', transitionDurationSeconds: 0.5, error: null,
    pollingProgress: null, textLayers: [], imageLayers: [], audioLayers: [], segmentEditProps: {}, aspectRatio: '9:16',
  });

  const [videoLabCaptions, setVideoLabCaptions] = useState<Caption[] | null>(null);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionProgress, setCaptionProgress] = useState<{ stage: string; pct: number } | null>(null);
  const videoLabMusicRef = useRef<HTMLAudioElement>(null);

  const buildBrandPrefix = () => {
    if (!hasBrandContext || !brandProfile || !useBrandContext) return '';
    return `--- BRAND IDENTITY CONTEXT ---\nBrand Name: ${brandProfile.brandName}\nIndustry: ${brandProfile.industry}\nTone: ${brandProfile.toneOfVoice}\nValue: ${brandProfile.valueProposition}\n--- USER REQUEST ---\n`;
  };
  const brandPrefix = buildBrandPrefix();

  const TechnicalBriefButton: React.FC<{ prompt: string | null }> = ({ prompt }) => {
    const [show, setShow] = useState(false);
    if (!isSuperAdmin || !prompt) return null;
    return (
      <div className="mt-4">
        <button onClick={() => setShow(!show)} className="flex items-center gap-2 px-4 py-2 bg-[#ff477b]/10 border border-[#ff477b]/30 rounded-full text-[10px] font-black uppercase tracking-widest text-[#ff477b] hover:bg-[#ff477b]/20 transition-all">
          <ShieldCheck className="w-3 h-3" /> {show ? 'Ocultar Brief' : 'Ver Brief Técnico'}
        </button>
        <AnimatePresence>
          {show && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-2 p-4 bg-black/40 border border-[#ff477b]/20 rounded-2xl text-[11px] font-mono text-[#ff477b]/80 leading-relaxed italic">{prompt}</div>
          </motion.div>)}
        </AnimatePresence>
      </div>
    );
  };

  const handleVideoGenerate = async () => {
    if (!videoLabState.prompt && !videoLabState.ttsText) return;
    setVideoLabState(prev => ({ ...prev, isGenerating: true, error: null }));
    try {
      const finalPrompt = brandPrefix + (videoLabState.prompt || `A cinematic video matching this narration: ${videoLabState.ttsText}`);
      let url;
      if (videoLabState.videoModel === 'ltx') {
        url = await generateLtxVideo(finalPrompt, { format: videoLabState.format === '9:16' ? 'Social' : 'Landscape', duration: 6, platform: videoLabState.platform, objective: urlExtractState.extracted?.productName || 'General Ad', brandProfile: currentUser?.brandProfile }, (attempt, max) => setVideoLabState(prev => ({ ...prev, pollingProgress: { attempt, max } })));
      } else {
        url = await generateAdVideo(finalPrompt, videoLabState.format, videoLabState.musicVolume, videoLabState.sceneAspects, (attempt, max) => setVideoLabState(prev => ({ ...prev, pollingProgress: { attempt, max } })), 6, { motionIntensity: videoLabState.motionIntensity, cameraMotionSpeed: videoLabState.cameraMotionSpeed, styleReferencePower: videoLabState.styleReferencePower, styleReference: videoLabState.styleImage || undefined, subjectReference: videoLabState.subjectImage || undefined });
      }
      let audioUrl = null; let audioError: string | null = null;
      if (videoLabState.ttsText) {
        try {
          audioUrl = await generateAudio({ text: videoLabState.ttsText, voice: videoLabState.ttsVoice, audioData: videoLabState.ttsVoice === 'Clonada' && clonedAudioSample ? clonedAudioSample : undefined, language: videoLabState.ttsLanguage, dialect: videoLabState.ttsDialect, tone: videoLabState.ttsTone, emotion: videoLabState.ttsEmotion, pitch: videoLabState.ttsPitch, speed: videoLabState.ttsSpeed });
        } catch (audioErr: any) { audioError = audioErr?.message || 'Error al generar la locución'; }
      }
      setVideoLabState(prev => ({ ...prev, videoUrl: url, audioUrl, audioError, isGenerating: false, isGeneratingCaptions: false, pollingProgress: null }));
    } catch (err: any) {
      setVideoLabState(prev => ({ ...prev, isGenerating: false, error: err.message, pollingProgress: null }));
    }
  };

  const handleMultiStageGenerate = async () => {
    if (!videoLabState.prompt && !videoLabState.ttsText) return;
    const totalSegments = Math.round(multiStageState.totalDuration / 6);
    const initialSegments: VideoSegment[] = Array.from({ length: totalSegments }, (_, i) => ({ id: `seg_${i}`, index: i, prompt: videoLabState.prompt || videoLabState.ttsText, status: 'pending' as const, operationName: null, videoUrl: null, thumbnailDataUrl: null, errorMessage: null, durationSeconds: 6, type: 'video' }));
    setMultiStageState(prev => ({ ...prev, isGenerating: true, segments: initialSegments, segmentOrder: initialSegments.map(s => s.id), currentStageIndex: 0, error: null, composedVideoUrl: null, storyboardConfirmed: false, isEditing: false }));
    const finalPrompt = brandPrefix + (videoLabState.prompt || `A cinematic video: ${videoLabState.ttsText}`);
    const gen = generateMultiStageVideo({ prompt: finalPrompt, format: videoLabState.format, plannedSegments: initialSegments.map(seg => ({ subPrompt: seg.prompt, durationSeconds: seg.durationSeconds })) }, (_si: number, attempt: number, max: number) => setMultiStageState(prev => ({ ...prev, pollingProgress: { attempt, max } })));
    for await (const event of gen) {
      if (event.type === 'stage_started') setMultiStageState(prev => ({ ...prev, currentStageIndex: event.segmentIndex, segments: prev.segments.map(s => s.index === event.segmentIndex ? { ...s, status: 'generating' } : s) }));
      else if (event.type === 'stage_completed') setMultiStageState(prev => ({ ...prev, pollingProgress: null, segments: prev.segments.map(s => s.index === event.segmentIndex ? { ...s, status: 'completed', videoUrl: event.videoUrl!, thumbnailDataUrl: event.thumbnailDataUrl ?? null } : s) }));
      else if (event.type === 'stage_failed') { setMultiStageState(prev => ({ ...prev, isGenerating: false, pollingProgress: null, error: `Segmento ${event.segmentIndex + 1} falló` })); return; }
      else if (event.type === 'all_done') setMultiStageState(prev => ({ ...prev, isGenerating: false, pollingProgress: null }));
    }
  };

  const handleRetrySegment = async (index: number, options?: any) => {
    const targetSegment = multiStageState.segments.find(s => s.index === index);
    const finalPrompt = brandPrefix + (targetSegment?.prompt || videoLabState.prompt || `Cinematic scene`);
    setMultiStageState(prev => ({ ...prev, isGenerating: true, error: null, segments: prev.segments.map(s => s.index === index ? { ...s, status: 'generating', errorMessage: null } : s) }));
    try {
      const prevSeg = multiStageState.segments[index - 1];
      let videoUrl: string | null;
      let thumbnailDataUrl: string | null = null;
      if (index === 0 || !prevSeg?.thumbnailDataUrl) {
        videoUrl = await generateSegmentVideo(finalPrompt, videoLabState.format, index, options?.durationSeconds || 6, (attempt, max) => setMultiStageState(prev => ({ ...prev, pollingProgress: { attempt, max } })), options);
      } else {
        const jpegBase64 = (await convertToJpeg(prevSeg.thumbnailDataUrl)).split(',')[1];
        videoUrl = await animateImageWithVeo(jpegBase64, finalPrompt, videoLabState.format, (attempt, max) => setMultiStageState(prev => ({ ...prev, pollingProgress: { attempt, max } })), 6, options);
      }
      if (!videoUrl) throw new Error('No video URL returned');
      try { thumbnailDataUrl = await extractLastFrame(videoUrl); } catch {}
      setMultiStageState(prev => ({ ...prev, isGenerating: false, pollingProgress: null, segments: prev.segments.map(s => s.index === index ? { ...s, status: 'completed', videoUrl, thumbnailDataUrl } : s) }));
    } catch (err: any) {
      setMultiStageState(prev => ({ ...prev, isGenerating: false, pollingProgress: null, segments: prev.segments.map(s => s.index === index ? { ...s, status: 'error', errorMessage: err.message } : s), error: err.message }));
    }
  };

  const handleCompose = async (filter: string = '') => {
    const ordered = multiStageState.segmentOrder.map(id => multiStageState.segments.find(s => s.id === id)).filter((s): s is VideoSegment => !!s && s.status === 'completed' && !!s.videoUrl);
    if (!ordered.length) return;
    setMultiStageState(prev => ({ ...prev, isComposing: true, error: null }));
    try {
      const { composeVideos } = await import('../utils/videoComposer');
      const blob = await composeVideos({ segments: ordered.map(s => s.videoUrl!), transition: multiStageState.transition, transitionDurationSeconds: multiStageState.transitionDurationSeconds, outputFrameRate: 30, textLayers: multiStageState.textLayers, imageLayers: multiStageState.imageLayers, audioLayers: multiStageState.audioLayers, segmentEditProps: multiStageState.segmentEditProps, segmentIds: ordered.map(s => s.id), globalFilter: filter });
      const composedUrl = URL.createObjectURL(blob);
      setMultiStageState(prev => ({ ...prev, isComposing: false, composedVideoUrl: composedUrl }));
      setVideoLabState(prev => ({ ...prev, videoUrl: composedUrl }));
    } catch (err: any) { setMultiStageState(prev => ({ ...prev, isComposing: false, error: err.message })); }
  };

  const handleAddTextLayer = () => { const id = `text_${Date.now()}`; const newLayer: TextLayer = { id, text: 'Nuevo Texto', startSecond: 0, durationSeconds: 6, enterAnimation: 'fadeIn', enterDurationSeconds: 0.8, exitAnimation: 'fadeOut', exitDurationSeconds: 0.6, position: 'center', fontSize: 0.07, color: '#ffffff', fontWeight: '900', fontFamily: 'sans-serif', shadow: true, background: false, backgroundColor: 'rgba(0,0,0,0.65)' }; setMultiStageState(prev => ({ ...prev, textLayers: [...prev.textLayers, newLayer] })); };
  const handleUpdateTextLayer = (id: string, updates: Partial<TextLayer>) => { setMultiStageState(prev => ({ ...prev, textLayers: prev.textLayers.map(l => l.id === id ? { ...l, ...updates } : l) })); };
  const handleRemoveTextLayer = (id: string) => { setMultiStageState(prev => ({ ...prev, textLayers: prev.textLayers.filter(l => l.id !== id) })); };
  const handleAddImageLayer = () => { const id = `img_${Date.now()}`; const newLayer: ImageLayer = { id, type: 'image', src: '', startSecond: 0, durationSeconds: multiStageState.totalDuration, position: 'bottomRight', widthFraction: 0.15, opacity: 0.9, enterAnimation: 'fadeIn', exitAnimation: 'none' }; setMultiStageState(prev => ({ ...prev, imageLayers: [...(prev.imageLayers || []), newLayer] })); };
  const handleUpdateImageLayer = (id: string, updates: Partial<ImageLayer>) => { setMultiStageState(prev => ({ ...prev, imageLayers: (prev.imageLayers || []).map(l => l.id === id ? { ...l, ...updates } : l) })); };
  const handleRemoveImageLayer = (id: string) => { setMultiStageState(prev => ({ ...prev, imageLayers: (prev.imageLayers || []).filter(l => l.id !== id) })); };
  const handleAddAudioLayer = (layerData: Omit<AudioLayer, 'id'>) => { const id = `aud_${Date.now()}`; setMultiStageState(prev => ({ ...prev, audioLayers: [...(prev.audioLayers || []), { id, ...layerData }] })); };
  const handleUpdateAudioLayer = (id: string, updates: Partial<AudioLayer>) => { setMultiStageState(prev => ({ ...prev, audioLayers: (prev.audioLayers || []).map(l => l.id === id ? { ...l, ...updates } : l) })); };
  const handleRemoveAudioLayer = (id: string) => { setMultiStageState(prev => ({ ...prev, audioLayers: (prev.audioLayers || []).filter(l => l.id !== id) })); };
  const handleUpdateSegmentEditProps = (segId: string, updates: Partial<SegmentEditProps>) => { setMultiStageState(prev => ({ ...prev, segmentEditProps: { ...(prev.segmentEditProps || {}), [segId]: { trimStartSeconds: 0, trimEndSeconds: 0, playbackSpeed: 1, brightness: 1, contrast: 1, saturation: 1, ...(prev.segmentEditProps?.[segId] || {}), ...updates } } })); };
  const handleReorderSegments = (newOrder: string[]) => { setMultiStageState(prev => ({ ...prev, segmentOrder: newOrder })); };
  const canUseMultiStage = isSuperAdmin || currentUser?.subscription?.plan === 'Agency';

  const handleUrlExtract = async () => {
    if (!urlExtractState.url.trim() || urlExtractState.isExtracting) return;
    setUrlExtractState(prev => ({ ...prev, isExtracting: true, error: null, extracted: null, applied: false }));
    try {
      const data = await extractFromUrl(urlExtractState.url.trim());
      if ((data as any).error) throw new Error((data as any).error);
      setUrlExtractState(prev => ({ ...prev, isExtracting: false, extracted: data as any }));
    } catch (err: any) { setUrlExtractState(prev => ({ ...prev, isExtracting: false, error: err.message })); }
  };

  const handleApplyUrlData = () => {
    if (!urlExtractState.extracted) return;
    const { videoPrompt, ttsScript, suggestedVoice } = urlExtractState.extracted;
    setVideoLabState(prev => ({ ...prev, prompt: videoPrompt || prev.prompt, ttsText: ttsScript || prev.ttsText, ttsVoice: suggestedVoice || prev.ttsVoice }));
    setUrlExtractState(prev => ({ ...prev, applied: true }));
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'style' | 'subject') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const jpeg = await convertToJpeg(event.target?.result as string);
      setVideoLabState(prev => ({ ...prev, [type === 'style' ? 'styleImage' : 'subjectImage']: jpeg }));
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateCaptions = async (audioUrl: string) => {
    setIsGeneratingCaptions(true); setCaptionProgress(null);
    try {
      const { generateCaptions: genCaps } = await import('../utils/whisperCaptions');
      const captions = await genCaps(audioUrl, { model: 'gemini', onProgress: (stage: string, pct: number) => setCaptionProgress({ stage, pct }) });
      setVideoLabCaptions(captions);
    } catch (err: any) { console.error('[Captions]', err); }
    finally { setIsGeneratingCaptions(false); setCaptionProgress(null); }
  };

  return (
    <div className="w-full space-y-8">
      <motion.div key="video-lab" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-12 bg-white/5 p-8 md:p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-2xl">
        {/* Header */}
        <div className="lg:col-span-12 mb-8">
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] mb-4 block">{language === 'es' ? 'Video AI' : 'AI Video'}</span>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">Prompt to AI <br /><span className="bg-gradient-to-r from-[#ff477b] to-purple-500 bg-clip-text text-transparent">Cinematic Video</span>.</h1>
        </div>

        {/* URL → Video */}
        <div className="lg:col-span-12 mb-2">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <button onClick={() => setUrlExtractState(prev => ({ ...prev, isOpen: !prev.isOpen }))} className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.03] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#ff477b]/10 border border-[#ff477b]/20 flex items-center justify-center"><Globe className="w-4 h-4 text-[#ff477b]" /></div>
                <div className="text-left">
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#ff477b]">URL → Video</p>
                  <p className="text-[11px] text-white/30 font-light">Pega la URL de tu producto y Gemini auto-genera el video prompt</p>
                </div>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform", urlExtractState.isOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {urlExtractState.isOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-6 pb-6 space-y-4">
                    <div className="flex gap-3">
                      <input type="url" value={urlExtractState.url} onChange={e => setUrlExtractState(prev => ({ ...prev, url: e.target.value, error: null, extracted: null, applied: false }))} onKeyDown={e => e.key === 'Enter' && handleUrlExtract()} placeholder="https://miproducto.com/landing" className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#ff477b]/40 transition-colors" />
                      <button onClick={handleUrlExtract} disabled={!urlExtractState.url.trim() || urlExtractState.isExtracting} className="px-5 py-3 bg-[#ff477b] text-white text-[11px] font-black uppercase tracking-widest rounded-xl disabled:opacity-40 hover:bg-[#ff2060] transition-colors flex items-center gap-2">
                        {urlExtractState.isExtracting ? <><RefreshCw className="w-3 h-3 animate-spin" /> Analizando...</> : <><Sparkles className="w-3 h-3" /> Extraer</>}
                      </button>
                    </div>
                    {urlExtractState.error && <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl"><AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" /><p className="text-[11px] text-rose-300">{urlExtractState.error}</p></div>}
                    {urlExtractState.extracted && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                          <p className="text-base font-bold text-white">{urlExtractState.extracted.productName}</p>
                          {urlExtractState.extracted.keyBenefits?.length > 0 && <div className="flex flex-wrap gap-2">{urlExtractState.extracted.keyBenefits.map((b, i) => <span key={i} className="text-[11px] px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-white/60">{b}</span>)}</div>}
                          <div className="p-3 bg-black/20 rounded-xl border border-white/5"><p className="text-[12px] text-white/70 italic">"{urlExtractState.extracted.ttsScript}"</p></div>
                        </div>
                        {urlExtractState.applied ? <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-black uppercase tracking-widest"><CheckCircle2 className="w-4 h-4" /> Campos rellenados</div> :
                          <button onClick={handleApplyUrlData} className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2"><Wand2 className="w-3.5 h-3.5 text-[#ff477b]" /> Usar estos datos</button>}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* LEFT: Inputs */}
        <div className="lg:col-span-5 space-y-8">
          {/* Prompt */}
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] block">{language === 'es' ? 'Prompt Cinematográfico' : 'Cinematic Prompt'}</label>
            <textarea value={videoLabState.prompt} onChange={e => setVideoLabState(prev => ({ ...prev, prompt: e.target.value }))} placeholder={language === 'es' ? 'Describe tu visión cinematográfica...' : 'Describe your cinematic vision...'} className="w-full h-32 bg-white/[0.03] border border-white/10 rounded-3xl px-6 py-5 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-[#ff477b]/40 transition-colors leading-relaxed" />
          </div>

          {/* Platform & Format */}
          <div className="space-y-4">
            <label className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40 block">{language === 'es' ? 'Plataforma & Formato' : 'Platform & Format'}</label>
            <PlatformFormatSelector platform={videoLabState.platform} format={videoLabState.format} onPlatformChange={p => setVideoLabState(prev => ({ ...prev, platform: p }))} onFormatChange={f => setVideoLabState(prev => ({ ...prev, format: f as '9:16' | '16:9' }))} />
          </div>

          {/* Engine toggle */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            <span className="text-[11px] font-black uppercase tracking-widest text-white/40">{language === 'es' ? 'Motor IA' : 'AI Engine'}</span>
            <div className="flex gap-2 ml-auto">
              {(['veo', 'ltx'] as const).map(model => (
                <button key={model} onClick={() => setVideoLabState(prev => ({ ...prev, videoModel: model }))} className={cn("px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all", videoLabState.videoModel === model ? "bg-[#ff477b] text-white" : "bg-white/5 text-white/40 hover:bg-white/10")}>{model === 'veo' ? 'Veo 3 Cinematic' : 'LTX Video'}</button>
              ))}
            </div>
          </div>

          {/* Voiceover */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40">{language === 'es' ? 'Locución IA (Opcional)' : 'AI Voiceover (Optional)'}</label>
              <button onClick={() => setShowAdvancedVoice(!showAdvancedVoice)} className="text-[10px] text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors flex items-center gap-1"><Settings2 className="w-3 h-3" /> Avanzado</button>
            </div>
            <textarea value={videoLabState.ttsText} onChange={e => setVideoLabState(prev => ({ ...prev, ttsText: e.target.value }))} placeholder={language === 'es' ? 'Guion para la voz en off...' : 'Voiceover script...'} className="w-full h-24 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-[#ff477b]/40 transition-colors leading-relaxed" />
            <AnimatePresence>
              {showAdvancedVoice && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1 block">Voz</label>
                      <select value={videoLabState.ttsVoice} onChange={e => setVideoLabState(prev => ({ ...prev, ttsVoice: e.target.value }))} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff477b]/40">
                        {VOICE_LIST.map(v => <option key={v} value={v} className="bg-[#0a0f1e]">{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-1 block">Idioma</label>
                      <select value={videoLabState.ttsLanguage} onChange={e => setVideoLabState(prev => ({ ...prev, ttsLanguage: e.target.value }))} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff477b]/40">
                        {['Spanish', 'English', 'Portuguese', 'French', 'German', 'Italian'].map(l => <option key={l} value={l} className="bg-[#0a0f1e]">{l}</option>)}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Advanced Cinema */}
          <div>
            <button onClick={() => setShowAdvancedCinema(!showAdvancedCinema)} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors">
              <Settings2 className="w-3.5 h-3.5" /> {language === 'es' ? 'Opciones Cinematográficas' : 'Cinematic Options'}
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showAdvancedCinema && "rotate-180")} />
            </button>
            <AnimatePresence>
              {showAdvancedCinema && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4 space-y-4">
                  {(['motionIntensity', 'cameraMotionSpeed', 'styleReferencePower'] as const).map(key => (
                    <div key={key} className="space-y-2 p-4 rounded-2xl bg-black/20 border border-white/5">
                      <div className="flex justify-between">
                        <span className="text-[11px] font-black text-white/40">{key === 'motionIntensity' ? 'Intensidad Movimiento' : key === 'cameraMotionSpeed' ? 'Velocidad Cámara' : 'Poder de Estilo'}</span>
                        <span className="text-[11px] font-black text-white/60">{(videoLabState[key] * 100).toFixed(0)}%</span>
                      </div>
                      <input type="range" min="0" max="1" step="0.1" value={videoLabState[key]} onChange={e => setVideoLabState(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))} className="w-full accent-[#ff477b] h-1 bg-white/5 rounded-full appearance-none cursor-pointer" />
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5">
                    <span className="text-[11px] font-black text-white/40">Auto-Subtítulos (Whisper)</span>
                    <button onClick={() => setVideoLabState(prev => ({ ...prev, autoSubtitles: !prev.autoSubtitles }))} className={cn("relative w-10 h-5 rounded-full transition-all duration-300", videoLabState.autoSubtitles ? "bg-[#ff477b]" : "bg-white/10")}>
                      <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300", videoLabState.autoSubtitles ? "left-5" : "left-0.5")} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(['style', 'subject'] as const).map(type => (
                      <div key={type}>
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">{type === 'style' ? 'Ref. Estilo' : 'Ref. Sujeto'}</label>
                        {videoLabState[type === 'style' ? 'styleImage' : 'subjectImage'] ? (
                          <div className="relative"><img src={videoLabState[type === 'style' ? 'styleImage' : 'subjectImage']!} className="w-full h-20 object-cover rounded-xl" alt="" /><button onClick={() => setVideoLabState(prev => ({ ...prev, [type === 'style' ? 'styleImage' : 'subjectImage']: null }))} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white/60 hover:text-white text-xs">×</button></div>
                        ) : (
                          <label className="flex items-center justify-center h-20 border border-dashed border-white/20 rounded-xl cursor-pointer hover:border-[#ff477b]/40 transition-colors text-white/20 text-xs">+ Subir<input type="file" accept="image/*" className="hidden" onChange={e => handleReferenceUpload(e, type)} /></label>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Brand Context */}
          {hasBrandContext && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-cyan-400">Contexto de Marca</p>
                <p className="text-[10px] text-white/40 mt-0.5">{brandProfile?.brandName}</p>
              </div>
              <button onClick={() => setUseBrandContext(!useBrandContext)} className={cn("relative w-10 h-5 rounded-full transition-all duration-300", useBrandContext ? "bg-cyan-500" : "bg-white/10")}>
                <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-300", useBrandContext ? "left-5" : "left-0.5")} />
              </button>
            </div>
          )}

          {/* Generate */}
          <button onClick={handleVideoGenerate} disabled={videoLabState.isGenerating || (!videoLabState.prompt && !videoLabState.ttsText)} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#ff477b] to-purple-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed">
            {videoLabState.isGenerating ? <><RefreshCw className="w-5 h-5 animate-spin" /><span>{videoLabState.pollingProgress ? `Renderizando ${videoLabState.pollingProgress.attempt}/${videoLabState.pollingProgress.max}…` : (language === 'es' ? 'Generando Video IA…' : 'Generating AI Video…')}</span></> : <><Video className="w-5 h-5" />{language === 'es' ? 'Generar Video IA' : 'Generate AI Video'}</>}
          </button>

          {/* Multi-Stage */}
          {canUseMultiStage && (
            <div className="border border-white/5 rounded-3xl overflow-hidden">
              <button onClick={() => setMultiStageState(prev => ({ ...prev, isActive: !prev.isActive }))} className="w-full flex items-center justify-between px-6 py-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-3"><FileVideo className="w-4 h-4 text-purple-400" /><span className="text-[11px] font-black uppercase tracking-widest text-purple-400">Video Multi-Escena (Agency)</span></div>
                <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform", multiStageState.isActive && "rotate-180")} />
              </button>
              <AnimatePresence>
                {multiStageState.isActive && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-6 pb-6 pt-2 space-y-4">
                      <div className="flex items-center gap-4">
                        <input type="range" min="6" max="60" step="6" value={multiStageState.totalDuration} onChange={e => setMultiStageState(prev => ({ ...prev, totalDuration: parseInt(e.target.value) }))} className="flex-1 accent-purple-500" />
                        <span className="text-sm font-black text-purple-400 w-16 text-center">{multiStageState.totalDuration}s</span>
                      </div>
                      <button onClick={handleMultiStageGenerate} disabled={multiStageState.isGenerating || (!videoLabState.prompt && !videoLabState.ttsText)} className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {multiStageState.isGenerating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generando...</> : <><FileVideo className="w-4 h-4" /> Generar Video Largo</>}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* RIGHT: Preview */}
        <div className="lg:col-span-7 space-y-6">
          {videoLabState.error && (
            <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <p className="text-sm text-rose-300">{videoLabState.error}</p>
            </div>
          )}

          {multiStageState.isActive && multiStageState.segments.length > 0 && (
            <MultiStageVideoComposer state={multiStageState} language={language} isSuperAdmin={isSuperAdmin} onRetrySegment={handleRetrySegment} onCompose={handleCompose} onAddSegment={() => { const ns: VideoSegment = { id: `seg_${Date.now()}`, index: multiStageState.segments.length, prompt: videoLabState.prompt || 'Nueva escena', status: 'pending', operationName: null, videoUrl: null, thumbnailDataUrl: null, errorMessage: null, durationSeconds: 6, type: 'video' }; setMultiStageState(prev => ({ ...prev, segments: [...prev.segments, ns], segmentOrder: [...prev.segmentOrder, ns.id] })); }} onAddTextLayer={handleAddTextLayer} onUpdateTextLayer={handleUpdateTextLayer} onRemoveTextLayer={handleRemoveTextLayer} onAddImageLayer={handleAddImageLayer} onUpdateImageLayer={handleUpdateImageLayer} onRemoveImageLayer={handleRemoveImageLayer} onAddAudioLayer={handleAddAudioLayer} onUpdateAudioLayer={handleUpdateAudioLayer} onRemoveAudioLayer={handleRemoveAudioLayer} onUpdateSegmentEditProps={handleUpdateSegmentEditProps} onReorderSegments={handleReorderSegments} globalPrompt={videoLabState.prompt} globalFormat={videoLabState.format} />
          )}

          {videoLabState.videoUrl && !multiStageState.isActive && (
            <div className="space-y-4">
              <div className={cn("rounded-3xl overflow-hidden bg-black border border-white/10 mx-auto", videoLabState.format === '9:16' ? "max-w-[280px]" : "w-full")}>
                <video src={proxiedAssetUrl(videoLabState.videoUrl)} className="w-full" controls loop playsInline />
              </div>

              {/* Music */}
              <div className="space-y-3 p-5 rounded-3xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Music className="w-4 h-4 text-[#ff477b]" /><span className="text-[11px] font-black uppercase tracking-widest text-white/40">Música</span></div>
                  <div className="flex gap-2">
                    {(['none', 'library', 'upload'] as const).map(src => (
                      <button key={src} onClick={() => setVideoLabState(prev => ({ ...prev, musicSource: src }))} className={cn("text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full transition-all", videoLabState.musicSource === src ? "bg-[#ff477b] text-white" : "bg-white/5 text-white/30 hover:bg-white/10")}>
                        {src === 'none' ? 'Sin' : src === 'library' ? 'Biblioteca' : 'Subir'}
                      </button>
                    ))}
                  </div>
                </div>
                {videoLabState.musicSource === 'library' && (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {MUSIC_LIBRARY.map(track => (
                      <button key={track.id} onClick={() => setVideoLabState(prev => ({ ...prev, selectedMusicUrl: track.url }))} className={cn("text-left p-3 rounded-xl border transition-all text-[11px]", videoLabState.selectedMusicUrl === track.url ? "border-[#ff477b]/40 bg-[#ff477b]/10 text-white" : "border-white/5 bg-white/[0.02] text-white/50 hover:bg-white/[0.04]")}>
                        <p className="font-black">{track.name}</p>
                        <p className="text-[10px] opacity-60">{track.category}</p>
                        {videoLabState.selectedMusicUrl === track.url && <Check className="w-3 h-3 text-[#ff477b] mt-1" />}
                      </button>
                    ))}
                  </div>
                )}
                {videoLabState.musicSource !== 'none' && (videoLabState.selectedMusicUrl || videoLabState.uploadedMusicUrl) && (
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-4 h-4 text-white/30 shrink-0" />
                    <input type="range" min="0" max="1" step="0.05" value={videoLabState.musicVolume} onChange={e => { const vol = parseFloat(e.target.value); setVideoLabState(p => ({ ...p, musicVolume: vol })); if (videoLabMusicRef.current) videoLabMusicRef.current.volume = vol; }} className="flex-1 accent-purple-400 h-0.5" />
                  </div>
                )}
              </div>

              {/* Voiceover offset */}
              {videoLabState.audioUrl && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-black/20 border border-white/5">
                  <Clock className="w-4 h-4 text-[#ff477b] shrink-0" />
                  <span className="text-[11px] font-black uppercase text-white/40 w-24 shrink-0">+{videoLabState.voiceoverOffset}s</span>
                  <input type="range" min="0" max="10" step="0.5" value={videoLabState.voiceoverOffset} onChange={e => setVideoLabState(p => ({ ...p, voiceoverOffset: parseFloat(e.target.value) }))} className="flex-1 accent-[#ff477b] h-0.5" />
                </div>
              )}

              {/* Downloads */}
              <div className="space-y-3">
                {canMixInBrowser() && (videoLabState.audioUrl || (videoLabState.musicSource !== 'none' && (videoLabState.selectedMusicUrl || videoLabState.uploadedMusicUrl))) && (
                  <button disabled={videoLabState.isMixing} onClick={async () => {
                    setVideoLabState(p => ({ ...p, isMixing: true, mixProgress: 0 }));
                    try {
                      await mixAndDownload({ videoUrl: videoLabState.videoUrl!, voiceoverUrl: videoLabState.audioUrl, musicUrl: videoLabState.musicSource !== 'none' ? (videoLabState.selectedMusicUrl || videoLabState.uploadedMusicUrl) : null, musicVolume: videoLabState.musicVolume, filename: `video_mix_${Date.now()}.webm`, onProgress: pct => setVideoLabState(p => ({ ...p, mixProgress: pct })) });
                    } catch (e: any) { alert(e.message); }
                    finally { setVideoLabState(p => ({ ...p, isMixing: false, mixProgress: 0 })); }
                  }} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-[#ff477b] to-purple-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60">
                    {videoLabState.isMixing ? <><RefreshCw className="w-5 h-5 animate-spin" /> {Math.round(videoLabState.mixProgress)}%</> : <><Download className="w-5 h-5" /> Mezclar y Descargar</>}
                  </button>
                )}
                <a href={proxiedAssetUrl(videoLabState.videoUrl)} download={`video_${Date.now()}.mp4`} className="w-full flex items-center justify-center gap-3 bg-white text-[#0a0f1e] py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white/90 active:scale-[0.98] transition-all">
                  <Download className="w-5 h-5" /> {language === 'es' ? 'Descargar Video' : 'Download Video'}
                </a>
                <TechnicalBriefButton prompt={videoLabState.expandedPrompt} />
                {(videoLabState.audioUrl || videoLabState.videoUrl) && (
                  <button disabled={isGeneratingCaptions} onClick={() => handleGenerateCaptions((videoLabState.audioUrl || videoLabState.videoUrl)!)} className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 text-white py-3 rounded-2xl font-black uppercase tracking-widest text-xs border border-white/10 transition-all disabled:opacity-50">
                    {isGeneratingCaptions ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" /><span>{captionProgress ? `${captionProgress.stage} ${captionProgress.pct}%` : '...'}</span></> : <><span className="text-[#ff477b]">CC</span><span>{videoLabCaptions ? `Subtítulos listos (${videoLabCaptions.length})` : 'Generar Subtítulos'}</span></>}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!videoLabState.videoUrl && !videoLabState.isGenerating && !multiStageState.isActive && (
            <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-white/10 rounded-3xl p-12 text-center">
              <div className="w-20 h-20 rounded-3xl bg-[#ff477b]/10 border border-[#ff477b]/20 flex items-center justify-center mb-6"><Video className="w-10 h-10 text-[#ff477b]" /></div>
              <h3 className="text-xl font-black text-white mb-2">{language === 'es' ? 'Tu video aparecerá aquí' : 'Your video will appear here'}</h3>
              <p className="text-sm text-white/30">{language === 'es' ? 'Escribe un prompt y genera tu primer video cinematográfico.' : 'Write a prompt and generate your first cinematic video.'}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default VideoLabView;
