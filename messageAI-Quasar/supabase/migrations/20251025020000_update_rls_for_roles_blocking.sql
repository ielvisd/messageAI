-- Update RLS policies for role-based access and user blocking
-- Phase 1: Comprehensive RLS for gym roles

-- ==============================================
-- STEP 1: Gym table policies
-- ==============================================

-- Gym members can view their gym
DROP POLICY IF EXISTS "members_view_gym" ON public.gyms;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "members_view_gym" ON public.gyms
  FOR SELECT USING (
    id IN (SELECT gym_id FROM profiles WHERE id = auth.uid())
  );

-- Only owner can update gym
DROP POLICY IF EXISTS "owner_update_gym" ON public.gyms;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "owner_update_gym" ON public.gyms
  FOR UPDATE USING (owner_id = auth.uid());

-- Owners can create gyms
DROP POLICY IF EXISTS "create_gym" ON public.gyms;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "create_gym" ON public.gyms
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- ==============================================
-- STEP 2: Schedule policies (role-based)
-- ==============================================

-- All gym members can view schedules
DROP POLICY IF EXISTS "Anyone can view gym schedules" ON public.gym_schedules;
DROP POLICY IF EXISTS "members_view_schedules" ON public.gym_schedules;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "members_view_schedules" ON public.gym_schedules
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM profiles WHERE id = auth.uid()) AND
    is_active = true
  );

