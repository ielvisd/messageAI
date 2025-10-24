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
DROP POLICY IF EXISTS " ON public.*;
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
DROP POLICY IF EXISTS " ON public.*;
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
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can delete their own reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

COMMENT ON TABLE public.message_reactions IS 'Stores emoji reactions on messages';
COMMENT ON COLUMN public.message_reactions.emoji IS 'Emoji character (e.g., 👍, ❤️, 💪)';



