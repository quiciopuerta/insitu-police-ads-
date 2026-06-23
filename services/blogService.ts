import { BlogPost, BlogCategory } from '../types';

const BLOG_KEY = 'insitu_blog_posts';
import { API_URL } from '../utils/apiConfig';
import { logger } from '../utils/logger';


// ── Helpers ──────────────────────────────────────────────────────────────────
const apiGet = async (path: string, userId?: string) => {
    const r = await fetch(`${API_URL}${path}`, {
        headers: { ...(userId ? { 'X-User-Id': userId } : {}) }
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
};

const apiPost = async (path: string, body: any, userId?: string) => {
    const r = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            ...(userId ? { 'X-User-Id': userId } : {})
        },
        body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
};

const apiDelete = async (path: string, userId?: string) => {
    const r = await fetch(`${API_URL}${path}`, { 
        method: 'DELETE',
        headers: { ...(userId ? { 'X-User-Id': userId } : {}) }
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
};

const apiPatch = async (path: string, body: any, userId?: string) => {
    const r = await fetch(`${API_URL}${path}`, {
        method: 'PATCH',
        headers: { 
            'Content-Type': 'application/json',
            ...(userId ? { 'X-User-Id': userId } : {})
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
};

// ── Service ───────────────────────────────────────────────────────────────────
export const blogService = {
    getAllPosts: async (userId?: string): Promise<BlogPost[]> => {
        // 1. Intenta obtener de caché inmediatamente
        let cached: BlogPost[] = [];
        try {
            const data = localStorage.getItem(BLOG_KEY);
            if (data) {
                cached = JSON.parse(data);
            }
        } catch (e) {
            logger.error('[Blog] Error parsing cache:', e);
        }

        // 2. Revalidación en segundo plano
        const revalidatePromise = apiGet('/admin/blog', userId).then(posts => {
            localStorage.setItem(BLOG_KEY, JSON.stringify(posts));
            // Notifica al sistema si hubo cambios (opcional, para UI reactiva)
            window.dispatchEvent(new CustomEvent('blog-data-refreshed', { detail: posts }));
            return posts;
        }).catch(e => {
            logger.warn('[Blog] Revalidation failed, keeping cache:', e);
            return cached;
        });

        // 3. Estrategia SWR: Si hay caché, devuélvela YA. El background fetch actualizará el localStorage para la próxima vez.
        if (cached.length > 0) {
            // No esperamos a revalidatePromise, dejamos que corra en bg
            return cached;
        }

        // 4. Si no hay caché, esperamos obligatoriamente al primer fetch
        return await revalidatePromise;
    },

    preFetchPosts: (userId?: string) => {
        // Silent background fetch to warm up cache
        apiGet('/admin/blog', userId)
            .then(posts => localStorage.setItem(BLOG_KEY, JSON.stringify(posts)))
            .catch(() => {});
    },

    getPostBySlug: async (slug: string, userId?: string): Promise<BlogPost | undefined> => {
        const posts = await blogService.getAllPosts(userId);
        return posts.find(p => p.slug === slug);
    },

    getPostById: async (id: string, userId?: string): Promise<BlogPost | undefined> => {
        const posts = await blogService.getAllPosts(userId);
        return posts.find(p => p.id === id);
    },

    savePost: async (
        post: Partial<BlogPost> & { title: string; content: string; authorId: string; authorName: string },
        userId?: string
    ): Promise<BlogPost> => {
        const id = post.id || Math.random().toString(36).substr(2, 9);
        const newPost = {
            ...post,
            id,
            slug: post.slug || post.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
            excerpt: post.excerpt || post.content.substring(0, 150).replace(/<[^>]*>/g, '') + '...',
            updatedAt: Date.now(),
        };
        try {
            const saved = await apiPost('/admin/blog', newPost, userId);
            // Refresh cache
            const posts = JSON.parse(localStorage.getItem(BLOG_KEY) || '[]');
            const idx = posts.findIndex((p: BlogPost) => p.id === saved.id);
            if (idx !== -1) posts[idx] = saved; else posts.unshift(saved);
            localStorage.setItem(BLOG_KEY, JSON.stringify(posts));
            return saved;
        } catch (e) {
            logger.warn('[Blog] Backend unavailable, saving locally:', e);
            // Fallback: local only
            const posts = JSON.parse(localStorage.getItem(BLOG_KEY) || '[]');
            const idx = posts.findIndex((p: BlogPost) => p.id === newPost.id);
            if (idx !== -1) posts[idx] = newPost; else posts.unshift(newPost);
            localStorage.setItem(BLOG_KEY, JSON.stringify(posts));
            return newPost as BlogPost;
        }
    },

    deletePost: async (id: string, userId?: string): Promise<boolean> => {
        try {
            await apiDelete(`/admin/blog/${id}`, userId);
            const posts = JSON.parse(localStorage.getItem(BLOG_KEY) || '[]');
            localStorage.setItem(BLOG_KEY, JSON.stringify(posts.filter((p: BlogPost) => p.id !== id)));
            return true;
        } catch (e) {
            logger.warn('[Blog] Backend unavailable, deleting locally:', e);
            const posts = JSON.parse(localStorage.getItem(BLOG_KEY) || '[]');
            const filtered = posts.filter((p: BlogPost) => p.id !== id);
            localStorage.setItem(BLOG_KEY, JSON.stringify(filtered));
            return true;
        }
    },

    getCategories: (): BlogCategory[] => [
        'Marketing', 'AI', 'Google Ads', 'Tutorials', 'Case Studies'
    ],

    toggleStatus: async (id: string, userId?: string): Promise<BlogPost | null> => {
        try {
            const result = await apiPatch(`/admin/blog/${id}/toggle`, null, userId);
            // Refresh from server
            const posts = await blogService.getAllPosts(userId);
            return posts.find(p => p.id === id) || null;
        } catch (e) {
            logger.warn('[Blog] Backend unavailable, toggling locally:', e);
            const posts: BlogPost[] = JSON.parse(localStorage.getItem(BLOG_KEY) || '[]');
            const index = posts.findIndex(p => p.id === id);
            if (index !== -1) {
                posts[index].status = posts[index].status === 'published' ? 'draft' : 'published';
                posts[index].publishedAt = posts[index].status === 'published' && posts[index].publishedAt === 0 ? Date.now() : posts[index].publishedAt;
                posts[index].updatedAt = Date.now();
                localStorage.setItem(BLOG_KEY, JSON.stringify(posts));
                return posts[index];
            }
            return null;
        }
    }
};
