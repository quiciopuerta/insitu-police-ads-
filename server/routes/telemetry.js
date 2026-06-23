import express from 'express';
import db from '../db.js';

const router = express.Router();

/**
 * POST /api/telemetry/latency
 * Log execution time for AI tasks (Video Generation, Image Audit, etc.)
 */
router.post('/latency', async (req, res) => {
    const { taskType, durationMs, status, metadata } = req.body;

    if (!taskType || durationMs === undefined) {
        return res.status(400).json({ error: 'Missing telemetry data (taskType, durationMs)' });
    }

    try {
        const id = `tel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await db.run(
            `INSERT INTO latency_telemetry (id, task_type, duration_ms, status, timestamp, metadata)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                id,
                taskType,
                durationMs,
                status || 'completed',
                Date.now(),
                JSON.stringify(metadata || {})
            ]
        );
        res.json({ success: true, id });
    } catch (error) {
        console.error('[TELEMETRY] Error logging latency:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/**
 * GET /api/telemetry/latency
 * Fetch recent latency logs for system monitoring
 * Only accessible via internal admin dashboard (to be integrated)
 */
router.get('/latency', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM latency_telemetry ORDER BY timestamp DESC LIMIT 200');
        const stats = rows.map(r => ({
            id: r.id,
            taskType: r.task_type,
            durationMs: r.duration_ms,
            status: r.status,
            timestamp: Number(r.timestamp),
            metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {})
        }));
        res.json(stats);
    } catch (error) {
        console.error('[TELEMETRY] Error fetching stats:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;
