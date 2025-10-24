-- Fix ai_conversations table schema to match useGymAI composable expectations
-- The composable expects: gym_id, messages, conversation_state, updated_at

-- Add missing columns
ALTER TABLE public.ai_conversations 
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Drop the old 'context' column if it exists (replaced by conversation_state)
ALTER TABLE public.ai_conversations 
  DROP COLUMN IF EXISTS context;

-- Ensure conversation_state exists (should be added by previous migration)
-- But adding it here in case migrations run out of order
ALTER TABLE public.ai_conversations 
  ADD COLUMN IF NOT EXISTS conversation_state JSONB DEFAULT '{}'::jsonb;

-- Create index on gym_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_conversations_gym ON public.ai_conversations(gym_id);

-- Update RLS policy - simple policy for user's own conversations
-- Multi-gym access is handled via gym_id matching user's gym_ids array
DROP POLICY IF EXISTS "Users view own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users view own AI conversations" ON public.ai_conversations
  FOR SELECT USING (user_id = auth.uid());

-- Allow users to insert their own conversations
DROP POLICY IF EXISTS "Users insert own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users insert own AI conversations" ON public.ai_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow users to update their own conversations
DROP POLICY IF EXISTS "Users update own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users update own AI conversations" ON public.ai_conversations
  FOR UPDATE USING (user_id = auth.uid());

-- Add updated_at trigger
DROP TRIGGER IF EXISTS handle_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER handle_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.ai_conversations IS 'Stores AI assistant conversation history and state per user per gym';
COMMENT ON COLUMN public.ai_conversations.messages IS 'Array of message objects with role, content, timestamp';
COMMENT ON COLUMN public.ai_conversations.conversation_state IS 'Conversation metadata: preferences, context, lastScheduleQuery';
COMMENT ON COLUMN public.ai_conversations.gym_id IS 'Link to gym for gym-specific AI context';

