-- SIMPLE FIX: Keep RLS disabled on chat_members
-- Since we've confirmed it works and the policies are problematic

-- Disable RLS on chat_members permanently
ALTER TABLE public.chat_members DISABLE ROW LEVEL SECURITY;

-- Add a comment explaining why
COMMENT ON TABLE public.chat_members IS 'RLS disabled - security handled at application level. Complex policies were causing recursion issues.';

-- Verify it's disabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'chat_members' AND schemaname = 'public';
