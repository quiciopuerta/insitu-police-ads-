import express from 'express';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import db from '../db.js';
import { validateTurnstile } from '../utils/turnstile.js';
import { sendWelcomeEmail, sendRecoveryEmail } from '../utils/emailService.js';

const router = express.Router();

// Format: "scrypt:<salt_hex>:<hash_hex>"
function hashPassword(plain) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(plain, salt, 64).toString('hex');
    return `scrypt:${salt}:${hash}`;
}

// Migration-safe: accepts hashed ("scrypt:...") or legacy plaintext
function verifyPassword(plain, stored) {
    if (stored && stored.startsWith('scrypt:')) {
        const [, salt, hash] = stored.split(':');
        const candidate = scryptSync(plain, salt, 64);
        return timingSafeEqual(Buffer.from(hash, 'hex'), candidate);
    }
    // Legacy plaintext — upgrade on next login
    const padLen = plain.length + 32;
    return timingSafeEqual(
        Buffer.from((stored || '').padEnd(padLen, '\0')),
        Buffer.from(plain.padEnd(padLen, '\0'))
    ) && stored === plain;
}

function safeJSONParse(val, fallback) {
    if (typeof val === 'string') {
        try { return JSON.parse(val || fallback); } catch(e) { return JSON.parse(fallback); }
    }
    return val != null ? val : JSON.parse(fallback);
}

