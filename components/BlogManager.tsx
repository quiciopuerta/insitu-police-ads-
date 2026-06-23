import React, { useState, useEffect } from 'react';
import { BlogPost, BlogCategory, Language } from '../types';
import { blogService } from '../services/blogService';
import { fetchFranklinSanchezPosts } from '../utils/blogSeedData';
import { fetchInsituPosts, adaptForSave, ImportableBlogPost } from '../utils/blogImporter';
import { useAuth } from '../hooks/useAuth';
import { sanitizeURL } from '../utils/securityUtils';


interface BlogManagerProps {
    onEdit: (post: BlogPost) => void;
    onCreate: () => void;
    language: Language;
}

const BlogManager: React.FC<BlogManagerProps> = ({ onEdit, onCreate, language }) => {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [hiddenExternalIds, setHiddenExternalIds] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('insitu_hidden_external_posts') || '[]');
        } catch { return []; }
    });
    const [filter, setFilter] = useState<string>('');
    const [categoryFilter, setCategoryFilter] = useState<BlogCategory | 'All'>('All');
    const { currentUser } = useAuth(language);

    // Import State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importablePosts, setImportablePosts] = useState<ImportableBlogPost[]>([]);
    const [isImportLoading, setIsImportLoading] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [selectedWpIds, setSelectedWpIds] = useState<Set<number>>(new Set());
    const [importingInProgress, setImportingInProgress] = useState(false);

    useEffect(() => {
        loadPosts();
    }, [hiddenExternalIds]);

    const loadPosts = async () => {
        const all = await blogService.getAllPosts(currentUser?.id);
        try {
            const externalPosts = await fetchFranklinSanchezPosts();
            const mappedExternal = externalPosts
                .filter(p => !hiddenExternalIds.includes(`external-${p.id}`))
                .map(p => ({
                    id: `external-${p.id}`,
                    title: p.title,
                    slug: `ext-${p.id}`,
                    content: p.content,
                    excerpt: p.excerpt,
                    authorId: 'external',
                    authorName: p.author,
                    publishedAt: new Date(p.date).getTime(),
                    updatedAt: new Date(p.date).getTime(),
                    status: 'published' as const,
                    category: (p.categories?.[0] as any) || 'AI',
                    tags: p.categories || [],
                    featuredImage: p.featuredImage,
                    externalLink: p.link,
                    isExternal: true
                }));
            const mixed = [...all, ...mappedExternal].sort((a, b) => b.updatedAt - a.updatedAt);
            setPosts(mixed as BlogPost[]);
        } catch (error) {
            console.error("Error loading external posts for admin", error);
            setPosts(all.sort((a, b) => b.updatedAt - a.updatedAt));
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta entrada?')) {
            if (id.startsWith('external-')) {
                const numericId = id.replace('external-', '');
                try {
                    // Call proxy to "delete" (simulated)
                    const baseUrl = (import.meta as any).env.VITE_API_API_URL || import.meta.env.VITE_API_URL || '';
                    const targetUrl = baseUrl ? `${baseUrl}/blog-external/${numericId}` : `/api/blog-external/${numericId}`;
                    await fetch(targetUrl, { method: 'DELETE' });
                } catch (e) { console.warn("Failed to notify external deletion", e); }
                
                const newHidden = [...hiddenExternalIds, id];
                setHiddenExternalIds(newHidden);
                localStorage.setItem('insitu_hidden_external_posts', JSON.stringify(newHidden));
            } else {
                if (await blogService.deletePost(id, currentUser?.id)) {
                    loadPosts();
                }
            }
        }
    };

    const handleToggleStatus = async (id: string) => {
        if (await blogService.toggleStatus(id, currentUser?.id)) {
            loadPosts();
        }
    };

    const openImportModal = async () => {
        setIsImportModalOpen(true);
        setIsImportLoading(true);
        setImportError(null);
        setSelectedWpIds(new Set());
        
        const existingIds = new Set(posts.map(p => p.id));
        const existingSlugs = new Set(posts.map(p => p.slug));
        const { posts: found, error } = await fetchInsituPosts(existingIds, existingSlugs);
        
        setImportablePosts(found);
        setImportError(error || null);
        setIsImportLoading(false);
    };

    const handleImportSelected = async () => {
        if (selectedWpIds.size === 0 || !currentUser) return;
        
        setImportingInProgress(true);
        const toImport = importablePosts.filter(p => selectedWpIds.has(p.wpId));
        
        let successCount = 0;
        for (const imp of toImport) {
            try {
                const prepared = adaptForSave(imp, currentUser.id, currentUser.username || 'Admin');
                await blogService.savePost(prepared as any, currentUser.id);
                successCount++;
            } catch (e) {
                console.error("Failed to import post", imp.title, e);
            }
        }
        
        setImportingInProgress(false);
        setIsImportModalOpen(false);
        if (successCount > 0) {
            alert(successCount === 1 ? '1 entrada importada con éxito' : `${successCount} entradas importadas con éxito`);
            loadPosts();
        }
    };

    const toggleSelectPost = (wpId: number) => {
        const newSet = new Set(selectedWpIds);
        if (newSet.has(wpId)) newSet.delete(wpId);
        else newSet.add(wpId);
        setSelectedWpIds(newSet);
    };

    const filteredPosts = posts.filter(post => {
        const matchesSearch = post.title.toLowerCase().includes(filter.toLowerCase()) ||
            post.content.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || post.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = blogService.getCategories();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex-1 w-full md:max-w-md relative">
                    <input
                        type="text"
                        placeholder="Buscar entradas..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] py-4 px-6 text-sm font-medium outline-none focus:border-indigo-500 transition-all pl-12"
                    />
                    <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value as any)}
                        className="bg-white border border-slate-200 rounded-xl py-4 px-6 text-sm font-bold outline-none focus:border-indigo-500"
                    >
                        <option value="All">Todas las Categorías</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <button
                        onClick={openImportModal}
                        className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-6 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2 group shadow-sm active:scale-95"
                    >
                        <svg className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Importar de Blog
                    </button>

                    <button
                        onClick={onCreate}
                        className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 shrink-0"
                    >
                        + Nueva Entrada
                    </button>
                </div>
            </div>

            {isImportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !importingInProgress && setIsImportModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Importar Contenido Externo</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">franklinsanchez.com → INsitu</p>
                            </div>
                            <button 
                                onClick={() => setIsImportModalOpen(false)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                                disabled={importingInProgress}
                            >
                                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8">
                            {isImportLoading ? (
                                <div className="py-20 flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                                    <p className="text-slate-400 font-bold uppercase text-[11px] tracking-widest">Buscando artículos con etiqueta "insitu"...</p>
                                </div>
                            ) : importError ? (
                                <div className="py-20 text-center space-y-4">
                                    <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    </div>
                                    <h4 className="text-xl font-black text-slate-900 mb-2">No se detectó contenido etiquetado</h4>
                                    <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed mb-8">
                                        {importError}
                                    </p>
                                    
                                    <div className="bg-slate-50 border border-slate-100 rounded-3xl p-8 max-w-lg mx-auto text-left space-y-4">
                                        <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Guía de Importación:</p>
                                        <ul className="text-sm text-slate-600 space-y-3 font-medium">
                                            <li className="flex items-center gap-3">
                                                <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[11px] font-bold">1</span>
                                                Ve a tu WordPress en <code className="bg-white px-2 py-0.5 rounded border border-slate-200">franklinsanchez.com</code>
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[11px] font-bold">2</span>
                                                Edita el post y añade la etiqueta <strong className="text-indigo-600 font-black">"insitu"</strong>
                                            </li>
                                            <li className="flex items-center gap-3">
                                                <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[11px] font-bold">3</span>
                                                Guarda los cambios y pulsa "Reintentar" o cierra este modal.
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="pt-8">
                                        <button 
                                            onClick={openImportModal}
                                            className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                                        >
                                            Reintentar Búsqueda
                                        </button>
                                    </div>
                                </div>
                            ) : importablePosts.length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <h4 className="text-xl font-black text-slate-900 mb-2">¡Todo al día!</h4>
                                    <p className="text-slate-400 font-bold italic">No se encontraron artículos nuevos para importar con la etiqueta "insitu".</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                                            Se encontraron {importablePosts.length} artículos
                                        </p>
                                        <div className="flex gap-4">
                                            <button 
                                                onClick={() => setSelectedWpIds(new Set(importablePosts.filter(p => !p.alreadyImported).map(p => p.wpId)))}
                                                className="text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                            >
                                                Seleccionar Todos
                                            </button>
                                            <button 
                                                onClick={() => setSelectedWpIds(new Set())}
                                                className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:underline"
                                            >
                                                Deseleccionar
                                            </button>
                                        </div>
                                    </div>
                                    {importablePosts.map(post => (
                                        <div 
                                            key={post.wpId}
                                            onClick={() => !post.alreadyImported && toggleSelectPost(post.wpId)}
                                            className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex gap-6 ${
                                                post.alreadyImported ? 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed' :
                                                selectedWpIds.has(post.wpId) ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 hover:border-slate-200'
                                            }`}
                                        >
                                            {post.featuredImage ? (
                                                <img src={post.featuredImage} className="w-24 h-24 rounded-2xl object-cover shadow-sm bg-slate-200" alt="" />
                                            ) : (
                                                <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-black text-slate-900 leading-tight">{post.title}</h4>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                                                        post.alreadyImported ? 'bg-emerald-500 border-emerald-500 text-white' :
                                                        selectedWpIds.has(post.wpId) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'
                                                    }`}>
                                                        {post.alreadyImported ? (
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                        ) : selectedWpIds.has(post.wpId) && (
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{post.excerpt}</p>
                                                <div className="flex flex-wrap gap-2 mt-4">
                                                    {post.tagNames.map(tag => (
                                                        <span key={tag} className="text-[11px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-400 rounded-md">#{tag}</span>
                                                    ))}
                                                    {post.alreadyImported && (
                                                        <span className="text-[11px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-md ml-auto">Ya Importado</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-slate-100 flex justify-end items-center gap-4 bg-slate-50/50">
                            <button 
                                onClick={() => setIsImportModalOpen(false)}
                                className="px-6 py-4 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                disabled={importingInProgress}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleImportSelected}
                                disabled={selectedWpIds.size === 0 || importingInProgress}
                                className={`flex items-center gap-3 px-8 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg ${
                                    selectedWpIds.size === 0 || importingInProgress
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                                }`}
                            >
                                {importingInProgress ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Importando...
                                    </>
                                ) : (
                                    <>Importar {selectedWpIds.size} Artículos</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden overflow-x-auto shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[11px] font-black uppercase text-slate-400">
                        <tr>
                            <th className="px-8 py-6">Entrada</th>
                            <th className="px-8 py-6">Categoría</th>
                            <th className="px-8 py-6">Estado</th>
                            <th className="px-8 py-6">Inteligencia</th>
                            <th className="px-8 py-6">Fecha</th>
                            <th className="px-8 py-6 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredPosts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold italic">
                                    No se encontraron entradas de blog.
                                </td>
                            </tr>
                        ) : (
                            filteredPosts.map(post => (
                                <tr key={post.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-4">
                                            {post.featuredImage ? (
                                                <img src={post.featuredImage} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300">
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{post.title}</p>
                                                <p className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Por {post.authorName}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[11px] font-black uppercase px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full">{post.category}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        {(post as any).externalLink ? (
                                            <span className="text-[11px] font-black uppercase px-3 py-1 bg-violet-100 text-violet-600 rounded-full border border-violet-200">Externa</span>
                                        ) : (
                                            <button
                                                onClick={() => handleToggleStatus(post.id)}
                                                className={`text-[11px] font-black uppercase px-3 py-1 rounded-full transition-all ${post.status === 'published'
                                                        ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                        : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                                    }`}
                                            >
                                                {post.status === 'published' ? 'Publicado' : 'Borrador'}
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center space-x-2">
                                            <div 
                                                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[11px] font-black ${
                                                    (post.seoScore || 0) >= 80 ? 'border-emerald-500 text-emerald-600 bg-emerald-50' :
                                                    (post.seoScore || 0) >= 50 ? 'border-amber-500 text-amber-600 bg-amber-50' :
                                                    'border-rose-500 text-rose-600 bg-rose-50'
                                                }`}
                                                title="SEO Score"
                                            >
                                                {post.seoScore || '--'}
                                            </div>
                                            <div 
                                                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[11px] font-black ${
                                                    (post.originalityScore || 0) >= 80 ? 'border-indigo-500 text-indigo-600 bg-indigo-50' :
                                                    (post.originalityScore || 0) >= 50 ? 'border-violet-500 text-violet-600 bg-violet-50' :
                                                    'border-slate-300 text-slate-400 bg-slate-50'
                                                }`}
                                                title="Originalidad"
                                            >
                                                {post.originalityScore || '--'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-xs font-bold text-slate-500">{new Date(post.updatedAt).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button
                                                onClick={() => onEdit(post)}
                                                className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 transition-all font-bold text-xs"
                                                title="Editar"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            
                                            {(post as any).externalLink && (
                                                <a
                                                    href={sanitizeURL((post as any).externalLink)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-violet-600 hover:border-violet-100 hover:bg-violet-50 transition-all"
                                                    title="Ver Original"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                </a>
                                            )}

                                            <button
                                                onClick={() => handleDelete(post.id)}
                                                className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all"
                                                title="Eliminar"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BlogManager;
