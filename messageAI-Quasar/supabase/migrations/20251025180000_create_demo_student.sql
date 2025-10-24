-- Create demo student account for quick testing
-- Email: demo.student@messageai.com
-- Password: demo123456

-- First, create the auth user
DO $$
DECLARE
  v_user_id UUID;
  v_jiujitsio_gym_id UUID;
  v_jiujitsio_chat_id UUID;
BEGIN
  -- Check if demo user already exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'demo.student@messageai.com';
  
  IF v_user_id IS NULL THEN
    -- Generate a new UUID for the user
    v_user_id := gen_random_uuid();
    
    -- Insert into auth.users (using static dummy password hash)
    -- This hash won't work for actual login, user must be created via Supabase Auth
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      aud,
      role,
      raw_app_meta_data,
      raw_user_meta_data
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'demo.student@messageai.com',
      '$2a$10$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', -- Dummy hash
      NOW(),
      NOW(),
      NOW(),
      'authenticated',
      'authenticated',
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Demo Student"}'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created demo user with ID: %', v_user_id;
  ELSE
    RAISE NOTICE 'Demo user already exists with ID: %', v_user_id;
  END IF;
  
  -- Get Jiujitsio gym ID
  SELECT id INTO v_jiujitsio_gym_id
  FROM public.gyms
  WHERE name = 'Jiujitsio'
  LIMIT 1;
  
  IF v_jiujitsio_gym_id IS NULL THEN
    RAISE WARNING 'Jiujitsio gym not found. Demo student will not be added to a gym.';
  END IF;
  
  -- Create or update profile
  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    gym_id,
    gym_ids,
    age_category,
    student_preferences,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'Demo Student',
    'student',
    v_jiujitsio_gym_id,
    ARRAY[v_jiujitsio_gym_id],
    'adult',
    jsonb_build_object(
      'preferred_class_types', ARRAY['GI', 'No-GI'],
      'preferred_times', ARRAY['evening', 'afternoon'],
      'skill_level', 'all_levels',
      'goals', ARRAY['fitness', 'technique', 'self_defense']
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    age_category = EXCLUDED.age_category,
    student_preferences = EXCLUDED.student_preferences,
    updated_at = NOW();
  
  RAISE NOTICE 'Created/updated profile for demo student';
  
  -- Add to Jiujitsio gym main chat if it exists
  IF v_jiujitsio_gym_id IS NOT NULL THEN
    SELECT gym_chat_id INTO v_jiujitsio_chat_id
    FROM public.gyms
    WHERE id = v_jiujitsio_gym_id;
    
    IF v_jiujitsio_chat_id IS NOT NULL THEN
      -- Add to chat members
      INSERT INTO public.chat_members (chat_id, user_id, role, joined_at)
      VALUES (v_jiujitsio_chat_id, v_user_id, 'member', NOW())
      ON CONFLICT (chat_id, user_id) DO NOTHING;
      
      RAISE NOTICE 'Added demo student to Jiujitsio gym chat';
    END IF;
  END IF;
  
  RAISE NOTICE '✅ Demo student account created/updated successfully!';
  RAISE NOTICE 'Email: demo.student@messageai.com';
  RAISE NOTICE 'Password: demo123456';
  RAISE NOTICE 'NOTE: For actual login to work, you must create this user via Supabase Auth signup.';
  
END $$;

-- Display demo account info
DO $$
DECLARE
  v_user_record RECORD;
BEGIN
  SELECT 
    p.id,
    p.full_name,
    p.role,
    g.name as gym_name,
    array_length(p.gym_ids, 1) as num_gyms
  INTO v_user_record
  FROM public.profiles p
  LEFT JOIN public.gyms g ON g.id = p.gym_id
  WHERE p.id = (SELECT id FROM auth.users WHERE email = 'demo.student@messageai.com')
  LIMIT 1;
  
  IF FOUND THEN
    RAISE NOTICE '';
    RAISE NOTICE '📋 Demo Student Account Details:';
    RAISE NOTICE '  ID: %', v_user_record.id;
    RAISE NOTICE '  Name: %', v_user_record.full_name;
    RAISE NOTICE '  Role: %', v_user_record.role;
    RAISE NOTICE '  Current Gym: %', COALESCE(v_user_record.gym_name, 'None');
    RAISE NOTICE '  Total Gyms: %', COALESCE(v_user_record.num_gyms, 0);
  END IF;
END $$;

