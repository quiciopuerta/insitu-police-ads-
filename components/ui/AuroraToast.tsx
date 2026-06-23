import React, { useEffect } from "react";
import { PlatformUpdateType } from "../../types";

export interface AuroraToastProps {
  show: boolean;
  type: PlatformUpdateType;
  title: string;
  message: string;
  onClose: () => void;
  duration?: number;
}

const config: Record<PlatformUpdateType, { accent: string; secondary: string; glow: string; icon: string }> = {
  major: {
    accent: "from-fuchsia-500 via-purple-500 to-indigo-500",
    secondary: "text-fuchsia-400",
    glow: "shadow-fuchsia-500/20",
    icon: "✨",
  },
  feature: {
    accent: "from-cyan-400 via-blue-500 to-indigo-500",
    secondary: "text-cyan-400",
    glow: "shadow-cyan-500/20",
    icon: "🚀",
  },
  fix: {
    accent: "from-emerald-400 via-teal-500 to-cyan-500",
    secondary: "text-emerald-400",
    glow: "shadow-emerald-500/20",
    icon: "🔧",
  },
  "ai-upgrade": {
    accent: "from-violet-500 via-indigo-600 to-blue-600",
    secondary: "text-violet-400",
    glow: "shadow-violet-600/20",
    icon: "🧠",
  },
};

const AuroraToast: React.FC<AuroraToastProps> = ({ show, type, title, message, onClose, duration = 8000 }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show) return null;

  const c = config[type] || config.feature;

  return (
    <div className="fixed top-6 right-6 z-[9999] w-full max-w-sm pointer-events-auto">
      <div className={`
        relative overflow-hidden
        bg-slate-900/80 backdrop-blur-2xl
        border border-white/10 rounded-2xl
        p-5 shadow-2xl ${c.glow}
        animate-in fade-in slide-in-from-right-8 zoom-in-95 duration-500
      `}>
        {/* Animated Aurora Background */}
        <div className={`absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br ${c.accent} opacity-20 blur-3xl animate-pulse`} />
        
        <div className="relative flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-inner">
            {c.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${c.secondary}`}>
                {type.replace("-", " ")}
              </span>
              <div className="h-1.5 w-1.5 rounded-full bg-white/20" />
              <span className="text-[10px] text-white/40 font-medium">Ahora</span>
            </div>
            
            <h4 className="text-white font-bold text-base leading-tight">
              {title}
            </h4>
            <p className="text-white/60 text-xs mt-1.5 leading-relaxed line-clamp-2">
              {message}
            </p>
          </div>
          
          <button 
            onClick={onClose}
            className="flex-shrink-0 text-white/20 hover:text-white/60 transition-colors p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
          <div 
            className={`h-full bg-gradient-to-r ${c.accent}`}
            style={{ 
              animation: `shrink-horizontal ${duration}ms linear forwards` 
            }}
          />
        </div>
      </div>
      
      <style>{`
        @keyframes shrink-horizontal {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default AuroraToast;
