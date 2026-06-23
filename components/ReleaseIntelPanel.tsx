/**
 * ReleaseIntelPanel.tsx — "What's New" cinematic changelog drawer
 * Slides in from the right, showing the history of platform updates.
 */
import { useState, useEffect } from "react";
import type { PlatformUpdate, Language, AppNotification } from "../types";
import { releaseService } from "../services/releaseService";

interface ReleaseIntelPanelProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  userId?: string;
  userNotifications?: AppNotification[];
  onMarkRead?: (id: string) => void;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  major:      { label: "Major",    color: "#ff477b", bg: "#ff477b18", icon: "✦" },
  feature:    { label: "Feature",  color: "#7c3aed", bg: "#7c3aed18", icon: "⚡" },
  "ai-upgrade": { label: "AI",    color: "#00f1fd", bg: "#00f1fd18", icon: "🧠" },
  fix:        { label: "Fix",      color: "#10b981", bg: "#10b98118", icon: "🔧" },
};

function formatDate(ts: number, lang: Language) {
  return new Date(ts).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReleaseIntelPanel({ 
  isOpen, 
  onClose, 
  language, 
  userId,
  userNotifications = [],
  onMarkRead
}: ReleaseIntelPanelProps) {
  const [updates, setUpdates] = useState<PlatformUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'updates' | 'notifications'>('updates');

  const unreadPersonal = userNotifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!isOpen) return;
    
    // If there are unread notifications, default to that tab
    if (unreadPersonal > 0) {
      setActiveTab('notifications');
    } else {
      setActiveTab('updates');
    }

    setLoading(true);
    releaseService.getPublicChangelog().then((data) => {
      setUpdates(data);
      setLoading(false);
    });
    // Mark first unread platform update as read if userId present
    if (userId) {
      releaseService.checkPendingUpdate(userId).then((u) => {
        if (u) releaseService.markRead(userId, u.id, "release_panel");
      });
    }
  }, [isOpen, userId, unreadPersonal]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[9990] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-[9991] h-full w-full max-w-md bg-[#080e21] border-l transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col`}
        style={{
          borderColor: "rgba(255,71,123,0.15)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          boxShadow: isOpen ? "-20px 0 80px rgba(0,0,0,0.6)" : "none",
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#ff477b]">Release Intel</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#00f1fd] animate-pulse" />
            </div>
            <h2 className="text-lg font-black text-white tracking-tight">
              {language === "es" ? "¿Qué hay de nuevo?" : "What's New?"}
            </h2>
            <p className="text-[11px] text-white/40 mt-0.5">
              {language === "es" ? "Historial de actualizaciones de la plataforma" : "Platform update history"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-all text-lg"
          >×</button>
        </div>

        {/* Tabs */}
        <div className="px-6 flex border-b border-white/5 shrink-0">
          <button
            onClick={() => setActiveTab('updates')}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all relative ${
              activeTab === 'updates' ? "text-white" : "text-white/30 hover:text-white/50"
            }`}
          >
            {language === "es" ? "Actualizaciones" : "Updates"}
            {activeTab === 'updates' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#ff477b]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all relative flex items-center justify-center gap-2 ${
              activeTab === 'notifications' ? "text-white" : "text-white/30 hover:text-white/50"
            }`}
          >
            {language === "es" ? "Notificaciones" : "Notifications"}
            {unreadPersonal > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff477b] animate-pulse" />
            )}
            {activeTab === 'notifications' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#00f1fd]" />
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex flex-col gap-3 mt-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : activeTab === 'updates' ? (
            updates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-4xl mb-4">🚀</span>
                <p className="text-white/40 text-sm font-bold uppercase tracking-widest">
                  {language === "es" ? "Próximamente novedades" : "Updates coming soon"}
                </p>
              </div>
            ) : (
              updates.map((u, idx) => {
                const cfg = TYPE_CONFIG[u.type] || TYPE_CONFIG.feature;
                const title = language === "es" ? u.title_es : (u.title_en || u.title_es);
                const description = language === "es" ? u.description_es : (u.description_en || u.description_es);
                const isFirst = idx === 0;

                return (
                  <div
                    key={u.id}
                    className="relative rounded-2xl border p-4 transition-all hover:border-white/10 group"
                    style={{
                      background: isFirst ? `linear-gradient(135deg, ${cfg.bg}, transparent)` : "rgba(255,255,255,0.02)",
                      borderColor: isFirst ? `${cfg.color}33` : "rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Latest badge */}
                    {isFirst && (
                      <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                        style={{ background: cfg.color, color: "#fff" }}>
                        {language === "es" ? "Último" : "Latest"}
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cfg.icon}</span>
                        <span
                          className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider"
                          style={{ color: cfg.color, background: cfg.bg }}
                        >{cfg.label}</span>
                        <span className="text-[10px] font-mono text-white/30">v{u.version}</span>
                      </div>
                      <span className="text-[10px] text-white/25 shrink-0">{formatDate(u.published_at, language)}</span>
                    </div>

                    <h3 className="text-sm font-black text-white mb-1.5">{title}</h3>
                    <p className="text-[12px] text-white/50 leading-relaxed line-clamp-2">{description}</p>

                    {u.preview_url && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-white/5 h-24">
                        <img src={u.preview_url} alt={title} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity" />
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : (
            /* Notifications List */
            userNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-white/40 text-sm font-bold uppercase tracking-widest">
                  {language === "es" ? "No hay notificaciones" : "No notifications yet"}
                </p>
                <p className="text-[10px] text-white/20 mt-2 max-w-[200px]">
                  {language === "es" ? "Te avisaremos cuando haya nuevos insights de tus campañas." : "We'll notify you when new campaign insights are ready."}
                </p>
              </div>
            ) : (
              [...userNotifications].sort((a,b) => b.createdAt - a.createdAt).map((n) => {
                const isInsight = n.type === 'weekly-insights' || n.type === 'competitor';
                const isOptimization = n.type === 'optimization-tip';
                
                return (
                  <div
                    key={n.id}
                    className={`relative rounded-2xl border p-4 transition-all ${
                      !n.read ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-transparent opacity-60"
                    }`}
                  >
                    {!n.read && (
                      <div className="absolute top-4 right-4">
                        <button 
                          onClick={() => onMarkRead?.(n.id)}
                          className="text-[9px] font-black uppercase tracking-widest text-[#00f1fd] hover:text-white transition-colors"
                        >
                          {language === "es" ? "Marcar como leída" : "Mark as read"}
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${!n.read ? "bg-[#ff477b] animate-pulse" : "bg-white/20"}`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${
                        isInsight ? "text-magenta-500" : isOptimization ? "text-amber-500" : "text-cyan-500"
                      }`}>
                        {n.type.replace(/-/g, ' ')}
                      </span>
                      <span className="text-[10px] text-white/20 ml-auto">{formatDate(n.createdAt, language)}</span>
                    </div>

                    <h3 className={`text-sm font-bold mb-1 ${!n.read ? "text-white" : "text-white/70"}`}>{n.title}</h3>
                    <p className="text-[12px] text-white/50 leading-relaxed mb-3">{n.message}</p>

                    {n.ctaUrl && (
                      <a 
                        href={n.ctaUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
                      >
                        {language === "es" ? "Ver detalles" : "View details"}
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </a>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 shrink-0">
          <p className="text-[10px] text-white/20 text-center">
            INsitu AI · Release Intelligence Hub
          </p>
        </div>
      </div>
    </>
  );
}
