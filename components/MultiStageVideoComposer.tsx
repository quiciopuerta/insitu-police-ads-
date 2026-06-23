import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Scissors,
  Blend,
  Film,
  Layers,
  Play,
  Type,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Sparkles,
  Clock,
  SlidersHorizontal,
  Music,
  Mic,
  Volume2,
  Brain,
} from 'lucide-react';
import { mixAndDownload, canMixInBrowser } from '../utils/videoMixer';
import type {
  MultiStageVideoState,
  VideoTransition,
  Language,
  TextLayer,
  TextAnimationType,
  TextExitType,
  TextPosition,
  TextAnimationTemplate,
  ImageLayer,
  AudioLayer,
  SavedVoice,
  SegmentEditProps,
} from '../types';
import { ReelPreviewCanvas } from './reel/ReelPreviewCanvas';
import { ReelTimelineEditor } from './reel/ReelTimelineEditor';
import { ReelSegmentPanel } from './reel/ReelSegmentPanel';
import { ReelImageLayerCard } from './reel/ReelImageLayerCard';
import { proxiedAssetUrl } from '../utils/apiConfig';

interface Props {
  state: MultiStageVideoState;
  language: Language;
  onConfirmStoryboard: () => void;
  onRetrySegment: (index: number) => void;
  onTransitionChange: (t: VideoTransition) => void;
  onTransitionDurationChange?: (d: number) => void;
  onCompose: () => void;
  onAddTextLayer: () => void;
  onUpdateTextLayer: (id: string, updates: Partial<TextLayer>) => void;
  onRemoveTextLayer: (id: string) => void;
  onAddImageLayer?: () => void;
  onUpdateImageLayer?: (id: string, updates: Partial<ImageLayer>) => void;
  onRemoveImageLayer?: (id: string) => void;
  onUpdateSegmentEditProps?: (segId: string, updates: Partial<SegmentEditProps>) => void;
  onReorderSegments?: (newOrder: string[]) => void;
  savedVoices?: SavedVoice[];
  musicLibraryItems?: Array<{ id: string; name: string; category: string; url: string }>;
  onAddAudioLayer?: (layer: Omit<AudioLayer, 'id'>) => void;
  onUpdateAudioLayer?: (id: string, updates: Partial<AudioLayer>) => void;
  onRemoveAudioLayer?: (id: string) => void;
}

const TRANSITIONS: { id: VideoTransition; label: string; labelEs: string; icon: React.ReactNode }[] = [
  { id: 'cut',       label: 'Cut',      labelEs: 'Corte',   icon: <Scissors className="w-3 h-3" /> },
  { id: 'crossfade', label: 'Crossfade', labelEs: 'Fundido', icon: <Blend    className="w-3 h-3" /> },
  { id: 'dissolve',  label: 'Dissolve',  labelEs: 'Disolver', icon: <Film    className="w-3 h-3" /> },
];

const ENTER_ANIMS: { id: TextAnimationType; label: string }[] = [
  { id: 'fadeIn',         label: 'Fade'        },
  { id: 'slideFromBottom',label: '↑ Bottom'    },
  { id: 'slideFromTop',   label: '↓ Top'       },
  { id: 'slideFromLeft',  label: '→ Left'      },
  { id: 'slideFromRight', label: '← Right'     },
  { id: 'scaleIn',        label: 'Scale'       },
  { id: 'typewriter',     label: 'Typewriter'  },
];

const EXIT_ANIMS: { id: TextExitType; label: string }[] = [
  { id: 'none',          label: 'None'    },
  { id: 'fadeOut',       label: 'Fade'    },
  { id: 'slideToBottom', label: '↓ Bottom'},
  { id: 'slideToTop',    label: '↑ Top'   },
];

const ANIMATION_TEMPLATES: { id: TextAnimationTemplate; label: string; labelEs: string }[] = [
  { id: 'bounce',          label: 'Bounce',      labelEs: 'Rebote'    },
  { id: 'elastic',         label: 'Elastic',     labelEs: 'Elástico'  },
  { id: 'glitch',          label: 'Glitch',      labelEs: 'Glitch'    },
  { id: 'typewriterCursor',label: 'Typewriter+', labelEs: 'Máquina+'  },
  { id: 'wordByWord',      label: 'Word×Word',   labelEs: 'Palabra×'  },
];

