/**
 * ReelTimelineEditor.tsx
 * ======================
 * Visual timeline editor for reel composition.
 * CSS absolute positioning — no canvas, no DnD library.
 *
 * Supports:
 *   - Segment reordering via drag
 *   - Text layer move + resize via drag handles
 *   - Image layer display
 *   - Playhead display (updated externally via onTimeUpdate)
 *   - Zoom (pxPerSecond)
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GripVertical, Type, Image as ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';
import type { VideoSegment, TextLayer, ImageLayer } from '../../types';

const LANE_HEIGHT = 36;
const HEADER_WIDTH = 80;
const MIN_PX_PER_SEC = 20;
const MAX_PX_PER_SEC = 200;
const DEFAULT_PX_PER_SEC = 60;

// Segment colors
const SEG_COLORS = [
  'bg-violet-600/70',
  'bg-fuchsia-600/70',
  'bg-indigo-600/70',
  'bg-purple-600/70',
  'bg-pink-600/70',
];

// Text layer color cycle
const TEXT_COLORS = [
  '#60a5fa', '#34d399', '#f59e0b', '#f472b6', '#a78bfa',
];

type DragKind =
  | { kind: 'segment-move'; id: string; startOrder: string[] }
  | { kind: 'text-move'; id: string; origStart: number }
  | { kind: 'text-resize-left'; id: string; origStart: number; origDuration: number }
  | { kind: 'text-resize-right'; id: string; origDuration: number };

interface ReelTimelineEditorProps {
  segments: VideoSegment[];
  segmentOrder: string[];
  textLayers: TextLayer[];
  imageLayers: ImageLayer[];
  totalDuration: number;
  playheadTime?: number;
  onReorderSegments: (newOrder: string[]) => void;
  onUpdateTextLayer: (id: string, updates: Partial<TextLayer>) => void;
  onSelectSegment?: (id: string | null) => void;
  onTimeSeek?: (time: number) => void;
}

export const ReelTimelineEditor: React.FC<ReelTimelineEditorProps> = ({
  segments,
  segmentOrder,
  textLayers,
  imageLayers,
  totalDuration,
  playheadTime = 0,
  onReorderSegments,
  onUpdateTextLayer,
  onSelectSegment,
  onTimeSeek,
}) => {
  const [pxPerSec, setPxPerSec] = useState(DEFAULT_PX_PER_SEC);
  const [selectedSegId, setSelectedSegId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const containerRef  = useRef<HTMLDivElement>(null);
  const dragRef       = useRef<DragKind | null>(null);
  const dragStartXRef = useRef(0);
  const playheadRef   = useRef<HTMLDivElement>(null);

  const timelineWidth = totalDuration * pxPerSec;

  // Update playhead via direct DOM mutation (no React re-render)
  useEffect(() => {
    if (playheadRef.current) {
      playheadRef.current.style.left = `${HEADER_WIDTH + playheadTime * pxPerSec}px`;
    }
  }, [playheadTime, pxPerSec]);

  // --- Ordered segments ---
  const orderedSegs = segmentOrder
    .map(id => segments.find(s => s.id === id))
    .filter((s): s is VideoSegment => !!s);

  // --- Segment start offsets (for positioning) ---
  const segStartOffsets: Record<string, number> = {};
  let offset = 0;
  for (const s of orderedSegs) {
    segStartOffsets[s.id] = offset;
    offset += s.durationSeconds;
  }

  // --- Drag handlers ---
  const startDrag = useCallback((e: React.MouseEvent, drag: DragKind) => {
    e.preventDefault();
    dragRef.current = drag;
    dragStartXRef.current = e.clientX;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - dragStartXRef.current;
      const dt = dx / pxPerSec;
      const d = dragRef.current;
      if (!d) return;

      if (d.kind === 'segment-move') {
        // Compute which slot the dragged segment is over
        const draggedIdx = d.startOrder.indexOf(d.id);
        const segW = segments.find(s => s.id === d.id)?.durationSeconds ?? 6;
        const rawX = (segStartOffsets[d.id] ?? 0) * pxPerSec + dx;
        const slotIdx = Math.round(rawX / (segW * pxPerSec));
        const clamped = Math.max(0, Math.min(d.startOrder.length - 1, slotIdx));
        if (clamped !== draggedIdx) setDragOverIndex(clamped);
      } else if (d.kind === 'text-move') {
        const newStart = Math.max(0, Math.min(totalDuration - 1, d.origStart + dt));
        onUpdateTextLayer(d.id, { startSecond: Math.round(newStart * 10) / 10 });
      } else if (d.kind === 'text-resize-right') {
        const newDur = Math.max(0.5, d.origDuration + dt);
        onUpdateTextLayer(d.id, { durationSeconds: Math.round(newDur * 10) / 10 });
      } else if (d.kind === 'text-resize-left') {
        const newStart = Math.max(0, d.origStart + dt);
        const newDur   = Math.max(0.5, d.origDuration - dt);
        onUpdateTextLayer(d.id, { startSecond: Math.round(newStart * 10) / 10, durationSeconds: Math.round(newDur * 10) / 10 });
      }
    };

    const onUp = () => {
      const d = dragRef.current;
      if (d?.kind === 'segment-move' && dragOverIndex !== null) {
        const newOrder = [...d.startOrder];
        const fromIdx  = newOrder.indexOf(d.id);
        const [removed] = newOrder.splice(fromIdx, 1);
        newOrder.splice(dragOverIndex, 0, removed);
        onReorderSegments(newOrder);
      }
      dragRef.current = null;
      setDragOverIndex(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pxPerSec, segStartOffsets, segments, totalDuration, onUpdateTextLayer, onReorderSegments, dragOverIndex]);

  // Click on timeline to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onTimeSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = e.clientX - rect.left - HEADER_WIDTH;
    const t    = Math.max(0, Math.min(totalDuration, x / pxPerSec));
    onTimeSeek(t);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    setPxPerSec(prev => Math.max(MIN_PX_PER_SEC, Math.min(MAX_PX_PER_SEC, prev * factor)));
  };

  const laneCount = 1 + textLayers.length + (imageLayers.length > 0 ? 1 : 0);
  const totalHeight = laneCount * LANE_HEIGHT + 32; // 32 for ruler

  return (
    <div className="flex flex-col gap-2">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 justify-end">
        <button onClick={() => setPxPerSec(p => Math.max(MIN_PX_PER_SEC, p * 0.8))}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-white/40 text-xs">{pxPerSec.toFixed(0)}px/s</span>
        <button onClick={() => setPxPerSec(p => Math.min(MAX_PX_PER_SEC, p * 1.25))}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Timeline scroll container */}
      <div
        ref={containerRef}
        className="relative overflow-x-auto overflow-y-hidden rounded-xl bg-white/3 border border-white/10 select-none"
        style={{ height: totalHeight }}
        onWheel={handleWheel}
      >
        {/* Playhead */}
        <div
          ref={playheadRef}
          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 pointer-events-none"
          style={{ left: HEADER_WIDTH }}
        />

        {/* Time ruler */}
        <div
          className="sticky top-0 left-0 z-10 h-8 bg-black/40 flex items-end"
          style={{ width: HEADER_WIDTH + timelineWidth }}
          onClick={handleTimelineClick}
        >
          <div className="w-20 flex-shrink-0 border-r border-white/10" />
          <div className="relative flex-1 h-full cursor-pointer">
            {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: i * pxPerSec - 1 }}
              >
                <div className="w-px h-2 bg-white/20" />
                {i % 6 === 0 && (
                  <span className="text-white/30 text-[11px] absolute bottom-2">{i}s</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Segment lane */}
        <div className="flex" style={{ height: LANE_HEIGHT }}>
          <div className="w-20 flex-shrink-0 flex items-center px-2 border-r border-white/10">
            <span className="text-white/40 text-[11px] truncate">Segmentos</span>
          </div>
          <div className="relative flex-1" style={{ width: timelineWidth }}>
            {orderedSegs.map((seg, idx) => {
              const x   = segStartOffsets[seg.id] * pxPerSec;
              const w   = seg.durationSeconds * pxPerSec;
              const isSelected = seg.id === selectedSegId;
              const colorClass = SEG_COLORS[idx % SEG_COLORS.length];

              return (
                <div
                  key={seg.id}
                  className={`absolute top-1 bottom-1 rounded-lg flex items-center gap-1 px-2 cursor-pointer
                    border transition-all ${isSelected ? 'border-white/40 ring-1 ring-white/20' : 'border-white/10'}
                    ${colorClass} ${dragOverIndex === idx ? 'ring-2 ring-white/50' : ''}`}
                  style={{ left: x, width: w - 2 }}
                  onClick={() => { setSelectedSegId(seg.id); onSelectSegment?.(seg.id); }}
                  onMouseDown={(e) => startDrag(e, {
                    kind: 'segment-move',
                    id: seg.id,
                    startOrder: segmentOrder,
                  })}
                >
                  <GripVertical className="w-3 h-3 text-white/40 flex-shrink-0" />
                  <span className="text-white/80 text-[11px] font-medium truncate">
                    Seg {idx + 1}
                  </span>
                  {seg.thumbnailDataUrl && (
                    <img
                      src={seg.thumbnailDataUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-20 pointer-events-none"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Text layer lanes */}
        {textLayers.map((layer, idx) => {
          const x = layer.startSecond * pxPerSec;
          const w = layer.durationSeconds * pxPerSec;
          const color = TEXT_COLORS[idx % TEXT_COLORS.length];

          return (
            <div key={layer.id} className="flex" style={{ height: LANE_HEIGHT }}>
              <div className="w-20 flex-shrink-0 flex items-center gap-1 px-2 border-r border-white/10">
                <Type className="w-3 h-3 flex-shrink-0" style={{ color }} />
                <span className="text-white/40 text-[11px] truncate">{layer.text.substring(0, 8)}</span>
              </div>
              <div className="relative flex-1" style={{ width: timelineWidth }}>
                <div
                  className="absolute top-1.5 bottom-1.5 rounded flex items-center cursor-grab active:cursor-grabbing overflow-hidden"
                  style={{ left: x, width: Math.max(8, w - 2), background: `${color}30`, border: `1px solid ${color}60` }}
                  onMouseDown={(e) => startDrag(e, {
                    kind: 'text-move',
                    id: layer.id,
                    origStart: layer.startSecond,
                  })}
                >
                  {/* Left resize handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-white/20"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startDrag(e, { kind: 'text-resize-left', id: layer.id, origStart: layer.startSecond, origDuration: layer.durationSeconds });
                    }}
                  />
                  <span className="flex-1 text-center text-[11px] truncate px-2" style={{ color }}>
                    {layer.text.substring(0, 12)}
                  </span>
                  {/* Right resize handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/20"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startDrag(e, { kind: 'text-resize-right', id: layer.id, origDuration: layer.durationSeconds });
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Image layer lane */}
        {imageLayers.length > 0 && (
          <div className="flex" style={{ height: LANE_HEIGHT }}>
            <div className="w-20 flex-shrink-0 flex items-center gap-1 px-2 border-r border-white/10">
              <ImageIcon className="w-3 h-3 text-amber-400/70 flex-shrink-0" />
              <span className="text-white/40 text-[11px]">Logo</span>
            </div>
            <div className="relative flex-1" style={{ width: timelineWidth }}>
              {imageLayers.map((layer) => {
                const x = layer.startSecond * pxPerSec;
                const w = layer.durationSeconds * pxPerSec;
                return (
                  <div
                    key={layer.id}
                    className="absolute top-1.5 bottom-1.5 rounded flex items-center px-2"
                    style={{ left: x, width: Math.max(8, w - 2), background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)' }}
                  >
                    <span className="text-amber-400/70 text-[11px] truncate">
                      {layer.src ? 'logo' : 'sin imagen'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
