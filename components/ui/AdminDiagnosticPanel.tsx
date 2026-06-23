import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Copy, Search, Database, ShieldCheck, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { TRANSLATIONS } from '../../constants';

interface AdminDiagnosticPanelProps {
  result: any;
  language: 'es' | 'en';
  compact?: boolean;
}

export const AdminDiagnosticPanel: React.FC<AdminDiagnosticPanelProps> = ({ result, language, compact }) => {
  const [showDebug, setShowDebug] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!result) return null;

  const copyDebugData = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    // Triggering a toast would be nice here, but this component is focused on the data
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${compact ? 'mt-4' : 'mt-12'} no-print`}
    >
      <div className={`bg-slate-950/80 border border-indigo-500/30 rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden backdrop-blur-3xl shadow-2xl`}>
        {/* Header - Always visible to Admin */}
        <div 
          className="p-6 md:p-8 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400 ${compact ? 'hidden md:block' : ''}`}>
              <Terminal size={compact ? 18 : 24} />
            </div>
            <div>
              <h4 className={`${compact ? 'text-sm' : 'text-xl'} font-black uppercase text-white tracking-tight italic`}>
                {language === 'es' ? 'Diagnóstico Super Admin' : 'Super Admin Diagnostics'}
              </h4>
              <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mt-0.5">
                {language === 'es' ? 'Trazabilidad de recursos' : 'Resource traceability'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Live Logs Ready</span>
             </div>
             {isExpanded ? <ChevronUp className="text-slate-500" /> : <ChevronDown className="text-slate-500" />}
          </div>
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={compact ? "px-4 pb-4" : "px-8 pb-8"}
            >
              <div className={`border-t border-white/10 ${compact ? 'pt-4' : 'pt-8'}`}>
                <div className={`flex justify-end gap-2 ${compact ? 'mb-4' : 'mb-8'}`}>
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    {showDebug ? 'Hide Details' : 'View Raw JSON'}
                  </button>
                  <button
                    onClick={copyDebugData}
                    className="px-6 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500/40 transition-all flex items-center gap-2 text-indigo-300"
                  >
                    <Copy size={12} />
                    Copy Data
                  </button>
                </div>

                <div className={`grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-2'} gap-6 md:gap-8`}>
                  {/* Web Sources Used */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-indigo-400 mb-2">
                      <Search size={16} />
                      <span className="text-xs font-black uppercase tracking-widest">Grounding Resources (URLs):</span>
                    </div>
                    <div className="grid gap-3 max-h-60 overflow-y-auto custom-scrollbar-indigo pr-2">
                      {result.webSourcesUsed && result.webSourcesUsed.length > 0 ? (
                        result.webSourcesUsed.map((url: string, i: number) => (
                          <a 
                            key={i} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-indigo-500/20 transition-all group"
                          >
                            <span className="text-[11px] text-slate-300 truncate max-w-[85%] font-medium">{url}</span>
                            <ExternalLink size={14} className="text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" />
                          </a>
                        ))
                      ) : (
                          <div className="p-8 bg-white/5 border border-white/5 rounded-2xl text-[11px] text-slate-600 uppercase font-black tracking-widest text-center italic">
                            No external URLs recorded for this process
                          </div>
                      )}
                    </div>
                  </div>

                  {/* API Dependencies */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                      <Database size={16} />
                      <span className="text-xs font-black uppercase tracking-widest">System Dependencies:</span>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 h-fit">
                      <div className="space-y-3 md:space-y-4">
                        {(result.realDataCollected || result.apisUsed || result.sourcesUsed || ['Gemini-2.0-Flash']).map((source: string, i: number) => (
                          <div key={i} className="flex items-center justify-between py-1.5 md:py-2 border-b border-white/5 last:border-0">
                            <span className="text-[11px] md:text-[11px] font-bold text-slate-300">{source}</span>
                            <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-400 uppercase tracking-widest">
                              <ShieldCheck size={10} />
                              Live
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {showDebug && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 pt-8 border-t border-white/10"
                  >
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Raw Result Object</p>
                    <pre className="bg-black/60 p-6 rounded-2xl text-[11px] text-indigo-300 overflow-x-auto font-mono custom-scrollbar-indigo max-h-96 border border-white/5">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
