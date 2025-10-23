-- Comprehensive RLS fix for chats and chat_members tables
-- Eliminates ALL circular references between the two tables

-- ==============================================
-- STEP 1: Drop ALL existing RLS policies on both tables
-- ==============================================

-- Drop chat_members policies (all possible variations)
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

-- Drop chats policies (all possible variations)
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
-- STEP 2: Create security definer functions (bypasses RLS)
-- ==============================================

-- Function to check if user is chat member (security definer = bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_chat_member(p_chat_id UUID, p_user_id UUID)
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

-- Function to check if user created the chat
CREATE OR REPLACE FUNCTION public.is_chat_creator(p_chat_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = p_chat_id AND created_by = p_user_id
  );
END;
$$;

-- ==============================================
-- STEP 3: Create non-recursive RLS policies
-- ==============================================

-- ============ CHATS TABLE POLICIES ============

-- Policy: Users can view chats they created OR are members of
-- Uses security definer function to avoid recursion
CREATE POLICY "View accessible chats"
ON public.chats FOR SELECT
USING (
  created_by = auth.uid() 
  OR public.is_chat_member(id, auth.uid())
);

-- Policy: Users can create chats
CREATE POLICY "Users can create chats"
ON public.chats FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Policy: Chat creators can update
CREATE POLICY "Chat creators can update"
ON public.chats FOR UPDATE
USING (created_by = auth.uid());

-- Policy: Chat creators can delete
CREATE POLICY "Chat creators can delete"
ON public.chats FOR DELETE
USING (created_by = auth.uid());

-- ============ CHAT_MEMBERS TABLE POLICIES ============

-- Policy: Users can view their own membership records
CREATE POLICY "View own memberships"
ON public.chat_members FOR SELECT
USING (user_id = auth.uid());

-- Policy: Chat creators can view all members of their chats
CREATE POLICY "Creators view all members"
ON public.chat_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chats 
    WHERE chats.id = chat_members.chat_id 
    AND chats.created_by = auth.uid()
  )
);

-- Policy: Chat creators can add members
CREATE POLICY "Creators add members"
ON public.chat_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chats 
    WHERE chats.id = chat_members.chat_id 
    AND chats.created_by = auth.uid()
  )
);

-- Policy: Users can add themselves (for accepting chat requests)
CREATE POLICY "Users add themselves"
ON public.chat_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Users can leave chats (delete own membership)
CREATE POLICY "Users leave chats"
ON public.chat_members FOR DELETE
USING (user_id = auth.uid());

-- Policy: Chat creators can remove members
CREATE POLICY "Creators remove members"
ON public.chat_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.chats 
    WHERE chats.id = chat_members.chat_id 
    AND chats.created_by = auth.uid()
  )
);

-- ==============================================
-- STEP 4: Add helpful comments
-- ==============================================

COMMENT ON FUNCTION public.is_chat_member IS 'Security definer function - bypasses RLS to prevent recursion';
COMMENT ON FUNCTION public.is_chat_creator IS 'Security definer function - bypasses RLS to prevent recursion';
COMMENT ON TABLE public.chats IS 'RLS policies avoid referencing chat_members table';
COMMENT ON TABLE public.chat_members IS 'RLS policies avoid circular references to chats table where possible';

