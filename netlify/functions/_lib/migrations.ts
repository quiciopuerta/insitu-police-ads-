/**
 * migrations.ts — Schema centralizado para Supabase
 * Ejecutado al inicio de cada Netlify Function (idempotente).
 * Todas las tablas se definen aquí para evitar drift de esquema.
 */
import { runQuery } from "./db";

let migrated = false;

export async function runMigrations(): Promise<void> {
    if (migrated) return;

    await runQuery(async (sql) => {
        // ── Extensions ──────────────────────────────────────────────────────────
        // Required for uuid_generate_v4() and other advanced features
        await sql.unsafe('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"').catch(e => console.warn("[DB] uuid-ossp extension could not be enabled:", e.message));
        await sql.unsafe('CREATE EXTENSION IF NOT EXISTS "pgcrypto"').catch(e => console.warn("[DB] pgcrypto extension could not be enabled:", e.message));

        // ── users ──────────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                email TEXT UNIQUE,
                "firstName" TEXT,
                "lastName" TEXT,
                phone TEXT,
                role TEXT,
                "approvalStatus" TEXT,
                picture TEXT,
                "lastLogin" BIGINT,
                subscription TEXT,
                "totalTokensUsed" INTEGER DEFAULT 0,
                "usageLimit" INTEGER DEFAULT 10000,
                "usageHistory" TEXT,
                "brandProfile" TEXT,
                "brandProfiles" TEXT DEFAULT '[]',
                "freeTrialsUsed" INTEGER DEFAULT 0,
                "recoveryCode" TEXT,
                "recoveryCodeExpiry" BIGINT,
                "linkedGoogleAds" TEXT,
                "linkedSearchConsole" TEXT,
                "savedVoices" TEXT DEFAULT '[]'
            )
        `;
        // Idempotent column additions for existing tables
        const userCols = [
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS "brandProfiles" TEXT DEFAULT '[]'`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS "recoveryCode" TEXT`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS "recoveryCodeExpiry" BIGINT`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS "linkedGoogleAds" TEXT`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS "linkedSearchConsole" TEXT`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS "savedVoices" TEXT DEFAULT '[]'`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS "freeTrialsUsed" INTEGER DEFAULT 0`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN DEFAULT false`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS "deleted_at" BIGINT`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS "extension_session_token" TEXT`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS "extension_token_expires" TIMESTAMP WITH TIME ZONE`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS "organization_id" TEXT`,
        ];
        for (const col of userCols) {
            await sql.unsafe(col).catch(() => {});
        }

        // ── settings ───────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT
            )
        `;

        // ── blog_posts ─────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS blog_posts (
                id TEXT PRIMARY KEY,
                title TEXT,
                slug TEXT UNIQUE,
                content TEXT,
                excerpt TEXT,
                "authorId" TEXT,
                "authorName" TEXT,
                "authorPicture" TEXT,
                "publishedAt" BIGINT,
                "updatedAt" BIGINT,
                status TEXT DEFAULT 'draft',
                category TEXT,
                tags TEXT,
                "featuredImage" TEXT,
                "metaTitle" TEXT,
                "metaDescription" TEXT,
                keywords TEXT,
                "readingTime" TEXT,
                "is_deleted" BOOLEAN DEFAULT false,
                "deleted_at" BIGINT
            )
        `;

        // Idempotent column additions for blog_posts
        const blogCols = [
            `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN DEFAULT false`,
            `ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS "deleted_at" BIGINT`,
        ];
        for (const col of blogCols) {
            await sql.unsafe(col).catch(() => {});
        }

        // ── notifications ──────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                read BOOLEAN DEFAULT FALSE,
                created_at BIGINT NOT NULL,
                cta_url TEXT,
                image_url TEXT,
                video_url TEXT,
                "is_deleted" BOOLEAN DEFAULT false,
                "deleted_at" BIGINT
            )
        `;
        // Idempotent column additions for notifications
        const notifCols = [
            `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN DEFAULT false`,
            `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "deleted_at" BIGINT`,
        ];
        for (const col of notifCols) {
            await sql.unsafe(col).catch(() => {});
        }
        await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)`.catch(() => {});

        // ── engagement_events ──────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS engagement_events (
                id TEXT PRIMARY KEY,
                notification_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                timestamp BIGINT NOT NULL,
                metadata JSONB,
                "is_deleted" BOOLEAN DEFAULT false,
                "deleted_at" BIGINT
            )
        `;
        // Idempotent column additions for engagement_events
        const engagementCols = [
            `ALTER TABLE engagement_events ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN DEFAULT false`,
            `ALTER TABLE engagement_events ADD COLUMN IF NOT EXISTS "deleted_at" BIGINT`,
        ];
        for (const col of engagementCols) {
            await sql.unsafe(col).catch(() => {});
        }
        await sql`CREATE INDEX IF NOT EXISTS idx_engagement_user_id ON engagement_events (user_id)`.catch(() => {});

        // ── seo_history ────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS seo_history (
                id SERIAL PRIMARY KEY,
                domain TEXT NOT NULL,
                result TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_seo_history_domain ON seo_history (domain)`.catch(() => {});

        // ── ai_visual_cache ────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS ai_visual_cache (
                id SERIAL PRIMARY KEY,
                hash VARCHAR(255) UNIQUE NOT NULL,
                result JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;
        // ── pagespeed_cache ───────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS pagespeed_cache (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                url TEXT NOT NULL,
                strategy TEXT NOT NULL,
                data JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_pagespeed_url_strategy ON pagespeed_cache(url, strategy)`.catch(() => {});

        // ── competitor_tracks ──────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS competitor_tracks (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                brand_name TEXT NOT NULL,
                search_query TEXT NOT NULL,
                networks TEXT[] DEFAULT '{search,tech,seo}',
                country TEXT DEFAULT 'ALL',
                is_active BOOLEAN DEFAULT true,
                notify_email BOOLEAN DEFAULT true,
                notify_inapp BOOLEAN DEFAULT true,
                created_at BIGINT,
                last_checked_at BIGINT,
                total_signals_found INTEGER DEFAULT 0,
                "is_deleted" BOOLEAN DEFAULT false,
                "deleted_at" BIGINT,
                UNIQUE(user_id, brand_name)
            )
        `;
        // Idempotent column additions for competitor_tracks
        const trackCols = [
            `ALTER TABLE competitor_tracks ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN DEFAULT false`,
            `ALTER TABLE competitor_tracks ADD COLUMN IF NOT EXISTS "deleted_at" BIGINT`,
        ];
        for (const col of trackCols) {
            await sql.unsafe(col).catch(() => {});
        }
        await sql`CREATE INDEX IF NOT EXISTS idx_competitor_tracks_user ON competitor_tracks (user_id)`.catch(() => {});

        // ── competitor_signals ─────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS competitor_signals (
                id TEXT PRIMARY KEY,
                track_id TEXT NOT NULL REFERENCES competitor_tracks(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                source TEXT,
                title TEXT,
                description TEXT,
                url TEXT,
                relevance_score INTEGER DEFAULT 0,
                detected_at BIGINT,
                is_new BOOLEAN DEFAULT true,
                raw_data JSONB,
                "is_deleted" BOOLEAN DEFAULT false,
                "deleted_at" BIGINT,
                UNIQUE(track_id, url, type)
            )
        `;
        // Idempotent column additions for competitor_signals
        const signalCols = [
            `ALTER TABLE competitor_signals ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN DEFAULT false`,
            `ALTER TABLE competitor_signals ADD COLUMN IF NOT EXISTS "deleted_at" BIGINT`,
        ];
        for (const col of signalCols) {
            await sql.unsafe(col).catch(() => {});
        }
        await sql`CREATE INDEX IF NOT EXISTS idx_competitor_signals_track ON competitor_signals (track_id)`.catch(() => {});

        // ── ai_feedback ────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS ai_feedback (
                id SERIAL PRIMARY KEY,
                user_id TEXT NOT NULL,
                feature VARCHAR(50) NOT NULL,
                prompt_context TEXT,
                ai_response JSONB,
                feedback_type VARCHAR(20) NOT NULL,
                feedback_reason VARCHAR(100),
                rating INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // ── ai_prompt_rules ────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS ai_prompt_rules (
                id SERIAL PRIMARY KEY,
                rule_type VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                feature VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_ai_prompt_rules_feature ON ai_prompt_rules (feature)`.catch(() => {});

        // ── market_trends ──────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS market_trends (
                id SERIAL PRIMARY KEY,
                month_key VARCHAR(10) UNIQUE,
                findings JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // ── ai_technical_logs ──────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS ai_technical_logs (
                id SERIAL PRIMARY KEY,
                feature VARCHAR(50) NOT NULL,
                error_message TEXT NOT NULL,
                stack_trace TEXT,
                request_context JSONB,
                severity VARCHAR(20) DEFAULT 'error',
                user_id VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // ── ai_performance_feedback ────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS ai_performance_feedback (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                feature VARCHAR(100) NOT NULL,
                context JSONB,
                improved_metric VARCHAR(50),
                success_story TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // ── leads ──────────────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS leads (
                id TEXT PRIMARY KEY,
                role TEXT,
                budget TEXT,
                goals TEXT,
                email TEXT,
                name TEXT,
                website TEXT,
                notes TEXT,
                "createdAt" BIGINT,
                status TEXT,
                "is_deleted" BOOLEAN DEFAULT false,
                "deleted_at" BIGINT
            )
        `;
        const leadCols = [
            `ALTER TABLE leads ADD COLUMN IF NOT EXISTS website TEXT`,
            `ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT`,
            `ALTER TABLE leads ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN DEFAULT false`,
            `ALTER TABLE leads ADD COLUMN IF NOT EXISTS "deleted_at" BIGINT`,
        ];
        for (const col of leadCols) {
            await sql.unsafe(col).catch(() => {});
        }

        // ── history (Audits & Tasks) ───────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                type TEXT NOT NULL,
                query JSONB NOT NULL,
                result JSONB NOT NULL,
                timestamp BIGINT NOT NULL,
                is_deleted BOOLEAN DEFAULT false,
                deleted_at BIGINT
            )
        `;
        // Idempotent column additions for history
        const historyCols = [
            `ALTER TABLE history ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`,
            `ALTER TABLE history ADD COLUMN IF NOT EXISTS deleted_at BIGINT`,
        ];
        for (const col of historyCols) {
            await sql.unsafe(col).catch(() => {});
        }
        await sql`CREATE INDEX IF NOT EXISTS idx_history_user_id ON history (user_id)`.catch(() => {});
        await sql`CREATE INDEX IF NOT EXISTS idx_history_type ON history (type)`.catch(() => {});
        await sql`CREATE INDEX IF NOT EXISTS idx_history_user_timestamp ON history (user_id, timestamp DESC)`.catch(() => {});

        // ── processed_webhook_events (idempotency for PayPal) ─────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS processed_webhook_events (
                event_id TEXT PRIMARY KEY,
                event_type TEXT,
                processed_at BIGINT NOT NULL
            )
        `.catch(() => {});

        // ── platform_updates (WOW Notifications) ───────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS platform_updates (
                id TEXT PRIMARY KEY,
                version TEXT NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('major','feature','fix','ai-upgrade')),
                title_es TEXT NOT NULL,
                title_en TEXT NOT NULL,
                description_es TEXT NOT NULL,
                description_en TEXT NOT NULL,
                preview_url TEXT,
                feature_tab TEXT,
                cta_url TEXT,
                email_subject_active TEXT,
                email_subject_trial TEXT,
                email_subject_expired TEXT,
                email_subject_free TEXT,
                published_at BIGINT NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_by TEXT NOT NULL,
                emails_sent INTEGER DEFAULT 0,
                emails_opened INTEGER DEFAULT 0
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_platform_updates_active ON platform_updates (is_active, published_at)`.catch(() => {});
        await sql`ALTER TABLE platform_updates ADD COLUMN IF NOT EXISTS reads_count INTEGER DEFAULT 0`.catch(() => {});

        // ── platform_update_reads (one-shot tracking) ──────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS platform_update_reads (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                update_id TEXT NOT NULL,
                read_at BIGINT NOT NULL,
                source TEXT NOT NULL,
                UNIQUE(user_id, update_id)
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_pur_user ON platform_update_reads (user_id)`.catch(() => {});

        // ── user_tools (RBAC for Subdomains) ──────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS user_tools (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                tool_name TEXT NOT NULL,
                granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, tool_name)
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_user_tools_user_id ON user_tools (user_id)`.catch(() => {});

        // ── user_scripts (Ads Optimizer Scripts) ───────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS user_scripts (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                customer_id TEXT,
                brief TEXT,
                script_content TEXT NOT NULL,
                instructions TEXT,
                created_at BIGINT NOT NULL,
                is_deleted BOOLEAN DEFAULT false,
                deleted_at BIGINT
            )
        `;
        await sql`CREATE INDEX IF NOT EXISTS idx_user_scripts_user_id ON user_scripts (user_id)`.catch(() => {});

        // ── police_organizations ───────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS police_organizations (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                is_deleted BOOLEAN DEFAULT false,
                deleted_at BIGINT
            )
        `;

        // ── police_policies ────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS police_policies (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL REFERENCES police_organizations(id) ON DELETE CASCADE,
                campaign_rules JSONB DEFAULT '[]',
                adset_rules JSONB DEFAULT '[]',
                ad_rules JSONB DEFAULT '[]',
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                UNIQUE(organization_id)
            )
        `;

        // ── police_clients ─────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS police_clients (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL REFERENCES police_organizations(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                email TEXT,
                contact_person TEXT,
                industry TEXT,
                country TEXT,
                monthly_budget NUMERIC(12,2),
                status TEXT DEFAULT 'active',
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                is_deleted BOOLEAN DEFAULT false,
                deleted_at BIGINT
            )
        `;
        await sql.unsafe(`ALTER TABLE police_clients ADD COLUMN IF NOT EXISTS brand_profile_id TEXT`).catch(() => {});

        // ── police_integrations ────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS police_integrations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                organization_id TEXT NOT NULL REFERENCES police_organizations(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                sync_method TEXT DEFAULT 'scraping',
                status TEXT DEFAULT 'pending',
                access_token TEXT,
                refresh_token TEXT,
                expires_at BIGINT,
                account_id TEXT,
                account_name TEXT,
                last_synced_at BIGINT,
                next_sync_at BIGINT,
                sync_status TEXT DEFAULT 'idle',
                last_error TEXT,
                webhook_token TEXT UNIQUE,
                webhook_url TEXT,
                metadata JSONB,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                disconnected_at BIGINT,
                is_deleted BOOLEAN DEFAULT false,
                deleted_at BIGINT
            )
        `;

        // ── police_platform_accounts ───────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS police_platform_accounts (
                id TEXT PRIMARY KEY,
                client_id TEXT NOT NULL REFERENCES police_clients(id) ON DELETE CASCADE,
                organization_id TEXT NOT NULL REFERENCES police_organizations(id) ON DELETE CASCADE,
                platform TEXT NOT NULL,
                account_id TEXT NOT NULL,
                account_name TEXT,
                integration_id TEXT REFERENCES police_integrations(id) ON DELETE SET NULL,
                status TEXT DEFAULT 'active',
                last_synced_at BIGINT,
                sync_status TEXT DEFAULT 'idle',
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                is_deleted BOOLEAN DEFAULT false,
                deleted_at BIGINT
            )
        `;

        // ── police_campaigns ───────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS police_campaigns (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                organization_id TEXT NOT NULL REFERENCES police_organizations(id) ON DELETE CASCADE,
                client_id TEXT NOT NULL REFERENCES police_clients(id) ON DELETE CASCADE,
                platform_account_id TEXT NOT NULL REFERENCES police_platform_accounts(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                platform TEXT NOT NULL,
                budget NUMERIC(12,2) NOT NULL,
                max_budget_allowed NUMERIC(12,2) NOT NULL,
                status TEXT DEFAULT 'draft',
                nomenclature_valid BOOLEAN DEFAULT false,
                nomenclature_errors JSONB DEFAULT '[]',
                budget_valid BOOLEAN DEFAULT true,
                budget_exceeded_by NUMERIC(5,2) DEFAULT 0.0,
                country TEXT,
                channel TEXT,
                objective TEXT,
                product TEXT,
                year TEXT,
                synced_with_extension BOOLEAN DEFAULT false,
                last_synced_at BIGINT,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                is_deleted BOOLEAN DEFAULT false,
                deleted_at BIGINT
            )
        `;

        // ── police_alerts ──────────────────────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS police_alerts (
                id TEXT PRIMARY KEY,
                campaign_id TEXT NOT NULL REFERENCES police_campaigns(id) ON DELETE CASCADE,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                organization_id TEXT NOT NULL REFERENCES police_organizations(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                severity TEXT NOT NULL,
                message TEXT NOT NULL,
                budget NUMERIC(12,2),
                max_allowed NUMERIC(12,2),
                exceeded_by NUMERIC(5,2),
                is_resolved BOOLEAN DEFAULT false,
                resolved_at BIGINT,
                resolved_by TEXT,
                created_at BIGINT NOT NULL,
                updated_at BIGINT NOT NULL,
                is_deleted BOOLEAN DEFAULT false,
                deleted_at BIGINT
            )
        `;

        // ── police_extension_activities ───────────────────────────────────────
        await sql`
            CREATE TABLE IF NOT EXISTS police_extension_activities (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                client_id TEXT REFERENCES police_clients(id) ON DELETE SET NULL,
                brand TEXT,
                activity_type TEXT NOT NULL,
                platform TEXT NOT NULL,
                campaign_name TEXT NOT NULL,
                budget NUMERIC(12,2),
                max_budget_allowed NUMERIC(12,2),
                status TEXT,
                utm_url TEXT,
                campaign_id TEXT,
                adset_id TEXT,
                ad_id TEXT,
                created_at BIGINT NOT NULL,
                is_deleted BOOLEAN DEFAULT false,
                deleted_at BIGINT
            )
        `;

        // ── RLS — Row Level Security (idempotent) ──────────────────────────────
        // postgres.js via pgBouncer uses the superuser role which bypasses RLS.
        // Enabling RLS only blocks PostgREST (anon/authenticated keys from the client).
        const rlsTables = [
            'users', 'history', 'leads', 'settings', 'notifications', 'blog_posts',
            'api_logs', 'search_reports', 'seo_history', 'competitor_tracks',
            'competitor_signals', 'engagement_events', 'ai_visual_cache', 'ai_feedback',
            'ai_prompt_rules', 'ai_technical_logs', 'ai_performance_feedback',
            'platform_updates', 'platform_update_reads', 'user_scripts',
            'police_organizations', 'police_policies', 'police_clients', 'police_integrations',
            'police_platform_accounts', 'police_campaigns', 'police_alerts', 'police_extension_activities'
        ];
        for (const table of rlsTables) {
            await sql.unsafe(`ALTER TABLE IF EXISTS ${table} ENABLE ROW LEVEL SECURITY`).catch(() => {});
        }

        // Explicit deny on users (contains password column)
        await sql.unsafe(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='users_deny_all_postgrest') THEN
                    CREATE POLICY "users_deny_all_postgrest" ON public.users AS RESTRICTIVE
                    FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
                END IF;
            END $$
        `).catch(() => {});

        // leads: allow anon INSERT (contact form), deny SELECT/UPDATE/DELETE
        await sql.unsafe(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='leads' AND policyname='leads_insert_anon') THEN
                    CREATE POLICY "leads_insert_anon" ON public.leads
                    FOR INSERT TO anon WITH CHECK (true);
                END IF;
            END $$
        `).catch(() => {});

        // blog_posts: public read of published posts only
        await sql.unsafe(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='blog_posts' AND policyname='blog_posts_public_read') THEN
                    CREATE POLICY "blog_posts_public_read" ON public.blog_posts
                    FOR SELECT TO anon, authenticated USING (status = 'published');
                END IF;
            END $$
        `).catch(() => {});

        // ── Performance Fixes (Indexes on Foreign Keys) ────────────────────────
        // Added to resolve Supabase linter warnings about unindexed foreign keys
        const perfIndexes = [
            `CREATE INDEX IF NOT EXISTS idx_audience_segments_cp_id ON public.audience_segments(client_profile_id)`,
            `CREATE INDEX IF NOT EXISTS idx_cdp_profiles_user_id ON public.cdp_profiles(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_client_user_roles_user_id ON public.client_user_roles(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_voiceovers_user_id ON public.voiceovers(user_id)`
        ];
        
        for (const idx of perfIndexes) {
            await sql.unsafe(idx).catch((e) => {
                // Ignore errors if table doesn't exist locally/remotely yet
                console.warn(`[DB] Could not create perf index:`, e.message);
            });
        }
    });

    migrated = true;
    console.log("[DB] ✅ Migrations complete (Supabase)");
}
