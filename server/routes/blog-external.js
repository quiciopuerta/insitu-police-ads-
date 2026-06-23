
import express from 'express';
import axios from 'axios';

const router = express.Router();
const SOURCE_BASE = 'https://maxi.franklinsanchez.com';
const WP_API = `${SOURCE_BASE}/wp-json/wp/v2`;

/**
 * Basic HTML Sanitization & Adaptation
 * Mirrors logic from netlify/functions/blog-external.ts
 */
function adaptContent(html) {
    if (!html) return '';

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
        .replace(/<(div|section|span)[^>]*class="[^"]*et_pb_[^"]*"[^>]*>/gi, '')
        .replace(/<\/(div|section|span)>/gi, (match) => match.includes('et_pb') ? '' : match);

    adapted = adapted.replace(/<div[^>]*et_pb_[^>]*>/gi, '').replace(/<\/div>/gi, '');

    // Headings & Styling
    adapted = adapted
        .replace(/<h1([^>]*)>/gi, '<h2 class="text-3xl font-black uppercase tracking-tighter mt-16 mb-8 text-white"$1>')
        .replace(/<\/h1>/gi, '</h2>')
        .replace(/<h2([^>]*)>/gi, '<h2 class="text-3xl font-black uppercase tracking-tighter mt-16 mb-8 text-white"$1>')
        .replace(/<h3([^>]*)>/gi, '<h3 class="text-xl font-bold uppercase tracking-widest mt-12 mb-6 text-[#ff477b]"$1>')
        .replace(/<h[4-6]([^>]*)>/gi, '<h3 class="text-xl font-bold uppercase tracking-widest mt-12 mb-6 text-[#ff477b]"$1>')
        .replace(/<\/h[4-6]>/gi, '</h3>');

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

    adapted = adapted.replace(/style="[^"]*"/gi, '')
        .replace(/class="[^"]*wp-block[^"]*"/gi, 'class="wp-element"')
        .replace(/<p[^>]*>\s*<\/p>/gi, '')
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;|&#8221;/g, '"')
        .replace(/&amp;/g, '&');

    return adapted.trim();
}

/**
 * GET /api/blog-external
 */
router.get('/', async (req, res) => {
    try {
        const [tagRes, catRes] = await Promise.all([
            axios.get(`${WP_API}/tags?per_page=100`),
            axios.get(`${WP_API}/categories?per_page=100`),
        ]);

        const allTags = tagRes.data || [];
        const allCats = catRes.data || [];

        const insituTagIds = allTags
            .filter((t) => t.name.toLowerCase().includes('insitu'))
            .map((t) => t.id);
        const insituCatIds = allCats
            .filter((c) => c.name.toLowerCase().includes('insitu'))
            .map((c) => c.id);

        const fetchUrls = [];
        if (insituTagIds.length > 0) {
            fetchUrls.push(`${WP_API}/posts?tags=${insituTagIds.join(',')}&per_page=20&_embed`);
        }
        if (insituCatIds.length > 0) {
            fetchUrls.push(`${WP_API}/posts?categories=${insituCatIds.join(',')}&per_page=20&_embed`);
        }
        if (fetchUrls.length === 0) {
            fetchUrls.push(`${WP_API}/posts?search=insitu&per_page=20&_embed`);
        }

        const results = await Promise.all(fetchUrls.map(url => axios.get(url)));
        const jsonArrays = results.map(r => r.data || []);

        const seenIds = new Set();
        const wpPosts = [];
        for (const arr of jsonArrays) {
            if (!Array.isArray(arr)) continue;
            for (const post of arr) {
                if (!seenIds.has(post.id)) {
                    seenIds.add(post.id);
                    wpPosts.push(post);
                }
            }
        }

        const posts = wpPosts.map((post) => {
            const categories = post._embedded?.['wp:term']?.[0]?.map((cat) => cat.name) || [];
            const tags = post._embedded?.['wp:term']?.[1]?.map((tag) => tag.name) || [];
            
            return {
                id: post.id,
                slug: post.slug,
                title: post.title?.rendered?.replace(/&#8217;/g, "'").replace(/&#8220;|&#8221;/g, '"').replace(/&amp;/g, '&') || '',
                excerpt: post.excerpt?.rendered?.replace(/<[^>]*>/g, '').substring(0, 160) || '',
                content: adaptContent(post.content?.rendered || ''),
                link: post.link || `${SOURCE_BASE}/?p=${post.id}`,
                featuredImage: (post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '').replace(/^http:/, 'https:'),
                date: post.date || '',
                author: post._embedded?.author?.[0]?.name || 'Franklin Sanchez',
                categories,
                tags
            };
        });

        res.json(posts);
    } catch (error) {
        console.error('[Admin API] Blog External Error:', error.message);
        res.status(500).json({ error: "Internal server error connecting to WordPress" });
    }
});

/**
 * DELETE /api/blog-external/:id
 */
router.delete('/:id', (req, res) => {
    // Simulated delete logic
    res.json({ success: true, message: `Post ${req.params.id} marked as deleted locally` });
});

export default router;
