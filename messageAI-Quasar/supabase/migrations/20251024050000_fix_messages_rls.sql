-- Fix messages table RLS to avoid recursion
-- Messages policies should not check chat_members, use security definer function instead

-- ==============================================
-- STEP 1: Drop ALL existing messages policies
-- ==============================================

DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their chats" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
DROP POLICY IF EXISTS "Messages are viewable by chat members" ON public.messages;
DROP POLICY IF EXISTS "Messages can be inserted by chat members" ON public.messages;

-- ==============================================
-- STEP 2: Create security definer helper function
-- ==============================================

-- Function to check if user can access chat messages
CREATE OR REPLACE FUNCTION public.user_can_access_chat_messages(p_chat_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- User can access if they're a member OR created the chat
  RETURN EXISTS (
    SELECT 1 FROM public.chat_members
    WHERE chat_id = p_chat_id AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = p_chat_id AND created_by = p_user_id
  );
END;
$$;

-- ==============================================
-- STEP 3: Create simple, non-recursive policies
-- ==============================================

-- Users can view messages in chats they have access to
CREATE POLICY "messages_select"
ON public.messages FOR SELECT
USING (public.user_can_access_chat_messages(chat_id, auth.uid()));

-- Users can insert messages in chats they have access to
CREATE POLICY "messages_insert"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid() 
  AND public.user_can_access_chat_messages(chat_id, auth.uid())
);

-- Users can update their own messages
CREATE POLICY "messages_update_own"
ON public.messages FOR UPDATE
USING (sender_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "messages_delete_own"
ON public.messages FOR DELETE
USING (sender_id = auth.uid());

-- ==============================================
-- STEP 4: Add comment
-- ==============================================

COMMENT ON FUNCTION public.user_can_access_chat_messages IS 'Security definer function - bypasses RLS to prevent recursion when checking message access';
COMMENT ON TABLE public.messages IS 'RLS: Uses security definer function to check access without recursion';

