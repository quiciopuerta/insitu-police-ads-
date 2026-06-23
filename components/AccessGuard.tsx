import React, { useEffect, useState } from 'react';
import { AuthUser, Language } from '../types';

interface AccessGuardProps {
    children: React.ReactNode;
    toolId: string;
    language: Language;
    currentUser: AuthUser | null;
}

export const AccessGuard: React.FC<AccessGuardProps> = ({ children, toolId, language, currentUser }) => {
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const checkAccess = async () => {
            if (!currentUser) {
                setHasAccess(false);
                setLoading(false);
                return;
            }

            try {
                const API_URL = import.meta.env.VITE_API_URL || 'https://insitu.company/api';
                // Llama al backend local del subdominio para verificar acceso contra la BD
                const res = await fetch(`/api/check-access?tool=${toolId}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include' // Enviar cookie JWT
                });

                if (res.ok) {
                    const data = await res.json();
                    setHasAccess(data.hasAccess);
                } else {
                    setHasAccess(false);
                }
            } catch (e) {
                console.error("[RBAC] Error verifying access:", e);
                setHasAccess(false);
            } finally {
                setLoading(false);
            }
        };

        checkAccess();
    }, [currentUser, toolId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-16 h-16 border-4 border-[#ff477b]/20 border-t-[#ff477b] rounded-full animate-spin"></div>
                <p className="text-[#ff477b] font-medium animate-pulse">Verificando permisos...</p>
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center">
                <div className="w-24 h-24 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-5xl text-rose-500">
                    🔒
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white mb-2">Acceso Denegado</h2>
                    <p className="text-slate-400 max-w-md">
                        {language === 'es' 
                            ? 'No tienes los permisos necesarios para acceder a esta herramienta. Contacta a un administrador para solicitar acceso.'
                            : 'You do not have the required permissions to access this tool. Contact an administrator to request access.'}
                    </p>
                </div>
                <a href="https://insitu.company" className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors font-medium">
                    {language === 'es' ? 'Volver al Inicio' : 'Return Home'}
                </a>
            </div>
        );
    }

    return <>{children}</>;
};
