import React, { useState, useEffect } from "react";
import { releaseService } from "../services/releaseService";
import { PlatformUpdate, PlatformUpdateType, User } from "../types";

const UPDATE_TYPES: { value: PlatformUpdateType; label: string; icon: string }[] = [
  { value: "major", label: "Gran Lanzamiento", icon: "✨" },
  { value: "feature", label: "Nueva Función", icon: "🚀" },
  { value: "ai-upgrade", label: "Mejora IA", icon: "🧠" },
  { value: "fix", label: "Optimización / Fix", icon: "🔧" },
];

interface AdminReleaseManagerProps {
  language: "es" | "en";
  currentUser: User;
}

const AdminReleaseManager: React.FC<AdminReleaseManagerProps> = ({ language, currentUser }) => {
  const [updates, setUpdates] = useState<PlatformUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [adminSecret] = useState(() => localStorage.getItem("ADMIN_SECRET") || "");

  // Form State
  const [formData, setFormData] = useState({
    version: "",
    type: "feature" as PlatformUpdateType,
    titleEs: "",
    titleEn: "",
    descriptionEs: "",
    descriptionEn: "",
    previewUrl: "",
    featureTab: "",
    ctaUrl: "",
  });

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    setLoading(true);
    const data = await releaseService.adminGetAll(adminSecret);
    setUpdates(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.version || !formData.titleEs || !formData.descriptionEs) {
      alert("Faltan campos obligatorios");
      return;
    }

    setPublishing(true);
    const res = await releaseService.adminPublish(adminSecret, {
      ...formData,
      createdBy: currentUser.email || "admin",
      segments: ["active", "trial_active", "trial_expired", "free"], // Broadcast a todos por defecto
    });

    if (res.ok) {
      alert("Update publicado y Mail Broadcast iniciado.");
      setFormData({
        version: "",
        type: "feature",
        titleEs: "",
        titleEn: "",
        descriptionEs: "",
        descriptionEn: "",
        previewUrl: "",
        featureTab: "",
        ctaUrl: "",
      });
      loadUpdates();
    } else {
      alert("Error al publicar.");
    }
    setPublishing(false);
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("¿Seguro que quieres desactivar este update? Dejará de aparecer a nuevos usuarios.")) return;
    await releaseService.adminDeactivate(adminSecret, id);
    loadUpdates();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
      {/* Formulario de Publicación */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-3xl p-8 shadow-xl">
        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
          <span className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">📣</span>
          Nuevo Platform Update
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Versión</label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="v2.4.0"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as PlatformUpdateType })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500/50 outline-none transition-colors"
              >
                {UPDATE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
              <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Contenido Español (Primario)</p>
              <input
                type="text"
                value={formData.titleEs}
                onChange={(e) => setFormData({ ...formData, titleEs: e.target.value })}
                placeholder="Título en Español"
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white outline-none"
              />
              <textarea
                value={formData.descriptionEs}
                onChange={(e) => setFormData({ ...formData, descriptionEs: e.target.value })}
                placeholder="Descripción detallada de la novedad..."
                rows={3}
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white outline-none resize-none"
              />
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4 opacity-70 focus-within:opacity-100 transition-opacity">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Content English (Optional)</p>
              <input
                type="text"
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                placeholder="English Title"
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white outline-none"
              />
              <textarea
                value={formData.descriptionEn}
                onChange={(e) => setFormData({ ...formData, descriptionEn: e.target.value })}
                placeholder="English description..."
                rows={3}
                className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white outline-none resize-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Media & Redirection</label>
            <input
              type="text"
              value={formData.previewUrl}
              onChange={(e) => setFormData({ ...formData, previewUrl: e.target.value })}
              placeholder="Preview Image URL (GCS/Cloudinary)"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={formData.featureTab}
                onChange={(e) => setFormData({ ...formData, featureTab: e.target.value })}
                placeholder="Tab ID (e.g. video-lab)"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
              />
              <input
                type="text"
                value={formData.ctaUrl}
                onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                placeholder="CTA Link Override"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={publishing}
            className="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all"
          >
            {publishing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>🚀 PUBLICAR & NOTIFICAR</>
            )}
          </button>
        </form>
      </div>

      {/* Historial y Stats */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-3xl p-8 overflow-hidden flex flex-col min-h-[600px]">
        <h3 className="text-xl font-black text-white mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">📈</span>
            Últimos Lanzamientos
          </div>
          <button onClick={loadUpdates} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <svg className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </h3>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {updates.length === 0 && !loading && (
            <div className="text-center py-20 text-slate-500 italic">No hay actualizaciones publicadas.</div>
          )}

          {updates.map((upd) => (
            <div key={upd.id} className={`p-5 rounded-2xl border ${upd.is_active ? 'border-white/5 bg-white/5' : 'border-rose-500/20 bg-rose-500/5 opacity-60'} transition-all`}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded tracking-widest">{upd.version}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{upd.type}</span>
                  </div>
                  <h4 className="text-white font-bold truncate">{upd.title_es}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{new Date(upd.published_at).toLocaleString()}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {upd.is_active && (
                    <button 
                      onClick={() => handleDeactivate(upd.id)}
                      className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors"
                      title="Desactivar"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-black/40 rounded-xl p-3 border border-white/5 text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Enviados</p>
                  <p className="text-lg font-bold text-white">{upd.emails_sent || 0}</p>
                </div>
                <div className="bg-black/40 rounded-xl p-3 border border-white/5 text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Aperturas</p>
                  <p className="text-lg font-bold text-emerald-400">{upd.emails_opened || 0}</p>
                </div>
                <div className="bg-black/40 rounded-xl p-3 border border-white/5 text-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase">CTR Web</p>
                  <p className="text-lg font-bold text-blue-400">
                    {upd.emails_sent ? Math.round(((upd.reads_count || 0) / upd.emails_sent) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminReleaseManager;
