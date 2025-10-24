-- Helper function to create demo users (bypasses auth for seeding)
-- This is only for creating test/demo instructor accounts
-- Uses dummy password hashes since these accounts are for demo/testing only

CREATE OR REPLACE FUNCTION public.create_demo_instructor(
  p_email TEXT,
  p_name TEXT,
  p_gym_id UUID,
  p_birthdate DATE,
  p_instructor_preferences JSONB,
  p_private_lessons_enabled BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_id UUID;
BEGIN
  -- Check if this instructor already exists (by email in profiles)
  SELECT id INTO v_existing_id
  FROM public.profiles
  WHERE email = p_email;
  
  IF v_existing_id IS NOT NULL THEN
    -- Instructor already exists, return existing ID
    RETURN v_existing_id;
  END IF;
  
  -- Also check auth.users in case there's a partial insert
  SELECT id INTO v_existing_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_existing_id IS NOT NULL THEN
    -- Auth user exists but profile doesn't, use that ID
    v_user_id := v_existing_id;
  ELSE
    -- Generate a new UUID for this user
    v_user_id := gen_random_uuid();
    
    -- Insert into auth.users (bypassing normal auth flow for demo purposes)
    -- Note: Using a static placeholder encrypted_password since these are demo accounts
    -- In production, real users would go through proper Supabase auth signup
    -- This is a valid bcrypt hash format but not a real password (accounts are for seeding only)
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      aud,
      role
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      p_email,
      '$2a$10$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', -- Static dummy bcrypt hash
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object('name', p_name),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );
  END IF;
  
  -- Insert into profiles (this will now use either the existing auth.users id or the new one)
  -- Use ON CONFLICT to handle race conditions or if profile was created between our checks
  INSERT INTO public.profiles (
    id,
    name,
    email,
    gym_id,
    role,
    instructor_preferences,
    private_lessons_enabled,
    birthdate,
    age_category,
    gym_ids,
    created_at
  ) VALUES (
    v_user_id,
    p_name,
    p_email,
    p_gym_id,
    'instructor',
    p_instructor_preferences,
    p_private_lessons_enabled,
    p_birthdate,
    public.calculate_age_category(p_birthdate),
    ARRAY[p_gym_id],
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN v_user_id;
END;
$$;

COMMENT ON FUNCTION public.create_demo_instructor IS 'Creates demo instructor accounts for seeding/testing. Bypasses normal auth signup flow.';

