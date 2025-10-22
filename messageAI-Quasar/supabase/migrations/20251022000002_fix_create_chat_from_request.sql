-- Fix the create_chat_from_request function to handle duplicate members
-- This fixes the "duplicate key value violates unique constraint" error

CREATE OR REPLACE FUNCTION public.create_chat_from_request(request_id_param UUID)
RETURNS UUID AS $$
DECLARE
    request_record public.chat_requests%ROWTYPE;
    new_chat_id UUID;
BEGIN
    -- Get the request
    SELECT * INTO request_record FROM public.chat_requests WHERE id = request_id_param;
    
    IF NOT FOUND OR request_record.status != 'accepted' THEN
        RAISE EXCEPTION 'Request not found or not accepted';
    END IF;
    
    -- Create the chat
    INSERT INTO public.chats (name, type, created_by, request_id)
    VALUES (request_record.chat_name, request_record.chat_type, request_record.from_user_id, request_id_param)
    RETURNING id INTO new_chat_id;
    
    -- Add members for direct chat
    -- Use ON CONFLICT DO NOTHING to avoid duplicate key errors if a trigger already added members
    IF request_record.chat_type = 'direct' THEN
        INSERT INTO public.chat_members (chat_id, user_id) VALUES
        (new_chat_id, request_record.from_user_id),
        (new_chat_id, request_record.to_user_id)
        ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
    
    RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure permissions are granted
GRANT EXECUTE ON FUNCTION public.create_chat_from_request(UUID) TO authenticated;

