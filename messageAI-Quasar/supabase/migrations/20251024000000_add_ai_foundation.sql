-- Enable pgvector for RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings for semantic search
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'message', 'schedule', 'policy', 'announcement'
  content_id UUID, -- references message, schedule entry, etc
  content_text TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_embeddings_type ON embeddings(content_type);

-- Gym schedules (owner-managed)
CREATE TABLE IF NOT EXISTS gym_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_location TEXT NOT NULL, -- 'north', 'south'
  class_type TEXT NOT NULL, -- 'gi', 'nogi', 'kids', 'open_mat'
  day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', etc
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  level TEXT, -- 'All Levels', 'Advanced', 'Beginner', 'Ages 6-12'
  instructor_id UUID REFERENCES public.profiles(id),
  instructor_name TEXT,
  max_capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gym_schedules_location ON gym_schedules(gym_location);
CREATE INDEX IF NOT EXISTS idx_gym_schedules_day ON gym_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_gym_schedules_instructor ON gym_schedules(instructor_id);

-- Message categories (AI-assigned)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS category TEXT; -- 'schedule_question', 'private_lesson', 'urgent', 'billing', 'general'
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_messages_category ON public.messages(category) WHERE category IS NOT NULL;

-- AI conversation context (memory)
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  context JSONB DEFAULT '{}'::jsonb, -- stores conversation state
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_chat ON ai_conversations(chat_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id);

-- Quick replies / templates (owner-created + AI-generated)
CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  trigger_keywords TEXT[],
  reply_text TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quick_replies_category ON quick_replies(category);

-- RLS policies
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read schedules
DROP POLICY IF EXISTS "Anyone can view gym schedules" ON gym_schedules;
CREATE POLICY "Anyone can view gym schedules" ON gym_schedules
  FOR SELECT USING (is_active = true);

-- Only admins can modify schedules (add user_role field later)
DROP POLICY IF EXISTS "Authenticated users can view embeddings" ON embeddings;
CREATE POLICY "Authenticated users can view embeddings" ON embeddings
  FOR SELECT TO authenticated USING (true);

-- Users can view their own AI conversation context
DROP POLICY IF EXISTS "Users view own AI conversations" ON ai_conversations;
CREATE POLICY "Users view own AI conversations" ON ai_conversations
  FOR SELECT USING (user_id = auth.uid());

-- Quick replies visible to all
DROP POLICY IF EXISTS "All can view quick replies" ON quick_replies;
CREATE POLICY "All can view quick replies" ON quick_replies
  FOR SELECT TO authenticated USING (true);

-- Search function for pgvector semantic search
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding vector(1536),
  match_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    embeddings.id,
    embeddings.content_type,
    embeddings.content_text,
    1 - (embeddings.embedding <=> query_embedding) AS similarity
  FROM embeddings
  ORDER BY embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