-- Owner can insert any schedule
DROP POLICY IF EXISTS "owner_create_schedules" ON public.gym_schedules;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "owner_create_schedules" ON public.gym_schedules
  FOR INSERT WITH CHECK (
    gym_id IN (
      SELECT gym_id FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Instructors can create schedules if settings allow
DROP POLICY IF EXISTS "instructor_create_schedules" ON public.gym_schedules;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "instructor_create_schedules" ON public.gym_schedules
  FOR INSERT WITH CHECK (
    gym_id IN (
      SELECT p.gym_id FROM profiles p
      JOIN gyms g ON g.id = p.gym_id
      WHERE p.id = auth.uid() 
        AND p.role = 'instructor'
        AND (g.settings->>'instructorsCanCreateClasses')::boolean = true
    ) AND
    instructor_id = auth.uid()
  );

-- Owner can update any schedule
DROP POLICY IF EXISTS "owner_update_schedules" ON public.gym_schedules;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "owner_update_schedules" ON public.gym_schedules
  FOR UPDATE USING (
    gym_id IN (
      SELECT gym_id FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Instructors can update their own schedules
DROP POLICY IF EXISTS "instructor_update_own_schedules" ON public.gym_schedules;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "instructor_update_own_schedules" ON public.gym_schedules
  FOR UPDATE USING (
    instructor_id = auth.uid() AND
    gym_id IN (
      SELECT p.gym_id FROM profiles p
      JOIN gyms g ON g.id = p.gym_id
      WHERE p.id = auth.uid() 
        AND p.role = 'instructor'
        AND (g.settings->>'instructorsEditOwnOnly')::boolean = true
    )
  );

-- Owner can delete schedules
DROP POLICY IF EXISTS "owner_delete_schedules" ON public.gym_schedules;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "owner_delete_schedules" ON public.gym_schedules
  FOR DELETE USING (
    gym_id IN (
      SELECT gym_id FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ==============================================
-- STEP 3: Messages policies (blocking)
-- ==============================================

-- Update existing message SELECT policy to filter blocked users
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_select_with_blocking" ON public.messages;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "messages_select_with_blocking" ON public.messages
  FOR SELECT USING (
    chat_id IN (
      SELECT chat_id FROM user_chat_access
      WHERE user_id = auth.uid()
    ) AND
    sender_id != ALL(
      SELECT unnest(blocked_users) FROM profiles WHERE id = auth.uid()
    )
  );

-- Keep existing insert policy but add blocking check
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_with_blocking" ON public.messages;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "messages_insert_with_blocking" ON public.messages
  FOR INSERT WITH CHECK (
    chat_id IN (
      SELECT chat_id FROM user_chat_access
      WHERE user_id = auth.uid()
    ) AND
    sender_id = auth.uid() AND
    -- Can't message into chats where any member has blocked you
    NOT EXISTS (
      SELECT 1 FROM chat_members cm
      JOIN profiles p ON p.id = cm.user_id
      WHERE cm.chat_id = messages.chat_id
        AND auth.uid() = ANY(p.blocked_users)
    )
  );

-- ==============================================
-- STEP 4: Chat creation policies (role-based)
-- ==============================================

-- Students can only create chats if settings allow
DROP POLICY IF EXISTS "chats_insert" ON public.chats;
DROP POLICY IF EXISTS "chats_insert_role_based" ON public.chats;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chats_insert_role_based" ON public.chats
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    (
      -- Owner and instructors can always create chats
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('owner', 'instructor')
      ) OR
      -- Students can create if settings allow
      EXISTS (
        SELECT 1 FROM profiles p
        JOIN gyms g ON g.id = p.gym_id
        WHERE p.id = auth.uid() 
          AND p.role = 'student'
          AND (
            (type = 'direct' AND (g.settings->>'studentsCanMessage')::boolean = true) OR
            (type = 'group' AND (g.settings->>'studentsCanCreateGroups')::boolean = true)
          )
      ) OR
      -- Parents can create direct chats with instructors
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'parent'
      )
    )
  );

-- ==============================================
-- STEP 5: Chat requests policies (blocking)
-- ==============================================

-- Can't send requests to blocked users
DROP POLICY IF EXISTS "Users can create chat requests" ON public.chat_requests;
DROP POLICY IF EXISTS "chat_requests_create_with_blocking" ON public.chat_requests;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chat_requests_create_with_blocking" ON public.chat_requests
  FOR INSERT WITH CHECK (
    from_user_id = auth.uid() AND
    -- Can't send to users who blocked you
    NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = to_user_id 
        AND auth.uid() = ANY(blocked_users)
    ) AND
    -- Can't send to users you blocked
    to_user_id != ALL(
      SELECT unnest(blocked_users) FROM profiles WHERE id = auth.uid()
    )
  );

-- Can't see requests from blocked users
DROP POLICY IF EXISTS "Users can view requests sent to them" ON public.chat_requests;
DROP POLICY IF EXISTS "chat_requests_view_received_with_blocking" ON public.chat_requests;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chat_requests_view_received_with_blocking" ON public.chat_requests
  FOR SELECT USING (
    to_user_id = auth.uid() AND
    from_user_id != ALL(
      SELECT unnest(blocked_users) FROM profiles WHERE id = auth.uid()
    )
  );

-- Keep sent requests policy
DROP POLICY IF EXISTS "Users can view their sent requests" ON public.chat_requests;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can view their sent requests" ON public.chat_requests
  FOR SELECT USING (from_user_id = auth.uid());

-- ==============================================
-- STEP 6: Profiles policies (view gym members)
-- ==============================================

-- Already have profiles_view_all from cleanup migration
-- Add policy to view gym members
DROP POLICY IF EXISTS "view_gym_members" ON public.profiles;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "view_gym_members" ON public.profiles
  FOR SELECT USING (
    -- Can view profiles in same gym
    gym_id IN (
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    ) OR
    -- Or own profile
    id = auth.uid() OR
    -- Or if no gym_id set (during onboarding)
    gym_id IS NULL
  );

-- ==============================================
-- STEP 7: AI conversations policies
-- ==============================================

-- Keep existing policy, ensure it works with gym context
DROP POLICY IF EXISTS "Users view own AI conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users view own AI conversations" ON public.ai_conversations
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_create_ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "users_create_ai_conversations" ON public.ai_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "users_update_ai_conversations" ON public.ai_conversations
  FOR UPDATE USING (user_id = auth.uid());

-- ==============================================
-- STEP 8: Embeddings policies (gym-scoped)
-- ==============================================

-- Keep existing but ensure gym context
DROP POLICY IF EXISTS "Authenticated users can view embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "gym_members_view_embeddings" ON public.embeddings;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "gym_members_view_embeddings" ON public.embeddings
  FOR SELECT USING (
    -- Can view embeddings for own gym
    metadata->>'gym_id' IN (
      SELECT gym_id::text FROM profiles WHERE id = auth.uid()
    ) OR
    -- Or gym-agnostic embeddings (FAQs, general content)
    metadata->>'gym_id' IS NULL
  );

-- ==============================================
-- STEP 9: Comments
-- ==============================================

COMMENT ON POLICY "members_view_gym" ON public.gyms IS 'Gym members can view their gym details';
COMMENT ON POLICY "owner_update_gym" ON public.gyms IS 'Only gym owner can update settings';
COMMENT ON POLICY "members_view_schedules" ON public.gym_schedules IS 'All gym members can view active schedules';
COMMENT ON POLICY "owner_create_schedules" ON public.gym_schedules IS 'Gym owner can create any schedule';
COMMENT ON POLICY "instructor_create_schedules" ON public.gym_schedules IS 'Instructors can create schedules if settings allow';
COMMENT ON POLICY "messages_select_with_blocking" ON public.messages IS 'Filter messages from blocked users';
COMMENT ON POLICY "messages_insert_with_blocking" ON public.messages IS 'Prevent messaging if blocked';
COMMENT ON POLICY "chats_insert_role_based" ON public.chats IS 'Chat creation respects role permissions and gym settings';
COMMENT ON POLICY "chat_requests_create_with_blocking" ON public.chat_requests IS 'Prevent requests to/from blocked users';

