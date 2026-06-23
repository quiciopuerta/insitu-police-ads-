/**
 * SpotlightModal.tsx — Cinematic one-shot platform update modal
 * Appears once per user after a new platform update is published.
 */
import { useState, useEffect, useRef } from "react";
import type { PlatformUpdate } from "../types";
import type { Language } from "../types";

interface SpotlightModalProps {
  update: PlatformUpdate;
  language: Language;
  onClose: () => void;
  onGoToFeature?: (tab: string) => void;
}

const TYPE_CONFIG = {
  major:      { label: "Major Update",   color: "#ff477b", glow: "rgba(255,71,123,0.35)",  icon: "✦", gradient: "from-pink-500/20 via-purple-500/10 to-cyan-500/5" },
  feature:    { label: "Nueva función",  color: "#7c3aed", glow: "rgba(124,58,237,0.3)",  icon: "⚡", gradient: "from-purple-500/20 via-indigo-500/10 to-transparent" },
  "ai-upgrade": { label: "AI Upgrade",  color: "#00f1fd", glow: "rgba(0,241,253,0.2)",  icon: "🧠", gradient: "from-cyan-500/20 via-blue-500/10 to-transparent" },
  fix:        { label: "Mejoras",        color: "#10b981", glow: "rgba(16,185,129,0.2)",  icon: "🔧", gradient: "from-emerald-500/15 via-teal-500/10 to-transparent" },
};

export default function SpotlightModal({ update, language, onClose, onGoToFeature }: SpotlightModalProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const confettiFired = useRef(false);
  const cfg = TYPE_CONFIG[update.type] || TYPE_CONFIG.feature;
  const title = language === "es" ? update.title_es : (update.title_en || update.title_es);
  const description = language === "es" ? update.description_es : (update.description_en || update.description_es);

  useEffect(() => {
    // Entry animation
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Confetti burst for major updates (lazy-loaded)
  useEffect(() => {
    if (update.type !== "major" || confettiFired.current || !visible) return;
    confettiFired.current = true;
    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({
        particleCount: 130,
        spread: 90,
        origin: { x: 0.5, y: 0.45 },
        colors: ["#ff477b", "#00f1fd", "#a78bfa", "#ffffff"],
        zIndex: 10001,
      });
    }).catch(() => {}); // Graceful fallback if package not installed
  }, [visible, update.type]);

  const close = () => {
    setLeaving(true);
    setTimeout(onClose, 350);
  };

  const handleCTA = () => {
    if (update.feature_tab && onGoToFeature) {
      onGoToFeature(update.feature_tab);
    } else if (update.cta_url) {
      window.open(update.cta_url, "_blank");
    }
    close();
  };

  return (
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center px-4 transition-all duration-350 ${
        visible && !leaving ? "opacity-100" : "opacity-0"
      }`}
      style={{ backdropFilter: "blur(20px)", background: "rgba(2,6,23,0.85)" }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      {/* Ambient glow */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${cfg.glow}, transparent 70%)`,
          filter: "blur(60px)",
          transform: visible && !leaving ? "scale(1)" : "scale(0.5)",
          transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {/* Modal card */}
      <div
        className={`relative w-full max-w-lg bg-[#080e21] border rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-[450ms] cubic-bezier-spring ${
          visible && !leaving ? "scale-100 translate-y-0 opacity-100" : "scale-90 translate-y-8 opacity-0"
        }`}
        style={{
          borderColor: `${cfg.color}33`,
          boxShadow: `0 0 80px ${cfg.glow}, 0 30px 60px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Gradient header */}
        <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient}`}
          style={{ background: `linear-gradient(90deg, ${cfg.color}, transparent)` }} />

        {/* Particle lines decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-20"
          style={{ background: `radial-gradient(circle at top right, ${cfg.color}44, transparent 60%)` }} />

        {/* Content */}
        <div className="p-8 relative">
          {/* Close */}
          <button
            onClick={close}
            className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/80 transition-all text-lg"
          >×</button>

          {/* Type badge */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl">{cfg.icon}</span>
            <div
              className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
              style={{ color: cfg.color, borderColor: `${cfg.color}44`, background: `${cfg.color}11` }}
            >
              {cfg.label}
            </div>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-auto">
              v{update.version}
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-2xl md:text-3xl font-black text-white leading-tight mb-3 tracking-tight">
            {title}
          </h2>

          {/* Body */}
          <p className="text-sm text-white/60 leading-relaxed mb-6">{description}</p>

          {/* Preview image */}
          {update.preview_url && (
            <div className="rounded-2xl overflow-hidden border border-white/5 mb-6"
              style={{ boxShadow: `0 10px 40px ${cfg.glow}` }}>
              <img src={update.preview_url} alt={title} className="w-full object-cover max-h-48" />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCTA}
              className="flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}aa)` }}
            >
              {language === "es" ? "Ver novedad →" : "Explore →"}
            </button>
            <button
              onClick={close}
              className="px-5 py-3 rounded-xl font-bold text-sm text-white/40 hover:text-white/60 bg-white/5 hover:bg-white/10 transition-all"
            >
              {language === "es" ? "Cerrar" : "Close"}
            </button>
          </div>

          {/* One-shot indicator */}
          <p className="text-center text-[10px] text-white/20 mt-4 font-medium">
            {language === "es" ? "Este aviso aparece una sola vez" : "This announcement appears only once"}
          </p>
        </div>
      </div>
    </div>
  );
}
