import React from "react";
import { AuthUser, Language } from "../types";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasResult: boolean;
  onToggleHistory: () => void;
  historyCount: number;
  currentUser: AuthUser | null;
  onLogout: () => void;
  onLogin: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  unreadCount: number;
  theme: "dark" | "light";
  onThemeToggle: () => void;
  onFeatureTabChange?: (tab: string) => void;
  featureTab?: string | null;
  onToggleUpdates?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
  onLogout,
  onLogin,
  onOpenAdmin,
  onOpenProfile,
  language,
}) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superAdmin' || currentUser?.email === 'admin@insitu.ai';
  const isSuperAdmin = currentUser?.role === 'superAdmin' || currentUser?.email === 'admin@insitu.ai';

  const navigationMenu = [
    {
      label: language === 'es' ? 'Platform' : 'Platform',
      items: [
        { id: 'main-platform', icon: 'arrow_back', label: language === 'es' ? 'Volver a INsitu AI' : 'Back to INsitu AI', color: 'text-slate-400', url: 'https://insitu.company' }
      ]
    },
    {
      label: language === 'es' ? 'Herramientas' : 'Tools',
      items: [
        { id: 'police-ads', icon: 'local_police', label: 'Police Ads', color: 'text-red-400' },
        { id: 'scripts', icon: 'code', label: 'Script Gen', color: 'text-lime-400' },
      ]
    }
  ];
  const handleTabClick = (item: any, e: React.MouseEvent) => {
    e.preventDefault();
    if (item.url) {
      window.open(item.url, '_self');
      return;
    }
    onTabChange(item.id);
  };

  const plan = currentUser?.subscription?.plan;
  const planColors: Record<string, string> = {
    Agency: 'text-amber-400',
    Growth: 'text-cyan',
    Starter: 'text-violet-400',
  };
  const planColor = planColors[plan || ''] || 'text-slate-400';

  return (
    <aside className="relative z-20 w-[260px] h-full flex flex-col shrink-0 glass-panel border-r border-white/[0.06]">
      {/* Brand Header */}
      <div className="px-6 pt-7 pb-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-magenta to-fuchsia-600 flex items-center justify-center shadow-glow-magenta shrink-0">
            <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          </div>
          <div>
            <div className="text-[13px] font-black tracking-tighter text-white leading-none">INsitu Police Ads</div>
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-white/25 mt-0.5">Policy & Compliance</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            <h4 className="px-3 mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">
              {group.label}
            </h4>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => handleTabClick(item, e)}
                    className={`nav-item ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
                  >
                    <span className={`material-symbols-outlined text-[18px] transition-all duration-200 shrink-0 ${isActive ? 'text-magenta scale-110' : item.color + '/60'}`}
                      style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                      {item.icon}
                    </span>
                    <span className={`text-[12px] font-semibold leading-none ${isActive ? 'font-bold' : ''}`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-magenta shadow-[0_0_6px_rgba(255,71,123,0.9)]" />
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-white/[0.05]">
        {currentUser ? (
          <div className="space-y-3">
            <div
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/[0.04]"
              onClick={onOpenProfile}
            >
              <div className="relative shrink-0">
                <img
                  src={currentUser.picture || `https://ui-avatars.com/api/?name=${currentUser.username}&background=6d28d9&color=fff`}
                  alt="User"
                  className="w-9 h-9 rounded-xl object-cover border border-white/10"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-cyan border-2 border-[#020617]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black text-white truncate uppercase tracking-wide leading-none">{currentUser.username}</p>
                <p className={`text-[9px] font-black uppercase tracking-wider mt-1 ${planColor}`}>{plan || 'FREE'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenProfile}
                className="py-2 text-[11px] font-bold rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 transition-all border border-white/[0.06]"
              >
                {language === 'es' ? 'Perfil' : 'Profile'}
              </button>
              <button
                onClick={onLogout}
                className="py-2 text-[11px] font-bold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all border border-rose-500/10"
              >
                {language === 'es' ? 'Salir' : 'Logout'}
              </button>
            </div>
            {isAdmin && (
              <button
                onClick={onOpenAdmin}
                className="w-full py-2 text-[11px] font-bold rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 transition-all border border-violet-500/10 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
                Control Panel
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-magenta/90 to-fuchsia-600/90 hover:from-magenta hover:to-fuchsia-500 text-white text-[12px] font-black shadow-glow-magenta transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-sm">login</span>
            {language === 'es' ? 'Acceder' : 'Login'}
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
