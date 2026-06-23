/**
 * Blog Importer — maxi.franklinsanchez.com → INsitu
 * 
 * Fetches posts from the WordPress REST API, filters those tagged or
 * categorized with "insitu" (case-insensitive), and returns them
 * adapted to the INsitu BlogPost shape for import.
 */
import { BlogPost, BlogCategory } from '../types';

const SOURCE_BASE = 'https://maxi.franklinsanchez.com';
const WP_API = `${SOURCE_BASE}/wp-json/wp/v2`;
const SOURCE_LABEL = 'Franklin Sánchez';

export interface ImportableBlogPost {
    wpId: number;
    insituId: string;
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    featuredImage: string | null;
    originalUrl: string;
    publishedAt: string;
    tagNames: string[];
    categoryNames: string[];
    alreadyImported: boolean;
}

/**
 * Strip HTML tags from a string and decode HTML entities
 */
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
}

/**
 * Fetch tag names for a list of tag IDs
 */
async function fetchTagNames(tagIds: number[]): Promise<Record<number, string>> {
    if (tagIds.length === 0) return {};
    try {
        const res = await fetch(`${WP_API}/tags?include=${tagIds.join(',')}&per_page=100`);
        if (!res.ok) return {};
        const tags = await res.json();
        const map: Record<number, string> = {};
        for (const t of tags) {
            map[t.id] = t.name as string;
        }
        return map;
    } catch {
        return {};
    }
}

/**
 * Fetch category names for a list of category IDs
 */
async function fetchCategoryNames(catIds: number[]): Promise<Record<number, string>> {
    if (catIds.length === 0) return {};
    try {
        const res = await fetch(`${WP_API}/categories?include=${catIds.join(',')}&per_page=100`);
        if (!res.ok) return {};
        const cats = await res.json();
        const map: Record<number, string> = {};
        for (const c of cats) {
            map[c.id] = c.name as string;
        }
        return map;
    } catch {
        return {};
    }
}

/**
 * Check if a post has an 'insitu' tag or category name
 */
function hasInsituLabel(tagNames: string[], catNames: string[]): boolean {
    const all = [...tagNames, ...catNames].map(s => s.toLowerCase());
    return all.some(s => s.includes('insitu'));
}

/**
 * Adapt a WordPress post to INsitu's import preview shape
 */
function adaptWpPost(
    wp: any,
    tagMap: Record<number, string>,
    catMap: Record<number, string>,
    importedIds: Set<string>,
    importedSlugs: Set<string>
): ImportableBlogPost {
    const tagNames = (wp.tags || []).map((id: number) => tagMap[id] || '');
    const categoryNames = (wp.categories || []).map((id: number) => catMap[id] || '');
    const insituId = `maxi-import-${wp.id}`;
    const slug = wp.slug || `maxi-${wp.id}`;
    const featuredImage =
        wp._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;

    // Check duplication by ID or by matching slug
    const alreadyImported = importedIds.has(insituId) || importedSlugs.has(`maxi-${slug}`);

    return {
        wpId: wp.id,
        insituId,
        title: stripHtml(wp.title?.rendered || 'Sin título'),
        slug,
        excerpt: stripHtml(wp.excerpt?.rendered || '').substring(0, 300),
        content: wp.content?.rendered || '',
        featuredImage,
        originalUrl: wp.link || `${SOURCE_BASE}/?p=${wp.id}`,
        publishedAt: wp.date || new Date().toISOString(),
        tagNames: tagNames.filter(Boolean),
        categoryNames: categoryNames.filter(Boolean),
        alreadyImported,
    };
}

/**
 * Fetch posts from maxi.franklinsanchez.com tagged/categorised with "insitu"
 * 
 * Strategy:
 * 1. First check if an 'insitu' tag or category exists → fetch posts with that ID
 * 2. Always also run a full-text ?search=insitu to catch posts with it in content
 * 3. Deduplicate and return
 */
/**
 * Fetch posts from the INsitu API proxy (which fetches from maxi.franklinsanchez.com)
 * 
 * Strategy:
 * 1. Call our proxy endpoint /api/blog-external
 * 2. Deduplicate against already imported posts
 * 3. Return adapted for the import UI
 */
