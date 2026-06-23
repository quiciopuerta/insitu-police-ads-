import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, List, CheckCircle2, Play, AlertTriangle, Coins, Eye, X, ChevronRight } from 'lucide-react';
import type { Language, MassAdConfig } from '../types';

interface ProductCatalogUploaderProps {
  language: Language;
  onRunBatch: (configs: Partial<MassAdConfig>[]) => void;
  onClose: () => void;
}

const TOKENS_PER_PRODUCT = 85; // Approximate token cost per product batch generation

export default function ProductCatalogUploader({ language, onRunBatch, onClose }: ProductCatalogUploaderProps) {
  const es = language === 'es';
  const [csvContent, setCsvContent] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mapping, setMapping] = useState({
    productName: '',
    keywords: '',
    url: '',
    image: '',
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvContent(text);
      
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      if (lines.length > 0) {
        const head = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        setHeaders(head);
        
        const rows = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: Record<string, string> = {};
          head.forEach((h, i) => { row[h] = vals[i] || ''; });
          return row;
        }).filter(row => Object.values(row).some(v => v.trim() !== ''));
        setParsedRows(rows);

        // Auto-map if possible
        const smartMap = { ...mapping };
        head.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('name') || lower.includes('producto') || lower.includes('title')) smartMap.productName = h;
          if (lower.includes('keyword') || lower.includes('tag') || lower.includes('search')) smartMap.keywords = h;
          if (lower.includes('url') || lower.includes('link') || lower.includes('href')) smartMap.url = h;
          if (lower.includes('image') || lower.includes('imagen') || lower.includes('photo')) smartMap.image = h;
        });
        setMapping(smartMap);
        setPreviewOpen(true);
      }
    };
    reader.readAsText(file);
  };

  const handleRun = () => {
    if (!mapping.keywords) {
      alert(es ? 'Debes mapear la columna Keywords' : 'You must map the Keywords column');
      return;
    }
    
    const configs: Partial<MassAdConfig>[] = parsedRows.map(row => ({
      brief: {
        keywords: `${row[mapping.productName] || ''} ${row[mapping.keywords] || ''}`.trim(),
        url: row[mapping.url] || '',
        audience: '',
        objective: 'sales',
        copyFramework: 'auto',
        optimizationLevel: 'standard',
        brandContext: {} as any
      } as any
    }));
    
    onRunBatch(configs);
  };

  const estimatedTokens = parsedRows.length * TOKENS_PER_PRODUCT;
  const mappingComplete = !!mapping.keywords;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
              <List className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                {es ? 'Catálogo de Productos' : 'Product Catalog'}
              </h2>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                {es ? 'Generación Masiva por CSV' : 'CSV Batch Generation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {parsedRows.length === 0 ? (
          /* UPLOAD ZONE */
          <div className="border-2 border-dashed border-white/10 rounded-3xl p-12 flex flex-col items-center justify-center text-center hover:border-emerald-500/30 transition-colors group">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-emerald-500/15 transition-colors">
              <UploadCloud className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-base font-black text-white mb-2">
              {es ? 'Sube tu CSV de productos' : 'Upload your products CSV'}
            </p>
            <p className="text-xs text-slate-500 font-medium mb-2 max-w-md">
              {es
                ? 'Genera cientos de anuncios iterando por cada producto. Compatible con Shopify, WooCommerce o cualquier CSV genérico.'
                : 'Generate hundreds of ads by iterating over each product. Compatible with Shopify, WooCommerce, or any generic CSV.'}
            </p>
            <p className="text-[10px] text-slate-600 font-medium mb-6">
              {es
                ? 'Columnas recomendadas: product_name, keywords, url, image_url'
                : 'Recommended columns: product_name, keywords, url, image_url'}
            </p>
            <label className="bg-emerald-500 text-slate-950 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest cursor-pointer hover:bg-emerald-400 transition-colors flex items-center gap-2">
              <UploadCloud className="w-4 h-4" />
              {es ? 'Seleccionar Archivo' : 'Select File'}
              <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-black text-emerald-400">
                    {parsedRows.length} {es ? 'productos detectados' : 'products detected'}
                  </p>
                  <p className="text-[10px] text-emerald-400/60 font-medium">
                    {headers.length} {es ? 'columnas encontradas' : 'columns found'}: {headers.slice(0, 4).join(', ')}{headers.length > 4 ? '...' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewOpen(p => !p)}
                className="flex items-center gap-1.5 text-[11px] font-black text-emerald-400 hover:text-white transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                {previewOpen ? (es ? 'Ocultar' : 'Hide') : (es ? 'Vista previa' : 'Preview')}
              </button>
            </div>

            {/* Data Preview Table */}
            <AnimatePresence>
              {previewOpen && parsedRows.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="bg-slate-950/70 border border-white/5 rounded-2xl overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-white/5">
                          {headers.slice(0, 5).map(h => (
                            <th key={h} className="px-4 py-3 text-left font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                          {headers.length > 5 && <th className="px-4 py-3 text-slate-600">+{headers.length - 5}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                            {headers.slice(0, 5).map(h => (
                              <td key={h} className="px-4 py-2.5 text-slate-400 font-medium max-w-[150px] truncate">
                                {row[h] || '—'}
                              </td>
                            ))}
                            {headers.length > 5 && <td />}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedRows.length > 5 && (
                      <div className="px-4 py-2 text-center text-[10px] text-slate-600 font-bold border-t border-white/5">
                        + {parsedRows.length - 5} {es ? 'productos más' : 'more products'}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Column Mapping */}
            <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-6 space-y-4">
              <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5" />
                {es ? 'Mapeo de Columnas' : 'Column Mapping'}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5">
                    {es ? 'Nombre del Producto' : 'Product Name'}
                  </label>
                  <select
                    value={mapping.productName}
                    onChange={e => setMapping(p => ({ ...p, productName: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-white/30 outline-none"
                  >
                    <option value="">-- {es ? 'Ignorar' : 'Skip'} --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-emerald-400 mb-1.5">
                    Keywords * <span className="text-slate-600">(requerido)</span>
                  </label>
                  <select
                    value={mapping.keywords}
                    onChange={e => setMapping(p => ({ ...p, keywords: e.target.value }))}
                    className={`w-full bg-slate-900 border rounded-xl p-2.5 text-xs text-white focus:outline-none transition-colors ${
                      mapping.keywords ? 'border-emerald-500/40' : 'border-rose-500/40'
                    }`}
                  >
                    <option value="">-- {es ? 'Seleccionar' : 'Select'} --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5">
                    URL {es ? 'de Destino' : 'Destination'}
                  </label>
                  <select
                    value={mapping.url}
                    onChange={e => setMapping(p => ({ ...p, url: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-white/30 outline-none"
                  >
                    <option value="">-- {es ? 'Ignorar' : 'Skip'} --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-slate-500 mb-1.5">
                    {es ? 'Imagen (URL)' : 'Image (URL)'}
                  </label>
                  <select
                    value={mapping.image}
                    onChange={e => setMapping(p => ({ ...p, image: e.target.value }))}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-white/30 outline-none"
                  >
                    <option value="">-- {es ? 'Ignorar' : 'Skip'} --</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Token Estimate */}
            <div className="bg-amber-500/8 border border-amber-500/15 rounded-2xl p-4 flex items-center gap-3">
              <Coins className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-black text-amber-400">
                  {es ? 'Estimación de consumo:' : 'Estimated usage:'}{' '}
                  <span className="text-white">~{estimatedTokens.toLocaleString()} tokens</span>
                </p>
                <p className="text-[10px] text-amber-400/60 font-medium">
                  {parsedRows.length} {es ? 'productos' : 'products'} × ~{TOKENS_PER_PRODUCT} tokens/producto
                </p>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleRun}
              disabled={!mappingComplete}
              className="w-full bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-400 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              {es
                ? `Iniciar Generación Batch (${parsedRows.length} productos)`
                : `Start Batch Generation (${parsedRows.length} products)`}
            </button>

            {!mappingComplete && (
              <p className="text-[10px] text-rose-400/70 text-center flex items-center justify-center gap-1 font-semibold">
                <AlertTriangle className="w-3 h-3" />
                {es ? 'Selecciona la columna Keywords para continuar.' : 'Select the Keywords column to continue.'}
              </p>
            )}

            {/* Reset */}
            <button
              onClick={() => { setParsedRows([]); setHeaders([]); setCsvContent(''); }}
              className="w-full text-[11px] text-slate-600 hover:text-slate-400 transition-colors font-bold"
            >
              {es ? '↩ Subir otro archivo' : '↩ Upload a different file'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
