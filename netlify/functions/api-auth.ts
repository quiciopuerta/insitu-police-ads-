/**
 * api-auth.ts — Netlify Function
 * Handles all authentication endpoints:
 *   POST /api/auth/login
 *   POST /api/auth/register
 *   POST /api/auth/google
 *   POST /api/auth/recovery
 *   POST /api/auth/reset-password
 *   GET  /api/auth/user/:userId
 *   PATCH /api/auth/profile/:userId
 *   POST /api/auth/brand-profile/:userId
 *   POST /api/auth/track-tokens/:userId
 *   PATCH /api/auth/subscription/:userId
 */
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { runMigrations } from "./_lib/migrations";
import { safeError, logError } from "./_lib/errorHandler";
import { sendEmail, sendToAdmins, adminNewUserEmail, welcomeEmail, recoveryEmail, passwordChangedEmail, usageAlertEmail } from "./_lib/mailService";
import { getCorsHeaders } from "./_lib/corsHelper";
import { scryptSync, randomBytes, randomUUID, randomInt, timingSafeEqual } from "node:crypto";
import { checkRateLimit, getClientIp } from "./_lib/rateLimiter";
import { validateBody, LoginSchema, RegisterSchema, RecoverySchema, ResetPasswordSchema } from "./_lib/validators";
import { validateTurnstile } from "./_lib/turnstile";

// ── Password hashing (scrypt, Node built-in, no extra deps) ────────────────
// Format stored: "scrypt:<salt_hex>:<hash_hex>"
function hashPassword(plain: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(plain, salt, 64).toString("hex");
    return `scrypt:${salt}:${hash}`;
}

// Migration-safe: accepts both hashed ("scrypt:...") and legacy plaintext.
// Returns { valid, needsRehash } so callers can upgrade the stored value.
function verifyPassword(plain: string, stored: string): { valid: boolean; needsRehash: boolean } {
    if (stored.startsWith("scrypt:")) {
        const [, salt, hash] = stored.split(":");
        const hashBuf = Buffer.from(hash || "", "hex");
        const candidate = scryptSync(plain, salt || "", 64);
        
        // timingSafeEqual throws if lengths differ. Check length to avoid 500 error.
        if (hashBuf.length !== candidate.length) return { valid: false, needsRehash: false };
        
        const valid = timingSafeEqual(hashBuf, candidate);
        return { valid, needsRehash: false };
    }
    // Legacy plaintext — constant-time comparison via Buffer
    const valid = timingSafeEqual(
        Buffer.from(stored.padEnd(plain.length + 32, "\0")),
        Buffer.from(plain.padEnd(plain.length + 32, "\0"))
    ) && stored === plain;
    return { valid, needsRehash: valid };
}



