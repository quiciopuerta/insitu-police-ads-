import React, { useState, useRef, useCallback, useEffect } from "react";
import { Language } from "../types";

interface MediaEditorProps {
  mediaUrl: string;
  originalUrl?: string;
  mediaType: 'image' | 'video';
  voiceoverUrl?: string;
  improvements?: string[];
  language: Language;
  onClose: () => void;
}

const MediaEditorView: React.FC<MediaEditorProps> = ({
  mediaUrl,
  originalUrl,
  mediaType,
  voiceoverUrl,
  improvements = [],
  language,
  onClose,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleSliderMove = useCallback((clientX: number) => {
    if (!containerRef.current || !isDragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  }, [isDragging]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleSliderMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => handleSliderMove(e.touches[0].clientX);
    const handleUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, handleSliderMove]);

  // Sync video + audio
  useEffect(() => {
    if (voiceoverUrl && videoRef.current && audioRef.current) {
      const video = videoRef.current;
      const audio = audioRef.current;
      const syncAudio = () => { audio.currentTime = video.currentTime; if (!video.paused) audio.play(); };
      video.addEventListener('play', syncAudio);
      video.addEventListener('pause', () => audio.pause());
      video.addEventListener('seeked', syncAudio);
      return () => {
        video.removeEventListener('play', syncAudio);
        video.removeEventListener('pause', () => audio.pause());
        video.removeEventListener('seeked', syncAudio);
      };
    }
  }, [voiceoverUrl]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = `insitu-${mediaType}-${Date.now()}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
    link.click();
  };

  const showComparison = originalUrl && originalUrl !== mediaUrl;

  return (
    <div className="fixed inset-0 z-[80] bg-[#0a0f1e]/95 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <span className="text-sm">✏️</span>
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-tight">
              {language === 'es' ? 'Editor de Medios' : 'Media Editor'}
            </h2>
            <p className="text-[11px] font-bold text-white/20 uppercase tracking-widest">
              {mediaType === 'image' ? (language === 'es' ? 'Imagen' : 'Image') : 'Video'}
              {showComparison && ` · ${language === 'es' ? 'Modo Comparación' : 'Comparison Mode'}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDownload} className="px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {language === 'es' ? 'Descargar' : 'Download'}
          </button>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Media Area */}
        <div className="flex-1 flex items-center justify-center p-6 relative">
          {showComparison ? (
            /* Before/After Slider */
            <div
              ref={containerRef}
              className="relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden border border-white/10 cursor-col-resize select-none"
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
            >
              {/* Original (Background) */}
              {mediaType === 'image' ? (
                <img src={originalUrl} alt="Original" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <video src={originalUrl} className="absolute inset-0 w-full h-full object-cover" muted loop autoPlay playsInline />
              )}

              {/* Improved (Clipped) */}
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                {mediaType === 'image' ? (
                  <img src={mediaUrl} alt="Improved" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <video ref={videoRef} src={mediaUrl} className="absolute inset-0 w-full h-full object-cover" muted loop autoPlay playsInline />
                )}
              </div>

              {/* Slider Line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_20px_rgba(255,255,255,0.5)] z-10 cursor-col-resize"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 backdrop-blur-xl flex items-center justify-center shadow-2xl">
                  <svg className="w-5 h-5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 9l4-4 4 4M8 15l4 4 4-4" />
                  </svg>
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
                <span className="text-[11px] font-black uppercase tracking-widest text-white/80">{language === 'es' ? 'Original' : 'Before'}</span>
              </div>
              <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-lg bg-emerald-500/80 backdrop-blur-sm">
                <span className="text-[11px] font-black uppercase tracking-widest text-white">{language === 'es' ? 'Mejorado' : 'After'}</span>
              </div>
            </div>
          ) : (
            /* Single Media View */
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden border border-white/10">
              {mediaType === 'image' ? (
                <img src={mediaUrl} alt="Generated" className="w-full h-auto" />
              ) : (
                <video ref={videoRef} src={mediaUrl} className="w-full h-auto" controls loop playsInline />
              )}
            </div>
          )}

          {/* Hidden audio for voiceover */}
          {voiceoverUrl && <audio ref={audioRef} src={voiceoverUrl} />}
        </div>

        {/* Sidebar - Improvements & Actions */}
        {improvements.length > 0 && (
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 p-6 overflow-y-auto bg-white/[0.02]">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="text-sm">💡</span>
              {language === 'es' ? 'Mejoras Sugeridas' : 'Suggested Improvements'}
            </h3>
            <div className="space-y-3">
              {improvements.map((imp, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[11px] font-black text-emerald-400">{i + 1}</span>
                    </div>
                    <p className="text-white/50 text-xs leading-relaxed">{imp}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Voiceover indicator */}
            {voiceoverUrl && (
              <div className="mt-6 p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">🎤</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-violet-400/50">
                    {language === 'es' ? 'Voiceover Sincronizado' : 'Synced Voiceover'}
                  </span>
                </div>
                <audio src={voiceoverUrl} controls className="w-full h-8" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaEditorView;
