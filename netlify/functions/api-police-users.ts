import type { Handler, HandlerEvent } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError } from "./_lib/errorHandler";
import { runMigrations } from "./_lib/migrations";
import { scryptSync, randomBytes } from "node:crypto";
import { sendEmail, invitationEmail } from "./_lib/mailService";

function hashPassword(plain: string): string {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(plain, salt, 64).toString("hex");
    return `scrypt:${salt}:${hash}`;
}

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Content-Type": "application/json",
};

const json = (status: number, body: unknown) => ({
    statusCode: status,
    headers: CORS,
    body: JSON.stringify(body),
});

let migrationsRan = false;

export const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

    if (!migrationsRan) {
        await runMigrations().catch(err => console.error("[POLICE-USERS] Migrations failed:", err));
        migrationsRan = true;
    }

    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const callerUserId = event.headers['x-user-id'] || event.headers['X-User-Id'] || authHeader.replace('Bearer ', '') || '';
    if (!callerUserId) return json(401, { error: "Unauthorized" });

    try {
        // Resolve extension session token or direct user ID to user.id
        let userId = callerUserId;
        const userResult = await runQuery(sql => sql`
            SELECT id, role FROM users 
            WHERE id = ${callerUserId} 
               OR extension_session_token = ${callerUserId}
        `);
        
        if (userResult && userResult.length > 0) {
            userId = userResult[0].id;
        } else {
            return json(401, { error: "Unauthorized: Invalid user identity or token" });
        }

        // Find user's organization first
        let orgId: string | null = null;
        const userOrgResult = await runQuery(sql => sql`SELECT organization_id FROM users WHERE id = ${userId}`);
        if (userOrgResult && userOrgResult.length > 0 && userOrgResult[0].organization_id) {
            orgId = userOrgResult[0].organization_id;
        } else {
            // Find organization where user is owner
            let orgs = await runQuery(sql => 
                sql`SELECT id FROM police_organizations WHERE owner_id = ${userId} AND is_deleted = false`
            );
            if (!orgs || orgs.length === 0) {
                // Auto-create default organization
                const timestamp = Date.now();
                const newOrgId = `org_${timestamp}_${Math.random().toString(36).substring(2, 9)}`;
                await runQuery(sql => sql`
                    INSERT INTO police_organizations (id, name, owner_id, created_at, updated_at)
                    VALUES (${newOrgId}, 'Default Organization', ${userId}, ${timestamp}, ${timestamp})
                `);
                // Also set the owner's organization_id in users table to link it
                await runQuery(sql => sql`UPDATE users SET organization_id = ${newOrgId} WHERE id = ${userId}`);
                orgId = newOrgId;
            } else {
                orgId = orgs[0].id;
                // Also make sure owner has organization_id set
                await runQuery(sql => sql`UPDATE users SET organization_id = ${orgId} WHERE id = ${userId} AND organization_id IS NULL`);
            }
        }

        // Check if the user is owner of the organization (to perform admin actions like POST or DELETE)
        const isOwnerResult = await runQuery(sql => sql`SELECT id FROM police_organizations WHERE id = ${orgId} AND owner_id = ${userId}`);
        const isOwner = (isOwnerResult && isOwnerResult.length > 0) || userResult[0].role === 'admin' || userResult[0].role === 'superAdmin';

        // Parse JSON body helper (handles base64 encoding from Netlify)
        const parseBody = () => {
            if (!event.body) return {};
            try {
                const decoded = event.isBase64Encoded 
                    ? Buffer.from(event.body, 'base64').toString('utf8')
                    : event.body;
                return JSON.parse(decoded || "{}");
            } catch (e) {
                console.error("JSON parse error:", e);
                return {};
            }
        };

        // Invite or create user in the organization (POST)
        if (event.httpMethod === "POST") {
            if (!isOwner) {
                return json(403, { error: "Forbidden: Solo el dueño de la organización puede invitar colaboradores." });
            }

            const body = parseBody();
            const { email, role, username } = body;

            if (!email) {
                return json(400, { error: "Email is required" });
            }

            // Check if user already exists
            const existing = await runQuery(sql => sql`SELECT id, organization_id, is_deleted FROM users WHERE email = ${email}`);
            if (existing && existing.length > 0) {
                const existUser = existing[0];
                if (existUser.is_deleted) {
                    // Reactivate deleted user
                    await runQuery(sql => sql`
                        UPDATE users 
                        SET is_deleted = false, deleted_at = null, organization_id = ${orgId}, role = ${role || 'mediaPlanner'}, approval_status = 'approved'
                        WHERE id = ${existUser.id}
                    `);
                    return json(200, { success: true, message: "Usuario reactivado y agregado a la organización.", userId: existUser.id });
                }
                
                if (existUser.organization_id && existUser.organization_id !== orgId) {
                    return json(400, { error: "Este usuario ya pertenece a otra organización." });
                }

                // If exists but no organization, associate them
                await runQuery(sql => sql`
                    UPDATE users 
                    SET organization_id = ${orgId}, role = ${role || 'mediaPlanner'}, approval_status = 'approved'
                    WHERE id = ${existUser.id}
                `);
                return json(200, { success: true, message: "Usuario existente agregado a la organización.", userId: existUser.id });
            }

            // If user does not exist, create them
            const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const tempPasswordPlain = "Insitu" + Math.floor(1000 + Math.random() * 9000);
            const tempPassword = hashPassword(tempPasswordPlain);
            const subscription = JSON.stringify({ status: "active", plan: "Starter", price: 0, expiryDate: 0 });

            await runQuery(sql => sql`
                INSERT INTO users (id, username, password, email, role, approval_status, picture, last_login, subscription, usage_limit, brand_profiles, organization_id)
                VALUES (
                  ${newUserId},
                  ${username || email.split("@")[0]},
                  ${tempPassword},
                  ${email},
                  ${role || "mediaPlanner"},
                  'approved',
                  ${"https://ui-avatars.com/api/?name=" + email[0].toUpperCase() + "&background=4f6bff&color=fff"},
                  0,
                  ${subscription},
                  500,
                  '[]',
                  ${orgId}
                )
            `);

            // Send SMTP Invitation Email
            try {
                await sendEmail(
                    email, 
                    '🎉 Has sido invitado a la Gobernanza de Anuncios de INsitu AI', 
                    invitationEmail(username || email.split('@')[0], email, tempPasswordPlain, 'Starter')
                );
            } catch (mailErr) {
                console.error("Failed to send invitation email:", mailErr);
            }

            return json(201, { success: true, userId: newUserId, tempPassword: tempPasswordPlain });
        }

        // Disassociate user from organization (DELETE)
        if (event.httpMethod === "DELETE") {
            if (!isOwner) {
                return json(403, { error: "Forbidden: Solo el dueño de la organización puede remover colaboradores." });
            }

            const targetUserId = event.queryStringParameters?.id;
            if (!targetUserId) {
                return json(400, { error: "User ID is required" });
            }

            if (targetUserId === userId) {
                return json(400, { error: "No puedes removerte a ti mismo de la organización." });
            }

            // Simply disassociate the user from the organization
            await runQuery(sql => sql`
                UPDATE users 
                SET organization_id = null 
                WHERE id = ${targetUserId} AND organization_id = ${orgId}
            `);

            return json(200, { success: true });
        }

        // Fetch users of the organization (GET)
        const dbUsers = await runQuery(sql => sql`
            SELECT 
                id, username, email, role, approval_status, "firstName", "lastName"
            FROM users
            WHERE organization_id = ${orgId} AND (is_deleted IS NULL OR is_deleted = false)
            ORDER BY username ASC
        `);

        const formatted = (dbUsers || []).map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role || 'mediaPlanner',
            approvalStatus: u.approval_status || 'approved',
            firstName: u.firstName || '',
            lastName: u.lastName || ''
        }));

        return json(200, formatted);
    } catch (err: unknown) {
        return json(500, { error: safeError(err, process.env.NODE_ENV === "development") });
    }
};
