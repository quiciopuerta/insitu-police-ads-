import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Layers, Plus, Trash2, Wand2, Download, AlertCircle, ImageIcon, ShieldCheck, Mic } from 'lucide-react';
import JSZip from 'jszip';
import { RetailProduct, RetailLayout, AuthUser, Language } from '../types';
import { masterProductImage } from '../services/ai/mediaGenerationService';
import { TRANSLATIONS } from '../constants';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

const RETAIL_LAYOUTS: RetailLayout[] = [
  { id: 'l1', name: 'Premium Studio', image: 'https://images.unsplash.com/photo-1590247813693-5541d1c609fd?q=80&w=1080&h=1080&auto=format&fit=crop' },
  { id: 'l2', name: 'Minimal Retail', image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1080&h=1080&auto=format&fit=crop' },
  { id: 'l3', name: 'E-commerce Luxury', image: 'https://images.unsplash.com/photo-1540959733332-e94e7bf71fef?q=80&w=1080&h=1080&auto=format&fit=crop' },
];

const ErrorDisplay: React.FC<{ error: string; isAdmin: boolean }> = ({ error, isAdmin }) => {
  let message = error;
  let debugContent = null;

  try {
    const trimmed = error.trim();
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      
      message = parsed.details || parsed.message || (typeof parsed.error === 'string' ? parsed.error : "AI Error");

      if (isAdmin) {
        debugContent = (
          <div className="mt-2 p-3 bg-black/60 rounded-xl text-[11px] font-mono overflow-auto max-h-60 border border-white/10 select-all">
            <p className="text-rose-300 font-bold mb-1 flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-rose-400" /> DEBUG INFO (SUPER ADMIN)
            </p>
            <div className="space-y-1 mb-2 opacity-80 border-b border-white/5 pb-2">
              <p><span className="text-rose-400/70">TASK:</span> {parsed.type || 'UNKNOWN'}</p>
              {parsed.meta?.apiKeyMasked && (
                <p>
                  <span className="text-rose-400/70">KEY:</span> {parsed.meta.apiKeyMasked}
                  <span className="ml-2 text-white/20 text-[7px] italic">({parsed.meta.apiKeySource})</span>
                </p>
              )}
            </div>
            {parsed.details && parsed.message && parsed.details !== parsed.message && (
               <p className="text-rose-200/50 mb-1">{parsed.message}</p>
            )}
            <pre className="whitespace-pre-wrap opacity-60 text-xs text-rose-100">{parsed.details || (typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error, null, 2))}</pre>
            {parsed.stack && (
              <pre className="whitespace-pre-wrap opacity-25 mt-3 pt-2 border-t border-white/5 text-[11px] bg-black/20 p-2 rounded leading-tight">
                {parsed.stack}
              </pre>
            )}
          </div>
        );
      }
    }
  } catch (e) {
    // Falls back to raw string display
  }

  return (
    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col gap-1 text-rose-500 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-[11px] font-bold uppercase tracking-wider">{message}</p>
      </div>
      {debugContent}
    </div>
  );
};

export interface RetailLabViewProps {
  currentUser: AuthUser | null;
  language: Language;
  onAudit?: (media: { url: string; type: 'image' | 'video' }) => void;
}

const blobToBase64 = async (url: string): Promise<string> => {
  if (url.startsWith('data:')) return url;
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Error converting blob to base64", e);
    return url;
  }
};

