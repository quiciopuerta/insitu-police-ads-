
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LogoIsotype from './LogoIsotype';

interface LeadMagnetWizardProps {
    initialUrl: string;
    onClose: () => void;
    onComplete: (data: any) => void;
}

const LeadMagnetWizard: React.FC<LeadMagnetWizardProps> = ({ initialUrl, onClose, onComplete }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        url: initialUrl,
        role: '',
        budget: '',
        goals: [] as string[],
        email: '',
        name: ''
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const totalSteps = 4;

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        setIsAnalyzing(true);
        // Simulate complex analysis time
        setTimeout(() => {
            onComplete(formData);
        }, 2500);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-2xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 hover:bg-primary hover:text-white hover:border-primary rounded-full transition-colors z-20"
                >
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-100 z-30">
                    <motion.div
                        className="h-full bg-[#ff477b]"
                        initial={{ width: '0%' }}
                        animate={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                </div>

                <div className="pt-10 px-8 flex justify-center">
                    <div className="flex items-center gap-3">
                        <LogoIsotype className="w-8 h-8 text-[#ff477b]" />
                        <span className="text-xl font-black text-slate-900 tracking-tighter leading-none">INsitu<span className="text-[#ff477b]">AI</span></span>
                    </div>
                </div>

                {isAnalyzing ? (
                    <div className="p-12 md:p-20 text-center space-y-8 flex flex-col items-center justify-center min-h-[500px]">
                        <div className="relative w-32 h-32">
                            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-[#ff477b] rounded-full border-t-transparent animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl">🚀</span>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Analizando tu sitio web...</h3>
                            <p className="text-slate-500 font-medium">Estamos auditando más de 100 puntos de conversión.</p>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 md:p-12 pt-8">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                                    <div className="text-center">
                                        <span className="text-[#ff477b] font-black text-xs uppercase tracking-widest mb-2 block">Paso 1 de 4</span>
                                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">¿Cuál es tu rol principal?</h2>
                                        <p className="text-slate-500 mt-3 font-medium">Esto nos ayuda a personalizar tu auditoría.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {['Dueño de Negocio', 'Marketer / Agencia', 'Freelancer'].map((role) => (
                                            <button
                                                key={role}
                                                onClick={() => { setFormData({ ...formData, role }); handleNext(); }}
                                                className="p-6 rounded-2xl border-2 border-slate-100 hover:border-[#ff477b] hover:bg-rose-50 hover:shadow-xl transition-all group text-center"
                                            >
                                                <span className="text-lg font-bold text-slate-700 group-hover:text-[#ff477b]">{role}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                                    <div className="text-center">
                                        <span className="text-[#ff477b] font-black text-xs uppercase tracking-widest mb-2 block">Paso 2 de 4</span>
                                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">¿Presupuesto mensual para Ads?</h2>
                                    </div>
                                    <div className="space-y-3">
                                        {['Menos de $1,000', '$1,000 - $5,000', '$5,000 - $10,000', 'Más de $10,000'].map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => { setFormData({ ...formData, budget: option }); handleNext(); }}
                                                className="w-full p-5 rounded-2xl border-2 border-slate-100 hover:border-[#ff477b] hover:bg-rose-50 flex items-center justify-between group transition-all"
                                            >
                                                <span className="font-bold text-slate-700 group-hover:text-[#ff477b]">{option}</span>
                                                <svg className="w-5 h-5 text-slate-300 group-hover:text-[#ff477b]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                                    <div className="text-center">
                                        <span className="text-[#ff477b] font-black text-xs uppercase tracking-widest mb-2 block">Paso 3 de 4</span>
                                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">¿Qué objetivo persigues?</h2>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['Más Tráfico', 'Más Leads / Ventas', 'Reconocimiento', 'Auditoría Técnica'].map((goal) => (
                                            <button
                                                key={goal}
                                                onClick={() => {
                                                    const newGoals = formData.goals.includes(goal)
                                                        ? formData.goals.filter(g => g !== goal)
                                                        : [...formData.goals, goal];
                                                    setFormData({ ...formData, goals: newGoals });
                                                }}
                                                className={`p-6 rounded-2xl border-2 transition-all ${formData.goals.includes(goal) ? 'border-[#ff477b] bg-rose-50 shadow-lg' : 'border-slate-100 hover:border-slate-300'}`}
                                            >
                                                <span className={`font-bold ${formData.goals.includes(goal) ? 'text-[#ff477b]' : 'text-slate-700'}`}>{goal}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleNext}
                                        disabled={formData.goals.length === 0}
                                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl"
                                    >
                                        Continuar
                                    </button>
                                </motion.div>
                            )}

                            {step === 4 && (
                                <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-8">
                                    <div className="text-center">
                                        <span className="text-[#ff477b] font-black text-xs uppercase tracking-widest mb-2 block">Último Paso</span>
                                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">¿Dónde enviamos tu reporte?</h2>
                                        <p className="text-slate-500 mt-3 font-medium">Recibirás un PDF detallado y acceso al dashboard.</p>
                                    </div>
                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            placeholder="Tu Nombre"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-900 outline-none focus:border-[#ff477b] focus:bg-white transition-all"
                                        />
                                        <input
                                            type="email"
                                            placeholder="Tu Correo Electrónico Profesional"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-6 font-bold text-slate-900 outline-none focus:border-[#ff477b] focus:bg-white transition-all"
                                        />
                                        <button
                                            onClick={handleNext}
                                            disabled={!formData.email || !formData.name}
                                            className="w-full bg-[#ff477b] text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-rose-500/30"
                                        >
                                            Ver Mis Resultados
                                        </button>
                                        <p className="text-[11px] text-center text-slate-400 font-medium">
                                            Al continuar, aceptas nuestros términos y condiciones.
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default LeadMagnetWizard;
