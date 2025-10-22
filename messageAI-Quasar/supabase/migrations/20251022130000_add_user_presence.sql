-- Add user presence/status tracking to profiles table
-- This enables online/offline status indicators throughout the app

-- Add presence columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away'));

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON public.profiles(last_seen_at);

-- Function to update user's last seen timestamp
CREATE OR REPLACE FUNCTION public.update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update last_seen_at when is_online changes
DROP TRIGGER IF EXISTS on_user_presence_change ON public.profiles;
CREATE TRIGGER on_user_presence_change
    BEFORE UPDATE OF is_online, status ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_last_seen();

-- Function to set user offline (called when session ends)
CREATE OR REPLACE FUNCTION public.set_user_offline(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET is_online = false,
        status = 'offline',
        last_seen_at = NOW()
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set user online (called when session starts)
CREATE OR REPLACE FUNCTION public.set_user_online(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET is_online = true,
        status = 'online',
        last_seen_at = NOW()
    WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.set_user_offline(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_online(UUID) TO authenticated;

-- Add RLS policy for viewing presence (everyone can see)
DROP POLICY IF EXISTS "Users can view presence status" ON public.profiles;
CREATE POLICY "Users can view presence status" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

-- Add RLS policy for updating own presence
DROP POLICY IF EXISTS "Users can update their own presence" ON public.profiles;
CREATE POLICY "Users can update their own presence" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Comment for documentation
COMMENT ON COLUMN public.profiles.is_online IS 'Whether the user is currently online';
COMMENT ON COLUMN public.profiles.last_seen_at IS 'Last time the user was seen online';
COMMENT ON COLUMN public.profiles.status IS 'User status: online, offline, or away';

