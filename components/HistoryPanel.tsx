import React from 'react';
import { HistoryItem, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onLoadItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  language: Language;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onLoadItem, 
  onDeleteItem, 
  onClearAll,
  language 
}) => {
  const t = TRANSLATIONS[language];
  const [visibleCount, setVisibleCount] = React.useState(10);

  if (!isOpen) return null;

  const currentHistory = history.slice(0, visibleCount);
  const hasMore = history.length > visibleCount;

  return (
    <div className={`fixed inset-0 z-[200] flex justify-end font-sans`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#020617]/40 backdrop-blur-sm animate-in fade-in duration-500"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-md bg-[#020617]/80 backdrop-blur-3xl h-full shadow-[-20px_0_80px_-20px_rgba(0,0,0,0.5)] flex flex-col animate-in slide-in-from-right duration-700 border-l border-white/10">
        
        {/* Header */}
        <div className="p-8 md:p-10 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center space-x-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-magenta to-magenta/50 p-[1px] shadow-[0_0_20px_rgba(255,71,123,0.3)]">
              <div className="w-full h-full rounded-[15px] bg-slate-950 flex items-center justify-center">
                <svg className="w-5 h-5 text-magenta" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                {language === 'es' ? 'ARCHIVO DE INTELIGENCIA' : 'INTELLIGENCE ARCHIVE'}
              </h2>
              <p className="text-[11px] text-white/40 font-black uppercase tracking-[0.3em]">
                {history.length} {language === 'es' ? 'Auditorías' : 'Audits'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
          >
             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 custom-scrollbar">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-1000">
              <div className="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/5">
                <svg className="w-10 h-10 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-black uppercase tracking-widest text-sm">Sin registros</h3>
                <p className="text-white/40 text-[11px] font-black uppercase tracking-widest max-w-[200px] leading-relaxed">
                  Tus análisis se guardarán automáticamente aquí.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {currentHistory.map((item, idx) => {
                let title = "";
                let typeColor = 'text-magenta bg-magenta/10 border-magenta/20';
                
                if (item.type === 'search') title = item.query.theme;
                else if (item.type === 'traffic') title = item.query.domain;
                else if (item.type === 'image' || item.type === 'video') title = item.query.fileName;
                else if (item.type === 'campaign') title = item.query.accountName;
                else if (item.type === 'comparison') title = `${item.query.fileA} vs ${item.query.fileB}`;
                else if (item.type === 'avatar') title = (item.query as any).script;

                return (
                  <div
                    key={item.id}
                    className="group relative bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-magenta/30 hover:bg-white/[0.08] hover:shadow-[0_0_40px_-10px_rgba(255,71,123,0.1)] transition-all duration-300 animate-in fade-in slide-in-from-right-4 duration-500"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex items-start space-x-5">
                      <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${typeColor.split(' ').slice(1).join(' ')}`}>
                        {item.type === 'search' ? (
                          <svg className={`w-5 h-5 ${typeColor.split(' ')[0]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        ) : item.type === 'avatar' ? (
                          <svg className={`w-5 h-5 ${typeColor.split(' ')[0]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className={`w-5 h-5 ${typeColor.split(' ')[0]}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-center space-x-3 mb-1">
                          <span className={`text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${typeColor}`}>
                            {item.type}
                          </span>
                          <span className="text-[11px] text-white/20 font-bold uppercase">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight truncate group-hover:text-magenta transition-colors">
                          {title}
                        </h4>
                        <p className="text-[11px] text-white/40 font-bold uppercase truncate mt-1">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item.id);
                      }}
                      className="absolute top-6 right-6 p-2 rounded-lg bg-white/0 hover:bg-rose-500/10 text-white/0 group-hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => onLoadItem(item)}
                      className="absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </div>
                );
              })}
              
              {hasMore && (
                <button
                  onClick={() => setVisibleCount(prev => prev + 10)}
                  className="w-full py-4 rounded-2xl border border-white/5 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all uppercase text-[11px] font-black tracking-widest mt-4"
                >
                  {language === 'es' ? 'Cargar más' : 'Load More'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {history.length > 0 && (
          <div className="p-8 md:p-10 border-t border-white/5 bg-white/5 backdrop-blur-3xl">
            <button
              onClick={onClearAll}
              className="w-full flex items-center justify-center space-x-3 py-5 rounded-2xl border border-white/10 text-white/40 hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all uppercase text-[11px] font-black tracking-widest"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>{language === 'es' ? 'Limpiar historial' : 'Clear History'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
