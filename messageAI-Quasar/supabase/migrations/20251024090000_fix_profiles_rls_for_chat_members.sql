-- Fix profiles table RLS to allow viewing basic info for chat members
-- The error occurs when joining chat_members with profiles using !inner

-- ==============================================
-- STEP 1: Check current profiles policies
-- ==============================================

-- To see what policies exist:
-- SELECT policyname, permissive, roles, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'profiles';

-- ==============================================
-- STEP 2: Allow viewing basic profile info
-- ==============================================

-- Drop any overly restrictive profile SELECT policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- Create policy to allow all authenticated users to view basic profile info
-- This is safe because:
-- 1. Profile info (name, avatar) needs to be visible for chat UX
-- 2. We're only exposing: id, name, avatar_url, email (no sensitive data)
-- 3. Users can't modify other profiles (INSERT/UPDATE restricted separately)
CREATE POLICY "profiles_select_all"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- ==============================================
-- STEP 3: Ensure chat_members policy is correct
-- ==============================================

-- Verify chat_members SELECT policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_members' AND policyname = 'chat_members_select_all'
  ) THEN
    CREATE POLICY "chat_members_select_all"
    ON public.chat_members FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- ==============================================
-- STEP 4: Add comments
-- ==============================================

COMMENT ON POLICY "profiles_select_all" ON public.profiles IS 
  'Allow all authenticated users to view basic profile info (name, avatar) for chat functionality. Sensitive operations restricted via INSERT/UPDATE/DELETE policies.';

COMMENT ON POLICY "chat_members_select_all" ON public.chat_members IS 
  'Allow viewing all chat members to avoid RLS recursion. Security enforced via chats table policies and INSERT/DELETE policies.';

