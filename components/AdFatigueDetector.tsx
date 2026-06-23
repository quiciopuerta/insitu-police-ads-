import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, TrendingDown, Zap, RefreshCw, BarChart2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { Language } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface FatigueInputs {
  frequency: number;       // avg exposures per user (e.g. 3.2)
  ctr: number;             // current CTR in % (e.g. 1.4)
  daysRunning: number;     // days ad has been live
  baselineCtr?: number;    // original CTR when launched (optional)
  platform?: string;       // 'meta' | 'google' | 'tiktok' | 'linkedin'
}

interface FatigueResult {
  score: number;           // 0–100
  level: 'low' | 'medium' | 'high' | 'critical';
  daysToFatigue: number;   // estimated days until critical fatigue (-1 = already critical)
  recommendation: string;
  signals: { label: string; severity: 'ok' | 'warning' | 'danger' }[];
}

// ---------------------------------------------------------------------------
// Scoring engine (deterministic, no AI)
// ---------------------------------------------------------------------------
function calculateFatigueScore(inputs: FatigueInputs): FatigueResult {
  const { frequency, ctr, daysRunning, baselineCtr, platform } = inputs;

  // Platform-specific CTR benchmarks
  const benchmarks: Record<string, number> = {
    meta: 1.0, google: 0.5, tiktok: 1.8, linkedin: 0.4, default: 0.8,
  };
  const benchmark = benchmarks[platform || 'default'] || benchmarks.default;
  const ctrDrop = baselineCtr ? ((baselineCtr - ctr) / baselineCtr) * 100 : 0;

  // --- Score components (each 0–100, weighted) ---
  const freqScore  = Math.min(100, (frequency / 5) * 100);              // 5+ = max risk
  const ctrScore   = Math.min(100, Math.max(0, (benchmark - ctr) / benchmark * 100));
  const dropScore  = Math.min(100, Math.max(0, ctrDrop * 2));           // 50% drop = max
  const ageScore   = Math.min(100, (daysRunning / 30) * 60);            // 30 days = 60pts

  // Weighted total
  const score = Math.round(
    freqScore * 0.35 +
    ctrScore  * 0.30 +
    dropScore * 0.20 +
    ageScore  * 0.15
  );

  const clampedScore = Math.min(100, Math.max(0, score));

  // Level classification
  let level: FatigueResult['level'];
  if (clampedScore < 30) level = 'low';
  else if (clampedScore < 55) level = 'medium';
  else if (clampedScore < 75) level = 'high';
  else level = 'critical';

  // Days to fatigue estimate
  const dailyIncrease = (freqScore * 0.5 + ctrScore * 0.3 + ageScore * 0.2) / 30;
  const remaining = Math.max(0, 75 - clampedScore);
  const daysToFatigue = level === 'critical' ? -1 : Math.round(remaining / Math.max(dailyIncrease, 0.5));

  // Recommendation
  const recommendations: Record<FatigueResult['level'], string> = {
    low:      'El creativo está en excelente estado. Monitorea semanalmente.',
    medium:   'Señales tempranas de desgaste. Prepara nuevas variaciones ahora.',
    high:     'Riesgo alto. Rota el creativo en los próximos 3-5 días.',
    critical: 'Fatiga crítica. Pausa inmediatamente y activa nuevas creatividades.',
  };

  // Signal breakdown
  const signals: FatigueResult['signals'] = [
    {
      label: `Frecuencia: ${frequency.toFixed(1)}x (${frequency > 3.5 ? 'ALTA' : frequency > 2.5 ? 'MEDIA' : 'OK'})`,
      severity: frequency > 3.5 ? 'danger' : frequency > 2.5 ? 'warning' : 'ok',
    },
    {
      label: `CTR actual: ${ctr.toFixed(2)}% (benchmark ${benchmark}%)`,
      severity: ctr < benchmark * 0.5 ? 'danger' : ctr < benchmark * 0.75 ? 'warning' : 'ok',
    },
    {
      label: `Días activo: ${daysRunning} días`,
      severity: daysRunning > 21 ? 'danger' : daysRunning > 12 ? 'warning' : 'ok',
    },
    ...(baselineCtr ? [{
      label: `Caída de CTR: -${ctrDrop.toFixed(0)}% vs. lanzamiento`,
      severity: (ctrDrop > 40 ? 'danger' : ctrDrop > 20 ? 'warning' : 'ok') as 'ok' | 'warning' | 'danger',
    }] : []),
  ];

  return { score: clampedScore, level, daysToFatigue, recommendation: recommendations[level], signals };
}

