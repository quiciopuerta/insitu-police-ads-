import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzePageSpeed, PageSpeedResult } from '../services/pagespeedService';

interface PageSpeedWidgetProps {
  initialUrl?: string;
  language: 'es' | 'en';
}

const PageSpeedWidget: React.FC<PageSpeedWidgetProps> = ({ initialUrl = "", language }) => {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PageSpeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<'desktop' | 'mobile'>('mobile');

  const fetchPageSpeed = async (currentStrategy: 'desktop' | 'mobile') => {
    if (!url) {
      setError(language === 'es' ? 'Ingresa una URL' : 'Enter a URL');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let formattedUrl = url.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = `https://${formattedUrl}`;
      }
      const data = await analyzePageSpeed(formattedUrl, currentStrategy);
      setResult(data);
    } catch (err: any) {
      let errMsg = err.message || 'Error fetching PageSpeed Insights.';
      if (errMsg.includes('invalid') || errMsg.includes('Invalid argument')) {
          errMsg = language === "es" ? "URL inválida. Revisa el dominio." : "Invalid URL. Check domain.";
      } else if (errMsg.includes('Lighthouse')) {
          errMsg = language === "es" ? "Error al analizar velocidad." : "Error analyzing speed.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUrl(initialUrl);
    setResult(null);
    setError(null);
  }, [initialUrl]);

  const handleAnalyze = () => {
    fetchPageSpeed(strategy);
  };

  const handleStrategyChange = (newStrategy: 'desktop' | 'mobile') => {
    setStrategy(newStrategy);
    if (result) {
      fetchPageSpeed(newStrategy);
    }
  };

  const getColorClass = (score: number) => {
    if (score >= 90) return 'text-emerald-400 stroke-emerald-400';
    if (score >= 50) return 'text-amber-400 stroke-amber-400';
    return 'text-rose-400 stroke-rose-400';
  };

  const getBgColorClass = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/20';
    if (score >= 50) return 'bg-amber-500/20';
    return 'bg-rose-500/20';
  };

  const ScoreCircle = ({ score, label }: { score: number; label: string }) => {
    const circumference = 2 * Math.PI * 36; // r=36
    const strokeDashoffset = circumference - (score / 100) * circumference;
    const colorClass = getColorClass(score);

    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Background Circle */}
          <svg className="absolute w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="36"
              className="stroke-slate-800"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Progress Circle */}
            <motion.circle
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              cx="48"
              cy="48"
              r="36"
              className={`transition-colors duration-500 ${colorClass}`}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeLinecap="round"
            />
          </svg>
          <span className={`text-xl font-black ${getColorClass(score).split(' ')[0]}`}>
            {score}
          </span>
        </div>
        <span className="text-[11px] uppercase font-black tracking-widest text-slate-400 text-center">
          {label}
        </span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] relative group/widget transition-all mt-12 bg-slate-900/50 border border-white/5"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div>
          <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter flex items-center gap-3 italic text-white/90">
            <span className="text-cyan-400">⚡</span>
            Performance Insights
          </h3>
          <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">
            {language === 'es' ? 'Rendimiento Core Web Vitals' : 'Core Web Vitals Performance'}
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
          <div className="flex flex-col w-full md:w-auto">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={language === 'es' ? 'Ej: midominio.com' : 'Ex: mydomain.com'}
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-500 min-w-[200px]"
            />
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1 ml-2">
              {language === 'es' ? 'Ingresa URL o Dominio' : 'Enter URL or Domain'}
            </span>
          </div>
          
          <div className="bg-slate-950 p-1 rounded-full border border-white/10 flex shrink-0 self-start md:self-auto uppercase">
            <button
              onClick={() => handleStrategyChange('mobile')}
              className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                strategy === 'mobile' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'
              }`}
            >
              Mobile
            </button>
            <button
              onClick={() => handleStrategyChange('desktop')}
              className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${
                strategy === 'desktop' ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'
              }`}
            >
              Desktop
            </button>
          </div>
          <button
             onClick={handleAnalyze}
             disabled={loading}
             className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 shrink-0 self-start md:self-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {language === 'es' ? 'Analizar Velocidad' : 'Analyze Speed'}
         </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 animate-pulse">
              {language === 'es' ? 'Evaluando métricas de Lighthouse...' : 'Evaluating Lighthouse metrics...'}
            </p>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div
             key="error"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center"
          >
            <p className="text-rose-400 font-bold">{error}</p>
            <button 
              onClick={handleAnalyze}
              className="mt-4 px-4 py-2 bg-rose-500/20 text-rose-300 rounded-lg text-xs font-black uppercase hover:bg-rose-500/30 transition-colors"
            >
              {language === 'es' ? 'Reintentar' : 'Retry'}
            </button>
          </motion.div>
        )}

        {result && !loading && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center bg-slate-950/50 p-8 rounded-3xl border border-white/5">
              <ScoreCircle score={result.performanceScore} label={language === 'es' ? 'Rendimiento' : 'Performance'} />
              <ScoreCircle score={result.accessibilityScore} label={language === 'es' ? 'Accesibilidad' : 'Accessibility'} />
              <ScoreCircle score={result.bestPracticesScore} label={language === 'es' ? 'Mejores Prácticas' : 'Best Practices'} />
              <ScoreCircle score={result.seoScore} label="SEO" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'First Contentful Paint', value: result.fcp, desc: 'FCP' },
                { label: 'Largest Contentful Paint', value: result.lcp, desc: 'LCP' },
                { label: 'Cumulative Layout Shift', value: result.cls, desc: 'CLS' },
                { label: 'Speed Index', value: result.speedIndex, desc: 'SI' },
              ].map((metric, i) => (
                 <div key={i} className="bg-white/5 p-5 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 blur-[20px] rounded-full -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-all"></div>
                    <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mb-1 relative z-10">{metric.label}</p>
                    <p className="text-lg font-black text-white relative z-10">{metric.value}</p>
                    <span className="absolute bottom-2 right-3 text-[50px] font-black text-white/5 italic z-0 pointer-events-none group-hover:text-blue-500/5 transition-colors">{metric.desc}</span>
                 </div>
              ))}
            </div>
            
            <div className="flex justify-end mt-4">
                 <button 
                  onClick={handleAnalyze}
                  className="text-[11px] text-slate-500 uppercase font-black tracking-widest hover:text-blue-400 transition-colors flex items-center gap-2"
                 >
                   <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                   </svg>
                   {language === 'es' ? 'Actualizar Análisis' : 'Refresh Analysis'}
                 </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PageSpeedWidget;
