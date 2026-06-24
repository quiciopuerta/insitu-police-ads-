import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Globe, Loader2, Link as LinkIcon } from 'lucide-react';
import { API_URL } from '../../utils/apiConfig';
import { AuthUser } from '../../types';

interface AccountsViewProps {
  currentUser: AuthUser;
}

const PLATFORMS = [
  { id: 'meta', name: 'Meta Ads', icon: '📘' },
  { id: 'google', name: 'Google Ads', icon: '🔍' },
  { id: 'dv360', name: 'DV360', icon: '📊' },
  { id: 'tiktok', name: 'TikTok Ads', icon: '🎵' },
  { id: 'pinterest', name: 'Pinterest', icon: '📌' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'snapchat', name: 'Snapchat', icon: '👻' },
  { id: 'x', name: 'X Ads', icon: '𝕏' },
  { id: 'amazon', name: 'Amazon Ads', icon: '🛍️' },
];

export const AccountsView: React.FC<AccountsViewProps> = ({ currentUser }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    platform: '',
    accountId: '',
    accountName: '',
    email: '',
    accessToken: '',
  });

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api-police-accounts`, { headers: { 'X-User-Id': currentUser.id } }).then(res => res.json()),
      fetch(`${API_URL}/api-police-clients`, { headers: { 'X-User-Id': currentUser.id } }).then(res => res.json())
    ])
      .then(([aData, cData]) => {
        setAccounts(Array.isArray(aData) ? aData : []);
        setClients(Array.isArray(cData) ? cData : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching accounts:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.platform) {
      alert('Selecciona cliente y plataforma');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api-police-accounts-create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create account');
      
      setFormData({ clientId: '', platform: '', accountId: '', accountName: '', email: '', accessToken: '' });
      setShowForm(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
    }
  };

  const deleteAccount = async (accountId: string) => {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    try {
      const res = await fetch(`${API_URL}/api-police-accounts/${accountId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': currentUser.id }
      });
      if (!res.ok) throw new Error('Failed to delete');
      fetchData();
    } catch (error: any) {
      console.error(error);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-[#2edb8e]/20 text-[#2edb8e]';
      case 'pending': return 'bg-yellow-500/20 text-yellow-500';
      case 'error': return 'bg-[#ff477b]/20 text-[#ff477b]';
      default: return 'bg-white/10 text-white/60';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#4f6bff]" />
            Cuentas por Plataforma
          </h2>
          <p className="text-white/50 text-sm mt-1">Administra múltiples cuentas de advertising para tus clientes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-magenta hover:bg-magenta/80 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Agregar Cuenta
        </button>
      </div>

      <div className="bg-[#4f6bff]/10 border border-[#4f6bff]/20 rounded-xl p-4 flex gap-4">
        <div className="bg-[#4f6bff]/20 p-2 rounded-lg h-fit">
          <Globe className="w-5 h-5 text-[#4f6bff]" />
        </div>
        <div>
          <h3 className="font-bold text-[#4f6bff] text-sm mb-1">¿Cómo funciona?</h3>
          <p className="text-white/60 text-xs leading-relaxed">
            Una <strong>Agencia</strong> tiene múltiples <strong>Clientes</strong>.
            Cada cliente puede tener múltiples <strong>Cuentas</strong> en diferentes plataformas
            (Meta, Google, TikTok, etc.). Cada cuenta puede tener múltiples <strong>Campañas</strong>.
          </p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative">
          <h3 className="text-lg font-bold text-white mb-4">Agregar Nueva Cuenta</h3>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Cliente</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#e5007d] outline-none"
                  required
                >
                  <option value="" className="bg-[#0b0e17]">Selecciona cliente...</option>
                  {(Array.isArray(clients) ? clients : []).map(c => (
                    <option key={c.id} value={c.id} className="bg-[#0b0e17]">{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Plataforma</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#e5007d] outline-none"
                  required
                >
                  <option value="" className="bg-[#0b0e17]">Selecciona plataforma...</option>
                  {(Array.isArray(PLATFORMS) ? PLATFORMS : []).map(p => (
                    <option key={p.id} value={p.id} className="bg-[#0b0e17]">{p.icon} {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">ID de la Cuenta</label>
                <input
                  type="text"
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  placeholder="Ej: act_123456789"
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#e5007d] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Nombre Descriptivo</label>
                <input
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  placeholder="Cuenta Principal"
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#e5007d] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Email / Login (Opcional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@empresa.com"
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#e5007d] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Token (Opcional)</label>
                <input
                  type="text"
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                  placeholder="EAAI..."
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#e5007d] outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#e5007d] text-white rounded-lg hover:bg-[#c2006a] font-semibold text-sm"
              >
                Vincular Cuenta
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center bg-[#0b0e17] rounded-xl border border-white/5">
          <Loader2 className="w-8 h-8 animate-spin text-white/20 mx-auto mb-3" />
          <p className="text-white/60">Cargando cuentas...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="p-12 text-center bg-[#0b0e17] rounded-xl border border-white/5">
          <p className="text-white/60 mb-4">No hay cuentas vinculadas</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors text-white rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            Vincular primera cuenta
          </button>
        </div>
      ) : (
        <div className="bg-[#0b0e17] rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="px-6 py-3 font-medium">Plataforma</th>
                <th className="px-6 py-3 font-medium">Cliente</th>
                <th className="px-6 py-3 font-medium">Nombre de Cuenta</th>
                <th className="px-6 py-3 font-medium">ID / Acceso</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(Array.isArray(accounts) ? accounts : []).map(account => (
                <tr key={account.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-2 text-white">
                      {PLATFORMS.find(p => p.id === account.platform)?.icon || '📱'}{' '}
                      {PLATFORMS.find(p => p.id === account.platform)?.name || account.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white/80">{account.client?.name || '-'}</td>
                  <td className="px-6 py-4 font-medium text-white">{account.accountName}</td>
                  <td className="px-6 py-4">
                    <div className="text-white/80">{account.accountId}</div>
                    {account.email && <div className="text-xs text-white/40">{account.email}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(account.status)}`}>
                      {account.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => deleteAccount(account.id)}
                      className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-[#ff477b] transition-colors"
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
