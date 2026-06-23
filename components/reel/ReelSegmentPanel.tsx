/**
 * ReelSegmentPanel.tsx
 * ====================
 * Per-segment editing panel: brightness, contrast, saturation, playback speed.
 * Displayed when a segment is selected in the timeline.
 */

import React from 'react';
import { Sun, Contrast, Droplets, Zap, RotateCcw } from 'lucide-react';
import type { VideoSegment, SegmentEditProps } from '../../types';

interface ReelSegmentPanelProps {
  segment: VideoSegment;
  editProps?: SegmentEditProps;
  onUpdate: (updates: Partial<SegmentEditProps>) => void;
}

const DEFAULT_PROPS: SegmentEditProps = {
  trimStartSeconds: 0,
  trimEndSeconds: 0,
  playbackSpeed: 1,
  brightness: 1,
  contrast: 1,
  saturation: 1,
};

const SliderRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}> = ({ icon, label, value, min, max, step, defaultValue, format, onChange }) => (
  <div className="flex items-center gap-3">
    <div className="text-white/40 flex-shrink-0">{icon}</div>
    <div className="flex-1">
      <div className="flex justify-between mb-1">
        <span className="text-white/60 text-xs">{label}</span>
        <span className="text-white/80 text-xs font-mono">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 rounded-full appearance-none bg-white/10 accent-violet-500"
      />
    </div>
    {value !== defaultValue && (
      <button
        onClick={() => onChange(defaultValue)}
        className="text-white/30 hover:text-white/60 transition-colors"
        title="Restablecer"
      >
        <RotateCcw className="w-3 h-3" />
      </button>
    )}
  </div>
);

export const ReelSegmentPanel: React.FC<ReelSegmentPanelProps> = ({
  segment,
  editProps,
  onUpdate,
}) => {
  const props = { ...DEFAULT_PROPS, ...editProps };

  const isModified = (
    props.brightness !== 1 || props.contrast !== 1 || props.saturation !== 1 || props.playbackSpeed !== 1
  );

  return (
    <div className="p-4 bg-white/3 border border-white/10 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-white/70 text-sm font-medium">
          Segmento {segment.index + 1} — edición visual
        </span>
        {isModified && (
          <button
            onClick={() => onUpdate(DEFAULT_PROPS)}
            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Restablecer todo
          </button>
        )}
      </div>

      <SliderRow
        icon={<Sun className="w-4 h-4" />}
        label="Brillo"
        value={props.brightness}
        min={0.3}
        max={2}
        step={0.05}
        defaultValue={1}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => onUpdate({ brightness: v })}
      />

      <SliderRow
        icon={<Contrast className="w-4 h-4" />}
        label="Contraste"
        value={props.contrast}
        min={0.3}
        max={2}
        step={0.05}
        defaultValue={1}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => onUpdate({ contrast: v })}
      />

      <SliderRow
        icon={<Droplets className="w-4 h-4" />}
        label="Saturación"
        value={props.saturation}
        min={0}
        max={2.5}
        step={0.05}
        defaultValue={1}
        format={(v) => v === 0 ? 'B&N' : `${Math.round(v * 100)}%`}
        onChange={(v) => onUpdate({ saturation: v })}
      />

      <SliderRow
        icon={<Zap className="w-4 h-4" />}
        label="Velocidad"
        value={props.playbackSpeed}
        min={0.25}
        max={3}
        step={0.25}
        defaultValue={1}
        format={(v) => `${v}×`}
        onChange={(v) => onUpdate({ playbackSpeed: v })}
      />
    </div>
  );
};
