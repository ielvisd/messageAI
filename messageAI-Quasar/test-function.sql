-- Test if the RPC function exists and works
SELECT proname FROM pg_proc WHERE proname = 'join_gym_via_qr';

-- Test the function (replace with real IDs)
-- SELECT public.join_gym_via_qr('gym-id-here'::uuid, 'user-id-here'::uuid, NULL);

-- Check current chat_members RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'chat_members' AND schemaname = 'public';

-- Check current policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'chat_members';
