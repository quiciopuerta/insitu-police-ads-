import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw, Sparkles, Camera, MousePointer2, Plus, X,
  MessageSquare, Video, Check, MoreHorizontal, Settings2,
  Film, Upload, Trash2, Import, Image as ImageIcon, Info, Zap, Wand2, PlusCircle, User, Palette, GripVertical,
  ChevronRight, BookOpen
} from 'lucide-react';
import { MultiStageVideoState, Language, FlowPhase, VideoSegment } from '../types';
import { LassoCanvas } from './Flow/LassoCanvas';
import { generateOrEditImage, planVideoSegments } from '../services/ai/mediaGenerationService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { proxiedAssetUrl } from '../utils/apiConfig';
import { BrandProfile } from '../types';
import TutorialBubble, { TutorialTrigger } from './ui/TutorialBubble';
import { useTutorial } from '../hooks/useTutorial';

// ─── DEMO STORYBOARD ───────────────────────────────────────────────────────────
const DEMO_SCENES: VideoSegment[] = [
  {
    id: 'demo_scene_01',
    index: 0,
    prompt: 'Producto de lujo sobre superficie de mármol blanco, luz cenital suave, destellos dorados, fondo minimalista, ultra HD',
    status: 'completed',
    operationName: null,
    videoUrl: 'https://images.unsplash.com/photo-1541795795328-f073b763494e?w=900&q=90',
    thumbnailDataUrl: null,
    errorMessage: null,
    durationSeconds: 6,
    type: 'image',
  },
  {
    id: 'demo_scene_02',
    index: 1,
    prompt: 'Persona usando el producto en un ambiente urbano de noche, luces neón, lluvia, plano americano, estética cyberpunk',
    status: 'completed',
    operationName: null,
    videoUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=900&q=90',
    thumbnailDataUrl: null,
    errorMessage: null,
    durationSeconds: 8,
    type: 'image',
  },
  {
    id: 'demo_scene_03',
    index: 2,
    prompt: 'Close-up del logo del producto con partículas doradas flotando, desenfoque bokeh, fondo oscuro, estetica editorial',
    status: 'completed',
    operationName: null,
    videoUrl: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=900&q=90',
    thumbnailDataUrl: null,
    errorMessage: null,
    durationSeconds: 4,
    type: 'image',
  },
  {
    id: 'demo_scene_04',
    index: 3,
    prompt: 'Escena final con tagline del anuncio, fondo gradiente oscuro, tipografía sans-serif elegante, animación sutil de entrada',
    status: 'pending',
    operationName: null,
    videoUrl: null,
    thumbnailDataUrl: null,
    errorMessage: null,
    durationSeconds: 4,
    type: 'video',
  },
];


interface FlowWorkspaceProps {
  state: MultiStageVideoState;
  language: Language;
  onUpdateState: (updates: Partial<MultiStageVideoState>) => void;
  onGenerateScene: (
    index: number,
    options?: {
      cameraMotion?: 'PAN'|'TILT'|'ZOOM'|'DOLLY'|null;
      motionIntensity?: number;
      durationSeconds?: number;
      styleReference?: string | null;
      subjectReference?: string | null;
    }
  ) => void;
  onAddScene: () => void;
  onCompose: (filter?: string) => void;
  isComposing: boolean;
  brandContext?: BrandProfile | null;
  brandPrefix?: string;
  onGenerateFlow?: () => void;
  /** Pre-seed assets from other labs (e.g. Mi Avatar) into the Ingredient Archive */
  initialAssets?: { id: string; url: string; type: 'image' | 'video'; name: string }[];
}

const MASTERING_STYLES_CONST = {
  default: '' as string,
  cinematic: 'contrast(1.2) brightness(1.1) saturate(1.1)',
  vintage: 'sepia(0.3) contrast(0.9) brightness(1.1)',
  noir: 'grayscale(1) contrast(1.3)',
  cyber: 'hue-rotate(180deg) saturate(1.5) contrast(1.1)',
  dreamy: 'blur(0.5px) brightness(1.1) saturate(0.9)',
};

