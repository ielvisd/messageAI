-- Setup media storage buckets and policies
-- This migration creates storage for chat media and profile avatars

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('chat-media', 'chat-media', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']),
  ('profile-avatars', 'profile-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-media bucket
DROP POLICY IF EXISTS " ON public.*;
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

DROP POLICY IF EXISTS " ON public.*;
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

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-media' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Storage policies for profile-avatars bucket
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-avatars');

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS " ON public.*;
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

COMMENT ON COLUMN public.messages.media_metadata IS 'Stores metadata like dimensions, duration, thumbnail URL for media messages';




