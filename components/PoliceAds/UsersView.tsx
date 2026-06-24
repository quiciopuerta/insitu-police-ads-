import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Loader2, Shield, Mail, CheckCircle, AlertTriangle } from 'lucide-react';
import { API_URL } from '../../utils/apiConfig';
import { AuthUser } from '../../types';

interface UsersViewProps {
  currentUser: AuthUser;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    role: 'mediaPlanner',
    username: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api-police-users`, {
        headers: { 'X-User-Id': currentUser.id }
      });
      if (!res.ok) throw new Error('No se pudieron obtener los colaboradores.');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al obtener la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud.');
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
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar usuario.');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
      case 'superAdmin':
        return <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Administrador</span>;
      case 'auditor':
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Auditor</span>;
      case 'mediaPlanner':
      default:
        return <span className="bg-[#4f6bff]/20 text-[#4f6bff] border border-[#4f6bff]/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Planner</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#4f6bff]" />
            Equipo y Colaboradores
          </h2>
          <p className="text-white/50 text-sm mt-1">Gestiona los Media Planners y Auditores autorizados en la gobernanza.</p>
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
                <label className="block text-xs font-black uppercase tracking-wider text-white/50 mb-1">Nombre de Usuario (Opcional)</label>
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
                  placeholder="planner@empresa.com"
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
                  <option value="mediaPlanner">Media Planner</option>
                  <option value="auditor">Auditor (Verificación)</option>
                  <option value="admin">Administrador de la Cuenta</option>
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-white/40">
          <Loader2 className="w-8 h-8 animate-spin text-[#4f6bff] mb-3" />
          <p className="text-xs uppercase tracking-widest font-black">Cargando Colaboradores...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02] flex flex-col items-center justify-center">
          <Users className="w-12 h-12 text-white/20 mb-3" />
          <p className="text-white/60 text-sm font-bold">No hay otros colaboradores en tu organización.</p>
          <p className="text-white/40 text-xs mt-1">Invita a tus planners y auditores para que utilicen la extensión corporativa.</p>
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
                <div className="flex justify-end border-t border-white/5 pt-3 mt-4">
                  <button
                    onClick={() => handleDeleteUser(u.id, u.email)}
                    className="text-[#ff477b] hover:bg-[#ff477b]/10 p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                    title="Remover de la organización"
                  >
                    <Trash2 className="w-4 h-4" />
                    Quitar Miembro
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
