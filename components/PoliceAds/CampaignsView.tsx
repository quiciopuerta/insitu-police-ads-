import React, { useState } from 'react';
import { Plus, CheckCircle2, AlertCircle, Loader2, Upload } from 'lucide-react';
import { CampaignForm } from './CampaignForm';
import { CampaignsCSVUploader } from './CampaignsCSVUploader';
import { AuthUser } from '../../types';

export const CampaignsView: React.FC<{ campaigns: any[]; loading: boolean; currentUser: AuthUser }> = ({ campaigns, loading, currentUser }) => {
  const [showForm, setShowForm] = useState(false);
  const [showCSV, setShowCSV] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Campañas</h2>
          <p className="text-white/50 text-sm mt-1">Gestiona y valida tus campañas de paid media</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCSV(true)}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            Importar CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-magenta hover:bg-magenta/80 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Campaña
          </button>
        </div>
      </div>

      {showCSV && (
        <CampaignsCSVUploader 
          currentUser={currentUser}
          onSuccess={() => setShowCSV(false)}
          onCancel={() => setShowCSV(false)}
        />
      )}

      {showForm && (
        <div className="bg-[#111522] border border-white/10 p-6 rounded-xl relative">
          <h3 className="text-xl font-bold text-white mb-6">Crear Nueva Campaña</h3>
          <CampaignForm 
            currentUser={currentUser}
            onSuccess={() => setShowForm(false)} 
            onCancel={() => setShowForm(false)} 
          />
        </div>
      )}

      <div className="bg-[#0b0e17] rounded-xl shadow-sm border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-white/20 mx-auto mb-3" />
            <p className="text-white/60">Cargando campañas...</p>
          </div>
        ) : campaigns?.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-white/60">No hay campañas registradas aún. ¡Crea la primera!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-white/70">Nombre</th>
                  <th className="px-6 py-3 text-left font-semibold text-white/70">Plataforma</th>
                  <th className="px-6 py-3 text-left font-semibold text-white/70">Presupuesto</th>
                  <th className="px-6 py-3 text-left font-semibold text-white/70">Estado</th>
                  <th className="px-6 py-3 text-left font-semibold text-white/70">Fecha / Hora</th>
                  <th className="px-6 py-3 text-left font-semibold text-white/70">Validación</th>
                  <th className="px-6 py-3 text-left font-semibold text-white/70">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(Array.isArray(campaigns) ? campaigns : []).map((campaign: any) => (
                  <tr key={campaign.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{campaign.name || campaign.campaign_name}</p>
                        <p className="text-xs text-white/40 mt-1">
                          {campaign.country || 'N/A'} • {campaign.channel || 'N/A'} • {campaign.objective || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/80">
                        {campaign.platform === 'meta' ? 'Meta Ads' : 'Google Ads'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white">${campaign.budget}</p>
                      <p className="text-xs text-white/40">Max: ${campaign.max_budget_allowed || campaign.budget}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          campaign.status === 'active'
                            ? 'bg-[#2edb8e]/20 text-[#2edb8e]'
                            : campaign.status === 'draft'
                            ? 'bg-yellow-500/20 text-yellow-500'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white/80">
                        {campaign.created_at ? new Date(campaign.created_at).toLocaleString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#2edb8e]/20 text-[#2edb8e] font-semibold text-xs">
                            <CheckCircle2 className="w-4 h-4" />
                            Válida
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-magenta hover:text-white font-semibold text-xs transition-colors">
                        Validar
                      </button>
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
