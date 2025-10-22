-- Fix chat creation and membership issues
-- This migration ensures creators are always added as members and fixes RLS policies

-- First, let's create a more robust function that handles errors gracefully
CREATE OR REPLACE FUNCTION public.handle_new_chat()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the creator as a member with proper error handling
    INSERT INTO public.chat_members (chat_id, user_id)
    VALUES (NEW.id, NEW.created_by)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the chat creation
        RAISE WARNING 'Failed to add creator as chat member: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_chat_created ON public.chats;
CREATE TRIGGER on_chat_created
    AFTER INSERT ON public.chats
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_chat();

-- Create balanced RLS policies that provide security while ensuring functionality
-- Drop the overly permissive policies from the debug migration
DROP POLICY IF EXISTS "Allow authenticated users to create chats" ON public.chats;
DROP POLICY IF EXISTS "Allow authenticated users to view chats" ON public.chats;
DROP POLICY IF EXISTS "Allow authenticated users to update chats" ON public.chats;
DROP POLICY IF EXISTS "Allow authenticated users to create chat members" ON public.chat_members;
DROP POLICY IF EXISTS "Allow authenticated users to view chat members" ON public.chat_members;

-- Create secure but functional policies for chats
CREATE POLICY "Users can create chats" ON public.chats
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view chats they are members of" ON public.chats
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.chat_members 
            WHERE chat_id = chats.id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update chats they created" ON public.chats
    FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Create secure but functional policies for chat_members
CREATE POLICY "Users can view their own memberships" ON public.chat_members
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can view members in their chats" ON public.chat_members
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.chat_members cm2
            WHERE cm2.chat_id = chat_members.chat_id 
            AND cm2.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add themselves as members" ON public.chat_members
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Chat creators can add members" ON public.chat_members
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chats 
            WHERE id = chat_members.chat_id 
            AND created_by = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.chats TO authenticated;
GRANT ALL ON public.chat_members TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Create helper function to check if users have chat history
CREATE OR REPLACE FUNCTION public.users_have_chat_history(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.chat_members cm1
        INNER JOIN public.chat_members cm2 ON cm1.chat_id = cm2.chat_id
        INNER JOIN public.chats c ON cm1.chat_id = c.id
        WHERE cm1.user_id = user1_id 
        AND cm2.user_id = user2_id
        AND c.type = 'direct'
        AND cm1.user_id != cm2.user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.users_have_chat_history(UUID, UUID) TO authenticated;
