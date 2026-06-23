import { buildAbsoluteUrl } from "../../utils/apiConfig";
import React, { useState } from 'react';

interface FeedbackWidgetProps {
  feature: string;
  context?: string;
  aiResponse?: string;
  userId: string;
  userRole?: string;
}

export const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ feature, context, aiResponse, userId, userRole }) => {
  // Only show for admin and agency roles
  if (!userRole || (userRole !== 'admin' && userRole !== 'agency')) return null;

  const [status, setStatus] = useState<'idle' | 'thumbs_up' | 'thumbs_down' | 'submitted' | 'error'>('idle');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (type: 'thumbs_up' | 'thumbs_down', selectedReason?: string) => {
    // If it's thumbs_down and no reason selected, just show the menu
    if (type === 'thumbs_down' && !selectedReason) {
      setStatus('thumbs_down');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(buildAbsoluteUrl('/.netlify/functions/api-feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          feature,
          context,
          aiResponse,
          feedbackType: type,
          feedbackReason: selectedReason || null,
        }),
      });

      if (res.ok) {
        setStatus('submitted');
      } else {
        setStatus('error');
      }
    } catch (e) {
      console.error('Error submitting feedback', e);
      setStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'submitted') {
    return (
      <div className="flex items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in fade-in">
        <span className="text-emerald-400 text-xs font-bold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Gracias por tu feedback. Esto ayuda a mejorar la IA.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-between p-4 md:p-6 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl gap-4">
      <div className="flex-1">
        <h4 className="text-sm font-black text-white mb-1">¿Qué tan útil fue este análisis?</h4>
        <p className="text-xs text-slate-400 font-medium">Ayúdanos a calibrar la Inteligencia Artificial para mejorar tus resultados.</p>
      </div>

      <div className="flex items-center gap-3">
        {status === 'idle' && (
          <button
            onClick={() => handleFeedback('thumbs_up')}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 rounded-xl transition-all text-slate-300 hover:text-emerald-400 group disabled:opacity-50"
          >
            <span className="text-lg group-hover:scale-125 transition-transform">👍</span>
            <span className="text-[11px] font-black uppercase tracking-widest hidden md:inline">Útil</span>
          </button>
        )}

        {(status === 'idle' || status === 'thumbs_down') && (
          <div className="relative flex flex-col items-end">
            <button
              onClick={() => handleFeedback('thumbs_down')}
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 rounded-xl transition-all text-slate-300 hover:text-rose-400 group disabled:opacity-50 ${status === 'thumbs_down' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : ''}`}
            >
              <span className="text-lg group-hover:scale-125 transition-transform">👎</span>
              <span className="text-[11px] font-black uppercase tracking-widest hidden md:inline">Mejorable</span>
            </button>

            {status === 'thumbs_down' && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-2xl z-50 animate-in slide-in-from-top-2">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Selecciona un motivo (Obligatorio)</p>
                <div className="space-y-2">
                  {['Consejo muy genérico', 'Dato incorrecto o alucinado', 'Tono de marca fallido', 'No aplica a mi nicho'].map(r => (
                    <button
                      key={r}
                      onClick={() => handleFeedback('thumbs_down', r)}
                      disabled={isSubmitting}
                      className="w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors disabled:opacity-50 hover:text-white"
                    >
                      {r}
                    </button>
                  ))}
                  <button
                    onClick={() => setStatus('idle')}
                    className="w-full text-center px-3 py-1 mt-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {status === 'error' && <p className="text-xs font-bold text-rose-500">Error guardando feedback.</p>}
    </div>
  );
};
