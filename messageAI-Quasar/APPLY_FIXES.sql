-- Quick Fix Script for Real-Time and Chat Deletion Issues
-- Run this in your Supabase SQL Editor to apply all fixes at once

-- ============================================================================
-- PART 1: Enable Real-Time for All Chat Tables
-- ============================================================================
-- This makes chat requests, messages, and chat updates appear instantly
-- Uses DO block to handle tables that are already in the publication

DO $$
BEGIN
    -- Add each table, ignoring errors if already exists
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_requests;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'chat_requests already in publication';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_request_members;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'chat_request_members already in publication';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'messages already in publication';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'chats already in publication';
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_members;
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'chat_members already in publication';
    END;
END $$;

-- ============================================================================
-- PART 2: Add DELETE Policies
-- ============================================================================
-- This allows chats to actually be deleted and not reappear on refresh

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can delete their chats" ON public.chats;
DROP POLICY IF EXISTS "Users can leave chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Add DELETE policy for chats
-- Users can delete chats they created OR if they're the last member
CREATE POLICY "Users can delete their chats" ON public.chats
    FOR DELETE TO authenticated USING (
        auth.uid() = created_by 
        OR 
        (
            SELECT COUNT(*) FROM public.chat_members 
            WHERE chat_id = chats.id
        ) <= 1
    );

-- Add DELETE policy for chat_members
-- Users can leave chats by removing themselves
CREATE POLICY "Users can leave chats" ON public.chat_members
    FOR DELETE TO authenticated USING (
        user_id = auth.uid()
    );

-- Add DELETE policy for messages
-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages" ON public.messages
    FOR DELETE TO authenticated USING (
        sender_id = auth.uid()
    );

-- ============================================================================
-- PART 3: Add Helper Function (Optional but Recommended)
-- ============================================================================
-- Smart function that decides whether to delete the chat or just leave it

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

-- ============================================================================
-- PART 4: Fix Unique Constraint on Chat Requests
-- ============================================================================
-- The old constraint prevented duplicate (from_user_id, to_user_id, status)
-- This caused errors when accepting requests if there was any previous accepted request
-- New constraint only prevents duplicate PENDING requests

-- Drop the existing constraint
ALTER TABLE public.chat_requests 
DROP CONSTRAINT IF EXISTS unique_active_direct_request;

-- Add a partial unique index that only applies to pending requests
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_direct_request 
ON public.chat_requests (from_user_id, to_user_id) 
WHERE status = 'pending' AND chat_type = 'direct';

-- ============================================================================
-- Verification: Check that everything is set up correctly
-- ============================================================================

-- Verify real-time is enabled
SELECT 
    'Real-time enabled for: ' || string_agg(tablename, ', ') as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('chat_requests', 'chat_request_members', 'messages', 'chats', 'chat_members');

-- Verify DELETE policies exist
SELECT 
    schemaname, 
    tablename, 
    policyname,
    cmd as command
FROM pg_policies 
WHERE tablename IN ('chats', 'chat_members', 'messages')
AND cmd = 'DELETE'
ORDER BY tablename, policyname;

-- If you see results from both queries above, the fixes are applied! ✅

