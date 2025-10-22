-- ===================================================================
-- TEST: Create a test chat request manually
-- Run this to test if receiving requests works
-- ===================================================================

-- Step 1: Find two user IDs to test with
SELECT 
    'Available users:' as info,
    id,
    name,
    email,
    CASE WHEN id = auth.uid() THEN '👤 YOU' ELSE '👥 Other user' END as user_type
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Manually create a test request
-- Replace USER_1_ID and USER_2_ID with actual UUIDs from above
/*
INSERT INTO public.chat_requests (
    from_user_id,
    to_user_id,
    chat_type,
    chat_name,
    message,
    status
) VALUES (
    'USER_1_ID',  -- from (sender)
    'USER_2_ID',  -- to (recipient)
    'direct',
    'Test Chat Request',
    'This is a test message to verify requests are working',
    'pending'
) RETURNING *;
*/

-- Step 3: View all chat requests to verify it was created
SELECT 
    cr.id,
    cr.status,
    cr.chat_name,
    cr.message,
    sender.name as from_user,
    sender.email as from_email,
    recipient.name as to_user,
    recipient.email as to_email,
    cr.created_at
FROM public.chat_requests cr
LEFT JOIN public.profiles sender ON cr.from_user_id = sender.id
LEFT JOIN public.profiles recipient ON cr.to_user_id = recipient.id
ORDER BY cr.created_at DESC;

-- Step 4: Test RLS - Check what YOU can see as the current user
-- This shows requests you sent
SELECT 
    'Requests I sent:' as type,
    cr.id,
    cr.chat_name,
    recipient.name as to_user,
    cr.status
FROM public.chat_requests cr
LEFT JOIN public.profiles recipient ON cr.to_user_id = recipient.id
WHERE cr.from_user_id = auth.uid();

-- This shows requests sent to you
SELECT 
    'Requests I received:' as type,
    cr.id,
    cr.chat_name,
    sender.name as from_user,
    cr.status
FROM public.chat_requests cr
LEFT JOIN public.profiles sender ON cr.from_user_id = sender.id
WHERE cr.to_user_id = auth.uid();

