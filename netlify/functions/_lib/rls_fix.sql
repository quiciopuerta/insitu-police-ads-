-- ============================================================
-- RLS FIX — INsitu AI Ads
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Fecha: 2026-03-24
-- ============================================================
-- CONTEXTO:
--   Todas las tablas usan el stack postgres.js + pgBouncer (puerto 6543)
--   desde Netlify Functions. Esas conexiones usan el rol superuser/postgres
--   que IGNORA RLS. Habilitar RLS bloquea solo el acceso directo via
--   PostgREST (anon key / authenticated key desde el cliente).
-- ============================================================

-- ── 1. Habilitar RLS en todas las tablas expuestas ────────────────────────

ALTER TABLE public.users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_history           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_tracks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_signals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_visual_cache       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_technical_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_performance_feedback ENABLE ROW LEVEL SECURITY;

-- ── 2. Sin políticas = bloqueo total vía PostgREST ───────────────────────
-- RLS habilitado sin ninguna POLICY significa que anon y authenticated
-- no pueden leer ni escribir nada. El backend (postgres.js con superuser)
-- sigue funcionando normalmente porque el superuser ignora RLS.

-- ── 3. Políticas explícitas de denegación (defensa en profundidad) ────────
-- Aunque sin políticas ya se bloquea todo, las políticas RESTRICTIVE
-- explícitas evitan que futuros GRANT accidentales abran acceso.

-- users: nunca accesible vía PostgREST (contiene password)
CREATE POLICY IF NOT EXISTS "users_deny_all_postgrest"
    ON public.users AS RESTRICTIVE
    FOR ALL TO anon, authenticated
    USING (false)
    WITH CHECK (false);

-- leads: solo escritura anónima controlada (formulario de contacto público)
-- Se permite INSERT anónimo pero NO lectura
CREATE POLICY IF NOT EXISTS "leads_insert_anon"
    ON public.leads
    FOR INSERT TO anon
    WITH CHECK (true);

-- blog_posts: lectura pública solo de posts publicados
CREATE POLICY IF NOT EXISTS "blog_posts_public_read"
    ON public.blog_posts
    FOR SELECT TO anon, authenticated
    USING (status = 'published');

-- ── 4. Revocar acceso directo de anon a tablas críticas ─────────────────
-- Capa adicional: revoca permisos de tabla para anon (no solo RLS)
REVOKE ALL ON public.users                  FROM anon, authenticated;
REVOKE ALL ON public.settings               FROM anon, authenticated;
REVOKE ALL ON public.api_logs               FROM anon, authenticated;
REVOKE ALL ON public.ai_technical_logs      FROM anon, authenticated;
REVOKE ALL ON public.ai_prompt_rules        FROM anon, authenticated;
REVOKE ALL ON public.ai_performance_feedback FROM anon, authenticated;
REVOKE ALL ON public.ai_feedback            FROM anon, authenticated;
REVOKE ALL ON public.ai_visual_cache        FROM anon, authenticated;
REVOKE ALL ON public.engagement_events      FROM anon, authenticated;
REVOKE ALL ON public.notifications          FROM anon, authenticated;
REVOKE ALL ON public.history                FROM anon, authenticated;
REVOKE ALL ON public.search_reports         FROM anon, authenticated;
REVOKE ALL ON public.seo_history            FROM anon, authenticated;
REVOKE ALL ON public.competitor_tracks      FROM anon, authenticated;
REVOKE ALL ON public.competitor_signals     FROM anon, authenticated;

-- leads: solo INSERT para anon (formulario de contacto)
REVOKE SELECT, UPDATE, DELETE ON public.leads FROM anon, authenticated;

-- blog_posts: solo SELECT para anon (posts publicados via política RLS)
REVOKE INSERT, UPDATE, DELETE ON public.blog_posts FROM anon, authenticated;

-- ── Verificación ─────────────────────────────────────────────────────────
-- Ejecuta esto después para confirmar que RLS está activo:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
