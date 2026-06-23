import { buildAbsoluteUrl } from "../../utils/apiConfig";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../../services/auth/authService';

export const LongTermFeedbackPopup: React.FC<{ userId: string }> = ({ userId }) => {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);
  const [metric, setMetric] = useState<string | null>(null);
  const [story, setStory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [auditContext, setAuditContext] = useState({ domain: "tu marca", date: "recientemente", type: "Auditoría" });

  useEffect(() => {
    // Determine real audit context from history
    const user = authService.getCurrentUser();
    if (user && user.usageHistory && user.usageHistory.length > 0) {
      // Find the most recent business audit (Ads or SEO)
      const auditTasks = ['Auditoría de Ads', 'Auditoría de Tráfico', 'Auditoría de Tráfico (fallback)'];
      const lastAudit = [...user.usageHistory]
        .reverse()
        .find(h => auditTasks.some(t => h.taskName.includes(t)));

      if (lastAudit) {
        const dateObj = new Date(lastAudit.timestamp);
        const diffDays = Math.floor((Date.now() - lastAudit.timestamp) / (1000 * 60 * 60 * 24));
        
        let dateStr = dateObj.toLocaleDateString();
        if (diffDays === 0) dateStr = "hoy";
        else if (diffDays === 1) dateStr = "ayer";
        else if (diffDays < 7) dateStr = `hace ${diffDays} días`;
        else if (diffDays < 30) dateStr = `hace ${Math.floor(diffDays/7)} semanas`;

        setAuditContext({
          domain: lastAudit.details || "tu sitio web",
          date: dateStr,
          type: lastAudit.taskName.includes('Ads') ? 'Google Ads' : 'Tráfico SEO'
        });
      }
    }

    // Check if we should show the popup
    const hasSeen = localStorage.getItem('insitu_longterm_fb_seen');
    if (!hasSeen) {
      // Simulate a delay before popping up
      const timer = setTimeout(() => setShow(true), 20000); // 20s delay
      return () => clearTimeout(timer);
    }
  }, []);

  const closePopup = () => {
    setShow(false);
    localStorage.setItem('insitu_longterm_fb_seen', 'true');
  };

  const submitFeedback = async () => {
    setIsSubmitting(true);
    try {
      await fetch(buildAbsoluteUrl('/.netlify/functions/api-performance-feedback'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': userId
        },
        body: JSON.stringify({
          userId,
          feature: auditContext.type === 'Google Ads' ? 'AdsAudit_Optimization' : 'SEO_Traffic_Optimization',
          context: auditContext,
          improvedMetric: metric || 'None',
          successStory: story,
        }),
      });
      setStep(3); // success screen
      setTimeout(closePopup, 3000);
    } catch (e) {
      console.error(e);
      setStep(3);
      setTimeout(closePopup, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-[100] w-full max-w-sm"
        >
          <div className="bg-slate-900 border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 rounded-2xl p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none -mt-16 -mr-16"></div>
            
            <button onClick={closePopup} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            {step === 1 && (
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    📈
                  </div>
                  <div>
                    <h3 className="font-black text-white text-lg leading-tight uppercase tracking-tight">Seguimiento de IA</h3>
                    <p className="text-[11px] text-emerald-400 uppercase tracking-widest font-bold">Aprendizaje a Largo Plazo</p>
                  </div>
                </div>
                
                <p className="text-sm text-slate-300 mb-6">
                  {auditContext.date === "recientemente" 
                    ? `Analizaste el mercado para ` 
                    : `${auditContext.date.charAt(0).toUpperCase() + auditContext.date.slice(1)} analizaste `
                  }
                  <span className="text-white font-bold">{auditContext.domain}</span>. ¿Aplicaste alguna recomendación de la IA?
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {['CTR', 'Conversiones', 'Posición SEO', 'Ninguna'].map(m => (
                    <button
                      key={m}
                      onClick={() => { setMetric(m); setStep(2); }}
                      className="py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 rounded-xl text-xs font-bold text-slate-200 uppercase tracking-wider transition-all"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="relative z-10">
                <h3 className="font-black text-white text-base mb-2">¡Increíble! Cuéntanos más</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Esta información entrena a tu Guardian de Marca para que las futuras recomendaciones sean aún más precisas.
                </p>
                <textarea
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 mb-4 h-24"
                  placeholder={`Ej: "El título que sugirió la IA subió el ${metric} de 2% a 5%..."`}
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                />
                <button
                  onClick={submitFeedback}
                  disabled={isSubmitting || !story.trim()}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Guardando...' : 'Entrenar IA'}
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="relative z-10 text-center py-6">
                <div className="text-4xl mb-4 animate-bounce">🧠</div>
                <h3 className="font-black text-white text-lg">Aprendizaje Integrado</h3>
                <p className="text-xs text-slate-400 mt-2">Gracias. El modelo ha incorporado este éxito a su base de conocimiento.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
