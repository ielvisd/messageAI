-- TEMPORARY FIX: Disable RLS on chat_members to test QR joining
-- This will allow the QR flow to work while we debug the policies

ALTER TABLE public.chat_members DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'chat_members' AND schemaname = 'public';

-- Now try the QR code flow - it should work
-- After testing, re-enable RLS with:
-- ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
