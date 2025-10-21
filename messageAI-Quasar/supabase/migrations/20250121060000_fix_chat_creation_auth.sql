-- Fix chat creation by ensuring the user has a profile and the policy works correctly
-- The issue might be that auth.uid() doesn't match the profile ID or the user doesn't have a profile

-- First, let's make sure the policy is more explicit about checking both auth and profile
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;

-- Create a more robust policy that ensures the user exists in profiles table
CREATE POLICY "Users can create chats" ON public.chats
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- Also add a policy that allows the handle_new_chat function to work
-- by granting it the necessary permissions
GRANT INSERT ON public.chats TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- Make sure the handle_new_chat function can insert into chat_members
-- even if the user doesn't have a profile yet (it will be created by the trigger)
GRANT INSERT ON public.chat_members TO authenticated;



