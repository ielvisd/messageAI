-- DIAGNOSTIC: Check what RLS policies currently exist
-- Run this in Supabase SQL Editor to see the current state

-- ==============================================
-- Show all policies on chat_members
-- ==============================================
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'chat_members'
ORDER BY policyname;

-- ==============================================
-- Show all policies on profiles
-- ==============================================
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_clause
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ==============================================
-- Check if RLS is enabled
-- ==============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('chat_members', 'profiles', 'chats', 'messages')
ORDER BY tablename;

