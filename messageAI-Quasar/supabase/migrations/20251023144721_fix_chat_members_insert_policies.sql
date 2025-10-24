-- Fix missing INSERT policies for chat_members table
-- The problem: QR code joining fails because INSERT policies were lost when RLS was re-enabled

-- ==============================================
-- STEP 1: Drop any existing INSERT policies (clean slate)
-- ==============================================

DROP POLICY IF EXISTS "chat_members_insert_self" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_insert_creator" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete_self" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete_creator" ON public.chat_members;

-- ==============================================
-- STEP 2: Add INSERT policies for chat_members
-- ==============================================

-- Users can add themselves to chats (for accepting invites, joining via QR, etc.)
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chat_members_insert_self"
ON public.chat_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Chat creators can add ANY member to their chats
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chat_members_insert_creator"
ON public.chat_members FOR INSERT
WITH CHECK (
  chat_id IN (
    SELECT id FROM public.chats WHERE created_by = auth.uid()
  )
);

-- Users can delete their own memberships (leave chat)
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chat_members_delete_self"
ON public.chat_members FOR DELETE
USING (user_id = auth.uid());

-- Chat creators can delete any membership in their chats
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chat_members_delete_creator"
ON public.chat_members FOR DELETE
USING (
  chat_id IN (
    SELECT id FROM public.chats WHERE created_by = auth.uid()
  )
);

-- ==============================================
-- STEP 3: Add comments
-- ==============================================

COMMENT ON POLICY "chat_members_insert_self" ON public.chat_members IS
  'Users can add themselves to chats (for QR joining, accepting invites, etc.)';

COMMENT ON POLICY "chat_members_insert_creator" ON public.chat_members IS
  'Chat creators can add members to their chats';

COMMENT ON POLICY "chat_members_delete_self" ON public.chat_members IS
  'Users can remove themselves from chats (leave chat)';

COMMENT ON POLICY "chat_members_delete_creator" ON public.chat_members IS
  'Chat creators can remove members from their chats';
