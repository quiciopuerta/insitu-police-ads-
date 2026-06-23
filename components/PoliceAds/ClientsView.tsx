import React, { useState, useEffect } from 'react';
import { Users, Plus, MoreVertical, Loader2 } from 'lucide-react';
import { API_URL } from '../../utils/apiConfig';
import { AuthUser } from '../../types';

interface ClientsViewProps {
  currentUser: AuthUser;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ currentUser }) => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', contactPerson: '', monthlyBudget: '', brandProfileId: '' });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editClientId, setEditClientId] = useState<string | null>(null);

  const brandProfiles = Array.isArray(currentUser.brandProfiles) 
    ? currentUser.brandProfiles 
    : (currentUser.brandProfile && currentUser.brandProfile.brandName 
        ? [currentUser.brandProfile] 
        : []);

  const fetchClients = () => {
    setLoading(true);
    fetch(`${API_URL}/api-police-clients`, {
      headers: { 'X-User-Id': currentUser.id }
    })
      .then(res => res.json())
      .then(data => {
        setClients(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching clients:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchClients();
  }, [currentUser]);

  // Click handler to close open action menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!editClientId;
      const url = `${API_URL}/api-police-clients`;
      const method = isEdit ? 'PUT' : 'POST';
      const body: any = {
        name: formData.name,
        email: formData.email,
        contactPerson: formData.contactPerson,
        monthlyBudget: formData.monthlyBudget ? parseFloat(formData.monthlyBudget) : null,
        brandProfileId: formData.brandProfileId || null
      };

      if (isEdit) {
        body.id = editClientId;
      }

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(isEdit ? 'Failed to update client' : 'Failed to create client');
      
      setFormData({ name: '', email: '', contactPerson: '', monthlyBudget: '', brandProfileId: '' });
      setEditClientId(null);
      setShowForm(false);
      fetchClients();
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleEditClick = (client: any) => {
    setEditClientId(client.id);
    setFormData({
      name: client.name || '',
      email: client.email || '',
      contactPerson: client.contact_person || client.contactPerson || '',
      monthlyBudget: client.monthly_budget !== null && client.monthly_budget !== undefined 
        ? client.monthly_budget.toString() 
        : (client.monthlyBudget ? client.monthlyBudget.toString() : ''),
      brandProfileId: client.brand_profile_id || client.brandProfileId || '',
    });
    setShowForm(true);
    setActiveMenuId(null);
  };

  const handleDeleteClick = async (clientId: string) => {
    setActiveMenuId(null);
    if (!window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) return;
    try {
      const res = await fetch(`${API_URL}/api-police-clients?id=${clientId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': currentUser.id }
      });
      if (!res.ok) throw new Error('Failed to delete client');
      fetchClients();
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '', contactPerson: '', monthlyBudget: '', brandProfileId: '' });
    setEditClientId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#4f6bff]" />
            Clientes
          </h2>
          <p className="text-white/50 text-sm mt-1">Gestiona los clientes y sus presupuestos.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-magenta hover:bg-magenta/80 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative">
          <h3 className="text-lg font-bold text-white mb-4">{editClientId ? 'Editar Cliente' : 'Crear Cliente'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Tienda XYZ"
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#e5007d] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@example.com"
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#e5007d] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Contacto</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="Juan Pérez"
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#e5007d] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Presupuesto Mensual</label>
                <input
                  type="number"
                  value={formData.monthlyBudget}
                  onChange={(e) => setFormData({ ...formData, monthlyBudget: e.target.value })}
                  placeholder="5000"
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#e5007d] outline-none"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-white/70 mb-1">Vincular ADN de Marca (Brand Identity)</label>
                <select
                  value={formData.brandProfileId}
                  onChange={(e) => setFormData({ ...formData, brandProfileId: e.target.value })}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#e5007d] outline-none text-sm font-semibold"
                >
                  <option value="">-- Sin vincular (Modo Genérico) --</option>
                  {brandProfiles?.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.brandName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-[#e5007d] text-white rounded-lg hover:bg-[#c2006a] font-semibold text-sm"
              >
                {editClientId ? 'Guardar Cambios' : 'Crear Cliente'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
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
          <p className="text-white/60">Cargando clientes...</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="p-12 text-center bg-[#0b0e17] rounded-xl border border-white/5">
          <p className="text-white/60 mb-4">No hay clientes aún</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors text-white rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            Crear primer cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients?.map((client: any) => {
            const contactName = client.contact_person || client.contactPerson;
            const monthlyBudgetVal = client.monthly_budget !== null && client.monthly_budget !== undefined 
              ? client.monthly_budget 
              : client.monthlyBudget;

            return (
              <div
                key={client.id}
                className="bg-[#0b0e17] p-6 rounded-xl border border-white/5 shadow-sm hover:border-white/10 hover:bg-white/[0.02] transition-colors group relative"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{client.name}</h3>
                    {contactName && (
                      <p className="text-sm text-white/50">{contactName}</p>
                    )}
                    {(() => {
                      const linkedBrand = brandProfiles.find((p: any) => p.id === (client.brand_profile_id || client.brandProfileId));
                      return linkedBrand ? (
                        <span className="inline-block mt-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                          ADN: {linkedBrand.brandName}
                        </span>
                      ) : (
                        <span className="inline-block mt-1.5 text-[10px] bg-white/5 text-white/40 border border-white/10 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                          Modo Genérico
                        </span>
                      );
                    })()}
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === client.id ? null : client.id);
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                      title="Acciones"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {activeMenuId === client.id && (
                      <div 
                        className="absolute right-0 mt-1 w-32 bg-[#161b26] border border-white/10 rounded-lg shadow-xl py-1 z-30"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleEditClick(client)}
                          className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteClick(client.id)}
                          className="w-full text-left px-3 py-2 text-sm text-[#ff477b] hover:bg-[#ff477b]/10 transition-colors font-medium"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-white/70 mb-4">
                  {client.email && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Email:</span>
                      <span className="text-white font-medium">{client.email}</span>
                    </div>
                  )}
                  {monthlyBudgetVal !== null && monthlyBudgetVal !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-white/40">Presupuesto:</span>
                      <span className="text-[#2edb8e] font-medium">${monthlyBudgetVal}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-white/40">Cuentas:</span>
                    <span className="text-white font-medium">{client.accounts?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Campañas:</span>
                    <span className="text-white font-medium">{client._count?.campaigns || 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
