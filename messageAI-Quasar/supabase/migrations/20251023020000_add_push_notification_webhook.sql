-- Set up webhook/trigger for push notifications on new messages
-- This automatically calls the Edge Function when a new message is created

-- Note: The actual webhook URL configuration must be set up in Supabase Dashboard:
-- 1. Go to Database → Webhooks
-- 2. Create new webhook
-- 3. Table: messages
-- 4. Events: INSERT
-- 5. Type: HTTP Request
-- 6. URL: https://[your-project-ref].supabase.co/functions/v1/send-push-notification
-- 7. HTTP Headers: {"Authorization": "Bearer [your-anon-key]"}

-- Add comment to document the webhook setup
COMMENT ON TABLE public.messages IS 'Messages table. Webhook configured to trigger push notifications on INSERT events via Supabase Edge Function: send-push-notification';

-- Function to log push notification attempts (for debugging)
CREATE TABLE IF NOT EXISTS public.push_notification_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    recipient_count INTEGER,
    status TEXT, -- 'success', 'partial', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster log queries
CREATE INDEX IF NOT EXISTS idx_push_log_message ON public.push_notification_log(message_id);
CREATE INDEX IF NOT EXISTS idx_push_log_created_at ON public.push_notification_log(created_at);

-- Enable RLS
ALTER TABLE public.push_notification_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs for messages in their chats
CREATE POLICY "Users can view push logs in their chats"
ON public.push_notification_log FOR SELECT
USING (
    message_id IN (
        SELECT m.id FROM public.messages m
        WHERE m.chat_id IN (
            SELECT chat_id FROM public.chat_members 
            WHERE user_id = auth.uid()
        )
    )
);

-- Add comments for documentation
COMMENT ON TABLE public.push_notification_log IS 'Logs push notification delivery attempts for debugging and monitoring';
COMMENT ON COLUMN public.push_notification_log.message_id IS 'The message that triggered the notification';
COMMENT ON COLUMN public.push_notification_log.recipient_count IS 'Number of devices the notification was sent to';
COMMENT ON COLUMN public.push_notification_log.status IS 'Delivery status: success, partial (some failed), or failed';

