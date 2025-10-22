-- Fix unique constraint on chat_requests
-- The constraint should only prevent duplicate PENDING requests, not accepted/rejected ones
-- This allows users to have historical requests between the same users

-- Drop the existing constraint that includes status
ALTER TABLE public.chat_requests 
DROP CONSTRAINT IF EXISTS unique_active_direct_request;

-- Add a partial unique index that only applies to pending requests
-- This prevents duplicate pending requests while allowing multiple accepted/rejected ones
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_direct_request 
ON public.chat_requests (from_user_id, to_user_id) 
WHERE status = 'pending' AND chat_type = 'direct';

-- Add comment for documentation
COMMENT ON INDEX unique_pending_direct_request IS 
'Prevents duplicate pending direct chat requests between the same users. Historical requests are allowed.';