const FlowWorkspace: React.FC<FlowWorkspaceProps> = ({
  state,
  language,
  onUpdateState,
  onGenerateScene,
  onAddScene,
  onCompose,
  isComposing,
  onGenerateFlow,
  initialAssets = [],
}) => {
  const [activePhase, setActivePhase] = useState<FlowPhase>(state.flowPhase || 'scenario');
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);
  const [isLassoOpen, setIsLassoOpen] = useState(false);
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [masteringStyle, setMasteringStyle] = useState<keyof typeof MASTERING_STYLES_CONST>('default');
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0);
  const [isGeneratingFlow, setIsGeneratingFlow] = useState(false);
  const [showConfigMenu, setShowConfigMenu] = useState(false);

  // ── Tutorial ──────────────────────────────────────────────────────────────
  const tutorial = useTutorial('flow-workspace', language);
  const tutorialAnchors = useRef<Record<string, HTMLElement | null>>({});

  // Trigger tutorial when demo is loaded
  const handleLoadDemo = () => {
    onUpdateState({
      segments: DEMO_SCENES,
      segmentOrder: DEMO_SCENES.map(s => s.id),
      globalWorldPrompt: language === 'es'
        ? 'Campaña de lujo para producto premium — estética cinemática oscura con toques dorados'
        : 'Luxury campaign for a premium product — dark cinematic aesthetic with golden accents',
      isGenerating: false,
      error: null,
    });
    setSelectedSceneIndex(0);
    tutorial.restart();
  };
  
  // Nuevo Estado: Ingredient Archive (Uploads)
  const [uploadedAssets, setUploadedAssets] = useState<{id: string, url: string, type: 'image' | 'video', name: string}[]>(initialAssets);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Sync new assets from other labs (e.g. Mi Avatar) into the archive
  useEffect(() => {
    if (!initialAssets || initialAssets.length === 0) return;
    setUploadedAssets(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const newAssets = initialAssets.filter(a => !existingIds.has(a.id));
      return newAssets.length > 0 ? [...newAssets, ...prev] : prev;
    });
  }, [initialAssets]);

  // References (Google Flow style)
  const [subjectReferenceUrl, setSubjectReferenceUrl] = useState<string | null>(null);
  const [styleReferenceUrl, setStyleReferenceUrl] = useState<string | null>(null);
  const subjectFileRef = useRef<HTMLInputElement>(null);
  const styleFileRef = useRef<HTMLInputElement>(null);

  // Camera controls per segment (keyed by segment ID)
  const [segmentCameraControls, setSegmentCameraControls] = useState<
    Record<string, { cameraMotion: 'PAN'|'TILT'|'ZOOM'|'DOLLY'|null; motionIntensity: number; durationSeconds: number }>
  >({});

  // Timeline drag-and-drop
  const [draggingSegId, setDraggingSegId] = useState<string | null>(null);
  const [dragOverSegIdx, setDragOverSegIdx] = useState<number | null>(null);
  const timelineDragStartXRef = useRef<number>(0);

  const handleFinalCompose = useCallback(() => {
    const filter = MASTERING_STYLES_CONST[masteringStyle] || '';
    onCompose(filter);
  }, [masteringStyle, onCompose]);

  useEffect(() => {
    if (state.flowPhase && state.flowPhase !== activePhase) {
      setActivePhase(state.flowPhase);
    }
  }, [state.flowPhase, activePhase]);

  // Manejo de Carga de Archivos
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedAssets(prev => [{
          id: `asset_${Date.now()}`,
          url: event.target!.result as string,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          name: file.name
        }, ...prev]);
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Manejo de Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedAssets(prev => [{
          id: `asset_${Date.now()}`,
          url: event.target!.result as string,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          name: file.name
        }, ...prev]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReferenceUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setter(evt.target?.result as string ?? null);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Asignar Asset Subido al SceneBuilder
  const handleUseAsset = (assetUrl: string, type: 'image'|'video') => {
    if (state.segments.length === 0) {
      onAddScene(); // Create first scene if empty
    }
    const newSegments = [...state.segments];
    // Aseguramos que haya un segmento en el selected index
    if (newSegments[selectedSceneIndex]) {
      newSegments[selectedSceneIndex] = { ...newSegments[selectedSceneIndex], videoUrl: assetUrl, type: type, status: 'generating' };
      // Simulamos carga rápida ya que es local
      setTimeout(() => {
        const segs = [...state.segments];
        segs[selectedSceneIndex] = { ...segs[selectedSceneIndex], videoUrl: assetUrl, type: type, status: 'completed' };
        onUpdateState({ segments: segs });
      }, 500);
    }
  };

  const handleGenerateFlow = useCallback(async () => {
    if (onGenerateFlow) {
      onGenerateFlow();
      return;
    }
    const prompt = state.globalWorldPrompt?.trim();
    if (!prompt) return;

    setIsGeneratingFlow(true);
    onUpdateState({ flowPhase: 'production' });
    setActivePhase('production');

    try {
      const totalDuration = state.totalDuration || 24;
      const { segments: plannedSegments } = await planVideoSegments(prompt, totalDuration);

      const newSegments: VideoSegment[] = plannedSegments.map((seg, i) => ({
        id: `flow_${Date.now()}_${i}`,
        index: i,
        prompt: seg.subPrompt,
        status: 'pending' as const,
        operationName: null,
        videoUrl: null,
        thumbnailDataUrl: null,
        errorMessage: null,
        durationSeconds: seg.durationSeconds,
        type: 'video' as const,
      }));

      onUpdateState({
        segments: newSegments,
        segmentOrder: newSegments.map(s => s.id),
        isGenerating: true,
        error: null,
        composedVideoUrl: null,
        storyboardConfirmed: false,
      });

      if (newSegments.length > 0) {
        onGenerateScene(0, {
          styleReference: styleReferenceUrl,
          subjectReference: subjectReferenceUrl,
        });
      }
    } catch (err: any) {
      onUpdateState({ error: err.message || 'Error al planificar los segmentos', isGenerating: false });
    } finally {
      setIsGeneratingFlow(false);
    }
  }, [state.globalWorldPrompt, state.totalDuration, onGenerateFlow, onGenerateScene, onUpdateState]);

  const handleLassoEdit = async (maskBase64: string, editPrompt: string) => {
    if (editingSceneIndex === null) return;
    setIsProcessingEdit(true);
    const scene = state.segments[editingSceneIndex];
    try {
      const result = await generateOrEditImage({
        prompt: editPrompt,
        aspectRatio: state.aspectRatio,
        referenceImage: scene.videoUrl,
        editMode: 'EDIT_MODE_INPAINT_INSERT',
        mask: maskBase64,
        subjectReference: subjectReferenceUrl ?? undefined,
        styleReference: styleReferenceUrl ?? undefined,
      });
      if (result.imageUrl) {
        const newSegments = [...state.segments];
        newSegments[editingSceneIndex] = { ...scene, videoUrl: result.imageUrl };
        onUpdateState({ segments: newSegments });
      }
    } catch (err) {
      console.error('Error editing scene:', err);
    } finally {
      setIsProcessingEdit(false);
      setIsLassoOpen(false);
      setEditingSceneIndex(null);
    }
  };

  const handleSegmentDragStart = (e: React.MouseEvent, segId: string) => {
    e.preventDefault();
    setDraggingSegId(segId);
    timelineDragStartXRef.current = e.clientX;
    const TILE_W = 184;

    const onMove = (ev: MouseEvent) => {
      const currentIdx = state.segmentOrder.indexOf(segId);
      const dx = ev.clientX - timelineDragStartXRef.current;
      const newIdx = Math.max(0, Math.min(state.segmentOrder.length - 1, currentIdx + Math.round(dx / TILE_W)));
      setDragOverSegIdx(newIdx);
    };

    const onUp = () => {
      if (dragOverSegIdx !== null && dragOverSegIdx !== state.segmentOrder.indexOf(segId)) {
        const newOrder = [...state.segmentOrder];
        const fromIdx = newOrder.indexOf(segId);
        const [removed] = newOrder.splice(fromIdx, 1);
        newOrder.splice(dragOverSegIdx, 0, removed);
        const reindexed = newOrder.map((id, i) => {
          const seg = state.segments.find(s => s.id === id);
          return seg ? { ...seg, index: i } : null;
        }).filter(Boolean) as VideoSegment[];
        onUpdateState({ segments: reindexed, segmentOrder: newOrder });
      }
      setDraggingSegId(null);
      setDragOverSegIdx(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const isEmpty = state.segments.length === 0;

  return (
    <div className="w-full h-screen min-h-screen bg-[#060608] text-white flex flex-col font-sans overflow-hidden">
      
      {/* HEADER: Minimalist Top Bar */}
      <header className="h-14 border-b border-white/[0.05] flex items-center justify-between px-6 bg-black/40 backdrop-blur-md z-[60] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#ff477b] to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(255,71,123,0.3)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[13px] tracking-widest uppercase text-white/90">INsitu Creative Studio</span>
          <span className="px-2 py-0.5 ml-2 rounded-md bg-white/10 text-[10px] text-white/50 border border-white/5 font-mono">FLOW 2.0</span>
          {/* Tutorial / Demo badge */}
          <TutorialTrigger
            isDismissed={tutorial.isDismissed}
            isVisible={tutorial.isVisible}
            language={language}
            onShow={() => tutorial.restart()}
            onRestart={tutorial.restart}
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowConfigMenu(!showConfigMenu)}
              ref={(el) => { tutorialAnchors.current['render-btn'] = el; }}
              className="px-4 py-2 rounded-lg border border-white/10 bg-[#111113] hover:bg-white/5 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Settings2 className="w-4 h-4 text-[#ff477b]" />
              <span className="text-white/80">Mastering: <span className="capitalize text-white">{masteringStyle}</span></span>
            </button>
            <AnimatePresence>
              {showConfigMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-12 w-56 bg-[#111113] border border-white/10 rounded-xl p-2 shadow-2xl z-[100]"
                >
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 px-2 pt-2">Mastering Preset</p>
                  <div className="space-y-1">
                    {(Object.keys(MASTERING_STYLES_CONST) as Array<keyof typeof MASTERING_STYLES_CONST>).map(style => (
                      <button 
                        key={style}
                        onClick={() => { setMasteringStyle(style); setShowConfigMenu(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center group",
                          masteringStyle === style ? "bg-[#ff477b]/10 text-[#ff477b]" : "text-white/70 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <span className="capitalize">{style}</span>
                        {masteringStyle === style && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={handleFinalCompose}
            disabled={isComposing || isEmpty}
            ref={(el) => { if (el) tutorialAnchors.current['render-btn'] = el; }}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#ff477b] to-purple-600 text-white text-sm font-bold shadow-[0_0_20px_rgba(255,71,123,0.3)] hover:shadow-[0_0_30px_rgba(255,71,123,0.5)] disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-2"
          >
            {isComposing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
            {language === 'es' ? 'Render Final' : 'Export Sequence'}
          </button>
        </div>
      </header>

      {/* ── TUTORIAL BUBBLE ──────────────────────────────────────────────── */}
      <TutorialBubble
        steps={tutorial.steps}
        currentStep={tutorial.currentStep}
        isVisible={tutorial.isVisible}
        language={language}
        onNext={tutorial.next}
        onPrev={tutorial.prev}
        onGoTo={tutorial.goTo}
        onDismiss={tutorial.dismiss}
      />

      {/* BODY: Split View Architecture */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* ASIDE: Ingredient Archive */}
        <aside className="w-80 border-r border-white/[0.05] bg-[#0c0c0e] flex flex-col z-40 flex-shrink-0 relative overflow-hidden">
          {/* Subtle gradient glow in background */}
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

          {/* REFERENCE PANELS: Subject + Style */}
          <div
            ref={(el) => { tutorialAnchors.current['sidebar-character'] = el; }}
            className="px-6 pt-6 pb-4 space-y-4 border-b border-white/[0.05]"
          >
            {/* Character Reference */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                <User className="w-3 h-3" />
                Character
              </p>
              <button
                onClick={() => subjectFileRef.current?.click()}
                className={cn(
                  "w-full aspect-square rounded-xl border transition-all flex items-center justify-center text-center p-3",
                  subjectReferenceUrl
                    ? "border-[#ff477b]/30 bg-[#ff477b]/5"
                    : "border-dashed border-white/20 bg-white/[0.02] hover:border-[#ff477b]/50 hover:bg-white/[0.05]"
                )}
              >
                {subjectReferenceUrl ? (
                  <div className="relative w-full h-full group">
                    <img src={subjectReferenceUrl} alt="Subject ref" className="w-full h-full object-cover rounded-lg" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setSubjectReferenceUrl(null); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <User className="w-4 h-4 text-white/40" />
                    <span className="text-[8px] text-white/40 font-medium">Upload character</span>
                  </div>
                )}
              </button>
              <input type="file" ref={subjectFileRef} onChange={(e) => handleReferenceUpload(e, setSubjectReferenceUrl)} accept="image/*" className="hidden" />
            </div>

            {/* Style Reference */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Palette className="w-3 h-3" />
                Style / Mood
              </p>
              <button
                onClick={() => styleFileRef.current?.click()}
                className={cn(
                  "w-full aspect-square rounded-xl border transition-all flex items-center justify-center text-center p-3",
                  styleReferenceUrl
                    ? "border-[#ff477b]/30 bg-[#ff477b]/5"
                    : "border-dashed border-white/20 bg-white/[0.02] hover:border-[#ff477b]/50 hover:bg-white/[0.05]"
                )}
              >
                {styleReferenceUrl ? (
                  <div className="relative w-full h-full group">
                    <img src={styleReferenceUrl} alt="Style ref" className="w-full h-full object-cover rounded-lg" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setStyleReferenceUrl(null); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Palette className="w-4 h-4 text-white/40" />
                    <span className="text-[8px] text-white/40 font-medium">Upload mood board</span>
                  </div>
                )}
              </button>
              <input type="file" ref={styleFileRef} onChange={(e) => handleReferenceUpload(e, setStyleReferenceUrl)} accept="image/*" className="hidden" />
            </div>
          </div>

          <div
            ref={(el) => { tutorialAnchors.current['sidebar-archive'] = el; }}
            className="p-6 border-b border-white/[0.05]"
          >
            <h2 className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-white/40" />
              Ingredient Archive
            </h2>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 rounded-xl border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#ff477b]/50 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-[#ff477b]/20 group-hover:text-[#ff477b] transition-colors text-white/60">
                <Upload className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-white/60 group-hover:text-white transition-colors">
                {language === 'es' ? 'Subir Imagen o Video' : 'Upload Image or Video'}
              </span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,video/*" className="hidden" />
          </div>

          <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Recents</h3>
            <div className="grid grid-cols-2 gap-3">
              {uploadedAssets.map(asset => (
                <div key={asset.id} className="relative aspect-square rounded-xl bg-black border border-white/10 overflow-hidden group cursor-pointer">
                  {asset.type === 'image' ? (
                    <img src={asset.url} alt="asset" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <video src={asset.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  )}
                  {/* Action Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity backdrop-blur-sm gap-2">
                    <button 
                      onClick={() => handleUseAsset(asset.url, asset.type)}
                      className="px-3 py-1.5 bg-[#ff477b] text-white text-[10px] font-bold rounded-md flex items-center gap-1 shadow-lg"
                    >
                      <Import className="w-3 h-3" /> Usar
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setUploadedAssets(prev => prev.filter(a => a.id !== asset.id)); }}
                      className="w-7 h-7 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 rounded-md flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Type badge */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/80 rounded border border-white/10 text-[8px] uppercase tracking-wider text-white/60">
                    {asset.type}
                  </div>
                </div>
              ))}
              {uploadedAssets.length === 0 && (
                <div className="col-span-2 flex flex-col items-center justify-center h-32 border border-white/5 rounded-xl bg-white/[0.02]">
                  <Info className="w-5 h-5 text-white/20 mb-2" />
                  <p className="text-xs text-white/40 text-center px-4">
                    Tus archivos subidos aparecerán aquí para usarlos como referencias de IA.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <main 
          className="flex-1 flex flex-col relative h-full bg-[#030304]"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AnimatePresence>
            {isDraggingOver && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-[#ff477b]/10 backdrop-blur-sm border-4 border-dashed border-[#ff477b]/50 rounded-2xl flex items-center justify-center m-8 pointer-events-none"
              >
                <div className="bg-black/80 px-8 py-4 rounded-full flex items-center gap-3 shadow-2xl">
                  <Upload className="w-6 h-6 text-[#ff477b] animate-bounce" />
                  <span className="text-white font-bold text-lg">Soltar ingrediente aquí</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
            {isEmpty ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center gap-6 max-w-lg"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                    <Film className="w-10 h-10 text-[#ff477b]/40" />
                  </div>
                  {/* Pulsing ring */}
                  <div className="absolute inset-0 rounded-3xl border border-[#ff477b]/20 animate-ping" style={{ animationDuration: '2s' }} />
                </div>
                <p className="text-2xl text-white/80 font-light tracking-tight">
                  {language === 'es' ? 'El proyector está apagado' : 'The projector is off'}
                </p>
                <p className="text-sm text-white/40 max-w-sm">
                  Escribe un prompt en la barra inferior y pulsa <strong className="text-white/60">Generar Storyboard</strong>, o carga el ejemplo de demostración para explorar el flujo.
                </p>
                {/* Demo Load CTA */}
                <button
                  onClick={handleLoadDemo}
                  className="group flex items-center gap-3 px-6 py-3 rounded-2xl border border-[#ff477b]/30 bg-[#ff477b]/5 hover:bg-[#ff477b]/15 hover:border-[#ff477b]/60 transition-all duration-300 shadow-[0_0_30px_rgba(255,71,123,0.1)] hover:shadow-[0_0_40px_rgba(255,71,123,0.25)]"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#ff477b]/20 flex items-center justify-center group-hover:bg-[#ff477b]/40 transition-colors">
                    <BookOpen className="w-4 h-4 text-[#ff477b]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white/90">Cargar Ejemplo de Demo</p>
                    <p className="text-[11px] text-white/40">4 escenas • Campaña de lujo • Tutorial interactivo</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#ff477b]/60 group-hover:text-[#ff477b] group-hover:translate-x-1 transition-all" />
                </button>
              </motion.div>
            ) : (
              <div className="w-full max-w-5xl aspect-video relative rounded-2xl overflow-hidden group shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border border-white/[0.08]">
                {/* Visualizer */}
                <div className="absolute inset-0 bg-black flex items-center justify-center">
                  {state.segments[selectedSceneIndex]?.videoUrl ? (
                    state.segments[selectedSceneIndex].type === 'image' ? (
                      <img
                        src={state.segments[selectedSceneIndex].videoUrl!}
                        alt="Scene"
                        className="w-full h-full object-cover"
                        style={{ filter: MASTERING_STYLES_CONST[masteringStyle] }}
                      />
                    ) : (
                      <video 
                        src={state.segments[selectedSceneIndex].videoUrl!} 
                        autoPlay loop muted playsInline 
                        className="w-full h-full object-cover"
                        style={{ filter: MASTERING_STYLES_CONST[masteringStyle] }}
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center text-white/20 gap-4">
                      {state.segments[selectedSceneIndex]?.status === 'generating' ? (
                        <>
                          <RefreshCw className="w-12 h-12 animate-spin text-[#ff477b]" />
                          <span className="text-xs font-bold uppercase tracking-widest text-[#ff477b] mt-2">Sintetizando Frame...</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-12 h-12 mb-2" />
                          <span className="text-xs font-bold uppercase tracking-widest text-white/40">Fotograma Vacío</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Overlay Analytics/Tools (Director's View) */}
                <div className="absolute top-6 left-6 flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-[#ff477b] tracking-widest uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff477b] animate-pulse" />
                    SEQ_{String(selectedSceneIndex + 1).padStart(2, '0')}
                  </div>
                  {state.segments[selectedSceneIndex]?.videoUrl && (
                    <div className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-mono text-white/60">
                      1920x1080 • 24fps • {masteringStyle}
                    </div>
                  )}
                </div>

                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 opacity-100 transition-opacity duration-300">
                  <button
                     onClick={() => onGenerateScene(selectedSceneIndex, {
                       cameraMotion: segmentCameraControls[state.segments[selectedSceneIndex]?.id]?.cameraMotion,
                       motionIntensity: segmentCameraControls[state.segments[selectedSceneIndex]?.id]?.motionIntensity,
                       durationSeconds: segmentCameraControls[state.segments[selectedSceneIndex]?.id]?.durationSeconds,
                       styleReference: styleReferenceUrl,
                       subjectReference: subjectReferenceUrl,
                     })}
                     className="w-12 h-12 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-[#ff477b] hover:border-[#ff477b] transition-colors shadow-2xl group/btn"
                     title="Re-Generate / Refresh"
                     aria-label="Regenerar fotograma"
                  >
                    <RefreshCw className="w-5 h-5 text-white/70 group-hover/btn:text-white" />
                  </button>
                  <button 
                     onClick={() => {
                       setEditingSceneIndex(selectedSceneIndex);
                       setIsLassoOpen(true);
                     }}
                     className="w-12 h-12 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-[#ff477b] hover:border-[#ff477b] transition-colors shadow-2xl group/btn"
                     title="Director's Cut (Lasso Edit)"
                     aria-label="Abrir editor de lazo"
                  >
                    <MousePointer2 className="w-5 h-5 text-white/70 group-hover/btn:text-white" />
                  </button>
                  <div className="p-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 flex flex-col items-center gap-1 shadow-2xl">
                    <button 
                      onClick={() => {
                        const newSegments = [...state.segments];
                        newSegments[selectedSceneIndex] = { ...newSegments[selectedSceneIndex], type: 'video' };
                        onUpdateState({ segments: newSegments });
                      }}
                      className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-colors", state.segments[selectedSceneIndex]?.type !== 'image' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80")}
                    >
                      <Video className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        const newSegments = [...state.segments];
                        newSegments[selectedSceneIndex] = { ...newSegments[selectedSceneIndex], type: 'image' };
                        onUpdateState({ segments: newSegments });
                      }}
                      className={cn("w-9 h-9 rounded-xl flex items-center justify-center transition-colors", state.segments[selectedSceneIndex]?.type === 'image' ? "bg-white/10 text-white" : "text-white/40 hover:text-white/80")}
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SCENEBUILDER TIMELINE (NLE Dock) */}
          <div className="h-[360px] bg-[#0c0c0e] border-t border-white/[0.05] flex flex-col flex-shrink-0 relative z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            
            {/* Integrated Prompt Control Bar */}
            <div
              ref={(el) => { tutorialAnchors.current['prompt-bar'] = el; }}
              className="h-16 border-b border-white/[0.05] bg-[#111113] flex items-center px-6 gap-4"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#ff477b]/10 border border-[#ff477b]/20">
                <Sparkles className="w-3.5 h-3.5 text-[#ff477b]" />
                <span className="text-[10px] font-bold text-[#ff477b] uppercase tracking-widest whitespace-nowrap">
                  {isEmpty ? 'Global Narrative' : `SEQ_${String(selectedSceneIndex + 1).padStart(2,'0')} Prompt`}
                </span>
              </div>
              
              <div className="flex-1 relative group">
                <input 
                  type="text"
                  value={isEmpty ? (state.globalWorldPrompt || "") : (state.segments[selectedSceneIndex]?.prompt || "")}
                  onChange={(e) => {
                    if (isEmpty) {
                      onUpdateState({ globalWorldPrompt: e.target.value });
                    } else {
                      const newSegs = [...state.segments];
                      newSegs[selectedSceneIndex] = { ...newSegs[selectedSceneIndex], prompt: e.target.value };
                      onUpdateState({ segments: newSegs });
                    }
                  }}
                  placeholder={isEmpty ? 'Describe tu película o estilo visual de alto nivel...' : 'Refinar esta escena con instrucciones lógicas...'}
                  className="w-full bg-transparent border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff477b]/50 rounded-md text-white/90 placeholder-white/20 text-sm font-medium py-2 px-2"
                  onKeyDown={(e) => e.key === 'Enter' && (isEmpty ? handleGenerateFlow() : onGenerateScene(selectedSceneIndex, {
                    cameraMotion: segmentCameraControls[state.segments[selectedSceneIndex]?.id]?.cameraMotion,
                    motionIntensity: segmentCameraControls[state.segments[selectedSceneIndex]?.id]?.motionIntensity,
                    durationSeconds: segmentCameraControls[state.segments[selectedSceneIndex]?.id]?.durationSeconds,
                    styleReference: styleReferenceUrl,
                    subjectReference: subjectReferenceUrl,
                  }))}
                />
                <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-[#ff477b] to-purple-600 w-0 group-focus-within:w-full transition-all duration-300" />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 text-[10px] text-white/60 uppercase font-mono tracking-widest px-4 border-r border-white/10">
                  <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-500" /> Nano Banana 2</span>
                  <span className="mx-2">•</span>
                  <span className="flex items-center gap-1"><Video className="w-3 h-3 text-blue-400" /> Veo 3.1</span>
                </div>
                
                {isEmpty ? (
                   <button 
                     onClick={handleGenerateFlow}
                     disabled={isGeneratingFlow || !state.globalWorldPrompt?.trim()}
                     className="h-9 px-6 rounded-lg bg-white text-black text-xs font-bold flex items-center gap-2 hover:bg-[#ff477b] hover:text-white transition-colors disabled:opacity-50"
                   >
                     {isGeneratingFlow ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                     Generar Storyboard
                   </button>
                ) : (
                  <button
                     onClick={() => onGenerateScene(selectedSceneIndex, {
                       cameraMotion: segmentCameraControls[state.segments[selectedSceneIndex]?.id]?.cameraMotion,
                       motionIntensity: segmentCameraControls[state.segments[selectedSceneIndex]?.id]?.motionIntensity,
                       durationSeconds: segmentCameraControls[state.segments[selectedSceneIndex]?.id]?.durationSeconds,
                       styleReference: styleReferenceUrl,
                       subjectReference: subjectReferenceUrl,
                     })}
                     className="h-9 w-9 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-[#ff477b] transition-colors"
                   >
                     <Plus className="w-4 h-4" />
                   </button>
                )}
              </div>
            </div>

            {/* Timeline Tracks */}
            {!isEmpty && (
              <div
                ref={(el) => { tutorialAnchors.current['timeline'] = el; }}
                className="flex-1 overflow-x-auto overflow-y-hidden px-6 py-8 flex gap-6 items-start pt-12 custom-scrollbar scroll-smooth"
              >
                {state.segments.map((seg, idx) => (
                  <div key={seg.id} className="relative flex-shrink-0 group">
                    {/* Timecode Header */}
                    <div className="absolute -top-7 left-0 right-0 flex items-center justify-between text-white/60 text-[9px] font-mono tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>00:00:{String(idx * 3).padStart(2,'0')}</span>
                    </div>

                    <button
                      onClick={() => setSelectedSceneIndex(idx)}
                      onMouseDown={(e) => handleSegmentDragStart(e, seg.id)}
                      className={cn(
                        "relative w-40 h-24 rounded-lg overflow-hidden border-2 transition-all block group cursor-move",
                        draggingSegId === seg.id ? "border-[#ff477b] bg-[#ff477b]/10 opacity-60 scale-95" : selectedSceneIndex === idx ? "border-[#ff477b] shadow-[0_0_20px_rgba(255,71,123,0.3)] scale-105" : "border-white/10 hover:border-white/30 hover:scale-[1.02]",
                        dragOverSegIdx === idx && draggingSegId !== seg.id ? "border-[#ff477b]/50" : ""
                      )}
                    >
                      {/* Drag handle indicator */}
                      {selectedSceneIndex === idx && (
                        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="w-3.5 h-3.5 text-[#ff477b]" />
                        </div>
                      )}
                      {seg.videoUrl ? (
                        seg.type === 'image' ? 
                         <img src={proxiedAssetUrl(seg.videoUrl)} className="w-full h-full object-cover" alt="" /> :
                         <video src={proxiedAssetUrl(seg.videoUrl)} className="w-full h-full object-cover" muted />
                      ) : (
                        <div className="w-full h-full bg-[#111113] flex items-center justify-center relative overflow-hidden">
                          {/* Stripe pattern for empty state */}
                          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff), repeating-linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff)', backgroundSize: '10px 10px', backgroundPosition: '0 0, 5px 5px' }} />
                          {seg.status === 'generating' ? <RefreshCw className="w-5 h-5 animate-spin text-[#ff477b]" /> : <MoreHorizontal className="w-5 h-5 text-white/50" />}
                        </div>
                      )}
                      
                      {/* Selection Overlay */}
                      <div className={cn(
                        "absolute inset-0 bg-[#ff477b]/10 pointer-events-none transition-opacity",
                        selectedSceneIndex === idx ? "opacity-100" : "opacity-0"
                      )} />
                    </button>

                    {/* Timeline connector visual */}
                    {idx < state.segments.length - 1 && (
                      <div className="absolute top-1/2 -right-6 w-6 h-[2px] bg-white/10 -translate-y-1/2" />
                    )}

                    {/* Camera & Duration Controls (show for selected segment) */}
                    {selectedSceneIndex === idx && (
                      <div className="absolute -bottom-20 left-0 w-40 flex flex-col gap-2 z-10">
                        {/* Camera motion pills */}
                        <div className="flex gap-1">
                          {(['PAN','TILT','ZOOM','DOLLY'] as const).map(motion => (
                            <button
                              key={motion}
                              onClick={() => setSegmentCameraControls(prev => ({
                                ...prev,
                                [seg.id]: {
                                  cameraMotion: prev[seg.id]?.cameraMotion === motion ? null : motion,
                                  motionIntensity: prev[seg.id]?.motionIntensity ?? 0.5,
                                  durationSeconds: prev[seg.id]?.durationSeconds ?? 6
                                }
                              }))}
                              className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border transition-colors",
                                segmentCameraControls[seg.id]?.cameraMotion === motion
                                  ? "bg-[#ff477b]/20 border-[#ff477b]/50 text-[#ff477b]"
                                  : "bg-white/5 border-white/10 text-white/40 hover:text-white/70"
                              )}
                            >
                              {motion}
                            </button>
                          ))}
                        </div>
                        {/* Duration selector */}
                        <div className="flex gap-1">
                          {[4, 6, 8].map(dur => (
                            <button
                              key={dur}
                              onClick={() => setSegmentCameraControls(prev => ({
                                ...prev,
                                [seg.id]: {
                                  cameraMotion: prev[seg.id]?.cameraMotion ?? null,
                                  motionIntensity: prev[seg.id]?.motionIntensity ?? 0.5,
                                  durationSeconds: dur
                                }
                              }))}
                              className={cn(
                                "flex-1 py-0.5 rounded text-[8px] font-bold border transition-colors",
                                (segmentCameraControls[seg.id]?.durationSeconds ?? 6) === dur
                                  ? "bg-white/10 border-white/20 text-white"
                                  : "bg-transparent border-white/5 text-white/30 hover:text-white/60"
                              )}
                            >
                              {dur}s
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Segment Button */}
                <button 
                  onClick={onAddScene}
                  className="relative flex-shrink-0 w-24 h-24 rounded-lg border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30 flex items-center justify-center text-white/30 hover:text-white transition-all"
                >
                  <PlusCircle className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Expert Agent Trigger (Kept consistent with global UI) */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('toggle-expert-chat', { detail: { open: true, persona: 'creative-director' } }))}
        className="fixed bottom-[20rem] right-8 z-[100] w-12 h-12 rounded-full bg-black/50 border border-white/10 text-white/50 flex items-center justify-center hover:bg-[#ff477b] hover:text-white hover:border-[#ff477b] shadow-2xl transition-all duration-300 group/chat backdrop-blur-md"
      >
        <MessageSquare className="w-5 h-5" />
        <span className="absolute right-full mr-4 px-3 py-1.5 bg-[#111113] border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover/chat:opacity-100 group-hover/chat:-translate-x-2 transition-all duration-300 font-bold tracking-wide text-white/80 shadow-xl">
          INsitu Expert
        </span>
      </button>

      {/* Lasso Modal */}
      {isLassoOpen && editingSceneIndex !== null && state.segments[editingSceneIndex]?.videoUrl && (
        <LassoCanvas
          sourceImage={state.segments[selectedSceneIndex].videoUrl!}
          onConfirm={handleLassoEdit}
          onCancel={() => {
            setIsLassoOpen(false);
            setEditingSceneIndex(null);
          }}
          language={language}
        />
      )}
    </div>
  );
};

export default FlowWorkspace;

