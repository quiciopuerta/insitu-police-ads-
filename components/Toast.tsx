import React, { useEffect } from "react";

export type ToastType = "success" | "error" | "mail" | "info" | "warning";

export interface ToastData {
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  imageUrl?: string;
  videoUrl?: string;
}

const toastConfig: Record<ToastType, { icon: string; bg: string; border: string; text: string; iconBg: string }> = {
  success: {
    icon: "✓",
    bg: "bg-emerald-950/80",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    iconBg: "bg-emerald-500/20",
  },
  error: {
    icon: "✕",
    bg: "bg-rose-950/80",
    border: "border-rose-500/30",
    text: "text-rose-400",
    iconBg: "bg-rose-500/20",
  },
  mail: {
    icon: "✉",
    bg: "bg-violet-950/80",
    border: "border-violet-500/30",
    text: "text-violet-300",
    iconBg: "bg-violet-500/20",
  },
  info: {
    icon: "ℹ",
    bg: "bg-blue-950/80",
    border: "border-blue-500/30",
    text: "text-blue-300",
    iconBg: "bg-blue-500/20",
  },
  warning: {
    icon: "⚠",
    bg: "bg-amber-950/80",
    border: "border-amber-500/30",
    text: "text-amber-300",
    iconBg: "bg-amber-500/20",
  },
};

const Toast: React.FC<{ toast: ToastData | null; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  // === Defensive guard: never crash the React tree even with corrupt state ===
  try {
    // Early return if no valid toast object
    if (!toast || typeof toast !== 'object') return null;
    
    // Use a safe type with fallback to 'info'
    const safeType = (toast.type && toastConfig[toast.type]) ? toast.type : 'info';
    const cfg = toastConfig[safeType] || toastConfig['info'];
    const dur = toast.duration ?? 5000;
    const safeDismiss = typeof onDismiss === 'function' ? onDismiss : () => {};

    useEffect(() => {
      const t = setTimeout(safeDismiss, dur);
      return () => clearTimeout(t);
    }, [safeDismiss, dur]);

    // If even after fallbacks we don't have config, don't render to avoid crash
    if (!cfg) return null;

    return (
      <div
        className={`fixed top-6 left-1/2 z-[1000] -translate-x-1/2 w-[calc(100%-2rem)] max-w-md
          ${cfg.bg || 'bg-slate-900'} backdrop-blur-xl border ${cfg.border || 'border-white/10'} rounded-2xl p-4 shadow-2xl
          animate-in slide-in-from-top-4 fade-in duration-300`}
        style={{ boxShadow: "0 20px 50px -12px rgba(0,0,0,0.5)" }}
      >
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 ${cfg.iconBg || ''} ${cfg.text || ''} rounded-xl flex items-center justify-center text-lg font-black`}>
            {cfg.icon || 'i'}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-black text-sm ${cfg.text || 'text-white'} uppercase tracking-wide`}>{toast.title || 'Notification'}</p>
            <p className="text-white/60 text-xs mt-1 leading-relaxed">{toast.message || ''}</p>
            
            {(toast.imageUrl || toast.videoUrl) && (
              <div className="mt-3 relative rounded-xl overflow-hidden aspect-video bg-black/20 border border-white/5 group/media">
                {toast.imageUrl && (
                  <img 
                    src={toast.imageUrl} 
                    alt="Notification Media" 
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                {toast.videoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform group-hover/media:scale-110 transition-transform">
                      <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[8px] border-l-slate-900 ml-0.5"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={safeDismiss} className="flex-shrink-0 text-white/20 hover:text-white/60 transition-colors text-lg leading-none">×</button>
        </div>
        <div className={`mt-3 h-0.5 ${cfg.iconBg || 'bg-white/10'} rounded-full overflow-hidden`}>
          <div
            className={`h-full ${cfg.text || 'text-white'} bg-current rounded-full`}
            style={{ animation: `shrink ${dur}ms linear forwards` }}
          />
        </div>
        <style>{`@keyframes shrink { from { width: 100% } to { width: 0% } }`}</style>
      </div>
    );
  } catch (err) {
    // Last-resort: if anything in Toast throws, fail silently and return nothing
    console.error('[Toast] Render failed silently:', err);
    return null;
  }
};

export default Toast;
