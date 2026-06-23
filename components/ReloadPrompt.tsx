
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const ReloadPrompt = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) {
        return null;
    }

    return (
        <div className="fixed bottom-0 right-0 p-4 m-4 z-[9999]" role="alert">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in slide-in-from-bottom duration-500 max-w-sm">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#ff477b] rounded-xl flex items-center justify-center shrink-0 animate-pulse">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-black text-white text-sm uppercase tracking-wider mb-1">
                            {offlineReady ? 'Listo para usar Offline' : 'Nueva Versión Disponible'}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            {offlineReady
                                ? 'La aplicación ha sido guardada en caché y está lista para funcionar sin internet.'
                                : 'Se ha detectado una nueva actualización. Actualiza ahora para ver los cambios recientes.'}
                        </p>
                        {!offlineReady && (
                            <p className="text-[11px] font-mono text-slate-500 mt-2">
                                v{__APP_VERSION__} ({__COMMIT_HASH__})
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 mt-1">
                    {needRefresh && (
                        <button
                            onClick={() => updateServiceWorker(true)}
                            className="flex-1 bg-[#ff477b] hover:bg-[#ff3369] text-white py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-colors shadow-lg shadow-rose-500/20"
                        >
                            Actualizar
                        </button>
                    )}
                    <button
                        onClick={close}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReloadPrompt;
