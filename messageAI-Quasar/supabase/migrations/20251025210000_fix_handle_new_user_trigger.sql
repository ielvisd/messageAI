-- Fix handle_new_user trigger to handle missing metadata from Dashboard user creation
-- This prevents 500 errors when creating users via Supabase Dashboard

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, avatar_url, role, gym_id)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), -- Fallback to email if name not provided
      NEW.email, 
      NEW.raw_user_meta_data->>'avatar_url',
      COALESCE(NEW.raw_user_meta_data->>'role', 'student'), -- Default to student role
      (NEW.raw_user_meta_data->>'gym_id')::uuid -- NULL if not provided
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile on user signup. Uses email as fallback name and student as default role.';