export async function fetchInsituPosts(
    importedIds: Set<string>,
    importedSlugs: Set<string> = new Set()
): Promise<{ posts: ImportableBlogPost[]; error?: string }> {
    try {
        const apiUrl = `${import.meta.env.VITE_API_API_URL || '/api'}/blog-external`;
        const res = await fetch(apiUrl);
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Error ${res.status}`);
        }

        const externalPosts = await res.json();

        if (!Array.isArray(externalPosts) || externalPosts.length === 0) {
            return { 
                posts: [], 
                error: 'No se encontraron artículos con la etiqueta "insitu" en el blog externo. Asegúrate de etiquetar los artículos correctamente en WordPress.' 
            };
        }

        const adapted: ImportableBlogPost[] = externalPosts.map((wp: any) => {
            const insituId = `maxi-import-${wp.id}`;
            const slug = wp.slug || `post-${wp.id}`;
            
            // Per-post duplication check
            const alreadyImported = importedIds.has(insituId) || importedSlugs.has(`maxi-${slug}`);

            return {
                wpId: wp.id,
                insituId,
                title: wp.title || 'Sin título',
                slug,
                excerpt: wp.excerpt || '',
                content: wp.content || '',
                featuredImage: wp.featuredImage || null,
                originalUrl: wp.link || `${SOURCE_BASE}/?p=${wp.id}`,
                publishedAt: wp.date || new Date().toISOString(),
                tagNames: wp.tags || [],
                categoryNames: wp.categories || [],
                alreadyImported,
            };
        });

        return { posts: adapted };
    } catch (e: any) {
        console.error('[BlogImporter] Fetch failed:', e.message);
        return { posts: [], error: `Error al conectar con la plataforma de importación: ${e.message}` };
    }
}

/**
 * Map a WordPress category name to an INsitu BlogCategory
 */
function mapCategory(catNames: string[]): BlogCategory {
    const all = catNames.join(' ').toLowerCase();
    if (all.includes('ai') || all.includes('inteligencia')) return 'AI';
    if (all.includes('marketing')) return 'Marketing';
    if (all.includes('google') || all.includes('ads')) return 'Google Ads';
    if (all.includes('tutorial')) return 'Tutorials';
    if (all.includes('case') || all.includes('estudio') || all.includes('caso')) return 'Case Studies';
    return 'Marketing';
}

/**
 * Convert an ImportableBlogPost to a BlogPost ready for blogService.savePost()
 */
export function adaptForSave(
    imp: ImportableBlogPost,
    currentUserId: string,
    currentUserName: string
): Parameters<typeof import('../services/blogService').blogService.savePost>[0] {
    // Add source attribution at the end of the content
    const attribution = `
<hr class="my-8 border-white/10" />
<div class="bg-slate-900 rounded-2xl p-6 border border-white/5 text-sm text-slate-400 flex items-start gap-4">
  <span class="text-2xl">📌</span>
  <div>
    <strong class="text-white">Fuente original:</strong> Este artículo fue originalmente publicado por 
    <a href="https://franklinsanchez.com" target="_blank" rel="noopener noreferrer" class="text-[#ff477b] font-bold hover:underline">Franklin Sánchez</a> 
    en <a href="${imp.originalUrl.replace('maxi.', '')}" target="_blank" rel="noopener noreferrer" class="text-[#ff477b] font-bold hover:underline">franklinsanchez.com</a> 
    y ha sido adaptado para su publicación en <strong class="text-white">INsitu.company</strong>.
  </div>
</div>`;

    return {
        id: imp.insituId,
        title: imp.title,
        slug: `maxi-${imp.slug}`,
        content: imp.content + attribution,
        excerpt: imp.excerpt,
        authorId: currentUserId,
        authorName: `${SOURCE_LABEL} / ${currentUserName}`,
        publishedAt: new Date(imp.publishedAt).getTime(),
        status: 'draft' as const, // Import as draft so admin can review
        category: mapCategory(imp.categoryNames),
        tags: [...imp.tagNames, 'franklinsanchez.com', 'importado'],
        featuredImage: imp.featuredImage || undefined,
        metaTitle: `${imp.title} | INsitu AI`,
        metaDescription: imp.excerpt.substring(0, 160),
        keywords: imp.tagNames,
        readingTime: `${Math.ceil(imp.content.replace(/<[^>]*>/g, '').split(' ').length / 200)} min`,
    };
}
