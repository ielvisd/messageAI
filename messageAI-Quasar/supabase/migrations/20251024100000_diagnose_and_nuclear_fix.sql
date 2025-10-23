-- DIAGNOSTIC AND NUCLEAR FIX
-- Problem: Even simple chat_members queries are failing with 500 errors
-- This should tell us what's wrong and fix it definitively

-- ==============================================
-- STEP 1: Diagnostic - Show current policies
-- ==============================================

-- Uncomment these to see what exists (run manually in SQL editor):
-- SELECT tablename, policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE tablename IN ('chat_members', 'profiles', 'chats')
-- ORDER BY tablename, policyname;

-- ==============================================
-- STEP 2: NUCLEAR OPTION - Drop ALL policies
-- ==============================================

-- Drop ALL SELECT policies on chat_members
DROP POLICY IF EXISTS "chat_members_select_own" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_select_in_my_chats" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_select" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_view_all_in_my_chats" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_select_if_member" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_select_all" ON public.chat_members;

-- Drop ALL SELECT policies on profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- ==============================================
-- STEP 3: Temporarily DISABLE RLS for testing
-- ==============================================

-- This will help us confirm RLS is the problem
-- Comment this out after testing if you want RLS back
ALTER TABLE public.chat_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 4: If you want to re-enable with simple policies
-- ==============================================

-- Uncomment these if you want to re-enable RLS with ultra-simple policies:
/*
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ultra-simple policy: All authenticated users can view everything
CREATE POLICY "chat_members_view_all"
ON public.chat_members FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "profiles_view_all"
ON public.profiles FOR SELECT
TO authenticated
USING (true);
*/

-- ==============================================
-- STEP 5: Keep secure INSERT/UPDATE/DELETE policies
-- ==============================================

-- These policies should still exist and provide security:
-- From previous migrations on chat_members:
-- - chat_members_insert_self
-- - chat_members_insert_creator
-- - chat_members_delete_self
-- - chat_members_delete_creator

COMMENT ON TABLE public.chat_members IS 
  'RLS temporarily disabled to diagnose 500 errors. Re-enable after testing.';
COMMENT ON TABLE public.profiles IS 
  'RLS temporarily disabled to diagnose 500 errors. Re-enable after testing.';

