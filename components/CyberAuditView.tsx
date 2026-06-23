
import React, { useState } from 'react';
import { performCyberAudit } from '../services/geminiService';
import { CyberAuditResult } from '../types';

const CyberAuditView: React.FC = () => {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CyberAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await performCyberAudit(target);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Error en el escaneo de seguridad.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 space-y-12 animate-in fade-in duration-700 relative">
        <div className="text-center space-y-4 no-print relative z-10">
          <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none uppercase">
            Cybersecurity <span className="text-indigo-500">Audit Lab</span>
          </h2>
          <p className="text-slate-400 font-medium text-lg max-w-2xl mx-auto italic leading-relaxed">
            "Escaneo de vulnerabilidades, protección de datos y cumplimiento normativo impulsado por IA."
          </p>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="bg-slate-900/50 rounded-[2.5rem] shadow-2xl p-8 border border-white/5 no-print backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
            <form onSubmit={handleAudit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-2"></span>
                  URL del Objetivo o Dominio
                </label>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="Ej: https://misitio-ecommerce.com"
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-5 px-8 text-lg font-bold text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !target.trim()}
                className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.02] transition-all flex items-center justify-center space-x-4 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    <span>ESCANEANDO RED...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Ejecutar Escaneo de Seguridad</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-[2.5rem] text-rose-400 font-black text-center max-w-2xl mx-auto shadow-xl backdrop-blur-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="grid lg:grid-cols-12 gap-10 animate-in slide-in-from-bottom-12 duration-1000">

            <div className="lg:col-span-4">
              <div className={`p-10 rounded-[3.5rem] border text-center h-full flex flex-col items-center justify-center shadow-2xl backdrop-blur-sm ${result.overallSecurityRating === 'Secure' ? 'bg-emerald-500/10 border-emerald-500/20' :
                result.overallSecurityRating === 'Warning' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20'
                }`}>
                <p className={`text-[11px] font-black uppercase tracking-widest mb-6 ${result.overallSecurityRating === 'Secure' ? 'text-emerald-400' :
                  result.overallSecurityRating === 'Warning' ? 'text-amber-400' : 'text-rose-400'
                  }`}>Security Score IA</p>

                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle cx="96" cy="96" r="86" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
                    <circle cx="96" cy="96" r="86" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={540.35} strokeDashoffset={540.35 - (540.35 * result.vulnerabilityScore) / 100} className={`${result.overallSecurityRating === 'Secure' ? 'text-emerald-500' : result.overallSecurityRating === 'Warning' ? 'text-amber-500' : 'text-rose-500'} transition-all duration-1000`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute text-6xl font-black text-white">{result.vulnerabilityScore}</span>
                </div>
                <h3 className={`mt-8 text-2xl font-black uppercase tracking-widest ${result.overallSecurityRating === 'Secure' ? 'text-emerald-400' :
                  result.overallSecurityRating === 'Warning' ? 'text-amber-400' : 'text-rose-400'
                  }`}>{result.overallSecurityRating}</h3>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-8">
              <div className="bg-slate-900/50 rounded-[3.5rem] p-12 border border-white/5 shadow-2xl backdrop-blur-sm">
                <h4 className="text-xl font-black text-white border-l-4 border-indigo-500 pl-5 uppercase tracking-tighter mb-8">Vulnerabilidades Detectadas</h4>
                <div className="grid sm:grid-cols-2 gap-6">
                  {result.detectedThreats.map((threat, i) => (
                    <div key={i} className="flex items-center space-x-4 bg-slate-950/50 p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors">
                      <span className="text-rose-500 text-lg">⚠️</span>
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">{threat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 rounded-[3.5rem] p-12 text-white shadow-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full"></div>
                <h4 className="text-xl font-black text-indigo-400 mb-8 uppercase tracking-widest relative z-10">Protocolo de Remediación</h4>
                <ul className="space-y-6 relative z-10">
                  {result.remediationPlan.map((step, i) => (
                    <li key={i} className="flex items-start space-x-6 group">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                        {i + 1}
                      </div>
                      <p className="text-sm font-medium text-slate-400 leading-relaxed pt-2 group-hover:text-slate-200 transition-colors">{step}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default CyberAuditView;
