import React, { useState, useEffect } from 'react';
import { Shield, Activity, Users, BarChart3, AlertCircle, LayoutDashboard, Megaphone, Globe, Download, ListTodo } from 'lucide-react';
import { API_URL } from '../../utils/apiConfig';
import { CampaignsView } from './CampaignsView';
import { ClientsView } from './ClientsView';
import { AccountsView } from './AccountsView';
import { ExtensionWidget } from './ExtensionWidget';
import { PoliciesView } from './PoliciesView';
import { ExtensionActivitiesView } from './ExtensionActivitiesView';
import { UsersView } from './UsersView';
import { AuthUser } from '../../types';

interface PoliceAdsDashboardProps {
  currentUser: AuthUser;
  language?: string;
}

export const PoliceAdsDashboard: React.FC<PoliceAdsDashboardProps> = ({ currentUser, language = 'es' }) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'clients' | 'accounts' | 'campaigns' | 'alerts' | 'policies' | 'extension_activities' | 'users'>('dashboard');

  useEffect(() => {
    if (currentUser?.id) {
      Promise.all([
        fetch(`${API_URL}/api-police-campaigns`, {
          headers: { 'X-User-Id': currentUser.id }
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        }).catch(err => {
          console.error("Error fetching campaigns:", err);
          return [];
        }),
        fetch(`${API_URL}/api-police-alerts`, {
          headers: { 'X-User-Id': currentUser.id }
        }).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        }).catch(err => {
          console.error("Error fetching alerts:", err);
          return [];
        })
      ]).then(([cData, aData]) => {
        setCampaigns(Array.isArray(cData) ? cData : []);
        setAlerts(Array.isArray(aData) ? aData : []);
        setLoading(false);
      });
    }
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-white/60">
        <div className="w-12 h-12 border-2 border-[#1a1f36] border-t-[#2d3763] rounded-full animate-spin mb-4" />
        <p className="text-[11px] uppercase tracking-widest font-black">Cargando Sistema Policial...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#4f6bff]" />
            Police Ads <span className="text-[#4f6bff]">Command Center</span>
          </h1>
          <p className="text-white/50 text-sm mt-1">Supervisión en tiempo real de presupuestos y campañas.</p>
        </div>
        <a
          href="https://chromewebstore.google.com/detail/insitucompany-command-cen/bnbcjlgkhngeenlkjgbocbjpdhbhkdmf"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-magenta to-fuchsia-600 text-white text-xs font-black uppercase tracking-wider transition-all hover:shadow-[0_0_20px_rgba(255,71,123,0.3)] shrink-0 self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          {language === 'es' ? 'Instalar Extensión Chrome' : 'Install Chrome Extension'}
        </a>
      </div>

      <div className="flex items-center gap-2 border-b border-white/5 pb-2 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'clients' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Clientes
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'accounts' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4" />
          Cuentas
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'users' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Usuarios
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'campaigns' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Campañas
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'alerts' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Alertas
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'policies' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          Políticas
        </button>
        <button
          onClick={() => setActiveTab('extension_activities')}
          className={`whitespace-nowrap px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
            activeTab === 'extension_activities' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          Actividad Extensión
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <div className="mb-6">
            <ExtensionWidget currentUser={currentUser} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#0b0e17] rounded-2xl border border-white/5 p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#4f6bff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-1 flex items-center gap-2">
                <BarChart3 className="w-3 h-3" /> Campañas Activas
              </h3>
              <p className="text-4xl font-bold text-white">{campaigns.length}</p>
            </div>
            <div className="bg-[#0b0e17] rounded-2xl border border-white/5 p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff477b]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-1 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" /> Alertas Críticas
              </h3>
              <p className="text-4xl font-bold text-[#ff477b]">
                {alerts.filter(a => a.severity === 'critical').length}
              </p>
            </div>
            <div className="bg-[#0b0e17] rounded-2xl border border-white/5 p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-1 flex items-center gap-2">
                <Globe className="w-3 h-3" /> Cuentas Auditadas
              </h3>
              <p className="text-4xl font-bold text-white">0</p>
            </div>
            <div className="bg-[#0b0e17] rounded-2xl border border-white/5 p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-[#2edb8e]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-1 flex items-center gap-2">
                <Activity className="w-3 h-3" /> Salud General
              </h3>
              <p className="text-4xl font-bold text-[#2edb8e]">$0.00</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0b0e17] rounded-2xl border border-white/5 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Campañas Recientes</h3>
              {campaigns.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                  <p className="text-white/40 text-sm">No hay campañas registradas aún.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(campaigns) ? campaigns : []).slice(0,5).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <span className="text-sm text-white">{c.name}</span>
                      <span className="text-xs px-2 py-1 bg-white/10 rounded-md text-white/60">{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#0b0e17] rounded-2xl border border-white/5 p-6">
              <h3 className="text-lg font-bold text-[#ff477b] mb-4">Registro de Alertas</h3>
              {alerts.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                  <p className="text-white/40 text-sm">Todo en orden. No hay alertas.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(alerts) ? alerts : []).slice(0,5).map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-[#ff477b]/10 border border-[#ff477b]/20">
                      <span className="text-sm text-[#ff477b]">{a.message}</span>
                      <span className="text-xs text-[#ff477b]/60">{new Date(Number(a.created_at)).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'clients' && (
        <ClientsView currentUser={currentUser} />
      )}

      {activeTab === 'accounts' && (
        <AccountsView currentUser={currentUser} />
      )}

      {activeTab === 'users' && (
        <UsersView currentUser={currentUser} />
      )}

      {activeTab === 'campaigns' && (
        <CampaignsView campaigns={campaigns} loading={loading} currentUser={currentUser} />
      )}

      {activeTab === 'alerts' && (
        <div className="bg-[#0b0e17] rounded-2xl border border-white/5 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-[#ff477b]">Centro de Alertas</h3>
            <button
              onClick={() => {
                const headers = ['ID', 'Mensaje', 'Campaña ID', 'Estado', 'Fecha/Hora'];
                const csvContent = [
                  headers.join(','),
                  ...(Array.isArray(alerts) ? alerts : []).map(a => `"${a.id}","${a.message}","${a.campaign_id}","${a.status}","${a.created_at ? new Date(Number(a.created_at)).toLocaleString() : ''}"`)
                ].join('\n');
                const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `police_alerts_${new Date().getTime()}.csv`;
                link.click();
              }}
              className="bg-[#ff477b]/10 text-[#ff477b] hover:bg-[#ff477b]/20 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar CSV
            </button>
          </div>
          {alerts.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
              <p className="text-white/40 text-sm">Todo en orden. No hay alertas críticas de campañas.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(Array.isArray(alerts) ? alerts : []).map(a => (
                <div key={a.id} className="flex items-center justify-between p-4 rounded-lg bg-[#ff477b]/10 border border-[#ff477b]/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[#ff477b] mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-white">{a.message}</p>
                      <p className="text-xs text-white/50 mt-1">Campaña ID: {a.campaign_id}</p>
                    </div>
                  </div>
                  <span className="text-xs px-3 py-1 bg-[#ff477b]/20 rounded-full text-[#ff477b]">
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'policies' && (
        <PoliciesView currentUser={currentUser} />
      )}

      {activeTab === 'extension_activities' && (
        <ExtensionActivitiesView currentUser={currentUser} />
      )}
    </div>
  );
};

export default PoliceAdsDashboard;
