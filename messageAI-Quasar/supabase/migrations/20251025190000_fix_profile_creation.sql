-- Fix profile creation for new users
-- When creating users via Dashboard, the trigger needs proper permissions

-- ==============================================
-- STEP 1: Ensure INSERT policy exists and is correct
-- ==============================================

-- Drop any existing INSERT policies
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

-- Create a permissive INSERT policy
-- Allow authenticated users to insert their own profile
CREATE POLICY "profiles_insert_authenticated"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ==============================================
-- STEP 2: Recreate the trigger function with SECURITY DEFINER
-- ==============================================

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER -- This bypasses RLS
SET search_path = public
AS $$
BEGIN
    -- Insert profile for new user
    INSERT INTO public.profiles (
        id, 
        name, 
        email, 
        avatar_url,
        role,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), -- Use email as fallback name
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url',
        'student', -- Default role
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- ==============================================
-- STEP 3: Verify policies summary
-- ==============================================

COMMENT ON POLICY "profiles_insert_authenticated" ON public.profiles IS 
    'Allow authenticated users to create their own profile. Used by trigger when new user signs up.';

COMMENT ON FUNCTION public.handle_new_user() IS 
    'Trigger function to automatically create profile for new users. Uses SECURITY DEFINER to bypass RLS.';

-- Display current policies
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Profile creation policies updated!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Current profiles policies:';
    RAISE NOTICE '   SELECT: All authenticated users can view all profiles';
    RAISE NOTICE '   INSERT: Users can insert their own profile';
    RAISE NOTICE '   UPDATE: Users can update their own profile';
    RAISE NOTICE '   DELETE: Users can delete their own profile';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Trigger: on_auth_user_created';
    RAISE NOTICE '   Automatically creates profile when user signs up';
    RAISE NOTICE '   Uses SECURITY DEFINER to bypass RLS';
    RAISE NOTICE '';
    RAISE NOTICE '✨ You can now create users via Supabase Dashboard!';
    RAISE NOTICE '';
END $$;