// ---------------------------------------------------------------------------
// UI Helpers
// ---------------------------------------------------------------------------
const LEVEL_CONFIG = {
  low:      { label: 'Riesgo Bajo',     color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', ring: 'bg-emerald-400', barColor: 'bg-emerald-400' },
  medium:   { label: 'Riesgo Medio',    color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   ring: 'bg-amber-400',   barColor: 'bg-amber-400'   },
  high:     { label: 'Riesgo Alto',     color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  ring: 'bg-orange-400',  barColor: 'bg-orange-400'  },
  critical: { label: 'Fatiga Crítica',  color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',    ring: 'bg-rose-500 animate-pulse', barColor: 'bg-rose-500' },
};

const SIGNAL_COLORS = {
  ok:      'text-emerald-400',
  warning: 'text-amber-400',
  danger:  'text-rose-400',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface AdFatigueDetectorProps {
  language: Language;
  adName?: string;
  initialInputs?: Partial<FatigueInputs>;
  compact?: boolean;
}

export const AdFatigueDetector: React.FC<AdFatigueDetectorProps> = ({
  language,
  adName,
  initialInputs,
  compact = false,
}) => {
  const es = language === 'es';
  const [expanded, setExpanded] = useState(!compact);
  const [inputs, setInputs] = useState<FatigueInputs>({
    frequency: initialInputs?.frequency ?? 2.0,
    ctr: initialInputs?.ctr ?? 1.0,
    daysRunning: initialInputs?.daysRunning ?? 7,
    baselineCtr: initialInputs?.baselineCtr,
    platform: initialInputs?.platform ?? 'meta',
  });

  const result = useMemo(() => calculateFatigueScore(inputs), [inputs]);
  const cfg = LEVEL_CONFIG[result.level];

  const set = (key: keyof FatigueInputs, val: number | string) =>
    setInputs(prev => ({ ...prev, [key]: val }));

  return (
    <div className={`glass-card border ${cfg.border} rounded-3xl overflow-hidden transition-all`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center`}>
            <AlertTriangle className={`w-4 h-4 ${cfg.color}`} />
          </div>
          <div className="text-left">
            <p className={`text-[11px] font-black uppercase tracking-widest ${cfg.color}`}>
              {es ? 'Detector de Fatiga Publicitaria' : 'Ad Fatigue Detector'}
            </p>
            {adName && <p className="text-[10px] text-slate-500 font-medium">{adName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Score Badge */}
          <div className={`px-3 py-1 rounded-full ${cfg.bg} border ${cfg.border}`}>
            <span className={`text-[11px] font-black ${cfg.color}`}>{result.score}/100</span>
          </div>
          {/* Level Badge */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${cfg.ring}`} />
            <span className={`text-[11px] font-black ${cfg.color} hidden sm:inline`}>{cfg.label}</span>
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-6 pb-6 space-y-5 border-t border-white/5 pt-5">

              {/* Score Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    {es ? 'Índice de Fatiga' : 'Fatigue Index'}
                  </span>
                  <span className={`text-2xl font-black ${cfg.color}`}>{result.score}<span className="text-sm text-slate-500">/100</span></span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${cfg.barColor}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${result.score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-600 font-bold uppercase">
                  <span>{es ? 'Saludable' : 'Healthy'}</span>
                  <span>{es ? 'Crítico' : 'Critical'}</span>
                </div>
              </div>

              {/* Inputs Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    {es ? 'Frecuencia (x/usuario)' : 'Frequency (x/user)'}
                  </label>
                  <input
                    type="number" step="0.1" min="0" max="10"
                    value={inputs.frequency}
                    onChange={e => set('frequency', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-amber-400 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    CTR Actual (%)
                  </label>
                  <input
                    type="number" step="0.01" min="0" max="30"
                    value={inputs.ctr}
                    onChange={e => set('ctr', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-amber-400 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    {es ? 'Días activo' : 'Days active'}
                  </label>
                  <input
                    type="number" step="1" min="1"
                    value={inputs.daysRunning}
                    onChange={e => set('daysRunning', parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-amber-400 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    CTR {es ? 'al lanzar' : 'at launch'} (%)
                  </label>
                  <input
                    type="number" step="0.01" min="0" max="30"
                    placeholder="0.00"
                    value={inputs.baselineCtr ?? ''}
                    onChange={e => set('baselineCtr', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:border-amber-400 outline-none transition-colors placeholder:text-slate-700"
                  />
                </div>
              </div>

              {/* Platform Selector */}
              <div className="flex gap-2 flex-wrap">
                {(['meta', 'google', 'tiktok', 'linkedin'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => set('platform', p)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                      inputs.platform === p
                        ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                        : 'bg-slate-950/50 border-white/5 text-slate-500 hover:border-white/20'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Signal Breakdown */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {es ? 'Señales Detectadas' : 'Detected Signals'}
                </p>
                <div className="space-y-1.5">
                  {result.signals.map((sig, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        sig.severity === 'ok' ? 'bg-emerald-400' : sig.severity === 'warning' ? 'bg-amber-400' : 'bg-rose-500'
                      }`} />
                      <span className={`text-[11px] font-bold ${SIGNAL_COLORS[sig.severity]}`}>{sig.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendation Box */}
              <div className={`rounded-2xl ${cfg.bg} border ${cfg.border} p-4 space-y-2`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {result.level === 'critical' ? <Zap className={`w-4 h-4 ${cfg.color}`} /> :
                     result.level === 'high'     ? <RefreshCw className={`w-4 h-4 ${cfg.color}`} /> :
                     result.level === 'medium'   ? <TrendingDown className={`w-4 h-4 ${cfg.color}`} /> :
                     <BarChart2 className={`w-4 h-4 ${cfg.color}`} />}
                  </div>
                  <div>
                    <p className={`text-[11px] font-black uppercase tracking-widest ${cfg.color} mb-1`}>
                      {es ? 'Recomendación Antigravity' : 'Antigravity Recommendation'}
                    </p>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      {result.recommendation}
                    </p>
                  </div>
                </div>

                {result.level !== 'critical' && (
                  <div className="flex items-center gap-2 pt-1">
                    <Clock className={`w-3.5 h-3.5 ${cfg.color} flex-shrink-0`} />
                    <p className={`text-[11px] font-bold ${cfg.color}`}>
                      {es
                        ? `Fatiga crítica estimada en ~${result.daysToFatigue} días`
                        : `Critical fatigue estimated in ~${result.daysToFatigue} days`
                      }
                    </p>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdFatigueDetector;
