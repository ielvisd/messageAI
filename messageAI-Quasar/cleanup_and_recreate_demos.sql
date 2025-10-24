-- Complete cleanup and recreation of demo users
-- This removes all traces of demo users from ALL tables

BEGIN;

-- 1. Remove from chat_members
DELETE FROM public.chat_members 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@demo.com'
);

-- 2. Remove from profiles
DELETE FROM public.profiles 
WHERE id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@demo.com'
);

-- 3. Remove from auth.sessions
DELETE FROM auth.sessions 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@demo.com'
);

-- 4. Remove from auth.identities
DELETE FROM auth.identities 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@demo.com'
);

-- 5. Remove from auth.users
DELETE FROM auth.users WHERE email LIKE '%@demo.com';

COMMIT;

-- Verify cleanup
SELECT 'Remaining demo users:' as status, count(*) as count FROM auth.users WHERE email LIKE '%@demo.com';
