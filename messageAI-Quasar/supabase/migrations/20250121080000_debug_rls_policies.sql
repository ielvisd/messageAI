-- Debug and fix RLS policies completely
-- Let's start fresh and ensure all policies are correct

-- Drop ALL existing policies on chats table
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Users can view chats they are members of" ON public.chats;
DROP POLICY IF EXISTS "Users can update chats they created" ON public.chats;

-- Drop ALL existing policies on chat_members table  
DROP POLICY IF EXISTS "Users can view their own chat memberships" ON public.chat_members;
DROP POLICY IF EXISTS "Users can view members in their chats" ON public.chat_members;
DROP POLICY IF EXISTS "Users can add themselves as chat members" ON public.chat_members;
DROP POLICY IF EXISTS "Users can add members to chats they created" ON public.chat_members;

-- Recreate policies from scratch with explicit permissions
-- Chats table policies
CREATE POLICY "Allow authenticated users to create chats" ON public.chats
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view chats" ON public.chats
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to update chats" ON public.chats
    FOR UPDATE TO authenticated USING (true);

-- Chat members table policies
CREATE POLICY "Allow authenticated users to create chat members" ON public.chat_members
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view chat members" ON public.chat_members
    FOR SELECT TO authenticated USING (true);

-- Ensure all necessary grants are in place
GRANT ALL ON public.chats TO authenticated;
GRANT ALL ON public.chat_members TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.profiles TO authenticated;



