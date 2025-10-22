-- Add read receipts tracking for individual message reads
-- This enables "read by" functionality in group chats

-- Create message_read_receipts table for tracking individual reads
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON public.message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_user ON public.message_read_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_lookup ON public.message_read_receipts(message_id, user_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_read_at ON public.message_read_receipts(read_at);

-- Enable RLS
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view read receipts for messages in their chats
CREATE POLICY "Users can view read receipts in their chats" 
ON public.message_read_receipts FOR SELECT
USING (
    message_id IN (
        SELECT m.id FROM public.messages m
        WHERE m.chat_id IN (
            SELECT chat_id FROM public.chat_members 
            WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Users can create read receipts for messages in their chats
CREATE POLICY "Users can create read receipts"
ON public.message_read_receipts FOR INSERT
WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
        SELECT m.id FROM public.messages m
        WHERE m.chat_id IN (
            SELECT chat_id FROM public.chat_members 
            WHERE user_id = auth.uid()
        )
    )
);

-- Function to mark messages as read and create receipts
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
    p_chat_id UUID,
    p_user_id UUID
) RETURNS void AS $$
DECLARE
    msg_record RECORD;
    receipt_count INTEGER := 0;
BEGIN
    -- Get all unread messages in this chat (not sent by this user)
    FOR msg_record IN 
        SELECT m.id
        FROM public.messages m
        LEFT JOIN public.message_read_receipts mrr 
            ON mrr.message_id = m.id AND mrr.user_id = p_user_id
        WHERE m.chat_id = p_chat_id
          AND m.sender_id != p_user_id
          AND mrr.id IS NULL
        ORDER BY m.created_at ASC
    LOOP
        -- Create read receipt
        INSERT INTO public.message_read_receipts (message_id, user_id, read_at)
        VALUES (msg_record.id, p_user_id, NOW())
        ON CONFLICT (message_id, user_id) DO NOTHING;
        
        receipt_count := receipt_count + 1;
    END LOOP;
    
    -- Log the operation
    RAISE NOTICE 'Created % read receipts for user % in chat %', receipt_count, p_user_id, p_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID, UUID) TO authenticated;

-- Enable realtime for read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_read_receipts;

-- Add comments for documentation
COMMENT ON TABLE public.message_read_receipts IS 'Tracks which users have read which messages, enabling read receipts in chats';
COMMENT ON COLUMN public.message_read_receipts.message_id IS 'The message that was read';
COMMENT ON COLUMN public.message_read_receipts.user_id IS 'The user who read the message';
COMMENT ON COLUMN public.message_read_receipts.read_at IS 'When the message was read';
COMMENT ON FUNCTION public.mark_messages_as_read(UUID, UUID) IS 'Marks all unread messages in a chat as read for a specific user';

