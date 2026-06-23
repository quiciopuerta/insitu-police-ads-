import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Video,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Sparkles,
  Download,
  AlertCircle,
  Wand2,
  UserRound,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { AuthUser, Language } from '../types';
import {
  masterVideo,
  removeImageBackground,
  upscaleImage,
  restoreFace,
  outpaintImage
} from '../services/ai/mediaGenerationService';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

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

interface MasteringLabViewProps {
  currentUser: AuthUser | null;
  language: Language;
}

const MasteringLabView: React.FC<MasteringLabViewProps> = ({ currentUser, language }) => {
  const t = TRANSLATIONS[language];
  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.role === 'superAdmin' ||
                  currentUser?.email === 'admin@insitu.ai' || 
                  currentUser?.email === 'sanchezfj@me.com' ||
                  currentUser?.email === 'sociopuerta@gmail.com' ||
                  currentUser?.email === 'contacto@fjsanchez.com' || 
                  currentUser?.email === 'admin@insitu.company';

  const [masterMode, setMasterMode] = useState<'video' | 'image'>('video');
  const [masteringState, setMasteringState] = useState({
    sourceVideo: null as string | null,
    masterType: 'cinematic' as 'cinematic' | 'luxury' | 'extreme',
    enhancedVideo: null as string | null,
    isProcessing: false,
    error: null as string | null,
    notImplemented: false,
  });

  const [imageMasteringState, setImageMasteringState] = useState({
    sourceImage: null as string | null,
    processedImage: null as string | null,
    isProcessing: false,
    error: null as string | null,
    activeTool: 'upscale' as 'upscale' | 'remove_bg' | 'restore_face' | 'outpaint',
  });

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
        }));
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
    } catch (err: any) {
      setImageMasteringState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: err.message 
      }));
    }
  };

  return (
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
  );
};

export default MasteringLabView;