router.post('/login', async (req, res) => {
    const { username, password, recaptchaToken } = req.body;
    try {
        const isHuman = await validateTurnstile(recaptchaToken);
        if (!isHuman) return res.status(403).json({ error: 'Falla en la validación de seguridad.' });

        const user = await db.get("SELECT *, first_name AS firstName, last_name AS lastName, last_login AS lastLogin, usage_limit AS usageLimit, approval_status AS approvalStatus, usage_history AS usageHistory, brand_profile AS brandProfile, brand_profiles AS brandProfiles FROM users WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))", [username, username]);
        if (user && verifyPassword(password, user.password)) {
            // Upgrade plaintext → hashed transparently
            if (user.password && !user.password.startsWith('scrypt:')) {
                await db.run('UPDATE users SET password = ? WHERE id = ?', [hashPassword(password), user.id]);
            }
            user.subscription = safeJSONParse(user.subscription, '{}');
            user.usageHistory = safeJSONParse(user.usage_history, '[]');
            user.brandProfile = safeJSONParse(user.brand_profile, '{}');
            user.brandProfiles = safeJSONParse(user.brand_profiles, '[]');
            user.firstName = user.first_name;
            user.lastName = user.last_name;
            user.lastLogin = user.last_login;
            user.usageLimit = user.usage_limit;
            user.approvalStatus = user.approval_status;

            // Update last_login
            await db.run('UPDATE users SET last_login = ? WHERE id = ?', [Date.now(), user.id]);

            const { password: _, first_name: __, last_name: ___, last_login: ____, usage_limit: _____, approval_status: ______, usage_history: _______, brand_profile: ________, brand_profiles: _________, ...safeUser } = user;
            res.json({ user: safeUser });
        } else {
            res.status(401).json({ error: 'Credenciales inválidas' });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post('/register', async (req, res) => {
    const { username, password, email, firstName, lastName, phone, recaptchaToken } = req.body;
    try {
        const isHuman = await validateTurnstile(recaptchaToken);
        if (!isHuman) return res.status(403).json({ error: 'Falla en la validación de seguridad.' });

        const id = Math.random().toString(36).substr(2, 9);
        const subscription = JSON.stringify({
            status: 'trial',
            plan: 'Trial',
            price: 0,
            expiryDate: Date.now() + (1000 * 60 * 60 * 24 * 7)
        });

        await db.run(
            `INSERT INTO users (id, username, password, email, first_name, last_name, role, approval_status, picture, last_login, subscription, usage_limit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, username, hashPassword(password), email, firstName, lastName, 'user', 'pending',
                `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=FF497C&color=fff`,
                Date.now(), subscription, 500]
        );
        res.json({ success: true, message: 'Registro exitoso, pendiente de aprobación.' });

        // Send welcome email (non-blocking)
        sendWelcomeEmail(email, firstName).catch(e =>
          console.error('[EMAIL] Welcome email failed:', e.message)
        );
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'El usuario o email ya existe.' });
        }
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── Get current user by ID ───────────────────────────────────────────────────
router.get('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await db.get("SELECT *, first_name AS firstName, last_name AS lastName, last_login AS lastLogin, usage_limit AS usageLimit, approval_status AS approvalStatus, usage_history AS usageHistory, brand_profile AS brandProfile, brand_profiles AS brandProfiles FROM users WHERE id = ?", [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        user.subscription = safeJSONParse(user.subscription, '{}');
        user.brandProfile = safeJSONParse(user.brand_profile, '{}');
        user.brandProfiles = safeJSONParse(user.brand_profiles, '[]');
        
        const { password: _, first_name: __, last_name: ___, last_login: ____, usage_limit: _____, approval_status: ______, usage_history: _______, brand_profile: ________, brand_profiles: _________, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── Profile Update ───────────────────────────────────────────────────────────
router.patch('/profile/:userId', async (req, res) => {
    const { userId } = req.params;
    const data = req.body;
    try {
        const fieldMap = {
            firstName: 'first_name',
            lastName: 'last_name',
            email: 'email',
            picture: 'picture',
            phone: 'phone',
            username: 'username'
        };

        const sets = [];
        const params = [];
        for (const [key, col] of Object.entries(fieldMap)) {
            if (data[key] !== undefined) {
                sets.push(`${col} = ?`);
                params.push(data[key]);
            }
        }
        if (data.brandProfile !== undefined) {
            sets.push('brand_profile = ?');
            params.push(JSON.stringify(data.brandProfile));
        }
        if (data.brandProfiles !== undefined) {
            sets.push('brand_profiles = ?');
            params.push(JSON.stringify(data.brandProfiles));
        }
        if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
        params.push(userId);
        await db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
        const user = await db.get("SELECT *, first_name AS firstName, last_name AS lastName, last_login AS lastLogin, usage_limit AS usageLimit, approval_status AS approvalStatus, usage_history AS usageHistory, brand_profile AS brandProfile, brand_profiles AS brandProfiles FROM users WHERE id = ?", [userId]);
        
        user.subscription = safeJSONParse(user.subscription, '{}');
        user.brandProfile = safeJSONParse(user.brand_profile, '{}');
        user.brandProfiles = safeJSONParse(user.brand_profiles, '[]');

        const { password: _, first_name: __, last_name: ___, last_login: ____, usage_limit: _____, approval_status: ______, usage_history: _______, brand_profile: ________, brand_profiles: _________, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── Brand Profile ────────────────────────────────────────────────────────────
router.post('/brand-profile/:userId', async (req, res) => {
    const { userId } = req.params;
    const profile = req.body;
    try {
        await db.run('UPDATE users SET brand_profile = ? WHERE id = ?', [JSON.stringify(profile), userId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── Token Usage Tracking ─────────────────────────────────────────────────────
router.post('/track-tokens/:userId', async (req, res) => {
    const { userId } = req.params;
    const { tokens, task, details } = req.body;
    try {
        const user = await db.get('SELECT total_tokens_used, usage_history FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const totalTokens = (user.total_tokens_used || 0) + tokens;
        let history = safeJSONParse(user.usage_history, '[]');
        history.push({
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            tokensUsed: tokens,
            taskName: task,
            details,
        });
        if (history.length > 100) history = history.slice(-100);

        await db.run(
            'UPDATE users SET total_tokens_used = ?, usage_history = ? WHERE id = ?',
            [totalTokens, JSON.stringify(history), userId]
        );
        res.json({ success: true, totalTokensUsed: totalTokens });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── Subscription Update ──────────────────────────────────────────────────────
router.patch('/subscription/:userId', async (req, res) => {
    const { userId } = req.params;
    const subscriptionData = req.body;
    try {
        const user = await db.get("SELECT subscription FROM users WHERE id = ?", [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const existing = safeJSONParse(user.subscription, '{}');
        const updated = { ...existing, ...subscriptionData };
        await db.run("UPDATE users SET subscription = ? WHERE id = ?", [JSON.stringify(updated), userId]);
        res.json({ success: true, subscription: updated });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── Google OAuth Login ───────────────────────────────────────────────────
router.post('/google', async (req, res) => {
    const { credential, accessToken, recaptchaToken } = req.body;
    try {
        const isHuman = await validateTurnstile(recaptchaToken);
        if (!isHuman) return res.status(403).json({ error: 'Falla en la validación de seguridad.' });

        if (!credential) return res.status(400).json({ error: 'Missing credential' });

        // Verify JWT signature using OAuth2Client
        let payload;
        try {
            const { OAuth2Client } = await import("google-auth-library");
            const client = new OAuth2Client({
                clientId: process.env.GOOGLE_CLIENT_ID || "",
            });
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID || "",
            });
            payload = ticket.getPayload();
            if (!payload) throw new Error("Invalid token payload");
        } catch (err) {
            console.error("[AUTH] Google JWT verification failed:", err.message || err);
            return res.status(401).json({ error: "Invalid Google token" });
        }

        const { email, name, picture } = payload;
        if (!email) throw new Error("Email not found in Google Token");

        let user = await db.get("SELECT *, first_name AS firstName, last_name AS lastName, last_login AS lastLogin, usage_limit AS usageLimit, approval_status AS approvalStatus, usage_history AS usageHistory, brand_profile AS brandProfile, brand_profiles AS brandProfiles FROM users WHERE email = ?", [email]);
        const now = Date.now();
        const trialExpiry = now + (1000 * 60 * 60 * 24 * 7);

        if (user) {
            user.subscription = safeJSONParse(user.subscription, '{}');
            user.usageHistory = safeJSONParse(user.usage_history, '[]');
            user.brandProfile = safeJSONParse(user.brand_profile, '{}');
            user.brandProfiles = safeJSONParse(user.brand_profiles, '[]');
            user.firstName = user.first_name;
            user.lastName = user.last_name;

            // If no active plan, activate a 7-day trial
            if (user.subscription.status !== 'active') {
                user.subscription = {
                    status: 'trial', plan: 'Trial', price: 0, expiryDate: trialExpiry
                };
                await db.run('UPDATE users SET subscription = ?, approval_status = \'approved\' WHERE id = ?', [JSON.stringify(user.subscription), user.id]);
            } else {
                await db.run('UPDATE users SET approval_status = \'approved\' WHERE id = ?', [user.id]);
            }
            await db.run('UPDATE users SET last_login = ? WHERE id = ?', [now, user.id]);
        } else {
            // Create new user with 7-day trial
            const id = Math.random().toString(36).substr(2, 9);
            const subscription = {
                status: 'trial', plan: 'Trial', price: 0, expiryDate: trialExpiry
            };
            await db.run(
                `INSERT INTO users (id, username, email, first_name, last_name, role, approval_status, picture, last_login, subscription, usage_limit) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, email, email, name.split(' ')[0], name.split(' ').slice(1).join(' ') || '', 'user', 'approved',
                    picture, now, JSON.stringify(subscription), 500]
            );
            user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
            user.subscription = subscription;
            user.usageHistory = [];
            user.brandProfile = {};
            user.brandProfiles = [];
            user.firstName = user.first_name;
            user.lastName = user.last_name;
        }

        const { password: _, ...safeUser } = user;
        if (accessToken) {
            safeUser.linkedGoogleAds = { name, email, picture, accessToken, method: 'oauth' };
        }
        res.json({ user: safeUser });
    } catch (error) {
        console.error("Google Auth Server Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// ── Password Recovery ────────────────────────────────────────────────────────
router.post('/recovery', async (req, res) => {
    const { emailOrUsername, recaptchaToken } = req.body;
    try {
        const isHuman = await validateTurnstile(recaptchaToken);
        if (!isHuman) return res.status(403).json({ error: 'Falla en la validación de seguridad.' });

        const user = await db.get("SELECT email, id FROM users WHERE email = ? OR username = ?", [emailOrUsername, emailOrUsername]);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await db.run('UPDATE users SET recovery_code = ? WHERE id = ?', [code, user.id]);
        
        // Send recovery code via email
        const emailResult = await sendRecoveryEmail(user.email, code);
        if (!emailResult.success) {
          console.warn('[AUTH] Recovery email not delivered:', emailResult.error);
        }
        
        res.json({ success: true, message: `Código enviado a ${user.email.substring(0, 3)}***` });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post('/reset-password', async (req, res) => {
    const { emailOrUsername, code, newPass, recaptchaToken } = req.body;
    try {
        const isHuman = await validateTurnstile(recaptchaToken);
        if (!isHuman) return res.status(403).json({ error: 'Falla en la validación de seguridad.' });

        const user = await db.get('SELECT id FROM users WHERE (email = ? OR username = ?) AND recovery_code = ?', [emailOrUsername, emailOrUsername, code]);
        if (!user) return res.status(400).json({ message: 'Código inválido o expirado.' });

        await db.run('UPDATE users SET password = ?, recovery_code = NULL WHERE id = ?', [hashPassword(newPass), user.id]);
        res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