const STYLE_PRESETS: { label: string; color: string; strokeColor?: string; fontWeight: TextLayer['fontWeight']; background: boolean; backgroundColor: string; shadow: boolean }[] = [
  { label: 'White',   color: '#ffffff', fontWeight: '900',    background: false, backgroundColor: 'rgba(0,0,0,0)', shadow: true  },
  { label: 'Black',   color: '#000000', strokeColor: '#ffffff', fontWeight: '900', background: false, backgroundColor: 'rgba(0,0,0,0)', shadow: false },
  { label: 'Pill',    color: '#ffffff', fontWeight: 'bold',   background: true,  backgroundColor: 'rgba(0,0,0,0.65)', shadow: false },
  { label: 'Neon',    color: '#ff477b', strokeColor: '#ffffff', fontWeight: '900', background: false, backgroundColor: 'rgba(0,0,0,0)', shadow: true  },
  { label: 'Gold',    color: '#fbbf24', strokeColor: '#92400e', fontWeight: '900', background: false, backgroundColor: 'rgba(0,0,0,0)', shadow: true  },
  { label: 'Caption', color: '#ffffff', fontWeight: 'normal', background: true,  backgroundColor: 'rgba(0,0,0,0.75)', shadow: false },
];

const POSITIONS: { id: TextPosition; label: string }[] = [
  { id: 'topLeft',      label: '↖' },
  { id: 'topCenter',    label: '↑' },
  { id: 'topRight',     label: '↗' },
  { id: 'middleLeft',   label: '←' },
  { id: 'center',       label: '·' },
  { id: 'middleRight',  label: '→' },
  { id: 'bottomLeft',   label: '↙' },
  { id: 'bottomCenter', label: '↓' },
  { id: 'bottomRight',  label: '↘' },
];

