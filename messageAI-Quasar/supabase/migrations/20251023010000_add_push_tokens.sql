-- Add push notification token support to profiles
-- This enables sending push notifications to users on multiple devices

-- Add push_tokens column to store device tokens
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_tokens JSONB DEFAULT '[]'::jsonb;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_tokens ON public.profiles USING GIN (push_tokens);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.push_tokens IS 'Array of push notification tokens for user devices. Format: [{"token": "...", "platform": "ios|android|web", "created_at": "..."}]';

-- Function to add a push token for a user
CREATE OR REPLACE FUNCTION public.add_push_token(
    p_user_id UUID,
    p_token TEXT,
    p_platform TEXT
) RETURNS void AS $$
BEGIN
    -- Remove existing token if present (user might have reinstalled)
    UPDATE public.profiles
    SET push_tokens = (
        SELECT jsonb_agg(token)
        FROM jsonb_array_elements(push_tokens) AS token
        WHERE token->>'token' != p_token
    )
    WHERE id = p_user_id;

    -- Add new token
    UPDATE public.profiles
    SET push_tokens = COALESCE(push_tokens, '[]'::jsonb) || 
        jsonb_build_object(
            'token', p_token,
            'platform', p_platform,
            'created_at', NOW()
        )
    WHERE id = p_user_id;
    
    RAISE NOTICE 'Added push token for user % on platform %', p_user_id, p_platform;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove a push token
CREATE OR REPLACE FUNCTION public.remove_push_token(
    p_user_id UUID,
    p_token TEXT
) RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET push_tokens = (
        SELECT COALESCE(jsonb_agg(token), '[]'::jsonb)
        FROM jsonb_array_elements(push_tokens) AS token
        WHERE token->>'token' != p_token
    )
    WHERE id = p_user_id;
    
    RAISE NOTICE 'Removed push token for user %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get push tokens for a specific user (excluding sender)
CREATE OR REPLACE FUNCTION public.get_user_push_tokens(
    p_user_id UUID
) RETURNS TABLE (token TEXT, platform TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        token_data->>'token' AS token,
        token_data->>'platform' AS platform
    FROM public.profiles,
         jsonb_array_elements(push_tokens) AS token_data
    WHERE id = p_user_id
      AND push_tokens IS NOT NULL
      AND jsonb_array_length(push_tokens) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.add_push_token(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_push_token(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_push_tokens(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.add_push_token(UUID, TEXT, TEXT) IS 'Adds a push notification token for a user device';
COMMENT ON FUNCTION public.remove_push_token(UUID, TEXT) IS 'Removes a push notification token when user logs out or uninstalls';
COMMENT ON FUNCTION public.get_user_push_tokens(UUID) IS 'Gets all push tokens for a user to send notifications';

