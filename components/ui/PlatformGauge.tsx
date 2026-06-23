/**
 * PlatformGauge — Sprint 1 Feature ③
 * Semicircular SVG gauge animated on mount with ease-out.
 * Usage: <PlatformGauge score={78} platform="Google" />
 */
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface PlatformGaugeProps {
  score: number;       // 0–100
  platform: string;   // "Google" | "Meta" | "TikTok" | any
  size?: number;      // px, default 120
  theme?: "dark" | "light";
  animationDelay?: number; // seconds
}

const PLATFORM_COLORS: Record<string, { primary: string; glow: string; bg: string }> = {
  Google:   { primary: "#4285F4", glow: "rgba(66,133,244,0.35)",  bg: "#4285F4/10" },
  Meta:     { primary: "#1877F2", glow: "rgba(24,119,242,0.35)",  bg: "#1877F2/10" },
  TikTok:   { primary: "#ff477b", glow: "rgba(255,71,123,0.35)",  bg: "#ff477b/10" },
  YouTube:  { primary: "#FF0000", glow: "rgba(255,0,0,0.3)",      bg: "#FF0000/10" },
  LinkedIn: { primary: "#0077B5", glow: "rgba(0,119,181,0.3)",    bg: "#0077B5/10" },
  X:        { primary: "#94a3b8", glow: "rgba(148,163,184,0.3)",  bg: "#94a3b8/10" },
};

const getColor = (platform: string, score: number) => {
  const key = Object.keys(PLATFORM_COLORS).find(k =>
    platform.toLowerCase().includes(k.toLowerCase())
  );
  if (key) return PLATFORM_COLORS[key];
  // Fallback color based on score
  if (score >= 75) return { primary: "#10b981", glow: "rgba(16,185,129,0.35)", bg: "#10b981/10" };
  if (score >= 50) return { primary: "#f59e0b", glow: "rgba(245,158,11,0.35)", bg: "#f59e0b/10" };
  return { primary: "#ef4444", glow: "rgba(239,68,68,0.35)", bg: "#ef4444/10" };
};

// Normalize platform names for display
const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  google: "Google",
  meta: "Meta",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

const PlatformGauge: React.FC<PlatformGaugeProps> = ({
  score: rawScore,
  platform: rawPlatform,
  size = 120,
  theme = "dark",
  animationDelay = 0,
}) => {
  // Sanitize score: handle NaN, strings like "75", "75/100", undefined
  const score = (() => {
    if (typeof rawScore === 'number' && !isNaN(rawScore)) return Math.min(100, Math.max(0, rawScore));
    if (typeof rawScore === 'string') {
      const parsed = parseFloat(rawScore);
      if (!isNaN(parsed)) return Math.min(100, Math.max(0, parsed));
    }
    return 0;
  })();
  // Normalize platform display name
  const platform = PLATFORM_DISPLAY_NAMES[rawPlatform.toLowerCase()] || rawPlatform;
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 1200; // ms
      const steps = 60;
      const stepValue = score / steps;
      let current = 0;
      let step = 0;

      const interval = setInterval(() => {
        // ease-out: slow down near end
        const progress = step / steps;
        const eased = 1 - Math.pow(1 - progress, 3);
        current = Math.round(eased * score);
        setAnimatedScore(current);
        step++;
        if (step > steps) {
          clearInterval(interval);
          setAnimatedScore(score);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, animationDelay * 1000);

    return () => clearTimeout(timeout);
  }, [score, animationDelay]);

  const colors = getColor(platform, score);

  // SVG arc math for semicircle
  const radius = size * 0.38;
  const cx = size / 2;
  const cy = size / 2 + size * 0.08; // shift center down slightly for semicircle
  const strokeWidth = size * 0.09;

  // Semicircle: 180° arc from 180° to 0° (left to right, bottom half hidden)
  const circumference = Math.PI * radius; // half circle arc length
  const progress = Math.min(animatedScore / 100, 1);
  const dashOffset = circumference * (1 - progress);

  // Arc path: start at far left (180°), end at far right (0°)
  const startX = cx - radius;
  const startY = cy;
  const endX = cx + radius;
  const endY = cy;

  const trackPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  const scoreColor = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: animationDelay, duration: 0.4 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative" style={{ width: size, height: size * 0.65 }}>
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-40 pointer-events-none"
          style={{ background: colors.glow }}
        />

        <svg
          width={size}
          height={size * 0.65}
          viewBox={`0 0 ${size} ${size * 0.65}`}
          overflow="visible"
        >
          {/* Track (background arc) */}
          <path
            d={trackPath}
            fill="none"
            stroke={theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Progress arc */}
          <path
            d={trackPath}
            fill="none"
            stroke={colors.primary}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              filter: `drop-shadow(0 0 ${strokeWidth * 0.6}px ${colors.primary})`,
              transition: "stroke-dashoffset 0.016s linear",
            }}
          />

          {/* Center score number */}
          <text
            x={cx}
            y={cy - radius * 0.15}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.22}
            fontWeight="900"
            fontFamily="'Inter', sans-serif"
            fill={scoreColor}
            style={{ fontStyle: "italic" }}
          >
            {animatedScore}
          </text>

          {/* Percent sign */}
          <text
            x={cx + size * 0.13}
            y={cy - radius * 0.35}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.1}
            fontWeight="700"
            fill={theme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)"}
          >
            %
          </text>
        </svg>
      </div>

      {/* Platform label */}
      <p
        className="text-center font-black uppercase tracking-widest leading-none"
        style={{
          fontSize: size * 0.09,
          color: colors.primary,
        }}
      >
        {platform}
      </p>

      {/* Score bar indicator */}
      <div
        className="w-full h-1 rounded-full overflow-hidden"
        style={{ maxWidth: size * 0.8, background: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.2, delay: animationDelay, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: colors.primary }}
        />
      </div>
    </motion.div>
  );
};

export default PlatformGauge;
