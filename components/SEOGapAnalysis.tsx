import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { TrafficCheckResult, Language } from '../types';

interface SEOGapAnalysisProps {
  result: TrafficCheckResult;
  language: Language;
}

const SEOGapAnalysis: React.FC<SEOGapAnalysisProps> = ({ result, language }) => {
  if (!result || !result.competitors) return null;

  // Tomar hasta 5 competidores más relevantes para el radar y tabla
  const comps = result.competitors.slice(0, 5);
  
  // Normalización Logarítmica para métricas con rangos masivos
  const logNormalize = (val: number, maxLog: number) => {
    if (!val || val <= 0) return 0;
    return Math.min(100, (Math.log10(val) / maxLog) * 100);
  };

  const data = [
    {
      subject: 'DA (Authority)',
      fullMark: 100,
      me: result.domainAuthority || 1,
      ...Object.fromEntries(comps.map(c => [c.domain, c.domainAuthority || 1]))
    },
    {
      subject: language === 'es' ? 'Tráfico Org.' : 'Org. Traffic',
      fullMark: 100,
      me: logNormalize(result.organicTraffic || 1, 7), // hasta 10M
      ...Object.fromEntries(comps.map(c => [c.domain, logNormalize(c.trafficVolume || 1, 7)]))
    },
    {
      subject: language === 'es' ? 'Palabras Clave' : 'Keywords',
      fullMark: 100,
      me: logNormalize(result.organicKeywords || 1, 6), // hasta 1M
      ...Object.fromEntries(comps.map(c => [c.domain, logNormalize(c.organicKeywords || 1, 6)]))
    },
    {
      subject: 'Backlinks',
      fullMark: 100,
      me: logNormalize(result.backlinks || 1, 6), // hasta 1M
      ...Object.fromEntries(comps.map(c => [c.domain, logNormalize(c.backlinks || 1, 6)]))
    },
    {
      subject: language === 'es' ? 'Visibilidad' : 'Visibility',
      fullMark: 100,
      me: Math.max(10, 100 - (result.competitors[0]?.position || 1) * 5),
      ...Object.fromEntries(comps.map((c, i) => [c.domain, 90 - (i * 10)]))
    }
  ];

  const colors = ['#ff477b', '#00F2FE', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-8 rounded-[2.5rem] bg-slate-900/40 border border-white/5 backdrop-blur-3xl overflow-hidden group shadow-2xl"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff477b]/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-2xl font-black uppercase italic bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent italic tracking-tight">
            SEO GAP <span className="text-[#ff477b]">ANALYSIS</span>
          </h3>
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em]">
              {language === 'es' ? 'Comparativa de Rendimiento Algorítmico' : 'Algorithmic Performance Comparison'}
            </p>
            
            {/* Data Confidence Badge */}
            <div className={`px-2 py-0.5 rounded-full border text-[11px] font-black uppercase tracking-tighter flex items-center gap-1.5 backdrop-blur-md ${
              (result.dataQuality?.confidenceScore || 100) > 60 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              <div className={`w-1 h-1 rounded-full animate-pulse ${
                (result.dataQuality?.confidenceScore || 100) > 60 ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></div>
              {language === 'es' 
                ? ((result.dataQuality?.confidenceScore || 100) > 60 ? 'Datos Verificados' : 'Estimación IA')
                : ((result.dataQuality?.confidenceScore || 100) > 60 ? 'Verified Data' : 'AI Prediction')
              }
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff477b]"></div>
            <span className="text-[11px] font-black uppercase tracking-widest text-white/70">{result.domain}</span>
          </div>
          {comps.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: colors[i+1] }}></div>
              <span className="text-[11px] font-black uppercase tracking-widest text-white/40">{c.domain}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="h-[420px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} 
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
              
              <Radar
                name={result.domain}
                dataKey="me"
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.25}
                strokeWidth={3}
              />
              
              {comps.map((c, i) => (
                <Radar
                  key={c.domain}
                  name={c.domain}
                  dataKey={c.domain}
                  stroke={colors[i+1]}
                  fill={colors[i+1]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '16px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }} 
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
            <h4 className="text-[11px] font-black uppercase tracking-[.25em] text-[#ff477b]">
              {language === 'es' ? 'Veredicto de Brecha' : 'Gap Verdict'}
            </h4>
            <div className="space-y-4">
              {result.gapAnalysis?.slice(0, 3).map((gap, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0"></div>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">
                    {gap}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {result.keywordOpportunities?.slice(0, 4).map((opt, i) => (
              <div key={i} className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                <p className="text-[11px] font-black uppercase text-cyan-400 mb-1 opacity-70">
                  {opt.potential}
                </p>
                <p className="text-[13px] font-bold text-white truncate">
                  {opt.term}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SEOGapAnalysis;
