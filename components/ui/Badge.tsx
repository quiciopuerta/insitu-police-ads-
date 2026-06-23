import React from "react";
import { motion } from "framer-motion";

interface BadgeProps {
  label: string;
  dotColor?: string;
  className?: string;
  animate?: boolean;
}

/**
 * Premium Badge Component
 * Implements the "Stitch" aesthetic: glassmorphism, pulsing neon dot, and high-tracking typography.
 */
export const Badge: React.FC<BadgeProps> = ({
  label,
  dotColor = "var(--brand-magenta)",
  className = "",
  animate = true,
}) => {
  const content = (
    <div
      className={`inline-flex items-center gap-3 px-6 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] ${className}`}
    >
      <span className="flex h-2 w-2 relative">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: dotColor }}
        ></span>
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ backgroundColor: dotColor }}
        ></span>
      </span>
      {label}
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {content}
    </motion.div>
  );
};
