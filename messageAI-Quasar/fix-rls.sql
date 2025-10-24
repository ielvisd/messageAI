-- QUICK FIX for chat_members RLS issue
-- Run this in your Supabase SQL Editor

-- 1. Drop any existing INSERT policies that might be conflicting
DROP POLICY IF EXISTS "chat_members_insert_self" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_insert_creator" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete_self" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete_creator" ON public.chat_members;

-- 2. Add the missing INSERT policies
CREATE POLICY "chat_members_insert_self"
ON public.chat_members FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_members_insert_creator"
ON public.chat_members FOR INSERT
WITH CHECK (
  chat_id IN (
    SELECT id FROM public.chats WHERE created_by = auth.uid()
  )
);

CREATE POLICY "chat_members_delete_self"
ON public.chat_members FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "chat_members_delete_creator"
ON public.chat_members FOR DELETE
USING (
  chat_id IN (
    SELECT id FROM public.chats WHERE created_by = auth.uid()
  )
);

-- 3. Create security definer functions to bypass RLS for trusted operations
CREATE OR REPLACE FUNCTION public.add_user_to_chat(p_chat_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_members (chat_id, user_id)
  VALUES (p_chat_id, p_user_id)
  ON CONFLICT (chat_id, user_id) DO NOTHING;
  RETURN TRUE;
END;
$$;

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

-- 4. Verify the policies are in place
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'chat_members'
ORDER BY policyname;
