-- Allow users to view ALL members of chats they belong to
-- Without this, you can only see your own membership, not other members

-- ==============================================
-- STEP 1: Create security definer function
-- ==============================================

-- Function to check if user is a member of a specific chat
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
-- STEP 2: Add policy to view all members of your chats
-- ==============================================

-- Policy: Users can view all members of chats they belong to
CREATE POLICY "chat_members_select_in_my_chats"
ON public.chat_members FOR SELECT
USING (public.is_user_in_chat(chat_id, auth.uid()));

COMMENT ON FUNCTION public.is_user_in_chat IS 'Security definer function - checks if user is a member of a chat without RLS';
COMMENT ON POLICY "chat_members_select_in_my_chats" ON public.chat_members IS 'Allows viewing all members of chats where the user is also a member';

