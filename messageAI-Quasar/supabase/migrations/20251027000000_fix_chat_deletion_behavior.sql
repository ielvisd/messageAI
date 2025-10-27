-- Fix chat deletion behavior
-- 1. Prevent users from leaving gym group chats
-- 2. Make DM deletion only hide the conversation for the deleting user
-- 3. Keep existing behavior for regular group chats

-- Update the leave_or_delete_chat function
CREATE OR REPLACE FUNCTION public.leave_or_delete_chat(chat_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    member_count INTEGER;
    is_creator BOOLEAN;
    chat_type TEXT;
    is_gym_chat BOOLEAN;
BEGIN
    -- Check if user is a member
    IF NOT EXISTS (
        SELECT 1 FROM public.chat_members 
        WHERE chat_id = chat_id_param AND user_id = auth.uid()
    ) THEN
        RETURN 'not_a_member';
    END IF;

    -- Get chat type
    SELECT type INTO chat_type
    FROM public.chats
    WHERE id = chat_id_param;

    -- Check if this is a gym's main chat (linked from gyms table)
    SELECT EXISTS (
        SELECT 1 FROM public.gyms 
        WHERE gym_chat_id = chat_id_param
    ) INTO is_gym_chat;

    -- Prevent leaving gym chats
    IF is_gym_chat THEN
        RETURN 'cannot_leave_gym_chat';
    END IF;

    -- Get member count
    SELECT COUNT(*) INTO member_count 
    FROM public.chat_members 
    WHERE chat_id = chat_id_param;

    -- Check if user is the creator
    SELECT created_by = auth.uid() INTO is_creator
    FROM public.chats
    WHERE id = chat_id_param;

    -- For DMs (direct chats), just remove the user from chat_members
    -- This hides the conversation for them but keeps it for the other person
    IF chat_type = 'direct' THEN
        DELETE FROM public.chat_members 
        WHERE chat_id = chat_id_param AND user_id = auth.uid();
        RETURN 'chat_hidden';
    END IF;

    -- For group chats: if only one member left, delete the entire chat
    IF member_count <= 1 THEN
        DELETE FROM public.chats WHERE id = chat_id_param;
        RETURN 'chat_deleted';
    END IF;

    -- For group chats: if creator leaves, delete the entire chat
    IF is_creator THEN
        DELETE FROM public.chats WHERE id = chat_id_param;
        RETURN 'chat_deleted';
    END IF;

    -- Otherwise, just remove the user as a member (leave group)
    DELETE FROM public.chat_members 
    WHERE chat_id = chat_id_param AND user_id = auth.uid();
    RETURN 'left_chat';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure execute permission
GRANT EXECUTE ON FUNCTION public.leave_or_delete_chat(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.leave_or_delete_chat IS 
    'Handles chat deletion/leaving logic. Prevents leaving gym chats, hides DMs for current user only, and properly handles group chat leaving/deletion.';

