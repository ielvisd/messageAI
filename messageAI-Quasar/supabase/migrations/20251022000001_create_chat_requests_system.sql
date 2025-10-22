-- Create chat request system for professional messaging
-- This implements the request/approval flow for first-time direct messages and group invitations
--
-- Note: If you get "policy already exists" errors, run this first:
-- DROP POLICY IF EXISTS "Users can view their sent requests" ON public.chat_requests;
-- DROP POLICY IF EXISTS "Users can view requests sent to them" ON public.chat_requests;
-- DROP POLICY IF EXISTS "Users can create chat requests" ON public.chat_requests;
-- DROP POLICY IF EXISTS "Recipients can update request status" ON public.chat_requests;
-- DROP POLICY IF EXISTS "Users can view group request memberships" ON public.chat_request_members;
-- DROP POLICY IF EXISTS "Request creators can add members" ON public.chat_request_members;
-- DROP POLICY IF EXISTS "Members can update their own status" ON public.chat_request_members;

-- Create chat_requests table
CREATE TABLE IF NOT EXISTS public.chat_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    chat_type TEXT NOT NULL DEFAULT 'direct' CHECK (chat_type IN ('direct', 'group')),
    chat_name TEXT,
    message TEXT, -- Initial message or invitation text
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    group_chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE, -- For group invitations
    metadata JSONB DEFAULT '{}', -- Additional data (member list, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_request_type CHECK (
        (chat_type = 'direct' AND to_user_id IS NOT NULL AND group_chat_id IS NULL) OR
        (chat_type = 'group' AND group_chat_id IS NOT NULL AND to_user_id IS NOT NULL)
    ),
    
    -- Prevent duplicate active requests
    CONSTRAINT unique_active_direct_request UNIQUE (from_user_id, to_user_id, status)
        DEFERRABLE INITIALLY DEFERRED
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_requests_to_user_status ON public.chat_requests(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_requests_from_user ON public.chat_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_expires_at ON public.chat_requests(expires_at) WHERE status = 'pending';

-- Create chat_request_members table for group invitations with multiple recipients
CREATE TABLE IF NOT EXISTS public.chat_request_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID REFERENCES public.chat_requests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    responded_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(request_id, user_id)
);

-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Add request_id to chats table to track which request created the chat
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.chat_requests(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.chat_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_request_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_requests
DROP POLICY IF EXISTS "Users can view their sent requests" ON public.chat_requests;
CREATE POLICY "Users can view their sent requests" ON public.chat_requests
    FOR SELECT TO authenticated USING (from_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view requests sent to them" ON public.chat_requests;
CREATE POLICY "Users can view requests sent to them" ON public.chat_requests
    FOR SELECT TO authenticated USING (to_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create chat requests" ON public.chat_requests;
CREATE POLICY "Users can create chat requests" ON public.chat_requests
    FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());

DROP POLICY IF EXISTS "Recipients can update request status" ON public.chat_requests;
CREATE POLICY "Recipients can update request status" ON public.chat_requests
    FOR UPDATE TO authenticated USING (to_user_id = auth.uid())
    WITH CHECK (to_user_id = auth.uid());

-- RLS Policies for chat_request_members
DROP POLICY IF EXISTS "Users can view group request memberships" ON public.chat_request_members;
CREATE POLICY "Users can view group request memberships" ON public.chat_request_members
    FOR SELECT TO authenticated USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.chat_requests cr
            WHERE cr.id = request_id AND cr.from_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Request creators can add members" ON public.chat_request_members;
CREATE POLICY "Request creators can add members" ON public.chat_request_members
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_requests cr
            WHERE cr.id = request_id AND cr.from_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can update their own status" ON public.chat_request_members;
CREATE POLICY "Members can update their own status" ON public.chat_request_members
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Function to automatically expire old requests
CREATE OR REPLACE FUNCTION public.expire_old_requests()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE public.chat_requests 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to check if users have existing chat history (for bypassing requests)
CREATE OR REPLACE FUNCTION public.check_existing_chat_history(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.chat_members cm1
        INNER JOIN public.chat_members cm2 ON cm1.chat_id = cm2.chat_id
        INNER JOIN public.chats c ON cm1.chat_id = c.id
        WHERE cm1.user_id = user1_id 
        AND cm2.user_id = user2_id
        AND c.type = 'direct'
        AND cm1.user_id != cm2.user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create chat from accepted request
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
    IF request_record.chat_type = 'direct' THEN
        INSERT INTO public.chat_members (chat_id, user_id) VALUES
        (new_chat_id, request_record.from_user_id),
        (new_chat_id, request_record.to_user_id);
    END IF;
    
    RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.chat_requests TO authenticated;
GRANT ALL ON public.chat_request_members TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_old_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_existing_chat_history(UUID, UUID) TO authenticated; 
GRANT EXECUTE ON FUNCTION public.create_chat_from_request(UUID) TO authenticated;

-- Create trigger to update responded_at timestamp
CREATE OR REPLACE FUNCTION public.handle_request_response()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status AND NEW.status IN ('accepted', 'rejected') THEN
        NEW.responded_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_request_response ON public.chat_requests;
CREATE OR REPLACE TRIGGER on_request_response
    BEFORE UPDATE ON public.chat_requests
    FOR EACH ROW EXECUTE FUNCTION public.handle_request_response();