// ── Turnstile Validation ──────────────────────────────────────────────────────
async function validateCaptcha(token: string | undefined): Promise<boolean> {
    try {
        return await validateTurnstile(token);
    } catch (e) {
        console.error("[reCAPTCHA] Network error during reCAPTCHA validation:", e);
        return false;
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeJson(val: unknown, fallback: unknown) {
    try {
        return typeof val === "string" ? JSON.parse(val) : (val ?? fallback);
    } catch {
        return fallback;
    }
}

function hydrateUser(u: any) {
    const now = Date.now();
    return {
        id: u.id,
        username: u.username,
        email: u.email,
        firstName: u.first_name || u.firstName || "",
        lastName: u.last_name || u.lastName || "",
        phone: u.phone || "",
        role: u.role || 'user',
        approvalStatus: u.approval_status || u.approvalStatus || 'approved',
        picture: u.picture,
        lastLogin: u.last_login || u.lastLogin,
        subscription: safeJson(u.subscription, {
            status: 'trial',
            plan: 'Trial',
            price: 0,
            currency: 'USD',
            billingCycle: 'Monthly',
            startDate: now,
            expiryDate: now + 1000 * 60 * 60 * 24 * 7,
            cancelAtPeriodEnd: false,
        }),
        usageLimit: u.usage_limit || u.usageLimit || 10000,
        totalTokensUsed: u.total_tokens_used || u.totalTokensUsed || 0,
        usageHistory: safeJson(u.usage_history || u.usageHistory, []),
        brandProfile: safeJson(u.brand_profile || u.brandProfile, {}),
        brandProfiles: safeJson(u.brand_profiles || u.brandProfiles, []),
        linkedGoogleAds: safeJson(u.linked_google_ads || u.linkedGoogleAds, null),
        linkedSearchConsole: safeJson(u.linked_search_console || u.linkedSearchConsole, null),
        bonus_tokens: u.bonus_tokens || 0,
        total_bonus_earned: u.total_bonus_earned || 0,
        referred_by: u.referred_by || null,
        is_deleted: !!u.is_deleted
    };
}

let migrationsRan = false;

// ── Handler ───────────────────────────────────────────────────────────────────
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    const origin = event.headers.origin;
    const json = (status: number, body: unknown) => ({
        statusCode: status,
        headers: getCorsHeaders(origin),
        body: JSON.stringify(body),
    });

    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: getCorsHeaders(origin), body: "" };

    // Run centralized migrations once per instance lifecycle
    if (!migrationsRan) {
        await runMigrations().catch(err => console.error("[AUTH] Migrations failed:", err));
        migrationsRan = true;
    }

    // Strip /api/auth prefix to get the sub-path
    const sub = event.path
        .replace(/^\/api\/auth\/?/, "")
        .replace(/^\/\.netlify\/functions\/api-auth\/?/, "");

    const body = event.body ? JSON.parse(event.body) : {};

    try {
        // ── POST /login ────────────────────────────────────────────────────────
        if (event.httpMethod === "POST" && sub === "login") {
            const clientIp = getClientIp(event);
            const rateLimitKey = `login:${clientIp}`;
            const rateLimit = await checkRateLimit(rateLimitKey, { windowMs: 15 * 60 * 1000, max: 5 });
            if (!rateLimit.success) {
                return json(429, { error: "Demasiados intentos de login. Intenta de nuevo en 15 minutos." });
            }

            // ── Zod schema validation ──────────────────────────────────────────
            const loginValidation = validateBody(LoginSchema, body);
            if (!loginValidation.success) return json(400, { error: (loginValidation as any).error });
            const { username, password, recaptchaToken } = loginValidation.data;
            const isExtension = event.headers.origin && event.headers.origin.startsWith('chrome-extension://');
            const ok = isExtension ? true : await validateCaptcha(recaptchaToken);
            if (!ok) return json(403, { error: "Falla en la validación de seguridad." });

            // ADMIN_PASSWORD (no VITE_ prefix) is the secure server-side var.
            // NEVER set VITE_ADMIN_PASSWORD in Netlify dashboard — VITE_ vars are
            // automatically bundled into the client-side JS by Vite, leaking credentials.
            const adminPass = process.env.ADMIN_PASSWORD || "";

            if (adminPass && password === adminPass) {
                console.log(`[AUTH] Admin bootstrap login used for: ${username}`);
                // Try to find the real superAdmin user record, otherwise reject
                const adminRows = await runQuery(async (sql) => await sql`SELECT * FROM users WHERE role = 'superAdmin' LIMIT 1`);
                if (adminRows && adminRows.length) {
                    const baseUser = hydrateUser(adminRows[0]);
                    return json(200, { user: baseUser });
                } else {
                    return json(401, { error: "No superAdmin user configured in database" });
                }
            }

            const rows = await runQuery(async (sql) => await sql`SELECT * FROM users WHERE (LOWER(username) = LOWER(${username}) OR LOWER(email) = LOWER(${username})) AND is_deleted = false`);
            
            if (rows === null) {
                return json(503, { error: "Base de datos temporalmente fuera de servicio (Cuota excedida). Por favor intenta más tarde." });
            }

            if (!rows.length) {
                console.warn(`[AUTH] Login failed: User not found (${username})`);
                return json(401, { error: "Credenciales inválidas" });
            }

            const { valid, needsRehash } = verifyPassword(password, rows[0].password ?? "");
            if (!valid) {
                console.warn(`[AUTH] Login failed: Password mismatch (${username})`);
                return json(401, { error: "Credenciales inválidas" });
            }

            const userStatus = rows[0].approval_status || rows[0].approvalStatus || 'approved';
            const userRole = rows[0].role || 'user';

            if (userStatus === "rejected") {
                console.warn(`[AUTH] Login blocked: User ${username} is REJECTED.`);
                return json(403, { error: "Cuenta rechazada. Contacta al administrador." });
            }
            if (userStatus === "pending" && userRole !== 'superAdmin') {
                console.warn(`[AUTH] Login blocked: User ${username} is PENDING approval.`);
                return json(403, { error: "Cuenta pendiente de aprobación. Inténtalo más tarde." });
            }

            const user = hydrateUser(rows[0]);
            await runQuery(async (sql) => await sql`UPDATE users SET last_login = ${Date.now()} WHERE id = ${user.id}`);
            
            if (needsRehash) {
                await runQuery(async (sql) => await sql`UPDATE users SET password = ${hashPassword(password)} WHERE id = ${user.id}`);
            }
            return json(200, { user });
        }

        // ── POST /register ─────────────────────────────────────────────────────
        if (event.httpMethod === "POST" && sub === "register") {
            const clientIp = getClientIp(event);
            const rateLimitKey = `register:${clientIp}`;
            const rateLimit = await checkRateLimit(rateLimitKey, { windowMs: 60 * 60 * 1000, max: 3 });
            if (!rateLimit.success) {
                return json(429, { error: "Demasiados intentos de registro. Intenta de nuevo en 1 hora." });
            }

            // ── Zod schema validation ──────────────────────────────────────────
            const registerValidation = validateBody(RegisterSchema, body);
            if (!registerValidation.success) return json(400, { error: (registerValidation as any).error });
            const { username, password, email, firstName, lastName, phone, recaptchaToken } = registerValidation.data;
            const ok = await validateCaptcha(recaptchaToken);
            if (!ok) return json(403, { error: "Falla en la validación de seguridad." });

            // Fetch trial settings from DB
            const settingsRows = await runQuery(async (sql) => await sql`SELECT data FROM settings WHERE id = 1`);
            const settings = (settingsRows && settingsRows.length) ? safeJson(settingsRows[0].data, {}) as any : {};
            const trialDays = settings.trialDays ?? 7;
            const trialTokens = settings.trialTokens ?? 500;

            const id = randomUUID();
            const subscription = JSON.stringify({
                status: "trial",
                plan: "Trial",
                price: 0,
                expiryDate: Date.now() + 1000 * 60 * 60 * 24 * trialDays,
            });

            const insertResult = await runQuery(async (sql) => {
                const countRes = await sql`SELECT count(*) FROM users`;
                const isFirst = countRes[0].count === '0' || countRes[0].count === 0;
                const role = isFirst ? 'superAdmin' : 'user';
                const status = isFirst ? 'approved' : 'pending';

                const hashedPassword = hashPassword(password);
                return await sql`
                  INSERT INTO users (id, username, password, email, first_name, last_name, phone, role, approval_status, picture, last_login, subscription, usage_limit, brand_profiles, referred_by)
                  VALUES (
                    ${id}, ${username}, ${hashedPassword}, ${email},
                    ${firstName}, ${lastName}, ${phone || null},
                    ${role}, ${status},
                    ${"https://ui-avatars.com/api/?name=" + (firstName || "") + "+" + (lastName || "") + "&background=FF497C&color=fff"},
                    ${Date.now()}, ${subscription}, ${trialTokens}, '[]', ${body.referredBy || null}
                  )
                `;
            }).catch(e => {
                if (e.message?.includes("unique") || e.message?.includes("UNIQUE")) {
                    return "unique_error";
                }
                throw e;
            });

            if (insertResult === "unique_error") {
                return json(400, { error: "El usuario o email ya existe." });
            }
            if (insertResult === null) {
                return json(503, { error: "Base de datos no disponible para registro." });
            }

            // Background tasks: Offload rewards and emails to improve response time
            const bgTask = (async () => {
                try {
                    // Gamification: Reward the referrer if active paid plan
                    if (body.referredBy) {
                        await processReferralReward(body.referredBy);
                    }

                    // Send welcome email to user
                    await sendEmail(
                        email,
                        "¡Bienvenido a INsitu AI! 🚀 Tu cuenta está lista",
                        welcomeEmail(firstName || username, trialDays, trialTokens)
                    );

                    // Notify admins of new pending user
                    await sendToAdmins(`🔔 Nuevo usuario pendiente: ${email}`, adminNewUserEmail(firstName || username, email, id));
                } catch (bgErr) {
                    console.error("[AUTH] Background registration tasks failed:", bgErr);
                }
            })();

            if ((event as any).waitUntil) {
                (event as any).waitUntil(bgTask);
            }

            return json(200, {
                success: true,
                message: "Registro exitoso. Revisa tu correo — te enviamos los detalles de tu cuenta.",
            });
        }

        // ── POST /google ────────────────────────────────────────────────────────
        if (event.httpMethod === "POST" && sub === "google") {
            const { credential, accessToken, recaptchaToken } = body;
            const ok = await validateCaptcha(recaptchaToken);
            if (!ok) return json(403, { error: "Falla en la validación de seguridad." });
            if (!credential) return json(400, { error: "Missing credential" });

            let payload: any;
            try {
                // Verify JWT signature using OAuth2Client
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
                console.error("[AUTH] Google JWT verification failed:", err instanceof Error ? err.message : err);
                return json(401, { error: "Invalid Google token" });
            }

            const { email, name, picture } = payload;
            if (!email) return json(400, { error: "Email not found in Google token" });

            const now = Date.now();
            const trialExpiry = now + 1000 * 60 * 60 * 24 * 7;
            const trialSub = JSON.stringify({ status: "trial", plan: "Trial", price: 0, expiryDate: trialExpiry });

            const rows = await runQuery(async (sql) => await sql`SELECT * FROM users WHERE email = ${email}`);
            if (rows === null) return json(503, { error: "Base de datos no disponible para login de Google." });

            let user: any;
            let isNewUser = false;

            if (rows.length) {
                user = hydrateUser(rows[0]);
                if (user.subscription.status !== "active") {
                    user.subscription = { status: "trial", plan: "Trial", price: 0, expiryDate: trialExpiry };
                    await runQuery(async (sql) => await sql`UPDATE users SET subscription = ${trialSub}, approval_status = 'approved' WHERE id = ${user.id}`);
                } else {
                    await runQuery(async (sql) => await sql`UPDATE users SET approval_status = 'approved' WHERE id = ${user.id}`);
                }
                const linkedObj = JSON.stringify({ name, email, picture, accessToken, method: "oauth" });
                await runQuery(async (sql) => await sql`UPDATE users SET last_login = ${now}, linked_google_ads = ${linkedObj} WHERE id = ${user.id}`);
                user.linkedGoogleAds = { name, email, picture, accessToken, method: "oauth" };
            } else {
                isNewUser = true;
                const id = randomUUID();
                const nameParts = (name || "").split(" ");
                const linkedObj = JSON.stringify({ name, email, picture, accessToken, method: "oauth" });
                await runQuery(async (sql) => {
                    const countRes = await sql`SELECT count(*) FROM users`;
                    const isFirst = countRes[0].count === '0' || countRes[0].count === 0;
                    const role = isFirst ? 'superAdmin' : 'user';

                    await sql`
                      INSERT INTO users (id, username, email, first_name, last_name, role, approval_status, picture, last_login, subscription, usage_limit, brand_profiles, linked_google_ads, referred_by)
                      VALUES (
                        ${id}, ${email}, ${email},
                        ${nameParts[0] || ""}, ${nameParts.slice(1).join(" ") || ""},
                        ${role}, 'approved', ${picture || ""}, ${now}, ${trialSub}, 500, '[]', ${linkedObj}, ${body.referredBy || null}
                      )
                    `;
                });
                const created = await runQuery(async (sql) => await sql`SELECT * FROM users WHERE id = ${id}`);
                if (!created || !created.length) return json(500, { error: "Error creando usuario de Google" });
                user = hydrateUser(created[0]);
                
                // Background tasks for new Google users
                const bgTask = (async () => {
                    try {
                        if (body.referredBy) {
                            await processReferralReward(body.referredBy);
                        }
                        const nameParts = (name || "").split(" ");
                        await sendEmail(
                            email,
                            "¡Bienvenido a INsitu AI! 🚀",
                            welcomeEmail(nameParts[0] || email, 7, 500)
                        );
                        await sendToAdmins(`🔔 Nuevo usuario Google: ${email}`, adminNewUserEmail(nameParts[0] || email, email, user.id));
                    } catch (bgErr) {
                        console.error("[AUTH] Background Google registration tasks failed:", bgErr);
                    }
                })();

                if ((event as any).waitUntil) {
                    (event as any).waitUntil(bgTask);
                }
            }

            if (accessToken) {
                user.linkedGoogleAds = { name, email, picture, accessToken, method: "oauth" };
            }
            return json(200, { user });
        }

        // ── POST /recovery ──────────────────────────────────────────────────────
        if (event.httpMethod === "POST" && sub === "recovery") {
            // ── Zod schema validation ──────────────────────────────────────────
            const recoveryValidation = validateBody(RecoverySchema, body);
            if (!recoveryValidation.success) return json(400, { error: (recoveryValidation as any).error });
            const { emailOrUsername, recaptchaToken } = recoveryValidation.data;
            const ok = await validateCaptcha(recaptchaToken);
            if (!ok) return json(403, { error: "Falla en la validación de seguridad." });

            const rows = await runQuery(async (sql) => await sql`
              SELECT * FROM users WHERE email = ${emailOrUsername} OR username = ${emailOrUsername}
            `);
            if (rows === null) return json(503, { error: "DB unavailable" });
            if (!rows.length) return json(404, { message: "Usuario no encontrado." });

            const code = randomInt(100000, 1000000).toString();
            const expiry = Date.now() + 15 * 60 * 1000; // 15 minutes
            await runQuery(async (sql) => await sql`UPDATE users SET "recoveryCode" = ${code}, "recoveryCodeExpiry" = ${expiry} WHERE id = ${rows[0].id}`);

            const userEmail = rows[0].email as string;
            const firstName = (rows[0].first_name || rows[0].firstName || "usuario") as string;

            try {
                // Send recovery email with code
                await sendEmail(
                    userEmail,
                    "🔐 Código de recuperación — INsitu AI",
                    recoveryEmail(firstName, code)
                );
            } catch (err: any) {
                console.error("[AUTH] Error sending recovery email:", err.message);
                return json(500, { error: "Error al enviar el correo de recuperación. Por favor verifica los ajustes SMTP." });
            }

            return json(200, {
                success: true,
                message: `Código enviado a ${String(userEmail).substring(0, 3)}***@${String(userEmail).split("@")[1]}`,
            });
        }

        // ── POST /reset-password ────────────────────────────────────────────────
        if (event.httpMethod === "POST" && sub === "reset-password") {
            // ── Zod schema validation ──────────────────────────────────────────
            const resetValidation = validateBody(ResetPasswordSchema, body);
            if (!resetValidation.success) return json(400, { error: (resetValidation as any).error });
            const { emailOrUsername, code, newPass, recaptchaToken } = resetValidation.data;
            const ok = await validateCaptcha(recaptchaToken);
            if (!ok) return json(403, { error: "Falla en la validación de seguridad." });

            const rows = await runQuery(async (sql) => await sql`
              SELECT * FROM users
              WHERE (email = ${emailOrUsername} OR username = ${emailOrUsername})
                AND ("recoveryCode" = ${code} OR recovery_code = ${code})
            `);
            if (rows === null) return json(503, { error: "DB unavailable" });
            if (!rows.length) return json(400, { message: "Código inválido." });

            // Check expiry (15 min TTL)
            const expiry = (rows[0].recoveryCodeExpiry || rows[0].recovery_code_expiry) as number;
            if (expiry && Date.now() > expiry) {
                return json(400, { message: "El código ha expirado. Solicita uno nuevo." });
            }

            // We update both possible columns in case of schema drift
            await runQuery(async (sql) => await sql`UPDATE users SET password = ${hashPassword(newPass)}, "recoveryCode" = NULL, "recoveryCodeExpiry" = NULL WHERE id = ${rows[0].id}`).catch(() => {});
            await runQuery(async (sql) => await sql`UPDATE users SET password = ${hashPassword(newPass)}, recovery_code = NULL, recovery_code_expiry = NULL WHERE id = ${rows[0].id}`).catch(() => {});

            // Send confirmation email
            try {
                await sendEmail(
                    rows[0].email as string,
                    "✅ Contraseña actualizada — INsitu AI",
                    passwordChangedEmail((rows[0].first_name || rows[0].firstName || "usuario") as string)
                );
            } catch (err: any) {
                console.error("[AUTH] Error sending password reset confirmation email:", err.message);
                // Non-fatal, we updated the password successfully. We just failed the notification.
            }

            return json(200, { success: true, message: "¡Contraseña actualizada! Redirigiendo al inicio de sesión..." });
        }

        // ── GET /user/:userId ───────────────────────────────────────────────────
        if (event.httpMethod === "GET" && sub.startsWith("user/")) {
            const userId = sub.replace("user/", "");
            const rows = await runQuery(async (sql) => await sql`SELECT * FROM users WHERE id = ${userId}`);
            if (rows === null) return json(503, { error: "DB unavailable" });
            if (!rows.length) return json(404, { error: "User not found" });
            const user = hydrateUser(rows[0]);
            return json(200, user);
        }

        // ── PATCH /profile/:userId ──────────────────────────────────────────────
        if (event.httpMethod === "PATCH" && sub.startsWith("profile/")) {
            const userId = sub.replace("profile/", "");
            const callerUserId = event.headers["x-user-id"] || event.headers["X-User-Id"] || "";

            // Ownership guard: users can only edit their own profile, or they must be admin
            if (callerUserId !== userId) {
                const isAdmin = await runQuery(async (sql) => {
                    const rows = await sql`SELECT role FROM users WHERE id = ${callerUserId} LIMIT 1`;
                    return rows?.length && (rows[0].role === "admin" || rows[0].role === "superAdmin");
                });
                if (!isAdmin) {
                    return json(403, { error: "Forbidden: Cannot edit another user's profile" });
                }
            }

            const fieldMap: Record<string, string> = {
                firstName: "first_name",
                lastName: "last_name",
                approvalStatus: "approval_status",
                lastLogin: "last_login",
                usageLimit: "usage_limit",
                totalTokensUsed: "total_tokens_used",
                usageHistory: "usage_history",
                brandProfile: "brand_profile",
                brandProfiles: "brand_profiles",
                linkedGoogleAds: "linked_google_ads",
                linkedSearchConsole: "linked_search_console"
            };

            for (const field of Object.keys(body)) {
                const dbField = fieldMap[field];
                if (!dbField) {
                    console.warn(`[AUTH] Attempt to update unmapped field: ${field}`);
                    continue; // Skip unmapped fields instead of using them directly
                }
                let valToStore = body[field];
                if (typeof valToStore === 'object' && valToStore !== null) {
                    valToStore = JSON.stringify(valToStore);
                }
                await runQuery(async (sql) => await sql.unsafe(`UPDATE users SET "${dbField}" = $1 WHERE id = $2`, [valToStore, userId]));
            }
            const rows = await runQuery(async (sql) => await sql`SELECT * FROM users WHERE id = ${userId}`);
            if (!rows) return json(503, { error: "DB unavailable" });
            const user = hydrateUser(rows[0]);
            return json(200, { success: true, user });
        }

        // ── POST /brand-profile/:userId ─────────────────────────────────────────
        if (event.httpMethod === "POST" && sub.startsWith("brand-profile/")) {
            const userId = sub.replace("brand-profile/", "");
            await runQuery(async (sql) => await sql`UPDATE users SET "brandProfile" = ${JSON.stringify(body)} WHERE id = ${userId}`);
            return json(200, { success: true });
        }

        // ── POST /track-tokens/:userId ──────────────────────────────────────────
        if (event.httpMethod === "POST" && sub.startsWith("track-tokens/")) {
            const userId = sub.replace("track-tokens/", "");
            const { tokens, task, details } = body;
            const rows = await runQuery(async (sql) => await sql`SELECT total_tokens_used, usage_limit, usage_history, email, first_name, username, bonus_tokens FROM users WHERE id = ${userId}`);
            if (!rows) return json(503, { error: "DB unavailable" });
            if (!rows.length) return json(404, { error: "User not found" });

            const prevTotal = rows[0].total_tokens_used || 0;
            const limit = rows[0].usage_limit || 500;
            let currentBonus = rows[0].bonus_tokens || 0;
            
            // Deduct from bonus tokens first
            let total = prevTotal;
            let tokensToDeductFromPlan = tokens;
            
            if (currentBonus > 0) {
                // If bonus tokens cover everything
                if (currentBonus >= tokensToDeductFromPlan) {
                    currentBonus -= tokensToDeductFromPlan;
                    tokensToDeductFromPlan = 0;
                } else {
                    // Exhaust bonus tokens
                    tokensToDeductFromPlan -= currentBonus;
                    currentBonus = 0;
                }
            }
            // Add remaining tokens to regular token usage
            total += tokensToDeductFromPlan;

            let history: any[] = safeJson(rows[0].usage_history, []) as any[];
            history.push({ id: randomUUID(), timestamp: Date.now(), tokensUsed: tokens, taskName: task, details });
            if (history.length > 100) history = history.slice(-100);

            await runQuery(async (sql) => await sql`
              UPDATE users 
              SET total_tokens_used = ${total}, usage_history = ${JSON.stringify(history)}, bonus_tokens = ${currentBonus}
              WHERE id = ${userId}
            `);

            // Token usage alerts — offloaded to background to prevent latency
            const bgTask = (async () => {
                try {
                    const crossed80 = prevTotal / limit < 0.8 && total / limit >= 0.8;
                    const crossed100 = prevTotal / limit < 1.0 && total / limit >= 1.0;
                    if ((crossed80 || crossed100) && rows[0].email) {
                        const pct = crossed100 ? 100 : 80;
                        await sendEmail(
                            rows[0].email,
                            `⚠️ Has usado el ${pct}% de tus tokens — INsitu AI`,
                            usageAlertEmail(rows[0].first_name || rows[0].username || 'Usuario', pct, total, limit)
                        );
                    }
                } catch (bgErr) {
                    console.error("[AUTH] Background token usage alert tasks failed:", bgErr);
                }
            })();

            if ((event as any).waitUntil) {
                (event as any).waitUntil(bgTask);
            }

            return json(200, { success: true, totalTokensUsed: total });
        }

        // ── PATCH /subscription/:userId ─────────────────────────────────────────
        if (event.httpMethod === "PATCH" && sub.startsWith("subscription/")) {
            const userId = sub.replace("subscription/", "");
            const callerUserId = event.headers["x-user-id"] || event.headers["X-User-Id"] || "";

            // Ownership guard: users can only edit their own subscription
            if (callerUserId !== userId) {
                const isAdmin = await runQuery(async (sql) => {
                    const rows = await sql`SELECT role FROM users WHERE id = ${callerUserId} LIMIT 1`;
                    return rows?.length && (rows[0].role === "admin" || rows[0].role === "superAdmin");
                });
                if (!isAdmin) {
                    return json(403, { error: "Forbidden: Cannot edit another user's subscription" });
                }
            }

            const rows = await runQuery(async (sql) => await sql`SELECT subscription FROM users WHERE id = ${userId}`);
            if (!rows) return json(503, { error: "DB unavailable" });
            if (!rows.length) return json(404, { error: "User not found" });
            const updated = { ...safeJson(rows[0].subscription, {}), ...body };
            await runQuery(async (sql) => await sql`UPDATE users SET subscription = ${JSON.stringify(updated)} WHERE id = ${userId}`);
            return json(200, { success: true, subscription: updated });
        }

        return json(404, { error: "Endpoint not found", sub });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[api-auth] Error:", message);
        return json(500, { error: message });
    }
};

