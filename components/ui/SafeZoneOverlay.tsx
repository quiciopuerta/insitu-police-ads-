import React from "react";
import { motion } from "framer-motion";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Music2, 
  Search, 
  MoreVertical,
  User,
  Plus
} from "lucide-react";

interface SafeZoneOverlayProps {
  platform: "TikTok" | "Meta" | "YouTube" | "Generic";
  theme: "dark" | "light";
  violations?: string[];
  safeRects?: { x: number; y: number; w: number; h: number; label?: string }[];
}

/**
 * GhostUI - stylized platform elements to show context within safe zones
 */
const GhostUI: React.FC<{ platform: string }> = ({ platform }) => {
  if (platform === "TikTok") {
    return (
      <>
        {/* Sidebar Icons */}
        <div className="absolute right-[4%] top-[25%] flex flex-col gap-6 items-center opacity-30">
          {/* Profile Pic with Plus */}
          <div className="w-14 h-14 rounded-full border-2 border-white/40 flex items-center justify-center relative bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm">
             <div className="w-11 h-11 rounded-full bg-slate-400/20 flex items-center justify-center">
               <User size={28} className="text-white/60" />
             </div>
             <div className="absolute -bottom-1 w-5 h-5 bg-[#ff477b] rounded-full flex items-center justify-center border-2 border-black/50">
               <Plus size={14} className="text-white font-black" />
             </div>
          </div>
          {/* Engagement Stack */}
          <div className="flex flex-col items-center gap-1.5 group">
            <Heart size={36} className="text-white fill-white/10 group-hover:fill-rose-500 transition-colors" />
            <span className="text-[11px] font-black text-white drop-shadow-md">124K</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <MessageCircle size={36} className="text-white fill-white/10" />
            <span className="text-[11px] font-black text-white drop-shadow-md">1.2K</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Share2 size={36} className="text-white fill-white/10" />
            <span className="text-[11px] font-black text-white drop-shadow-md">458</span>
          </div>
          {/* Music Disk */}
          <div className="w-12 h-12 rounded-full bg-black/40 border-2 border-white/20 animate-spin-slow flex items-center justify-center relative overflow-hidden mt-4">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent"></div>
            <Music2 size={24} className="text-white/60" />
          </div>
        </div>
        {/* Bottom Info Stack */}
        <div className="absolute bottom-[6%] left-[4%] right-[22%] flex flex-col gap-2.5 opacity-30">
          <div className="flex items-center gap-2">
            <div className="h-5 w-40 bg-white/60 rounded-md"></div>
            <div className="px-2 py-0.5 border border-white/40 rounded text-[9px] text-white font-bold tracking-tighter">AD</div>
          </div>
          <div className="h-4 w-full bg-white/40 rounded-md"></div>
          <div className="h-4 w-4/5 bg-white/20 rounded-md"></div>
          <div className="flex items-center gap-3 mt-2">
            <div className="p-1.5 bg-white/10 rounded-full">
              <Music2 size={14} className="text-white" />
            </div>
            <div className="h-4 w-36 bg-white/15 rounded-md overflow-hidden relative">
               <div className="absolute inset-0 animate-pulse bg-white/5"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (platform === "Meta") {
    return (
      <>
        {/* Reels Sidebar */}
        <div className="absolute right-[4%] bottom-[12%] flex flex-col gap-7 items-center opacity-30">
          <div className="flex flex-col items-center gap-1">
            <Heart size={32} className="text-white" />
            <span className="text-[10px] font-bold text-white">Like</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <MessageCircle size={32} className="text-white" />
            <span className="text-[10px] font-bold text-white">Com.</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Share2 size={32} className="text-white" />
            <span className="text-[10px] font-bold text-white">Share</span>
          </div>
          <MoreVertical size={32} className="text-white" />
          <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20"></div>
        </div>
        {/* Caption & Profile */}
        <div className="absolute bottom-[4%] left-[4%] right-[25%] flex flex-col gap-4 opacity-30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-white/30 bg-white/10"></div>
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-32 bg-white rounded-md"></div>
              <div className="h-3 w-48 bg-white/50 rounded-md"></div>
            </div>
            <div className="ml-auto px-4 py-1.5 border border-white/40 rounded-lg text-[10px] text-white font-black">FOLLOW</div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-white/30 rounded-md"></div>
            <div className="h-4 w-2/3 bg-white/15 rounded-md"></div>
          </div>
        </div>
      </>
    );
  }

  if (platform === "YouTube") {
    return (
      <>
        {/* Header Controls */}
        <div className="absolute top-0 left-0 right-0 h-20 flex items-center justify-between px-[5%] opacity-20">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-full bg-white/20"></div>
             <div className="w-32 h-5 bg-white/40 rounded-lg"></div>
          </div>
          <div className="flex items-center gap-6">
            <Search size={24} className="text-white" />
            <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/10"></div>
          </div>
        </div>
        {/* Shorts Overlay */}
        <div className="absolute right-[3%] bottom-[18%] flex flex-col gap-7 items-center opacity-30">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
              <Heart size={32} className="text-white fill-white/20" />
            </div>
            <span className="text-[11px] font-black text-white">45.2K</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
              <MessageCircle size={32} className="text-white fill-white/20" />
            </div>
            <span className="text-[11px] font-black text-white">840</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
              <Share2 size={32} className="text-white" />
            </div>
            <span className="text-[11px] font-black text-white">Share</span>
          </div>
          <div className="w-12 h-12 bg-white/10 border-2 border-white/30 rounded-xl overflow-hidden mt-4">
             <div className="w-full h-full bg-gradient-to-tr from-rose-500/20 to-blue-500/20"></div>
          </div>
        </div>
        {/* Channel Info */}
        <div className="absolute bottom-[4%] left-[4%] right-[20%] flex flex-col gap-4 opacity-30">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20"></div>
            <div className="flex flex-col gap-1.5">
              <div className="h-5 w-48 bg-white/60 rounded-md"></div>
              <div className="h-4 w-32 bg-white/30 rounded-md"></div>
            </div>
            <div className="ml-4 px-6 py-2 bg-rose-600 text-white font-black rounded-full text-[11px] shadow-lg shadow-rose-900/20">SUBSCRIBE</div>
          </div>
        </div>
      </>
    );
  }

  return null;
};

/**
 * Renders an overlay representing the "Safe Zones" of a platform.
 * These are areas where UI elements (buttons, profile, text) usually overlap the creative.
 */
export const SafeZoneOverlay: React.FC<SafeZoneOverlayProps> = ({
  platform,
  theme,
  violations = [],
  safeRects = [],
}) => {
  // Standard Platform Templates (percentage-based)
  const templates: Record<string, { x: number; y: number; w: number; h: number; label: string }[]> = {
    TikTok: [
      { x: 0, y: 0, w: 100, h: 10, label: "Top Navigation" },
      { x: 75, y: 30, w: 25, h: 55, label: "Interactive Sidebar" },
      { x: 0, y: 75, w: 75, h: 15, label: "Description & Info" },
      { x: 0, y: 90, w: 100, h: 10, label: "Bottom Menu" },
    ],
    Meta: [
      { x: 0, y: 0, w: 100, h: 12, label: "Top Bar / Profile" },
      { x: 0, y: 85, w: 100, h: 15, label: "Call to Action / Footer" },
      { x: 82, y: 50, w: 18, h: 35, label: "Engagement Sidebar" },
    ],
    YouTube: [
      { x: 0, y: 0, w: 100, h: 12, label: "Search & Controls" },
      { x: 0, y: 85, w: 100, h: 15, label: "Video Timeline & CTA" },
      { x: 85, y: 40, w: 15, h: 45, label: "Shorts Sidebar" },
    ],
    Generic: [
      { x: 5, y: 5, w: 90, h: 90, label: "Safe Margin" },
    ],
  };

  const activeRects = safeRects.length > 0 ? safeRects : templates[platform] || templates.Generic;

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {/* Semi-transparent Backdrop for unsafe areas */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[0.5px]"></div>

      {/* Ghost UI Platform Context */}
      <GhostUI platform={platform} />

      {activeRects.map((rect, idx) => {
        const isViolated = violations.some(v => 
          v.toLowerCase().includes(rect.label?.toLowerCase() || "") || 
          v.toLowerCase().includes(platform.toLowerCase())
        );
        
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`absolute border-2 ${
              isViolated 
                ? "border-rose-500 bg-rose-500/10 shadow-[inset_0_0_50px_rgba(244,63,94,0.1)]" 
                : "border-white/10 bg-white/5 backdrop-blur-[1px]"
            } flex items-center justify-center rounded-lg overflow-hidden transition-colors duration-500`}
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.w}%`,
              height: `${rect.h}%`,
              borderStyle: isViolated ? 'solid' : 'dashed'
            }}
          >
            <div className={`absolute inset-0 ${isViolated ? "bg-rose-500/5" : "bg-gradient-to-br from-white/5 to-transparent"} opacity-50`}></div>
            
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isViolated ? "text-rose-400" : "text-white/20"} rotate-[-15deg] whitespace-nowrap drop-shadow-lg`}>
              {rect.label || "Blocked Zone"}
            </span>

            {isViolated && (
              <motion.div 
                animate={{ 
                  opacity: [0.1, 0.3, 0.1],
                  boxShadow: ["0 0 0px #f43f5e", "0 0 40px #f43f5e33", "0 0 0px #f43f5e"]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 border-2 border-rose-500/50"
              />
            )}
          </motion.div>
        );
      })}

      {/* Compliance Badge */}
      <div className="absolute top-8 right-8 flex items-center gap-4 px-5 py-3 bg-black/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${violations.length === 0 ? "bg-emerald-500 shadow-[0_0_15px_#10b981]" : "bg-rose-500 shadow-[0_0_15px_#f43f5e]"} animate-pulse`}></div>
          <div className={`absolute inset-0 w-3 h-3 rounded-full ${violations.length === 0 ? "bg-emerald-500" : "bg-rose-500"} animate-ping opacity-30`}></div>
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] leading-none mb-1.5">
            {platform} V2026 Audit
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${violations.length === 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {violations.length === 0 ? "Visual Integrity: High" : "Compliance Issues Detected"}
            </span>
            {violations.length > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-400 text-[8px] font-black rounded border border-rose-500/30">
                {violations.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

