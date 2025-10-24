-- WORKING POLICIES: Simple, non-recursive policies for chat_members

-- 1. Clean slate - drop everything
ALTER TABLE public.chat_members DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_members_select_my_chats" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_insert_self" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_insert_creator" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete_self" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete_creator" ON public.chat_members;

-- 2. Re-enable RLS
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- 3. Simple policies that work
-- Allow all authenticated users to view chat memberships (safe for chat UX)
CREATE POLICY "chat_members_select_all"
ON public.chat_members FOR SELECT
TO authenticated
USING (true);

-- Allow users to add themselves to chats (for QR joining, invites)
CREATE POLICY "chat_members_insert_self"
ON public.chat_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to leave chats (delete their own membership)
CREATE POLICY "chat_members_delete_self"
ON public.chat_members FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 4. Verify policies
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'chat_members';
