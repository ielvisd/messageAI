-- Create demo owner and instructor accounts for the main Jiujitsio gym
-- Password for all accounts: demo123456

DO $$
DECLARE
  v_jiujitsio_gym_id UUID;
  v_jiujitsio_chat_id UUID;
  v_owner_id UUID;
  v_instructor_id UUID;
BEGIN
  -- Get Jiujitsio gym ID
  SELECT id, gym_chat_id INTO v_jiujitsio_gym_id, v_jiujitsio_chat_id
  FROM public.gyms
  WHERE LOWER(name) = 'jiujitsio'
  LIMIT 1;
  
  IF v_jiujitsio_gym_id IS NULL THEN
    RAISE WARNING 'Jiujitsio gym not found! Creating one...';
    -- Create the gym if it doesn't exist
    INSERT INTO public.gyms (name, locations, created_at)
    VALUES (
      'Jiujitsio',
      '["North Location", "South Location"]'::jsonb,
      NOW()
    )
    RETURNING id INTO v_jiujitsio_gym_id;
    
    -- Create gym chat
    INSERT INTO public.chats (type, name)
    VALUES ('group', 'Jiujitsio - All Members')
    RETURNING id INTO v_jiujitsio_chat_id;
    
    -- Link chat to gym
    UPDATE public.gyms
    SET gym_chat_id = v_jiujitsio_chat_id
    WHERE id = v_jiujitsio_gym_id;
  END IF;
  
  RAISE NOTICE '🏋️ Creating demo owner and instructor accounts for Jiujitsio...';
  RAISE NOTICE '';
  
  -- ============================================================================
  -- 1. Create Owner Account - John Silva
  -- ============================================================================
  
  -- Check if owner account already exists
  SELECT id INTO v_owner_id FROM auth.users WHERE email = 'owner@jiujitsio.com';
  
  IF v_owner_id IS NULL THEN
    v_owner_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, aud, role,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      v_owner_id, '00000000-0000-0000-0000-000000000000',
      'owner@jiujitsio.com',
      crypt('demo123456', gen_salt('bf')),
      NOW(), NOW(), NOW(), 'authenticated', 'authenticated',
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "John Silva"}'
    );
  ELSE
    -- Update password if user already exists
    UPDATE auth.users
    SET encrypted_password = crypt('demo123456', gen_salt('bf'))
    WHERE id = v_owner_id;
  END IF;
  
  -- Create/update owner profile
  INSERT INTO public.profiles (
    id, name, email, role, gym_id, gym_ids, owned_gym_ids
  ) VALUES (
    v_owner_id, 'John Silva', 'owner@jiujitsio.com', 'owner',
    v_jiujitsio_gym_id,
    ARRAY[v_jiujitsio_gym_id],
    ARRAY[v_jiujitsio_gym_id]
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    owned_gym_ids = EXCLUDED.owned_gym_ids;
    
  -- Update gym owner_id
  UPDATE public.gyms
  SET owner_id = v_owner_id
  WHERE id = v_jiujitsio_gym_id;
  
  -- Add owner to gym chat
  IF v_jiujitsio_chat_id IS NOT NULL THEN
    INSERT INTO chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_owner_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Created Owner: John Silva (owner@jiujitsio.com)';
  
  -- ============================================================================
  -- 2. Create Instructor 1 - Professor Carlos Martinez
  -- ============================================================================
  
  SELECT id INTO v_instructor_id FROM auth.users WHERE email = 'carlos.martinez@jiujitsio.com';
  
  IF v_instructor_id IS NULL THEN
    v_instructor_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, aud, role,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      v_instructor_id, '00000000-0000-0000-0000-000000000000',
      'carlos.martinez@jiujitsio.com',
      crypt('demo123456', gen_salt('bf')),
      NOW(), NOW(), NOW(), 'authenticated', 'authenticated',
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Professor Carlos Martinez"}'
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('demo123456', gen_salt('bf'))
    WHERE id = v_instructor_id;
  END IF;
  
  INSERT INTO public.profiles (
    id, name, email, role, gym_id, gym_ids,
    instructor_preferences
  ) VALUES (
    v_instructor_id, 'Professor Carlos Martinez', 'carlos.martinez@jiujitsio.com', 'instructor',
    v_jiujitsio_gym_id,
    ARRAY[v_jiujitsio_gym_id],
    '{
      "prefers_gi": true,
      "prefers_nogi": true,
      "can_teach_kids": true,
      "can_teach_fundamentals": true,
      "can_teach_advanced": true,
      "can_teach_competition": true,
      "available_for_private_lessons": true,
      "private_lesson_rate": 100,
      "specialties": ["Competition Training", "Advanced Techniques"],
      "certifications": ["Black Belt", "IBJJF Certified"]
    }'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    instructor_preferences = EXCLUDED.instructor_preferences;
    
  IF v_jiujitsio_chat_id IS NOT NULL THEN
    INSERT INTO chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_instructor_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Created Instructor: Professor Carlos Martinez (carlos.martinez@jiujitsio.com)';
  
  -- ============================================================================
  -- 3. Create Instructor 2 - Coach Ana Rodriguez
  -- ============================================================================
  
  SELECT id INTO v_instructor_id FROM auth.users WHERE email = 'ana.rodriguez@jiujitsio.com';
  
  IF v_instructor_id IS NULL THEN
    v_instructor_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, aud, role,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      v_instructor_id, '00000000-0000-0000-0000-000000000000',
      'ana.rodriguez@jiujitsio.com',
      crypt('demo123456', gen_salt('bf')),
      NOW(), NOW(), NOW(), 'authenticated', 'authenticated',
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Coach Ana Rodriguez"}'
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('demo123456', gen_salt('bf'))
    WHERE id = v_instructor_id;
  END IF;
  
  INSERT INTO public.profiles (
    id, name, email, role, gym_id, gym_ids,
    instructor_preferences
  ) VALUES (
    v_instructor_id, 'Coach Ana Rodriguez', 'ana.rodriguez@jiujitsio.com', 'instructor',
    v_jiujitsio_gym_id,
    ARRAY[v_jiujitsio_gym_id],
    '{
      "prefers_gi": true,
      "prefers_nogi": false,
      "can_teach_kids": true,
      "can_teach_fundamentals": true,
      "can_teach_advanced": false,
      "can_teach_competition": false,
      "available_for_private_lessons": true,
      "private_lesson_rate": 75,
      "specialties": ["Kids Classes", "Fundamentals", "Women''s Self Defense"],
      "certifications": ["Brown Belt", "Kids Instructor Certified"]
    }'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    instructor_preferences = EXCLUDED.instructor_preferences;
    
  IF v_jiujitsio_chat_id IS NOT NULL THEN
    INSERT INTO chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_instructor_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Created Instructor: Coach Ana Rodriguez (ana.rodriguez@jiujitsio.com)';
  
  -- ============================================================================
  -- 4. Create Instructor 3 - Professor Mike Chen
  -- ============================================================================
  
  SELECT id INTO v_instructor_id FROM auth.users WHERE email = 'mike.chen@jiujitsio.com';
  
  IF v_instructor_id IS NULL THEN
    v_instructor_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, aud, role,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      v_instructor_id, '00000000-0000-0000-0000-000000000000',
      'mike.chen@jiujitsio.com',
      crypt('demo123456', gen_salt('bf')),
      NOW(), NOW(), NOW(), 'authenticated', 'authenticated',
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Professor Mike Chen"}'
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('demo123456', gen_salt('bf'))
    WHERE id = v_instructor_id;
  END IF;
  
  INSERT INTO public.profiles (
    id, name, email, role, gym_id, gym_ids,
    instructor_preferences
  ) VALUES (
    v_instructor_id, 'Professor Mike Chen', 'mike.chen@jiujitsio.com', 'instructor',
    v_jiujitsio_gym_id,
    ARRAY[v_jiujitsio_gym_id],
    '{
      "prefers_gi": false,
      "prefers_nogi": true,
      "can_teach_kids": false,
      "can_teach_fundamentals": true,
      "can_teach_advanced": true,
      "can_teach_competition": true,
      "available_for_private_lessons": true,
      "private_lesson_rate": 90,
      "specialties": ["No-Gi", "MMA Grappling", "Wrestling"],
      "certifications": ["Black Belt No-Gi", "Wrestling Coach"]
    }'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    instructor_preferences = EXCLUDED.instructor_preferences;
    
  IF v_jiujitsio_chat_id IS NOT NULL THEN
    INSERT INTO chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_instructor_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Created Instructor: Professor Mike Chen (mike.chen@jiujitsio.com)';
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Demo accounts created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Login Credentials (all passwords: demo123456):';
  RAISE NOTICE '   Owner: owner@jiujitsio.com';
  RAISE NOTICE '   Instructor 1: carlos.martinez@jiujitsio.com';
  RAISE NOTICE '   Instructor 2: ana.rodriguez@jiujitsio.com';
  RAISE NOTICE '   Instructor 3: mike.chen@jiujitsio.com';
END $$;

