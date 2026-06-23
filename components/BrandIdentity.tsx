import React, { useState, useEffect, useRef } from 'react';
import { AuthUser, BrandProfile, Language } from '../types';
import { authService } from '../services/authService';
import { analyzeBrandBookPDF, analyzeVoice } from '../services/ai/mediaGenerationService';
import { Zap, FileText, Sparkles, Wand2 } from 'lucide-react';

interface BrandIdentityProps {
    currentUser: AuthUser | null;
    language: Language;
    onUpdateUser?: (user: AuthUser) => void;
}

const BrandIdentity: React.FC<BrandIdentityProps> = ({ currentUser, language, onUpdateUser }) => {
    const [profiles, setProfiles] = useState<BrandProfile[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [profile, setProfile] = useState<BrandProfile>({
        id: crypto.randomUUID(),
        brandName: '',
        industry: '',
        valueProposition: '',
        targetAudience: '',
        toneOfVoice: '',
        adherenceLevel: 'Strict',
        keyMessages: [],
        visualGuidelines: '',
        brandColors: '',
        typography: '',
        complianceRules: ''
    });

    const [rawKeyMessages, setRawKeyMessages] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [componentError, setComponentError] = useState<string | null>(null);

    // AI PDF Extraction
    const [isExtractingPdf, setIsExtractingPdf] = useState(false);
    const [pdfExtractStatus, setPdfExtractStatus] = useState<string | null>(null);

    // Voice Recording & Analysis
    const [isRecordingVoice, setIsRecordingVoice] = useState(false);
    const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
    const [voiceAnalysisResult, setVoiceAnalysisResult] = useState<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleExtractFromPdf = async () => {
        if (!pdfFile) return;
        setIsExtractingPdf(true);
        setPdfExtractStatus(null);
        try {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const base64 = ev.target?.result as string;
                const brandData = await analyzeBrandBookPDF(base64, language);
                if (brandData) {
                    setProfile(prev => ({
                        ...prev,
                        brandName: brandData.brandName || prev.brandName,
                        industry: brandData.industry || prev.industry,
                        valueProposition: brandData.valueProposition || prev.valueProposition,
                        targetAudience: brandData.targetAudience || prev.targetAudience,
                        toneOfVoice: brandData.toneOfVoice || prev.toneOfVoice,
                        brandColors: brandData.brandColors || prev.brandColors,
                        typography: brandData.typography || prev.typography,
                        visualGuidelines: brandData.visualGuidelines || prev.visualGuidelines,
                        complianceRules: brandData.complianceRules || prev.complianceRules,
                    }));
                    if (brandData.keyMessages?.length) {
                        setRawKeyMessages(brandData.keyMessages.join('\n'));
                    }
                    setPdfExtractStatus(language === 'es' ? '✅ Datos extraídos correctamente' : '✅ Data extracted successfully');
                } else {
                    setPdfExtractStatus(language === 'es' ? '❌ No se pudieron extraer datos' : '❌ Could not extract data');
                }
                setIsExtractingPdf(false);
            };
            reader.readAsDataURL(pdfFile);
        } catch (err) {
            console.error('[BrandIdentity PDF Extract Error]:', err);
            setPdfExtractStatus(language === 'es' ? '❌ Error al procesar el PDF' : '❌ Error processing PDF');
            setIsExtractingPdf(false);
        }
    };

    const startRecordingVoice = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.onload = (ev) => setProfile(prev => ({ ...prev, clonedVoiceSample: ev.target?.result as string }));
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
            setIsRecordingVoice(true);
        } catch (err) {
            console.error('[BrandIdentity Voice Recording Error]:', err);
            alert(language === 'es' ? 'No se pudo acceder al micrófono.' : 'Could not access microphone.');
        }
    };

    const stopRecordingVoice = () => {
        if (mediaRecorderRef.current && isRecordingVoice) {
            mediaRecorderRef.current.stop();
            setIsRecordingVoice(false);
        }
    };

    const handleAnalyzeVoice = async () => {
        if (!profile.clonedVoiceSample) return;
        setIsAnalyzingVoice(true);
        setVoiceAnalysisResult(null);
        try {
            const result = await analyzeVoice(profile.clonedVoiceSample);
            setVoiceAnalysisResult(result);
        } catch (err) {
            console.error('[BrandIdentity Voice Analysis Error]:', err);
        } finally {
            setIsAnalyzingVoice(false);
        }
    };

    useEffect(() => {
        try {
            // Fetch fresh user data from storage to ensure we show the latest profile
            const freshUser = authService.getCurrentUser();
            const userToUse = freshUser && freshUser.id === currentUser?.id ? freshUser : currentUser;

            if (userToUse) {
                let list = Array.isArray(userToUse.brandProfiles) ? [...userToUse.brandProfiles] : [];
                // Migration: if only brandProfile exists, move it to brandProfiles[0]
                if (list.length === 0 && userToUse.brandProfile && userToUse.brandProfile.brandName) {
                    list = [userToUse.brandProfile];
                }
                
                // If still empty, add an initial empty profile
                if (list.length === 0) {
                    list = [{
                        id: crypto.randomUUID(),
                        brandName: '', industry: '', valueProposition: '', targetAudience: '',
                        toneOfVoice: '', adherenceLevel: 'Strict', keyMessages: [],
                        visualGuidelines: '', brandColors: '', typography: '', complianceRules: ''
                    }];
                }
                
                setProfiles(list);
                const current = list[selectedIndex] || list[0];
                if (current) {
                    setProfile(current);
                    setRawKeyMessages(Array.isArray(current.keyMessages) ? current.keyMessages.join('\n') : '');
                }
            }
        } catch (err: any) {
            console.error("Error in BrandIdentity useEffect:", err);
            setComponentError(err.message);
        }
    }, [currentUser, selectedIndex]);

    const handleSave = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        setSaveStatus('idle');

        const updatedProfile: BrandProfile = {
            ...profile,
            keyMessages: rawKeyMessages.split('\n').filter(line => line.trim() !== ''),
            brandBookPdfName: pdfFile ? pdfFile.name : profile.brandBookPdfName,
            lastUpdated: Date.now()
        };

        const updatedProfiles = [...profiles];
        updatedProfiles[selectedIndex] = updatedProfile;

        const success = await authService.updateBrandProfile(currentUser.id, updatedProfiles);
        if (success) {
            setSaveStatus('success');
            setProfiles(updatedProfiles);
            setProfile(updatedProfile);
            
            // Sync with parent state
            const freshUser = authService.getCurrentUser();
            if (freshUser && onUpdateUser) {
                onUpdateUser(freshUser);
            }
        } else {
            setSaveStatus('error');
        }
        setIsSaving(false);
    };

    const addNewProfile = () => {
        const isAdminUser = currentUser?.role === 'superAdmin' || currentUser?.role === 'admin';
        const isAgency = isAdminUser || currentUser?.subscription?.plan === 'Agency';
        const limit = isAgency ? 10 : 1;
        if ((profiles || []).length >= limit) {
            alert(language === 'es' ? `Has alcanzado el límite de ${limit} marcas para tu plan.` : `You've reached the limit of ${limit} brands for your plan.`);
            return;
        }
        const newP: BrandProfile = {
            id: crypto.randomUUID(),
            brandName: `Marca ${(profiles || []).length + 1}`,
            industry: '', valueProposition: '', targetAudience: '',
            toneOfVoice: '', adherenceLevel: 'Strict', keyMessages: [],
            visualGuidelines: '', brandColors: '', typography: '', complianceRules: ''
        };
        const newList = [...profiles, newP];
        setProfiles(newList);
        setSelectedIndex(newList.length - 1);
    };

    const deleteProfile = (index: number) => {
        const isLast = (profiles || []).length <= 1;
        const newList = isLast 
            ? [{
                id: crypto.randomUUID(),
                brandName: '', industry: '', valueProposition: '', targetAudience: '',
                toneOfVoice: '', adherenceLevel: 'Strict' as const, keyMessages: [],
                visualGuidelines: '', brandColors: '', typography: '', complianceRules: ''
              }]
            : (profiles || []).filter((_, i) => i !== index);
        
        setProfiles(newList);
        setSelectedIndex(Math.max(0, isLast ? 0 : selectedIndex - 1));
        authService.updateBrandProfile(currentUser!.id, newList);
        
        // If we deleted the active one, clear it
        if (currentUser?.brandProfile?.brandName === (profiles?.[index]?.brandName)) {
            authService.updateBrandProfile(currentUser!.id, {});
        }
    };

    const resetCurrentProfile = () => {
        if (!confirm(language === 'es' ? '¿Estás seguro de resetear este perfil?' : 'Are you sure you want to reset this profile?')) return;
        setProfile({
            id: crypto.randomUUID(),
            brandName: '', industry: '', valueProposition: '', targetAudience: '',
            toneOfVoice: '', adherenceLevel: 'Strict', keyMessages: [],
            visualGuidelines: '', brandColors: '', typography: '', complianceRules: ''
        });
        setRawKeyMessages('');
    };

    const activateProfile = async () => {
        if (!currentUser) return;
        const success = await authService.updateBrandProfile(currentUser.id, profile);
        if (success) {
            setSaveStatus('success');
            // Sync with parent state
            const freshUser = authService.getCurrentUser();
            if (freshUser && onUpdateUser) {
                onUpdateUser(freshUser);
            }
        }
    };

    const deactivateAllBrands = async () => {
        if (!currentUser) return;
        const success = await authService.updateBrandProfile(currentUser.id, {});
        if (success) {
            setSaveStatus('success');
            // Sync with parent state
            const freshUser = authService.getCurrentUser();
            if (freshUser && onUpdateUser) {
                onUpdateUser(freshUser);
            }
        }
    };

    const isProfileComplete = !!(
        profile.brandName &&
        profile.industry &&
        profile.valueProposition &&
        profile.targetAudience &&
        profile.toneOfVoice &&
        (profile?.keyMessages?.length || 0) > 0 &&
        profile.brandColors &&
        profile.typography &&
        profile.complianceRules
    );

    const isAgency = currentUser?.role === 'superAdmin' || currentUser?.role === 'admin' || currentUser?.subscription?.plan === 'Agency';
    const isBrandSafetyVerified = isProfileComplete;

    if (!currentUser) return null;

    if (componentError) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
                <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl max-w-md w-full text-center space-y-4">
                    <h3 className="text-xl font-black uppercase tracking-tight text-rose-500">Error en el Módulo</h3>
                    <p className="text-sm text-slate-400 font-medium">{componentError}</p>
                    <button onClick={() => window.location.reload()} className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Recargar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20">
            <div className="max-w-5xl mx-auto px-6 py-12 space-y-8 animate-in fade-in duration-700">

                {isBrandSafetyVerified && (
                    <div className="flex justify-center mb-4">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Brand Safety Verified
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">
                                Brand <span className="text-magenta">Identity</span>
                            </h1>
                            <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/30 font-black tracking-widest uppercase">v1.1.0</span>
                        </div>
                        <p className="text-slate-400 font-medium text-sm max-w-xl">
                            {language === 'es' 
                                ? 'Define el ADN de tu marca para que la IA genere auditorías y creatividades con total coherencia visual y estratégica.' 
                                : 'Define your brand DNA so the AI generates audits and creatives with total visual and strategic coherence.'}
                        </p>
                    </div>
                </div>

                {/* Profile Selector Tabs */}
                <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
                    {(profiles || []).map((p, idx) => (
                        <div key={idx} className="group relative">
                            <button
                                onClick={() => setSelectedIndex(idx)}
                                className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border ${selectedIndex === idx 
                                    ? 'bg-slate-900 border-[#ff477b] text-white shadow-lg shadow-[#ff477b]/20' 
                                    : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-white hover:border-white/20'}`}
                            >
                                {p.brandName || (language === 'es' ? `Marca ${idx + 1}` : `Brand ${idx + 1}`)}
                            </button>
                            {(profiles || []).length > 1 && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); deleteProfile(idx); }}
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow-lg"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={addNewProfile}
                        className="p-3 rounded-2xl bg-[#ff477b]/10 border border-[#ff477b]/20 text-[#ff477b] hover:bg-[#ff477b] hover:text-white transition-all group"
                        title={language === 'es' ? 'Añadir nueva marca' : 'Add new brand'}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    </button>

                    <button
                        onClick={deactivateAllBrands}
                        className={`px-4 py-3 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all border ${!currentUser?.brandProfile?.brandName 
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                            : 'bg-white/5 border-white/10 text-white/30 hover:text-white'}`}
                        title={language === 'es' ? 'Actuar sin ADN de marca' : 'Act without brand DNA'}
                    >
                        {language === 'es' ? 'MODO GENÉRICO (Sin ADN)' : 'GENERIC MODE (No DNA)'}
                    </button>
                </div>

                {!isAgency && (profiles || []).length >= 1 && (
                    <div className="flex justify-center mb-8">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-6 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-3">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {language === 'es' ? 'Sube a plan Agency para gestionar varias marcas' : 'Upgrade to Agency to manage multiple brands'}
                        </div>
                    </div>
                )}

                <div className="grid lg:grid-cols-12 gap-8">

                    {/* Left Column: Core Identity */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-slate-900/50 rounded-[2.5rem] p-8 md:p-12 border border-white/5 shadow-2xl backdrop-blur-sm">
                            {/* DNA Guide */}
                            <div className="mb-10 p-6 bg-[#ff477b]/5 border border-[#ff477b]/10 rounded-3xl">
                                <label className="text-[11px] font-black uppercase tracking-widest text-[#ff477b] flex items-center gap-2 mb-4">
                                    <Zap className="w-3 h-3" /> {language === 'es' ? 'Cómo configurar tu ADN de Marca' : 'How to configure your Brand DNA'}
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { step: '01', title: language === 'es' ? 'Cargar PDF' : 'Upload PDF', desc: language === 'es' ? 'Sube tu Brandbook o Brief en la columna derecha para auto-completar.' : 'Upload your Brandbook or Brief in the right column to auto-complete.' },
                                        { step: '02', title: language === 'es' ? 'Refinar' : 'Refine', desc: language === 'es' ? 'Ajusta los campos de identidad y tono para una IA más precisa.' : 'Adjust identity and tone fields for a more precise AI.' },
                                        { step: '03', title: language === 'es' ? 'Masterizar' : 'Master', desc: language === 'es' ? 'Guarda los cambios. Todas las generaciones futuras usarán este contexto.' : 'Save changes. All future generations will use this context.' }
                                    ].map((s, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <span className="text-[#ff477b] font-black text-[11px] block">{s.step}</span>
                                            <h4 className="text-[11px] font-bold text-white uppercase tracking-tight">{s.title}</h4>
                                            <p className="text-[11px] text-slate-400 leading-tight">{s.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-white mb-8 border-l-4 border-[#ff477b] pl-4 uppercase tracking-tight">Core Identity</h3>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{language === 'es' ? 'Nombre de Marca' : 'Brand Name'}</label>
                                    <input
                                        type="text"
                                        value={profile.brandName}
                                        onChange={e => setProfile({ ...profile, brandName: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-[#ff477b] outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Ej: Tesla, Nike..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{language === 'es' ? 'Industria' : 'Industry'}</label>
                                    <input
                                        type="text"
                                        value={profile.industry}
                                        onChange={e => setProfile({ ...profile, industry: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-[#ff477b] outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Ej: Automotive, SaaS..."
                                    />
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{language === 'es' ? 'Propuesta de Valor' : 'Value Proposition'}</label>
                                    <input
                                        type="text"
                                        value={profile.valueProposition}
                                        onChange={e => setProfile({ ...profile, valueProposition: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-[#ff477b] outline-none transition-all placeholder:text-slate-600"
                                        placeholder={language === 'es' ? 'La promesa única que ofreces...' : 'The unique promise you offer...'}
                                    />
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{language === 'es' ? 'Audiencia Objetivo' : 'Target Audience'}</label>
                                    <textarea
                                        rows={3}
                                        value={profile.targetAudience}
                                        onChange={e => setProfile({ ...profile, targetAudience: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-[#ff477b] outline-none transition-all placeholder:text-slate-600 resize-none"
                                        placeholder={language === 'es' ? 'Describe tu cliente ideal detalladamente...' : 'Describe your ideal customer in detail...'}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 rounded-[2.5rem] p-8 md:p-12 border border-white/5 shadow-2xl backdrop-blur-sm">
                            <h3 className="text-xl font-black text-white mb-8 border-l-4 border-[#ff477b] pl-4 uppercase tracking-tight">{language === 'es' ? 'Directrices Creativas' : 'Creative Guidelines'}</h3>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{language === 'es' ? 'Tono de Voz' : 'Tone of Voice'}</label>
                                    <input
                                        type="text"
                                        value={profile.toneOfVoice}
                                        onChange={e => setProfile({ ...profile, toneOfVoice: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-[#ff477b] outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Ej: Autoritativo pero amigable, Innovador..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{language === 'es' ? 'Mensajes Clave (Uno por línea)' : 'Key Messages (One per line)'}</label>
                                    <textarea
                                        rows={4}
                                        value={rawKeyMessages}
                                        onChange={e => setRawKeyMessages(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-[#ff477b] outline-none transition-all placeholder:text-slate-600 resize-none"
                                        placeholder="- Calidad sin compromisos&#10;- Innovación constante..."
                                    />
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{language === 'es' ? 'Colores de Marca (HEX)' : 'Brand Colors (HEX)'}</label>
                                        <input
                                            type="text"
                                            value={profile.brandColors || ''}
                                            onChange={e => setProfile({ ...profile, brandColors: e.target.value })}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-[#ff477b] outline-none transition-all placeholder:text-slate-600"
                                            placeholder="#ff477b, #1E293B..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{language === 'es' ? 'Tipografías' : 'Typography'}</label>
                                        <input
                                            type="text"
                                            value={profile.typography || ''}
                                            onChange={e => setProfile({ ...profile, typography: e.target.value })}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-[#ff477b] outline-none transition-all placeholder:text-slate-600"
                                            placeholder="Inter, Roboto, Serif..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{language === 'es' ? 'Reglas de Visuales Adicionales' : 'Additional Visual Guidelines'}</label>
                                    <textarea
                                        rows={3}
                                        value={profile.visualGuidelines}
                                        onChange={e => setProfile({ ...profile, visualGuidelines: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-[#ff477b] outline-none transition-all placeholder:text-slate-600 resize-none"
                                        placeholder={language === 'es' ? 'Estilo fotográfico, uso de logo, restricciones...' : 'Photography style, logo usage, restrictions...'}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Digital Presence & Social Media */}
                        <div className="bg-slate-900/50 rounded-[2.5rem] p-8 md:p-12 border border-white/5 shadow-2xl backdrop-blur-sm">
                            <h3 className="text-xl font-black text-white mb-8 border-l-4 border-cyan-500 pl-4 uppercase tracking-tight">{language === 'es' ? 'Presencia Digital' : 'Digital Presence'}</h3>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{language === 'es' ? 'Sitio Web' : 'Website'}</label>
                                    <input
                                        type="url"
                                        value={profile.website || ''}
                                        onChange={e => setProfile({ ...profile, website: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-cyan-500 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="https://www.tumarca.com"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1 block mb-4">{language === 'es' ? 'Redes Sociales' : 'Social Media'}</label>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {[
                                            { key: 'instagram', label: 'Instagram', placeholder: '@tumarca', color: 'from-pink-500 to-purple-500', icon: 'M7.8 2h8.4C19 2 22 5 22 7.8v8.4c0 2.8-3 5.8-5.8 5.8H7.8C5 22 2 19 2 16.2V7.8C2 5 5 2 7.8 2m-.2 2C5.6 4 4 5.6 4 7.6v8.8c0 2 1.6 3.6 3.6 3.6h8.8c2 0 3.6-1.6 3.6-3.6V7.6c0-2-1.6-3.6-3.6-3.6H7.6M16.75 5.75a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5M12 7a5 5 0 110 10 5 5 0 010-10m0 2a3 3 0 100 6 3 3 0 000-6z' },
                                            { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/tumarca', color: 'from-blue-600 to-blue-500', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                                            { key: 'tiktok', label: 'TikTok', placeholder: '@tumarca', color: 'from-zinc-800 to-zinc-700', icon: 'M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.88 2.89 2.89 0 012.89-2.89c.3 0 .58.04.85.12V9.01a6.22 6.22 0 00-.85-.06 6.34 6.34 0 00-6.35 6.34 6.34 6.34 0 006.35 6.35c3.5 0 6.35-2.85 6.35-6.35V8.8a8.2 8.2 0 004.78 1.53V6.93a4.83 4.83 0 01-1.03-.24z' },
                                            { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/company/tumarca', color: 'from-blue-700 to-blue-600', icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
                                            { key: 'x', label: 'X (Twitter)', placeholder: '@tumarca', color: 'from-zinc-900 to-zinc-800', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                                            { key: 'pinterest', label: 'Pinterest', placeholder: 'pinterest.com/tumarca', color: 'from-red-600 to-red-500', icon: 'M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z' },
                                            { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@tumarca', color: 'from-red-600 to-red-500', icon: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z' },
                                        ].map(({ key, label, placeholder, color, icon }) => (
                                            <div key={key} className="flex items-center gap-3 group">
                                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-lg group-focus-within:scale-110 transition-transform`}>
                                                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d={icon} /></svg>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={(profile.socialLinks as any)?.[key] || ''}
                                                    onChange={e => setProfile({
                                                        ...profile,
                                                        socialLinks: { ...(profile.socialLinks || {}), [key]: e.target.value }
                                                    })}
                                                    className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold text-white focus:border-cyan-500 outline-none transition-all placeholder:text-slate-600"
                                                    placeholder={placeholder}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 rounded-[2.5rem] p-8 md:p-12 border border-white/5 shadow-2xl backdrop-blur-sm">
                            <h3 className="text-xl font-black text-white mb-8 border-l-4 border-purple-500 pl-4 uppercase tracking-tight">{language === 'es' ? 'Isotipo & Logotipo' : 'Isotype & Logo'}</h3>
                            <div className="bg-slate-950/30 border-2 border-dashed border-slate-800 rounded-3xl p-8 text-center hover:border-purple-500/50 transition-colors group relative overflow-hidden">
                                {profile.isotypeUrl ? (
                                    <div className="mb-6 relative w-24 h-24 mx-auto group-hover:scale-105 transition-transform">
                                        <img src={profile.isotypeUrl} alt="Isotype" className="w-full h-full object-contain" />
                                        <button
                                            onClick={() => setProfile({ ...profile, isotypeUrl: undefined })}
                                            className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg hover:bg-rose-600 transition-colors"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5 group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8 text-slate-500 group-hover:text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                )}
                                <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">{language === 'es' ? 'Subir Isotipo' : 'Upload Isotype'}</h4>
                                <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto mb-6">
                                    {language === 'es' ? 'Sube tu logo en formato PNG o SVG transparente.' : 'Upload your logo in transparent PNG or SVG format.'}
                                </p>

                                <div className="flex justify-center gap-3">
                                    <label className="cursor-pointer">
                                        <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all shadow-lg hover:shadow-purple-500/20">
                                            {language === 'es' ? 'Seleccionar Archivo' : 'Select File'}
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        const result = ev.target?.result as string;
                                                        setProfile({ ...profile, isotypeUrl: result });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                    {/* Default Isotype Button for Quick Test */}
                                    <button
                                        onClick={() => setProfile({ ...profile, isotypeUrl: '/isotype.png' })}
                                        className="bg-slate-800 text-slate-400 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-700 hover:text-white transition-all"
                                    >
                                        Use Default
                                    </button>
                                </div>

                                <div className="mt-6 border-t border-white/5 pt-4">
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3">{language === 'es' ? 'Visibilidad' : 'Visibility'}</p>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {['header', 'footer', 'both', 'none'].map((opt) => (
                                            <button
                                                key={opt}
                                                onClick={() => setProfile({ ...profile, isotypeVisibility: opt as any })}
                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all ${profile.isotypeVisibility === opt
                                                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                                                    : 'bg-slate-900 text-slate-500 hover:bg-primary hover:text-white hover:border-primary'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 rounded-[2.5rem] p-8 md:p-12 border border-white/5 shadow-2xl backdrop-blur-sm">
                            <h3 className="text-xl font-black text-white mb-8 border-l-4 border-indigo-500 pl-4 uppercase tracking-tight ">{language === 'es' ? 'Voz de Marca (IA Voice)' : 'Brand Voice (AI Voice)'}</h3>
                            <div className="bg-slate-950/30 border-2 border-dashed border-slate-800 rounded-3xl p-8 text-center hover:border-indigo-500/50 transition-colors group relative overflow-hidden">
                                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/5 group-hover:scale-110 transition-transform">
                                    <svg className="w-8 h-8 text-slate-500 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </div>
                                <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">
                                    {profile.clonedVoiceSample ? (language === 'es' ? 'Voz Clonada Activa' : 'Cloned Voice Active') : (language === 'es' ? 'Clonar Voz de Marca' : 'Clone Brand Voice')}
                                </h4>
                                <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto mb-6">
                                    {language === 'es' 
                                        ? 'Sube un audio (MP3/WAV) de 15-30 segundos para definir la voz oficial de tu marca. Esta voz regirá todas las narraciones de video e IA.' 
                                        : 'Upload a 15-30 second audio (MP3/WAV) to define your brand\'s official voice. This voice will govern all video and AI narrations.'}
                                </p>

                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex flex-wrap justify-center gap-3">
                                        <label className="cursor-pointer">
                                            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-lg hover:shadow-indigo-500/20">
                                                {profile.clonedVoiceSample ? (language === 'es' ? 'Cambiar Referencia' : 'Change Reference') : (language === 'es' ? 'Subir Muestra de Voz' : 'Upload Voice Sample')}
                                            </span>
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (ev) => {
                                                            const result = ev.target?.result as string;
                                                            setProfile({ ...profile, clonedVoiceSample: result });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                        <button
                                            onClick={isRecordingVoice ? stopRecordingVoice : startRecordingVoice}
                                            className={`px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${
                                                isRecordingVoice
                                                    ? 'bg-rose-500 text-white animate-pulse shadow-rose-500/30'
                                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white hover:shadow-rose-500/20'
                                            }`}
                                        >
                                            <div className={`w-2.5 h-2.5 rounded-full ${isRecordingVoice ? 'bg-white' : 'bg-rose-400'}`} />
                                            {isRecordingVoice ? (language === 'es' ? 'Detener Grabación' : 'Stop Recording') : (language === 'es' ? 'Grabar Voz' : 'Record Voice')}
                                        </button>
                                    </div>

                                    {profile.clonedVoiceSample && (
                                        <div className="w-full space-y-3">
                                            <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                                                <audio src={profile.clonedVoiceSample} controls className="h-8 flex-1" />
                                                <button
                                                    onClick={handleAnalyzeVoice}
                                                    disabled={isAnalyzingVoice}
                                                    className="bg-violet-500/10 text-violet-400 border border-violet-500/20 px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-violet-500 hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    {isAnalyzingVoice ? (
                                                        <><div className="w-3 h-3 border-2 border-violet-300/30 border-t-violet-300 rounded-full animate-spin" />{language === 'es' ? 'Analizando...' : 'Analyzing...'}</>
                                                    ) : (
                                                        <>{language === 'es' ? '🧬 Analizar Voz' : '🧬 Analyze Voice'}</>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => { setProfile({ ...profile, clonedVoiceSample: undefined }); setVoiceAnalysisResult(null); }}
                                                    className="bg-rose-500/10 text-rose-500 p-2 rounded-lg hover:bg-rose-500 hover:text-white transition-all"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>

                                            {/* Voice Analysis Results */}
                                            {voiceAnalysisResult && (
                                                <div className="bg-violet-500/5 border border-violet-500/10 rounded-2xl p-5 space-y-3">
                                                    <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-400/60 flex items-center gap-2">
                                                        <span>🧬</span> {language === 'es' ? 'Perfil de Voz Detectado' : 'Detected Voice Profile'}
                                                    </h5>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {voiceAnalysisResult.gender && <div className="bg-white/[0.03] p-2.5 rounded-xl"><span className="text-[11px] font-black text-white/20 uppercase tracking-wider">{language === 'es' ? 'Género' : 'Gender'}</span><p className="text-xs font-bold text-white mt-0.5">{voiceAnalysisResult.gender}</p></div>}
                                                        {voiceAnalysisResult.pitch && <div className="bg-white/[0.03] p-2.5 rounded-xl"><span className="text-[11px] font-black text-white/20 uppercase tracking-wider">Pitch</span><p className="text-xs font-bold text-white mt-0.5">{voiceAnalysisResult.pitch}</p></div>}
                                                        {voiceAnalysisResult.tempo && <div className="bg-white/[0.03] p-2.5 rounded-xl"><span className="text-[11px] font-black text-white/20 uppercase tracking-wider">Tempo</span><p className="text-xs font-bold text-white mt-0.5">{voiceAnalysisResult.tempo}</p></div>}
                                                        {voiceAnalysisResult.tone && <div className="bg-white/[0.03] p-2.5 rounded-xl"><span className="text-[11px] font-black text-white/20 uppercase tracking-wider">{language === 'es' ? 'Tono' : 'Tone'}</span><p className="text-xs font-bold text-white mt-0.5">{voiceAnalysisResult.tone}</p></div>}
                                                        {voiceAnalysisResult.accent && <div className="bg-white/[0.03] p-2.5 rounded-xl"><span className="text-[11px] font-black text-white/20 uppercase tracking-wider">{language === 'es' ? 'Acento' : 'Accent'}</span><p className="text-xs font-bold text-white mt-0.5">{voiceAnalysisResult.accent}</p></div>}
                                                        {voiceAnalysisResult.clarity && <div className="bg-white/[0.03] p-2.5 rounded-xl"><span className="text-[11px] font-black text-white/20 uppercase tracking-wider">{language === 'es' ? 'Claridad' : 'Clarity'}</span><p className="text-xs font-bold text-white mt-0.5">{voiceAnalysisResult.clarity}</p></div>}
                                                    </div>
                                                    {voiceAnalysisResult.bestUseCase && (
                                                        <div className="bg-white/[0.03] p-3 rounded-xl">
                                                            <span className="text-[11px] font-black text-white/20 uppercase tracking-wider">{language === 'es' ? 'Mejor Uso' : 'Best Use'}</span>
                                                            <p className="text-xs font-bold text-violet-300 mt-0.5">{voiceAnalysisResult.bestUseCase}</p>
                                                        </div>
                                                    )}
                                                    {voiceAnalysisResult.summary && (
                                                        <p className="text-[11px] text-white/40 leading-relaxed italic">{voiceAnalysisResult.summary}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/50 rounded-[2.5rem] p-8 md:p-12 border border-white/5 shadow-2xl backdrop-blur-sm">
                            <h3 className="text-xl font-black text-white mb-8 border-l-4 border-emerald-500 pl-4 uppercase tracking-tight ">{language === 'es' ? 'Documentación Oficial' : 'Official Documentation'}</h3>
                            <div className="bg-slate-900/50 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl backdrop-blur-sm mb-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <Wand2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black text-white uppercase tracking-widest">{language === 'es' ? 'Extractor IA de Brandbook' : 'AI Brandbook Extractor'}</h4>
                                        <p className="text-[11px] text-slate-500">{language === 'es' ? 'Sube tu PDF para entrenamiento automático' : 'Upload PDF for auto-training'}</p>
                                    </div>
                                </div>

                                <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">{language === 'es' ? 'Subir Manual de Marca / Brief (PDF)' : 'Upload Brand Book / Brief (PDF)'}</h4>
                                <p className="text-[11px] text-slate-400 font-medium max-w-sm mx-auto mb-6">
                                    {language === 'es'
                                        ? 'Sube tu PDF oficial (Máx 5MB). Almacenado por 30 días para uso temporal de la memoria de la IA.'
                                        : 'Upload your official PDF (Max 5MB). Stored for 30 days for temporary AI memory use.'}
                                </p>
                                <label className="cursor-pointer">
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-lg hover:shadow-emerald-500/20">
                                        {(pdfFile || profile.brandBookPdfName) ? (language === 'es' ? 'Cambiar Archivo' : 'Change File') : (language === 'es' ? 'Seleccionar PDF' : 'Select PDF')}
                                    </span>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) {
                                                    alert(language === 'es' ? "El archivo supera el límite de 5MB." : "File exceeds the 5MB limit.");
                                                    return;
                                                }
                                                setPdfFile(file);
                                            }
                                        }}
                                    />
                                </label>
                                {(pdfFile || profile.brandBookPdfName) && (
                                    <div className="mt-6 space-y-3">
                                        <div className="flex items-center justify-center gap-2 bg-emerald-500/10 py-2 px-4 rounded-lg">
                                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            <span className="text-[11px] font-bold text-emerald-300">
                                                {pdfFile ? `${pdfFile.name} (${(pdfFile.size / 1024 / 1024).toFixed(2)} MB)` : profile.brandBookPdfName}
                                            </span>
                                        </div>
                                        {pdfFile && (
                                            <button
                                                onClick={handleExtractFromPdf}
                                                disabled={isExtractingPdf}
                                                className="w-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border border-emerald-500/30 px-6 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:from-emerald-500 hover:to-cyan-500 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                                            >
                                                {isExtractingPdf ? (
                                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{language === 'es' ? 'Extrayendo con IA...' : 'Extracting with AI...'}</>
                                                ) : (
                                                    <><span>🤖</span>{language === 'es' ? 'Extraer Datos con IA' : 'Extract Data with AI'}</>
                                                )}
                                            </button>
                                        )}
                                        {pdfExtractStatus && (
                                            <p className="text-center text-[11px] font-bold text-emerald-400/80">{pdfExtractStatus}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Compliance & Settings */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-slate-900/50 rounded-[2.5rem] p-8 border border-white/5 shadow-2xl backdrop-blur-sm h-full flex flex-col">
                            <h3 className="text-xl font-black text-white mb-8 border-l-4 border-indigo-500 pl-4 uppercase tracking-tight">{language === 'es' ? 'Reglas y Cumplimiento' : 'Rules & Compliance'}</h3>

                            <div className="space-y-6 flex-grow">
                                <div className="space-y-3">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">{language === 'es' ? 'Nivel de Adherencia' : 'Adherence Level'}</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {['Strict', 'Flexible', 'Creative'].map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => setProfile({ ...profile, adherenceLevel: level as BrandProfile['adherenceLevel'] })}
                                                className={`p-4 rounded-xl text-left border transition-all ${profile.adherenceLevel === level ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' : 'bg-slate-950/30 border-white/5 text-slate-400 hover:bg-slate-950/50'}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs uppercase">{level}</span>
                                                    {profile.adherenceLevel === level && <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-2 px-1">
                                        {profile.adherenceLevel === 'Strict' && (language === 'es' ? 'La IA penalizará cualquier desviación del manual.' : 'AI will penalize any deviation from the manual.')}
                                        {profile.adherenceLevel === 'Flexible' && (language === 'es' ? 'Se permiten adaptaciones menores según el contexto.' : 'Minor adaptations allowed based on context.')}
                                        {profile.adherenceLevel === 'Creative' && (language === 'es' ? 'Prioriza impacto visual sobre reglas rígidas.' : 'Prioritizes visual impact over rigid rules.')}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">Do's & Don'ts</label>
                                    <textarea
                                        rows={8}
                                        value={profile.complianceRules}
                                        onChange={e => setProfile({ ...profile, complianceRules: e.target.value })}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white focus:border-indigo-500 outline-none transition-all placeholder:text-slate-600 resize-none"
                                        placeholder={language === 'es' ? '- NO usar rojo sobre negro&#10;- SIEMPRE incluir logo en esquina...' : '- DO NOT use red on black&#10;- ALWAYS include logo in corner...'}
                                    />
                                </div>
                            </div>

                            <div className="pt-8 mt-4 border-t border-white/5 space-y-3">
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className={`flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 ${saveStatus === 'success' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-[#ff477b] text-white shadow-[#ff477b]/20'}`}
                                    >
                                        {isSaving && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                        {saveStatus === 'success' ? 'GUARDADO' : (saveStatus === 'error' ? 'ERROR' : (language === 'es' ? 'GUARDAR' : 'SAVE'))}
                                    </button>
                                    <button
                                        onClick={activateProfile}
                                        className={`px-6 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${currentUser?.brandProfile?.brandName === profile.brandName && profile.brandName
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20'}`}
                                        title={language === 'es' ? 'Activar esta marca para todo el sistema' : 'Activate this brand for the entire system'}
                                    >
                                        {currentUser?.brandProfile?.brandName === profile.brandName && profile.brandName ? 'ACTIVA' : 'ACTIVAR'}
                                    </button>
                                </div>
                                <button
                                    onClick={resetCurrentProfile}
                                    className="w-full py-3 bg-white/5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all"
                                >
                                    {language === 'es' ? 'RESETEAR PERFIL' : 'RESET PROFILE'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Error Boundary to catch render crashes
class BrandIdentityErrorBoundary extends React.Component<
    { children: React.ReactNode; language: Language },
    { hasError: boolean; error: string }
> {
    constructor(props: { children: React.ReactNode; language: Language }) {
        super(props);
        this.state = { hasError: false, error: '' };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error: error.message || 'Unknown render error' };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('[BrandIdentity] Render crash:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
                    <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-3xl max-w-lg w-full text-center space-y-4">
                        <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-rose-500">
                            {this.props.language === 'es' ? 'Error en Brand Identity' : 'Brand Identity Error'}
                        </h3>
                        <p className="text-sm text-slate-400 font-medium break-words">{this.state.error}</p>
                        <button
                            onClick={() => { this.setState({ hasError: false, error: '' }); window.location.reload(); }}
                            className="w-full py-4 bg-[#ff477b] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#ff477b]/80 transition-all"
                        >
                            {this.props.language === 'es' ? 'Recargar Módulo' : 'Reload Module'}
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// Wrapped export with Error Boundary
const BrandIdentityWithBoundary: React.FC<BrandIdentityProps> = (props) => (
    <BrandIdentityErrorBoundary language={props.language}>
        <BrandIdentity {...props} />
    </BrandIdentityErrorBoundary>
);

export default BrandIdentityWithBoundary;
