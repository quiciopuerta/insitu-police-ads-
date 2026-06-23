import React, { useState, useEffect } from 'react';
import { getFeedbackStats, getActiveRules, invalidateRulesCache } from '../services/feedbackRulesService';
import { API_URL } from '../utils/apiConfig';

interface FeedbackManagerProps {
  language?: 'es' | 'en';
}

export const FeedbackManager: React.FC<FeedbackManagerProps> = ({ language = 'es' }) => {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = {
    es: {
      title: 'Gestión de Aprendizaje IA',
      stats: 'Estadísticas de Feedback',
      total: 'Total Feedback',
      thumbsUp: 'Positivo',
      thumbsDown: 'Negativo',
      csat: 'Promedio CSAT',
      recentFeedback: 'Feedback Reciente',
      learnedRules: 'Reglas Aprendidas por la IA',
      feature: 'Módulo',
      type: 'Tipo',
      reason: 'Razón/Contexto',
      date: 'Fecha',
      actions: 'Acciones',
      noFeedback: 'No hay feedback registrado aún.',
      noRules: 'No hay reglas aprendidas aún.',
      deleteRule: 'Eliminar Regla',
      ruleDeleted: 'Regla eliminada correctamente',
      confirmDelete: '¿Estás seguro de eliminar esta regla de aprendizaje? La IA olvidará esta instrucción.'
    },
    en: {
      title: 'AI Learning Management',
      stats: 'Feedback Statistics',
      total: 'Total Feedback',
      thumbsUp: 'Thumbs Up',
      thumbsDown: 'Thumbs Down',
      csat: 'CSAT Average',
      recentFeedback: 'Recent Feedback',
      learnedRules: 'AI Learned Rules',
      feature: 'Module',
      type: 'Type',
      reason: 'Reason/Context',
      date: 'Date',
      actions: 'Actions',
      noFeedback: 'No feedback recorded yet.',
      noRules: 'No rules learned yet.',
      deleteRule: 'Delete Rule',
      ruleDeleted: 'Rule deleted successfully',
      confirmDelete: 'Are you sure you want to delete this learning rule? The AI will forget this instruction.'
    }
  }[language];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const statsData = await getFeedbackStats();
      const rulesData = await getActiveRules();
      setFeedback(statsData.feedback || []);
      setStats(statsData.stats || null);
      setRules(rulesData || []);
    } catch (err) {
      setError('Error al cargar datos de feedback');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm(t.confirmDelete)) return;

    try {
      const res = await fetch(`${API_URL}/prompt-rules?id=${ruleId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setRules(rules.filter(r => r.id !== ruleId));
        invalidateRulesCache();
        alert(t.ruleDeleted);
      }
    } catch (err) {
      alert('Error al eliminar la regla');
    }
  };

  if (isLoading) return <div className="p-10 text-center animate-pulse text-slate-400">Cargando...</div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* ── Stats Summary ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.total}</p>
          <p className="text-4xl font-black text-slate-900">{feedback.length}</p>
        </div>
        <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100 shadow-sm">
          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-2">{t.thumbsUp}</p>
          <p className="text-4xl font-black text-emerald-700">
            {feedback.filter(f => f.feedback_type === 'thumbs_up').length}
          </p>
        </div>
        <div className="bg-rose-50 p-8 rounded-[2rem] border border-rose-100 shadow-sm">
          <p className="text-[11px] font-black text-rose-600 uppercase tracking-widest mb-2">{t.thumbsDown}</p>
          <p className="text-4xl font-black text-rose-700">
            {feedback.filter(f => f.feedback_type === 'thumbs_down').length}
          </p>
        </div>
        <div className="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100 shadow-sm">
          <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-2">{t.csat}</p>
          <p className="text-4xl font-black text-indigo-700">
            {(feedback.filter(f => f.feedback_type === 'csat').reduce((acc, f) => acc + (f.rating || 0), 0) / 
              Math.max(1, feedback.filter(f => f.feedback_type === 'csat').length)).toFixed(1)}
          </p>
        </div>
      </div>

      {/* ── Learned Rules Section ────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
        <h3 className="text-2xl font-black mb-8 border-l-4 border-primary pl-6 uppercase tracking-tighter italic flex items-center relative z-10">
          {t.learnedRules}
          <div className="ml-4 px-3 py-1 bg-primary/20 text-primary text-[11px] font-black rounded-full tracking-widest">
            {rules.length} ACTIVAS
          </div>
        </h3>
        
        {rules.length === 0 ? (
          <p className="text-slate-400 italic text-sm">{t.noRules}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex justify-between items-start group hover:bg-white/10 transition-all">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[11px] font-black bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded uppercase tracking-widest">
                      {rule.feature}
                    </span>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${rule.rule_type === 'negative_example' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {rule.rule_type}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-200 leading-relaxed italic">
                    "{rule.content}"
                  </p>
                </div>
                <button 
                  onClick={() => handleDeleteRule(rule.id)}
                  className="p-2 text-slate-500 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  title={t.deleteRule}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Feedback List ─────────────────────────────────────────── */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <h3 className="text-xl font-black text-slate-900">{t.recentFeedback}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-black uppercase text-slate-500">
                <th className="px-8 py-5">{t.feature}</th>
                <th className="px-8 py-5">{t.type}</th>
                <th className="px-8 py-5">{t.reason}</th>
                <th className="px-8 py-5">{t.date}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {feedback.map((f, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{f.feature}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      {f.feedback_type === 'thumbs_up' ? (
                        <span className="text-emerald-500">👍</span>
                      ) : f.feedback_type === 'thumbs_down' ? (
                        <span className="text-rose-500">👎</span>
                      ) : (
                        <span className="text-indigo-500">⭐ {f.rating}/5</span>
                      )}
                      <span className="text-[11px] font-black uppercase text-slate-500">{f.feedback_type}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-xs text-slate-600 max-w-md line-clamp-2">
                      {f.reason || f.context || '-'}
                    </p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[11px] font-bold text-slate-400">
                      {new Date(f.created_at).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
              {feedback.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-10 text-center text-slate-400 italic">
                    {t.noFeedback}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