// ------------------------------------------------------------------ //
// TextLayerCard — editor for a single text layer
// ------------------------------------------------------------------ //
const TextLayerCard: React.FC<{
  layer: TextLayer;
  totalDuration: number;
  language: Language;
  onUpdate: (updates: Partial<TextLayer>) => void;
  onRemove: () => void;
}> = ({ layer, totalDuration, language, onUpdate, onRemove }) => {
  const [expanded, setExpanded] = useState(false);
  const t = language === 'es';

  const applyPreset = (preset: typeof STYLE_PRESETS[0]) => {
    onUpdate({
      color:           preset.color,
      strokeColor:     preset.strokeColor,
      fontWeight:      preset.fontWeight,
      background:      preset.background,
      backgroundColor: preset.backgroundColor,
      shadow:          preset.shadow,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        <Type className="w-3 h-3 text-[#ff477b] flex-shrink-0" />
        <input
          value={layer.text}
          onChange={e => onUpdate({ text: e.target.value })}
          placeholder={t ? 'Escribe tu texto...' : 'Type your text...'}
          className="flex-1 bg-transparent text-white text-[11px] font-bold placeholder-white/20 outline-none min-w-0"
        />
        <button
          onClick={() => setExpanded(v => !v)}
          className="p-1 text-white/30 hover:text-white/60 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <button
          onClick={onRemove}
          className="p-1 text-white/20 hover:text-rose-400 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-3">

          {/* Position grid */}
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/30">
              {t ? 'Posición' : 'Position'}
            </p>
            <div className="grid grid-cols-3 gap-1 w-24">
              {POSITIONS.map(pos => (
                <button
                  key={pos.id}
                  onClick={() => onUpdate({ position: pos.id })}
                  className={`h-7 rounded-lg text-[11px] transition-all ${
                    layer.position === pos.id
                      ? 'bg-[#ff477b] text-white'
                      : 'bg-white/5 text-white/30 hover:bg-white/10'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/30">
              {t ? 'Inicio' : 'Start'} / {t ? 'Duración' : 'Duration'}
            </p>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 flex-1">
                <span className="text-[11px] text-white/30">0s</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, totalDuration - 1)}
                  step={0.5}
                  value={layer.startSecond}
                  onChange={e => onUpdate({ startSecond: parseFloat(e.target.value) })}
                  className="flex-1 accent-[#ff477b]"
                />
                <span className="text-[11px] text-white/50 w-6 text-right">{layer.startSecond}s</span>
              </div>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="range"
                  min={1}
                  max={Math.max(1, totalDuration - layer.startSecond)}
                  step={0.5}
                  value={layer.durationSeconds}
                  onChange={e => onUpdate({ durationSeconds: parseFloat(e.target.value) })}
                  className="flex-1 accent-[#ff477b]"
                />
                <span className="text-[11px] text-white/50 w-6 text-right">{layer.durationSeconds}s</span>
              </div>
            </div>
          </div>

          {/* Enter animation */}
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/30">
              {t ? 'Entrada' : 'Enter'}
            </p>
            <div className="flex flex-wrap gap-1">
              {ENTER_ANIMS.map(a => (
                <button
                  key={a.id}
                  onClick={() => onUpdate({ enterAnimation: a.id })}
                  className={`px-2 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                    layer.enterAnimation === a.id
                      ? 'bg-[#ff477b] text-white'
                      : 'bg-white/5 text-white/30 hover:bg-white/10'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exit animation */}
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/30">
              {t ? 'Salida' : 'Exit'}
            </p>
            <div className="flex flex-wrap gap-1">
              {EXIT_ANIMS.map(a => (
                <button
                  key={a.id}
                  onClick={() => onUpdate({ exitAnimation: a.id })}
                  className={`px-2 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                    layer.exitAnimation === a.id
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/30 hover:bg-white/10'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Animation templates */}
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/30">
              {t ? 'Template' : 'Template'}
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onUpdate({ animationTemplate: undefined })}
                className={`px-2 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                  !layer.animationTemplate
                    ? 'bg-violet-500 text-white'
                    : 'bg-white/5 text-white/30 hover:bg-white/10'
                }`}
              >
                {t ? 'Manual' : 'Manual'}
              </button>
              {ANIMATION_TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => onUpdate({ animationTemplate: tmpl.id })}
                  className={`px-2 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                    layer.animationTemplate === tmpl.id
                      ? 'bg-violet-500 text-white'
                      : 'bg-white/5 text-white/30 hover:bg-white/10'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5 inline mr-1" />
                  {t ? tmpl.labelEs : tmpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style presets */}
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/30">
              {t ? 'Estilo' : 'Style'}
            </p>
            <div className="flex flex-wrap gap-1">
              {STYLE_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className="px-2 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 transition-all"
                  style={{ color: preset.color === '#000000' ? '#888' : preset.color }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font size */}
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/30">
              {t ? 'Tamaño' : 'Size'} ({Math.round(layer.fontSize * 100)}%)
            </p>
            <input
              type="range"
              min={0.03}
              max={0.15}
              step={0.005}
              value={layer.fontSize}
              onChange={e => onUpdate({ fontSize: parseFloat(e.target.value) })}
              className="w-full accent-[#ff477b]"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ------------------------------------------------------------------ //
// Main component
// ------------------------------------------------------------------ //
export const MultiStageVideoComposer: React.FC<Props> = ({
  state,
  language,
  onConfirmStoryboard,
  onRetrySegment,
  onTransitionChange,
  onTransitionDurationChange,
  onCompose,
  onAddTextLayer,
  onUpdateTextLayer,
  onRemoveTextLayer,
  onAddImageLayer,
  onUpdateImageLayer,
  onRemoveImageLayer,
  onUpdateSegmentEditProps,
  onReorderSegments,
  savedVoices,
  musicLibraryItems,
  onAddAudioLayer,
  onUpdateAudioLayer,
  onRemoveAudioLayer,
}) => {
  const t = language === 'es';
  const allCompleted = (state.segments || []).length > 0 && state.segments.every(s => s.status === 'completed');

  const hasError = (state.segments || []).some(s => s.status === 'error');

  const [selectedSegId, setSelectedSegId] = useState<string | null>(null);
  const [isTimelineDragging, setIsTimelineDragging] = useState(false);

  // Mix state for Phase C audio panel
  const [mixVoiceUrl, setMixVoiceUrl] = useState<string>('');
  const [mixMusicUrl, setMixMusicUrl] = useState<string>('');
  const [mixMusicVolume, setMixMusicVolume] = useState(0.4);
  const [isMixing, setIsMixing] = useState(false);

  // Audio preview refs (for sync with video preview)
  const voiceoverPreviewRef = React.useRef<HTMLAudioElement>(null);
  const musicPreviewRef = React.useRef<HTMLAudioElement>(null);
  const videoPreviewRef = React.useRef<HTMLVideoElement>(null);

  // Sync music preview volume
  React.useEffect(() => {
    if (musicPreviewRef.current) {
      musicPreviewRef.current.volume = mixMusicVolume;
    }
  }, [mixMusicVolume]);

  // Phase C: Composition result
  if (state.composedVideoUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="p-1 bg-gradient-to-r from-[#ff477b]/20 to-purple-500/20 rounded-3xl">
          <video
            ref={videoPreviewRef}
            src={state.composedVideoUrl}
            controls
            autoPlay
            className="w-full rounded-[22px] bg-black"
            style={{ maxHeight: 420 }}
            onPlay={() => {
              voiceoverPreviewRef.current?.play().catch(() => {});
              musicPreviewRef.current?.play().catch(() => {});
            }}
            onPause={() => {
              voiceoverPreviewRef.current?.pause();
              musicPreviewRef.current?.pause();
            }}
            onSeeked={(e) => {
              const t = e.currentTarget.currentTime;
              if (voiceoverPreviewRef.current) voiceoverPreviewRef.current.currentTime = t;
              if (musicPreviewRef.current) musicPreviewRef.current.currentTime = t;
            }}
          />
        </div>
        {/* Audio elements for preview sync (hidden) */}
        {mixVoiceUrl && (
          <audio ref={voiceoverPreviewRef} src={mixVoiceUrl} style={{ display: 'none' }} />
        )}
        {mixMusicUrl && (
          <audio ref={musicPreviewRef} src={mixMusicUrl} loop style={{ display: 'none' }} />
        )}

        <div className="flex gap-3">
          <a
            href={state.composedVideoUrl}
            download="video_compuesto.webm"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-[#ff477b] to-[#ff6b35] text-white text-[11px] font-black uppercase tracking-widest"
          >
            <Download className="w-4 h-4" />
            {t ? 'Descargar WebM' : 'Download WebM'}
          </a>
        </div>


        <p className="text-center text-[11px] text-white/20 uppercase tracking-widest">
          {t ? 'Formato WebM · Compatible con navegadores modernos' : 'WebM format · Compatible with modern browsers'}
        </p>
      </motion.div>
    );
  }

  // Phase C: Composing in progress
  if (state.isComposing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#ff477b]/30 border-t-[#ff477b] animate-spin" />
        <p className="text-white/50 text-sm">
          {t ? 'Componiendo segmentos con textos y transiciones...' : 'Composing segments with text & transitions...'}
        </p>
      </div>
    );
  }

  // Phase A: Narrative Planning
  if (state.isPlanning) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#ff477b] to-[#ff6b35] p-[2px] animate-pulse">
          <div className="w-full h-full rounded-full bg-black/40 flex items-center justify-center backdrop-blur-xl">
             <Brain className="w-8 h-8 text-[#ff477b]" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white">
            {t ? 'Planificación Narrativa' : 'Narrative Planning'}
          </h3>
          <p className="text-white/40 text-sm max-w-sm">
            {t ? 'Gemini está analizando tu prompt para crear una estructura dramática óptima.' : 'Gemini is analyzing your prompt to create an optimal dramatic structure.'}
          </p>
        </div>
        <div className="flex gap-1.5">
           {[0, 1, 2].map(i => (
             <motion.div 
               key={i}
               animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
               transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
               className="w-2 h-2 rounded-full bg-[#ff477b]"
             />
           ))}
        </div>
      </div>
    );
  }

  // Phase B: Storyboard review
  if (!state.isGenerating && allCompleted && !state.storyboardConfirmed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-[#ff477b]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-white/60">
            {t ? 'Revisar Storyboard' : 'Review Storyboard'}
          </span>
          <span className="ml-auto text-[11px] text-white/30 uppercase tracking-widest">
            {state.segments.length} {t ? 'segmentos' : 'segments'} · {state.totalDuration}s
          </span>
        </div>

        {/* Narrative reasoning badge if available */}
        {state.reasoningText && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 bg-[#ff477b]/5 border border-[#ff477b]/20 rounded-2xl flex gap-3 items-start"
          >
             <Brain className="w-4 h-4 text-[#ff477b] mt-0.5 flex-shrink-0" />
             <p className="text-[11px] leading-relaxed text-[#ff477b]/80 italic">
               <strong>{t ? 'ENFOQUE NARRATIVO:' : 'NARRATIVE APPROACH:'}</strong> {state.reasoningText}
             </p>
          </motion.div>
        )}

        {/* Horizontal storyboard strip */}
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${(state.segments || []).length}, 1fr)` }}>
          {(state.segments || []).map((seg) => (
            <div key={seg.id} className="space-y-2">
              <div className="relative aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/10">
                {seg.thumbnailDataUrl ? (
                  <img
                    src={seg.thumbnailDataUrl}
                    alt={`Segment ${seg.index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : seg.videoUrl ? (
                  <video
                    src={proxiedAssetUrl(seg.videoUrl)}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-6 h-6 text-white/20" />
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-[11px] font-black uppercase tracking-widest text-white/70">
                  {t ? 'Seg' : 'Seg'} {seg.index + 1} · {seg.durationSeconds}s
                </div>
                {seg.videoUrl && (
                  <a
                    href={proxiedAssetUrl(seg.videoUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40"
                  >
                    <Play className="w-6 h-6 text-white" />
                  </a>
                )}
              </div>
              <button
                onClick={() => onRetrySegment(seg.index)}
                className="w-full py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-black uppercase tracking-widest text-white/30 hover:text-white/60 transition-all"
              >
                <RefreshCw className="w-2.5 h-2.5 inline mr-1" />
                {t ? 'Regenerar' : 'Retry'}
              </button>
            </div>
          ))}
        </div>

        {/* Transition picker */}
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-white/30">
            {t ? 'Tipo de Transición' : 'Transition Type'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {TRANSITIONS.map((tr) => (
              <button
                key={tr.id}
                onClick={() => onTransitionChange(tr.id)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  state.transition === tr.id
                    ? 'bg-gradient-to-r from-[#ff477b] to-[#ff6b35] text-white'
                    : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60'
                }`}
              >
                {tr.icon}
                {t ? tr.labelEs : tr.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Text Overlays ── */}
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="w-3.5 h-3.5 text-[#ff477b]" />
              <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
                {t ? 'Textos Animados' : 'Animated Text'}
              </p>
              {(state.textLayers || []).length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#ff477b]/20 text-[#ff477b] text-[11px] font-black">
                  {state.textLayers.length}
                </span>
              )}
            </div>
            <button
              onClick={onAddTextLayer}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#ff477b]/10 hover:bg-[#ff477b]/20 text-[#ff477b] text-[11px] font-black uppercase tracking-widest transition-all"
            >
              <Plus className="w-3 h-3" />
              {t ? 'Añadir' : 'Add'}
            </button>
          </div>

          {(state.textLayers || []).length === 0 && (
            <p className="text-[11px] text-white/20 text-center py-2">
              {t
                ? 'Añade títulos, subtítulos o CTAs animados sobre el video'
                : 'Add animated titles, subtitles or CTAs over the video'}
            </p>
          )}

          <AnimatePresence initial={false}>
            {(state.textLayers || []).map(layer => (
              <TextLayerCard
                key={layer.id}
                layer={layer}
                totalDuration={state.totalDuration}
                language={language}
                onUpdate={updates => onUpdateTextLayer(layer.id, updates)}
                onRemove={() => onRemoveTextLayer(layer.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* ── Audio — Música y Locución ── */}
        {(onAddAudioLayer || state.audioLayers.length > 0) && (
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <Music className="w-3.5 h-3.5 text-purple-400" />
              <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
                {t ? 'Música y Locución' : 'Music & Voiceover'}
              </p>
              {(state.audioLayers || []).length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[11px] font-black">
                  {state.audioLayers.length}
                </span>
              )}
            </div>

            {/* Music selector */}
            {onAddAudioLayer && musicLibraryItems && musicLibraryItems.length > 0 && (
              <select
                defaultValue=""
                onChange={e => {
                  const url = e.target.value;
                  if (url) {
                    onAddAudioLayer({ type: 'music', url, volume: 0.4, startSecond: 0, fadeInSeconds: 0, fadeOutSeconds: 0 });
                    (e.target as HTMLSelectElement).value = '';
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-black uppercase text-white"
              >
                <option value="">{t ? '+ Añadir música de librería...' : '+ Add library music...'}</option>
                {(['Cinematic','Corporate','Energetic','Emotional','Ambient'] as const).map(cat => (
                  <optgroup key={cat} label={cat}>
                    {musicLibraryItems.filter(m => m.category === cat).map(m => (
                      <option key={m.id} value={m.url}>{m.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}

            {/* Saved voices selector */}
            {onAddAudioLayer && savedVoices && savedVoices.length > 0 && (
              <select
                defaultValue=""
                onChange={e => {
                  const sv = savedVoices.find(v => v.id === e.target.value);
                  if (sv) {
                    onAddAudioLayer({ type: 'voiceover', url: sv.url, volume: 1.0, startSecond: 0, fadeInSeconds: 0, fadeOutSeconds: 0 });
                    (e.target as HTMLSelectElement).value = '';
                  }
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-black uppercase text-white"
              >
                <option value="">{t ? '+ Añadir locución desde Fábrica de Audio...' : '+ Add voiceover from Audio Factory...'}</option>
                {savedVoices.map(sv => (
                  <option key={sv.id} value={sv.id}>{sv.name}</option>
                ))}
              </select>
            )}

            {/* Audio layer list */}
            <AnimatePresence initial={false}>
              {(state.audioLayers || []).map(layer => (
                <motion.div
                  key={layer.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 p-2 bg-white/5 rounded-xl"
                >
                  {layer.type === 'music'
                    ? <Music className="w-3 h-3 text-purple-400 flex-shrink-0" />
                    : <Mic className="w-3 h-3 text-[#ff477b] flex-shrink-0" />}
                  <span className="flex-1 text-[11px] text-white/40 truncate">
                    {layer.type === 'music' ? (t ? 'Música' : 'Music') : (t ? 'Locución' : 'Voiceover')}
                  </span>
                  <Volume2 className="w-3 h-3 text-white/20 flex-shrink-0" />
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={layer.volume}
                    onChange={e => onUpdateAudioLayer?.(layer.id, { volume: parseFloat(e.target.value) })}
                    className="w-20 accent-purple-400 h-0.5"
                  />
                  <span className="text-[11px] text-white/30 w-7 text-right">{Math.round(layer.volume * 100)}%</span>
                  <button
                    onClick={() => onRemoveAudioLayer?.(layer.id)}
                    className="p-1 text-white/20 hover:text-rose-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Confirm CTA — enters editing mode */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConfirmStoryboard}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ff477b] to-[#ff6b35] text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#ff477b]/20"
        >
          {t ? 'Confirmar → Editar Reel' : 'Confirm → Edit Reel'}
        </motion.button>
      </motion.div>
    );
  }

  // Phase B-editing: Full reel editor (storyboard confirmed, not yet composing)
  if (state.isEditing && !state.isComposing && !state.composedVideoUrl) {
    const selectedSeg = selectedSegId ? state.segments.find(s => s.id === selectedSegId) : null;

    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="w-4 h-4 text-[#ff477b]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-white/60">
            {t ? 'Editor de Reel' : 'Reel Editor'}
          </span>
          <span className="ml-auto text-[11px] text-white/30">
            {state.segments.filter(s => s.status === 'completed').length} {t ? 'segmentos' : 'segments'} · {state.totalDuration}s
          </span>
        </div>

        {/* Two-column layout: preview left, controls right */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Preview column */}
          <div className="lg:col-span-2">
            <ReelPreviewCanvas
              segments={state.segments}
              segmentOrder={state.segmentOrder}
              textLayers={state.textLayers}
              imageLayers={state.imageLayers}
              segmentEditProps={state.segmentEditProps}
              totalDuration={state.totalDuration}
              isTimelineDragging={isTimelineDragging}
            />
          </div>

          {/* Controls column */}
          <div className="lg:col-span-3 space-y-4 overflow-y-auto max-h-[600px] pr-1">
            {/* Timeline */}
            <div className="p-4 bg-white/3 border border-white/10 rounded-2xl space-y-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {t ? 'Timeline' : 'Timeline'}
              </p>
              <ReelTimelineEditor
                segments={state.segments}
                segmentOrder={state.segmentOrder}
                textLayers={state.textLayers}
                imageLayers={state.imageLayers}
                totalDuration={state.totalDuration}
                onReorderSegments={onReorderSegments ?? (() => {})}
                onUpdateTextLayer={onUpdateTextLayer}
                onSelectSegment={setSelectedSegId}
              />
            </div>

            {/* Per-segment edit panel */}
            {selectedSeg && onUpdateSegmentEditProps && (
              <ReelSegmentPanel
                segment={selectedSeg}
                editProps={state.segmentEditProps[selectedSeg.id]}
                onUpdate={(updates) => onUpdateSegmentEditProps(selectedSeg.id, updates)}
              />
            )}

            {/* Transition controls */}
            <div className="p-4 bg-white/3 border border-white/10 rounded-2xl space-y-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-white/40">
                {t ? 'Transición' : 'Transition'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {TRANSITIONS.map((tr) => (
                  <button
                    key={tr.id}
                    onClick={() => onTransitionChange(tr.id)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                      state.transition === tr.id
                        ? 'bg-gradient-to-r from-[#ff477b] to-[#ff6b35] text-white'
                        : 'bg-white/5 text-white/30 hover:bg-white/10'
                    }`}
                  >
                    {tr.icon}
                    {t ? tr.labelEs : tr.label}
                  </button>
                ))}
              </div>
              {onTransitionDurationChange && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-white/40">{t ? 'Duración transición' : 'Transition duration'}</span>
                    <span className="text-[11px] text-white/60 font-mono">{state.transitionDurationSeconds.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range" min={0.1} max={2} step={0.1}
                    value={state.transitionDurationSeconds}
                    onChange={(e) => onTransitionDurationChange(parseFloat(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none bg-white/10 accent-[#ff477b]"
                  />
                </div>
              )}
            </div>

            {/* Animated text layers */}
            <div className="p-4 bg-white/3 border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="w-3.5 h-3.5 text-[#ff477b]" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
                    {t ? 'Textos Animados' : 'Animated Text'}
                  </p>
                  {state.textLayers.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#ff477b]/20 text-[#ff477b] text-[11px] font-black">
                      {state.textLayers.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={onAddTextLayer}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#ff477b]/10 hover:bg-[#ff477b]/20 text-[#ff477b] text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  <Plus className="w-3 h-3" />
                  {t ? 'Añadir' : 'Add'}
                </button>
              </div>
              <AnimatePresence initial={false}>
                {(state.textLayers || []).map(layer => (
                  <TextLayerCard
                    key={layer.id}
                    layer={layer}
                    totalDuration={state.totalDuration}
                    language={language}
                    onUpdate={updates => onUpdateTextLayer(layer.id, updates)}
                    onRemove={() => onRemoveTextLayer(layer.id)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Image/Logo layers */}
            <div className="p-4 bg-white/3 border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
                    {t ? 'Logo / Watermark' : 'Logo / Watermark'}
                  </p>
                </div>
                {onAddImageLayer && (
                  <button
                    onClick={onAddImageLayer}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-black uppercase tracking-widest transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    {t ? 'Añadir' : 'Add'}
                  </button>
                )}
              </div>
              {state.imageLayers.length === 0 && (
                <p className="text-[11px] text-white/20 text-center py-1">
                  {t ? 'Añade tu logo o watermark sobre el video' : 'Add your logo or watermark over the video'}
                </p>
              )}
              {(state.imageLayers || []).map(layer => (
                <ReelImageLayerCard
                  key={layer.id}
                  layer={layer}
                  totalDuration={state.totalDuration}
                  onUpdate={(updates) => onUpdateImageLayer?.(layer.id, updates)}
                  onRemove={() => onRemoveImageLayer?.(layer.id)}
                />
              ))}
            </div>

            {/* ── Audio — Música y Locución ── */}
            {(onAddAudioLayer || state.audioLayers.length > 0) && (
              <div className="p-4 bg-white/3 border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Music className="w-3.5 h-3.5 text-purple-400" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
                    {t ? 'Música y Locución' : 'Music & Voiceover'}
                  </p>
                  {state.audioLayers.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[11px] font-black">
                      {state.audioLayers.length}
                    </span>
                  )}
                </div>

                {/* Music selector */}
                {onAddAudioLayer && musicLibraryItems && musicLibraryItems.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={e => {
                      const url = e.target.value;
                      if (url) {
                        onAddAudioLayer({ type: 'music', url, volume: 0.4, startSecond: 0, fadeInSeconds: 0, fadeOutSeconds: 0 });
                        (e.target as HTMLSelectElement).value = '';
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-black uppercase text-white"
                  >
                    <option value="">{t ? '+ Añadir música de librería...' : '+ Add library music...'}</option>
                    {(['Cinematic','Corporate','Energetic','Emotional','Ambient'] as const).map(cat => (
                      <optgroup key={cat} label={cat}>
                        {musicLibraryItems.filter(m => m.category === cat).map(m => (
                          <option key={m.id} value={m.url}>{m.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}

                {/* Saved voices selector */}
                {onAddAudioLayer && savedVoices && savedVoices.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={e => {
                      const sv = savedVoices.find(v => v.id === e.target.value);
                      if (sv) {
                        onAddAudioLayer({ type: 'voiceover', url: sv.url, volume: 1.0, startSecond: 0, fadeInSeconds: 0, fadeOutSeconds: 0 });
                        (e.target as HTMLSelectElement).value = '';
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-black uppercase text-white"
                  >
                    <option value="">{t ? '+ Añadir locución desde Fábrica de Audio...' : '+ Add voiceover from Audio Factory...'}</option>
                    {(savedVoices || []).map(sv => (
                      <option key={sv.id} value={sv.id}>{sv.name}</option>
                    ))}
                  </select>
                )}

                {/* Audio layer list */}
                <AnimatePresence initial={false}>
                  {(state.audioLayers || []).map(layer => (
                    <motion.div
                      key={layer.id}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center gap-2 p-2 bg-white/5 rounded-xl"
                    >
                      {layer.type === 'music'
                        ? <Music className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        : <Mic className="w-3 h-3 text-[#ff477b] flex-shrink-0" />}
                      <span className="flex-1 text-[11px] text-white/40 truncate">
                        {layer.type === 'music' ? (t ? 'Música' : 'Music') : (t ? 'Locución' : 'Voiceover')}
                      </span>
                      <Volume2 className="w-3 h-3 text-white/20 flex-shrink-0" />
                      <input
                        type="range" min="0" max="1" step="0.05"
                        value={layer.volume}
                        onChange={e => onUpdateAudioLayer?.(layer.id, { volume: parseFloat(e.target.value) })}
                        className="w-20 accent-purple-400 h-0.5"
                      />
                      <span className="text-[11px] text-white/30 w-7 text-right">{Math.round(layer.volume * 100)}%</span>
                      <button
                        onClick={() => onRemoveAudioLayer?.(layer.id)}
                        className="p-1 text-white/20 hover:text-rose-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Compose CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onCompose()}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-violet-600/20"
        >
          {t ? '▶ Componer Reel Final' : '▶ Compose Final Reel'}
        </motion.button>
      </motion.div>
    );
  }

  // Phase A: Generation in progress (or initial/error state)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Layers className="w-4 h-4 text-[#ff477b]" />
        <span className="text-[11px] font-black uppercase tracking-widest text-white/60">
          {t ? 'Generando Segmentos' : 'Generating Segments'}
        </span>
        <span className="ml-auto text-[11px] text-white/30 uppercase tracking-widest">
          {state.segments.filter(s => s.status === 'completed').length}/{state.segments.length}
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {(state.segments || []).map((seg) => (
            <motion.div
              key={seg.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-4 rounded-2xl border flex gap-4 items-center transition-all ${
                seg.status === 'generating'
                  ? 'bg-[#ff477b]/10 border-[#ff477b]/30'
                  : seg.status === 'completed'
                  ? 'bg-white/5 border-white/10'
                  : seg.status === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : 'bg-white/3 border-white/5 opacity-40'
              }`}
            >
              <div className="w-16 aspect-video bg-white/5 rounded-xl overflow-hidden flex-shrink-0">
                {seg.thumbnailDataUrl ? (
                  <img src={seg.thumbnailDataUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-4 h-4 text-white/20" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
                  {t ? `Segmento ${seg.index + 1}` : `Segment ${seg.index + 1}`} · {seg.durationSeconds}s
                </p>
                {seg.status === 'generating' && state.pollingProgress && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#ff477b] to-[#ff6b35] rounded-full"
                        animate={{ width: `${(state.pollingProgress.attempt / state.pollingProgress.max) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-[11px] text-white/30">
                      {t ? 'Procesando' : 'Processing'} {state.pollingProgress.attempt}/{state.pollingProgress.max}
                      {' · '}~{Math.round((state.pollingProgress.max - state.pollingProgress.attempt) * 6 / 60)}m {t ? 'restantes' : 'remaining'}
                    </p>
                  </div>
                )}
                {seg.status === 'error' && (
                  <p className="mt-1 text-[11px] text-rose-400 truncate">{seg.errorMessage}</p>
                )}
                {seg.status === 'completed' && (
                  <p className="mt-1 text-[11px] text-emerald-400 uppercase tracking-widest font-black">
                    {t ? 'Completado' : 'Completed'}
                  </p>
                )}
                {seg.status === 'pending' && (
                  <p className="mt-1 text-[11px] text-white/20 uppercase tracking-widest">
                    {t ? 'En cola' : 'Queued'}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0">
                {seg.status === 'generating' && (
                  <RefreshCw className="w-5 h-5 text-[#ff477b] animate-spin" />
                )}
                {seg.status === 'completed' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
                {seg.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {hasError && !state.isGenerating && (
        <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 space-y-3">
          <p className="text-[11px] text-rose-300 font-black uppercase tracking-widest">
            {t ? 'Un segmento falló' : 'A segment failed'}
          </p>
          {(state.segments || []).filter(s => s.status === 'error').map(seg => (
            <button
              key={seg.id}
              onClick={() => onRetrySegment(seg.index)}
              className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-rose-300 hover:text-rose-200 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              {t ? `Reintentar Segmento ${seg.index + 1}` : `Retry Segment ${seg.index + 1}`}
            </button>
          ))}
        </div>
      )}

      {state.error && (
        <p className="text-[11px] text-rose-400 text-center">{state.error}</p>
      )}
    </div>
  );
};

export default MultiStageVideoComposer;
