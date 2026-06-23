import React from "react";
import { motion } from "framer-motion";
import { InfoTooltip } from "./InfoTooltip";

interface HeatmapPoint {
  x: number;
  y: number;
  relevance: number;
  label?: string;
  details?: string;
  dwellTime?: string;
}

interface HeatmapOverlayProps {
  points: HeatmapPoint[];
  mode?: "markers" | "glow" | "gaze-path";
  theme?: "dark" | "light";
}

/**
 * HeatmapOverlay - High-fidelity visualization for neuromarketing attention mapping.
 * Supports individual markers, dense glow "heat" blobs, and sequential gaze paths.
 */
export const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ 
  points, 
  mode = "markers", 
  theme = "dark" 
}) => {
  if (!points || points.length === 0) return null;

  // Generate the SVG path for the gaze-path mode
  const pathData = points.length > 1 
    ? `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`
    : "";

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none">
      {/* SVG for Gaze Path Lines */}
      {mode === "gaze-path" && (
        <svg 
          className="absolute inset-0 w-full h-full" 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="gazeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff477b" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            
            {/* Advanced Heatmap Filter: Creates a 'metaball' / viscous liquid effect */}
            <filter id="heatmapFilter">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="metaball" />
              <feComposite in="SourceGraphic" in2="metaball" operator="atop" />
            </filter>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          <motion.path
            d={pathData}
            fill="none"
            stroke="url(#gazeGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1, 8"
            filter="url(#glow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: 1, 
              opacity: 1,
              strokeDashoffset: [0, -32]
            }}
            transition={{ 
              pathLength: { duration: 3, ease: "easeInOut" },
              strokeDashoffset: { duration: 4, repeat: Infinity, ease: "linear" },
              opacity: { duration: 0.5 }
            }}
          />
          
          {/* Glowing Trail (Solid path behind the dots) */}
          <motion.path
            d={pathData}
            fill="none"
            stroke="url(#gazeGradient)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.3 }}
            transition={{ duration: 3, ease: "easeInOut" }}
          />
          
          {/* Pulsing Dot along the path */}
          <motion.circle
            r="1.2"
            fill="#ff477b"
            filter="url(#glow)"
            initial={{ offsetDistance: "0%" }}
            animate={{ offsetDistance: "100%" }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            style={{ 
              offsetPath: `path("${pathData}")`,
              motionPath: `path("${pathData}")` 
            } as any}
          />
          
          {/* Arrows along the path to show direction */}
          {points.slice(0, -1).map((p, i) => {
            const next = points[i + 1];
            const angle = Math.atan2(next.y - p.y, next.x - p.x) * (180 / Math.PI);
            return (
              <motion.path
                key={`arrow-${i}`}
                d="M -1.2,-1 L 1.2,0 L -1.2,1"
                fill="none"
                stroke="#ff477b"
                strokeWidth="0.5"
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ delay: 1 + i * 0.2 }}
                style={{ 
                  transform: `translate(${(p.x + next.x) / 2}px, ${(p.y + next.y) / 2}px) rotate(${angle}deg)`,
                  transformOrigin: 'center'
                }}
              />
            );
          })}
        </svg>
      )}

      {points.map((point, idx) => {
        // Color mapping: Red (High/Focus), Green (Mid), Blue (Low)
        const isFocus = point.relevance > 7 || point.label?.includes("[FOCUS]");
        const isFix = point.label?.includes("[FIX]");
        
        const color = isFocus ? "#ef4444" : isFix ? "#f59e0b" : "#3b82f6";
        const intensity = point.relevance / 10;

        return (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.08, type: "spring", stiffness: 200 }}
            key={`${idx}-${point.x}-${point.y}`}
            className="absolute group/point pointer-events-auto"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            <div className="relative -translate-x-1/2 -translate-y-1/2 cursor-crosshair">
              {/* Dense Heatmap Glow Blob (Organic Radial Gradient) */}
              {mode === "glow" && (
                <div className="absolute inset-0 pointer-events-none" style={{ filter: 'url(#heatmapFilter)' }}>
                  {/* Layer 1: Massive soft ambient glow */}
                  <div 
                    className="absolute inset-0 w-[450px] h-[450px] blur-[100px] opacity-[0.08] -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 mix-blend-screen"
                    style={{ 
                      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                      transform: `translate(-50%, -50%) scale(${1.5 + intensity})`
                    }}
                  ></div>
                  {/* Layer 2: Medium heat dissipation */}
                  <div 
                    className="absolute inset-0 w-80 h-80 blur-[60px] opacity-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 mix-blend-screen"
                    style={{ 
                      background: `radial-gradient(circle, ${color} 0%, ${color}22 40%, transparent 80%)`,
                      transform: `translate(-50%, -50%) scale(${1.2 + intensity})`
                    }}
                  ></div>
                  {/* Layer 3: Inner core heat */}
                  <div 
                    className="absolute inset-0 w-48 h-48 blur-[30px] opacity-40 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 mix-blend-screen"
                    style={{ 
                      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                      transform: `translate(-50%, -50%) scale(${0.8 + intensity})`
                    }}
                  ></div>
                  {/* Layer 4: Hot spot focus */}
                  <div 
                    className="absolute inset-0 w-24 h-24 blur-[15px] opacity-60 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 mix-blend-screen"
                    style={{ 
                      background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
                      transform: `translate(-50%, -50%) scale(${0.5 + intensity})`
                    }}
                  ></div>
                  {/* Layer 5: Nucleus */}
                  <div 
                    className="absolute inset-0 w-12 h-12 blur-[5px] opacity-90 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 mix-blend-screen"
                    style={{ 
                      background: `radial-gradient(circle, #ffffff 0%, ${color} 50%, transparent 100%)`,
                      transform: `translate(-50%, -50%) scale(${0.3 + intensity})`
                    }}
                  ></div>
                </div>
              )}

              {/* Core Marker */}
              <div 
                className={`w-8 h-8 rounded-full border-2 border-white/80 shadow-2xl flex items-center justify-center transition-all duration-300 group-hover/point:scale-125 z-10`}
                style={{ 
                  backgroundColor: color,
                  boxShadow: `0 0 35px ${color}, 0 0 15px ${color}aa, inset 0 0 10px rgba(255,255,255,0.5)`,
                  backdropFilter: "blur(8px)"
                }}
              >
                {/* For Gaze Path: Show sequence number */}
                {mode === "gaze-path" && (
                  <span className="text-[11px] font-black text-white leading-none drop-shadow-md">
                    {idx + 1}
                  </span>
                )}
                
                {/* Pulse for High Relevance */}
                {isFocus && (
                  <div 
                    className="absolute inset-0 rounded-full animate-ping opacity-60"
                    style={{ 
                      backgroundColor: color,
                      animationDuration: '1.5s'
                    }}
                  ></div>
                )}
                <div className="absolute inset-0 rounded-full border border-white/20 animate-pulse"></div>
              </div>

              {/* Hover Tooltip (Rich Details) */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 opacity-0 group-hover/point:opacity-100 transition-all duration-300 pointer-events-none z-50">
                <div className={`${theme === "dark" ? "bg-black/90 border-white/10" : "bg-white border-slate-200"} border backdrop-blur-xl p-3 rounded-xl shadow-2xl min-w-[160px]`}>
                   <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest ${isFocus ? "text-rose-400" : isFix ? "text-amber-400" : "text-blue-400"}`}>
                      {point.label || (isFocus ? "High Focus" : "Attention Area")}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500">
                      Score: {point.relevance}/10
                    </span>
                  </div>
                  <p className={`text-[11px] leading-snug font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                    {point.details || "Zona de interés predictiva detectada por el motor neuronal."}
                  </p>
                  {point.dwellTime && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 uppercase font-bold">Dwell Time:</span>
                      <span className="text-[9px] text-[#ff477b] font-black">{point.dwellTime}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
