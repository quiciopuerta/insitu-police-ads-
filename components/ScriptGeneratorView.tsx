import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ScriptGenerator } from './ScriptGenerator';
import { useAuth } from '../hooks/useAuth';
import { Language, AdsAccount, CampaignPerformance } from '../types';

interface ScriptGeneratorViewProps {
  language: Language;
}

interface ManualCampaignData {
  name: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr?: number;
  cpc?: number;
  cpa?: number;
}

const ScriptGeneratorView: React.FC<ScriptGeneratorViewProps> = ({ language }) => {
  const { currentUser } = useAuth(language);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated gradient background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let raf: number;
    const draw = () => {
      const w = canvas.width = canvas.offsetWidth;
      const h = canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      const t = frame * 0.004;
      // Blob 1 — magenta
      const g1 = ctx.createRadialGradient(w * (0.15 + Math.sin(t) * 0.1), h * 0.3, 0, w * 0.2, h * 0.3, w * 0.4);
      g1.addColorStop(0, 'rgba(255,71,123,0.1)');
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      // Blob 2 — cyan
      const g2 = ctx.createRadialGradient(w * (0.75 + Math.cos(t * 0.7) * 0.12), h * 0.6, 0, w * 0.75, h * 0.6, w * 0.35);
      g2.addColorStop(0, 'rgba(0,242,254,0.08)');
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
      frame++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  const [mode, setMode] = useState<'select' | 'manual' | 'linked' | 'upload'>('select');
  const [selectedAccount, setSelectedAccount] = useState<AdsAccount | null>(null);
  const [manualAccount, setManualAccount] = useState({
    name: '',
    id: '',
  });
  const [performanceData, setPerformanceData] = useState<CampaignPerformance[]>([]);
  const [csvData, setCsvData] = useState('');
  const [dataInput, setDataInput] = useState('');
  const [manualCampaigns, setManualCampaigns] = useState<ManualCampaignData[]>([
    { name: 'Campaña 1', impressions: 0, clicks: 0, conversions: 0, cost: 0 }
  ]);

  const parseDataString = (data: string) => {
    const lines = data.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    // Detect delimiter (comma, tab, semicolon)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';

    const header = firstLine.toLowerCase().split(delimiter).map(h => h.trim());

    // Find column indices
    const dateIdx = header.findIndex(h => h.includes('date') || h.includes('fecha') || h.includes('día') || h.includes('day'));
    const campaignIdx = header.findIndex(h => h.includes('campaign') || h.includes('campaña') || h.includes('ad group') || h.includes('grupo'));
    const impressionsIdx = header.findIndex(h => h.includes('impression') || h.includes('impr') || h.includes('impresion'));
    const clicksIdx = header.findIndex(h => h.includes('click'));
    const conversionsIdx = header.findIndex(h => h.includes('conversion') || h.includes('conv') || h.includes('conversión'));
    const costIdx = header.findIndex(h => h.includes('cost') || h.includes('spend') || h.includes('budget') || h.includes('gasto'));

    const campaignMap = new Map<string, ManualCampaignData>();

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter).map(v => v.trim());
      if (values.length < 4) continue;

      const campaignName = campaignIdx >= 0 ? values[campaignIdx] : values[0] || `Campaign ${i}`;
      const impressions = impressionsIdx >= 0 ? parseInt(values[impressionsIdx]) : parseInt(values[1]) || 0;
      const clicks = clicksIdx >= 0 ? parseInt(values[clicksIdx]) : parseInt(values[2]) || 0;
      const conversions = conversionsIdx >= 0 ? parseInt(values[conversionsIdx]) : parseInt(values[3]) || 0;
      const cost = costIdx >= 0 ? parseFloat(values[costIdx]) : parseFloat(values[4]) || 0;

      if (campaignMap.has(campaignName)) {
        const existing = campaignMap.get(campaignName)!;
        existing.impressions += impressions;
        existing.clicks += clicks;
        existing.conversions += conversions;
        existing.cost += cost;
      } else {
        campaignMap.set(campaignName, {
          name: campaignName,
          impressions,
          clicks,
          conversions,
          cost,
        });
      }
    }

    return Array.from(campaignMap.values());
  };

  if (!currentUser) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[50vh] text-center"
      >
        <div className="text-slate-400">
          {language === 'es'
            ? 'Inicia sesión para acceder al generador de scripts'
            : 'Log in to access the script generator'
          }
        </div>
      </motion.div>
    );
  }

  const handleManualSubmit = () => {
    if (!manualAccount.name.trim() || !manualAccount.id.trim()) {
      return;
    }
    // Convert manual campaign data to performance data format
    const performance = manualCampaigns.map((campaign) => ({
      campaignName: campaign.name,
      campaignId: campaign.name.toLowerCase().replace(/\s+/g, '_'),
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      cost: campaign.cost,
      ctr: campaign.ctr || (campaign.clicks / campaign.impressions) * 100,
      cpc: campaign.cpc || campaign.cost / campaign.clicks,
      cpa: campaign.cpa || campaign.cost / campaign.conversions,
    }));
    setPerformanceData(performance);
    setSelectedAccount({
      name: manualAccount.name,
      id: manualAccount.id,
      resourceName: `customers/${manualAccount.id}`,
      status: 'active',
    });
    setMode('manual');
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvData(content);
      const campaigns = parseDataString(content);
      setManualCampaigns(campaigns);
    };
    reader.readAsText(file);
  };

  const handleDataPaste = (value: string) => {
    setDataInput(value);
    if (value.trim()) {
      const campaigns = parseDataString(value);
      setManualCampaigns(campaigns);
    }
  };

  return (
    <div className="relative w-full flex flex-col gap-8 pb-12">
      {/* Animated canvas background */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />

      <div className="relative z-10 flex flex-col gap-8">
        {/* Header */}
        <header className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-cyan shadow-[0_0_6px_rgba(0,242,254,0.9)] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {language === 'es' ? 'Motor de Scripts Activo' : 'Script Engine Active'}
              </span>
            </div>
            <h1 className="font-headline text-3xl font-black text-white tracking-tight">
              {language === 'es' ? 'Generador de Scripts' : 'Script Generator'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {language === 'es'
                ? 'Crea scripts automáticos para Google Ads sin necesidad de vincular tu cuenta.'
                : 'Create automated scripts for Google Ads without linking your account.'
              }
            </p>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full space-y-8"
        >

      {/* Mode Selection */}
      {mode === 'select' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* Manual Entry Card */}
          <button
            onClick={() => setMode('manual')}
            className="glass-card flex flex-col gap-4 rounded-3xl p-8 transition-all hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] hover:border-amber-500/30 group text-left"
          >
            <div className="text-4xl transition-transform group-hover:scale-110">✍️</div>
            <div>
              <h3 className="text-xl font-black text-white mb-2">
                {language === 'es' ? 'Entrada Manual' : 'Manual Entry'}
              </h3>
              <p className="text-slate-400 text-sm">
                {language === 'es'
                  ? 'Ingresa KPIs manualmente con datos de tus campañas'
                  : 'Enter KPIs manually with your campaign data'
                }
              </p>
            </div>
            <div className="mt-auto pt-4 text-[10px] font-black uppercase tracking-widest text-amber-500">
              {language === 'es' ? 'Rápido' : 'Quick'}
            </div>
          </button>

          {/* CSV Upload Card */}
          <button
            onClick={() => setMode('upload')}
            className="glass-card flex flex-col gap-4 rounded-3xl p-8 transition-all hover:shadow-[0_0_30px_rgba(0,242,254,0.15)] hover:border-cyan/30 group text-left"
          >
            <div className="text-4xl transition-transform group-hover:scale-110">📊</div>
            <div>
              <h3 className="text-xl font-black text-white mb-2">
                {language === 'es' ? 'Subir CSV' : 'Upload CSV'}
              </h3>
              <p className="text-slate-400 text-sm">
                {language === 'es'
                  ? 'Sube un archivo CSV con datos de tus campañas'
                  : 'Upload a CSV file with campaign data'
                }
              </p>
            </div>
            <div className="mt-auto pt-4 text-[10px] font-black uppercase tracking-widest text-cyan">
              {language === 'es' ? 'Recomendado' : 'Recommended'}
            </div>
          </button>

          {/* Linked Account Card (if available) */}
          {currentUser?.linkedGoogleAds?.accessToken && (
            <button
              onClick={() => setMode('linked')}
              className="glass-card flex flex-col gap-4 rounded-3xl p-8 transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/30 group text-left"
            >
              <div className="text-4xl transition-transform group-hover:scale-110">🔗</div>
              <div>
                <h3 className="text-xl font-black text-white mb-2">
                  {language === 'es' ? 'Cuenta Vinculada' : 'Linked Account'}
                </h3>
                <p className="text-slate-400 text-sm mb-1">
                  {currentUser.linkedGoogleAds.email}
                </p>
                <p className="text-slate-500 text-xs">
                  {language === 'es'
                    ? 'Carga datos automáticamente'
                    : 'Auto-loads campaign data'
                  }
                </p>
              </div>
            </button>
          )}
        </motion.div>
      )}

      {/* CSV Upload Form */}
      {mode === 'upload' && !selectedAccount && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-8 max-w-4xl mx-auto space-y-8"
        >
          <button
            onClick={() => setMode('select')}
            className="text-xs text-slate-400 hover:text-slate-300 mb-6 flex items-center gap-2"
          >
            ← {language === 'es' ? 'Atrás' : 'Back'}
          </button>

          <h3 className="text-2xl font-black text-white">
            {language === 'es' ? 'Sube tus Datos de Campaña' : 'Upload Your Campaign Data'}
          </h3>

          {/* Data Input Options */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <label className="block text-sm font-bold text-slate-300 flex-1">
                {language === 'es' ? 'Opción 1: Sube Archivo' : 'Option 1: Upload File'}
              </label>
              <span className="text-xs text-slate-500 py-1">
                {language === 'es' ? '(CSV o Excel guardado como CSV)' : '(CSV or Excel saved as CSV)'}
              </span>
            </div>
            <div className="border-2 border-dashed border-blue-500/30 rounded-2xl p-6 text-center hover:border-blue-500/50 transition-all">
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleCSVUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer block">
                <div className="text-3xl mb-2">📥</div>
                <p className="text-slate-300 font-bold text-sm mb-1">
                  {language === 'es' ? 'Clic para subir o arrastra un archivo' : 'Click to upload or drag file'}
                </p>
                <p className="text-slate-500 text-xs">
                  {language === 'es'
                    ? 'CSV, XLS o XLSX - se consolidan automáticamente'
                    : 'CSV, XLS or XLSX - auto-consolidates'
                  }
                </p>
              </label>
            </div>

            {/* Paste Data Option */}
            <div className="border-t border-white/5 pt-6">
              <label className="block text-sm font-bold text-slate-300 mb-3">
                {language === 'es' ? 'Opción 2: Pega tus Datos' : 'Option 2: Paste Data'}
              </label>
              <textarea
                value={dataInput}
                onChange={(e) => handleDataPaste(e.target.value)}
                placeholder={language === 'es'
                  ? 'Pega datos aquí (CSV, TSV, Excel, Google Sheets)...\n\nEjemplo:\nCampaign,Impressions,Clicks,Conversions,Cost\nSEO,10000,500,50,2500\nDisplay,5000,100,5,1000'
                  : 'Paste data here (CSV, TSV, Excel, Google Sheets)...\n\nExample:\nCampaign,Impressions,Clicks,Conversions,Cost\nSEO,10000,500,50,2500\nDisplay,5000,100,5,1000'
                }
                className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all font-mono text-xs h-32 resize-none"
              />
              <p className="text-xs text-slate-500 mt-2">
                {language === 'es'
                  ? '✓ Detecta automáticamente: CSV, TSV (tabs), punto y coma'
                  : '✓ Auto-detects: CSV, TSV (tabs), semicolons'
                }
              </p>
            </div>

            {/* Format Examples */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* Daily Format */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-300 mb-2">
                  {language === 'es' ? '📅 Formato Diario (Recomendado)' : '📅 Daily Format (Recommended)'}
                </p>
                <pre className="text-[10px] text-slate-400 overflow-x-auto">
{`Date,Campaign,Imp,Clicks,Conv,Cost
2024-01-15,SEO,1000,50,5,250
2024-01-15,Display,500,20,1,100
2024-01-16,SEO,1100,55,6,275
2024-01-16,Display,480,18,0,96`}
                </pre>
              </div>

              {/* Aggregated Format */}
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4">
                <p className="text-xs font-bold text-slate-300 mb-2">
                  {language === 'es' ? '📊 Formato Agregado' : '📊 Aggregated Format'}
                </p>
                <pre className="text-[10px] text-slate-400 overflow-x-auto">
{`Campaign,Impressions,Clicks,Conversions,Cost
SEO Campaign,150000,7500,750,37500
Display Campaign,80000,1600,40,8000
Shopping,50000,2500,500,25000`}
                </pre>
              </div>
            </div>

            {/* Accepted Columns */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 mt-4">
              <p className="text-xs font-bold text-slate-300 mb-2">
                {language === 'es' ? '✅ Columnas Aceptadas' : '✅ Accepted Columns'}
              </p>
              <div className="text-xs text-slate-400 space-y-1">
                <p>• <span className="text-slate-300">Date/Fecha/Día</span> (opcional)</p>
                <p>• <span className="text-slate-300">Campaign/Campaña/Ad Group</span></p>
                <p>• <span className="text-slate-300">Impressions/Impr/Impresiones</span></p>
                <p>• <span className="text-slate-300">Clicks</span></p>
                <p>• <span className="text-slate-300">Conversions/Conv/Conversiones</span></p>
                <p>• <span className="text-slate-300">Cost/Spend/Budget/Gasto</span></p>
              </div>
            </div>

            {/* How to Export from Excel */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 mt-4">
              <p className="text-xs font-bold text-slate-300 mb-2">
                {language === 'es' ? '📊 Cómo Exportar desde Excel' : '📊 How to Export from Excel'}
              </p>
              <div className="text-xs text-slate-400 space-y-2">
                <p><span className="text-slate-300">Excel/XLS:</span> Archivo → Guardar como → CSV (UTF-8)</p>
                <p><span className="text-slate-300">Google Sheets:</span> Archivo → Descargar → CSV</p>
                <p><span className="text-slate-300">Copiar/Pegar:</span> Selecciona tabla → Copia → Pega aquí</p>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="border-t border-white/5 pt-8">
            <h4 className="text-lg font-bold text-white mb-4">
              {language === 'es' ? 'Detalles de la Cuenta' : 'Account Details'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  {language === 'es' ? 'Nombre de Cuenta' : 'Account Name'}
                </label>
                <input
                  type="text"
                  value={manualAccount.name}
                  onChange={(e) => setManualAccount({ ...manualAccount, name: e.target.value })}
                  placeholder="Mi Tienda"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  {language === 'es' ? 'ID de Cuenta' : 'Account ID'}
                </label>
                <input
                  type="text"
                  value={manualAccount.id}
                  onChange={(e) => setManualAccount({ ...manualAccount, id: e.target.value })}
                  placeholder="123-456-7890"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Campaigns Preview */}
          {manualCampaigns.length > 0 && (
            <div className="border-t border-white/5 pt-8">
              <h4 className="text-lg font-bold text-white mb-4">
                {language === 'es' ? 'Campañas Detectadas' : 'Detected Campaigns'} ({manualCampaigns.length})
              </h4>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {manualCampaigns.map((campaign, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-white/5 rounded-2xl p-3 text-sm">
                    <div className="font-bold text-white">{campaign.name}</div>
                    <div className="text-slate-400 text-xs mt-1">
                      {campaign.impressions.toLocaleString()} impresiones • {campaign.clicks} clicks • {campaign.conversions} conversiones • ${campaign.cost.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button
              onClick={() => setMode('select')}
              className="flex-1 px-6 py-3 bg-slate-800/60 hover:bg-slate-800/80 border border-white/10 rounded-2xl text-white font-black text-xs uppercase tracking-widest transition-all"
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleManualSubmit}
              disabled={!manualAccount.name.trim() || !manualAccount.id.trim() || manualCampaigns.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-[0_10px_35px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest transition-all rounded-2xl"
            >
              {language === 'es' ? 'Continuar' : 'Continue'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Manual Entry Form */}
      {mode === 'manual' && !selectedAccount && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-8 max-w-2xl mx-auto"
        >
          <button
            onClick={() => setMode('select')}
            className="text-xs text-slate-400 hover:text-slate-300 mb-6 flex items-center gap-2"
          >
            ← {language === 'es' ? 'Atrás' : 'Back'}
          </button>

          <h3 className="text-2xl font-black text-white mb-6">
            {language === 'es' ? 'Ingresa los Datos de tu Cuenta' : 'Enter Your Account Details'}
          </h3>

          <div className="space-y-6">
            {/* Account Name */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                {language === 'es' ? 'Nombre de la Cuenta' : 'Account Name'}
              </label>
              <input
                type="text"
                value={manualAccount.name}
                onChange={(e) => setManualAccount({ ...manualAccount, name: e.target.value })}
                placeholder={language === 'es' ? 'Ej: Mi Tienda Online' : 'E.g., My Online Store'}
                className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
              />
            </div>

            {/* Account ID */}
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                {language === 'es' ? 'ID de la Cuenta (Customer ID)' : 'Account ID (Customer ID)'}
              </label>
              <input
                type="text"
                value={manualAccount.id}
                onChange={(e) => setManualAccount({ ...manualAccount, id: e.target.value })}
                placeholder={language === 'es' ? 'Ej: 123-456-7890' : 'E.g., 123-456-7890'}
                className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-all"
              />
              <p className="text-xs text-slate-500 mt-2">
                {language === 'es'
                  ? 'Encuentra esto en Google Ads: Herramientas > Configuración > Información de la cuenta'
                  : 'Find this in Google Ads: Tools > Settings > Account Info'
                }
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setMode('select')}
                className="flex-1 px-6 py-3 bg-slate-800/60 hover:bg-slate-800/80 border border-white/10 rounded-2xl text-white font-black text-xs uppercase tracking-widest transition-all"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={!manualAccount.name.trim() || !manualAccount.id.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-[0_10px_35px_rgba(245,158,11,0.3)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest transition-all rounded-2xl"
              >
                {language === 'es' ? 'Continuar' : 'Continue'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Script Generator Component */}
      {selectedAccount && (
        <ScriptGenerator
          language={language}
          selectedAccount={selectedAccount}
          performanceData={performanceData}
        />
      )}
    </motion.div>
      </div>
    </div>
  );
};

export default ScriptGeneratorView;
