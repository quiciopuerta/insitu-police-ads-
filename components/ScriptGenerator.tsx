import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import { scriptGenerationService } from '../services/ai/scriptGenerationService';
import { Language, AdsAccount, CampaignPerformance } from '../types';

// ─── TYPES ─────────────────────────────────────────────────────────────────────
interface ScriptGeneratorProps {
  language: Language;
  selectedAccount: AdsAccount;
  performanceData: CampaignPerformance[];
}

interface QuickTemplate {
  title: string;
  brief: string;
  category: TemplateCategory;
  icon: string;
  tag: string; // e.g. "SEARCH" "DISPLAY"
  config: {
    excludeBrandCampaigns: boolean;
    executionMode: 'preview' | 'live';
    excludeConvertedKeywords: boolean;
    cpcThreshold: number;
    budgetThreshold: number;
  };
}

type TemplateCategory = 'all' | 'search' | 'display' | 'shopping' | 'video' | 'pmax' | 'budget' | 'audit';
type ResultTab = 'report' | 'alerts' | 'script';

// ─── CATEGORY META ─────────────────────────────────────────────────────────────
const CAT_META: Record<TemplateCategory, { label: string; icon: string; color: string }> = {
  all:      { label: 'Todos',    icon: '≡',  color: '#9ca3af' },
  search:   { label: 'Search',   icon: '🔍', color: '#38bdf8' },
  display:  { label: 'Display',  icon: '□',  color: '#a78bfa' },
  shopping: { label: 'Shopping', icon: '⬜', color: '#34d399' },
  video:    { label: 'Video',    icon: '▶',  color: '#fb7185' },
  pmax:     { label: 'PMax',     icon: '★',  color: '#818cf8' },
  budget:   { label: 'Budget',   icon: '$',  color: '#fbbf24' },
  audit:    { label: 'Auditoría',icon: '⚑',  color: '#94a3b8' },
};

// ─── TEMPLATE WARNINGS ─────────────────────────────────────────────────────────
const WARNINGS: Record<string, { es: string; en: string; interval: string }> = {
  'pausar keywords':        { es: 'Revisa c/2 sem. Keywords pueden convertir tarde.', en: 'Review every 2w. KWs may convert late.', interval: '2w' },
  'alerta de consumo':      { es: 'Ajusta si presupuesto <$50/día.', en: 'Adjust for budgets <$50/day.', interval: '1w' },
  'ofertas inteligentes':   { es: 'Incompatible con Smart Bidding automático.', en: 'Incompatible with auto Smart Bidding.', interval: '1w' },
  'keywords duplicadas':    { es: 'Match types pueden crear falsos positivos.', en: 'Match types may cause false positives.', interval: '1mo' },
  'quality score':          { es: 'QS tarda 7-14 días en actualizarse.', en: 'QS takes 7-14 days to update.', interval: '1w' },
  'keywords de marca':      { es: 'CPC varía por competidores activos.', en: 'CPC varies by active competitors.', interval: '1d' },
  'limpiar campañas':       { es: '⚠ CRÍTICO: genera reporte ANTES de pausar.', en: '⚠ CRITICAL: generate report BEFORE pausing.', interval: 'Q' },
  'promociones flash':      { es: '⚠ CRÍTICO: prueba 24h en PREVIEW primero.', en: '⚠ CRITICAL: test 24h in PREVIEW first.', interval: 'on-demand' },
  'inventario agotado':     { es: 'Requiere feed de inventario en tiempo real.', en: 'Requires real-time inventory feed.', interval: '1d' },
};

function getWarning(brief: string, lang: Language) {
  const lower = brief.toLowerCase();
  for (const [key, val] of Object.entries(WARNINGS)) {
    if (lower.includes(key)) {
      return { text: lang === 'es' ? val.es : val.en, interval: val.interval };
    }
  }
  return null;
}

