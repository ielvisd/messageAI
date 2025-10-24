-- DEBUG: Check all policies and temporarily disable RLS on chat_members to test

-- 1. Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'chats', 'chat_members', 'gyms')
ORDER BY tablename, policyname;

-- 2. Temporarily disable RLS on chat_members to test if that's the issue
-- ALTER TABLE public.chat_members DISABLE ROW LEVEL SECURITY;

-- 3. Test the RPC function manually (uncomment to test)
-- SELECT public.join_gym_via_qr(
--   'your-gym-id-here'::uuid,
--   'your-user-id-here'::uuid,
--   NULL
-- );

-- 4. Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('profiles', 'chats', 'chat_members', 'gyms')
AND schemaname = 'public';
