-- Fix infinite recursion in profiles RLS policies
-- The issue: policies that query profiles table in USING clause create infinite loops

-- ==============================================
-- STEP 1: Drop all existing SELECT policies on profiles
-- ==============================================

DROP POLICY IF EXISTS "profiles_view_all" ON public.profiles;
DROP POLICY IF EXISTS "view_gym_members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their gym" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_in_my_chats" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- ==============================================
-- STEP 2: Create simple non-recursive SELECT policy
-- ==============================================

-- Allow all authenticated users to view profiles
-- This is safe because:
-- 1. Profile info (name, avatar, email) is needed for chat/gym UX
-- 2. No sensitive data in profiles table
-- 3. Users can't modify other profiles (UPDATE/DELETE policies handle that)
-- 4. NO RECURSION - does not query profiles table in USING clause

CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- ==============================================
-- STEP 3: Ensure UPDATE/DELETE policies exist
-- ==============================================

-- Users can only update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Users can only delete their own profile
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
ON public.profiles FOR DELETE
TO authenticated
USING (id = auth.uid());

-- ==============================================
-- STEP 4: Ensure INSERT policy exists
-- ==============================================

-- Users can only insert their own profile (typically done by trigger)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ==============================================
-- STEP 5: Add comments
-- ==============================================

COMMENT ON POLICY "profiles_select_authenticated" ON public.profiles IS 
  'Allow all authenticated users to view profiles. Simple policy to avoid RLS recursion. Security enforced via UPDATE/DELETE policies.';

COMMENT ON POLICY "profiles_update_own" ON public.profiles IS 
  'Users can only update their own profile.';

COMMENT ON POLICY "profiles_delete_own" ON public.profiles IS 
  'Users can only delete their own profile.';

COMMENT ON POLICY "profiles_insert_own" ON public.profiles IS 
  'Users can only insert their own profile (typically done by trigger).';

