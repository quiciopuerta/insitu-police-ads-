import React, { useState, useRef } from "react";
import { Language, AuthUser } from "../types";
import { researchTrends, generateThinkingContent } from "../services/ai/mediaGenerationService";
import { generateGoogleStylePDF } from "../utils/exportUtils";
import { reportService } from "../services/ai/reportService";

interface ResearchHubProps {
  currentUser: AuthUser | null;
  language: Language;
  onLogin: () => void;
  onCancel: () => void;
  history?: any[];
  onSaveHistory?: (item: any) => void;
  onIngredient?: (item: any) => void;
}

import { 
  HistoryItem, 
  ResearchEntry, 
  ResearchMode, 
  ResearchSource, 
  RichMetric, 
  ChartData,
  ResearchTableData,
  RichContent
} from '../types';
import { useTutorial } from '../hooks/useTutorial';
import TutorialBubble, { TutorialTrigger } from './ui/TutorialBubble';
import VeracityBadge from './ui/VeracityBadge';

// ── Color map for chart bars ───────────────────────────────────────────
const CHART_COLORS: Record<string, string> = {
  primary: '#ff477b',
  secondary: '#00f5d4',
  blue: '#4dabf7',
  green: '#51cf66',
  orange: '#ff922b',
};

// ── MetricsGrid Component ─────────────────────────────────────────────
const MetricsGrid: React.FC<{ metrics: RichMetric[]; language: string }> = ({ metrics, language }) => (
  <div className="px-6 pt-2 pb-4">
    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/50 mb-3">
      {language === 'es' ? '📊 Métricas Clave del Mercado' : '📊 Key Market Metrics'}
    </p>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {metrics.map((m, i) => (
        <div key={i} className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-0.5 ${
            m.trend === 'up' ? 'bg-emerald-500' : m.trend === 'down' ? 'bg-rose-500' : 'bg-white/10'
          }`} />
          <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest leading-tight mb-1">{m.label}</p>
          <p className="text-lg font-black text-white leading-none">{m.value}</p>
          <div className="flex items-center justify-between mt-2">
            {m.source && <span className="text-[11px] text-violet-400/50">{m.source}</span>}
            {m.trend && m.trend !== 'neutral' && (
              <span className={`text-[11px] font-black ${ m.trend === 'up' ? 'text-emerald-400' : 'text-rose-400' }`}>
                {m.trend === 'up' ? '↑' : '↓'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── ResearchBarChart Component (SVG) ──────────────────────────────────
const ResearchBarChart: React.FC<{ chart: ChartData; language: string }> = ({ chart, language }) => {
  const max = Math.max(...chart.series.map(s => s.value), 1);
  const barW = Math.max(20, Math.min(60, Math.floor(560 / chart.series.length) - 8));
  const chartH = 120;
  return (
    <div className="px-6 pb-4">
      <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-black text-white/60 uppercase tracking-widest">{chart.title}</p>
          {chart.unit && <span className="text-[11px] text-white/20 bg-white/5 px-2 py-0.5 rounded-full">{chart.unit}</span>}
        </div>
        <svg viewBox={`0 0 ${chart.series.length * (barW + 8) + 32} ${chartH + 40}`} className="w-full overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <g key={i}>
              <line x1={28} y1={chartH * (1 - pct)} x2={chart.series.length * (barW + 8) + 28} y2={chartH * (1 - pct)}
                stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={24} y={chartH * (1 - pct) + 3} fontSize={7} fill="rgba(255,255,255,0.2)" textAnchor="end">
                {Math.round(max * pct)}
              </text>
            </g>
          ))}
          {/* Bars */}
          {chart.series.map((s, i) => {
            const barH = (s.value / max) * chartH;
            const x = 32 + i * (barW + 8);
            const color = CHART_COLORS[s.color || 'primary'];
            return (
              <g key={i}>
                <rect x={x} y={chartH - barH} width={barW} height={barH} rx={4} fill={color} opacity={0.8} />
                <rect x={x} y={chartH - barH} width={barW} height={Math.min(6, barH)} rx={4} fill={color} />
                <text x={x + barW / 2} y={chartH + 12} fontSize={7} fill="rgba(255,255,255,0.4)" textAnchor="middle">
                  {s.label.length > 10 ? s.label.slice(0, 9) + '…' : s.label}
                </text>
                <text x={x + barW / 2} y={chartH - barH - 4} fontSize={8} fill="rgba(255,255,255,0.7)" textAnchor="middle" fontWeight="bold">
                  {s.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// ── ResearchTable Component ────────────────────────────────────────────
const ResearchTable: React.FC<{ table: ResearchTableData }> = ({ table }) => (
  <div className="px-6 pb-4">
    <div className="bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-white/5">
        <p className="text-[11px] font-black text-white/60 uppercase tracking-widest">{table.title}</p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {table.headers.map((h, i) => (
              <th key={i} className="px-4 py-2 text-left text-[11px] font-black text-white/30 uppercase tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? 'bg-white/[0.01]' : ''}>
              {row.map((cell, ci) => (
                <td key={ci} className={`px-4 py-2.5 text-[11px] ${ ci === 0 ? 'font-bold text-white/70' : 'text-white/40' }`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);


import { VeracityScore } from '../types';

const ScientificVeracityCard: React.FC<{ veracity: VeracityScore; language: string }> = ({ veracity, language }) => {
  return (
    <div className="mx-6 mb-6 p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm">🔬</span>
        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400">
          {language === 'es' ? 'Veracidad Científica' : 'Scientific Veracity'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{language === 'es' ? 'Puntuación General' : 'Overall Score'}</span>
              <span className={`text-xs font-bold ${veracity.overall >= 80 ? 'text-emerald-400' : 'text-white/70'}`}>{veracity.overall}%</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{language === 'es' ? 'Estado' : 'Tier'}</span>
              <span className={`text-xs font-bold ${veracity.tier === 'VERIFIED' ? 'text-emerald-400' : 'text-white/70'}`}>{veracity.tier}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{language === 'es' ? 'Afirmaciones Verificadas' : 'Verified Claims'}</span>
              <span className={`text-xs font-bold text-emerald-400`}>{veracity.claimsVerified}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{language === 'es' ? 'Afirmaciones Sin Verificar' : 'Unverified Claims'}</span>
              <span className={`text-xs font-bold text-white/70`}>{veracity.claimsUnverified}</span>
            </div>
      </div>
    </div>
  );
};

const ResearchHub: React.FC<ResearchHubProps> = ({ currentUser, language, onLogin, onCancel, history: globalHistory, onSaveHistory, onIngredient }) => {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ResearchMode>('search');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResearchEntry[]>([]);
  const [showThinking, setShowThinking] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{[key: string]: 'idle' | 'sending' | 'success' | 'error'}>({});
  const [targetEmail, setTargetEmail] = useState<string>(currentUser?.email || '');
  const [showEmailInput, setShowEmailInput] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<Record<string, 'report' | 'dashboard'>>({});
  const resultsRef = useRef<HTMLDivElement>(null);

  // Initialize Tutorial
  const { steps: tutorialSteps, currentStep, isVisible: isTutorialVisible, isDismissed: isTutorialDismissed, next, prev, goTo, dismiss, restart } = useTutorial('research-hub', language);

  // Sync with global history — Restored robustness
  // We filter out any items where 'result' is missing (prevents crashes from partial history data)
  React.useEffect(() => {
    if (Array.isArray(globalHistory)) {
      const researchItems = globalHistory
        .filter(item => item.type === 'gen-research' && item.result)
        .map(item => item.result as ResearchEntry);
      setResults(researchItems);
    }
  }, [globalHistory]);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <span className="text-3xl">🔬</span>
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tight text-white">{language === 'es' ? 'Research Hub' : 'Research Hub'}</h2>
        <p className="text-white/40 text-sm max-w-md text-center">{language === 'es' ? 'Accede para investigar tendencias con IA y razonamiento profundo.' : 'Log in to research trends with AI and deep reasoning.'}</p>
        <div className="flex gap-3">
          <button onClick={onLogin} className="bg-[#ff477b] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest">{language === 'es' ? 'Acceder' : 'Login'}</button>
          <button onClick={onCancel} className="bg-white/5 text-white/50 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/10">{language === 'es' ? 'Cancelar' : 'Cancel'}</button>
        </div>
      </div>
    );
  }

  const handleResearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);

    try {
      if (mode === 'search') {
        const result = await researchTrends(query.trim(), language, currentUser?.brandProfile);
        if (result) {
          const newEntry: ResearchEntry = {
            id: Date.now().toString(),
            query: query.trim(),
            mode: 'search',
            text: result.text,
            tldr: result.tldr,
            veracity: result.veracity,
            sources: result.sources,
            citationMap: (result as any).citationMap,
            richContent: (result as any).richContent,
            meta: (result as any).meta,
            timestamp: Date.now()
          };
          setResults(prev => [newEntry, ...prev]);
          
          if (onSaveHistory) {
            onSaveHistory({
              type: 'gen-research',
              query: { query: query.trim(), mode: 'search' },
              result: newEntry
            });
          }

          // AUTO-SURFACE TO FLOW LAB
          if (onIngredient) {
            onIngredient({
              id: `research-${newEntry.id}`,
              url: 'https://cdn-icons-png.flaticon.com/512/3201/3201521.png', // Generic research icon
              type: 'text',
              metadata: { 
                 source: 'Research Hub', 
                 title: newEntry.query,
                 tldr: newEntry.tldr,
                 content: newEntry.text
              }
            });
          }
        }
      } else {
        const result = await generateThinkingContent(query.trim(), language, currentUser?.brandProfile);
        if (result) {
          const newEntry: ResearchEntry = {
            id: Date.now().toString(),
            query: query.trim(),
            mode: 'thinking',
            text: result.text,
            thinking: result.thinking,
            sources: [],
            timestamp: Date.now()
          };
          setResults(prev => [newEntry, ...prev]);
          setShowThinking(newEntry.id);
          
          if (onSaveHistory) {
            onSaveHistory({
              type: 'gen-research',
              query: { query: query.trim(), mode: 'thinking' },
              result: newEntry
            });
          }

          // AUTO-SURFACE TO FLOW LAB
          if (onIngredient) {
            onIngredient({
              id: `thinking-${newEntry.id}`,
              url: 'https://cdn-icons-png.flaticon.com/512/3201/3201550.png', // Generic thinking icon
              type: 'text',
              metadata: { 
                 source: 'Deep Thinking', 
                 title: newEntry.query,
                 content: newEntry.text,
                 thinking: newEntry.thinking
              }
            });
          }
        }
      }
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
    } catch (err) {
      console.error('[ResearchHub Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (entry: ResearchEntry) => {
    const emailToUse = targetEmail || currentUser?.email;
    
    if (!emailToUse || !emailToUse.includes('@')) {
      alert(language === 'es' ? 'Por favor ingresa un correo válido' : 'Please enter a valid email');
      return;
    }

    setEmailStatus(prev => ({ ...prev, [entry.id]: 'sending' }));
    
    try {
      // 1. Generate PDF as Base64
      const pdfBase64 = await generateGoogleStylePDF(
        "research",
        { 
          topic: entry.query, 
          text: entry.text, 
          sources: entry.sources,
          thinking: entry.thinking 
        },
        `Research_${entry.query.replace(/\s+/g, '_')}`,
        language,
        { 
          user: currentUser,
          action: "return" 
        }
      ) as string;

      if (!pdfBase64) throw new Error("PDF Generation failed");

      // 2. Send via Service
      const result = await reportService.sendReport({
        email: emailToUse,
        pdfBase64,
        fileName: `Research_${entry.query.replace(/\s+/g, '_')}.pdf`,
        domain: entry.query,
        reportType: entry.mode === 'search' ? 'Market Research (Search)' : 'Market Research (Deep Thinking)',
        language
      });

      if (result.success) {
        setEmailStatus(prev => ({ ...prev, [entry.id]: 'success' }));
        setShowEmailInput(null);
        setTimeout(() => {
          setEmailStatus(prev => ({ ...prev, [entry.id]: 'idle' }));
        }, 3000);
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      console.error('[SendEmail Error]:', err);
      setEmailStatus(prev => ({ ...prev, [entry.id]: 'error' }));
      alert(language === 'es' ? `Error al enviar: ${err.message}` : `Send error: ${err.message}`);
    }
  };

  const renderMarkdown = (text: string, sources: any[] = []) => {
    // Helper to render text with bold and clickable citations
    const renderInlineElements = (textSpan: string) => {
      // Split by citations first: [1], [2], etc.
      const citationRegex = /(\[\d+\])/g;
      return textSpan.split(citationRegex).map((part, index) => {
        // Is it a citation?
        const citeMatch = part.match(/^\[(\d+)\]$/);
        if (citeMatch) {
          const sourceIdx = parseInt(citeMatch[1], 10);
          const source = sources.find(s => s.index === sourceIdx);
          if (source) {
            return (
              <a 
                key={index} 
                href={source.url} 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center justify-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-black text-[10px] mx-1 hover:bg-violet-500 hover:text-white hover:scale-110 transition-all cursor-pointer relative group-cite"
                title={`${source.title} (${source.url})`}
              >
                {sourceIdx}
                {/* Floating Preview Hint */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-[10px] text-white/70 whitespace-nowrap opacity-0 group-cite-hover:opacity-100 pointer-events-none transition-opacity shadow-2xl z-50 min-w-[200px]">
                  <strong className="block text-violet-400 mb-1">{source.title}</strong>
                  <span className="block truncate text-white/30">{source.url}</span>
                </span>
              </a>
            );
          }
          return <span key={index} className="text-violet-400/50 text-xs px-1">{part}</span>;
        }

        // Apply bold within non-citation parts
        if (part.match(/\*\*.+?\*\*/)) {
          const boldParts = part.split(/(\*\*.+?\*\*)/g);
          return (
            <span key={index}>
              {boldParts.map((bp, j) => 
                bp.startsWith('**') 
                  ? <strong key={j} className="text-white font-bold">{bp.replace(/\*\*/g, '')}</strong> 
                  : bp
              )}
            </span>
          );
        }
        
        return part;
      });
    };

    // Simple markdown renderer
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-black text-white mt-6 mb-2 uppercase tracking-tight">{line.replace('### ', '').replace(/\*\*/g, '')}</h3>;
      if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-black text-[#ff477b] mt-8 mb-3 uppercase tracking-tight">{line.replace('## ', '').replace(/\*\*/g, '')}</h2>;
      if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-black text-white mt-6 mb-4 uppercase tracking-tight">{line.replace('# ', '').replace(/\*\*/g, '')}</h1>;
      
      // Inline formatting for non-headers
      if (line.match(/^[\-\*] /)) return <li key={i} className="text-white/60 text-sm ml-4 mb-1 list-disc list-inside">{renderInlineElements(line.replace(/^[\-\*] /, ''))}</li>;
      if (line.match(/^\d+\. /)) return <li key={i} className="text-white/60 text-sm ml-4 mb-1 list-decimal list-inside">{renderInlineElements(line.replace(/^\d+\. /, ''))}</li>;
      
      // Empty line
      if (line.trim() === '') return <div key={i} className="h-2" />;
      
      // Regular paragraph
      return <p key={i} className="text-white/60 text-sm leading-relaxed mb-2">{renderInlineElements(line)}</p>;
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4 relative">
        <div className="absolute right-0 top-0">
          <TutorialTrigger 
            onRestart={restart} 
            language={language} 
            isDismissed={isTutorialDismissed}
            isVisible={isTutorialVisible}
            onShow={() => goTo(0)}
          />
        </div>
        <div className="inline-flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 px-5 py-2 rounded-full">
          <span className="text-lg">🔬</span>
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-violet-400">Research Hub</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase">
          {language === 'es' ? 'Investigación' : 'Research'}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-[#ff477b]">
            {language === 'es' ? 'con IA' : 'with AI'}
          </span>
        </h1>
        <p className="text-white/30 text-sm max-w-xl mx-auto">
          {language === 'es' 
            ? 'Investiga tendencias con Google Search Grounding o usa razonamiento profundo para análisis estratégico.'
            : 'Research trends with Google Search Grounding or use deep reasoning for strategic analysis.'}
        </p>
      </div>

      {/* Mode Selector */}
      <div id="res-step-1" className="flex justify-center transition-all duration-300">
        <div className={`bg-white/5 border border-white/10 rounded-2xl p-1.5 flex gap-1 ${
          isTutorialVisible && currentStep === 0 ? 'ring-2 ring-violet-500 ring-offset-4 ring-offset-slate-900 bg-violet-500/10' : ''
        }`}>
          <button
            onClick={() => setMode('search')}
            className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
              mode === 'search' ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : 'text-white/40 hover:text-white'
            }`}
          >
            <span>🌐</span>
            <span>Search Grounding</span>
          </button>
          <button
            onClick={() => setMode('thinking')}
            className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${
              mode === 'thinking' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-white/40 hover:text-white'
            }`}
          >
            <span>🧠</span>
            <span>Deep Thinking</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div id="res-step-2" className="relative group transition-all duration-300">
        <div className={`absolute -inset-1 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl ${
          mode === 'search' ? 'bg-violet-500/20' : 'bg-amber-500/20'
        }`} />
        <div className={`relative bg-white/5 border border-white/10 rounded-[2rem] p-2 flex items-center gap-3 backdrop-blur-xl ${
          isTutorialVisible && currentStep === 1 ? 'ring-2 ring-violet-500 ring-offset-4 ring-offset-slate-900 bg-violet-500/10' : ''
        }`}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
            placeholder={
              mode === 'search'
                ? (language === 'es' ? 'Ej: Tendencias de Google Ads en 2026 para ecommerce...' : 'E.g.: Google Ads trends 2026 for ecommerce...')
                : (language === 'es' ? 'Ej: Estrategia óptima de presupuesto para una marca D2C...' : 'E.g.: Optimal budget strategy for a D2C brand...')
            }
            className="flex-1 bg-transparent text-white px-6 py-4 text-sm font-medium placeholder:text-white/20 outline-none"
          />
          <button
            onClick={handleResearch}
            disabled={loading || !query.trim()}
            className={`px-8 py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 ${
              mode === 'search'
                ? 'bg-violet-500 text-white hover:bg-violet-600 shadow-lg shadow-violet-500/20'
                : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{language === 'es' ? 'Investigando...' : 'Researching...'}</span>
              </>
            ) : (
              <span>{mode === 'search' ? (language === 'es' ? 'Investigar' : 'Research') : (language === 'es' ? 'Razonar' : 'Reason')}</span>
            )}
          </button>
        </div>
      </div>

      {/* Mode Description */}
      <div className={`text-center p-4 rounded-2xl border ${
        mode === 'search' ? 'bg-violet-500/5 border-violet-500/10' : 'bg-amber-500/5 border-amber-500/10'
      }`}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/30">
          {mode === 'search'
            ? (language === 'es' ? '🌐 Busca datos en tiempo real usando Google Search Grounding. Incluye fuentes verificables.' : '🌐 Searches real-time data using Google Search Grounding. Includes verifiable sources.')
            : (language === 'es' ? '🧠 Razonamiento profundo con Thinking Mode. La IA muestra su proceso de pensamiento antes de responder.' : '🧠 Deep reasoning with Thinking Mode. AI shows its thought process before answering.')}
        </p>
      </div>

      {/* Results */}
      <div id="res-step-3" ref={resultsRef} className={`space-y-6 transition-all duration-300 ${
        isTutorialVisible && currentStep === 2 ? 'ring-2 ring-violet-500 ring-offset-4 ring-offset-slate-900 rounded-[3rem] p-2' : ''
      }`}>
        {results.map((entry) => (
          <div key={entry.id} className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] overflow-hidden">
            {/* Result Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  entry?.mode === 'search' ? 'bg-violet-500/10 text-violet-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  <span className="text-lg">{entry?.mode === 'search' ? '🌐' : '🧠'}</span>
                </div>
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-tight leading-none mb-1">{entry?.query}</p>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
                    {entry?.mode === 'search' ? 'Market Intelligence' : 'Executive Strategy'} · {entry?.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '---'}
                  </p>
                </div>
              </div>

              {/* View Toggle */}
              {entry.richContent && (
                <div className="hidden md:flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                  <button
                    onClick={() => setViewMode(prev => ({ ...prev, [entry.id]: 'report' }))}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      (viewMode[entry.id] || 'report') === 'report' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'
                    }`}
                  >
                    {language === 'es' ? 'Reporte' : 'Report'}
                  </button>
                  <button
                    onClick={() => setViewMode(prev => ({ ...prev, [entry.id]: 'dashboard' }))}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      viewMode[entry.id] === 'dashboard' ? 'bg-white/10 text-white shadow-xl' : 'text-white/30 hover:text-white'
                    }`}
                  >
                    Dashboard
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                {entry.thinking && (
                  <button
                    onClick={() => setShowThinking(showThinking === entry.id ? null : entry.id)}
                    className="text-[11px] font-black uppercase tracking-widest text-amber-400/50 hover:text-amber-400 transition-colors px-3 py-1.5 rounded-xl bg-amber-500/5 border border-amber-500/10"
                  >
                    {showThinking === entry.id ? (language === 'es' ? 'Ocultar Razonamiento' : 'Hide Reasoning') : (language === 'es' ? 'Ver Razonamiento' : 'Show Reasoning')}
                  </button>
                )}
                <button
                  onClick={() => navigator.clipboard.writeText(entry.text)}
                  className="text-[11px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors px-3 py-1.5 rounded-xl bg-white/5 border border-white/5"
                >
                  {language === 'es' ? 'Copiar' : 'Copy'}
                </button>
                <button
                  onClick={() => generateGoogleStylePDF(
                    "research",
                    { 
                      topic: entry.query, 
                      text: entry.text, 
                      sources: entry.sources,
                      richContent: entry.richContent,
                      thinking: entry.thinking 
                    },
                    `Research_${entry.query.replace(/\s+/g, '_')}_${new Date(entry.timestamp).toISOString().split('T')[0]}`,
                    language,
                    { user: currentUser }
                  )}
                  className="text-[11px] font-black uppercase tracking-widest text-violet-400/50 hover:text-violet-400 transition-colors px-3 py-1.5 rounded-xl bg-violet-500/5 border border-violet-500/10"
                >
                  {language === 'es' ? 'Exportar PDF' : 'Export PDF'}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowEmailInput(showEmailInput === entry.id ? null : entry.id)}
                    disabled={emailStatus[entry.id] === 'sending'}
                    className={`text-[11px] font-black uppercase tracking-widest transition-all px-3 py-1.5 rounded-xl border ${
                      emailStatus[entry.id] === 'success' 
                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                        : emailStatus[entry.id] === 'sending'
                          ? 'bg-white/5 text-white/30 border-white/5 cursor-wait'
                          : 'bg-indigo-500/5 text-indigo-400/50 hover:text-indigo-400 border-indigo-500/10'
                    }`}
                  >
                    {emailStatus[entry.id] === 'sending' 
                      ? (language === 'es' ? 'Enviando...' : 'Sending...') 
                      : emailStatus[entry.id] === 'success'
                        ? (language === 'es' ? '¡Enviado!' : 'Sent!')
                        : (language === 'es' ? 'Enviar por Mail' : 'Send by Email')}
                  </button>

                  {showEmailInput === entry.id && (
                    <div className="absolute top-full right-0 mt-2 p-3 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 min-w-[240px] animate-in fade-in slide-in-from-top-2 duration-200">
                      <p className="text-[11px] font-black text-white/40 uppercase tracking-widest mb-2 border-b border-white/5 pb-1">
                        {language === 'es' ? 'Destinatario' : 'Recipient'}
                      </p>
                      <div className="flex gap-1.5">
                        <input
                          type="email"
                          value={targetEmail}
                          onChange={(e) => setTargetEmail(e.target.value)}
                          placeholder="tu@email.com"
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 w-full"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendEmail(entry);
                            if (e.key === 'Escape') setShowEmailInput(null);
                          }}
                        />
                        <button
                          onClick={() => handleSendEmail(entry)}
                          className="bg-indigo-500 text-white p-2 px-3 rounded-xl hover:bg-indigo-400 transition-colors"
                        >
                          <span className="text-xs">🚀</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scientific Veracity Badge */}
            {entry.veracity && (
              <div className="px-6 pt-6">
                <VeracityBadge
                  score={entry.veracity}
                  sourceTiers={entry.sourceTiers}
                  validationReady={entry.validationReady}
                  expanded={false}
                  language={language}
                />
              </div>
            )}

            {/* TL;DR Executive Summary */}
            {entry.tldr && (
              <div className="mx-6 mt-6 p-6 bg-violet-600/10 border-l-4 border-violet-500 rounded-r-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">⚡</span>
                  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-violet-400">TL;DR / Resumen Ejecutivo</span>
                </div>
                <div className="text-sm text-white/80 leading-relaxed italic">
                  {entry.tldr}
                </div>
              </div>
            )}

            {/* Scientific Veracity Checklist */}
            {entry.veracity && <ScientificVeracityCard veracity={entry.veracity} language={language} />}

            {/* Thinking Process */}
            {entry.thinking && showThinking === entry.id && (
              <div className="mx-6 mt-6 p-6 bg-slate-900/50 border border-amber-500/20 rounded-[2rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <span className="text-6xl text-amber-500">🧠</span>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-lg">🧠</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-amber-500/70">
                      {language === 'es' ? 'Proceso de Razonamiento Crítico' : 'Critical Reasoning Process'}
                    </span>
                    <p className="text-[10px] text-amber-200/30 uppercase tracking-widest font-bold">Scientific Scrutiny Phase</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {entry.thinking.split(/\d+\.\s+/).filter(Boolean).map((section, idx) => {
                    const lines = section.trim().split('\n');
                    const title = lines[0];
                    const content = lines.slice(1).join('\n');
                    return (
                      <div key={idx} className="border-l border-amber-500/10 pl-4 py-1">
                        <h4 className="text-[10px] font-black text-amber-400/60 uppercase tracking-widest mb-1">{title}</h4>
                        <div className="text-xs text-amber-200/40 leading-relaxed italic whitespace-pre-wrap font-mono">
                          {content || title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dashboard View */}
            {viewMode[entry.id] === 'dashboard' && entry.richContent ? (
              <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Executive Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Metrics */}
                  <div className="md:col-span-2 space-y-6">
                    {entry.richContent.metrics && entry.richContent.metrics.length > 0 && (
                      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-2">
                        <MetricsGrid metrics={entry.richContent.metrics} language={language} />
                      </div>
                    )}
                    
                    {entry.richContent.chartData?.map((chart, idx) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-3xl p-2">
                        <ResearchBarChart chart={chart} language={language} />
                      </div>
                    ))}
                  </div>

                  {/* Right Column: Key Takeaways & Branding Context */}
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 rounded-3xl p-6">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-400 mb-4">Core Takeaways</p>
                      <ul className="space-y-3">
                        {entry.tldr?.split('\n').filter(l => l.trim()).slice(0, 4).map((point, i) => (
                          <li key={i} className="flex gap-3 text-xs text-white/70 leading-relaxed">
                            <span className="text-violet-500 mt-1">✦</span>
                            {point.replace(/^[-\*\d\.]+\s*/, '')}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {currentUser?.brandProfile && (
                      <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">Brand Context Applied</p>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-white/70">{currentUser.brandProfile.brandName}</p>
                          <span className="inline-block px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[10px] text-violet-400 uppercase font-black tracking-widest">
                            {currentUser.brandProfile.industry}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Width Tables */}
                {entry.richContent.tables?.map((table, idx) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                    <ResearchTable table={table} />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Content - Traditional Report Mode */}
                <div className="p-6 md:p-8">
                  <div className="prose prose-sm max-w-none">
                    {renderMarkdown(entry.text, entry.sources)}
                  </div>
                </div>

                {/* Inline Rich Content in Report mode (Optional, shown if Dashboard is not selected) */}
                {/* Let's keep it clean: if in report mode, we only show text and veracity */}
              </>
            )}

            {/* Scientific Disclaimer */}
            {entry.mode === 'search' && entry.meta && (
              <div className="mx-6 mb-2 flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl px-4 py-3">
                <span className="text-base mt-0.5">🔬</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-widest text-emerald-400/70 mb-0.5">
                    {language === 'es' ? 'Protocolo de Rigor Científico Activo' : 'Scientific Rigor Protocol Active'}
                  </p>
                  <p className="text-[11px] text-emerald-300/40 leading-relaxed">
                    {language === 'es'
                      ? `Datos obtenidos mediante Google Search Grounding en tiempo real · ${entry.meta.sourceCount ?? 0} fuentes verificadas · ${entry.meta.citationCount ?? 0} afirmaciones con respaldo · Búsqueda: ${entry.meta.searchDate ? new Date(entry.meta.searchDate).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'N/A'}`
                      : `Data retrieved via real-time Google Search Grounding · ${entry.meta.sourceCount ?? 0} verified sources · ${entry.meta.citationCount ?? 0} backed claims · Search: ${entry.meta.searchDate ? new Date(entry.meta.searchDate).toLocaleString('en-US') : 'N/A'}`
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Sources */}
            {entry.sources.length > 0 && (
              <div className="px-6 pb-6">
                <div className="border-t border-white/5 pt-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-violet-400/40 mb-3">
                    {language === 'es' ? 'Fuentes Verificadas' : 'Verified Sources'} ({entry.sources.length})
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {entry.sources.map((source, idx) => {
                      let domain = '';
                      try { domain = new URL(source.url).hostname.replace('www.', ''); } catch {}
                      const premiumDomains: Record<string, string> = {
                        'kantar.com': 'Kantar', 'nielseniq.com': 'NielsenIQ', 'nielsen.com': 'Nielsen',
                        'statista.com': 'Statista', 'euromonitor.com': 'Euromonitor', 'gwi.com': 'GWI',
                        'ipsos.com': 'Ipsos', 'mckinsey.com': 'McKinsey', 'deloitte.com': 'Deloitte',
                        'pwc.com': 'PwC', 'forrester.com': 'Forrester', 'gartner.com': 'Gartner',
                        'ibisworld.com': 'IBISWorld', 'emarketer.com': 'eMarketer', 'warc.com': 'WARC',
                        'mintel.com': 'Mintel', 'bain.com': 'Bain & Co', 'bcg.com': 'BCG', 'idc.com': 'IDC',
                      };
                      const matchKey = Object.keys(premiumDomains).find(d => domain.includes(d));
                      const isPremium = !!matchKey;
                      const platformLabel = matchKey ? premiumDomains[matchKey] : domain;
                      return (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all group ${
                            isPremium
                              ? 'bg-violet-500/5 border-violet-500/15 hover:border-violet-500/40 hover:bg-violet-500/10'
                              : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                          }`}
                          title={source.url}
                        >
                          <span className={`text-[11px] font-black min-w-[28px] text-center px-1.5 py-0.5 rounded-md ${
                            isPremium ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-white/30'
                          }`}>[{source.index ?? idx + 1}]</span>
                          {isPremium && <span className="text-[11px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">★ {platformLabel}</span>}
                          <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors truncate flex-1">{source.title || domain}</span>
                          <span className="text-[11px] text-white/20 group-hover:text-violet-400/50 transition-colors ml-auto">↗</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {results.length === 0 && !loading && (
          <div className="text-center py-20 space-y-4">
            <div className="text-5xl opacity-20">🔬</div>
            <p className="text-white/20 text-sm font-bold uppercase tracking-widest">
              {language === 'es' ? 'Tus investigaciones aparecerán aquí' : 'Your research will appear here'}
            </p>
          </div>
        )}
      </div>

      {/* Tutorial Overlay */}
      <TutorialBubble
        steps={tutorialSteps}
        currentStep={currentStep}
        isVisible={isTutorialVisible}
        language={language}
        onNext={next}
        onPrev={prev}
        onGoTo={goTo}
        onDismiss={dismiss}
      />
    </div>
  );
};

export default ResearchHub;
