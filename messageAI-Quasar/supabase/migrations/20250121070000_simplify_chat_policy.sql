-- Temporarily simplify the chat creation policy to debug the issue
-- This will help us determine if the problem is with the policy complexity

-- Drop the existing complex policy
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;

-- Create a very simple policy that just checks if user is authenticated
CREATE POLICY "Users can create chats" ON public.chats
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure we have the basic grants
GRANT INSERT ON public.chats TO authenticated;
GRANT SELECT ON public.chats TO authenticated;
GRANT INSERT ON public.chat_members TO authenticated;
GRANT SELECT ON public.chat_members TO authenticated;



