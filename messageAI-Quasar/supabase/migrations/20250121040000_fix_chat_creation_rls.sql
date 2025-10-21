-- Fix RLS policies to allow chat creation
-- The issue is that the handle_new_chat() trigger can't insert into chat_members
-- because there's no policy allowing the creator to add themselves as a member

-- Add policy for users to add themselves as chat members
CREATE POLICY "Users can add themselves as chat members" ON public.chat_members
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Add policy for users to add members to chats they created
CREATE POLICY "Users can add members to chats they created" ON public.chat_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE id = chat_members.chat_id 
            AND created_by = auth.uid()
        )
    );

-- Ensure the handle_new_chat function has the right permissions
-- The function is already SECURITY DEFINER, but let's make sure it can insert
GRANT INSERT ON public.chat_members TO authenticated;



