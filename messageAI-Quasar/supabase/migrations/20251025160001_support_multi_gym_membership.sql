-- Support Multi-Gym Membership
-- Allows users to be members of multiple gyms simultaneously
-- Primary gym_id remains for the "home" gym, gym_ids tracks all memberships

-- ============================================
-- 1. Add gym_ids array column to profiles
-- ============================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS gym_ids UUID[] DEFAULT ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_profiles_gym_ids ON public.profiles USING GIN(gym_ids);

-- Backfill: Add current gym_id to gym_ids array for existing users
UPDATE public.profiles 
SET gym_ids = ARRAY[gym_id]
WHERE gym_id IS NOT NULL 
  AND NOT (gym_id = ANY(gym_ids));

-- ============================================
-- 2. Update join_gym_by_token to support multi-gym
-- ============================================

CREATE OR REPLACE FUNCTION public.join_gym_by_token(p_token TEXT)
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

  -- Get gym by token
  SELECT id, name, require_approval, gym_chat_id
  INTO v_gym
  FROM public.gyms
  WHERE qr_token = p_token;

  IF v_gym.id IS NULL THEN
    RAISE EXCEPTION 'invalid token';
  END IF;

  -- Get user's current gym_id and gym_ids
  SELECT gym_id, gym_ids INTO v_current_gym_id, v_current_gym_ids
  FROM public.profiles
  WHERE id = v_user;

  -- If approval is required, create (or ensure) a pending request and return
  IF COALESCE(v_gym.require_approval, false) = true THEN
    BEGIN
      INSERT INTO public.gym_join_requests (gym_id, user_id, status, joined_via)
      VALUES (v_gym.id, v_user, 'pending', 'qr_code');
    EXCEPTION WHEN unique_violation THEN
      -- Ignore duplicate requests
      NULL;
    END;

    RETURN jsonb_build_object(
      'success', true,
      'requiresApproval', true,
      'gymName', v_gym.name
    );
  END IF;

  -- Direct join path: update gym memberships
  
  -- Only set gym_id if user has no current gym (first join)
  IF v_current_gym_id IS NULL THEN
    UPDATE public.profiles
    SET gym_id = v_gym.id, 
        role = COALESCE(role, 'student'),
        gym_ids = array_append(COALESCE(gym_ids, ARRAY[]::UUID[]), v_gym.id)
    WHERE id = v_user;
  ELSE
    -- User already has a gym, just add to gym_ids array if not already there
    UPDATE public.profiles
    SET gym_ids = CASE 
      WHEN v_gym.id = ANY(COALESCE(gym_ids, ARRAY[]::UUID[])) THEN gym_ids
      ELSE array_append(COALESCE(gym_ids, ARRAY[]::UUID[]), v_gym.id)
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

  -- Add user to gym chat (always, even for multi-gym)
  PERFORM public.add_user_to_chat(v_chat, v_user);

  RETURN jsonb_build_object(
    'success', true,
    'requiresApproval', false,
    'gymName', v_gym.name,
    'isAdditionalGym', v_current_gym_id IS NOT NULL
  );
END;
$$;

COMMENT ON FUNCTION public.join_gym_by_token IS 'Joins current user to gym by QR token. Supports multi-gym membership. Only sets gym_id on first join, adds all gyms to gym_ids array. Returns JSON {success, requiresApproval, gymName, isAdditionalGym}.';

-- ============================================
-- 3. Helper function to check gym membership
-- ============================================

CREATE OR REPLACE FUNCTION public.is_gym_member(p_user_id UUID, p_gym_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_member BOOLEAN;
BEGIN
  SELECT p_gym_id = ANY(COALESCE(gym_ids, ARRAY[]::UUID[]))
  INTO v_is_member
  FROM public.profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(v_is_member, false);
END;
$$;

COMMENT ON FUNCTION public.is_gym_member IS 'Checks if a user is a member of a specific gym by checking gym_ids array';




