import express from 'express';
import db from '../db.js';

const router = express.Router();

/**
 * GET /api/history/:userId
 * Retorna el historial de un usuario específico
 */
router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    console.log('[API] History: Fetching for id =', userId);
    try {
        const rows = await db.all('SELECT * FROM history WHERE (user_id = ? OR userid = ?) AND (is_deleted IS NULL OR is_deleted = false) ORDER BY timestamp DESC LIMIT 100', [userId, userId]);
        console.log('[API] History: Rows found =', rows?.length);
        
        if (!Array.isArray(rows)) {
            console.error('[API] History: Rows is not an array!', rows);
            return res.json([]);
        }

        const history = rows.map(r => {
            try {
                return {
                    ...r,
                    userId: r.user_id || r.userid,
                    query: typeof r.query === 'string' ? JSON.parse(r.query || '""') : (r.query || ''),
                    data: typeof r.data === 'string' ? JSON.parse(r.data || '{}') : (r.data || {}),
                    result: typeof r.results === 'string' ? JSON.parse(r.results || '{}') : (r.results || {})
                };
            } catch (e) {
                console.error('[API] History: Parse error for row id =', r.id, e.message);
                return { ...r, data: {}, result: {} };
            }
        });
        res.json(history);
    } catch (error) {
        console.error('[HISTORY] CRITICAL Error fetching for userId:', userId, error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            stack: error.stack 
        });
    }
});

/**
 * POST /api/history
 * Guarda un nuevo item de historial
 */
router.post('/', async (req, res) => {
    const item = req.body;
    const xUserId = req.headers['x-user-id'] || item.userId;

    if (!xUserId) {
        return res.status(400).json({ error: 'Missing User ID' });
    }

    try {
        const id = item.id || Math.random().toString(36).substr(2, 9);
        const timestamp = item.timestamp || Date.now();
        
        await db.run(
            `INSERT INTO history (id, user_id, userid, type, query, timestamp, data, results)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, 
                xUserId,
                xUserId, 
                item.type || 'audit', 
                item.query || '', 
                timestamp,
                JSON.stringify(item.data || {}),
                JSON.stringify(item.results || {})
            ]
        );
        res.json({ success: true, id });
    } catch (error) {
        console.error('[HISTORY] Error saving item:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/**
 * DELETE /api/history/:itemId
 * Soft-deletes a history item (Safe Management Protocol: no physical DELETE)
 */
router.delete('/:itemId', async (req, res) => {
    const { itemId } = req.params;
    const xUserId = req.headers['x-user-id'];

    try {
        if (xUserId) {
            await db.run('UPDATE history SET is_deleted = true WHERE id = ? AND (user_id = ? OR userid = ?)', [itemId, xUserId, xUserId]);
        } else {
            await db.run('UPDATE history SET is_deleted = true WHERE id = ?', [itemId]);
        }
        // Audit log
        const logId = Math.random().toString(36).substr(2, 12);
        await db.run(
            'INSERT INTO audit_delete_log (id, created_at, author, action, target_id, details) VALUES (?, ?, ?, ?, ?, ?)',
            [logId, Date.now(), xUserId || 'system', 'SOFT_DELETE_HISTORY', itemId, '{}']
        ).catch(() => {});
        res.json({
            success: true,
            message: 'Registro archivado. Los datos se conservan por protocolo de auditoría.'
        });
    } catch (error) {
        console.error('[HISTORY] Error soft-deleting:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
