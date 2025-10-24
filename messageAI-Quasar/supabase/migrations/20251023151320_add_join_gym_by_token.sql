-- Secure RPC to join a gym by QR token using current auth.uid()
-- Relies on existing SECURITY DEFINER helper: public.add_user_to_chat(chat_id, user_id)

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
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT id, name, require_approval, gym_chat_id
  INTO v_gym
  FROM public.gyms
  WHERE qr_token = p_token;

  IF v_gym.id IS NULL THEN
    RAISE EXCEPTION 'invalid token';
  END IF;

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

  -- Direct join path: set profile and add to gym chat
  UPDATE public.profiles
  SET gym_id = v_gym.id, role = 'student'
  WHERE id = v_user;

  v_chat := v_gym.gym_chat_id;
  IF v_chat IS NULL THEN
    INSERT INTO public.chats (type, name, created_by)
    VALUES ('group', v_gym.name || ' - All Members', v_user)
    RETURNING id INTO v_chat;

    UPDATE public.gyms
    SET gym_chat_id = v_chat
    WHERE id = v_gym.id;
  END IF;

  PERFORM public.add_user_to_chat(v_chat, v_user);

  RETURN jsonb_build_object(
    'success', true,
    'requiresApproval', false,
    'gymName', v_gym.name
  );
END;
$$;

COMMENT ON FUNCTION public.join_gym_by_token IS 'Joins current user (auth.uid) to gym by QR token. Creates chat if needed and adds membership. Returns JSON {success, requiresApproval, gymName}.';


