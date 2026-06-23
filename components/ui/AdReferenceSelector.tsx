import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, Award, Zap, Laptop, Target } from 'lucide-react';
import { AD_REFERENCES_REPOSITORY, AdReference } from '../../data/adReferences';

interface AdReferenceSelectorProps {
  selectedId: string | null;
  onSelect: (reference: AdReference | null) => void;
  isGenerating?: boolean;
}

const getIcon = (id: string) => {
  if (id.includes('tiktok')) return <Zap className="w-5 h-5 text-pink-400" />;
  if (id.includes('apple')) return <Laptop className="w-5 h-5 text-gray-300" />;
  if (id.includes('b2b')) return <Target className="w-5 h-5 text-blue-400" />;
  return <Award className="w-5 h-5 text-yellow-400" />;
};

export const AdReferenceSelector: React.FC<AdReferenceSelectorProps> = ({ 
  selectedId, 
  onSelect, 
  isGenerating 
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-[0.2em] text-white/70 flex items-center gap-2 uppercase">
          <BookOpen className="w-4 h-4 text-brand-neon" />
          Repositorio de Referencias
        </h3>
        {selectedId && (
          <button 
            onClick={() => onSelect(null)}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Limpiar Selección
          </button>
        )}
      </div>
      
      <p className="text-xs text-white/50 mb-3">
        Selecciona una anatomía publicitaria comprobada. La IA tomará este marco estratégico de referencia para redactar tu anuncio.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 stylish-scrollbar">
        {AD_REFERENCES_REPOSITORY.map((ref) => {
          const isSelected = selectedId === ref.id;
          
          return (
            <motion.button
              key={ref.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isGenerating}
              onClick={() => onSelect(ref)}
              className={`text-left relative overflow-hidden p-4 rounded-xl border transition-all duration-300 flex flex-col gap-2
                ${isSelected 
                  ? 'bg-brand-neon/10 border-brand-neon ring-1 ring-brand-neon/50' 
                  : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10 opacity-70 hover:opacity-100'}
                ${isGenerating ? 'pointer-events-none opacity-50 grayscale' : ''}
              `}
            >
              <div className="flex justify-between items-start w-full">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-brand-neon/20' : 'bg-white/10'}`}>
                    {getIcon(ref.id)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{ref.name}</h4>
                    <span className="text-[10px] uppercase tracking-wider text-brand-neon/80 font-medium">{ref.platform}</span>
                  </div>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-brand-neon shrink-0 animate-in fade-in zoom-in" />}
              </div>
              
              <p className="text-xs text-white/70 mt-1 line-clamp-2">
                {ref.shortDescription}
              </p>
              
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10">
                  Ej: {ref.brandExample}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
