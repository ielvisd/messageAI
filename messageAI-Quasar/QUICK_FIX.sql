-- ===================================================================
-- QUICK FIX: Run this entire script in Supabase SQL Editor
-- This will fix all issues preventing chat requests from working
-- ===================================================================

-- 1. Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Backfill email from auth.users for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND (p.email IS NULL OR p.email = '');

-- 3. Update the trigger to include email for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'name',
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Verify the fix worked
SELECT 
    'Profiles table structure:' as check_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 5. Check if you have any existing chat requests
SELECT 
    'Existing chat requests:' as check_name,
    COUNT(*) as total,
    status
FROM public.chat_requests
GROUP BY status;

-- 6. Show your current profile
SELECT 
    'Your profile:' as check_name,
    id,
    name,
    email,
    CASE 
        WHEN email IS NULL THEN '❌ Email is NULL' 
        ELSE '✅ Email exists'
    END as email_status
FROM public.profiles
WHERE id = auth.uid();

