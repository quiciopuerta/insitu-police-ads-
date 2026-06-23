import React, { useState, useRef, useEffect } from 'react';
import { AuthUser, Language } from '../../types';
import { userService } from '../../services/auth/userService';
import { LayoutGrid, Globe, ShieldCheck } from 'lucide-react';

interface ProfileSelectorProps {
  currentUser: AuthUser | null;
  theme: 'dark' | "light";
  language?: Language;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({ currentUser, theme, language = 'es' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const profiles = (currentUser?.brandProfiles && Array.isArray(currentUser.brandProfiles)) 
    ? currentUser.brandProfiles 
    : [];
  const activeProfile = userService.getCurrentProfile();
  
  const handleSelect = (id: string | undefined) => {
    if (!id) return;
    userService.setSelectedProfile(id);
    setIsOpen(false);
    // Force a small delay then reload to ensure settings are fresh
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!currentUser || profiles.length <= 1) return null;

  return (
    <div className="relative group h-full flex items-center" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-3 px-4 py-2 rounded-2xl border transition-all shadow-lg active:scale-95 ${
          theme === 'dark' 
            ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white shadow-black/20' 
            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-900 shadow-slate-200/50'
        }`}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-magenta/40 blur-md rounded-full animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-magenta relative z-10" />
        </div>
        <div className="flex flex-col items-start translate-y-[1px]">
          <span className={`text-[9px] font-black uppercase tracking-[0.2em] opacity-40 leading-none mb-1`}>
            Active Profile
          </span>
          <span className="text-[11px] font-black uppercase tracking-widest truncate max-w-[140px] leading-none">
            {activeProfile?.brandName || 'Default'}
          </span>
        </div>
        <svg className={`w-3 h-3 transition-transform duration-500 ease-out ${isOpen ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-white/20' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute top-[calc(100%+1rem)] left-0 w-72 rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.8)] border p-3 z-[100] animate-in fade-in slide-in-from-top-4 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
          theme === 'dark' ? 'bg-slate-950/95 backdrop-blur-3xl border-white/10 shadow-black' : 'bg-white border-slate-200 shadow-slate-300/50'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-magenta/5 via-transparent to-cyan/5 pointer-events-none" />
          
          <div className="px-5 py-3 mb-2 flex items-center gap-3 relative z-10">
            <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme === 'dark' ? 'text-white/20' : 'text-slate-400'}`}>
              Platform Context
            </span>
            <div className={`h-px flex-1 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`} />
          </div>
          
          <div className="max-h-80 overflow-y-auto space-y-1 px-1 custom-scrollbar relative z-10">
            {/* Global Context Option for Admins */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'superAdmin') && (
              <button
                onClick={() => handleSelect('global')}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group/item duration-300 overflow-hidden relative mb-2 ${
                  !activeProfile || activeProfile.id === 'global'
                    ? 'bg-slate-900 border-indigo-500/50 text-white shadow-xl ring-1 ring-indigo-500/20'
                    : `hover:bg-white/5 active:scale-95 ${theme === 'dark' ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-950'}`
                }`}
              >
                <div className="flex items-center space-x-4 relative z-10">
                   <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                     !activeProfile || activeProfile.id === 'global' ? 'border-primary/30 bg-primary/10' : 'border-white/10 bg-white/5 group-hover/item:border-white/20'
                   }`}>
                      <LayoutGrid className={`w-4 h-4 ${!activeProfile || activeProfile.id === 'global' ? 'text-primary' : 'text-white/30 group-hover/item:text-white'}`} />
                   </div>
                   <div className="flex flex-col items-start transition-transform duration-500 group-hover/item:translate-x-1">
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        {language === 'es' ? 'VISTA GLOBAL SISTEMA' : 'GLOBAL SYSTEM VIEW'}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${!activeProfile || activeProfile.id === 'global' ? 'text-white/50' : 'text-white/20 group-hover/item:text-white/40'}`}>
                        {language === 'es' ? 'Super Admin Context' : 'Super Admin Context'}
                      </span>
                   </div>
                </div>
                {(!activeProfile || activeProfile.id === 'global') && (
                   <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_rgba(255,71,123,0.8)] relative z-10" />
                )}
              </button>
            )}

            {Array.isArray(profiles) && profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group/item duration-300 overflow-hidden relative ${
                  p.id === activeProfile?.id
                    ? 'bg-magenta text-white shadow-[0_10px_30px_-5px_rgba(255,71,123,0.3)] scale-[1.02]'
                    : `hover:bg-white/5 active:scale-95 ${theme === 'dark' ? 'text-white/50 hover:text-white' : 'text-slate-500 hover:text-slate-950'}`
                }`}
              >
                {p.id === activeProfile?.id && (
                   <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 blur-3xl -translate-y-8 translate-x-8" />
                )}
                
                <div className="flex items-center space-x-4 relative z-10">
                   <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                     p.id === activeProfile?.id ? 'border-white/30 bg-white/10 shadow-inner' : 'border-white/10 bg-white/5 group-hover/item:border-white/20'
                   }`}>
                      <span className={`text-xs font-black ${p.id === activeProfile?.id ? 'text-white' : 'text-white/30 group-hover/item:text-white'}`}>
                        {p.brandName?.charAt(0).toUpperCase()}
                      </span>
                   </div>
                   <div className="flex flex-col items-start transition-transform duration-500 group-hover/item:translate-x-1">
                      <span className={`text-[11px] font-black uppercase tracking-wider ${p.id === activeProfile?.id ? 'text-white' : ''}`}>
                        {p.brandName}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${p.id === activeProfile?.id ? 'text-white/50' : 'text-white/20 group-hover/item:text-white/40'}`}>
                        {p.industry || 'General'}
                      </span>
                   </div>
                </div>
                
                {p.id === activeProfile?.id && (
                   <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] relative z-10" />
                )}
              </button>
            ))}
          </div>
          
          <div className="mt-3 p-4 bg-white/5 rounded-2xl border border-white/5 relative z-10 group/id">
             <div className="flex items-center justify-between pointer-events-none">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20 group-hover/id:text-magenta transition-colors">Workspace ID</span>
                <span className="text-[9px] font-mono text-white/10 uppercase tracking-tighter truncate max-w-[120px]">{activeProfile?.id || 'GLOBAL_ROOT'}</span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
