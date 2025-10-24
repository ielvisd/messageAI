-- Migration 3: Instructor QR Codes
-- Separate QR code for instructor recruitment

-- ============================================
-- ADD INSTRUCTOR QR TOKEN TO GYMS
-- ============================================

ALTER TABLE public.gyms 
  ADD COLUMN IF NOT EXISTS instructor_qr_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;

CREATE INDEX IF NOT EXISTS idx_gyms_instructor_qr_token ON public.gyms(instructor_qr_token);

-- Generate instructor QR tokens for existing gyms that don't have one
UPDATE public.gyms 
SET instructor_qr_token = gen_random_uuid()::text 
WHERE instructor_qr_token IS NULL;

-- ============================================
-- INSTRUCTOR JOIN FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.join_gym_as_instructor(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_gym RECORD;
  v_chat UUID;
  v_current_gym_id UUID;
  v_current_gym_ids UUID[];
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  -- Get gym by instructor QR token
  SELECT id, name, gym_chat_id
  INTO v_gym
  FROM public.gyms
  WHERE instructor_qr_token = p_token;

  IF v_gym.id IS NULL THEN
    RAISE EXCEPTION 'invalid instructor token';
  END IF;

  -- Get user's current gym_id and gym_ids
  SELECT gym_id, gym_ids, role INTO v_current_gym_id, v_current_gym_ids
  FROM public.profiles
  WHERE id = v_user;

  -- Update profile to instructor role
  IF v_current_gym_id IS NULL THEN
    -- First gym join - set as primary gym
    UPDATE public.profiles
    SET 
      gym_id = v_gym.id,
      role = 'instructor',
      gym_ids = array_append(COALESCE(gym_ids, ARRAY[]::UUID[]), v_gym.id),
      instructor_preferences = '{
        "age_groups": [],
        "class_types": [],
        "skill_levels": [],
        "available_days": [],
        "available_times": {"start": null, "end": null},
        "teaches_private_lessons": false
      }'::jsonb,
      private_lessons_enabled = false
    WHERE id = v_user;
  ELSE
    -- Additional gym - just add to gym_ids and update role
    UPDATE public.profiles
    SET 
      role = 'instructor',
      gym_ids = CASE 
        WHEN v_gym.id = ANY(COALESCE(gym_ids, ARRAY[]::UUID[])) THEN gym_ids
        ELSE array_append(COALESCE(gym_ids, ARRAY[]::UUID[]), v_gym.id)
      END,
      -- Initialize preferences if not already set
      instructor_preferences = CASE
        WHEN instructor_preferences IS NULL OR instructor_preferences = '{}'::jsonb THEN
          '{
            "age_groups": [],
            "class_types": [],
            "skill_levels": [],
            "available_days": [],
            "available_times": {"start": null, "end": null},
            "teaches_private_lessons": false
          }'::jsonb
        ELSE instructor_preferences
      END
    WHERE id = v_user;
  END IF;

  -- Get or create gym chat
  v_chat := v_gym.gym_chat_id;
  IF v_chat IS NULL THEN
    INSERT INTO public.chats (type, name, created_by)
    VALUES ('group', v_gym.name || ' - All Members', v_user)
    RETURNING id INTO v_chat;

    UPDATE public.gyms
    SET gym_chat_id = v_chat
    WHERE id = v_gym.id;
  END IF;

  -- Add instructor to gym chat
  PERFORM public.add_user_to_chat(v_chat, v_user);

  RETURN jsonb_build_object(
    'success', true,
    'gymName', v_gym.name,
    'role', 'instructor',
    'message', 'Welcome to the instructor team! Please set your teaching preferences in settings.',
    'isAdditionalGym', v_current_gym_id IS NOT NULL
  );
END;
$$;

COMMENT ON FUNCTION public.join_gym_as_instructor IS 'Allows users to join a gym as an instructor using a special instructor QR code. Sets role to instructor and initializes preferences with private lessons disabled by default.';

-- ============================================
-- HELPER FUNCTION TO GET INSTRUCTOR QR URL
-- ============================================

CREATE OR REPLACE FUNCTION public.get_instructor_join_url(p_gym_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_base_url TEXT := 'http://localhost:9000/#/join/instructor/'; -- Will be environment-specific
BEGIN
  -- Verify user owns this gym
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND p_gym_id = ANY(owned_gym_ids)
  ) THEN
    RAISE EXCEPTION 'unauthorized: must own gym';
  END IF;

  SELECT instructor_qr_token INTO v_token
  FROM public.gyms
  WHERE id = p_gym_id;

  IF v_token IS NULL THEN
    RAISE EXCEPTION 'gym not found';
  END IF;

  RETURN v_base_url || v_token;
END;
$$;

COMMENT ON FUNCTION public.get_instructor_join_url IS 'Returns the instructor join URL for a gym. Only accessible by gym owners.';