async function processReferralReward(referrerId: string) {
    try {
        const referrerRows = await runQuery(async (sql) => await sql`SELECT subscription, bonus_tokens, total_bonus_earned FROM users WHERE id = ${referrerId}`);
        if (referrerRows && referrerRows.length > 0) {
            const referrer = referrerRows[0];
            const sub = safeJson(referrer.subscription, {});
            if (sub.status === "active" && sub.plan !== "Trial") {
                let reward = 0;
                if (sub.plan === "Starter") reward = 87; // ~5% of 1750
                else if (sub.plan === "Growth") reward = 375; // ~5% of 7500
                else if (sub.plan === "Agency") reward = 2500; // ~5% of 50000

                if (reward > 0) {
                    const newBonus = (referrer.bonus_tokens || 0) + reward;
                    const newTotal = (referrer.total_bonus_earned || 0) + reward;
                    await runQuery(async (sql) => await sql`
                        UPDATE users 
                        SET bonus_tokens = ${newBonus}, total_bonus_earned = ${newTotal} 
                        WHERE id = ${referrerId}
                    `);
                    console.log(`[AUTH] Rewarded ${reward} bonus tokens to referrer ${referrerId}`);
                }
            }
        }
    } catch (e) {
        console.error("[AUTH] Error processing referral reward:", e);
    }
}

export { handler };
