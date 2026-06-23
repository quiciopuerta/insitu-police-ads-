import { buildAbsoluteUrl } from "../utils/apiConfig";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import LogoIsotype from './LogoIsotype';

interface ConsultingModalProps {
    onClose: () => void;
}

const ConsultingModal: React.FC<ConsultingModalProps> = ({ onClose }) => {
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        website: '',
        budget: '',
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            let userId = "";
            try {
              const session = localStorage.getItem("insitu_active_session");
              if (session) {
                const parsed = JSON.parse(session);
                userId = parsed.id || parsed.user?.id || "";
              }
            } catch { /* ignore */ }

            const response = await fetch(buildAbsoluteUrl('/.netlify/functions/api-contact'), {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(userId ? { 'X-User-Id': userId } : {})
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSubmitted(true);
            } else {
                const data = await response.json();
                setError(data.error || 'Error al enviar la solicitud');
            }
        } catch (err) {
            console.error('[ConsultingModal] Submit error:', err);
            setError('Error de conexión con el servidor');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-xl">
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-4xl bg-white rounded-[2rem] overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
            >
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-primary hover:text-white hover:border-primary rounded-full transition-colors z-20 md:text-slate-400 text-white"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {/* Left Side: Copy */}
                <div className="bg-slate-950 p-10 md:p-14 md:w-2/5 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff477b]/20 blur-[100px] rounded-full"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <LogoIsotype className="w-8 h-8 text-[#ff477b]" />
                            <span className="text-xl font-black text-white tracking-tighter leading-none">INsitu<span className="text-[#ff477b]">AI</span></span>
                        </div>
                        <span className="inline-block py-1 px-3 rounded-full bg-[#ff477b]/20 border border-[#ff477b]/30 text-[#ff477b] text-[11px] font-black uppercase tracking-widest mb-6">
                            Agency & Enterprise
                        </span>
                        <h2 className="text-3xl md:text-4xl font-black leading-tight mb-4">
                            Escala tu negocio con nuestros expertos.
                        </h2>
                        <p className="text-slate-400 font-medium leading-relaxed">
                            Obtén una estrategia personalizada diseñada para maximizar tu ROI. Analizamos, implementamos y optimizamos.
                        </p>
                    </div>

                    <div className="relative z-10 mt-12 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-[#ff477b]">1</div>
                            <p className="text-sm font-bold opacity-90">Auditoría Profunda</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-[#ff477b]">2</div>
                            <p className="text-sm font-bold opacity-90">Estrategia Omnicanal</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-[#ff477b]">3</div>
                            <p className="text-sm font-bold opacity-90">Ejecución Dedicada</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="p-10 md:p-14 md:w-3/5 bg-white">
                    {submitted ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-3xl font-black text-slate-900">¡Solicitud Enviada!</h3>
                            <p className="text-slate-500">Nuestro equipo de estrategia revisará tu perfil y te contactará en menos de 24 horas.</p>
                            <button onClick={onClose} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all">
                                Volver al sitio
                            </button>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-2xl font-black text-slate-900 mb-8">Agenda una llamada</h3>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-bold text-slate-900 outline-none focus:border-slate-900 transition-all"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Email Corporativo</label>
                                        <input
                                            required
                                            type="email"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-bold text-slate-900 outline-none focus:border-slate-900 transition-all"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sitio Web</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-bold text-slate-900 outline-none focus:border-slate-900 transition-all"
                                            placeholder="https://"
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Presupuesto Mensual de Marketing</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-bold text-slate-900 outline-none focus:border-slate-900 transition-all appearance-none"
                                        value={formData.budget}
                                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                    >
                                        <option value="">Seleccionar Rango...</option>
                                        <option value="<5k">Menos de $5,000</option>
                                        <option value="5k-10k">$5,000 - $10,000</option>
                                        <option value="10k-50k">$10,000 - $50,000</option>
                                        <option value="50k+">Más de $50,000</option>
                                    </select>
                                </div>

                                {error && (
                                    <p className="text-xs font-bold text-rose-500 bg-rose-50 p-3 rounded-lg border border-rose-100 italic">
                                        ⚠️ {error}
                                    </p>
                                )}

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full bg-[#ff477b] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 shadow-xl shadow-rose-500/20 transition-all disabled:opacity-50 disabled:grayscale"
                                >
                                    {isSubmitting ? 'Enviando...' : 'Solicitar Consultoría'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ConsultingModal;
