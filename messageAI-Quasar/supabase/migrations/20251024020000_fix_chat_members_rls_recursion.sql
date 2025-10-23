-- Fix infinite recursion in chat_members RLS policies
-- This occurs when policies reference the same table they're protecting

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view chat members in their chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can insert chat members when creating chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view their own chat memberships" ON public.chat_members;

-- Recreate with non-recursive policies
-- Policy 1: Users can view chat members for chats they created
CREATE POLICY "Users can view chat members for their created chats"
ON public.chat_members FOR SELECT
USING (
  chat_id IN (
    SELECT id FROM public.chats WHERE created_by = auth.uid()
  )
);

-- Policy 2: Users can view their own membership records
CREATE POLICY "Users can view own membership records"
ON public.chat_members FOR SELECT
USING (user_id = auth.uid());

-- Policy 3: Users can insert chat members when they are the chat creator
CREATE POLICY "Chat creators can add members"
ON public.chat_members FOR INSERT
WITH CHECK (
  chat_id IN (
    SELECT id FROM public.chats WHERE created_by = auth.uid()
  )
);

-- Policy 4: Users can add themselves to chats (for accepting requests)
CREATE POLICY "Users can add themselves to chats"
ON public.chat_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy 5: Users can delete their own memberships (leave chat)
CREATE POLICY "Users can leave chats"
ON public.chat_members FOR DELETE
USING (user_id = auth.uid());

-- Policy 6: Chat creators can remove members
CREATE POLICY "Chat creators can remove members"
ON public.chat_members FOR DELETE
USING (
  chat_id IN (
    SELECT id FROM public.chats WHERE created_by = auth.uid()
  )
);

-- Add helpful comment
COMMENT ON TABLE public.chat_members IS 'RLS policies avoid recursion by not referencing chat_members within chat_members policies';