// ─── HIGHLIGHT JS ──────────────────────────────────────────────────────────────
function highlightJS(code: string): string {
  if (!code) return '';
  let h = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  h = h.replace(/\b(function|const|let|var|if|else|for|while|return|true|false|null|async|await|class|try|catch|throw|new)\b/g, '<span style="color:#c792ea;font-weight:600">$1</span>');
  h = h.replace(/\b(AdsApp|Logger|Utilities|SpreadsheetApp)\b/g, '<span style="color:#82aaff">$1</span>');
  h = h.replace(/(["'`])(.*?)\1/gs, '<span style="color:#c3e88d">$&</span>');
  h = h.replace(/(\/\/[^\n]*)/g, '<span style="color:#546e7a;font-style:italic">$1</span>');
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#f78c6c">$1</span>');
  return h;
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────────
export const ScriptGenerator: React.FC<ScriptGeneratorProps> = ({ language, selectedAccount, performanceData }) => {
  const L = useCallback((es: string, en: string) => language === 'es' ? es : en, [language]);

  // ── State ──
  const [brief, setBrief] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const [resultTab, setResultTab] = useState<ResultTab>('report');
  const [warning, setWarning] = useState<{ text: string; interval: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>('all');
  const [selectedTplIdx, setSelectedTplIdx] = useState<number | null>(null);
  const [generatedScript, setGeneratedScript] = useState('');
  const [decisionReport, setDecisionReport] = useState('');
  const [safetyAlerts, setSafetyAlerts] = useState('');
  const [excludeBrand, setExcludeBrand] = useState(true);
  const [execMode, setExecMode] = useState<'preview' | 'live'>('preview');
  const [excludeConverted, setExcludeConverted] = useState(true);
  const [cpcThreshold, setCpcThreshold] = useState(5.0);
  const [budgetGuard, setBudgetGuard] = useState(30);
  const [copied, setCopied] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>(Array(6).fill(false));
  const [retryCount, setRetryCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  // ── Templates ──
  const TEMPLATES: QuickTemplate[] = [
    { category: 'search', tag: 'SEARCH', icon: '🚫', title: L('Pausar KWs sin conv.', 'Pause Non-Conv KWs'), brief: L('Pausar palabras clave con costo >$30 y cero conversiones en 30 días.', 'Pause keywords with cost >$30 and zero conversions in 30 days.'), config: { excludeBrandCampaigns: true, executionMode: 'preview', excludeConvertedKeywords: true, cpcThreshold: 3.5, budgetThreshold: 30 } },
    { category: 'search', tag: 'SEARCH', icon: '💸', title: L('Alerta consumo presup.', 'Budget Alert'), brief: L('Alerta inmediata si campaña consume >90% de presupuesto antes de 16:00.', 'Alert if campaign consumes >90% of budget before 4PM.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 90 } },
    { category: 'search', tag: 'SEARCH', icon: '📈', title: L('Ofertas inteligentes CTR', 'Smart Bids by CTR'), brief: L('Incrementar 15% la oferta CPC en keywords con CTR >5% y bajo CPA.', 'Increase CPC bid 15% for keywords CTR >5% and low CPA.'), config: { excludeBrandCampaigns: true, executionMode: 'live', excludeConvertedKeywords: true, cpcThreshold: 6.0, budgetThreshold: 15 } },
    { category: 'search', tag: 'SEARCH', icon: '🔁', title: L('KWs duplicadas', 'Duplicate KWs'), brief: L('Identificar y agrupar keywords duplicadas para consolidar presupuesto.', 'Find and group duplicate keywords to consolidate budget.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 50 } },
    { category: 'search', tag: 'SEARCH', icon: '⭐', title: L('Quality Score análisis', 'Quality Score'), brief: L('Reporte de keywords con QS <5, recomendaciones de mejora.', 'Report keywords with QS <5, recommend improvements.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 100 } },
    { category: 'search', tag: 'SEARCH', icon: '🏷️', title: L('Monitor keywords marca', 'Brand KW Monitor'), brief: L('Monitorear keywords de marca, alertar si CPC supera $2.', 'Monitor brand keywords, alert if CPC >$2.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 2.0, budgetThreshold: 10 } },
    { category: 'display', tag: 'DISPLAY', icon: '⛔', title: L('Pausar placements', 'Pause Placements'), brief: L('Pausar placements en Display con CPC >$3 sin conversiones.', 'Pause Display placements with CPC >$3 without conversions.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 3.0, budgetThreshold: 50 } },
    { category: 'display', tag: 'DISPLAY', icon: '🔒', title: L('Exclusiones contexto', 'Context Exclusions'), brief: L('Lista de keywords negativas en Display para contenido no relevante.', 'Negative keywords for Display to avoid irrelevant content.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 4.0, budgetThreshold: 100 } },
    { category: 'display', tag: 'DISPLAY', icon: '👥', title: L('Auditar audiencias', 'Audience Audit'), brief: L('Reporte de audiencias de bajo rendimiento en Display.', 'Report of low-performing audiences on Display.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 75 } },
    { category: 'shopping', tag: 'SHOP', icon: '📦', title: L('Pausar productos s/conv.', 'Pause No-Conv Products'), brief: L('Pausar productos que gastaron >$50 sin conversiones en 30 días.', 'Pause products that spent >$50 with zero conversions.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 50 } },
    { category: 'shopping', tag: 'SHOP', icon: '📊', title: L('Ofertas por margen', 'Bids by Margin'), brief: L('Ajustar pujas según margen: alto margen = puja agresiva.', 'Adjust bids by margin: high margin = aggressive bidding.'), config: { excludeBrandCampaigns: false, executionMode: 'live', excludeConvertedKeywords: false, cpcThreshold: 6.0, budgetThreshold: 50 } },
    { category: 'shopping', tag: 'SHOP', icon: '🚨', title: L('Inventario agotado', 'Out-of-Stock'), brief: L('Pausar anuncios de productos agotados automáticamente.', 'Auto-pause ads for out-of-stock products.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 100 } },
    { category: 'video', tag: 'VIDEO', icon: '⏸️', title: L('Pausar vids bajo eng.', 'Pause Low-Eng Videos'), brief: L('Pausar videos con view rate <30% en YouTube.', 'Pause video ads with view rate <30% on YouTube.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 100 } },
    { category: 'video', tag: 'VIDEO', icon: '⏱️', title: L('Duración óptima', 'Video Length Opt.'), brief: L('Analizar rendimiento por duración (15s/30s/60s), escalar mejor CPV.', 'Analyze performance by duration, scale best CPV format.'), config: { excludeBrandCampaigns: false, executionMode: 'live', excludeConvertedKeywords: false, cpcThreshold: 4.0, budgetThreshold: 75 } },
    { category: 'pmax', tag: 'PMAX', icon: '🖼️', title: L('Auditar activos PMax', 'PMax Asset Audit'), brief: L('Evaluar imágenes, videos y textos en Performance Max.', 'Evaluate images, videos and texts in Performance Max.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 100 } },
    { category: 'pmax', tag: 'PMAX', icon: '⚙️', title: L('Puja PMax optimizada', 'PMax Bid Strategy'), brief: L('Comparar Target CPA vs Maximize Conversions según ROAS.', 'Compare Target CPA vs Maximize Conversions by ROAS.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 100 } },
    { category: 'budget', tag: 'BUDGET', icon: '⚖️', title: L('Distribuir por ROAS', 'Budget by ROAS'), brief: L('Redistribuir presupuesto diario hacia canales con mejor ROAS.', 'Redistribute daily budget to top-ROAS channels.'), config: { excludeBrandCampaigns: false, executionMode: 'live', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 100 } },
    { category: 'budget', tag: 'BUDGET', icon: '🎯', title: L('Control CPA máximo', 'CPA Ceiling'), brief: L('Pausar si CPA promedio supera 2x del objetivo.', 'Pause if avg CPA exceeds 2x the target.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 100 } },
    { category: 'budget', tag: 'BUDGET', icon: '🎪', title: L('Flash sale bidding', 'Flash Sale Bids'), brief: L('Aumentar ofertas 50% en promoción flash, revertir al finalizar.', 'Increase bids 50% during flash sale, auto-revert after.'), config: { excludeBrandCampaigns: false, executionMode: 'live', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 50 } },
    { category: 'audit', tag: 'AUDIT', icon: '🔍', title: L('Auditar conversiones', 'Conversion Audit'), brief: L('Reporte de campañas sin conversiones, verificar pixels.', 'Report campaigns with no conversions, verify pixel setup.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 100 } },
    { category: 'audit', tag: 'AUDIT', icon: '🗑️', title: L('Limpiar campañas', 'Archive Old Campaigns'), brief: L('Pausar campañas inactivas >90 días. Genera reporte antes.', 'Pause campaigns inactive >90 days. Generate report first.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 100 } },
    { category: 'audit', tag: 'AUDIT', icon: '📎', title: L('Auditar extensiones', 'Extensions Audit'), brief: L('Verificar que todas las campañas tengan extensiones activas.', 'Verify all campaigns have active extensions.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 100 } },
    { category: 'audit', tag: 'AUDIT', icon: '🚩', title: L('Fraude de clics', 'Click Fraud'), brief: L('Detectar clics sospechosos, generar lista de exclusiones IP.', 'Detect suspicious click patterns, generate IP exclusion list.'), config: { excludeBrandCampaigns: false, executionMode: 'preview', excludeConvertedKeywords: false, cpcThreshold: 5.0, budgetThreshold: 100 } },
  ];

  const filtered = activeCategory === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category === activeCategory);

  const LOADING_MSGS = language === 'es'
    ? ['Interpretando datos de campaña...', 'Analizando conversiones...', 'Evaluando riesgos de presupuesto...', 'Generando flujo de decisiones...', 'Escribiendo código AdsApp...', 'Validando sintaxis...']
    : ['Interpreting campaign data...', 'Analyzing conversions...', 'Evaluating budget risks...', 'Building decision flow...', 'Writing AdsApp code...', 'Validating syntax...'];

  const INSTALL_STEPS = language === 'es'
    ? ['Acceder al panel de Google Ads', '"Herramientas" → "Scripts" → "+"', 'Asignar nombre al script', 'Pegar el código generado', 'Clic en "Autorizar"', 'Ejecutar en Vista Previa → Programar']
    : ['Open Google Ads dashboard', '"Tools" → "Scripts" → "+"', 'Name the script', 'Paste generated code', 'Click "Authorize"', 'Run Preview → Schedule'];

  // ── Effects ──
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setLoadingStep(0);
      timer = setInterval(() => setLoadingStep(p => p < LOADING_MSGS.length - 1 ? p + 1 : p), 2500);
    }
    return () => clearInterval(timer);
  }, [isLoading]); // eslint-disable-line

  useEffect(() => {
    if (generatedScript && resultsRef.current && window.innerWidth < 1024) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
  }, [generatedScript]);

  // ── Handlers ──
  const applyTemplate = (tpl: QuickTemplate, idx: number) => {
    setBrief(tpl.brief);
    setSelectedTplIdx(idx);
    setExcludeBrand(tpl.config.excludeBrandCampaigns);
    setExecMode(tpl.config.executionMode);
    setExcludeConverted(tpl.config.excludeConvertedKeywords);
    setCpcThreshold(tpl.config.cpcThreshold);
    setBudgetGuard(tpl.config.budgetThreshold);
    setWarning(getWarning(tpl.brief, language));
  };

  const handleGenerate = async () => {
    if (!brief.trim()) { setError(L('Escribe un brief o selecciona una plantilla.', 'Enter a brief or select a template.')); return; }
    setIsLoading(true); setError(''); setGeneratedScript(''); setDecisionReport(''); setSafetyAlerts('');
    setCheckedSteps(Array(6).fill(false)); setRetryCount(0);
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        setRetryCount(attempt);
        const res = await scriptGenerationService.generateAdsScript({
          brief, customerId: selectedAccount.id, realAccountData: performanceData.slice(0, 8),
          configuration: { excludeBrandCampaigns: excludeBrand, executionMode: execMode, excludeConvertedKeywords: excludeConverted, cpcThreshold, budgetThreshold: budgetGuard }
        });
        setGeneratedScript(res.script_content); setDecisionReport(res.decisionReport); setSafetyAlerts(res.safetyAlerts);
        setResultTab('report'); setRetryCount(0); setIsLoading(false); return;
      } catch (e: unknown) {
        lastErr = e as Error;
        const msg = (e as Error)?.message ?? '';
        if (attempt < 2 && (msg.includes('502') || msg.includes('503'))) { await new Promise(r => setTimeout(r, 2 ** attempt * 1000)); continue; }
        break;
      }
    }
    setIsLoading(false);
    setError(lastErr?.message || L('Error al generar. Intenta de nuevo.', 'Generation error. Please retry.'));
  };

  const handleCopy = () => { navigator.clipboard.writeText(generatedScript).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleDownload = () => {
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([generatedScript], { type: 'text/javascript' })), download: `insitu_${selectedAccount.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.js` });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  const toggleStep = (i: number) => { const n = [...checkedSteps]; n[i] = !n[i]; setCheckedSteps(n); };

  // ─── CSS VARS (app-like theme) ─────────────────────────────────────────────
  const appBg     = '#0e1117';  // window bg
  const panelBg   = '#111318';  // sidebar / panels
  const surfaceBg = '#161a21';  // input, editor bg
  const borderClr = '#1e2330';  // dividers
  const borderHi  = '#2a3040';  // focus / hover border
  const textPrim  = '#d4d8e2';  // primary text
  const textSec   = '#6b7280';  // secondary / labels
  const textDim   = '#3d4454';  // very dim
  const amber     = '#f59e0b';
  const amberDim  = '#78450a';
  const rose      = '#f43f5e';
  const sky       = '#38bdf8';
  const emerald   = '#10b981';

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative mt-4 overflow-hidden flex flex-col"
      style={{
        background: appBg,
        border: `1px solid ${borderClr}`,
        borderRadius: '6px',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        fontSize: '13px',
        color: textPrim,
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        userSelect: 'none',
      }}
    >
      {/* ══ TITLE BAR ══════════════════════════════════════════════════════════ */}
      <div style={{ background: panelBg, borderBottom: `1px solid ${borderClr}`, padding: '0 12px', height: '36px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Traffic lights */}
        <div style={{ display: 'flex', gap: '5px', marginRight: '6px' }}>
          {['#ff5f57','#febc2e','#28c840'].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.85 }} />
          ))}
        </div>
        {/* Window title */}
        <span style={{ color: textSec, fontSize: '12px', flex: 1, textAlign: 'center', pointerEvents: 'none' }}>
          INsitu AI — Script Builder · {selectedAccount.name}
        </span>
        {/* Mode badge */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {execMode === 'live' && (
            <span style={{ background: '#4a1520', color: rose, border: `1px solid ${rose}`, borderRadius: '3px', padding: '1px 6px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>
              ● LIVE
            </span>
          )}
          <span style={{ background: '#1a2418', color: emerald, border: `1px solid #1e3a2a`, borderRadius: '3px', padding: '1px 6px', fontSize: '10px' }}>
            ● {L('CONECTADO', 'CONNECTED')}
          </span>
        </div>
      </div>

      {/* ══ MENU BAR ═══════════════════════════════════════════════════════════ */}
      <div style={{ background: panelBg, borderBottom: `1px solid ${borderClr}`, display: 'flex', alignItems: 'center', gap: '0', height: '28px', flexShrink: 0 }}>
        {[
          { label: L('Archivo', 'File') },
          { label: L('Editar', 'Edit') },
          { label: L('Script', 'Script'), active: true },
          { label: L('Ver', 'View') },
          { label: L('Ayuda', 'Help') },
        ].map((item, i) => (
          <button key={i} style={{ padding: '0 12px', height: '28px', background: item.active ? surfaceBg : 'transparent', border: 'none', color: item.active ? textPrim : textSec, fontSize: '12px', cursor: 'pointer', borderRight: item.active ? `1px solid ${borderClr}` : 'none', borderLeft: item.active ? `1px solid ${borderClr}` : 'none' }}>
            {item.label}
          </button>
        ))}

        {/* Toolbar spacer */}
        <div style={{ flex: 1 }} />

        {/* Toolbar actions */}
        {[
          { label: L('▶ Generar', '▶ Generate'), action: handleGenerate, disabled: isLoading || !brief.trim(), accent: true },
          { label: '⎙ ' + L('Descargar', 'Download'), action: handleDownload, disabled: !generatedScript, accent: false },
          { label: (copied ? '✓ ' : '⧉ ') + L('Copiar', 'Copy'), action: handleCopy, disabled: !generatedScript, accent: false },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.action}
            disabled={btn.disabled}
            style={{
              height: '22px', margin: '3px 2px', padding: '0 10px',
              background: btn.accent ? (btn.disabled ? '#1f2330' : amber) : (btn.disabled ? 'transparent' : surfaceBg),
              color: btn.accent ? (btn.disabled ? textDim : '#000') : (btn.disabled ? textDim : textPrim),
              border: btn.accent ? 'none' : `1px solid ${btn.disabled ? 'transparent' : borderHi}`,
              borderRadius: '3px', fontSize: '11px', fontWeight: btn.accent ? 700 : 500,
              cursor: btn.disabled ? 'not-allowed' : 'pointer',
              transition: 'background 0.1s',
            }}
          >
            {btn.label}
          </button>
        ))}
        <div style={{ width: '6px' }} />
      </div>

      {/* ══ BODY: SIDEBAR + MAIN ════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width: sidebarCollapsed ? '30px' : '220px', minWidth: sidebarCollapsed ? '30px' : '220px', background: panelBg, borderRight: `1px solid ${borderClr}`, display: 'flex', flexDirection: 'column', transition: 'width 0.15s', overflow: 'hidden' }}>
          {/* Sidebar header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: sidebarCollapsed ? '6px 6px' : '6px 10px', borderBottom: `1px solid ${borderClr}`, height: '26px', flexShrink: 0 }}>
            {!sidebarCollapsed && <span style={{ fontSize: '10px', fontWeight: 700, color: textSec, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{L('Plantillas', 'Templates')}</span>}
            <button onClick={() => setSidebarCollapsed(v => !v)} style={{ background: 'none', border: 'none', color: textSec, cursor: 'pointer', fontSize: '12px', padding: '0 2px', lineHeight: 1 }}>
              {sidebarCollapsed ? '›' : '‹'}
            </button>
          </div>

          {!sidebarCollapsed && (
            <>
              {/* Category list */}
              <div style={{ flexShrink: 0, borderBottom: `1px solid ${borderClr}` }}>
                {(Object.keys(CAT_META) as TemplateCategory[]).map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setSelectedTplIdx(null); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px', width: '100%', padding: '4px 10px', textAlign: 'left',
                      background: activeCategory === cat ? surfaceBg : 'transparent',
                      borderLeft: activeCategory === cat ? `2px solid ${CAT_META[cat].color}` : '2px solid transparent',
                      border: 'none', borderBottom: 'none', color: activeCategory === cat ? textPrim : textSec,
                      fontSize: '12px', cursor: 'pointer', transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ color: CAT_META[cat].color, width: '14px', textAlign: 'center', fontSize: '11px' }}>{CAT_META[cat].icon}</span>
                    <span>{CAT_META[cat].label}</span>
                    <span style={{ marginLeft: 'auto', color: textDim, fontSize: '10px' }}>
                      {cat === 'all' ? TEMPLATES.length : TEMPLATES.filter(t => t.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Template file-tree list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filtered.map((tpl, idx) => {
                  const globalIdx = TEMPLATES.indexOf(tpl);
                  const isSelected = selectedTplIdx === globalIdx;
                  return (
                    <button
                      key={idx}
                      onClick={() => applyTemplate(tpl, globalIdx)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '6px', width: '100%', padding: '5px 10px',
                        background: isSelected ? '#1a2030' : 'transparent',
                        borderLeft: isSelected ? `2px solid ${amber}` : '2px solid transparent',
                        border: 'none', textAlign: 'left', color: isSelected ? textPrim : textSec,
                        fontSize: '12px', cursor: 'pointer', lineHeight: 1.4,
                      }}
                    >
                      <span style={{ fontSize: '11px', marginTop: '1px', flexShrink: 0 }}>{tpl.icon}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl.title}</span>
                      <span style={{ fontSize: '9px', background: '#1a2030', color: CAT_META[tpl.category].color, padding: '1px 4px', borderRadius: '2px', flexShrink: 0, alignSelf: 'center', fontWeight: 600 }}>
                        {tpl.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── MAIN PANEL ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Main tabs (editor tabs style) */}
          <div style={{ display: 'flex', background: panelBg, borderBottom: `1px solid ${borderClr}`, flexShrink: 0, overflowX: 'auto' }}>
            {['brief', 'config', 'output'].map((tab, i) => {
              const labels = language === 'es'
                ? ['📝 Brief / Input', '⚙️ Parámetros', '📊 Resultados']
                : ['📝 Brief / Input', '⚙️ Parameters', '📊 Results'];
              const isOutput = tab === 'output';
              const isActive = (tab === 'brief' && !generatedScript) || (tab === 'output' && !!generatedScript) || false;
              return null; // We render all sections stacked, no tab switching in desktop mode
            })}
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>

            {/* ─ SECTION: Brief ─ */}
            <div style={{ borderBottom: `1px solid ${borderClr}` }}>
              {/* Section header (collapsible) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: panelBg, borderBottom: `1px solid ${borderClr}`, cursor: 'default' }}>
                <span style={{ color: textDim, fontSize: '10px' }}>▼</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: textSec, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {L('Objetivo del Script', 'Script Objective')}
                </span>
                <span style={{ marginLeft: 'auto', color: textDim, fontSize: '10px' }}>
                  {brief.trim() ? `${brief.trim().split(/\s+/).length} ${L('palabras', 'words')}` : L('— vacío —', '— empty —')}
                </span>
              </div>

              <div style={{ padding: '10px 12px', userSelect: 'text' }}>
                <textarea
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  placeholder={L('Ej: Pausar keywords con costo >$30 y cero conversiones en 30 días...', 'E.g.: Pause keywords with cost >$30 and zero conversions in 30 days...')}
                  style={{
                    width: '100%', boxSizing: 'border-box', background: surfaceBg, border: `1px solid ${borderClr}`,
                    borderRadius: '3px', color: textPrim, padding: '8px 10px', fontSize: '13px',
                    fontFamily: 'inherit', lineHeight: '1.5', resize: 'vertical', outline: 'none',
                    minHeight: '90px',
                  }}
                  onFocus={e => (e.target.style.borderColor = borderHi)}
                  onBlur={e => (e.target.style.borderColor = borderClr)}
                />

                {/* Warning strip */}
                {warning && (
                  <div style={{ marginTop: '6px', background: '#1c1608', border: `1px solid ${amberDim}`, borderRadius: '3px', padding: '5px 10px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: amber, fontSize: '11px', flexShrink: 0, marginTop: '1px' }}>⚠</span>
                    <div>
                      <span style={{ color: '#d97706', fontSize: '11px' }}>{warning.text}</span>
                      <span style={{ color: textDim, fontSize: '10px', marginLeft: '8px' }}>[{L('Rev.', 'Rev.')} {warning.interval}]</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─ SECTION: Parameters ─ */}
            <div style={{ borderBottom: `1px solid ${borderClr}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: panelBg, borderBottom: `1px solid ${borderClr}` }}>
                <span style={{ color: textDim, fontSize: '10px' }}>▼</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: textSec, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {L('Parámetros de Ejecución', 'Execution Parameters')}
                </span>
              </div>
              <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px 16px' }}>
                {/* Checkboxes */}
                {[
                  { label: L('Excluir campañas de marca', 'Exclude brand campaigns'), value: excludeBrand, set: setExcludeBrand },
                  { label: L('Modo simulación (Preview)', 'Simulation mode (Preview)'), value: execMode === 'preview', set: (v: boolean) => setExecMode(v ? 'preview' : 'live') },
                  { label: L('Proteger keywords con conv.', 'Protect converting keywords'), value: excludeConverted, set: setExcludeConverted },
                ].map((item, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={item.value}
                      onChange={e => item.set(e.target.checked)}
                      style={{ accentColor: amber, width: '13px', height: '13px', cursor: 'pointer' }}
                    />
                    <span style={{ color: textPrim, fontSize: '12px' }}>{item.label}</span>
                    {i === 1 && !item.value && (
                      <span style={{ background: '#4a1520', color: rose, fontSize: '9px', padding: '1px 4px', borderRadius: '2px', fontWeight: 700 }}>LIVE</span>
                    )}
                  </label>
                ))}
                {/* Number inputs */}
                {[
                  { label: L('CPC Máx. ($)', 'Max CPC ($)'), value: cpcThreshold, set: setCpcThreshold, step: 0.5, min: 0 },
                  { label: L('Guard. Presup. (%)', 'Budget Guard (%)'), value: budgetGuard, set: setBudgetGuard, step: 5, min: 0 },
                ].map((field, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ color: textSec, fontSize: '12px', whiteSpace: 'nowrap' }}>{field.label}</span>
                    <input
                      type="number"
                      step={field.step}
                      min={field.min}
                      value={field.value}
                      onChange={e => field.set(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '72px', background: surfaceBg, border: `1px solid ${borderClr}`, borderRadius: '3px',
                        color: textPrim, padding: '2px 6px', fontSize: '12px', textAlign: 'right', outline: 'none',
                        fontStyle: '16px', // prevent iOS zoom
                      }}
                      onFocus={e => (e.target.style.borderColor = borderHi)}
                      onBlur={e => (e.target.style.borderColor = borderClr)}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* ─ SECTION: Error ─ */}
            {error && (
              <div style={{ margin: '8px 12px', background: '#1a0c10', border: `1px solid #5a1020`, borderRadius: '3px', padding: '6px 10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: rose, fontSize: '11px' }}>✕</span>
                <span style={{ color: '#fca5a5', fontSize: '12px', flex: 1 }}>{error}</span>
                <button onClick={handleGenerate} style={{ background: 'none', border: `1px solid #5a1020`, color: rose, fontSize: '11px', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer' }}>
                  {L('Reintentar', 'Retry')}
                </button>
              </div>
            )}

            {/* ─ SECTION: Loading ─ */}
            <AnimatePresence>
              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ margin: '0', padding: '12px', borderBottom: `1px solid ${borderClr}`, background: '#0e1117' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    {/* Spinner */}
                    <div style={{ width: '14px', height: '14px', border: '2px solid #1e2330', borderTopColor: amber, borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    <span style={{ color: amber, fontSize: '12px', fontFamily: 'monospace' }}>
                      {LOADING_MSGS[loadingStep]}
                    </span>
                    <span style={{ marginLeft: 'auto', color: textDim, fontSize: '11px', fontFamily: 'monospace' }}>
                      {loadingStep + 1}/{LOADING_MSGS.length}
                    </span>
                    {retryCount > 0 && (
                      <span style={{ color: textSec, fontSize: '10px' }}>↻ retry {retryCount}/3</span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: '2px', background: '#1e2330', borderRadius: '1px', overflow: 'hidden' }}>
                    <motion.div
                      animate={{ width: `${((loadingStep + 1) / LOADING_MSGS.length) * 100}%` }}
                      transition={{ duration: 0.4 }}
                      style={{ height: '100%', background: amber, borderRadius: '1px' }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─ SECTION: Results ─ */}
            <AnimatePresence>
              {generatedScript && (
                <motion.div ref={resultsRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>

                  {/* Results tab bar (file tabs) */}
                  <div style={{ display: 'flex', background: panelBg, borderBottom: `1px solid ${borderClr}`, overflowX: 'auto' }}>
                    {[
                      { id: 'report' as ResultTab,  icon: '📊', label: L('Análisis', 'Analysis'),   color: amber },
                      { id: 'alerts' as ResultTab,  icon: '⚠',  label: L('Alertas', 'Alerts'),      color: rose },
                      { id: 'script' as ResultTab,  icon: '{}', label: 'insitu_ads_script.js',       color: sky },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setResultTab(tab.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                          background: resultTab === tab.id ? surfaceBg : 'transparent',
                          borderBottom: resultTab === tab.id ? `2px solid ${tab.color}` : '2px solid transparent',
                          border: 'none', borderRight: `1px solid ${borderClr}`,
                          color: resultTab === tab.id ? textPrim : textSec,
                          fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                      >
                        <span style={{ color: tab.color, fontSize: '11px' }}>{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab panels */}
                  {resultTab === 'report' && (
                    <div style={{ padding: '12px', userSelect: 'text', color: textPrim, fontSize: '13px', lineHeight: '1.6' }}>
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(decisionReport.replace(/\n/g, '<br/>')) }} />
                    </div>
                  )}
                  {resultTab === 'alerts' && (
                    <div style={{ padding: '12px', userSelect: 'text' }}>
                      {safetyAlerts
                        ? <div style={{ color: '#fca5a5', fontSize: '13px', lineHeight: '1.6' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(safetyAlerts.replace(/\n/g, '<br/>')) }} />
                        : <span style={{ color: emerald, fontSize: '12px' }}>✓ {L('Sin advertencias críticas detectadas.', 'No critical warnings detected.')}</span>
                      }
                    </div>
                  )}
                  {resultTab === 'script' && (
                    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace", fontSize: '12px', lineHeight: '1.65', overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
                      {/* Gutter + code */}
                      <div style={{ display: 'flex' }}>
                        <div style={{ background: '#0a0d12', color: textDim, padding: '10px 8px', textAlign: 'right', userSelect: 'none', borderRight: `1px solid ${borderClr}`, minWidth: '38px', fontSize: '11px', lineHeight: '1.65' }}>
                          {generatedScript.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
                        </div>
                        <pre style={{ flex: 1, padding: '10px 14px', margin: 0, color: '#abb2bf', overflowX: 'auto', background: '#0a0d12' }}>
                          <code dangerouslySetInnerHTML={{ __html: highlightJS(generatedScript) }} style={{ userSelect: 'text' as any }} />
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Implementation checklist — compact list */}
                  <div style={{ borderTop: `1px solid ${borderClr}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: panelBg, borderBottom: `1px solid ${borderClr}` }}>
                      <span style={{ color: textDim, fontSize: '10px' }}>▼</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: textSec, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {L('Pasos de Implementación', 'Implementation Steps')}
                      </span>
                      <span style={{ marginLeft: 'auto', color: checkedSteps.every(Boolean) ? emerald : textDim, fontSize: '11px', fontFamily: 'monospace' }}>
                        {checkedSteps.filter(Boolean).length}/{INSTALL_STEPS.length}
                      </span>
                    </div>
                    <div style={{ padding: '4px 0' }}>
                      {INSTALL_STEPS.map((step, idx) => (
                        <div
                          key={idx}
                          onClick={() => toggleStep(idx)}
                          role="checkbox"
                          aria-checked={checkedSteps[idx]}
                          tabIndex={0}
                          onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && toggleStep(idx)}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 12px', cursor: 'pointer', userSelect: 'none' }}
                        >
                          <input type="checkbox" checked={checkedSteps[idx]} onChange={() => toggleStep(idx)} style={{ accentColor: amber, cursor: 'pointer', flexShrink: 0 }} />
                          <span style={{ color: textDim, fontSize: '10px', fontFamily: 'monospace', minWidth: '16px' }}>{String(idx + 1).padStart(2, '0')}</span>
                          <span style={{ fontSize: '12px', color: checkedSteps[idx] ? textDim : textPrim, textDecoration: checkedSteps[idx] ? 'line-through' : 'none' }}>{step}</span>
                        </div>
                      ))}
                    </div>
                    {checkedSteps.every(Boolean) && (
                      <div style={{ margin: '4px 12px 8px', padding: '5px 10px', background: '#0d1f14', border: `1px solid #1e4a2a`, borderRadius: '3px', color: emerald, fontSize: '12px' }}>
                        ✓ {L('Script implementado correctamente.', 'Script successfully implemented.')}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>{/* /scrollable content */}
        </div>{/* /main panel */}
      </div>{/* /body */}

      {/* ══ STATUS BAR ══════════════════════════════════════════════════════════ */}
      <div style={{
        background: execMode === 'live' ? '#4a1520' : '#0f1a14',
        borderTop: `1px solid ${execMode === 'live' ? '#5a1520' : '#1a2e20'}`,
        display: 'flex', alignItems: 'center', gap: '12px', padding: '0 10px', height: '22px', flexShrink: 0,
        fontSize: '11px', color: execMode === 'live' ? '#fca5a5' : '#6ee7b7',
      }}>
        <span>{execMode === 'live' ? `⚠ LIVE MODE — ${L('cambios reales activos', 'real changes active')}` : `✓ PREVIEW — ${L('simulación segura', 'safe simulation')}`}</span>
        <div style={{ flex: 1 }} />
        {generatedScript && (
          <span style={{ color: textDim }}>
            {generatedScript.split('\n').length} {L('líneas', 'lines')} · {(generatedScript.length / 1024).toFixed(1)} KB
          </span>
        )}
        <span style={{ color: textDim }}>
          {L('CPC', 'CPC')}: ${cpcThreshold} · {L('Guard', 'Guard')}: {budgetGuard}%
        </span>
        <span style={{ color: textDim }}>
          {selectedAccount.name}
        </span>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
