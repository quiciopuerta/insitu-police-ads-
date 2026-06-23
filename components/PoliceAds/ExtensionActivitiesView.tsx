import React, { useState, useEffect } from 'react';
import { Shield, Activity, Users, AlertCircle, Copy, Check, Search, Filter } from 'lucide-react';
import { API_URL } from '../../utils/apiConfig';
import { AuthUser } from '../../types';

interface ExtensionActivitiesViewProps {
  currentUser: AuthUser;
}

export const ExtensionActivitiesView: React.FC<ExtensionActivitiesViewProps> = ({ currentUser }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterClient, setFilterClient] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchActivities = () => {
    setLoading(true);
    fetch(`${API_URL}/api-police-extension-activities`, {
      headers: { 'X-User-Id': currentUser.id }
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setActivities(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching extension activities:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchActivities();
    }
  }, [currentUser]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get unique lists for filtering
  const clients = Array.from(new Set(activities.map(a => JSON.stringify({ id: a.client_id, name: a.client_name })).filter(Boolean)))
    .map(c => JSON.parse(c))
    .filter(c => c.id);

  const users = Array.from(new Set(activities.map(a => a.user_email).filter(Boolean)));
  const platforms = Array.from(new Set(activities.map(a => a.platform).filter(Boolean)));

  // Filter activities
  const filteredActivities = activities.filter(act => {
    if (filterClient && act.client_id !== filterClient) return false;
    if (filterBrand && !act.brand?.toLowerCase().includes(filterBrand.toLowerCase())) return false;
    if (filterUser && act.user_email !== filterUser) return false;
    if (filterPlatform && act.platform !== filterPlatform) return false;
    if (filterStatus && act.status !== filterStatus) return false;
    return true;
  });

  // Calculate statistics
  const totalCount = filteredActivities.length;
  const validCount = filteredActivities.filter(a => a.status === 'valid').length;
  const budgetAlertCount = filteredActivities.filter(a => a.status === 'error_budget').length;
  const invalidCount = filteredActivities.filter(a => a.status === 'invalid').length;
  const complianceRate = totalCount > 0 ? Math.round((validCount / totalCount) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#4f6bff]" />
            Actividad de la Extensión
          </h2>
          <p className="text-white/50 text-sm mt-1">Reportes y auditoría de nomenclaturas y control presupuestario.</p>
        </div>
        <button
          onClick={fetchActivities}
          className="bg-white/10 hover:bg-white/15 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
        >
          Sincronizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0b0e17] rounded-xl border border-white/5 p-5 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Total Actividades</h3>
          <p className="text-3xl font-black text-white">{totalCount}</p>
        </div>
        <div className="bg-[#0b0e17] rounded-xl border border-white/5 p-5 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Tasa de Cumplimiento</h3>
          <p className={`text-3xl font-black ${complianceRate >= 90 ? 'text-[#2edb8e]' : 'text-yellow-500'}`}>{complianceRate}%</p>
        </div>
        <div className="bg-[#0b0e17] rounded-xl border border-white/5 p-5 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#ff477b]/80 mb-1">Excesos de Presupuesto</h3>
          <p className="text-3xl font-black text-[#ff477b]">{budgetAlertCount}</p>
        </div>
        <div className="bg-[#0b0e17] rounded-xl border border-white/5 p-5 shadow-lg">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Formatos Inválidos</h3>
          <p className="text-3xl font-black text-white/70">{invalidCount}</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-[#0b0e17] border border-white/5 rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" /> Filtrar por:
        </div>

        {/* Client filter */}
        <select
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#4f6bff]"
        >
          <option value="" className="bg-[#0b0e17]">Todos los Clientes</option>
          {clients.map(c => (
            <option key={c.id} value={c.id} className="bg-[#0b0e17]">{c.name}</option>
          ))}
        </select>

        {/* Brand filter */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por Marca..."
            value={filterBrand}
            onChange={e => setFilterBrand(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none focus:border-[#4f6bff] w-40"
          />
          <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* User filter */}
        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#4f6bff]"
        >
          <option value="" className="bg-[#0b0e17]">Todos los Usuarios</option>
          {users.map(u => (
            <option key={u} value={u} className="bg-[#0b0e17]">{u}</option>
          ))}
        </select>

        {/* Platform filter */}
        <select
          value={filterPlatform}
          onChange={e => setFilterPlatform(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#4f6bff]"
        >
          <option value="" className="bg-[#0b0e17]">Todas las Plataformas</option>
          {platforms.map(p => (
            <option key={p} value={p} className="bg-[#0b0e17]">{p}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#4f6bff]"
        >
          <option value="" className="bg-[#0b0e17]">Todos los Estados</option>
          <option value="valid" className="bg-[#0b0e17]">✓ Nomenclatura OK</option>
          <option value="invalid" className="bg-[#0b0e17]">✕ Inválida</option>
          <option value="error_budget" className="bg-[#0b0e17]">⚠ Exceso Presupuesto</option>
        </select>

        {/* Clear filters */}
        {(filterClient || filterBrand || filterUser || filterPlatform || filterStatus) && (
          <button
            onClick={() => {
              setFilterClient('');
              setFilterBrand('');
              setFilterUser('');
              setFilterPlatform('');
              setFilterStatus('');
            }}
            className="text-xs text-[#ff477b] hover:underline ml-auto font-semibold"
          >
            Limpiar Filtros
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-[#0b0e17] rounded-xl border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-white/50">
            <div className="w-8 h-8 border-2 border-[#1a1f36] border-t-[#4f6bff] rounded-full animate-spin mx-auto mb-3" />
            Cargando historial de extensión...
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-white/50">
            No se encontraron actividades registradas con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-white/10 bg-white/5 uppercase text-white/60 font-semibold">
                <tr>
                  <th className="px-6 py-3">Cliente / Marca</th>
                  <th className="px-6 py-3">Plataforma / Canal</th>
                  <th className="px-6 py-3">Campaña / UTM</th>
                  <th className="px-6 py-3">Presupuesto</th>
                  <th className="px-6 py-3">IDs Plataforma</th>
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredActivities.map((act: any) => (
                  <tr key={act.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{act.client_name || 'N/A'}</div>
                      <div className="text-white/40 text-[10px] mt-0.5">{act.brand || 'Sin marca'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{act.platform}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        {act.activity_type === 'budget_control_set' ? 'Ajuste Presupuestario' : 'Creador de UTM'}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-mono text-white/80 truncate" title={act.campaign_name}>
                        {act.campaign_name}
                      </div>
                      {act.utm_url && (
                        <div className="text-[9px] text-[#4f6bff] truncate mt-1 max-w-[200px]" title={act.utm_url}>
                          {act.utm_url}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {act.budget ? (
                        <>
                          <div className="font-semibold text-white">${Number(act.budget).toLocaleString()}</div>
                          <div className="text-[10px] text-white/40 mt-0.5">Max: ${Number(act.max_budget_allowed || 0).toLocaleString()}</div>
                        </>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 font-mono text-[9px] text-white/60">
                        {act.campaign_id && <div><span className="text-white/30">CAMP:</span> {act.campaign_id}</div>}
                        {act.adset_id && <div><span className="text-white/30">ADSET:</span> {act.adset_id}</div>}
                        {act.ad_id && <div><span className="text-white/30">AD:</span> {act.ad_id}</div>}
                        {!act.campaign_id && !act.adset_id && !act.ad_id && <span className="text-white/20">No detectado</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white/70">
                      {act.user_email}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          act.status === 'valid'
                            ? 'bg-[#2edb8e]/10 text-[#2edb8e] border border-[#2edb8e]/20'
                            : act.status === 'error_budget'
                            ? 'bg-[#ff477b]/10 text-[#ff477b] border border-[#ff477b]/20'
                            : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                        }`}
                      >
                        {act.status === 'valid'
                          ? '✓ Cumple'
                          : act.status === 'error_budget'
                          ? '⚠ Exceso Presupuesto'
                          : '✕ Nomenclatura Inválida'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {act.utm_url ? (
                        <button
                          onClick={() => handleCopy(act.utm_url, act.id)}
                          className="text-[#4f6bff] hover:text-white p-1 rounded transition-colors"
                          title="Copiar URL con UTM"
                        >
                          {copiedId === act.id ? <Check className="w-4 h-4 text-[#2edb8e]" /> : <Copy className="w-4 h-4" />}
                        </button>
                      ) : (
                        <span className="text-white/10">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
