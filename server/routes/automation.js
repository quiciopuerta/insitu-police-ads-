import express from 'express';
import db from '../db.js';

const router = express.Router();

/**
 * GET /api/automation/rules/:userId
 * Fetch rules for the user
 */
router.get('/rules/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const rows = await db.all('SELECT * FROM automation_rules WHERE user_id = ? AND is_deleted = false ORDER BY created_at DESC', [userId]);
        const rules = rows.map(r => ({
            ...r,
            templateType: r.template_type,
            conditions: typeof r.conditions === 'string' ? JSON.parse(r.conditions) : (r.conditions || []),
            actions: typeof r.actions === 'string' ? JSON.parse(r.actions) : (r.actions || []),
            isActive: Boolean(r.is_active),
            createdAt: Number(r.created_at)
        }));
        res.json(rules);
    } catch (error) {
        console.error('[AUTOMATION] Error fetching rules:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/**
 * POST /api/automation/rules
 * Create or update a rule
 */
router.post('/rules', async (req, res) => {
    const rule = req.body;
    const userId = req.headers['x-user-id'] || rule.userId || rule.user_id;

    if (!userId) return res.status(400).json({ error: 'Missing User ID' });

    try {
        const id = rule.id || `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const createdAt = rule.createdAt || Date.now();
        
        // Simple Upsert logic
        const existing = await db.get('SELECT id FROM automation_rules WHERE id = ?', [id]);
        
        if (existing) {
            await db.run(
                `UPDATE automation_rules SET name = ?, description = ?, logic = ?, template_type = ?, conditions = ?, actions = ?, is_active = ? WHERE id = ?`,
                [
                    rule.name, 
                    rule.description, 
                    rule.logic || 'AND', 
                    rule.templateType || 'custom', 
                    JSON.stringify(rule.conditions || []), 
                    JSON.stringify(rule.actions || []), 
                    rule.isActive ? 1 : 0, 
                    id
                ]
            );
        } else {
            await db.run(
                `INSERT INTO automation_rules (id, user_id, name, description, logic, template_type, conditions, actions, is_active, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id, 
                    userId, 
                    rule.name, 
                    rule.description, 
                    rule.logic || 'AND', 
                    rule.templateType || 'custom', 
                    JSON.stringify(rule.conditions || []), 
                    JSON.stringify(rule.actions || []), 
                    rule.isActive ? 1 : 0, 
                    createdAt
                ]
            );
        }
        res.json({ success: true, id, message: existing ? 'Rule updated' : 'Rule created' });
    } catch (error) {
        console.error('[AUTOMATION] Error saving rule:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/**
 * DELETE /api/automation/rules/:id
 * Soft delete a rule
 */
router.delete('/rules/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.run('UPDATE automation_rules SET is_deleted = true, is_active = false WHERE id = ?', [id]);
        res.json({ success: true, message: 'Rule deleted (soft delete)' });
    } catch (error) {
        console.error('[AUTOMATION] Error deleting rule:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/**
 * GET /api/automation/logs/:userId
 * Fetch logs for the user (rules belong to user)
 */
router.get('/logs/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // Find logs for rules owned by this user
        const rows = await db.all(`
            SELECT l.* FROM automation_logs l
            JOIN automation_rules r ON l.rule_id = r.id
            WHERE r.user_id = ?
            ORDER BY l.timestamp DESC LIMIT 100
        `, [userId]);
        
        const logs = rows.map(l => ({
            ...l,
            ruleName: l.rule_name,
            campaignId: l.campaign_id,
            adId: l.ad_id,
            actionTaken: l.action_taken,
            metricsSnapshot: typeof l.metrics_snapshot === 'string' ? JSON.parse(l.metrics_snapshot) : (l.metrics_snapshot || {}),
            timestamp: Number(l.timestamp)
        }));
        res.json(logs);
    } catch (error) {
        console.error('[AUTOMATION] Error fetching logs:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

/**
 * POST /api/automation/logs
 * Save a new execution log
 */
router.post('/logs', async (req, res) => {
    const log = req.body;
    if (!log.ruleId || !log.actionTaken) {
        return res.status(400).json({ error: 'Missing log data (ruleId, actionTaken)' });
    }

    try {
        const id = log.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await db.run(
            `INSERT INTO automation_logs (id, rule_id, rule_name, timestamp, campaign_id, ad_id, action_taken, metrics_snapshot, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, 
                log.ruleId, 
                log.ruleName || 'Unknown Rule', 
                log.timestamp || Date.now(), 
                log.campaignId || 'Unknown Campaign', 
                log.adId || 'Unknown Ad', 
                log.actionTaken, 
                JSON.stringify(log.metricsSnapshot || {}), 
                log.status || 'success'
            ]
        );
        res.json({ success: true, id });
    } catch (error) {
        console.error('[AUTOMATION] Error saving log:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export default router;
