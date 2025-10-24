-- QUICK FIX for infinite recursion in profiles RLS
-- Run this in Supabase Dashboard SQL Editor: https://supabase.com/dashboard

-- Drop all existing SELECT policies on profiles that cause recursion
DROP POLICY IF EXISTS "profiles_view_all" ON public.profiles;
DROP POLICY IF EXISTS "view_gym_members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their gym" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_in_my_chats" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;

-- Create ONE simple non-recursive SELECT policy
CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Ensure security is maintained with UPDATE/DELETE policies
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

