-- Enable real-time for chat-related tables
-- This allows the frontend to receive instant notifications for chat requests, messages, and chat changes

DO $$
BEGIN
    -- Enable real-time replication, ignoring if already exists
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_requests;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_request_members;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

