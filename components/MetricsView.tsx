
import React, { useState, useRef } from 'react';
import { SearchResult, MetricPoint } from '../types';

interface MetricsViewProps {
  searchResult: SearchResult | null;
  isLoading?: boolean;
  language?: 'en' | 'es';
}

const MetricsView: React.FC<MetricsViewProps> = ({ searchResult, isLoading, language = 'es' }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const t = {
    loading: language === 'es' ? 'Analizando tendencias históricas...' : 'Analyzing historical trends...',
    notAvailable: language === 'es' ? 'Métricas no disponibles' : 'Metrics not available',
    notAvailableDesc: language === 'es' ? 'Realiza una auditoría en la pestaña de Analizador para generar los gráficos de rendimiento.' : 'Perform an audit in the Analyzer tab to generate performance charts.',
    trendAnalysis: language === 'es' ? 'Análisis de Tendencias' : 'Trend Analysis',
    leftAxis: language === 'es' ? 'Eje Izquierdo' : 'Left Axis',
    rightAxis: language === 'es' ? 'Eje Derecho' : 'Right Axis',
    volume: language === 'es' ? 'Volumen' : 'Volume',
    estCpc: language === 'es' ? 'CPC Est.' : 'Est. CPC',
    audited: language === 'es' ? 'Auditado' : 'Audited',
    market: language === 'es' ? 'Mercado' : 'Market',
    chartTitle: language === 'es' ? 'Evolución de CPC vs Volumen' : 'Evolution of CPC vs Volume',
    chartDesc: language === 'es' ? 'Comparativa histórica de costos y demanda del nicho' : 'Historical comparison of costs and niche demand',
    searchVolume: language === 'es' ? 'Volumen de Búsqueda' : 'Search Volume',
    period: language === 'es' ? 'Periodo' : 'Period',
    rankingPos: language === 'es' ? 'Ranking Pos:' : 'Ranking Pos:',
    auctionTitle: language === 'es' ? 'Competencia en Subasta (Auction Insights)' : 'Auction Competition (Auction Insights)',
    auctionDesc: language === 'es' ? `Dominios detectados en el nicho de ${searchResult?.themeContext}` : `Domains detected in the ${searchResult?.themeContext} niche`,
    auditedData: language === 'es' ? 'Datos Auditados' : 'Audited Data',
    mainDomain: language === 'es' ? 'Dominio Principal' : 'Main Domain',
    impressionShare: language === 'es' ? 'Cuota de Impresiones' : 'Impression Share',
    overlap: language === 'es' ? 'Superposición' : 'Overlap',
    topOfPage: language === 'es' ? 'Parte Superior' : 'Top of Page',
    absTopOfPage: language === 'es' ? 'Pos. Absoluta' : 'Abs. Top Pos.',
    outrankingShare: language === 'es' ? 'Outranking Share' : 'Outranking Share',
    activeCompetitor: language === 'es' ? 'Competidor Activo' : 'Active Competitor'
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-6 text-slate-400 font-black uppercase tracking-widest text-[11px] animate-pulse">
          {t.loading}
        </p>
      </div>
    );
  }

  if (!searchResult || !searchResult.metricsSeries || searchResult.metricsSeries.length === 0) {
    return (
      <div className="bg-white rounded-[3rem] p-12 md:p-20 text-center border border-slate-100 shadow-xl max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
           <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
           </svg>
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-4">{t.notAvailable}</h3>
        <p className="text-slate-500 font-medium">
          {t.notAvailableDesc}
        </p>
      </div>
    );
  }

  const data = searchResult.metricsSeries;
  const competitors = searchResult.competitors;
  
  // Scaling calculations
  const maxConv = Math.max(...data.map(d => d.conv)) * 1.2 || 1;
  const maxCpc = Math.max(...data.map(d => d.cpc)) * 1.2 || 1;

  const width = 1000;
  const height = 450;
  const padding = 80;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleDownloadEvolutionCSV = () => {
    if (!searchResult || !searchResult.metricsSeries) return;
    const data = searchResult.metricsSeries;
    const header = ["Mes", "Volumen de Búsqueda", "CPC Estimado ($)"];
    const rows = data.map((d) => [
      d.month,
      d.conv,
      d.cpc.toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Evolucion_Mercado_${(searchResult.themeContext || "ads").replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      
      {/* Context Ribbon */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center gap-8 border border-slate-800 no-print">
        <div className="flex items-center space-x-5">
          <div className="bg-primary p-4 rounded-2xl shadow-lg shadow-primary/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.trendAnalysis}</p>
            <p className="text-lg font-black text-white leading-none tracking-tight">{searchResult.themeContext}</p>
          </div>
        </div>
        <div className="hidden lg:block h-12 w-px bg-slate-800"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 w-full lg:w-auto flex-1">
           <div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.leftAxis}</p>
              <p className="text-sm font-black text-primary uppercase">{t.volume}</p>
           </div>
           <div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.rightAxis}</p>
              <p className="text-sm font-black text-blue-400 uppercase">{t.estCpc}</p>
           </div>
           <div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.audited}</p>
              <p className="text-sm font-black text-emerald-500 uppercase">Real-Time</p>
           </div>
           <div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.market}</p>
              <p className="text-sm font-black text-slate-200">Ecuador</p>
           </div>
        </div>
      </div>

      {/* Main Dual Axis Chart */}
      <div 
        ref={containerRef}
        className="bg-white rounded-[3.5rem] p-8 md:p-14 border border-slate-100 shadow-2xl relative overflow-visible"
        onMouseMove={handleMouseMove}
      >
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-16">
          <div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{t.chartTitle}</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] mt-1">{t.chartDesc}</p>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <button
                onClick={handleDownloadEvolutionCSV}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
             >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                {language === 'es' ? 'Exportar CSV' : 'Export CSV'}
             </button>
             <div className="flex items-center gap-8">
               <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">{t.searchVolume}</span>
               </div>
               <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">{t.estCpc} ($)</span>
               </div>
             </div>
          </div>
        </div>

        <div className="relative w-full">
          <svg 
            className="w-full h-auto overflow-visible" 
            viewBox={`0 0 ${width} ${height}`} 
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Grid Lines Horizontal */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => (
              <line 
                key={`h-${idx}`} 
                x1={padding} 
                y1={height - padding - (p * graphHeight)} 
                x2={width - padding} 
                y2={height - padding - (p * graphHeight)} 
                stroke="#f1f5f9" 
                strokeWidth="1" 
              />
            ))}

            {/* Y1 Axis (Volume) - Left */}
            <text 
              x={padding - 15} 
              y={padding - 20} 
              textAnchor="start" 
              className="text-[11px] font-black fill-primary uppercase tracking-[0.1em]"
            >
              {t.searchVolume}
            </text>
            {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => (
              <text 
                key={`y1-${idx}`} 
                x={padding - 15} 
                y={height - padding - (p * graphHeight) + 4} 
                textAnchor="end" 
                className="text-[11px] font-bold fill-slate-300"
              >
                {Math.round(p * maxConv).toLocaleString()}
              </text>
            ))}

            {/* Y2 Axis (CPC) - Right */}
            <text 
              x={width - padding + 15} 
              y={padding - 20} 
              textAnchor="end" 
              className="text-[11px] font-black fill-blue-500 uppercase tracking-[0.1em]"
            >
              {t.estCpc} ($)
            </text>
            {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => (
              <text 
                key={`y2-${idx}`} 
                x={width - padding + 15} 
                y={height - padding - (p * graphHeight) + 4} 
                textAnchor="start" 
                className="text-[11px] font-bold fill-slate-300"
              >
                ${(p * maxCpc).toFixed(2)}
              </text>
            ))}

            {/* Volume Area (Glow) */}
            <path
              d={`M ${padding},${height - padding} ${data.map((d, i) => `${padding + (i * graphWidth) / (data.length - 1)},${height - padding - (d.conv / maxConv) * graphHeight}`).join(' L ')} L ${width - padding},${height - padding} Z`}
              fill="primary" 
              fillOpacity="0.03"
            />
            
            {/* Volume Line */}
            <path
              d={`M ${data.map((d, i) => `${padding + (i * graphWidth) / (data.length - 1)},${height - padding - (d.conv / maxConv) * graphHeight}`).join(' L ')}`}
              fill="none" 
              stroke="primary" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="transition-all duration-700"
            />

            {/* CPC Line */}
            <path
              d={`M ${data.map((d, i) => `${padding + (i * graphWidth) / (data.length - 1)},${height - padding - (d.cpc / maxCpc) * graphHeight}`).join(' L ')}`}
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="transition-all duration-700"
            />

            {/* Vertical Guide & Interaction Zones */}
            {data.map((d, i) => {
              const x = padding + (i * graphWidth) / (data.length - 1);
              const yConv = height - padding - (d.conv / maxConv) * graphHeight;
              const yCpc = height - padding - (d.cpc / maxCpc) * graphHeight;

              return (
                <g key={i} onMouseEnter={() => setHoveredIndex(i)} className="cursor-pointer">
                  {/* Transparent Interaction Bar */}
                  <rect 
                    x={x - (graphWidth / (data.length - 1) / 2)} 
                    y={padding} 
                    width={graphWidth / (data.length - 1)} 
                    height={graphHeight} 
                    fill="transparent" 
                  />
                  
                  {hoveredIndex === i && (
                    <>
                      <line x1={x} y1={padding} x2={x} y2={height - padding} stroke="#f1f5f9" strokeWidth="2" strokeDasharray="4" />
                      <circle cx={x} cy={yConv} r="8" fill="primary" stroke="white" strokeWidth="3" />
                      <circle cx={x} cy={yCpc} r="8" fill="#3b82f6" stroke="white" strokeWidth="3" />
                    </>
                  )}

                  {!hoveredIndex && (
                    <>
                      <circle cx={x} cy={yConv} r="4" fill="primary" />
                      <circle cx={x} cy={yCpc} r="4" fill="#3b82f6" />
                    </>
                  )}
                </g>
              );
            })}

            {/* X Axis Labels (Months) */}
            {data.map((d, i) => (
              <text 
                key={`x-${i}`} 
                x={padding + (i * graphWidth) / (data.length - 1)} 
                y={height - padding + 40} 
                textAnchor="middle" 
                className={`text-[11px] font-black uppercase tracking-widest ${hoveredIndex === i ? 'fill-slate-900' : 'fill-slate-300'}`}
              >
                {d.month}
              </text>
            ))}
          </svg>
        </div>

        {/* Floating Tooltip */}
        {hoveredIndex !== null && (
          <div 
            className="absolute z-50 pointer-events-none bg-slate-900 text-white p-6 rounded-[1.5rem] shadow-2xl border border-white/10 animate-in fade-in zoom-in-95"
            style={{ 
              left: `${mousePos.x + 20}px`, 
              top: `${mousePos.y - 140}px` 
            }}
          >
             <p className="text-[11px] font-black uppercase tracking-widest text-primary mb-3 border-b border-white/5 pb-2">
               {t.period}: {data[hoveredIndex].month}
             </p>
             <div className="space-y-3 min-w-[160px]">
                <div className="flex justify-between items-center">
                   <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">{t.volume}:</span>
                   <span className="text-sm font-black text-white">{data[hoveredIndex].conv.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">{t.estCpc}:</span>
                   <span className="text-sm font-black text-blue-400">${data[hoveredIndex].cpc.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2">
                   <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">{t.rankingPos}</span>
                   <span className="text-sm font-black text-emerald-400">{data[hoveredIndex].ranking.toFixed(1)}</span>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Auction Insights Table */}
      <div className="bg-white rounded-[3.5rem] overflow-hidden shadow-2xl border border-slate-100 no-print">
         <div className="p-10 bg-slate-50 flex items-center justify-between border-b border-slate-100">
            <div>
              <h4 className="text-xl font-black text-slate-900 tracking-tight">{t.auctionTitle}</h4>
              <p className="text-[11px] font-black text-primary uppercase tracking-widest mt-1 italic">{t.auctionDesc}</p>
            </div>
            <div className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400">{t.auditedData}</div>
         </div>
         
         <div className="overflow-x-auto">
           <table className="w-full text-left min-w-max">
              <thead>
                <tr className="bg-white text-slate-500 text-[11px] font-black uppercase tracking-tight border-b border-slate-100">
                  <th className="px-10 py-8">{t.mainDomain}</th>
                  <th className="px-6 py-8 text-center">{t.impressionShare}</th>
                  <th className="px-6 py-8 text-center">{t.overlap}</th>
                  <th className="px-6 py-8 text-center">{t.topOfPage}</th>
                  <th className="px-6 py-8 text-center">{t.absTopOfPage}</th>
                  <th className="px-10 py-8 text-right">{t.outrankingShare}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {searchResult.competitors.map((comp, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-10 py-6">
                      <p className="text-slate-900 font-black text-sm group-hover:text-primary transition-colors">{comp.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">{t.activeCompetitor}</p>
                        {comp.nicheDominance && (
                          <span className="text-[11px] px-1.5 py-0.5 bg-primary/10 text-primary font-black rounded-md border border-primary/20">
                            {comp.nicheDominance}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="text-slate-700 font-bold text-xs">{comp.impressionShare.toFixed(2)}%</span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="text-slate-700 font-bold text-xs">{comp.overlapRate.toFixed(2)}%</span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-blue-500 font-black text-xs">{comp.topOfPageRate.toFixed(2)}%</span>
                        <div className="w-16 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-1000" 
                            style={{ width: `${comp.topOfPageRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-slate-700 font-bold text-xs">{comp.absTopOfPageRate.toFixed(2)}%</span>
                        <div className="w-16 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-1000" 
                            style={{ width: `${comp.absTopOfPageRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <span className="text-emerald-500 font-black text-xs">{comp.outrankingShare.toFixed(2)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
         </div>
      </div>
    </div>
  );
};

export default MetricsView;
