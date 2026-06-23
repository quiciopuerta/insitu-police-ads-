
import express from 'express';
import db from '../db.js';
import {
  sendApprovalEmail, sendInvitationEmail,
  sendTrialEndingSoonEmail, sendTrialExpiredEmail,
  sendPaymentFailedEmail, sendRenewalEmail,
  sendSubscriptionTerminatedEmail, sendExtendedTrialEmail,
  sendWeeklyInsightsEmail, sendOptimizationTipEmail,
  sendUsageAlertEmail,
} from '../utils/emailService.js';

const router = express.Router();

// ── Admin Authentication Middleware ───────────────────────────────────────────
// Accepts either:
//   1. Authorization: Bearer <ADMIN_SECRET>  (scripts / CLI)
//   2. X-User-Id: <id>  where that user has role admin/superAdmin (frontend)
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

async function isAdmin(userId) {
    if (!userId) return false;
    try {
        const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
        return user && (user.role === 'admin' || user.role === 'superAdmin');
    } catch { return false; }
}

async function requireAdmin(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const xUserId = req.headers['x-user-id'] || '';

    // Option 1: static secret
    if (ADMIN_SECRET && authHeader === `Bearer ${ADMIN_SECRET}`) {
        return next();
    }

    // Option 2: verify user role from DB
    if (await isAdmin(xUserId)) {
        return next();
    }
    // If none of the above pass, it's unauthorized
    res.status(401).json({ error: 'Unauthorized' });
}

// ═══════════════════════════════════════════════════════════════
//  PUBLIC ROUTES — accessible even without admin session
// ═══════════════════════════════════════════════════════════════

