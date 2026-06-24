import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Loader2, Shield, Mail, CheckCircle, AlertTriangle, Briefcase, Settings } from 'lucide-react';
import { API_URL } from '../../utils/apiConfig';
import { AuthUser } from '../../types';

interface UsersViewProps {
  currentUser: AuthUser;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null); // For assignments modal
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    role: 'mediaPlanner',
    username: ''
  });

  const [assignmentsData, setAssignmentsData] = useState({
    assignedClients: [] as string[],
    assignedAccounts: [] as string[]
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { 'X-User-Id': currentUser.id };
      const [resUsers, resClients, resAccounts] = await Promise.all([
        fetch(`${API_URL}/api-police-users`, { headers }),
        fetch(`${API_URL}/api-police-clients`, { headers }),
        fetch(`${API_URL}/api-police-accounts`, { headers })
      ]);
      
      if (!resUsers.ok) throw new Error('No se pudieron obtener los colaboradores.');
      
      const [uData, cData, aData] = await Promise.all([
        resUsers.json(), resClients.json(), resAccounts.json()
      ]);
      
      setUsers(Array.isArray(uData) ? uData : []);
      setClients(Array.isArray(cData) ? cData : []);
      setAccounts(Array.isArray(aData) ? aData : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al obtener la lista de usuarios o datos base.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_URL}/api-police-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          role: formData.role,
          username: formData.username.trim() || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al invitar al colaborador.');
      }

      setSuccess(`¡Colaborador invitado con éxito! Contraseña temporal: ${data.tempPassword || 'Enviada por correo'}`);
      setFormData({ email: '', role: 'mediaPlanner', username: '' });
      setShowForm(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAssignments = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_URL}/api-police-users`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({
          targetUserId: editingUser.id,
          assignedClients: assignmentsData.assignedClients,
          assignedAccounts: assignmentsData.assignedAccounts
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar asignaciones.');
      }

      setSuccess('Asignaciones actualizadas correctamente.');
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al guardar asignaciones.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a ${email} de tu organización?`)) return;
    
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/api-police-users?id=${userId}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': currentUser.id }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar al colaborador.');
      }

      setSuccess('Colaborador eliminado de la organización correctamente.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuario.');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
      case 'superAdmin':
        return <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Director</span>;
      case 'trafficker':
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Trafiker</span>;
      case 'mediaPlanner':
      default:
        return <span className="bg-[#4f6bff]/20 text-[#4f6bff] border border-[#4f6bff]/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Planner</span>;
    }
  };

  const toggleClientAssignment = (clientId: string) => {
    setAssignmentsData(prev => ({
      ...prev,
      assignedClients: prev.assignedClients.includes(clientId)
        ? prev.assignedClients.filter(id => id !== clientId)
        : [...prev.assignedClients, clientId]
    }));
  };

  const toggleAccountAssignment = (accountId: string) => {
    setAssignmentsData(prev => ({
      ...prev,
      assignedAccounts: prev.assignedAccounts.includes(accountId)
        ? prev.assignedAccounts.filter(id => id !== accountId)
        : [...prev.assignedAccounts, accountId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#4f6bff]" />
            Equipo y Colaboradores
          </h2>
          <p className="text-white/50 text-sm mt-1">Gestiona los Directores, Planners y Trafikers autorizados.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#4f6bff] hover:bg-[#4f6bff]/80 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Invitar Colaborador
        </button>
      </div>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <p className="font-semibold">{success}</p>
        </div>
      )}

      {error && (
        <div className="bg-[#ff477b]/10 border border-[#ff477b]/20 text-[#ff477b] px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-[#0b0e17] border border-white/5 p-6 rounded-2xl relative shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-4">Invitar Nuevo Colaborador</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-white/50 mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="ej: juanperez"
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#4f6bff] outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-white/50 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="colaborador@agencia.com"
                  required
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#4f6bff] outline-none text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-white/50 mb-1">Rol / Privilegio</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-black/20 border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-[#4f6bff] outline-none text-sm font-semibold"
                >
                  <option value="admin">Director (Acceso Total)</option>
                  <option value="mediaPlanner">Planner (Crear campañas y políticas)</option>
                  <option value="trafficker">Trafiker (Solo lectura políticas)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-white/10 text-white/70 hover:bg-white/5 rounded-lg text-sm font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#4f6bff] hover:bg-[#4f6bff]/80 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Invitando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Enviar Invitación
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Asignaciones */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0b0e17] border-b border-white/10 p-6 flex items-center justify-between z-10">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#4f6bff]" />
                  Asignar Cuentas a {editingUser.username || editingUser.email}
                </h3>
                <p className="text-white/50 text-sm mt-1">
                  Selecciona a qué clientes y cuentas específicas tiene acceso este {editingUser.role === 'trafficker' ? 'Trafiker' : 'Planner'}.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAssignments} className="p-6 space-y-6">
              <div>
                <h4 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Clientes Asignados
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {clients.map(client => (
                    <label key={client.id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <input
                        type="checkbox"
                        checked={assignmentsData.assignedClients.includes(client.id)}
                        onChange={() => toggleClientAssignment(client.id)}
                        className="w-4 h-4 bg-black border-white/20 rounded text-[#4f6bff] focus:ring-[#4f6bff]"
                      />
                      <span className="text-sm text-white font-medium">{client.name}</span>
                    </label>
                  ))}
                  {clients.length === 0 && <p className="text-white/40 text-xs">No hay clientes creados.</p>}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Cuentas Publicitarias Asignadas
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {accounts.map(acc => (
                    <label key={acc.id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <input
                        type="checkbox"
                        checked={assignmentsData.assignedAccounts.includes(acc.id)}
                        onChange={() => toggleAccountAssignment(acc.id)}
                        className="w-4 h-4 bg-black border-white/20 rounded text-[#4f6bff] focus:ring-[#4f6bff]"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm text-white font-medium">{acc.accountName}</span>
                        <span className="text-[10px] text-white/50">{acc.client?.name} • {acc.platform}</span>
                      </div>
                    </label>
                  ))}
                  {accounts.length === 0 && <p className="text-white/40 text-xs">No hay cuentas conectadas.</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-white/10 text-white hover:bg-white/5 rounded-lg text-sm font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#4f6bff] hover:bg-[#4f6bff]/80 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Guardar Asignaciones
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-[#4f6bff] mb-3" />
          <p className="text-xs uppercase tracking-widest font-black">Cargando Colaboradores...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02] flex flex-col items-center justify-center">
          <Users className="w-12 h-12 text-white/20 mb-3" />
          <p className="text-white/60 text-sm font-bold">No hay otros colaboradores en tu organización.</p>
          <p className="text-white/40 text-xs mt-1">Invita a tus planners y traficantes para que utilicen la extensión corporativa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Array.isArray(users) ? users : []).map((u) => (
            <div key={u.id} className="bg-[#0b0e17] rounded-2xl border border-white/5 p-5 relative overflow-hidden group shadow-lg flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4f6bff]/20 to-[#4f6bff]/10 border border-white/10 flex items-center justify-center font-bold text-white uppercase text-sm">
                      {u.username ? u.username[0] : (u.email ? u.email[0] : '?')}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{u.username || 'Colaborador'}</h4>
                      <p className="text-xs text-white/40 font-medium truncate max-w-[180px]">{u.email}</p>
                    </div>
                  </div>
                  {getRoleBadge(u.role)}
                </div>

                <div className="text-[11px] text-white/50 flex items-center gap-1.5 pt-1">
                  <Shield className="w-3.5 h-3.5 text-white/30" />
                  <span>Estado: <strong>{u.approvalStatus === 'approved' ? 'Activo' : 'Invitado'}</strong></span>
                </div>
              </div>

              {u.id !== currentUser.id && (
                <div className="flex justify-between border-t border-white/5 pt-3 mt-4">
                  {u.role !== 'admin' && u.role !== 'superAdmin' && (
                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setAssignmentsData({
                          assignedClients: u.assignedClients || [],
                          assignedAccounts: u.assignedAccounts || []
                        });
                      }}
                      className="text-[#4f6bff] hover:bg-[#4f6bff]/10 px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Asignar Cuentas
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteUser(u.id, u.email)}
                    className="text-[#ff477b] hover:bg-[#ff477b]/10 p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ml-auto"
                    title="Remover de la organización"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

