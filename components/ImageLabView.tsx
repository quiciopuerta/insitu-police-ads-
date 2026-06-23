import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Brain, Sparkles, Layers, CheckCircle2, 
  RefreshCw, Globe, ImageIcon, Play, ShieldCheck, Download 
} from 'lucide-react';
import JSZip from 'jszip';
import { cn } from '../lib/utils';
import ErrorDisplay from './ErrorDisplay';
import PlatformFormatSelector from './PlatformFormatSelector';

// Imports from existing services
import {
  generateMultiChannel,
  generateWithReflection,
  generateOrEditImage,
  generateFluxImage,
  generateProImage
} from '../services/ai/mediaGenerationService'; 

export interface ImageLabViewProps {
  currentUser: any;
  language: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  onAudit?: (data: { url: string; type: 'image' }) => void;
  t: any;
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
  onAnimateImage?: (jpegDataUrl: string) => void;
}

const ImageLabView: React.FC<ImageLabViewProps> = ({
  currentUser,
  language,
  isSuperAdmin,
  isAdmin,
  onAudit,
  t,
  setToast,
  onAnimateImage
}) => {
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

  const [multiFormatState, setMultiFormatState] = useState({ isGenerating: false, error: null as string | null });
  const [useBrandContext, setUseBrandContext] = useState(true);

  const brandProfile = currentUser?.brandProfile;
  const hasBrandContext = !!(brandProfile?.brandName && brandProfile?.industry && brandProfile?.toneOfVoice && brandProfile?.valueProposition);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setImageLabState(prev => ({ ...prev, sourceImage: jpeg }));
    };
    reader.readAsDataURL(file);
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
      setImageLabState(prev => ({ ...prev, [key]: jpeg }));
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

  const handleImageGenerate = async () => {
    if (!imageLabState.prompt) return;
    setImageLabState(prev => ({ ...prev, isProcessing: true, error: null }));
    try {
      const imagePrompt = brandPrefix + imageLabState.prompt;

      // Multi-Channel Generation
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

      // Reflection Loop
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

  return (
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
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
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
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReferenceUpload(e, 'style')} />
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
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleReferenceUpload(e, 'subject')} />
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
                    src={imageLabState.multiChannelResults![key as keyof typeof imageLabState.multiChannelResults]}
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
              {onAnimateImage && (
                <button
                  onClick={async () => {
                    const jpegImage = await convertToJpeg(imageLabState.resultImage!);
                    onAnimateImage(jpegImage);
                  }}
                  className="bg-amber-500/80 backdrop-blur-xl border border-amber-500/50 p-3 rounded-xl hover:bg-amber-500 transition-all flex items-center gap-2 group"
                  title={language === 'es' ? "Animar Imagen" : "Animate Image"}
                >
                  <Play className="w-5 h-5 text-white" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-white hidden group-hover:block">{language === 'es' ? 'Animar' : 'Animate'}</span>
                </button>
              )}
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
  );
};

export default ImageLabView;
