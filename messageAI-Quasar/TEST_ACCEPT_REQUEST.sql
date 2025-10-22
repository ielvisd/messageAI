-- Test script to verify the chat request accept functionality
-- Run this in your Supabase SQL Editor to check if everything is set up correctly

-- 1. Check if the create_chat_from_request function exists
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name = 'create_chat_from_request';

-- Expected result: One row showing the function exists and returns UUID

-- 2. Check if you have any pending chat requests
SELECT 
    cr.id,
    cr.from_user_id,
    cr.to_user_id,
    cr.chat_name,
    cr.status,
    sender.name as sender_name,
    recipient.name as recipient_name
FROM chat_requests cr
LEFT JOIN profiles sender ON cr.from_user_id = sender.id
LEFT JOIN profiles recipient ON cr.to_user_id = recipient.id
WHERE cr.status = 'pending'
ORDER BY cr.created_at DESC;

-- 3. Try to manually test the accept flow with one of your pending requests
-- Replace the UUID below with an actual request ID from the query above
-- UNCOMMENT AND RUN THIS SECTION ONLY AFTER REPLACING THE UUID:

-- BEGIN;

-- -- Update the request status
-- UPDATE chat_requests 
-- SET status = 'accepted', responded_at = NOW()
-- WHERE id = 'YOUR-REQUEST-ID-HERE';

-- -- Try to create the chat using the function
-- SELECT create_chat_from_request('YOUR-REQUEST-ID-HERE');

-- -- Check if chat was created
-- SELECT c.*, cm.user_id 
-- FROM chats c
-- LEFT JOIN chat_members cm ON c.id = cm.chat_id
-- WHERE c.request_id = 'YOUR-REQUEST-ID-HERE';

-- ROLLBACK;  -- This rolls back the test so you can try again from the UI

-- 4. Check if there are any RLS policy issues
-- This shows which policies exist on the chats and chat_members tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('chats', 'chat_members', 'chat_requests')
ORDER BY tablename, policyname;

