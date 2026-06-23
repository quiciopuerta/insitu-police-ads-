import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell
} from "recharts";
import { Activity, Search, AlertCircle, Signal } from "lucide-react";
import { API_URL, adminFetch } from "../utils/apiConfig";

interface ScannerStats {
  tracks: { total: number; active: number };
  signals: { total: number; avgRelevance: number };
  statsByType: { type: string; count: number }[];
  statsBySource: { source: string; count: number }[];
  historicalSignals: { date: string; count: number }[];
}

interface ScannerMonitoringProps {
  language: "es" | "en";
}

const COLORS = ["#ff477b", "#00f2fe", "#6366f1", "#10b981", "#f59e0b", "#a855f7"];

export const ScannerMonitoring: React.FC<ScannerMonitoringProps> = ({ language }) => {
  const [stats, setStats] = useState<ScannerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await adminFetch(`${API_URL}/admin/scanner-stats`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `HTTP Error ${res.status}`);
      }
      
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const t = {
    es: {
      title: "Monitoreo del Scanner de Competidores",
      loading: "Cargando métricas del scanner...",
      error: "Error al cargar las estadísticas",
      cards: {
        totalTracks: "Monitoreos Activos",
        totalSignals: "Señales Detectadas",
        avgRelevance: "Relevancia Media (IA)",
        health: "Salud del Sistema"
      },
      charts: {
        signalsOverTime: "Señales Detectadas (Últimos 7 días)",
        signalsByType: "Señales por Tipo",
        signalsBySource: "Fuentes de Datos"
      },
      status: {
        online: "Operativo",
        active: "Activos"
      }
    },
    en: {
      title: "Competitor Scanner Monitoring",
      loading: "Loading scanner metrics...",
      error: "Failed to load statistics",
      cards: {
        totalTracks: "Active Monitoring",
        totalSignals: "Signals Detected",
        avgRelevance: "Avg Relevance (AI)",
        health: "System Health"
      },
      charts: {
        signalsOverTime: "Signals Detected (Last 7 Days)",
        signalsByType: "Signals by Type",
        signalsBySource: "Data Sources"
      },
      status: {
        online: "Online",
        active: "Active"
      }
    }
  }[language];

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 animate-pulse">
      <Activity className="w-12 h-12 text-primary mb-4" />
      <p className="text-sm font-black uppercase tracking-widest text-slate-400">{t.loading}</p>
    </div>
  );

  if (error || !stats) return (
    <div className="p-20 text-center">
      <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
      <p className="text-slate-900 font-bold">{t.error}</p>
      <p className="text-slate-500 text-sm mt-2">{error}</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 md:p-8 bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
            <Search className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.cards.totalTracks}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl md:text-4xl font-black text-slate-900">{stats.tracks.active}</span>
            <span className="text-[11px] text-slate-400 font-bold uppercase">/ {stats.tracks.total}</span>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 mb-4">
            <Signal className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.cards.totalSignals}</p>
          <span className="text-3xl md:text-4xl font-black text-slate-900">{stats.signals.total.toLocaleString()}</span>
        </div>

        <div className="p-6 md:p-8 bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 mb-4">
            <Activity className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{t.cards.avgRelevance}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl md:text-4xl font-black text-emerald-600">{stats.signals.avgRelevance}</span>
            <span className="text-lg font-black text-emerald-600/50">%</span>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white mb-4 relative z-10">
            <Activity className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-1 relative z-10">{t.cards.health}</p>
          <div className="flex items-center gap-2 relative z-10">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-lg md:text-xl font-black text-white uppercase tracking-tighter">{t.status.online}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Timeline Chart */}
        <div className="p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8">{t.charts.signalsOverTime}</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.historicalSignals}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#0f172a',
                    color: '#fff'
                  }}
                  itemStyle={{ color: '#ff477b', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#ff477b" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#ff477b', strokeWidth: 0 }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Type Bar Chart */}
        <div className="p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8">{t.charts.signalsByType}</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.statsByType} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="type" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                  {stats.statsByType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Source Bar Chart */}
        <div className="p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8">{t.charts.signalsBySource}</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.statsBySource}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="source" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
                />
                <YAxis axisLine={false} tickLine={false} hide />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                  {stats.statsBySource.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
