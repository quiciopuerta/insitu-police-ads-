import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { runQuery } from "./_lib/db";
import { safeError, logError } from "./_lib/errorHandler";

const DB_URL =
    process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || "";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Content-Type": "application/json",
};

const handler: Handler = async (
    event: HandlerEvent,
    _ctx: HandlerContext
) => {
    // ── CORS preflight ──────────────────────────────────────────────
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: CORS, body: "" };
    }

    // DB initialization is handled by runQuery

    // Auth: ADMIN_SECRET (scripts) OR admin userId (frontend)
    const authHeader = event.headers["authorization"] || event.headers["Authorization"] || event.headers["x-admin-key"] || "";
    const xUserId = event.headers["x-user-id"] || event.headers["X-User-Id"] || "";

    // GET requests are PUBLIC to allow SEO pre-rendering and blog reading
    // Write/Delete methods still require ADMIN_SECRET or Admin role
    const isGet = event.httpMethod === "GET";
    let isAuthorized = isGet || (ADMIN_SECRET !== "" && authHeader === `Bearer ${ADMIN_SECRET}`);

    if (!isAuthorized && xUserId) {
        const roleRows = await runQuery(async (sql) => await sql`SELECT role, username FROM users WHERE id = ${xUserId} LIMIT 1`).catch(() => null);
        if (roleRows && roleRows.length > 0) {
            // Solo SuperAdmins o desarrolladores con ADMIN_SECRET pueden ver eliminados o realizar borrados
            isAuthorized = roleRows[0].role === "admin" || roleRows[0].role === "superAdmin";
            if (!isAuthorized) console.warn(`[ADMIN] User ${roleRows[0].username} attempted admin access to blog with role: ${roleRows[0].role}`);
        }
    }
    
    // Verificación adicional de privilegios para borrado
    const isSuperPrivileged = (ADMIN_SECRET !== "" && authHeader === `Bearer ${ADMIN_SECRET}`) || 
                             (await runQuery(async (sql) => {
                                 const r = await sql`SELECT role FROM users WHERE id = ${xUserId} LIMIT 1`;
                                 return r?.[0]?.role === "superAdmin";
                             }).catch(() => false));
    if (!isAuthorized) {
        console.warn(`[ADMIN] 401 Unauthorized for path ${event.path}. UserUID: ${xUserId || 'Missing'}`);
        return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: "Unauthorized" }) };
    }

    // Extract potential ID from path (e.g., /api/admin/blog/123)
    const pathSegments = event.path.split("/");
    const blogId = pathSegments[pathSegments.length - 1] !== "blog" && pathSegments[pathSegments.length - 1] !== "toggle"
        ? pathSegments[pathSegments.length - 1]
        : null;

    const isToggle = event.path.endsWith("/toggle");
    const toggleId = isToggle ? pathSegments[pathSegments.length - 2] : null;

    try {
        await runQuery(async (sql) => {
            await sql`
                CREATE TABLE IF NOT EXISTS blog_posts (
                    id TEXT PRIMARY KEY,
                    data JSONB NOT NULL,
                    is_deleted BOOLEAN DEFAULT FALSE,
                    deleted_at BIGINT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `;
            // Ensure data column exists if table was created with old schema
            await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS data JSONB`;
            await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`;
            await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS deleted_at BIGINT`;
            await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`;
        });

        // ── GET: All posts or Single post ─────────────────────────────
        if (event.httpMethod === "GET") {
            // If blogId is provided, fetch a single post by ID or Slug
            if (blogId) {
                const rows = await runQuery(async (sql) => {
                    return await sql`SELECT data FROM blog_posts WHERE (id = ${blogId} OR data->>'slug' = ${blogId}) AND is_deleted = false LIMIT 1`;
                });

                if (rows === null) {
                    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: "Database temporarily offline" }) };
                }

                if (!rows || rows.length === 0) {
                    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "Post not found" }) };
                }

                const post = rows[0].data;

                // Security: Only return published posts for public access
                const isAdminRequest = (ADMIN_SECRET !== "" && authHeader === `Bearer ${ADMIN_SECRET}`) || xUserId !== "";
                if (post.status !== "published" && !isAdminRequest) {
                    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: "Access denied" }) };
                }

                return { statusCode: 200, headers: CORS, body: JSON.stringify(post) };
            }

            // Otherwise, fetch all posts
            const rows = await runQuery(async (sql) => await sql`SELECT data FROM blog_posts WHERE is_deleted = false ORDER BY created_at DESC`);
            if (rows === null) return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: "Database offline" }) };
            
            // Public requests only see published posts
            const isAdminRequest = (ADMIN_SECRET !== "" && authHeader === `Bearer ${ADMIN_SECRET}`) || xUserId !== "";
            const posts = rows
                .map((r: any) => r.data)
                .filter((p: any) => isAdminRequest || p.status === "published");

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify(posts),
            };
        }

        // ── POST: Save a post ────────────────────────────────────────
        if (event.httpMethod === "POST") {
            const body = event.body ?? "{}";
            const post = JSON.parse(body);

            if (!post.id) {
                return {
                    statusCode: 400,
                    headers: CORS,
                    body: JSON.stringify({ error: "Missing post ID" }),
                };
            }

            // Client-side generated slug for new posts if missing
            const slug = post.slug || (post.title ? post.title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : "");

            // Server-side duplicate check (by slug)
            const slugConflict = await runQuery(async (sql) => {
                const rows = await sql`SELECT id FROM blog_posts WHERE data->>'slug' = ${slug} AND id != ${post.id} LIMIT 1`;
                return rows.length > 0;
            });

            if (slugConflict) {
                console.warn(`[BLOG] Post import/save aborted due to slug conflict: ${slug}`);
                return {
                    statusCode: 409, // Conflict
                    headers: CORS,
                    body: JSON.stringify({ error: "A post with this slug already exists" }),
                };
            }

            const dataStr = JSON.stringify(post);

            await runQuery(async (sql) => {
                await sql`
                    INSERT INTO blog_posts (id, data, is_deleted, deleted_at) 
                    VALUES (${post.id}, ${dataStr}::jsonb, false, null)
                    ON CONFLICT (id) DO UPDATE SET 
                        data = EXCLUDED.data,
                        is_deleted = false,
                        deleted_at = null
                `;
            });

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify(post),
            };
        }

        // ── DELETE: Delete a post (Soft Delete) ──────────────────────
        if (event.httpMethod === "DELETE" && blogId) {
            if (!isSuperPrivileged) {
                return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: "Solo un SuperAdmin o Desarrollador puede borrar posts." }) };
            }
            await runQuery(async (sql) => await sql`UPDATE blog_posts SET is_deleted = true, deleted_at = ${Date.now()} WHERE id = ${blogId}`);
            
            // Log entry for audit
            await runQuery(async (sql) => await sql`
                INSERT INTO ai_technical_logs (feature, error_message, severity, user_id, request_context)
                VALUES ('blog_management', 'Authorized Soft Delete of post ID: ' || ${blogId}, 'info', ${xUserId || 'system'}, ${JSON.stringify({ blogId })})
            `);

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify({ success: true, message: "Post ocultado correctamente (Soft Delete)" }),
            };
        }

        // ── PATCH: Toggle status ─────────────────────────────────────
        if (event.httpMethod === "PATCH" && isToggle && toggleId) {
            const res = await runQuery(async (sql) => {
                const rows = await sql`SELECT data FROM blog_posts WHERE id = ${toggleId}`;
                if (!rows.length) return { error: "not_found" };

                const post = rows[0].data;
                post.status = post.status === 'published' ? 'draft' : 'published';
                if (post.status === 'published' && (!post.publishedAt || post.publishedAt === 0)) {
                    post.publishedAt = Date.now();
                }
                post.updatedAt = Date.now();

                const dataStr = JSON.stringify(post);
                await sql`UPDATE blog_posts SET data = ${dataStr}::jsonb WHERE id = ${toggleId}`;
                return post;
            });

            if (!res) return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: "Database offline" }) };
            if (res.error === "not_found") return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "Post not found" }) };

            return {
                statusCode: 200,
                headers: CORS,
                body: JSON.stringify(res),
            };
        }

        return {
            statusCode: 405,
            headers: CORS,
            body: JSON.stringify({ error: "Method not allowed" }),
        };
    } catch (err: unknown) {
        const isDev = process.env.NODE_ENV === 'development';
        console.error("[api-admin-blog] Error:", err instanceof Error ? err.message : String(err));
        return {
            statusCode: 500,
            headers: CORS,
            body: JSON.stringify({ error: safeError(err, isDev) }),
        };
    }
};

export { handler };