const RetailLabView: React.FC<RetailLabViewProps> = ({ currentUser, language, onAudit }) => {
  const t = TRANSLATIONS[language] as any;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superAdmin';

  const [retailState, setRetailState] = useState({
    products: [] as RetailProduct[],
    selectedLayoutId: 'l1',
    customLayout: null as string | null,
    ecommercePlatform: 'generico' as 'generico' | 'instagram' | 'amazon' | 'shopify' | 'woocommerce',
    isProcessing: false,
    error: null as any,
    processingProgress: null as string | null,
    aiMasteringEnabled: true
  });

  const handleRetailProcess = async () => {
    if (retailState.products.length === 0) return;
    setRetailState(prev => ({ ...prev, isProcessing: true, error: null, processingProgress: null }));
    try {
      let layoutUrl: string | null = null;
      if (retailState.selectedLayoutId === 'custom' && retailState.customLayout) {
        layoutUrl = retailState.customLayout;
      } else if (retailState.selectedLayoutId !== 'none') {
        const layout = RETAIL_LAYOUTS.find(l => l.id === retailState.selectedLayoutId);
        if (layout) layoutUrl = layout.image;
      }

      const total = retailState.products.length;
      const updatedProducts: RetailProduct[] = [...retailState.products];

      for (let i = 0; i < total; i++) {
        const p = retailState.products[i];
        
        // Mark as processing
        updatedProducts[i] = { ...p, status: 'processing' };
        setRetailState(prev => ({ ...prev, products: [...updatedProducts], processingProgress: `${i + 1} / ${total}` }));

        let sourceForCanvas = p.originalImage;

        // Phase 1: AI Mastering (Background swap/optimization)
        if (retailState.aiMasteringEnabled) {
          try {
            const base64 = await blobToBase64(p.originalImage);
            const aiResult = await masterProductImage(base64, retailState.ecommercePlatform);
            if (aiResult?.url) {
              sourceForCanvas = aiResult.url;
            }
          } catch (aiErr: any) {
            console.error(`AI Mastering failed for ${p.id}, falling back:`, aiErr);
          }
        }

        const w = retailState.ecommercePlatform === 'instagram' ? 1080 : 1350; // Actually original used 1080:1000, wait, it was 1080x1350 for insta, 1000x1000 for generic.
        const effectiveW = retailState.ecommercePlatform === 'instagram' ? 1080 : 1000;
        const effectiveH = retailState.ecommercePlatform === 'instagram' ? 1350 : 1000;

        const result = await new Promise<RetailProduct>((resolve) => {
          const canvas = document.createElement('canvas');
          canvas.width = effectiveW;
          canvas.height = effectiveH;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve({ ...updatedProducts[i], status: 'error' });

          const renderProduct = (imageUrl: string) => {
            const img = new Image();
            if (imageUrl.startsWith('http')) img.crossOrigin = "anonymous";
            img.onload = () => {
              const scale = Math.min((effectiveW * 0.85) / img.width, (effectiveH * 0.85) / img.height);
              const dw = img.width * scale;
              const dh = img.height * scale;
              ctx.drawImage(img, (effectiveW - dw) / 2, (effectiveH - dh) / 2, dw, dh);
              try {
                resolve({ ...updatedProducts[i], processedImage: canvas.toDataURL('image/jpeg', 0.95), status: 'completed' });
              } catch {
                resolve({ ...updatedProducts[i], status: 'error' });
              }
            };
            img.onerror = () => resolve({ ...updatedProducts[i], status: 'error' });
            img.src = imageUrl;
          };

          // If a layout is selected, draw it as background
          if (layoutUrl) {
            const lay = new Image();
            if (layoutUrl.startsWith('http')) lay.crossOrigin = "anonymous";
            lay.onload = () => {
              const scale = Math.max(effectiveW / lay.width, effectiveH / lay.height);
              ctx.drawImage(lay, (effectiveW - lay.width * scale) / 2, (effectiveH - lay.height * scale) / 2, lay.width * scale, lay.height * scale);
              renderProduct(sourceForCanvas);
            };
            lay.onerror = () => {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, effectiveW, effectiveH);
              renderProduct(sourceForCanvas);
            };
            lay.src = layoutUrl;
          } else if (retailState.aiMasteringEnabled && sourceForCanvas !== p.originalImage) {
            // If AI Mastering did its job and NO layout is selected, we just use the AI result directly as the final image
            // No need to draw on canvas unless we want to ensure specific size
            renderProduct(sourceForCanvas);
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, effectiveW, effectiveH);
            renderProduct(sourceForCanvas);
          }
        });

        updatedProducts[i] = result;
        setRetailState(prev => ({
          ...prev,
          products: [...updatedProducts],
        }));
      }

      setRetailState(prev => ({ ...prev, isProcessing: false, processingProgress: null }));
      console.log(language === 'es' ? '¡Procesamiento completo!' : 'Processing complete!');
    } catch (err: any) {
      const errorPayload = err.serverStack
        ? JSON.stringify({ message: err.message, stack: err.serverStack, type: 'RETAIL_PROCESS' })
        : err.message;
      setRetailState(prev => ({ ...prev, isProcessing: false, processingProgress: null, error: errorPayload }));
      console.error(err.message);
    }
  };

  const handleDownloadZip = async () => {
    const completed = (retailState.products || []).filter(p => p.processedImage);
    if (completed.length === 0) {
      setRetailState(prev => ({ ...prev, error: 'No hay imágenes procesadas para descargar. Procesa al menos un producto primero.' }));
      return;
    }
    
    const zip = new JSZip();
    (retailState.products || []).forEach((p) => {
      if (p.processedImage) {
        const base64Data = p.processedImage.split(',')[1];
        // Preserve original filename if available, else use a fallback
        const originalName = p.name ? p.name.split('.')[0] : `producto_${Math.random().toString(36).substr(2, 5)}`;
        zip.file(`${originalName}_optimized.jpg`, base64Data, { base64: true });
      }
    });
    
    zip.generateAsync({ type: 'blob' }).then((content) => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retail_optimized_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'retail' | 'layout') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (target === 'retail') {
      const newProducts: RetailProduct[] = Array.from(files).map((file, i) => {
        const url = URL.createObjectURL(file);
        // We need base64 for the service, so we'll convert it
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          setRetailState(prev => ({
            ...prev,
            products: (prev.products || []).map(p => p.id === `p-${i}-${Date.now()}` ? { ...p, originalImage: reader.result as string } : p)
          }));
        };
        return {
          id: `p-${i}-${Date.now()}`,
          name: file.name,
          originalImage: url,
          processedImage: null,
          status: 'pending' as const
        };
      });
      setRetailState(prev => ({ ...prev, products: [...(prev.products || []), ...newProducts] }));
    } else if (target === 'layout') {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setRetailState(prev => ({ ...prev, customLayout: reader.result as string, selectedLayoutId: 'custom' }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div
      key="retail-lab"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col gap-12 bg-white/5 p-8 md:p-12 rounded-[3.5rem] border border-white/10 backdrop-blur-2xl"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
      <div>
          <span className="text-[11px] font-black uppercase tracking-[0.3em] text-[#ff477b] mb-4 block">{t.creative_lab || 'Creative Lab'} / {t.retail_bulk || 'Retail Bulk'}</span>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
            Bulk Product <br /> <span className="text-gradient-magenta">Gen Mastering</span>.
          </h1>
        </div>
        <button
          onClick={handleRetailProcess}
          disabled={retailState.isProcessing || retailState.products.length === 0}
          className="bg-white text-[#0a0f1e] px-12 py-8 rounded-3xl font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-4 disabled:opacity-20"
        >
          {retailState.isProcessing ? (
            <RefreshCw className="w-6 h-6 animate-spin text-[#ff477b]" />
          ) : (
            <Layers className="w-6 h-6 text-[#ff477b]" />
          )}
          <span>
            {retailState.processingProgress
              ? `Procesando ${retailState.processingProgress}...`
              : `Procesar ${retailState.products.length} Productos`}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-3 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Layout Studio</label>
              <label className="text-[11px] font-black uppercase tracking-widest text-white hover:text-[#ff477b] cursor-pointer flex items-center gap-2">
                <Plus className="w-3 h-3" /> Añadir
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'layout')} />
              </label>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {retailState.customLayout && (
                <div className="group relative rounded-2xl overflow-hidden border-2 aspect-video transition-all border-[#ff477b] shadow-xl shadow-[#ff477b]/10 mb-4">
                  <img src={retailState.customLayout} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 top-auto h-1/2 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between p-4">
                     <span className="text-[11px] font-black uppercase tracking-widest text-white">Custom Layout</span>
                     <button onClick={() => setRetailState(prev => ({ ...prev, customLayout: null, selectedLayoutId: 'l1' }))} className="text-rose-400 hover:text-rose-500 bg-black/50 p-2 rounded-full backdrop-blur-md transition-all">
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>
              )}

              {RETAIL_LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => setRetailState(prev => ({ ...prev, selectedLayoutId: layout.id }))}
                  className={cn(
                    "group relative rounded-2xl overflow-hidden border-2 transition-all aspect-video",
                    retailState.selectedLayoutId === layout.id ? "border-[#ff477b] scale-[1.02] shadow-xl shadow-[#ff477b]/10" : "border-transparent hover:border-white/20"
                  )}
                >
                  <img src={layout.image} className="w-full h-full object-cover" />
                  <div className={cn(
                    "absolute inset-0 flex items-center justify-center bg-black/40",
                    retailState.selectedLayoutId === layout.id ? "opacity-0" : "opacity-100"
                  )}>
                    <span className="text-[11px] font-black uppercase tracking-widest text-white">{layout.name}</span>
                  </div>
                </button>
              ))}
              
              <button
                onClick={() => setRetailState(prev => ({ ...prev, selectedLayoutId: 'none' }))}
                className={cn(
                  "group relative rounded-2xl overflow-hidden border-2 transition-all aspect-video flex flex-col items-center justify-center bg-white/5",
                  retailState.selectedLayoutId === 'none' ? "border-[#ff477b] scale-[1.02] shadow-xl shadow-[#ff477b]/10" : "border-transparent border-dashed border-white/20 hover:border-white/40"
                )}
              >
                 <div className="w-full h-full bg-white opacity-20"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[11px] font-black uppercase tracking-widest text-black mix-blend-difference">Sin Layout (Blanco)</span>
                 </div>
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <label className="text-[11px] font-black uppercase tracking-widest text-white/40">Plataforma Objetivo</label>
              <select 
                value={retailState.ecommercePlatform}
                onChange={(e) => setRetailState(prev => ({ ...prev, ecommercePlatform: e.target.value as any }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest text-white focus:ring-2 focus:ring-[#ff477b]"
              >
                <option value="generico">Genérico 1:1 (1000px)</option>
                <option value="instagram">Instagram 4:5 (1080x1350)</option>
                <option value="amazon">Amazon / MercadoLibre</option>
                <option value="shopify">Shopify Full</option>
                <option value="woocommerce">Woocommerce (Pro)</option>
              </select>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between p-4 bg-[#ff477b]/5 rounded-2xl border border-[#ff477b]/20">
                <div className="flex items-center gap-3">
                  <Wand2 className={cn("w-4 h-4", retailState.aiMasteringEnabled ? "text-[#ff477b]" : "text-white/20")} />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-widest text-white">Gen Mastering</span>
                    <span className="text-[11px] text-white/40 uppercase tracking-tighter">Quitar Fondo + IA</span>
                  </div>
                </div>
                <button
                  onClick={() => setRetailState(prev => ({ ...prev, aiMasteringEnabled: !prev.aiMasteringEnabled }))}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-all duration-300",
                    retailState.aiMasteringEnabled ? "bg-[#ff477b]" : "bg-white/10"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300",
                    retailState.aiMasteringEnabled ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>
            </div>

          <div className="space-y-4 pt-4">
              <button
                onClick={handleDownloadZip}
                disabled={retailState.products.filter(p => p.processedImage).length === 0}
                className="w-full bg-[#ff477b] text-white py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#ff477b]/90 transition-colors disabled:opacity-20 disabled:grayscale"
              >
                <Download className="w-5 h-5" />
                <span>Exportar Todos (.ZIP)</span>
              </button>
            </div>

            {retailState.error && (
              <div className="pt-4 border-t border-white/10">
                <ErrorDisplay error={retailState.error} isAdmin={isAdmin} />
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-white/10">
              <div 
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-expert-chat', { detail: { open: true } }))}
                className="p-6 bg-white/5 rounded-2xl border border-white/10 group cursor-pointer hover:border-[#ff477b]/50 transition-all flex items-center gap-4"
              >
                 <div className="w-10 h-10 rounded-full bg-[#ff477b]/20 flex items-center justify-center text-[#ff477b]">
                   <Mic className="w-5 h-5" />
                 </div>
                 <div className="flex-1">
                   <p className="text-[11px] font-black uppercase tracking-widest text-white">¿Necesitas ayuda?</p>
                   <p className="text-[11px] text-white/40">Habla con el Agente Experto para optimizar tus layouts.</p>
                 </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-9 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[2.5rem] cursor-pointer hover:bg-white/5 transition-all group">
               <Plus className="w-8 h-8 mb-4 text-white/20 group-hover:text-[#ff477b] transition-colors" />
               <span className="px-6 text-center text-[11px] font-black uppercase tracking-widest text-white/20">Agregar Catálogo</span>
               <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'retail')} />
            </label>

            {(retailState.products || []).map((product) => (
              <div key={product.id} className="aspect-square bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden relative group">
                {product.processedImage ? (
                  <img src={product.processedImage} className="w-full h-full object-cover animate-in fade-in duration-1000" />
                ) : (
                  <div className="w-full h-full relative">
                    <img src={product.originalImage} className="w-full h-full object-cover opacity-30 blur-sm" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 gap-3">
                      {product.status === 'processing' ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-[#ff477b]" />
                      ) : product.status === 'error' ? (
                        <AlertCircle className="w-6 h-6 text-rose-500" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-white/20" />
                      )}
                      <span className="text-[11px] font-black uppercase tracking-widest text-white/40 text-center truncate w-full">{product.name}</span>
                    </div>
                  </div>
                )}
                
                 <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all z-20">
                    {product.processedImage && (
                      <>
                        <button 
                          onClick={() => onAudit?.({ url: product.processedImage!, type: 'image' })}
                          className="w-8 h-8 bg-black/60 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-[#ff477b]"
                          title="Analizar con IA"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = product.processedImage!;
                            a.download = `${product.name?.split('.')[0] || 'retail_product'}_optimized.jpg`;
                            a.click();
                          }}
                          className="w-8 h-8 bg-black/60 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-[#ff477b]"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button 
                     onClick={() => setRetailState(prev => ({ ...prev, products: prev.products.filter(p => p.id !== product.id) }))}
                     className="w-8 h-8 bg-black/60 backdrop-blur-xl rounded-full flex items-center justify-center text-white hover:bg-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
              </div>
            ))}
          </div>

          {retailState.products.length > 0 && (
            <div className="flex justify-end p-4">
              <button 
                onClick={() => setRetailState(prev => ({ ...prev, products: [] }))}
                className="text-[11px] font-black uppercase tracking-widest text-rose-500/60 hover:text-rose-500 flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" /> Limpiar Todo
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default RetailLabView;
