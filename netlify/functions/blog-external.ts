import { getCorsHeaders } from "./_lib/corsHelper";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const SOURCE_BASE = 'https://maxi.franklinsanchez.com';
const WP_API = `${SOURCE_BASE}/wp-json/wp/v2`;

/**
 * Basic HTML Sanitization & Adaptation
 * Removes WordPress specific classes and ensures semantic tags
 */
function adaptContent(html: string): string {
    if (!html) return '';

    // 1. Initial cleanup of common WordPress/Jetpack noise
    let adapted = html
        .replace(/<div[^>]*class="[^"]*sharedaddy[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/<div[^>]*class="[^"]*jp-relatedposts[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/<div[^>]*class="[^"]*wpcnt[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '');

    // 2. Surgical removal of redundant Divi layout blocks (Complementary data)
    // We remove the post title and dividers because we already have them in our UI.
    // We KEEP normal images even if they have Divi classes.
    adapted = adapted
        // Handle Shortcodes
        .replace(/\[et_pb_post_title[^\]]*\][\s\S]*?\[\/et_pb_post_title\]/gi, '')
        .replace(/\[et_pb_divider[^\]]*\][\s\S]*?\[\/et_pb_divider\]/gi, '')
        // Target specific Divi rendered HTML noise (Title and Dividers only)
        .replace(/<div[^>]*class="[^"]*et_pb_module et_pb_post_title[^"]*"[^>]*>[\s\S]*?<\/div>[\s\S]*?<\/div>/gi, '')
        .replace(/<div[^>]*class="[^"]*et_pb_module et_pb_divider[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
        // Strip remaining Divi tags but KEEP content
        .replace(/\[et_pb_[^\]]*\]/gi, '')
        .replace(/\[\/et_pb_[^\]]*\]/gi, '')
        // Keep the content of Divi sections/rows but remove the wrapper if it has Divi classes
        .replace(/<(div|section|span)[^>]*class="[^"]*et_pb_[^"]*"[^>]*>/gi, '');

    // 3. Final Flattening: Remove Divi-specific DIV opening tags but preserve closing tags for structure
    adapted = adapted.replace(/<div[^>]*et_pb_[^>]*>/gi, '').replace(/<div[^>]*et_pb[^>]*>/gi, '');

    // 4. Normalize Headings for better hierarchy
    adapted = adapted
        .replace(/<h1([^>]*)>/gi, '<h2 class="text-3xl font-black uppercase tracking-tighter mt-16 mb-8 text-white"$1>')
        .replace(/<\/h1>/gi, '</h2>')
        .replace(/<h2([^>]*)>/gi, '<h2 class="text-3xl font-black uppercase tracking-tighter mt-16 mb-8 text-white"$1>')
        .replace(/<h3([^>]*)>/gi, '<h3 class="text-xl font-bold uppercase tracking-widest mt-12 mb-6 text-[#ff477b]"$1>')
        .replace(/<h[4-6]([^>]*)>/gi, '<h3 class="text-xl font-bold uppercase tracking-widest mt-12 mb-6 text-[#ff477b]"$1>')
        .replace(/<\/h[4-6]>/gi, '</h3>');

    // 5. Add spacing and classes to paragraphs
    adapted = adapted.replace(/<p([^>]*)>/gi, '<p class="mb-8 leading-relaxed text-slate-300 text-lg font-light tracking-wide"$1>');

    // 6. Adapt images for premium layout AND fix relative URLs
    adapted = adapted.replace(/<img([^>]*)src="([^"]+)"([^>]*)>/gi, (match, before, src, after) => {
        let absoluteSrc = src;
        // Fix protocol-relative URLs
        if (src.startsWith('//')) {
            absoluteSrc = 'https:' + src;
        } 
        // Fix root-relative URLs
        else if (src.startsWith('/')) {
            absoluteSrc = SOURCE_BASE + src;
        }
        
        // Force https for franklinsanchez.com to avoid mixed content
        if (absoluteSrc.includes('franklinsanchez.com')) {
            absoluteSrc = absoluteSrc.replace(/^http:/, 'https:');
        }

        const loading = (before + after).includes('loading=') ? '' : ' loading="lazy"';
        return `<img${before}src="${absoluteSrc}"${after}${loading} class="rounded-[2rem] shadow-2xl border border-white/10 my-12 block mx-auto max-w-full h-auto transition-all hover:scale-[1.02]" />`;
    });

    // 7. Final cleanup of noise and inline styles
    adapted = adapted
        .replace(/style="[^"]*"/gi, '')
        .replace(/class="[^"]*wp-block[^"]*"/gi, 'class="wp-element"')
        .replace(/<p[^>]*>\s*<\/p>/gi, '') // Remove empty paragraphs
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;|&#8221;/g, '"')
        .replace(/&amp;/g, '&');

    return adapted.trim();
}

