import React from 'react';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface VeracityScore {
  overall: number;
  claimsVerified: number;
  claimsUnverified: number;
  hallucinations: string[];
  recommendations: string[];
  tier: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
}

interface VeracityBadgeProps {
  score?: VeracityScore;
  sourceTiers?: Array<{ source: string; tier: number; reason: string }>;
  validationReady?: boolean;
  expanded?: boolean;
  language?: string;
}

const TIER_COLORS = {
  VERIFIED: 'from-emerald-500 to-teal-500',
  NEEDS_REVIEW: 'from-amber-500 to-orange-500',
  REJECTED: 'from-rose-500 to-red-500',
};

const TIER_ICONS = {
  VERIFIED: CheckCircle2,
  NEEDS_REVIEW: AlertCircle,
  REJECTED: XCircle,
};

const TIER_LABELS = {
  es: {
    VERIFIED: 'Verificado',
    NEEDS_REVIEW: 'Necesita Revisión',
    REJECTED: 'Rechazado',
  },
  en: {
    VERIFIED: 'Verified',
    NEEDS_REVIEW: 'Needs Review',
    REJECTED: 'Rejected',
  },
};

const SOURCE_TIER_NAMES = {
  1: 'Tier 1 (Premium)',
  2: 'Tier 2 (Official)',
  3: 'Tier 3 (National)',
  4: 'Tier 4 (General)',
};

export const VeracityBadge: React.FC<VeracityBadgeProps> = ({
  score,
  sourceTiers,
  validationReady,
  expanded = false,
  language = 'es',
}) => {
  if (!score) return null;

  const Icon = TIER_ICONS[score.tier];
  const color = TIER_COLORS[score.tier];
  const tierLabel = TIER_LABELS[language as 'es' | 'en'][score.tier];
  const isCompact = !expanded;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${isCompact ? 'mb-4' : 'mb-6'}`}
    >
      {/* Compact Badge */}
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-md ${
          score.tier === 'VERIFIED'
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : score.tier === 'NEEDS_REVIEW'
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-rose-500/10 border-rose-500/30'
        }`}
      >
        <Icon
          className={`w-5 h-5 ${
            score.tier === 'VERIFIED'
              ? 'text-emerald-400'
              : score.tier === 'NEEDS_REVIEW'
              ? 'text-amber-400'
              : 'text-rose-400'
          }`}
        />

        <div className="flex-1">
          <p className="text-sm font-bold text-white">{tierLabel}</p>
          <p className="text-xs text-white/60">
            {score.claimsVerified}/{score.claimsVerified + score.claimsUnverified}{' '}
            {language === 'es' ? 'citas verificadas' : 'citations verified'}
          </p>
        </div>

        {/* Score Meter */}
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
              style={{ width: `${Math.min(score.overall, 100)}%` }}
            />
          </div>
          <span
            className={`text-xs font-black ${
              score.tier === 'VERIFIED'
                ? 'text-emerald-400'
                : score.tier === 'NEEDS_REVIEW'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {score.overall}
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 space-y-2"
        >
          {/* Hallucinations */}
          {score.hallucinations.length > 0 && (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3">
              <p className="text-xs font-bold text-rose-300 mb-1">
                {language === 'es' ? '⚠️ Posibles Alucinaciones' : '⚠️ Possible Hallucinations'}
              </p>
              <ul className="space-y-1">
                {score.hallucinations.slice(0, 3).map((h, i) => (
                  <li key={i} className="text-xs text-rose-200/80">
                    • {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source Tiers */}
          {sourceTiers && sourceTiers.length > 0 && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
              <p className="text-xs font-bold text-blue-300 mb-2">
                {language === 'es' ? '📚 Análisis de Fuentes' : '📚 Source Analysis'}
              </p>
              <div className="space-y-1">
                {sourceTiers.slice(0, 5).map((st, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-blue-200/80 line-clamp-1">{st.source}</span>
                    <span
                      className={`text-xs font-bold whitespace-nowrap ${
                        st.tier === 1
                          ? 'text-emerald-400'
                          : st.tier === 2
                          ? 'text-blue-400'
                          : st.tier === 3
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {SOURCE_TIER_NAMES[st.tier as 1 | 2 | 3 | 4]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {score.recommendations.length > 0 && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-xs font-bold text-emerald-300 mb-1">
                {language === 'es' ? '✅ Recomendaciones' : '✅ Recommendations'}
              </p>
              <ul className="space-y-1">
                {score.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-emerald-200/80">
                    • {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Status Badge */}
          {score.tier === 'REJECTED' && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
              <p className="text-xs text-rose-300 font-bold">
                {language === 'es'
                  ? '❌ Esta investigación NO debe publicarse sin revisión'
                  : '❌ This research should NOT be published without review'}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default VeracityBadge;