router.get('/blog', async (req, res) => {
    console.log('[AdminAPI] GET /blog (Public Access Attempt)');
    const xUserId = req.headers['x-user-id'] || '';
    try {
        const adminMode = await isAdmin(xUserId);
        
        // Non-admins only see published posts. Admins see all (for management).
        let query = 'SELECT * FROM blog_posts WHERE is_deleted IS NOT true';
        if (!adminMode) {
            query += " AND status = 'published'";
        }
        query += ' ORDER BY updated_at DESC';

        const rows = await db.all(query);
        const posts = rows.map(p => ({
            ...p,
            tags: JSON.parse(p.tags || '[]'),
            keywords: JSON.parse(p.keywords || '[]'),
        }));
        res.json(posts);
    } catch (error) {
        console.error('[AdminAPI] GET /blog error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/settings', async (req, res) => {
    try {
        const row = await db.get("SELECT data FROM settings WHERE id = 1");
        res.json(JSON.parse(row?.data || '{}'));
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});


router.use(requireAdmin);

// ═══════════════════════════════════════════════════════════════
//  PROTECTED ROUTES — requireAdmin applies from here down
// ═══════════════════════════════════════════════════════════════



router.post('/blog', async (req, res) => {
    const p = req.body;
    try {
        const id = p.id || Math.random().toString(36).substr(2, 9);
        const slug = p.slug || p.title?.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        const now = Date.now();

        const existing = await db.get("SELECT id FROM blog_posts WHERE id = ?", [id]);
        if (existing) {
            await db.run(
                `UPDATE blog_posts SET title=?,slug=?,content=?,excerpt=?,author_id=?,author_name=?,
                 author_picture=?,published_at=?,updated_at=?,status=?,category=?,tags=?,
                 featured_image=?,meta_title=?,meta_description=?,keywords=?,reading_time=? WHERE id=?`,
                [p.title, slug, p.content, p.excerpt, p.authorId, p.authorName,
                 p.authorPicture, p.publishedAt || 0, now, p.status || 'draft',
                 p.category || 'AI', JSON.stringify(p.tags || []), p.featuredImage,
                 p.metaTitle, p.metaDescription, JSON.stringify(p.keywords || []),
                 p.readingTime, id]
            );
        } else {
            await db.run(
                `INSERT INTO blog_posts (id,title,slug,content,excerpt,author_id,author_name,
                 author_picture,published_at,updated_at,status,category,tags,featured_image,
                 meta_title,meta_description,keywords,reading_time)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [id, p.title, slug, p.content, p.excerpt, p.authorId, p.authorName,
                 p.authorPicture, p.publishedAt || (p.status === 'published' ? now : 0),
                 now, p.status || 'draft', p.category || 'AI', JSON.stringify(p.tags || []),
                 p.featuredImage, p.metaTitle, p.metaDescription,
                 JSON.stringify(p.keywords || []), p.readingTime]
            );
        }
        const saved = await db.get("SELECT * FROM blog_posts WHERE id = ?", [id]);
        saved.tags = JSON.parse(saved.tags || '[]');
        saved.keywords = JSON.parse(saved.keywords || '[]');
        res.json(saved);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

router.patch('/blog/:id/toggle', async (req, res) => {
    const { id } = req.params;
    try {
        const post = await db.get("SELECT status, published_at FROM blog_posts WHERE id = ?", [id]);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        const newStatus = post.status === 'published' ? 'draft' : 'published';
        const publishedAt = newStatus === 'published' && post.published_at === 0 ? Date.now() : post.published_at;
        await db.run('UPDATE blog_posts SET status=?, published_at=?, updated_at=? WHERE id=?',
            [newStatus, publishedAt, Date.now(), id]);
        res.json({ success: true, status: newStatus });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

router.delete('/blog/:id', async (req, res) => {
    const { id } = req.params;
    const authorId = req.headers['x-user-id'] || 'system';
    try {
        // Safe Management Protocol: Soft delete only — no physical DELETE FROM blog_posts
        await db.run("UPDATE blog_posts SET is_deleted = true WHERE id = ?", [id]);
        // Mandatory audit log
        const logId = Math.random().toString(36).substr(2, 12);
        await db.run(
            "INSERT INTO audit_delete_log (id, created_at, author, action, target_id, details) VALUES (?, ?, ?, ?, ?, ?)",
            [logId, Date.now(), authorId, 'SOFT_DELETE_BLOG_POST', id, JSON.stringify({ reason: 'Admin action' })]
        ).catch(() => {}); // non-blocking
        res.json({
            success: true,
            message: 'Post archivado de forma segura. Puede ser recuperado por un desarrollador si es necesario.'
        });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// ═══════════════════════════════════════════════════════════════
//  LEADS  (read - already served from DB)
// ═══════════════════════════════════════════════════════════════
router.get('/leads', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM leads ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// ═══════════════════════════════════════════════════════════════
//  EMAIL NOTIFICATIONS  (subscription lifecycle)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/admin/notify/trial-ending
 * Body: { userId, daysLeft }
 */
router.post('/notify/trial-ending', async (req, res) => {
  const { userId, daysLeft } = req.body;
  try {
    const user = await db.get('SELECT email, first_name FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const result = await sendTrialEndingSoonEmail(user.email, user.first_name || 'Usuario', daysLeft || 2);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * POST /api/admin/notify/trial-expired
 * Body: { userId }
 */
router.post('/notify/trial-expired', async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await db.get('SELECT email, first_name FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const result = await sendTrialExpiredEmail(user.email, user.first_name || 'Usuario');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * POST /api/admin/notify/payment-failed
 * Body: { userId }
 */
router.post('/notify/payment-failed', async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await db.get('SELECT email, first_name, subscription FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const sub = JSON.parse(user.subscription || '{}');
    const result = await sendPaymentFailedEmail(user.email, user.first_name || 'Usuario', sub.plan || 'Plan');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * POST /api/admin/notify/renewal
 * Body: { userId }
 */
router.post('/notify/renewal', async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await db.get('SELECT email, first_name, subscription FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const sub = JSON.parse(user.subscription || '{}');
    const nextDate = sub.expiryDate ? new Date(sub.expiryDate).toLocaleDateString('es-ES') : 'N/A';
    const result = await sendRenewalEmail(user.email, user.first_name || 'Usuario', sub.plan || 'Plan', nextDate);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * POST /api/admin/notify/subscription-terminated
 * Body: { userId }
 */
router.post('/notify/subscription-terminated', async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await db.get('SELECT email, first_name FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const result = await sendSubscriptionTerminatedEmail(user.email, user.first_name || 'Usuario');
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * POST /api/admin/notify/extended-trial
 * Body: { userId, extraDays }
 */
router.post('/notify/extended-trial', async (req, res) => {
  const { userId, extraDays } = req.body;
  try {
    const user = await db.get('SELECT email, first_name FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const result = await sendExtendedTrialEmail(user.email, user.first_name || 'Usuario', extraDays || 7);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * POST /api/admin/notify/weekly-insights
 * Body: { userId, stats: { audits, score, tokens, bestAd }, imageUrl, videoUrl }
 */
router.post('/notify/weekly-insights', async (req, res) => {
  const { userId, stats, imageUrl, videoUrl } = req.body;
  try {
    const user = await db.get('SELECT email, first_name FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const result = await sendWeeklyInsightsEmail(user.email, user.first_name || 'Usuario', stats || {}, imageUrl, videoUrl);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * POST /api/admin/notify/optimization-tip
 * Body: { userId, tip: { title, content, target }, imageUrl, videoUrl }
 */
router.post('/notify/optimization-tip', async (req, res) => {
  const { userId, tip, imageUrl, videoUrl } = req.body;
  try {
    const user = await db.get('SELECT email, first_name FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const result = await sendOptimizationTipEmail(user.email, user.first_name || 'Usuario', tip || {}, imageUrl, videoUrl);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * POST /api/admin/notify/usage-alert
 * Body: { userId, percentage, imageUrl, videoUrl }
 */
router.post('/notify/usage-alert', async (req, res) => {
  const { userId, percentage, imageUrl, videoUrl } = req.body;
  try {
    const user = await db.get('SELECT email, first_name FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const result = await sendUsageAlertEmail(user.email, user.first_name || 'Usuario', percentage || 80, imageUrl, videoUrl);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * POST /api/admin/notify/test
 * Body: { to, type } — for manual testing
 * Types: welcome, approval, recovery, trial-ending, trial-expired, payment-failed, renewal, terminated, extended-trial, weekly-insights, optimization-tip, usage-alert
 */
router.post('/notify/test', async (req, res) => {
  const { to, type, daysLeft, extraDays, stats, tip, percentage, imageUrl, videoUrl } = req.body;
  if (!to || !type) return res.status(400).json({ error: 'to and type are required' });
  try {
    let result;
    const name = to.split('@')[0];
    switch (type) {
      case 'welcome':        result = await (await import('../utils/emailService.js')).sendWelcomeEmail(to, name); break;
      case 'approval':       result = await sendApprovalEmail(to, name, 'Starter'); break;
      case 'recovery':       result = await (await import('../utils/emailService.js')).sendRecoveryEmail(to, '123456'); break;
      case 'trial-ending':   result = await sendTrialEndingSoonEmail(to, name, daysLeft || 2); break;
      case 'trial-expired':  result = await sendTrialExpiredEmail(to, name); break;
      case 'payment-failed': result = await sendPaymentFailedEmail(to, name, 'Growth'); break;
      case 'renewal':        result = await sendRenewalEmail(to, name, 'Growth', '01/04/2026'); break;
      case 'terminated':     result = await sendSubscriptionTerminatedEmail(to, name); break;
      case 'extended-trial': result = await sendExtendedTrialEmail(to, name, extraDays || 7); break;
      case 'invitation':     result = await sendInvitationEmail(to, 'user', 'Starter'); break;
      case 'weekly-insights':result = await sendWeeklyInsightsEmail(to, name, stats || { audits: 5, score: 82, tokens: 450, bestAd: 'Ads 2024' }, imageUrl, videoUrl); break;
      case 'optimization-tip':result = await sendOptimizationTipEmail(to, name, tip || { title: 'Hooks de Video', content: 'Usa hooks de < 2s', target: 'video' }, imageUrl, videoUrl); break;
      case 'usage-alert':    result = await sendUsageAlertEmail(to, name, percentage || 80, imageUrl, videoUrl); break;
      default: return res.status(400).json({ error: `Unknown type: ${type}` });
    }
    res.json({ type, to, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
//  SCANNER MONITORING  (competitor tracking statistics)
// ═══════════════════════════════════════════════════════════════
router.get('/scanner-stats', async (req, res) => {
    try {
        // 1. General Stats
        const tracksCount = await db.get(`
            SELECT 
                COUNT(*) as total, 
                COUNT(*) FILTER (WHERE is_active = true) as active 
            FROM competitor_tracks
        `);
        const signalsCount = await db.get(`SELECT COUNT(*) as total FROM competitor_signals`);
        const avgRelevance = await db.get(`SELECT AVG(relevance_score) as avg FROM competitor_signals`);
        
        // 2. Signals by Type
        const statsByType = await db.all(`
            SELECT type, COUNT(*) as count 
            FROM competitor_signals 
            GROUP BY type 
            ORDER BY count DESC
        `);

        // 3. Signals by Source
        const statsBySource = await db.all(`
            SELECT source, COUNT(*) as count 
            FROM competitor_signals 
            GROUP BY source 
            ORDER BY count DESC
        `);

        // 4. Scans over time (last 7 days)
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const historicalSignals = await db.all(`
            SELECT 
                TO_CHAR(TO_TIMESTAMP(detected_at / 1000), 'YYYY-MM-DD') as date,
                COUNT(*) as count
            FROM competitor_signals
            WHERE detected_at > ?
            GROUP BY date
            ORDER BY date ASC
        `, [sevenDaysAgo]);

        res.json({
            tracks: tracksCount || { total: 0, active: 0 },
            signals: {
                total: signalsCount?.total || 0,
                avgRelevance: Math.round(avgRelevance?.avg || 0)
            },
            statsByType: statsByType || [],
            statsBySource: statsBySource || [],
            historicalSignals: historicalSignals || []
        });
    } catch (error) {
        console.error('[Admin API] Scanner Stats Error:', error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
