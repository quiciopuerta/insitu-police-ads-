import React, { useEffect, useRef } from 'react';
import { Language } from '../types';

interface CommandCenterHomeProps {
  language: Language;
  onNavigate: (tab: string) => void;
}

export const CommandCenterHome: React.FC<CommandCenterHomeProps> = ({ language, onNavigate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated gradient background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let raf: number;
    const draw = () => {
      const w = canvas.width = canvas.offsetWidth;
      const h = canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      const t = frame * 0.004;
      // Blob 1 — magenta
      const g1 = ctx.createRadialGradient(w * (0.15 + Math.sin(t) * 0.1), h * 0.3, 0, w * 0.2, h * 0.3, w * 0.4);
      g1.addColorStop(0, 'rgba(255,71,123,0.13)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      // Blob 2 — violet
      const g2 = ctx.createRadialGradient(w * (0.75 + Math.cos(t * 0.7) * 0.12), h * 0.6, 0, w * 0.75, h * 0.6, w * 0.35);
      g2.addColorStop(0, 'rgba(168,85,247,0.10)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
      frame++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const quickModules = [
    { id: 'search', icon: 'analytics', label: language === 'es' ? 'Auditoría SEM' : 'SEM Audit', color: 'from-rose-500/20 to-rose-500/5', iconColor: 'text-rose-400', border: 'border-rose-500/20', glow: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]' },
    { id: 'image-audit', icon: 'image', label: language === 'es' ? 'Imagen IA' : 'AI Image', color: 'from-cyan/20 to-cyan/5', iconColor: 'text-cyan', border: 'border-cyan/20', glow: 'hover:shadow-[0_0_30px_rgba(0,242,254,0.15)]' },
    { id: 'video-audit', icon: 'movie', label: language === 'es' ? 'Video IA' : 'AI Video', color: 'from-fuchsia-500/20 to-fuchsia-500/5', iconColor: 'text-fuchsia-400', border: 'border-fuchsia-500/20', glow: 'hover:shadow-[0_0_30px_rgba(217,70,239,0.15)]' },
    { id: 'gen-ads', icon: 'edit_square', label: 'Ad Copy Lab', color: 'from-violet-500/20 to-violet-500/5', iconColor: 'text-violet-400', border: 'border-violet-500/20', glow: 'hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]' },
    { id: 'research-hub', icon: 'travel_explore', label: 'Research IA', color: 'from-teal-500/20 to-teal-500/5', iconColor: 'text-teal-400', border: 'border-teal-500/20', glow: 'hover:shadow-[0_0_30px_rgba(20,184,166,0.15)]' },
    { id: 'campaigns', icon: 'auto_awesome', label: language === 'es' ? 'Optimizador' : 'Optimizer', color: 'from-emerald-500/20 to-emerald-500/5', iconColor: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]' },
  ];

  const auditCards = [
    {
      id: 'search',
      icon: 'analytics',
      title: 'SEM Audit',
      description: language === 'es' ? '3 problemas críticos en campañas de Marca.' : '3 critical issues in Brand campaigns.',
      status: language === 'es' ? 'Acción Requerida' : 'Needs Action',
      statusClass: 'badge-needs-action',
      progress: 45,
      progressColor: 'bg-rose-500',
      progressLabel: language === 'es' ? 'Scan Completo' : 'Scan Complete',
      progressValue: '45% Health',
      iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      cta: language === 'es' ? 'Revisar Problemas' : 'Review Issues',
      ctaClass: 'border-white/10 hover:bg-white/5 text-white',
    },
    {
      id: 'video-audit',
      icon: 'movie',
      title: 'Video Audit',
      description: language === 'es' ? 'Procesando 12 activos de video para TikTok.' : 'Processing 12 video assets for TikTok.',
      status: language === 'es' ? 'En Ejecución' : 'Running',
      statusClass: 'badge-running',
      progress: 60,
      progressColor: 'bg-gradient-to-r from-fuchsia-500 to-violet-500',
      progressLabel: language === 'es' ? 'Analizando Hooks...' : 'Analyzing Hooks...',
      progressValue: '60%',
      iconBg: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400',
      cta: language === 'es' ? 'Ver Progreso' : 'View Progress',
      ctaClass: 'border-fuchsia-500/50 hover:bg-fuchsia-500/10 text-fuchsia-300',
      pulse: true,
    },
    {
      id: 'image-audit',
      icon: 'image',
      title: 'Image Audit',
      description: language === 'es' ? 'Todos los activos cumplen las guías estructurales.' : 'All static assets meet structural guidelines.',
      status: 'Optimal',
      statusClass: 'badge-optimal',
      progress: 100,
      progressColor: 'bg-emerald-500',
      progressLabel: language === 'es' ? 'Totalmente Optimizado' : 'Fully Optimized',
      progressValue: '100% Health',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      cta: language === 'es' ? 'Ver Log' : 'View Log',
      ctaClass: 'border-white/10 hover:bg-white/5 text-white',
    },
  ];

  return (
    <div className="relative w-full flex flex-col gap-8 pb-12">
      {/* Animated canvas background */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />

      <div className="relative z-10 flex flex-col gap-8">
        {/* Header */}
        <header className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {language === 'es' ? 'Sistema Operativo' : 'System Operational'}
              </span>
            </div>
            <h1 className="font-headline text-3xl font-black text-white tracking-tight">Command Center</h1>
            <p className="text-slate-500 text-sm mt-1">
              {language === 'es' ? 'Monitoreando rendimiento global de campañas.' : 'Monitoring global ad performance in real-time.'}
            </p>
          </div>
          <button
            onClick={() => onNavigate('search')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-magenta/20 to-fuchsia-600/10 border border-magenta/30 text-magenta hover:from-magenta/30 hover:border-magenta/50 text-[12px] font-black uppercase tracking-wider transition-all hover:shadow-[0_0_20px_rgba(255,71,123,0.2)]"
          >
            {language === 'es' ? 'Nueva Auditoría' : 'New Audit'}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </header>

        {/* KPI Hero Card */}
        <section className="glass-card rounded-2xl p-8 flex flex-col lg:flex-row items-center gap-10 overflow-hidden">
          {/* Score Gauge */}
          <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke="url(#scoreGradient)" strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="251.2"
                strokeDashoffset="50"
                style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff477b" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-black text-3xl bg-gradient-to-r from-magenta to-violet-400 bg-clip-text text-transparent leading-none">80</span>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mt-1">Health Score</span>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Total Ad Spend</p>
              <div className="text-4xl font-black text-white tracking-tight">$142,850</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>+12.4%
                </span>
                <span className="text-slate-600 text-[11px]">{language === 'es' ? 'vs período anterior' : 'vs last period'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Blended ROAS</p>
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-magenta to-violet-400 tracking-tight">4.2x</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>+0.8x
                </span>
                <span className="text-slate-600 text-[11px]">{language === 'es' ? 'vs período anterior' : 'vs last period'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Avg. CTR</p>
              <div className="text-4xl font-black text-white tracking-tight">3.8%</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400">
                  <span className="material-symbols-outlined text-[14px]">trending_down</span>-0.3%
                </span>
                <span className="text-slate-600 text-[11px]">{language === 'es' ? 'benchmark: 4.1%' : 'benchmark: 4.1%'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Conv. Rate</p>
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan to-teal-400 tracking-tight">2.9%</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>+0.4%
                </span>
                <span className="text-slate-600 text-[11px]">{language === 'es' ? 'vs período anterior' : 'vs last period'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access Modules */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">
            {language === 'es' ? 'Acceso Rápido' : 'Quick Access'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickModules.map((mod) => (
              <button
                key={mod.id}
                onClick={() => onNavigate(mod.id)}
                className={`glass-card flex flex-col items-center gap-3 p-4 rounded-xl border ${mod.border} bg-gradient-to-b ${mod.color} transition-all duration-300 ${mod.glow} hover:-translate-y-0.5 group`}
              >
                <span className={`material-symbols-outlined text-[24px] ${mod.iconColor} transition-transform group-hover:scale-110`}
                  style={{ fontVariationSettings: "'FILL' 1" }}>
                  {mod.icon}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center leading-tight">
                  {mod.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Active Audits */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              {language === 'es' ? 'Auditorías Activas' : 'Active Audits'}
            </h3>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
              {language === 'es' ? '3 en seguimiento' : '3 being tracked'}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {auditCards.map((card) => (
              <div
                key={card.id}
                className="glass-card p-6 rounded-xl flex flex-col gap-4 group cursor-pointer"
                onClick={() => onNavigate(card.id)}
              >
                <div className="flex justify-between items-start">
                  <div className={`p-2.5 rounded-xl border ${card.iconBg}`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {card.icon}
                    </span>
                  </div>
                  <span className={card.statusClass}>
                    {card.pulse && <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full animate-pulse" />}
                    {card.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-black text-white text-sm mb-1">{card.title}</h4>
                  <p className="text-[12px] text-slate-500 leading-relaxed">{card.description}</p>
                </div>

                <div>
                  <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden mb-2">
                    <div className={`${card.progressColor} h-1 rounded-full relative`} style={{ width: `${card.progress}%` }}>
                      {card.pulse && <div className="absolute inset-0 bg-white/30 animate-pulse" />}
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>{card.progressLabel}</span>
                    <span>{card.progressValue}</span>
                  </div>
                </div>

                <button
                  className={`w-full py-2 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-all ${card.ctaClass}`}
                  onClick={(e) => { e.stopPropagation(); onNavigate(card.id); }}
                >
                  {card.cta}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CommandCenterHome;
