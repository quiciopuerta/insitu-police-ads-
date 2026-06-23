import fs from 'fs';
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const BASE_URL = 'https://insitu.company';
const DB_URL = process.env.DATABASE_URL || "";

const staticRoutes = [
  '/',
  '/pricing',
  '/technology',
  '/privacy',
  '/terms',
  '/glossary',
  '/security',
  '/contact',
  '/blog',
  '/traffic-checker',
  '/image-ai',
  '/video-ai',
  '/compare-ai',
  '/campaigns',
  '/brand-identity',
  '/metrics'
];

async function generateSitemap() {
  console.log('🚀 Generating sitemap...');
  
  let blogRoutes = [];
  
  if (DB_URL) {
    try {
      const sql = postgres(DB_URL);
      const rows = await sql`SELECT slug, status FROM blog_posts`;
      blogRoutes = rows
        .filter(p => p.status === 'published')
        .map(p => `/blog/${p.slug}`);
      console.log(`📝 Found ${blogRoutes.length} published blog posts.`);
      await sql.end();
    } catch (err) {
      console.error('❌ Error fetching blog posts for sitemap:', err.message);
    }
  } else {
    console.warn('⚠️ DATABASE_URL not found, skipping dynamic blog routes.');
  }

  const allRoutes = [...staticRoutes, ...blogRoutes];
  const date = new Date().toISOString().split('T')[0];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(route => `  <url>
    <loc>${BASE_URL}${route}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>${route === '' ? 'daily' : 'weekly'}</changefreq>
    <priority>${route === '' ? '1.0' : (route.startsWith('/blog/') ? '0.7' : '0.8')}</priority>
  </url>`).join('\n')}
</urlset>`;

  try {
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
    console.log('✅ sitemap.xml generated successfully in public/ folder.');
  } catch (err) {
    console.error('❌ Error writing sitemap file:', err.message);
  }
}

generateSitemap();
