-- Cleanup script for requests that got stuck in "accepted" state without creating a chat
-- Run this AFTER applying the fix above

-- 1. Find requests that are marked as accepted but have no chat created
SELECT 
    cr.id,
    cr.chat_name,
    cr.status,
    cr.responded_at,
    sender.name as sender_name,
    sender.email as sender_email,
    recipient.name as recipient_name,
    recipient.email as recipient_email,
    c.id as chat_id
FROM chat_requests cr
LEFT JOIN profiles sender ON cr.from_user_id = sender.id
LEFT JOIN profiles recipient ON cr.to_user_id = recipient.id
LEFT JOIN chats c ON c.request_id = cr.id
WHERE cr.status = 'accepted'
ORDER BY cr.responded_at DESC;

-- 2. If you see requests with NULL chat_id, they are stuck
-- Reset them back to pending so users can accept them again
-- UNCOMMENT THE LINES BELOW TO RUN THE CLEANUP:

-- UPDATE chat_requests
-- SET status = 'pending',
--     responded_at = NULL
-- WHERE status = 'accepted'
-- AND NOT EXISTS (
--     SELECT 1 FROM chats WHERE chats.request_id = chat_requests.id
-- );

-- 3. Verify the cleanup worked
-- SELECT 
--     status,
--     COUNT(*) as count
-- FROM chat_requests
-- GROUP BY status;

