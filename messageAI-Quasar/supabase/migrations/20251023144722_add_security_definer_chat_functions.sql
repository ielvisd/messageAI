-- Add security definer functions to handle chat membership operations
-- This bypasses RLS for trusted operations like QR code joining

-- ==============================================
-- STEP 1: Create security definer function for adding users to chats
-- ==============================================

CREATE OR REPLACE FUNCTION public.add_user_to_chat(p_chat_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the user into chat_members (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.chat_members (chat_id, user_id)
  VALUES (p_chat_id, p_user_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN TRUE;
END;
$$;

-- ==============================================
-- STEP 2: Create security definer function for gym joining
-- ==============================================

CREATE OR REPLACE FUNCTION public.join_gym_via_qr(p_gym_id UUID, p_user_id UUID, p_chat_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  final_chat_id UUID := p_chat_id;
BEGIN
  -- Update user profile
  UPDATE public.profiles
  SET gym_id = p_gym_id, role = 'student'
  WHERE id = p_user_id;

  -- Create gym chat if it doesn't exist
  IF final_chat_id IS NULL THEN
    -- Get gym name
    SELECT name INTO final_chat_id
    FROM public.gyms
    WHERE id = p_gym_id;

    -- Create the chat
    INSERT INTO public.chats (type, name, created_by)
    VALUES ('group', final_chat_id || ' - All Members', p_user_id)
    RETURNING id INTO final_chat_id;

    -- Update gym with chat_id
    UPDATE public.gyms
    SET gym_chat_id = final_chat_id
    WHERE id = p_gym_id;
  END IF;

  -- Add user to chat
  PERFORM public.add_user_to_chat(final_chat_id, p_user_id);

  RETURN final_chat_id;
END;
$$;

-- ==============================================
-- STEP 3: Add comments
-- ==============================================

COMMENT ON FUNCTION public.add_user_to_chat IS 'Security definer function to add users to chats, bypassing RLS';
COMMENT ON FUNCTION public.join_gym_via_qr IS 'Security definer function to handle complete gym joining flow via QR code';
