import React, { useState, useEffect } from 'react';
import { aiTechLogService } from '../services/ai/aiTechLogService';
import { Terminal, Copy, Trash2, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface AIDebugViewProps {
  language?: 'es' | 'en';
}

export const AIDebugView: React.FC<AIDebugViewProps> = ({ language = 'es' }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');

  const t = {
    es: {
      title: 'Registro de Malos Funcionamientos',
      subtitle: 'Historial técnico de fallos y errores detectados en producción.',
      feature: 'Módulo',
      error: 'Error / Mensaje',
      date: 'Fecha',
      severity: 'Severidad',
      copy: 'Copiar para Antigravity',
      noLogs: 'No hay logs registrados.',
      analyzing: 'Análisis IA Proyectado',
      context: 'Contexto de la Petición',
      stack: 'Stack Trace',
      copied: '¡Copiado al portapapeles!',
    },
    en: {
      title: 'Malfunction Logs',
      subtitle: 'Technical history of failures and errors detected in production.',
      feature: 'Feature',
      error: 'Error / Message',
      date: 'Date',
      severity: 'Severity',
      copy: 'Copy for Antigravity',
      noLogs: 'No logs recorded.',
      analyzing: 'AI Analysis Projected',
      context: 'Request Context',
      stack: 'Stack Trace',
      copied: 'Copied to clipboard!',
    }
  }[language];

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    const data = await aiTechLogService.getLatestLogs(100);
    setLogs(data);
    setIsLoading(false);
  };

  const handleCopyForAI = (log: any) => {
    const text = `
⚠️ ANÁLISIS DE MAL FUNCIONAMIENTO (PRODUCCIÓN) ⚠️
------------------------------------------------
FECHA: ${new Date(log.created_at).toLocaleString()}
MÓDULO: ${log.feature}
ERROR: ${log.error_message}
ID LOG: ${log.id}

CONTEXTO:
${JSON.stringify(log.request_context, null, 2)}

STACK TRACE:
${log.stack_trace || 'No disponible'}

SOLICITUD: Antigravity, analiza este fallo registrado en producción. Identifica si es un problema de prompt, de API (Gemini/Meta/etc) o de lógica interna, y propón una corrección inmediata.
    `.trim();

    navigator.clipboard.writeText(text);
    alert(t.copied);
  };

  const filteredLogs = filter 
    ? logs.filter(l => l.feature.toLowerCase().includes(filter.toLowerCase()) || l.error_message.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  if (isLoading) return <div className="p-10 text-center animate-pulse text-slate-400">Cargando registros técnicos...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-100 p-6 rounded-3xl border border-slate-200">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600" />
            {t.title}
          </h3>
          <p className="text-xs text-slate-500 font-medium">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            placeholder="Filtrar por módulo o error..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all w-full md:w-64"
          />
          <button 
            onClick={fetchLogs}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-black uppercase text-slate-500">
                <th className="px-8 py-5">{t.feature}</th>
                <th className="px-8 py-5">{t.severity}</th>
                <th className="px-8 py-5">{t.error}</th>
                <th className="px-8 py-5">{t.date}</th>
                <th className="px-8 py-5 text-right">{t.copy}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-5">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-tight bg-slate-100 px-2 py-1 rounded-lg">
                      {log.feature}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                       {log.severity === 'critical' ? (
                         <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-full text-[11px] font-black uppercase">
                           <AlertCircle className="w-3 h-3" /> CRITICAL
                         </div>
                       ) : log.severity === 'warning' ? (
                         <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-[11px] font-black uppercase">
                           <AlertCircle className="w-3 h-3" /> WARNING
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-500/10 text-indigo-600 rounded-full text-[11px] font-black uppercase">
                           <Info className="w-3 h-3" /> ERROR
                         </div>
                       )}
                    </div>
                  </td>
                  <td className="px-8 py-5 border-l border-slate-50 max-w-md">
                    <p className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:line-clamp-none transition-all">
                      {log.error_message}
                    </p>
                    {log.stack_trace && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-mono">
                        {log.stack_trace.substring(0, 100)}...
                      </p>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[11px] font-bold text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleCopyForAI(log)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all transform hover:-translate-y-0.5"
                    >
                      <Copy className="w-3 h-3" />
                      {t.copy}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <CheckCircle className="w-12 h-12 text-emerald-500 mb-4" />
                      <p className="text-slate-500 font-black uppercase tracking-widest text-xs">{t.noLogs}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Summary of System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">Recomendación para Optimización</p>
          <p className="text-sm font-medium leading-relaxed italic text-slate-300">
            "Si observas errores recurrentes de 'Model Overloaded' o 'Quota Exceeded', considera rotar más agresivamente las API Keys o habilitar el fallback automático a modelos Flash."
          </p>
        </div>
        <div className="col-span-2 bg-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl rounded-full -mr-32 -mt-32"></div>
          <p className="text-[11px] font-black text-white/60 uppercase tracking-widest mb-4">Protocolo de Emergencia</p>
          <p className="text-lg font-black leading-tight">
            Copia cualquier log crítico y pégalo en el chat de Antigravity. Analizaré el <span className="text-emerald-400">Contexto JSON</span> y el <span className="text-amber-400">Stack Trace</span> para desplegar un fix en minutos.
          </p>
        </div>
      </div>
    </div>
  );
};
