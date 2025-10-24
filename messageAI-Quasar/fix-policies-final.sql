-- FINAL FIX: Clean up chat_members policies and re-enable RLS

-- 1. Disable RLS temporarily
ALTER TABLE public.chat_members DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Users can view chat members in their chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can insert chat members when creating chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view their own chat memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view chat members for their created chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view own membership records" ON public.chat_members;
DROP POLICY IF EXISTS "Chat creators can add members" ON public.chat_members;
DROP POLICY IF EXISTS "Users can add themselves to chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can leave chats" ON public.chat_members;
DROP POLICY IF EXISTS "Chat creators can remove members" ON public.chat_members;
DROP POLICY IF EXISTS "View own memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Creators view all members" ON public.chat_members;
DROP POLICY IF EXISTS "Creators add members" ON public.chat_members;
DROP POLICY IF EXISTS "Users add themselves" ON public.chat_members;
DROP POLICY IF EXISTS "Users leave chats" ON public.chat_members;
DROP POLICY IF EXISTS "Creators remove members" ON public.chat_members;
DROP POLICY IF EXISTS "Users can add members to their chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can add themselves as members" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_insert_self" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_insert_creator" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete_self" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_delete_creator" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_select_my_chats" ON public.chat_members;

-- 3. Re-enable RLS
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- 4. Add clean, simple policies
-- SELECT: Users can view all members of chats they belong to
CREATE POLICY "chat_members_select_my_chats"
ON public.chat_members FOR SELECT
TO authenticated
USING (
  chat_id IN (
    SELECT cm2.chat_id
    FROM public.chat_members cm2
    WHERE cm2.user_id = auth.uid()
  )
);

-- INSERT: Users can add themselves to chats (for joining via QR, invites, etc.)
CREATE POLICY "chat_members_insert_self"
ON public.chat_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- INSERT: Chat creators can add members to their chats
CREATE POLICY "chat_members_insert_creator"
ON public.chat_members FOR INSERT
TO authenticated
WITH CHECK (
  chat_id IN (
    SELECT id FROM public.chats WHERE created_by = auth.uid()
  )
);

-- DELETE: Users can remove themselves from chats
CREATE POLICY "chat_members_delete_self"
ON public.chat_members FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- DELETE: Chat creators can remove members from their chats
CREATE POLICY "chat_members_delete_creator"
ON public.chat_members FOR DELETE
TO authenticated
USING (
  chat_id IN (
    SELECT id FROM public.chats WHERE created_by = auth.uid()
  )
);

-- 5. Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'chat_members'
ORDER BY cmd, policyname;
