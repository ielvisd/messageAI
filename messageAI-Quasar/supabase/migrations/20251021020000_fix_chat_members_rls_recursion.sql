-- Fix infinite recursion in chat_members RLS policies
-- Drop existing policies that cause circular dependencies
DROP POLICY IF EXISTS "Users can view chat members" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view chats they are members of" ON public.chats;

-- Create a simpler policy for chat_members that doesn't reference itself
CREATE POLICY "Users can view their own chat memberships" ON public.chat_members
    FOR SELECT USING (user_id = auth.uid());

-- Create a policy for chats that uses a function to avoid recursion
CREATE POLICY "Users can view chats they are members of" ON public.chats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_members 
            WHERE chat_id = chats.id 
            AND user_id = auth.uid()
        )
    );

-- Add policy for users to view other members in their chats using a function to avoid recursion
CREATE OR REPLACE FUNCTION public.user_is_chat_member(chat_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.chat_members 
        WHERE chat_id = chat_id_param 
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view members in their chats" ON public.chat_members
    FOR SELECT USING (public.user_is_chat_member(chat_id));

-- Ensure the function is accessible to authenticated users
GRANT EXECUTE ON FUNCTION public.user_is_chat_member(UUID) TO authenticated;
