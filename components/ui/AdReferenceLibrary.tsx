import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Zap, Target, Laptop, Award, ExternalLink, Sparkles } from 'lucide-react';
import { AD_REFERENCES_REPOSITORY, AdReference } from '../../data/adReferences';

interface AdReferenceLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ref: AdReference) => void;
  selectedId: string | null;
}

const getIcon = (id: string) => {
  if (id.includes('tiktok')) return <Zap className="w-6 h-6 text-pink-400" />;
  if (id.includes('apple')) return <Laptop className="w-6 h-6 text-slate-300" />;
  if (id.includes('b2b')) return <Target className="w-6 h-6 text-blue-400" />;
  return <Award className="w-6 h-6 text-yellow-400" />;
};

export const AdReferenceLibrary: React.FC<AdReferenceLibraryProps> = ({ 
  isOpen, 
  onClose, 
  onSelect,
  selectedId
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-magenta/10 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-magenta/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-magenta" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Biblioteca de Referencias Premium</h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Anatomías publicitarias de alto rendimiento para guiar la IA
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 stylish-scrollbar">
              <div className="grid md:grid-cols-2 gap-6">
                {AD_REFERENCES_REPOSITORY.map((ref) => {
                  const isSelected = selectedId === ref.id;
                  
                  return (
                    <motion.div
                      key={ref.id}
                      className={`group p-8 rounded-[2rem] border transition-all duration-500 relative overflow-hidden
                        ${isSelected 
                          ? 'bg-magenta/10 border-magenta ring-1 ring-magenta/50' 
                          : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'}
                      `}
                    >
                      {/* Decorative Background Icon */}
                      <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-700">
                        {React.cloneElement(getIcon(ref.id) as React.ReactElement<any>, { size: 160 })}
                      </div>

                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border
                              ${isSelected ? 'bg-magenta/20 border-magenta/40' : 'bg-white/5 border-white/10'}
                            `}>
                              {getIcon(ref.id)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xl font-black text-white group-hover:text-magenta transition-colors">{ref.name}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${ref.type === 'video' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {ref.type}
                                </span>
                              </div>
                              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Plataforma: {ref.platform}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="bg-magenta text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                              Activo
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-slate-300 mb-8 leading-relaxed font-medium">
                          {ref.shortDescription}
                        </p>

                        <div className="grid grid-cols-1 gap-4 mb-8">
                          <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5">
                            <h5 className="text-[10px] font-black text-magenta uppercase tracking-widest mb-2 flex items-center gap-2">
                              <Sparkles className="w-3 h-3" />
                              Anatomía del Copy
                            </h5>
                            <p className="text-xs text-slate-400 italic">
                              {ref.copyFramework}
                            </p>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <h5 className="text-[10px] font-black text-brand-neon uppercase tracking-widest mb-2 flex items-center gap-2">
                              <ExternalLink className="w-3 h-3" />
                              Dirección Visual / Video
                            </h5>
                            <p className="text-xs text-slate-400 italic">
                              {ref.visualFramework}
                            </p>
                          </div>
                          {ref.neuroImpact && (
                            <div className="px-4 py-2 rounded-xl bg-orange-500/5 border border-orange-500/10">
                              <p className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">
                                Impacto Neuro: <span className="text-slate-400 lowercase normal-case">{ref.neuroImpact}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-auto flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-brand-neon" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inspirado en: <span className="text-slate-300">{ref.brandExample}</span></span>
                          </div>
                          
                          <button
                            onClick={() => {
                              onSelect(ref);
                              onClose();
                            }}
                            className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2
                              ${isSelected 
                                ? 'bg-magenta text-white shadow-xl shadow-magenta/20 cursor-default' 
                                : 'bg-white/10 text-white hover:bg-magenta hover:shadow-xl hover:shadow-magenta/20'}
                            `}
                          >
                            {isSelected ? 'Seleccionado' : 'Usar Referencia'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-950/50 border-t border-white/5 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
                INsitu AI Ads · Repositorio de Auditoría y Creatividad 2026
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
