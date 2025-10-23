-- FINAL FIX: Consolidate all chat_members SELECT policies into ONE
-- Problem: Multiple SELECT policies were conflicting
-- Solution: Drop ALL SELECT policies, keep only ONE that uses security definer

-- ==============================================
-- STEP 1: Drop ALL existing SELECT policies on chat_members
-- ==============================================

DROP POLICY IF EXISTS "chat_members_select_own" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_select_in_my_chats" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_select" ON public.chat_members;

-- ==============================================
-- STEP 2: Ensure security definer function exists
-- ==============================================

-- This function bypasses RLS to check membership without recursion
CREATE OR REPLACE FUNCTION public.is_user_in_chat(p_chat_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = p_chat_id AND user_id = p_user_id
  );
END;
$$;

-- ==============================================
-- STEP 3: Create ONE comprehensive SELECT policy
-- ==============================================

-- Policy: Users can view all members of chats they belong to
-- This replaces both "select_own" and "select_in_my_chats" policies
CREATE POLICY "chat_members_view_all_in_my_chats"
ON public.chat_members FOR SELECT
USING (
  -- Use security definer function to check membership without RLS recursion
  public.is_user_in_chat(chat_id, auth.uid())
);

-- ==============================================
-- STEP 4: Verify other policies remain intact
-- ==============================================

-- These should still exist from previous migrations:
-- - chat_members_insert_self (users can add themselves)
-- - chat_members_insert_creator (creators can add others)
-- - chat_members_delete_self (users can remove themselves)
-- - chat_members_delete_creator (creators can remove others)

COMMENT ON FUNCTION public.is_user_in_chat IS 'Security definer function - checks chat membership without triggering RLS recursion';
COMMENT ON POLICY "chat_members_view_all_in_my_chats" ON public.chat_members IS 'Allows viewing all members of chats where the current user is a member';

