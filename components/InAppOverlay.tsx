import React from "react";

export interface InAppOverlayProps {
  notification: {
    id: string;
    type?: string;
    title: string;
    message: string;
    imageUrl?: string;
    videoUrl?: string;
    ctaUrl?: string;
  };
  onClose: () => void;
  onAction: (ctaUrl: string) => void;
  language?: string;
}

const InAppOverlay: React.FC<InAppOverlayProps> = ({ notification, onClose, onAction, language = "es" }) => {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#1a0b10] w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-500">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all z-10"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Media Section */}
        {(notification.imageUrl || notification.videoUrl) && (
          <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
            <img 
              src={notification.imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80"} 
              className="w-full h-full object-cover"
              alt="Engagement"
            />
            {notification.videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-16 h-16 bg-[#ff477b] rounded-full flex items-center justify-center shadow-xl shadow-[#ff477b]/20">
                  <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-white ml-1"></div>
                </div>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1a0b10] to-transparent"></div>
          </div>
        )}

        <div className="p-10 -mt-12 relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-8 h-1 rounded-full ${notification.type === 'competitor' ? 'bg-cyan' : 'bg-[#ff477b]'}`}></div>
            <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${notification.type === 'competitor' ? 'text-cyan' : 'text-[#ff477b]'}`}>
              {notification.type === 'competitor' 
                ? (language === "es" ? "Alerta de Competencia" : "Competitor Alert")
                : (language === "es" ? "Exclusivo para ti" : "Exclusive for you")}
            </span>
          </div>

          <h2 className="text-3xl font-black text-white tracking-tight mb-4 leading-tight">
            {notification.title}
          </h2>
          
          <p className="text-white/60 text-base leading-relaxed mb-8">
            {notification.message}
          </p>

          <div className="flex flex-col gap-3">
            {notification.ctaUrl && (
              <button 
                onClick={() => onAction(notification.ctaUrl!)}
                className={`w-full py-5 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  notification.type === 'competitor' 
                    ? 'bg-cyan shadow-cyan/20' 
                    : 'bg-[#ff477b] shadow-[#ff477b]/20'
                }`}
              >
                {notification.type === 'competitor'
                  ? (language === "es" ? "Ver Detalles" : "View Details")
                  : (language === "es" ? "Aprovechar ahora" : "Get it now")}
              </button>
            )}
            <button 
              onClick={onClose}
              className="w-full py-4 text-white/40 font-bold uppercase tracking-widest text-[11px] hover:text-white transition-colors"
            >
              {language === "es" ? "Quizás más tarde" : "Maybe later"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InAppOverlay;
