-- Add DELETE policies for chats and related tables
-- This fixes the issue where deleted chats reappear on refresh

-- Add DELETE policy for chats table
-- Allow users to delete chats they created OR chats where they are the only remaining member
DROP POLICY IF EXISTS "Users can delete their chats" ON public.chats;
CREATE POLICY "Users can delete their chats" ON public.chats
    FOR DELETE TO authenticated USING (
        -- User created the chat
        auth.uid() = created_by 
        OR 
        -- User is the only member left
        (
            SELECT COUNT(*) FROM public.chat_members 
            WHERE chat_id = chats.id
        ) <= 1
    );

-- Add DELETE policy for chat_members table
-- Allow users to leave chats (remove themselves as members)
DROP POLICY IF EXISTS "Users can leave chats" ON public.chat_members;
CREATE POLICY "Users can leave chats" ON public.chat_members
    FOR DELETE TO authenticated USING (
        user_id = auth.uid()
    );

-- Add DELETE policy for messages table
-- Allow users to delete their own messages
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE TO authenticated USING (
        sender_id = auth.uid()
    );

-- Add a function to handle "leave chat" vs "delete chat" logic
CREATE OR REPLACE FUNCTION public.leave_or_delete_chat(chat_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    member_count INTEGER;
    is_creator BOOLEAN;
BEGIN
    -- Check if user is a member
    IF NOT EXISTS (
        SELECT 1 FROM public.chat_members 
        WHERE chat_id = chat_id_param AND user_id = auth.uid()
    ) THEN
        RETURN 'not_a_member';
    END IF;

    -- Get member count
    SELECT COUNT(*) INTO member_count 
    FROM public.chat_members 
    WHERE chat_id = chat_id_param;

    -- Check if user is the creator
    SELECT created_by = auth.uid() INTO is_creator
    FROM public.chats
    WHERE id = chat_id_param;

    -- If only one member or user is creator, delete the entire chat
    IF member_count <= 1 OR is_creator THEN
        DELETE FROM public.chats WHERE id = chat_id_param;
        RETURN 'chat_deleted';
    ELSE
        -- Otherwise just remove the user as a member
        DELETE FROM public.chat_members 
        WHERE chat_id = chat_id_param AND user_id = auth.uid();
        RETURN 'left_chat';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.leave_or_delete_chat(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON POLICY "Users can delete their chats" ON public.chats IS 
    'Allows users to delete chats they created or chats where they are the only member';
COMMENT ON POLICY "Users can leave chats" ON public.chat_members IS 
    'Allows users to leave chats by removing themselves as members';

