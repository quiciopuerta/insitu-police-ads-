-- ============================================================
-- RLS PERFORMANCE FIX — INsitu AI Ads
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Contexto: Reemplaza auth.uid() con (select auth.uid()) para evitar InitPlan scans
-- ============================================================

-- Nota: Como no tenemos el texto exacto de las policies actuales,
-- este script es una plantilla instruccional para el Supabase Dashboard.

-- 1. Ve a Supabase Dashboard -> Authentication -> Policies
-- 2. Busca cada política que contenga `auth.uid()`
-- 3. Reemplaza `auth.uid()` por `(select auth.uid())`

-- Ejemplo de cómo reescribir una política mediante SQL:

-- ALTER POLICY "Users can view their own voiceovers" ON public.voiceovers
-- USING (user_id = (select auth.uid()));

-- ALTER POLICY "ai_feedback_owner" ON public.ai_feedback
-- USING (user_id = (select auth.uid()));

-- ALTER POLICY "competitor_signals_owner" ON public.competitor_signals
-- USING (user_id = (select auth.uid()));

-- Repite para todas las políticas reportadas por Supabase Linter.
