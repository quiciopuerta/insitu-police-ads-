/**
 * PlatformFormatSelector
 * ======================
 * Visual aspect-ratio selector grouped by platform.
 *
 * - `mode="video"` → only Veo 3.1 supported ratios (9:16, 16:9)
 * - `mode="image"` → all Imagen 3 ratios (1:1, 9:16, 16:9, 3:4, 4:5)
 *
 * Always emits ratio strings: '9:16' | '16:9' | '1:1' | '3:4' | '4:5'
 */

import React from 'react';
import { motion } from 'framer-motion';

export type AspectRatio = '9:16' | '16:9' | '3:4' | '4:5';

interface FormatOption {
  value: AspectRatio;
  ratio: string;           // human-readable label
  platforms: string[];     // platform names shown as tags
  w: number;               // width part of ratio (for visual preview)
  h: number;               // height part of ratio
  popular?: boolean;       // shows "Popular" badge
  videoNote?: string;      // note when used in video mode
}

const ALL_FORMATS: FormatOption[] = [
  {
    value: '9:16',
    ratio: '9:16',
    platforms: ['TikTok', 'Reels', 'Stories', 'Shorts'],
    w: 9, h: 16,
    popular: true,
  },
  {
    value: '16:9',
    ratio: '16:9',
    platforms: ['YouTube', 'LinkedIn', 'Twitter/X'],
    w: 16, h: 9,
  },
  {
    value: '4:5',
    ratio: '4:5',
    platforms: ['IG Feed', 'Facebook Feed'],
    w: 4, h: 5,
    videoNote: 'Veo 3.1 usa 9:16',
  },
  {
    value: '3:4',
    ratio: '3:4',
    platforms: ['Pinterest', 'Display'],
    w: 3, h: 4,
    videoNote: 'Veo 3.1 usa 9:16',
  },
];

// Max bounding box for the aspect ratio preview
const BOX_MAX = 44; // px

function previewSize(w: number, h: number): { width: number; height: number } {
  if (w >= h) {
    // Landscape or square: constrain width to BOX_MAX
    const width  = BOX_MAX;
    const height = Math.round(BOX_MAX * h / w);
    return { width, height };
  } else {
    // Portrait: constrain height to BOX_MAX
    const height = BOX_MAX;
    const width  = Math.round(BOX_MAX * w / h);
    return { width, height };
  }
}

interface Props {
  value: string;
  onChange: (ratio: AspectRatio) => void;
  mode?: 'video' | 'image';
  label?: string;
}

export const PlatformFormatSelector: React.FC<Props> = ({
  value,
  onChange,
  mode = 'image',
  label,
}) => {
  const formats = mode === 'video'
    ? ALL_FORMATS.filter(f => f.value === '9:16' || f.value === '16:9')
    : ALL_FORMATS;

  // Normalize incoming value (handle legacy 'Landscape'/'Portrait')
  const normalizedValue = (() => {
    if (value === 'Landscape') return '16:9';
    if (value === 'Portrait' || value === 'Social') return '9:16';
    if (value === 'Square') return '9:16';
    return value;
  })();

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-[11px] font-black uppercase tracking-widest text-white/40">
          {label}
        </p>
      )}

      <div className={`grid gap-2 ${mode === 'video' ? 'grid-cols-2' : 'grid-cols-3 sm:grid-cols-5'}`}>
        {formats.map(fmt => {
          const { width, height } = previewSize(fmt.w, fmt.h);
          const active = normalizedValue === fmt.value;

          return (
            <motion.button
              key={fmt.value}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(fmt.value)}
              className={`
                relative flex flex-col items-center justify-between gap-2
                p-3 rounded-2xl border text-center transition-all
                ${active
                  ? 'bg-gradient-to-b from-[#ff477b]/15 to-[#ff6b35]/10 border-[#ff477b]/50'
                  : 'bg-white/3 border-white/8 hover:bg-white/6 hover:border-white/15'
                }
              `}
            >
              {/* Popular badge */}
              {fmt.popular && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-[#ff477b] text-[6px] font-black uppercase tracking-widest text-white leading-none">
                  Popular
                </span>
              )}

              {/* Aspect ratio preview box */}
              <div className="flex items-center justify-center" style={{ height: BOX_MAX + 4 }}>
                <div
                  className={`rounded-[4px] transition-all ${
                    active
                      ? 'bg-gradient-to-br from-[#ff477b]/60 to-[#ff6b35]/40 border border-[#ff477b]/50'
                      : 'bg-white/10 border border-white/15'
                  }`}
                  style={{ width, height }}
                >
                  {/* Inner grid lines for visual depth */}
                  <div className="w-full h-full opacity-30 rounded-[3px] overflow-hidden">
                    {fmt.w >= fmt.h ? (
                      // Landscape: horizontal lines
                      <>
                        <div className="border-b border-white/20 h-1/3" />
                        <div className="border-b border-white/20 h-1/3" />
                      </>
                    ) : (
                      // Portrait: vertical line
                      <div className="flex h-full">
                        <div className="border-r border-white/20 w-1/2" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ratio label */}
              <span className={`text-[11px] font-black tracking-wider ${active ? 'text-[#ff477b]' : 'text-white/50'}`}>
                {fmt.ratio}
              </span>

              {/* Platform tags */}
              <div className="flex flex-wrap justify-center gap-0.5">
                {fmt.platforms.slice(0, mode === 'video' ? 4 : 3).map(p => (
                  <span
                    key={p}
                    className={`text-[7px] font-bold uppercase tracking-wider leading-none ${
                      active ? 'text-white/60' : 'text-white/25'
                    }`}
                  >
                    {p}
                  </span>
                ))}
              </div>

              {/* Video mode note for unsupported ratios */}
              {mode === 'video' && fmt.videoNote && (
                <span className="text-[6px] text-amber-400/70 font-bold uppercase tracking-widest">
                  {fmt.videoNote}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default PlatformFormatSelector;
