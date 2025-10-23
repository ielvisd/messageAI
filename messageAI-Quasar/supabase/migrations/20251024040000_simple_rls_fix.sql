-- SIMPLIFIED RLS fix - removes ALL recursive policies
-- Only keeps the absolute minimum needed for the app to work

-- ==============================================
-- STEP 1: Drop ALL policies on both tables
-- ==============================================

-- Drop ALL chat_members policies
DROP POLICY IF EXISTS "Users can view chat members in their chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can insert chat members when creating chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view their own chat memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view chat members for their created chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view own membership records" ON public.chat_members;
DROP POLICY IF EXISTS "Chat creators can add members" ON public.chat_members;
DROP POLICY IF EXISTS "Users can add themselves to chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can leave chats" ON public.chat_members;
DROP POLICY IF EXISTS "Chat creators can remove members" ON public.chat_members;
DROP POLICY IF EXISTS "View own memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Creators view all members" ON public.chat_members;
DROP POLICY IF EXISTS "Creators add members" ON public.chat_members;
DROP POLICY IF EXISTS "Users add themselves" ON public.chat_members;
DROP POLICY IF EXISTS "Users leave chats" ON public.chat_members;
DROP POLICY IF EXISTS "Creators remove members" ON public.chat_members;

-- Drop ALL chats policies
DROP POLICY IF EXISTS "Users can view their chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view chats they are members of" ON public.chats;
DROP POLICY IF EXISTS "Chat creators can view their chats" ON public.chats;
DROP POLICY IF EXISTS "Users can insert chats" ON public.chats;
DROP POLICY IF EXISTS "Chat creators can update their chats" ON public.chats;
DROP POLICY IF EXISTS "Chat creators can delete their chats" ON public.chats;
DROP POLICY IF EXISTS "View accessible chats" ON public.chats;
DROP POLICY IF EXISTS "Chat creators can view" ON public.chats;
DROP POLICY IF EXISTS "Chat creators can update" ON public.chats;
DROP POLICY IF EXISTS "Chat creators can delete" ON public.chats;

-- ==============================================
-- STEP 2: Disable RLS temporarily for testing
-- ==============================================

-- We'll re-enable with simpler policies
ALTER TABLE public.chat_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats DISABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 3: Re-enable with ONLY essential policies
-- ==============================================

ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- ============ CHAT_MEMBERS TABLE - SIMPLE POLICIES ============

-- Users can ONLY view their own memberships (no recursive checks)
CREATE POLICY "chat_members_select_own"
ON public.chat_members FOR SELECT
USING (user_id = auth.uid());

-- Users can add themselves (for accepting requests)
CREATE POLICY "chat_members_insert_self"
ON public.chat_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Chat creators can add ANY member to their chats
CREATE POLICY "chat_members_insert_creator"
ON public.chat_members FOR INSERT
WITH CHECK (
  chat_id IN (
    SELECT id FROM public.chats WHERE created_by = auth.uid()
  )
);

-- Users can delete their own memberships (leave chat)
CREATE POLICY "chat_members_delete_self"
ON public.chat_members FOR DELETE
USING (user_id = auth.uid());

-- Chat creators can delete any membership in their chats
CREATE POLICY "chat_members_delete_creator"
ON public.chat_members FOR DELETE
USING (
  chat_id IN (
    SELECT id FROM public.chats WHERE created_by = auth.uid()
  )
);

-- ============ CHATS TABLE - SIMPLE POLICIES ============

-- Users can view chats they created (NO membership check to avoid recursion)
CREATE POLICY "chats_select_creator"
ON public.chats FOR SELECT
USING (created_by = auth.uid());

-- Users can create chats
CREATE POLICY "chats_insert"
ON public.chats FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Creators can update their chats
CREATE POLICY "chats_update"
ON public.chats FOR UPDATE
USING (created_by = auth.uid());

-- Creators can delete their chats
CREATE POLICY "chats_delete"
ON public.chats FOR DELETE
USING (created_by = auth.uid());

-- ==============================================
-- STEP 4: Add helper function for app-level checks
-- ==============================================

-- This function can be called from the app when needed
-- It bypasses RLS to check membership
CREATE OR REPLACE FUNCTION public.get_user_chats(p_user_id UUID)
RETURNS TABLE (
  chat_id UUID,
  chat_name TEXT,
  chat_type TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as chat_id,
    c.name as chat_name,
    c.type as chat_type,
    c.created_at,
    c.updated_at,
    cm.last_read_at
  FROM public.chats c
  INNER JOIN public.chat_members cm ON cm.chat_id = c.id
  WHERE cm.user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_chats IS 'Security definer function to get all chats for a user - bypasses RLS';
COMMENT ON TABLE public.chats IS 'RLS: Users can only see chats they created. Use get_user_chats() for membership-based access';
COMMENT ON TABLE public.chat_members IS 'RLS: Users can only see their own memberships. No recursive checks';

