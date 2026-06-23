import React, { useState, useEffect, useRef } from 'react';
import { BlogPost, BlogCategory, AuthUser } from '../types';
import { blogService } from '../services/blogService';
import { optimizeBlogPostSEO, auditBlogPostIntelligence, generateBlogPostContent } from '../services/geminiService';
import { convertGoogleDriveLink } from '../utils/mediaUtils';
import { nanobananaService } from '../services/ai/nanobananaService';

interface BlogPostEditorProps {
    post: BlogPost | null;
    user: AuthUser;
    onSave: () => void;
    onCancel: () => void;
}

const BlogPostEditor: React.FC<BlogPostEditorProps> = ({ post, user, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<BlogPost>>({
        title: '',
        content: '',
        category: 'AI',
        status: 'draft',
        featuredImage: '',
        tags: [],
        metaTitle: '',
        metaDescription: '',
        keywords: [],
        readingTime: '',
        seoScore: 0,
        originalityScore: 0,
        intelligenceAudit: undefined
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [showGenerationPrompt, setShowGenerationPrompt] = useState(false);
    const [generationPrompt, setGenerationPrompt] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [keywordInput, setKeywordInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (post) {
            setFormData(post);
        }
    }, [post]);

    const handleGenerateAI = async () => {
        if (!generationPrompt.trim()) {
            alert('Por favor, escribe una instrucción para la IA.');
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generateBlogPostContent(generationPrompt);
            if (result && result.title && result.content) {
                setFormData(prev => ({
                    ...prev,
                    title: result.title || prev.title,
                    content: result.content || prev.content,
                    category: result.category || prev.category,
                    metaTitle: result.metaTitle || prev.metaTitle,
                    metaDescription: result.metaDescription || prev.metaDescription,
                    keywords: Array.isArray(result.keywords) ? result.keywords : prev.keywords
                }));
                setShowGenerationPrompt(false);
                setGenerationPrompt('');
                alert('Contenido generado con éxito por la IA.');
            } else {
                throw new Error('La respuesta de la IA es incompleta.');
            }
        } catch (error) {
            console.error('AI Generation failed', error);
            alert('No se pudo generar el contenido en este momento.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            alert('El título y contenido son obligatorios.');
            return;
        }

        setIsSaving(true);
        try {
            // If it's an external post, we clear the ID so blogService generates a new local one
            // This transforms the external post into a managed local post upon first edit/save
            const postToSave = {
                ...formData,
                id: formData.id?.startsWith('external-') ? undefined : formData.id,
                title: formData.title!,
                content: formData.content!,
                authorId: user.id,
                authorName: user.username,
                authorPicture: user.picture
            };

            blogService.savePost(postToSave as any, user.id);
            onSave();
        } catch (error) {
            console.error('Error saving post', error);
            alert('Error al guardar la entrada.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleOptimizeSEO = async () => {
        if (!formData.title || !formData.content) {
            alert('Necesitas un título y contenido para optimizar el SEO.');
            return;
        }
        setIsOptimizing(true);
        try {
            const suggestions = await optimizeBlogPostSEO(formData.title, formData.content);
            
            setFormData(prev => ({
                ...prev,
                metaTitle: suggestions?.metaTitle || prev.metaTitle,
                metaDescription: suggestions?.metaDescription || prev.metaDescription,
                keywords: Array.isArray(suggestions?.keywords) ? suggestions.keywords : prev.keywords,
                readingTime: suggestions?.readingTime || prev.readingTime
            }));
            
            alert('SEO optimizado con éxito por la IA.');
        } catch (error) {
            console.error('SEO Optimization failed', error);
            alert('No se pudo optimizar el SEO en este momento.');
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleIntelligenceAudit = async () => {
        if (!formData.title || !formData.content) {
            alert('Necesitas un título y contenido para realizar la auditoría.');
            return;
        }
        setIsAuditing(true);
        try {
            const audit = await auditBlogPostIntelligence(formData.title, formData.content);
            
            // Validate audit object before updating state
            if (audit && typeof audit.seoScore === 'number') {
                setFormData(prev => ({
                    ...prev,
                    seoScore: audit.seoScore,
                    originalityScore: audit.originalityScore ?? prev.originalityScore,
                    intelligenceAudit: audit.intelligenceAudit || prev.intelligenceAudit
                }));
                alert('Auditoría de Inteligencia completada con éxito.');
            } else {
                throw new Error('La respuesta de la IA no tiene el formato esperado.');
            }
        } catch (error) {
            console.error('Intelligence Audit failed', error);
            alert('No se pudo realizar la auditoría en este momento.');
        } finally {
            setIsAuditing(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!formData.title && !formData.content) {
            alert('Por favor agrega un título o contenido para que la IA entienda el contexto de la imagen.');
            return;
        }
        setIsGeneratingImage(true);
        try {
            const promptContext = `Crea una imagen destacada para un artículo de blog sobre: ${formData.title}. Etiquetas del post: ${formData.tags?.join(', ')}. Estilo premium, corporativo y tecnológico.`;
            const referenceUrl = 'https://franklinsanchez.com/wp-content/uploads/2025/09/franklin-camisa-negra-fondo-transparente-1.png';
            
            const generatedImageUrl = await nanobananaService.generateBlogImage(promptContext, referenceUrl);
            
            setFormData(prev => ({
                ...prev,
                featuredImage: generatedImageUrl
            }));
            alert('Imagen generada con éxito con NanoBanana.');
        } catch (error: any) {
            console.error('Image Generation failed', error);
            alert(`No se pudo generar la imagen: ${error.message || 'Error desconocido'}`);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const injectHTML = (tag: string, endTag?: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selection = text.substring(start, end);

        const before = text.substring(0, start);
        const after = text.substring(end);

        const newText = endTag
            ? `${before}<${tag}>${selection}</${endTag}>${after}`
            : `${before}<${tag}>${selection}${after}`;

        setFormData({ ...formData, content: newText });
    };

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!formData.tags?.includes(tagInput.trim())) {
                setFormData({
                    ...formData,
                    tags: [...(formData.tags || []), tagInput.trim()]
                });
            }
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setFormData({
            ...formData,
            tags: formData.tags?.filter(t => t !== tag)
        });
    };

    return (
        <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                        {post ? 'Editar Entrada' : 'Nueva Entrada'}
                    </h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                        {post ? `ID: ${post.id}` : 'Creando nuevo contenido para el blog'}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowGenerationPrompt(!showGenerationPrompt)}
                        className="flex items-center gap-2 px-6 py-4 bg-magenta-50 border border-magenta-100/50 rounded-xl text-magenta font-black text-[11px] uppercase tracking-widest hover:bg-magenta-100/20 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        {showGenerationPrompt ? 'Cerrar Generador' : 'Generar con IA'}
                    </button>
                    <button
                        onClick={handleOptimizeSEO}
                        disabled={isOptimizing}
                        className="flex items-center gap-2 px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all disabled:opacity-50"
                    >
                        {isOptimizing ? 'Optimizando...' : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                SEO AI Assistant
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleIntelligenceAudit}
                        disabled={isAuditing}
                        className="flex items-center gap-2 px-6 py-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
                    >
                        {isAuditing ? 'Auditando...' : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                Auditoría de Inteligencia
                            </>
                        )}
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-8 py-4 bg-white border border-slate-200 rounded-xl text-slate-400 font-black text-[11px] uppercase tracking-widest hover:text-slate-900 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-indigo-600 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            'Publicar Entrada'
                        )}
                    </button>
                </div>
            </div>

            {showGenerationPrompt && (
                <div className="mb-10 p-8 bg-slate-900 rounded-[2.5rem] border border-white/10 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-8 h-8 bg-magenta rounded-lg flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Generador de Contenido Original INsitu AI</h4>
                    </div>
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">¿Qué quieres que escriba la IA? (Ejem: "El impacto de la IA en el e-commerce b2b")</label>
                        <div className="flex gap-4">
                            <textarea
                                value={generationPrompt}
                                onChange={(e) => setGenerationPrompt(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-lg font-medium outline-none focus:border-magenta transition-all min-h-[120px] resize-none"
                                placeholder="Proporciona una temática o instrucción breve..."
                            />
                            <div className="flex flex-col justify-end">
                                <button
                                    onClick={handleGenerateAI}
                                    disabled={isGenerating || !generationPrompt.trim()}
                                    className="bg-magenta text-white px-8 py-6 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-magenta/80 transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    {isGenerating ? (
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            Generar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                            * La IA aplicará automáticamente el tono premium de INsitu AI, formato H2/H3 y optimización SEO Semántica.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Título de la Entrada</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] py-5 px-8 text-2xl font-black text-slate-900 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                            placeholder="Escribe un título impactante..."
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Contenido (WordPress Style Rich Editor)</label>
                            <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-100/80 rounded-2xl shadow-sm">
                                <button onClick={(e) => { e.preventDefault(); injectHTML('b', 'b'); }} className="w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold text-slate-400 hover:text-slate-900 hover:bg-white transition-all shadow-sm hover:shadow" title="Bold">B</button>
                                <button onClick={(e) => { e.preventDefault(); injectHTML('i', 'i'); }} className="w-8 h-8 flex items-center justify-center rounded-xl text-xs italic text-slate-400 hover:text-slate-900 hover:bg-white transition-all shadow-sm hover:shadow" title="Italic">/</button>
                                
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                
                                <button onClick={(e) => { e.preventDefault(); injectHTML('h1', 'h1'); }} className="px-3 h-8 flex items-center justify-center rounded-xl text-xs font-bold text-slate-400 hover:text-slate-900 hover:bg-white transition-all shadow-sm hover:shadow">H1</button>
                                <button onClick={(e) => { e.preventDefault(); injectHTML('h2', 'h2'); }} className="px-3 h-8 flex items-center justify-center rounded-xl text-xs font-bold text-slate-400 hover:text-slate-900 hover:bg-white transition-all shadow-sm hover:shadow">H2</button>
                                
                                <button onClick={(e) => { e.preventDefault(); injectHTML('blockquote', 'blockquote'); }} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-slate-900 shadow-md border border-slate-100 transition-all font-serif italic text-xs" title="Quote">"</button>
                                
                                <div className="w-px h-4 bg-slate-200 mx-1" />
                                
                                <button onClick={(e) => { e.preventDefault(); injectHTML('ul', 'ul'); }} className="px-3 h-8 flex items-center justify-center rounded-xl text-xs font-bold text-slate-400 hover:text-slate-900 hover:bg-white transition-all shadow-sm hover:shadow">UL</button>
                                <button onClick={(e) => { e.preventDefault(); injectHTML('li', 'li'); }} className="px-3 h-8 flex items-center justify-center rounded-xl text-xs font-bold text-slate-400 hover:text-slate-900 hover:bg-white transition-all shadow-sm hover:shadow">LI</button>
                                <button onClick={(e) => { e.preventDefault(); injectHTML('a href="#"', 'a'); }} className="px-3 h-8 flex items-center justify-center rounded-xl text-xs font-bold text-slate-400 hover:text-slate-900 hover:bg-white transition-all shadow-sm hover:shadow">Link</button>
                            </div>
                        </div>
                        <textarea
                            ref={textareaRef}
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] py-8 px-8 text-base font-medium text-slate-900 focus:border-indigo-500 outline-none transition-all min-h-[500px] resize-y font-mono placeholder:text-slate-400"
                            placeholder="Desarrolla tu contenido aquí..."
                        />
                    </div>

                    {/* Meta SEO Section */}
                    <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 space-y-6">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Optimización SEO & Descubribilidad AI</h4>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Meta Title</label>
                                <input
                                    type="text"
                                    value={formData.metaTitle}
                                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500"
                                    placeholder="Título para Google y LLMs..."
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tiempo de Lectura Estimado</label>
                                <input
                                    type="text"
                                    value={formData.readingTime}
                                    onChange={(e) => setFormData({ ...formData, readingTime: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500"
                                    placeholder="Ej: 5 min..."
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Meta Description (Snippet)</label>
                            <textarea
                                value={formData.metaDescription}
                                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-xl py-4 px-6 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500 min-h-[100px] resize-none"
                                placeholder="Talla una descripción que invite al clic..."
                            />
                        </div>

                    {/* Intelligence Audit Section */}
                    {formData.intelligenceAudit && (
                        <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-white/10 space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                    </div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Reporte de Inteligencia & Verdad Absoluta</h4>
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                    Auditado: {new Date(formData.intelligenceAudit.lastAuditAt).toLocaleString()}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center">
                                    <div className="text-3xl font-black text-emerald-400 mb-1">{formData.seoScore}%</div>
                                    <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Potencial SEO</div>
                                </div>
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center">
                                    <div className="text-3xl font-black text-indigo-400 mb-1">{formData.originalityScore}%</div>
                                    <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Originalidad</div>
                                </div>
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center">
                                    <div className="text-3xl font-black text-amber-400 mb-1">{formData.intelligenceAudit.truthFactor}%</div>
                                    <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Factor de Verdad</div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <h5 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                        Crítica SEO Estratégica
                                    </h5>
                                    <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                                        "{formData.intelligenceAudit.seoCritique}"
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <h5 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        Análisis de Originalidad & Valor
                                    </h5>
                                    <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                                        "{formData.intelligenceAudit.originalityAnalysis}"
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex flex-wrap gap-2">
                                {formData.intelligenceAudit.topSkillsUsed.map(skill => (
                                    <span key={skill} className="px-3 py-1 bg-white/5 text-slate-400 rounded-lg text-[11px] font-bold uppercase tracking-wider border border-white/5">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Keywords para IA Indexing (Separadas por coma)</label>
                            <div className="flex flex-wrap gap-2 p-4 bg-white border border-slate-200 rounded-xl">
                                {formData.keywords?.map(kw => (
                                    <span key={kw} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[11px] font-bold">
                                        {kw}
                                        <button onClick={() => setFormData({ ...formData, keywords: formData.keywords?.filter(k => k !== kw) })} className="ml-2 hover:text-rose-500">×</button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={keywordInput}
                                    onChange={(e) => setKeywordInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && keywordInput.trim()) {
                                            e.preventDefault();
                                            setFormData({ ...formData, keywords: [...(formData.keywords || []), keywordInput.trim()] });
                                            setKeywordInput('');
                                        }
                                    }}
                                    className="flex-1 outline-none text-sm font-medium text-slate-900"
                                    placeholder="Add keyword..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 space-y-8">
                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as BlogCategory })}
                                className="w-full bg-white border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500"
                            >
                                {blogService.getCategories().map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Estado</label>
                            <div className="flex p-1 bg-white border border-slate-200 rounded-xl">
                                <button
                                    onClick={() => setFormData({ ...formData, status: 'draft' })}
                                    className={`flex-1 py-3 text-[11px] font-black uppercase rounded-lg transition-all ${formData.status === 'draft' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400'}`}
                                >
                                    Borrador
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, status: 'published' })}
                                    className={`flex-1 py-3 text-[11px] font-black uppercase rounded-lg transition-all ${formData.status === 'published' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400'}`}
                                >
                                    Publicado
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Imagen Destacada (URL)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.featuredImage}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const converted = convertGoogleDriveLink(val);
                                        setFormData({ ...formData, featuredImage: converted });
                                    }}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl py-4 px-6 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500"
                                    placeholder="https://..."
                                />
                                <div className="flex flex-col gap-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (formData.featuredImage) {
                                                const converted = convertGoogleDriveLink(formData.featuredImage);
                                                setFormData({ ...formData, featuredImage: converted });
                                            }
                                        }}
                                        className="h-10 px-4 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-black uppercase hover:bg-indigo-100 transition-all border border-indigo-100 flex items-center justify-center"
                                        title="Convertir Link de Drive"
                                    >
                                        Drive
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleGenerateImage}
                                        disabled={isGeneratingImage}
                                        className="h-10 px-4 bg-magenta-50 text-magenta rounded-xl text-[11px] font-black uppercase hover:bg-magenta-100 transition-all border border-magenta-100/50 flex items-center justify-center disabled:opacity-50"
                                        title="Generar imagen con IA (NanoBanana)"
                                    >
                                        {isGeneratingImage ? (
                                             <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        ) : (
                                            'Gemini AI'
                                        )}
                                    </button>
                                </div>
                            </div>
                            {formData.featuredImage && (
                                <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-white">
                                    <img src={formData.featuredImage} className="w-full h-full object-cover" alt="Preview" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tags (Presiona Enter)</label>
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={addTag}
                                    className="w-full bg-white border border-slate-200 rounded-xl py-4 px-6 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500"
                                    placeholder="marketing, ai, etc..."
                                />
                                <div className="flex flex-wrap gap-2">
                                    {formData.tags?.map(tag => (
                                        <span key={tag} className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-black uppercase">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="ml-2 hover:text-rose-500">×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h4 className="font-black uppercase text-[12px] tracking-widest">Consejo de Experto</h4>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Usa el **SEO AI Assistant** para optimizar la descubribilidad. Los LLMs buscan estructuras claras (H1, H2) y metadatos precisos para indexar tu contenido.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlogPostEditor;
