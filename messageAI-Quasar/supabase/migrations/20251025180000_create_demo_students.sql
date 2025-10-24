-- Create diverse demo student accounts for quick testing
-- All passwords are: demo123456

DO $$
DECLARE
  v_jiujitsio_gym_id UUID;
  v_jiujitsio_west_gym_id UUID;
  v_jiujitsio_chat_id UUID;
  v_jiujitsio_west_chat_id UUID;
  v_user_id UUID;
BEGIN
  -- Get gym IDs
  SELECT id, gym_chat_id INTO v_jiujitsio_gym_id, v_jiujitsio_chat_id
  FROM public.gyms
  WHERE name = 'jiujitsio'
  LIMIT 1;
  
  SELECT id, gym_chat_id INTO v_jiujitsio_west_gym_id, v_jiujitsio_west_chat_id
  FROM public.gyms
  WHERE name = 'Jiujitsio West'
  LIMIT 1;
  
  IF v_jiujitsio_gym_id IS NULL THEN
    RAISE WARNING 'Jiujitsio gym not found!';
  END IF;
  
  IF v_jiujitsio_west_gym_id IS NULL THEN
    RAISE WARNING 'Jiujitsio West gym not found!';
  END IF;
  
  RAISE NOTICE '🏋️ Creating demo student accounts...';
  RAISE NOTICE '';
  
  -- ============================================================================
  -- 1. Adult Student - Single Gym (Jiujitsio) - All Levels
  -- ============================================================================
  v_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, aud, role,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    'alex.student@demo.com',
    '$2a$10$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    NOW(), NOW(), NOW(), 'authenticated', 'authenticated',
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Alex Chen"}'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.profiles (
    id, name, role, gym_id, gym_ids, age_category, student_preferences
  ) VALUES (
    v_user_id, 'Alex Chen', 'student',
    v_jiujitsio_gym_id,
    ARRAY[v_jiujitsio_gym_id],
    'adult',
    jsonb_build_object(
      'preferred_class_types', ARRAY['GI', 'No-GI'],
      'preferred_times', ARRAY['evening'],
      'skill_level', 'all_levels',
      'goals', ARRAY['fitness', 'competition']
    )
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    age_category = EXCLUDED.age_category,
    student_preferences = EXCLUDED.student_preferences;
  
  IF v_jiujitsio_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_user_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Created: Alex Chen (Adult, All Levels, Jiujitsio only)';
  
  -- ============================================================================
  -- 2. Adult Student - Both Gyms - Competition Focus
  -- ============================================================================
  v_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, aud, role,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    'jordan.competitor@demo.com',
    '$2a$10$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    NOW(), NOW(), NOW(), 'authenticated', 'authenticated',
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Jordan Martinez"}'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.profiles (
    id, name, role, gym_id, gym_ids, age_category, student_preferences
  ) VALUES (
    v_user_id, 'Jordan Martinez', 'student',
    v_jiujitsio_gym_id,
    ARRAY[v_jiujitsio_gym_id, v_jiujitsio_west_gym_id],
    'adult',
    jsonb_build_object(
      'preferred_class_types', ARRAY['GI', 'Competition'],
      'preferred_times', ARRAY['morning', 'evening'],
      'skill_level', 'advanced',
      'goals', ARRAY['competition', 'technique']
    )
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    age_category = EXCLUDED.age_category,
    student_preferences = EXCLUDED.student_preferences;
  
  IF v_jiujitsio_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_user_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  IF v_jiujitsio_west_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_west_chat_id, v_user_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Created: Jordan Martinez (Adult, Advanced, Both Gyms, Competition)';
  
  -- ============================================================================
  -- 3. Teen Student - Jiujitsio - All Levels
  -- ============================================================================
  v_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, aud, role,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    'sam.teen@demo.com',
    '$2a$10$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    NOW(), NOW(), NOW(), 'authenticated', 'authenticated',
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Sam Johnson"}'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.profiles (
    id, name, role, gym_id, gym_ids, age_category, student_preferences
  ) VALUES (
    v_user_id, 'Sam Johnson', 'student',
    v_jiujitsio_gym_id,
    ARRAY[v_jiujitsio_gym_id],
    'teen',
    jsonb_build_object(
      'preferred_class_types', ARRAY['No-GI'],
      'preferred_times', ARRAY['afternoon', 'evening'],
      'skill_level', 'all_levels',
      'goals', ARRAY['fitness', 'self_defense', 'fun']
    )
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    age_category = EXCLUDED.age_category,
    student_preferences = EXCLUDED.student_preferences;
  
  IF v_jiujitsio_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_user_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Created: Sam Johnson (Teen, All Levels, Jiujitsio)';
  
  -- ============================================================================
  -- 4. Kid Student - Both Gyms
  -- ============================================================================
  v_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, aud, role,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    'mia.kid@demo.com',
    '$2a$10$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    NOW(), NOW(), NOW(), 'authenticated', 'authenticated',
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Mia Rodriguez"}'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.profiles (
    id, name, role, gym_id, gym_ids, age_category, student_preferences
  ) VALUES (
    v_user_id, 'Mia Rodriguez', 'student',
    v_jiujitsio_gym_id,
    ARRAY[v_jiujitsio_gym_id, v_jiujitsio_west_gym_id],
    'junior',
    jsonb_build_object(
      'preferred_class_types', ARRAY['GI', 'No-GI'],
      'preferred_times', ARRAY['afternoon'],
      'skill_level', 'fundamentals',
      'goals', ARRAY['fun', 'discipline', 'fitness']
    )
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    age_category = EXCLUDED.age_category,
    student_preferences = EXCLUDED.student_preferences;
  
  IF v_jiujitsio_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_user_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  IF v_jiujitsio_west_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_west_chat_id, v_user_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Created: Mia Rodriguez (Kid, Fundamentals, Both Gyms)';
  
  -- ============================================================================
  -- 5. Parent Who Trains - Jiujitsio West
  -- ============================================================================
  v_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, aud, role,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    'parent.trainer@demo.com',
    '$2a$10$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    NOW(), NOW(), NOW(), 'authenticated', 'authenticated',
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Taylor Smith"}'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.profiles (
    id, name, role, gym_id, gym_ids, age_category, student_preferences
  ) VALUES (
    v_user_id, 'Taylor Smith', 'student',
    v_jiujitsio_west_gym_id,
    ARRAY[v_jiujitsio_west_gym_id],
    'adult',
    jsonb_build_object(
      'preferred_class_types', ARRAY['GI'],
      'preferred_times', ARRAY['evening'],
      'skill_level', 'fundamentals',
      'goals', ARRAY['fitness', 'self_defense', 'family_activity'],
      'is_parent', true,
      'has_children_training', true
    )
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    age_category = EXCLUDED.age_category,
    student_preferences = EXCLUDED.student_preferences;
  
  IF v_jiujitsio_west_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_west_chat_id, v_user_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Created: Taylor Smith (Parent Who Trains, Fundamentals, Jiujitsio West)';
  
  -- ============================================================================
  -- 6. Beginner Adult - No-GI Focus - Jiujitsio West
  -- ============================================================================
  v_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, aud, role,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    'casey.beginner@demo.com',
    '$2a$10$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    NOW(), NOW(), NOW(), 'authenticated', 'authenticated',
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Casey Thompson"}'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.profiles (
    id, name, role, gym_id, gym_ids, age_category, student_preferences
  ) VALUES (
    v_user_id, 'Casey Thompson', 'student',
    v_jiujitsio_west_gym_id,
    ARRAY[v_jiujitsio_west_gym_id],
    'adult',
    jsonb_build_object(
      'preferred_class_types', ARRAY['No-GI'],
      'preferred_times', ARRAY['evening'],
      'skill_level', 'fundamentals',
      'goals', ARRAY['fitness', 'weight_loss', 'technique']
    )
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    age_category = EXCLUDED.age_category,
    student_preferences = EXCLUDED.student_preferences;
  
  IF v_jiujitsio_west_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_west_chat_id, v_user_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Created: Casey Thompson (Adult, Beginner, No-GI, Jiujitsio West)';
  
  -- ============================================================================
  -- 7. Pee Wee Kid - Jiujitsio
  -- ============================================================================
  v_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, aud, role,
    raw_app_meta_data, raw_user_meta_data
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    'lily.peewee@demo.com',
    '$2a$10$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    NOW(), NOW(), NOW(), 'authenticated', 'authenticated',
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Lily Williams"}'
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.profiles (
    id, name, role, gym_id, gym_ids, age_category, student_preferences
  ) VALUES (
    v_user_id, 'Lily Williams', 'student',
    v_jiujitsio_gym_id,
    ARRAY[v_jiujitsio_gym_id],
    'pee_wee',
    jsonb_build_object(
      'preferred_class_types', ARRAY['GI'],
      'preferred_times', ARRAY['afternoon'],
      'skill_level', 'all_levels',
      'goals', ARRAY['fun', 'discipline']
    )
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    age_category = EXCLUDED.age_category,
    student_preferences = EXCLUDED.student_preferences;
  
  IF v_jiujitsio_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_user_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Created: Lily Williams (Pee Wee, 5-7 years, Jiujitsio)';
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 All demo students created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Demo Student Logins (all passwords: demo123456):';
  RAISE NOTICE '';
  RAISE NOTICE '1. alex.student@demo.com       - Adult, All Levels, Jiujitsio';
  RAISE NOTICE '2. jordan.competitor@demo.com  - Adult, Advanced, Both Gyms, Competition';
  RAISE NOTICE '3. sam.teen@demo.com           - Teen, All Levels, Jiujitsio';
  RAISE NOTICE '4. mia.kid@demo.com            - Kid (8-12), Both Gyms, Fundamentals';
  RAISE NOTICE '5. parent.trainer@demo.com     - Parent Who Trains, Jiujitsio West';
  RAISE NOTICE '6. casey.beginner@demo.com     - Adult, Beginner, No-GI, Jiujitsio West';
  RAISE NOTICE '7. lily.peewee@demo.com        - Pee Wee (5-7), Jiujitsio';
  RAISE NOTICE '';
  
END $$;

