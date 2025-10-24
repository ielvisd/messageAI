-- Add gym roles and structure
-- Phase 1: Core schema for gyms, roles, and organization

-- ==============================================
-- STEP 1: Create gyms table
-- ==============================================

CREATE TABLE IF NOT EXISTS public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  locations JSONB DEFAULT '[]'::jsonb, -- [{name: 'North', address: '...'}]
  settings JSONB DEFAULT '{
    "studentsCanMessage": false,
    "studentsCanCreateGroups": false,
    "instructorsCanCreateClasses": true,
    "instructorsEditOwnOnly": true,
    "aiEnabled": true,
    "aiAutoRespond": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gyms_owner ON public.gyms(owner_id);

-- ==============================================
-- STEP 2: Update profiles table with roles
-- ==============================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('owner', 'instructor', 'student', 'parent')),
  ADD COLUMN IF NOT EXISTS parent_links JSONB DEFAULT '[]'::jsonb, -- [student_id1, student_id2]
  ADD COLUMN IF NOT EXISTS blocked_users UUID[] DEFAULT ARRAY[]::UUID[],
  ADD COLUMN IF NOT EXISTS ai_preferences JSONB DEFAULT '{
    "preferredClasses": [],
    "preferredTimes": [],
    "skillLevel": "beginner",
    "goals": []
  }'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_gym ON public.profiles(gym_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================
-- STEP 3: Update gym_schedules with gym_id
-- ==============================================

ALTER TABLE public.gym_schedules
  ADD COLUMN IF NOT EXISTS gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS current_rsvps INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gym_schedules_gym ON public.gym_schedules(gym_id);

-- ==============================================
-- STEP 4: Update ai_conversations for memory
-- ==============================================

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS conversation_state JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tool_call_history JSONB DEFAULT '[]'::jsonb;

-- ==============================================
-- STEP 5: Add updated_at trigger for gyms
-- ==============================================

CREATE TRIGGER handle_gyms_updated_at
  BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================
-- STEP 6: Comments for documentation
-- ==============================================

COMMENT ON TABLE public.gyms IS 'Gym organizations with owner, locations, and settings';
COMMENT ON COLUMN public.profiles.gym_id IS 'Link user to their gym organization';
COMMENT ON COLUMN public.profiles.role IS 'User role: owner, instructor, student, or parent';
COMMENT ON COLUMN public.profiles.parent_links IS 'Array of student IDs for parent accounts';
COMMENT ON COLUMN public.profiles.blocked_users IS 'Array of user IDs this user has blocked';
COMMENT ON COLUMN public.profiles.ai_preferences IS 'User preferences for AI recommendations';
COMMENT ON COLUMN public.gym_schedules.current_rsvps IS 'Current count of confirmed RSVPs';
COMMENT ON COLUMN public.gym_schedules.chat_id IS 'Linked class group chat';
COMMENT ON COLUMN public.ai_conversations.conversation_state IS 'Persistent state for AI memory';
COMMENT ON COLUMN public.ai_conversations.tool_call_history IS 'History of tool calls for debugging';

