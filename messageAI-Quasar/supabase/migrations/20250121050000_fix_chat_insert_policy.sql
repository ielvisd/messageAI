-- Fix the malformed INSERT policy for chats table
-- The original policy was missing proper formatting which may have caused issues

-- Drop the existing malformed policy
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;

-- Recreate the policy with proper formatting
CREATE POLICY "Users can create chats" ON public.chats
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Also ensure the policy exists for UPDATE operations
DROP POLICY IF EXISTS "Users can update chats they created" ON public.chats;

CREATE POLICY "Users can update chats they created" ON public.chats
    FOR UPDATE USING (auth.uid() = created_by);



