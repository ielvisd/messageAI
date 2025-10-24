-- Apply multimedia features migrations only
-- These are safe to run multiple times due to IF NOT EXISTS clauses

-- ============================================
-- Migration 1: Setup Media Storage
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('chat-media', 'chat-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']),
  ('profile-avatars', 'profile-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-media bucket
DROP POLICY IF EXISTS "Users can upload media to their chats" ON storage.objects;
CREATE POLICY "Users can upload media to their chats"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media' AND
  (storage.foldername(name))[1] IN (
    SELECT chat_id::text FROM public.chat_members 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view media in their chats" ON storage.objects;
CREATE POLICY "Users can view media in their chats"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  (storage.foldername(name))[1] IN (
    SELECT chat_id::text FROM public.chat_members 
    WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Storage policies for profile-avatars bucket
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Add media_metadata column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS media_metadata JSONB;

-- Create index on media_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_media_url ON public.messages(media_url) 
WHERE media_url IS NOT NULL;

-- Create index on message_type for filtering
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(message_type);

-- ============================================
-- Migration 2: Add Message Reactions
-- ============================================

-- Create message_reactions table for emoji reactions on messages
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Create index on message_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON public.message_reactions(message_id);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.message_reactions(user_id);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_reactions

-- Users can view reactions in their chats
DROP POLICY IF EXISTS "Users can view reactions in their chats" ON public.message_reactions;
CREATE POLICY "Users can view reactions in their chats"
ON public.message_reactions FOR SELECT
USING (
    message_id IN (
        SELECT m.id FROM public.messages m
        INNER JOIN public.chat_members cm ON cm.chat_id = m.chat_id
        WHERE cm.user_id = auth.uid()
    )
);

-- Users can add reactions to messages in their chats
DROP POLICY IF EXISTS "Users can add reactions to their chats" ON public.message_reactions;
CREATE POLICY "Users can add reactions to their chats"
ON public.message_reactions FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    message_id IN (
        SELECT m.id FROM public.messages m
        INNER JOIN public.chat_members cm ON cm.chat_id = m.chat_id
        WHERE cm.user_id = auth.uid()
    )
);

-- Users can delete their own reactions
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.message_reactions;
CREATE POLICY "Users can delete their own reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for message_reactions (if not already enabled)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'message_reactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
    END IF;
END $$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Multimedia features migrations applied successfully!';
END $$;

