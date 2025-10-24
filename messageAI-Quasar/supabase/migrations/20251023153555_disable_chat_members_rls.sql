-- Disable RLS on chat_members table
-- Security is handled by SECURITY DEFINER RPCs (join_gym_by_token, add_user_to_chat)
-- that control who can insert/update/delete memberships

-- Drop any existing INSERT/UPDATE/DELETE policies (SELECT policies can stay if we re-enable later)
DROP POLICY IF EXISTS "chat_members_insert_self" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_insert_creator" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete_self" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete_creator" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_update_self" ON public.chat_members;

-- Disable RLS entirely
ALTER TABLE public.chat_members DISABLE ROW LEVEL SECURITY;

-- Add comment explaining the security model
COMMENT ON TABLE public.chat_members IS 
  'RLS disabled. All inserts/updates/deletes are controlled via SECURITY DEFINER functions (join_gym_by_token, add_user_to_chat) that validate auth.uid() and business logic.';

-- Verify RLS is disabled
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'chat_members' 
  AND schemaname = 'public';

