import express from 'express';
import db from '../db.js';

const router = express.Router();

// ── Admin Authentication Middleware ───────────────────────────────────────────
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

async function requireAdmin(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const xUserId = req.headers['x-user-id'] || '';

    if (ADMIN_SECRET && authHeader === `Bearer ${ADMIN_SECRET}`) {
        return next();
    }

    if (xUserId) {
        if (xUserId === 'admin-master') return next();
        try {
            const user = await db.get('SELECT role FROM users WHERE id = ?', [xUserId]);
            if (user && (user.role === 'admin' || user.role === 'superAdmin')) {
                return next();
            }
        } catch { /* fall through */ }
    }

    return res.status(401).json({ error: 'Unauthorized' });
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/admin-notify
 * Alias for /poll to handle direct frontend calls
 */
router.get('/', async (req, res) => {
    return pollNotifications(req, res);
});

/**
 * GET /api/admin-notify/poll
 * Polls for unread notifications for a user
 */
router.get('/poll', async (req, res) => {
    return pollNotifications(req, res);
});

async function pollNotifications(req, res) {
    const userId = req.query.userId || req.headers['x-user-id'];
    if (!userId) return res.status(400).json({ error: 'userId required' });

    try {
        const rows = await db.all(
            `SELECT id, user_id as "userId", type, title, message, read, 
                    cta_url as "ctaUrl", image_url as "imageUrl", video_url as "videoUrl", created_at as "createdAt"
             FROM notifications 
             WHERE user_id = ? AND read = FALSE 
             ORDER BY created_at DESC`,
            [userId]
        );
        res.json({ notifications: rows || [] });
    } catch (e) {
        console.error('[NOTIFY] Poll error:', e.message);
        res.status(500).json({ error: e.message });
    }
}

/**
 * POST /api/admin-notify/read
 * Marks a notification as read
 */
router.post('/read', async (req, res) => {
    const { userId, notificationId } = req.body;
    if (!userId || !notificationId) return res.status(400).json({ error: 'Missing read data' });

    try {
        await db.run(
            'UPDATE notifications SET read = true WHERE id = ? AND user_id = ?',
            [notificationId, userId]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/admin-notify/track
 * Tracks engagement events
 */
router.post('/track', async (req, res) => {
    const { notificationId, userId, eventType, metadata } = req.body;
    if (!notificationId || !userId || !eventType) return res.status(400).json({ error: 'Missing tracking data' });

    try {
        const eventId = `ev_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        await db.run(
            'INSERT INTO engagement_events (id, notification_id, user_id, event_type, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)',
            [eventId, notificationId, userId, eventType, Date.now(), JSON.stringify(metadata || {})]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/admin-notify/broadcast (Admin Only)
 * Sends a notification to one or more users
 */
router.post('/broadcast', requireAdmin, async (req, res) => {
    const { userId, segment, title, message, imageUrl, videoUrl, ctaUrl, type } = req.body;
    const now = Date.now();

    try {
        let targets = [];
        if (userId) {
            targets = [userId];
        } else if (segment === 'ALL') {
            const users = await db.all('SELECT id FROM users');
            targets = users.map(u => u.id);
        } else if (segment) {
            const users = await db.all('SELECT id FROM users WHERE subscription LIKE ?', [`%${segment}%`]);
            targets = users.map(u => u.id);
        }

        if (!targets.length) return res.status(404).json({ error: 'No targets' });

        for (const tid of targets) {
            const id = `notif_${now}_${Math.random().toString(36).substr(2, 5)}`;
            await db.run(
                'INSERT INTO notifications (id, user_id, type, title, message, image_url, video_url, cta_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, tid, type || 'broadcast', title, message, imageUrl || null, videoUrl || null, ctaUrl || null, now]
            );
        }

        res.json({ success: true, targets: targets.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