const handler: Handler = async (event: HandlerEvent, _ctx: HandlerContext) => {
    // 1. Handle CORS Preflight
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined), body: "" };
    }

    // 2. Handle DELETE (Mocking for now, as we'd need a DB to persist "hidden" state)
    // In a real scenario, we'd add the ID to a "hidden_external_posts" table
    if (event.httpMethod === "DELETE") {
        const id = event.path.split('/').pop();
        console.log(`[Blog-External] Request to hide/delete external post: ${id}`);
        return {
            statusCode: 200,
            headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
            body: JSON.stringify({ success: true, message: `Post ${id} marked for deletion (simulated)` }),
        };
    }

    // 3. Main GET Logic
    try {
        // Discover tag/category IDs for "insitu" label
        const [tagRes, catRes] = await Promise.all([
            fetch(`${WP_API}/tags?per_page=100`),
            fetch(`${WP_API}/categories?per_page=100`),
        ]);
        const allTags = tagRes.ok ? await tagRes.json() : [];
        const allCats = catRes.ok ? await catRes.json() : [];

        const insituTagIds: number[] = allTags
            .filter((t: any) => (t.name as string).toLowerCase().includes('insitu'))
            .map((t: any) => t.id);
        const insituCatIds: number[] = allCats
            .filter((c: any) => (c.name as string).toLowerCase().includes('insitu'))
            .map((c: any) => c.id);

        // Build fetch URLs: by tag, by category, and by search
        const fetchUrls: string[] = [];
        if (insituTagIds.length > 0) {
            fetchUrls.push(`${WP_API}/posts?tags=${insituTagIds.join(',')}&per_page=20&_embed`);
        }
        if (insituCatIds.length > 0) {
            fetchUrls.push(`${WP_API}/posts?categories=${insituCatIds.join(',')}&per_page=20&_embed`);
        }
        // Fallback: text search if no tag/category found
        if (fetchUrls.length === 0) {
            fetchUrls.push(`${WP_API}/posts?search=insitu&per_page=20&_embed`);
        }

        const results = await Promise.all(fetchUrls.map(url => fetch(url)));
        const jsonArrays = await Promise.all(results.map(r => (r.ok ? r.json() : [])));

        // Deduplicate
        const seenIds = new Set<number>();
        const wpPosts: any[] = [];
        for (const arr of jsonArrays) {
            if (!Array.isArray(arr)) continue;
            for (const post of arr) {
                if (!seenIds.has(post.id)) {
                    seenIds.add(post.id);
                    wpPosts.push(post);
                }
            }
        }

        if (wpPosts.length === 0) {
            return {
                statusCode: 200,
                headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
                body: JSON.stringify([]),
            };
        }

        const posts = wpPosts.map((post: any) => {
            // Extract featured image from multiple possible sources
            let featuredImage = post._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
                                post.jetpack_featured_media_url ||
                                post.yoast_head_json?.og_image?.[0]?.url ||
                                '';

            // Ensure HTTPS
            if (featuredImage) {
                featuredImage = featuredImage.replace(/^http:/, 'https:');
            }

            // Decode title properly
            let title = post.title?.rendered || 'Sin título';
            title = title
                .replace(/&#8217;/g, "'")
                .replace(/&#8220;|&#8221;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&#039;/g, "'");

            // Decode excerpt
            let excerpt = post.excerpt?.rendered || '';
            excerpt = excerpt.replace(/<[^>]*>/g, '').substring(0, 160);

            return {
                id: post.id,
                title: title,
                excerpt: excerpt,
                content: adaptContent(post.content?.rendered || ''),
                slug: post.slug || '',
                link: post.link || `${SOURCE_BASE}/?p=${post.id}`,
                featuredImage: featuredImage || null,
                date: post.date || '',
                author: post._embedded?.author?.[0]?.name || 'Franklin Sanchez',
                categories: post._embedded?.['wp:term']?.[0]?.map((cat: any) => cat.name) || [],
                tags: post._embedded?.['wp:term']?.[1]?.map((tag: any) => tag.name) || [],
            };
        });

        return {
            statusCode: 200,
            headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
            body: JSON.stringify(posts),
        };
    } catch (err: any) {
        return {
            statusCode: 500,
            headers: getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined),
            body: JSON.stringify({ error: err.message }),
        };
    }
};

export { handler };
