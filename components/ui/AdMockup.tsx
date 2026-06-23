import React from 'react';
import { MoreHorizontal, ThumbsUp, MessageCircle, Share2, Globe, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export interface AdMockupProps {
  brandName: string;
  avatarUrl?: string;
  imageUrl: string;
  primaryText: string;
  headline: string;
  cta: string;
  referenceLabel?: string;
}

export const AdMockup: React.FC<AdMockupProps> = ({
  brandName,
  avatarUrl,
  imageUrl,
  primaryText,
  headline,
  cta,
  referenceLabel
}) => {
  return (
    <div className="w-full max-w-sm mx-auto bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative">
      {/* Reference Badge (Optional) */}
      {referenceLabel && (
        <div className="absolute top-0 right-0 bg-brand-neon/90 text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl z-20 shadow-lg">
          Inspirado en: {referenceLabel}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/10 shrink-0 overflow-hidden border border-white/5 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white/50 text-xs font-bold leading-none">
                {brandName.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-white text-sm font-semibold">{brandName || "Tu Marca"}</span>
              <CheckCircle className="w-3 h-3 text-blue-400" />
            </div>
            <div className="flex items-center gap-1 text-white/50 text-xs">
              <span>Publicidad</span>
              <span>•</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>
        <button className="text-white/50 hover:text-white/80 shrink-0">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Text */}
      <div className="px-3 pb-3">
        <p className="text-[#E4E6EB] text-[13px] leading-snug whitespace-pre-wrap">
          {primaryText || "Añade un texto persuasivo aquí. Selecciona una referencia para que la IA complete este campo por ti."}
        </p>
      </div>

      {/* Creative Image */}
      <div className="w-full aspect-square bg-[#1A1A1A] relative border-y border-white/5 overflow-hidden flex items-center justify-center group">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Ad creative" 
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
        )}
      </div>

      {/* Footer Content */}
      <div className="bg-[#242526]/80 p-3 flex items-center justify-between">
        <div className="flex flex-col overflow-hidden mr-3">
          <span className="text-[#B0B3B8] text-[11px] uppercase tracking-wider mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
            DESCUBRE MÁS EN INSITU.COMPANY
          </span>
          <span className="text-[#E4E6EB] font-bold text-sm leading-tight line-clamp-2">
            {headline || "Este es un Titular de Alto Rendimiento que Llama la Atención"}
          </span>
        </div>
        <button className="shrink-0 bg-[#3A3B3C] hover:bg-[#4A4B4C] text-[#E4E6EB] font-semibold text-xs px-4 py-2 rounded-lg transition-colors border border-white/5">
          {cta || "Ver más"}
        </button>
      </div>

      {/* Fake Interactions */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-[#B0B3B8]">
        <button className="flex items-center gap-1.5 hover:text-[#E4E6EB] transition-colors text-xs font-medium">
          <ThumbsUp className="w-4 h-4" /> Me gusta
        </button>
        <button className="flex items-center gap-1.5 hover:text-[#E4E6EB] transition-colors text-xs font-medium">
          <MessageCircle className="w-4 h-4" /> Comentar
        </button>
        <button className="flex items-center gap-1.5 hover:text-[#E4E6EB] transition-colors text-xs font-medium">
          <Share2 className="w-4 h-4" /> Compartir
        </button>
      </div>
    </div>
  );
};
