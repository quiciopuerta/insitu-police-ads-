import React, { useState, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { BlogPost, Language } from '../types';
import { blogService } from '../services/blogService';
import { fetchFranklinSanchezPosts, ExternalBlogPost } from '../utils/blogSeedData';

/** Site constants for SEO */
const SITE_URL = 'https://insitu.company';
const SITE_NAME = 'INsitu AI';
const SITE_LOGO = `${SITE_URL}/favicon.svg`;
const TWITTER_HANDLE = '@insituai';

/** Strip HTML tags and return plain text for articleBody / wordCount */
const stripHtml = (html: string): string =>
    html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** Convert epoch ms to ISO 8601 string */
const toISO = (timestamp: number): string => new Date(timestamp).toISOString();

interface BlogViewProps {
    language: Language;
    initialPost?: BlogPost | null;
    onPostViewed?: () => void;
}

const BlogView: React.FC<BlogViewProps> = ({ language, initialPost, onPostViewed }) => {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
    const [externalPosts, setExternalPosts] = useState<ExternalBlogPost[]>([]);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [scrollProgress, setScrollProgress] = useState(0);
    
    // Auto-Slider State
    const [currentSlide, setCurrentSlide] = useState(0);

    const allAvailablePosts = [...posts, ...externalPosts];

    // Auto-advance slider
    // Reading Progress Logic
    useEffect(() => {
        const handleScroll = () => {
            if (!selectedPost) return;
            const docElement = document.documentElement;
            const scrollTotal = docElement.scrollHeight - docElement.clientHeight;
            const currentScroll = window.scrollY;
            setScrollProgress((currentScroll / scrollTotal) * 100);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [selectedPost]);

    // Derived unique tags/categories
    const allTags = useMemo(() => {
        const localCategories = posts.map(p => p.category);
        const externalCategories = externalPosts.flatMap(p => p.categories || []);
        const localTags = posts.flatMap(p => p.tags || []);
        const unique = Array.from(new Set([...localCategories, ...externalCategories, ...localTags])).filter(Boolean);
        return unique.sort();
    }, [posts, externalPosts]);

    // Unified Filtered Content - Merged Local & External
    const allFilteredPosts = useMemo(() => {
        const matchQuery = (text: string) => text.toLowerCase().includes(searchQuery.toLowerCase());
        
        const local = posts.map(p => ({ ...p, isExternal: false }));
        
        const external = externalPosts.map(p => ({
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

        const combined = [...local, ...external];

        return combined.filter(p => {
            const matchesTag = !selectedTag || p.category === selectedTag || p.tags?.includes(selectedTag);
            const matchesSearch = !searchQuery || 
                matchQuery(p.title) || 
                matchQuery(p.excerpt) || 
                (p.content && matchQuery(p.content));
            return matchesTag && matchesSearch;
        }).sort((a, b) => b.publishedAt - a.publishedAt);
    }, [posts, externalPosts, selectedTag, searchQuery]);

    const filteredPosts = { local: [], external: [] }; // Legacy placeholder to avoid breaking potential refs, but we'll use allFilteredPosts

    useEffect(() => {
        if (!selectedPost) return;
        const relatedPosts = posts.filter(p => p.id !== selectedPost.id);
        if (relatedPosts.length === 0) return;

        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % relatedPosts.length);
        }, 4000); // 4 seconds per slide
        
        return () => clearInterval(interval);
    }, [selectedPost, posts]);

    useEffect(() => {
        blogService.getAllPosts().then(allPosts => {
            setPosts(allPosts.filter(p => p.status === 'published'));
        });
        fetchFranklinSanchezPosts().then(setExternalPosts);
    }, []);

    useEffect(() => {
        if (initialPost) {
            setSelectedPost(initialPost);
            if (onPostViewed) onPostViewed();
        }
    }, [initialPost, onPostViewed]);

    const handleSetExternalPost = (ext: ExternalBlogPost) => {
        const transformed: BlogPost = {
            id: `external-${ext.id}`,
            title: ext.title,
            slug: `ext-${ext.id}`,
            content: ext.content,
            excerpt: ext.excerpt,
            authorId: 'external',
            authorName: ext.author,
            publishedAt: new Date(ext.date).getTime(),
            updatedAt: new Date(ext.date).getTime(),
            status: 'published',
            category: (ext.categories?.[0] as any) || 'AI',
            tags: ext.categories || [],
            featuredImage: ext.featuredImage,
        };
        (transformed as any).externalLink = ext.link;
        setSelectedPost(transformed);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#020617] pt-32 pb-20 px-4 md:px-8 font-sans">
            {/* Reading Progress Indicator */}
            {selectedPost && (
                <motion.div 
                    className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-magenta to-cyan z-[100] origin-left"
                    style={{ scaleX: scrollProgress / 100 }}
                />
            )}
            
            <div className="max-w-7xl mx-auto">
                {selectedPost ? (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <a
                            href="/blog"
                            onClick={(e) => {
                                e.preventDefault();
                                setSelectedPost(null);
                            }}
                            className="group flex items-center space-x-3 text-white/40 hover:text-magenta transition-all mb-12 uppercase text-[11px] font-black tracking-[0.3em]"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-magenta/10 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                            </div>
                            <span>Volver al blog</span>
                        </a>

                        <header className="relative aspect-[21/9] rounded-[4rem] overflow-hidden mb-16 border border-white/10 group bg-gradient-to-br from-slate-800 to-slate-900">
                            {selectedPost.featuredImage && (
                                <img
                                    src={selectedPost.featuredImage}
                                    alt={selectedPost.title}
                                    className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-1000"
                                    loading="eager"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent" />
                            <div className="absolute bottom-12 left-12 right-12">
                                <span className="px-6 py-2 bg-magenta text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-full mb-6 inline-block shadow-[0_0_20px_rgba(255,71,123,0.3)]">
                                    {selectedPost.category}
                                </span>
                                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none max-w-4xl uppercase">
                                    {selectedPost.title}
                                </h1>
                            </div>
                        </header>

                        <article className="grid grid-cols-1 lg:grid-cols-12 gap-16" role="article" aria-label={selectedPost.title}>
                            <main className="lg:col-span-8">
                                <div className="prose prose-invert prose-xl max-w-none 
                                    prose-p:text-slate-300 prose-p:leading-relaxed prose-p:font-light prose-p:mb-8 prose-p:text-justify prose-p:tracking-wide
                                    prose-headings:text-slate-50 prose-headings:tracking-tighter prose-headings:font-black prose-headings:uppercase 
                                    prose-h1:text-4xl prose-h1:mb-12 prose-h2:text-white prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-8 prose-h3:text-[#ff477b] prose-h3:text-2xl prose-h3:mt-12 prose-h3:mb-6                                    prose-strong:text-[#ff477b] prose-strong:font-bold 
                                    prose-a:text-[#ff477b] prose-a:no-underline prose-a:border-b prose-a:border-[#ff477b]/30 hover:prose-a:border-[#ff477b] hover:prose-a:text-[#ff477b]/80 prose-a:transition-all 
                                    prose-blockquote:border-l-4 prose-blockquote:border-l-[#ff477b] prose-blockquote:bg-[#ff477b]/5 prose-blockquote:py-4 prose-blockquote:px-8 prose-blockquote:rounded-r-3xl prose-blockquote:not-italic prose-blockquote:text-slate-200 prose-blockquote:shadow-inner prose-blockquote:my-10
                                    prose-li:marker:text-[#ff477b] prose-ul:font-light prose-ul:text-slate-300 prose-ul:mb-10 prose-li:mb-3
                                    prose-img:rounded-[2rem] prose-img:shadow-2xl prose-img:border prose-img:border-white/5 prose-img:w-full prose-img:h-auto prose-img:object-cover
                                    prose-hr:border-white/10 prose-hr:my-16">
                                    
                                    {selectedPost.authorId === 'external' && (
                                        <div className="mb-12 p-8 bg-cyan/5 border border-cyan/20 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 group/source animate-in fade-in slide-in-from-top-4 duration-700">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-cyan/10 flex items-center justify-center border border-cyan/20 group-hover/source:scale-110 transition-transform">
                                                    <svg className="w-7 h-7 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-white/30 text-[11px] font-black uppercase tracking-[0.3em] mb-1">Fuente Externa</p>
                                                    <p className="text-white text-sm font-bold leading-tight">Este artículo fue publicado originalmente en <span className="text-cyan">franklinsanchez.com</span></p>
                                                </div>
                                            </div>
                                            <a 
                                                href={(selectedPost as any).externalLink} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="px-8 py-3.5 bg-cyan/10 border border-cyan/30 text-cyan text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-cyan hover:text-slate-950 transition-all shadow-lg shadow-cyan/10"
                                            >
                                                Ver Original
                                            </a>
                                        </div>
                                    )}

                                    <div className="relative flow-root wp-content-container" dangerouslySetInnerHTML={{ 
                                        __html: DOMPurify.sanitize(selectedPost.content || '', { 
                                            ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'img', 'ul', 'ol', 'li', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'blockquote', 'code', 'pre', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
                                            ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'title', 'width', 'height', 'target', 'rel'],
                                            ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
                                            ADD_ATTR: ['target', 'rel'],
                                            FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form', 'base'],
                                            FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover', 'onfocus', 'onblur', 'style'],
                                            ALLOW_DATA_ATTR: false
                                        }) 
                                    }} />
                                    
                                    <footer className="mt-20 pt-10 border-t border-white/5 flex flex-wrap gap-3" aria-label="Etiquetas del artículo">
                                        {selectedPost.tags?.map(tag => (
                                            <a 
                                                key={tag} 
                                                href={`/blog?tag=${tag}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setSelectedTag(tag);
                                                    setSelectedPost(null);
                                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                                }}
                                                className="px-4 py-1.5 bg-white/5 text-white/40 text-[11px] font-black rounded-full border border-white/5 uppercase tracking-widest hover:border-magenta/30 hover:text-magenta transition-all"
                                            >
                                                #{tag}
                                            </a>
                                        ))}
                                    </footer>
                                </div>
                            </main>
                            <aside className="lg:col-span-4 space-y-12" aria-label="Barra lateral">
                                <div className="bg-[#0f0a14]/80 border border-[#ff477b]/20 rounded-[3rem] p-10 backdrop-blur-3xl sticky top-32 shadow-[0_0_40px_-15px_rgba(255,71,123,0.15)] group hover:border-[#ff477b]/40 transition-all duration-500">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#ff477b]/5 to-transparent rounded-[3rem] pointer-events-none" />
                                    <h3 className="relative text-white font-black uppercase tracking-[0.2em] text-sm mb-6 pb-6 border-b border-white/5">
                                        <span className="text-[#ff477b] mr-2">✦</span> Newsletter
                                    </h3>
                                    <p className="relative text-white/60 text-sm leading-relaxed mb-8 font-medium">Únete a +2,500 marketers que ya usan IA para escalar sus campañas.</p>
                                    <form className="relative space-y-4" onSubmit={(e) => e.preventDefault()}>
                                        <input type="email" placeholder="email@agency.com" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white focus:border-[#ff477b] focus:ring-1 focus:ring-[#ff477b] outline-none transition-all font-bold placeholder:text-white/20 text-sm" />
                                        <button className="w-full bg-[#ff477b] text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-[#ff477b]/80 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-[#ff477b]/30">
                                            Suscripción Gratis
                                        </button>
                                    </form>
                                </div>
                            </aside>
                        </article>

                        {/* 3D Auto-Slider for Related Posts */}
                        <section className="mt-32 border-t border-white/5 pt-20" aria-label="Artículos relacionados">
                            <div className="flex justify-between items-end mb-12">
                                <div>
                                    <h3 className="text-[#ff477b] text-[11px] font-black uppercase tracking-[0.3em] mb-4">Sigue Aprendiendo</h3>
                                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Artículos Relacionados</h2>
                                </div>
                                <div className="hidden md:flex gap-3">
                                    <button 
                                        onClick={() => setCurrentSlide((prev) => (prev - 1 + allAvailablePosts.filter(p => p.id !== selectedPost.id).length) % allAvailablePosts.filter(p => p.id !== selectedPost.id).length)}
                                        className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#ff477b] hover:border-[#ff477b]/50 transition-all hover:bg-[#ff477b]/10 backdrop-blur-md"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <button 
                                        onClick={() => setCurrentSlide((prev) => (prev + 1) % allFilteredPosts.filter(p => p.id !== selectedPost.id).length)}
                                        className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#ff477b] hover:border-[#ff477b]/50 transition-all hover:bg-[#ff477b]/10 backdrop-blur-md"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            </div>

                            <div className="relative h-[480px] w-full perspective-1000 overflow-hidden flex items-center justify-center">
                                {/* Only render if we have related posts */}
                                {allFilteredPosts.filter(p => p.id !== selectedPost.id).length > 0 && (
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        {allFilteredPosts.filter(p => p.id !== selectedPost.id).map((post, index) => {
                                            // Calculate relative position based on currentSlide
                                            const totalSlides = allFilteredPosts.filter(p => p.id !== selectedPost.id).length;
                                            // Handle edge case where we only have a few posts
                                            if (totalSlides === 0) return null;
                                            
                                            // To make sure modulo arithmetic works with negative indices
                                            const diff = (index - currentSlide + totalSlides) % totalSlides;
                                            
                                            // Determine visibility/positioning based on diff
                                            // 0 = active center, 1 = right next, totalSlides - 1 = left prev.
                                            let position: 'center' | 'right' | 'left' | 'hidden' = 'hidden';
                                            if (diff === 0) position = 'center';
                                            else if (diff === 1 || (totalSlides === 2 && currentSlide === 0 && index === 1)) position = 'right';
                                            else if (diff === totalSlides - 1 || (totalSlides === 2 && currentSlide === 1 && index === 0)) position = 'left';

                                            if (position === 'hidden') return null;

                                            const variants = {
                                                center: { x: 0, scale: 1, zIndex: 10, opacity: 1, rotateY: 0 },
                                                left: { x: '-60%', scale: 0.8, zIndex: 5, opacity: 0.3, rotateY: 25 },
                                                right: { x: '60%', scale: 0.8, zIndex: 5, opacity: 0.3, rotateY: -25 },
                                                hidden: { opacity: 0, scale: 0.5, zIndex: 0 }
                                            };

                                            return (
                                                <motion.div
                                                    key={post.id}
                                                    variants={variants}
                                                    initial={position}
                                                    animate={position}
                                                    exit="hidden"
                                                    transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }} // smooth apple-like ease
                                                    className="absolute w-full max-w-lg aspect-[4/5] md:aspect-auto md:h-[400px]"
                                                    style={{ transformStyle: 'preserve-3d' }}
                                                >
                                                    <a 
                                                        key={post.id}
                                                        href={post.isExternal && !post.content ? (post as any).externalLink : `/blog/${post.slug}`}
                                                        className="group relative w-full h-full rounded-[3rem] overflow-hidden border border-white/10 bg-[#0a050f]/80 backdrop-blur-3xl shadow-2xl cursor-pointer block"
                                                        onClick={(e) => {
                                                            if (post.isExternal && post.content) {
                                                                e.preventDefault();
                                                                // Convert back to ExternalBlogPost expected by handler
                                                                const extPost: ExternalBlogPost = {
                                                                    id: parseInt(post.id.replace('external-', '')),
                                                                    title: post.title,
                                                                    excerpt: post.excerpt,
                                                                    content: post.content,
                                                                    link: (post as any).externalLink,
                                                                    featuredImage: post.featuredImage!,
                                                                    date: new Date(post.publishedAt).toISOString(),
                                                                    author: post.authorName!,
                                                                    categories: post.tags || []
                                                                };
                                                                handleSetExternalPost(extPost);
                                                            } else if (post.isExternal) {
                                                                // Let direct link handle it
                                                            } else {
                                                                e.preventDefault();
                                                                setSelectedPost(post as BlogPost);
                                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                                            }
                                                        }}
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10 pointer-events-none" />
                                                        <img 
                                                            src={'featuredImage' in post ? post.featuredImage : (post as any).image} 
                                                            alt={post.title} 
                                                            className="absolute inset-0 w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-[2s] ease-out"
                                                        />
                                                        <div className="absolute bottom-0 left-0 right-0 p-10 z-20 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                                            <div className="flex gap-2 mb-4">
                                                                <span 
                                                                    className="px-3 py-1 bg-magenta/20 border border-magenta/30 text-[#ff477b] text-[11px] font-black uppercase tracking-[0.2em] rounded-full backdrop-blur-md hover:bg-magenta/40 transition-colors"
                                                                >
                                                                    {post.category || 'AI'}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 leading-tight group-hover:text-[#ff477b] transition-colors line-clamp-2">
                                                                {post.title}
                                                            </h4>
                                                            <p className="text-white/50 text-sm font-medium line-clamp-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                                                {post.excerpt}
                                                            </p>
                                                        </div>
                                                        <div className="absolute inset-0 border-[2px] border-transparent group-hover:border-magenta/30 rounded-[3rem] pointer-events-none transition-colors duration-700 z-30" />
                                                    </a>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                )}
                            </div>
                        </section>
                    </div>
                ) : (
                    <>
                        <div className="animate-in fade-in duration-1000" role="feed" aria-label="Lista de artículos del blog">
                        <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
                            <div className="text-center md:text-left">
                                <h2 className="text-white/40 text-[11px] font-black uppercase tracking-[0.4em] mb-4">Marketing Intelligence</h2>
                                <h1 className="text-6xl md:text-9xl font-black text-white tracking-tighter uppercase leading-none mb-8">
                                    The <span className="text-magenta">Blog</span>
                                </h1>
                                <p className="text-white/40 text-lg font-bold max-w-2xl leading-relaxed">
                                    Insights avanzados sobre publicidad nativa, IA generativa y optimización de funnels para agencias de alto rendimiento.
                                </p>
                            </div>
                            
                            {/* Search Quick Action */}
                            <div className="relative w-full md:w-80 group">
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar insights..." 
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-12 text-white focus:border-magenta focus:ring-1 focus:ring-magenta outline-none transition-all font-bold placeholder:text-white/20 text-sm"
                                />
                                <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-magenta transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Actions / Tags Bar */}
                        <div className="mb-16 -mx-4 px-4 md:mx-0 md:px-0">
                            <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
                                <button
                                    onClick={() => setSelectedTag(null)}
                                    className={`whitespace-nowrap px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 border ${
                                        selectedTag === null 
                                            ? 'bg-magenta text-white border-magenta shadow-[0_0_20px_rgba(255,71,123,0.3)]' 
                                            : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20 hover:text-white'
                                    }`}
                                >
                                    Todos
                                </button>
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                                        className={`whitespace-nowrap px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 border ${
                                            selectedTag === tag 
                                                ? 'bg-cyan text-slate-950 border-cyan shadow-[0_0_20px_rgba(0,255,255,0.3)]' 
                                                : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20 hover:text-white'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {allFilteredPosts.length === 0 ? (
                                <div className="col-span-full py-40 text-center bg-white/5 rounded-[4rem] border border-dashed border-white/10 animate-in fade-in zoom-in duration-700">
                                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10">
                                        <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-white/20 font-black uppercase tracking-[0.3em] text-[11px] mb-4">No se encontraron resultados</p>
                                    <button 
                                        onClick={() => { setSelectedTag(null); setSearchQuery(''); }}
                                        className="text-magenta text-[11px] font-black uppercase tracking-widest hover:underline"
                                    >
                                        Limpiar filtros
                                    </button>
                                </div>
                            ) : (
                                allFilteredPosts.map((post) => (
                                    <a
                                        key={post.id}
                                        href={`/blog/${post.slug}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setSelectedPost(post as BlogPost);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className={`group cursor-pointer bg-slate-950/50 backdrop-blur-xl border border-white/5 rounded-[3rem] overflow-hidden transition-all duration-500 flex flex-col ${
                                            (post as any).isExternal 
                                                ? 'hover:border-cyan/30 hover:shadow-[0_0_60px_-15px_rgba(0,255,255,0.1)]' 
                                                : 'hover:border-magenta/30 hover:shadow-[0_0_60px_-15px_rgba(255,71,123,0.15)]'
                                        }`}
                                    >
                                        <div className="aspect-[16/10] overflow-hidden grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 relative bg-gradient-to-br from-slate-700 to-slate-800">
                                            {post.featuredImage && (
                                                <img
                                                    src={post.featuredImage}
                                                    alt={post.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        // Fallback if image fails to load
                                                        const img = e.currentTarget;
                                                        img.style.display = 'none';
                                                    }}
                                                />
                                            )}
                                            {(post as any).isExternal && (
                                                <div className="absolute top-6 right-6 px-4 py-1.5 bg-cyan/20 border border-cyan/40 backdrop-blur-md rounded-full text-cyan text-[11px] font-black uppercase tracking-widest">
                                                    Ext. Source
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-10 flex flex-col flex-grow">
                                            <div className="flex items-center justify-between mb-6">
                                                <span 
                                                    className={`text-[11px] font-black uppercase tracking-widest ${(post as any).isExternal ? 'text-cyan' : 'text-magenta'}`}
                                                >
                                                    {post.category}
                                                </span>
                                                <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest">
                                                    {new Date(post.publishedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className={`text-2xl font-black text-white tracking-tight mb-6 transition-colors uppercase leading-[1.1] line-clamp-2 ${
                                                (post as any).isExternal ? 'group-hover:text-cyan' : 'group-hover:text-magenta'
                                            }`}>
                                                {post.title}
                                            </h3>
                                            <p className="text-white/40 text-sm leading-relaxed mb-8 font-bold line-clamp-2">
                                                {post.excerpt}
                                            </p>
                                            <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
                                                <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
                                                    (post as any).isExternal ? 'group-hover:text-cyan' : 'group-hover:text-magenta'
                                                }`}>
                                                    {(post as any).isExternal ? 'Leer Artículo' : 'Leer más'}
                                                </span>
                                                <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-all ${
                                                    (post as any).isExternal ? 'group-hover:border-cyan/50 group-hover:bg-cyan/10 group-hover:text-cyan' : 'group-hover:border-magenta/50 group-hover:bg-magenta/10 group-hover:text-magenta'
                                                }`}>
                                                    <svg className="w-4 h-4 text-white/20 group-hover:text-inherit" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </a>
                                ))
                            )}
                        </div>
                    </div>

                     {/* External Feed is now merged into main grid above */}
                    </>
                )}
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════════════════════
   BlogSEOHead — Extracted component for all <head> SEO tags.
   Handles both the blog listing page and individual blog post pages.
   ─────────────────────────────────────────────────────────────────────────── */
const BlogSEOHead: React.FC<{ post: BlogPost | null; allPosts: BlogPost[] }> = ({ post, allPosts }) => {
    // ── Memoized derived SEO values ──────────────────────────────────────────
    const seo = useMemo(() => {
        if (!post) {
            // Blog listing (index) page
            return {
                title: 'Blog | Marketing Intelligence & IA — INsitu AI',
                description: 'Artículos sobre IA aplicada al marketing, optimización de pauta digital, Google Ads, Meta Ads y estrategias de crecimiento con inteligencia artificial.',
                url: `${SITE_URL}/blog`,
                image: `${SITE_URL}/og-image.jpg`,
                type: 'website' as const,
            };
        }

        const plainText = stripHtml(post.content);
        const wordCount = plainText.split(/\s+/).filter(Boolean).length;
        const readingTime = post.readingTime || `${Math.ceil(wordCount / 200)} min`;

        return {
            title: (post.metaTitle || post.title) + ' | Blog INsitu AI',
            description: post.metaDescription || post.excerpt,
            url: `${SITE_URL}/blog/${post.slug}`,
            image: post.featuredImage || `${SITE_URL}/og-image.jpg`,
            type: 'article' as const,
            datePublished: toISO(post.publishedAt),
            dateModified: toISO(post.updatedAt || post.publishedAt),
            authorName: post.authorName || 'INsitu AI Labs',
            category: post.category,
            tags: post.tags || [],
            keywords: (post.keywords || post.tags || []).join(', '),
            plainText,
            wordCount,
            readingTime,
        };
    }, [post]);

    return (
        <Helmet>
            {/* ── Primary Meta Tags ── */}
            <title>{seo.title}</title>
            <meta name="description" content={seo.description} />
            {post && <meta name="keywords" content={seo.keywords} />}
            <meta name="author" content={post ? seo.authorName : SITE_NAME} />
            <link rel="canonical" href={seo.url} />

            {/* ── Open Graph (Facebook, LinkedIn, WhatsApp, Slack) ──
                 Using the article namespace for blog posts enables
                 enriched previews with publication date, author & tags */}
            <meta property="og:type" content={seo.type} />
            <meta property="og:url" content={seo.url} />
            <meta property="og:title" content={seo.title} />
            <meta property="og:description" content={seo.description} />
            <meta property="og:image" content={seo.image} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:locale" content="es_ES" />
            {post && (
                <>
                    <meta property="article:published_time" content={seo.datePublished} />
                    <meta property="article:modified_time" content={seo.dateModified} />
                    <meta property="article:author" content={seo.authorName} />
                    <meta property="article:section" content={seo.category} />
                    {seo.tags?.map((tag: string) => (
                        <meta key={tag} property="article:tag" content={tag} />
                    ))}
                </>
            )}

            {/* ── Twitter Cards ──
                 Must use name= (not property=) for Twitter to parse.
                 label1/data1 shows reading time as a rich detail pill */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content={TWITTER_HANDLE} />
            <meta name="twitter:title" content={seo.title} />
            <meta name="twitter:description" content={seo.description} />
            <meta name="twitter:image" content={seo.image} />
            {post && (
                <>
                    <meta name="twitter:label1" content="Tiempo de lectura" />
                    <meta name="twitter:data1" content={seo.readingTime} />
                    <meta name="twitter:label2" content="Categoría" />
                    <meta name="twitter:data2" content={seo.category} />
                </>
            )}

            {/* ── JSON-LD Structured Data: BlogPosting ──
                 Complete Schema.org BlogPosting for Google Rich Results
                 and LLM citation (Perplexity, ChatGPT, Gemini).
                 Includes articleBody for full content indexing,
                 publisher for Knowledge Panel, and wordCount */}
            {post && (
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'BlogPosting',
                        'mainEntityOfPage': {
                            '@type': 'WebPage',
                            '@id': seo.url,
                        },
                        'headline': post.title,
                        'description': seo.description,
                        'image': [seo.image],
                        'datePublished': seo.datePublished,
                        'dateModified': seo.dateModified,
                        'author': {
                            '@type': 'Person',
                            'name': seo.authorName,
                        },
                        'publisher': {
                            '@type': 'Organization',
                            'name': SITE_NAME,
                            'url': SITE_URL,
                            'logo': {
                                '@type': 'ImageObject',
                                'url': SITE_LOGO,
                            },
                        },
                        'articleBody': seo.plainText?.substring(0, 5000),
                        'wordCount': seo.wordCount,
                        'keywords': seo.keywords,
                        'articleSection': seo.category,
                        'inLanguage': 'es',
                        'url': seo.url,
                    })}
                </script>
            )}

            {/* ── JSON-LD: BreadcrumbList ──
                 Breadcrumbs appear in Google SERPs as:
                 INsitu AI > Blog > Post Title
                 This dramatically improves CTR from search results */}
            {post && (
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        'itemListElement': [
                            {
                                '@type': 'ListItem',
                                'position': 1,
                                'name': 'INsitu AI',
                                'item': SITE_URL,
                            },
                            {
                                '@type': 'ListItem',
                                'position': 2,
                                'name': 'Blog',
                                'item': `${SITE_URL}/blog`,
                            },
                            {
                                '@type': 'ListItem',
                                'position': 3,
                                'name': post.title,
                                'item': seo.url,
                            },
                        ],
                    })}
                </script>
            )}

            {/* ── JSON-LD: CollectionPage (Blog Index) ──
                 Tells Google this is a curated collection page,
                 helping differentiate it from individual articles */}
            {!post && allPosts.length > 0 && (
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'CollectionPage',
                        'name': 'Blog — INsitu AI',
                        'description': seo.description,
                        'url': seo.url,
                        'publisher': {
                            '@type': 'Organization',
                            'name': SITE_NAME,
                            'url': SITE_URL,
                            'logo': {
                                '@type': 'ImageObject',
                                'url': SITE_LOGO,
                            },
                        },
                        'mainEntity': {
                            '@type': 'ItemList',
                            'itemListElement': allPosts.slice(0, 10).map((p, i) => ({
                                '@type': 'ListItem',
                                'position': i + 1,
                                'url': `${SITE_URL}/blog/${p.slug}`,
                                'name': p.title,
                            })),
                        },
                    })}
                </script>
            )}
        </Helmet>
    );
};

export default BlogView;
