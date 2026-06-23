/**
 * ReelImageLayerCard.tsx
 * ======================
 * Editor card for Image/Logo overlay layers.
 * Supports file upload (converted to base64) and URL input.
 */

import React, { useRef } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import type { ImageLayer, TextPosition } from '../../types';

interface ReelImageLayerCardProps {
  layer: ImageLayer;
  totalDuration: number;
  onUpdate: (updates: Partial<ImageLayer>) => void;
  onRemove: () => void;
}

const POSITIONS: { value: TextPosition; label: string }[] = [
  { value: 'topLeft',      label: '↖' },
  { value: 'topCenter',    label: '↑' },
  { value: 'topRight',     label: '↗' },
  { value: 'middleLeft',   label: '←' },
  { value: 'center',       label: '•' },
  { value: 'middleRight',  label: '→' },
  { value: 'bottomLeft',   label: '↙' },
  { value: 'bottomCenter', label: '↓' },
  { value: 'bottomRight',  label: '↘' },
];

export const ReelImageLayerCard: React.FC<ReelImageLayerCardProps> = ({
  layer,
  totalDuration,
  onUpdate,
  onRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (src) onUpdate({ src });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 bg-white/3 border border-amber-500/20 rounded-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          <span className="text-white/80 text-sm font-medium">Logo / Watermark</span>
        </div>
        <button onClick={onRemove} className="text-white/30 hover:text-rose-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Image source */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors text-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            Subir imagen
          </button>
          {layer.src && layer.src.startsWith('data:') && (
            <img src={layer.src} alt="preview" className="w-10 h-10 object-contain rounded-lg bg-white/5" />
          )}
        </div>
        <input
          type="text"
          placeholder="O pegar URL de imagen..."
          value={layer.src.startsWith('data:') ? '' : layer.src}
          onChange={(e) => onUpdate({ src: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs placeholder-white/30 focus:outline-none focus:border-amber-500/40"
        />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Position grid */}
      <div>
        <label className="text-white/50 text-xs mb-2 block">Posición</label>
        <div className="grid grid-cols-3 gap-1">
          {POSITIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onUpdate({ position: value })}
              className={`py-1.5 rounded-lg text-sm transition-colors ${
                layer.position === value
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-white/50 text-xs">Tamaño</label>
          <span className="text-white/70 text-xs font-mono">{Math.round(layer.widthFraction * 100)}%</span>
        </div>
        <input
          type="range" min={0.05} max={0.5} step={0.01}
          value={layer.widthFraction}
          onChange={(e) => onUpdate({ widthFraction: parseFloat(e.target.value) })}
          className="w-full h-1 rounded-full appearance-none bg-white/10 accent-amber-500"
        />
      </div>

      {/* Opacity */}
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-white/50 text-xs">Opacidad</label>
          <span className="text-white/70 text-xs font-mono">{Math.round(layer.opacity * 100)}%</span>
        </div>
        <input
          type="range" min={0.1} max={1} step={0.05}
          value={layer.opacity}
          onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
          className="w-full h-1 rounded-full appearance-none bg-white/10 accent-amber-500"
        />
      </div>

      {/* Timing */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-white/50 text-xs">Inicio</label>
            <span className="text-white/70 text-xs font-mono">{layer.startSecond.toFixed(1)}s</span>
          </div>
          <input
            type="range" min={0} max={Math.max(0, totalDuration - 1)} step={0.5}
            value={layer.startSecond}
            onChange={(e) => onUpdate({ startSecond: parseFloat(e.target.value) })}
            className="w-full h-1 rounded-full appearance-none bg-white/10 accent-amber-500"
          />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-white/50 text-xs">Duración</label>
            <span className="text-white/70 text-xs font-mono">{layer.durationSeconds.toFixed(1)}s</span>
          </div>
          <input
            type="range" min={0.5} max={totalDuration} step={0.5}
            value={layer.durationSeconds}
            onChange={(e) => onUpdate({ durationSeconds: parseFloat(e.target.value) })}
            className="w-full h-1 rounded-full appearance-none bg-white/10 accent-amber-500"
          />
        </div>
      </div>

      {/* Enter animation */}
      <div className="flex gap-2">
        {(['none', 'fadeIn', 'scaleIn'] as const).map((anim) => (
          <button
            key={anim}
            onClick={() => onUpdate({ enterAnimation: anim })}
            className={`px-2 py-1 rounded-lg text-xs transition-colors ${
              layer.enterAnimation === anim
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'
            }`}
          >
            {anim === 'none' ? 'Sin entrada' : anim === 'fadeIn' ? 'Fade in' : 'Scale in'}
          </button>
        ))}
      </div>
    </div>
  );
};
