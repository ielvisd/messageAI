-- Update demo owner and instructor profiles after creating auth users via Dashboard
-- Run this AFTER creating the auth users in Supabase Dashboard

DO $$
DECLARE
  v_jiujitsio_gym_id uuid;
  v_jiujitsio_chat_id uuid;
  v_jiujitsio_west_gym_id uuid;
  v_jiujitsio_west_chat_id uuid;
  v_both_gym_ids uuid[];
  v_owner_id uuid;
  v_carlos_id uuid;
  v_ana_id uuid;
  v_mike_id uuid;
BEGIN
  RAISE NOTICE '🔧 Updating demo profiles...';
  
  -- Get Jiujitsio gym and chat IDs (lowercase!)
  SELECT id, gym_chat_id INTO v_jiujitsio_gym_id, v_jiujitsio_chat_id
  FROM gyms 
  WHERE name = 'jiujitsio' 
  LIMIT 1;
  
  -- Get Jiujitsio West gym and chat IDs
  SELECT id, gym_chat_id INTO v_jiujitsio_west_gym_id, v_jiujitsio_west_chat_id
  FROM gyms 
  WHERE name = 'Jiujitsio West' 
  LIMIT 1;
  
  IF v_jiujitsio_gym_id IS NULL THEN
    RAISE EXCEPTION 'jiujitsio gym not found!';
  END IF;
  
  RAISE NOTICE '✅ Found Jiujitsio gym: %', v_jiujitsio_gym_id;
  
  IF v_jiujitsio_west_gym_id IS NOT NULL THEN
    RAISE NOTICE '✅ Found Jiujitsio West gym: %', v_jiujitsio_west_gym_id;
    v_both_gym_ids := ARRAY[v_jiujitsio_gym_id, v_jiujitsio_west_gym_id];
  ELSE
    RAISE NOTICE '⚠️  Jiujitsio West gym not found - will only add to Jiujitsio';
    v_both_gym_ids := ARRAY[v_jiujitsio_gym_id];
  END IF;
  
  -- Get user IDs
  SELECT id INTO v_owner_id FROM profiles WHERE email = 'owner@jiujitsio.com';
  SELECT id INTO v_carlos_id FROM profiles WHERE email = 'carlos.martinez@jiujitsio.com';
  SELECT id INTO v_ana_id FROM profiles WHERE email = 'ana.rodriguez@jiujitsio.com';
  SELECT id INTO v_mike_id FROM profiles WHERE email = 'mike.chen@jiujitsio.com';
  
  -- Update Owner Profile
  IF v_owner_id IS NOT NULL THEN
    UPDATE profiles 
    SET 
      name = 'John Silva',
      role = 'owner',
      gym_id = v_jiujitsio_gym_id,
      gym_ids = v_both_gym_ids,
      owned_gym_ids = v_both_gym_ids,
      birthdate = '1975-03-15',
      age_category = 'adult'
    WHERE id = v_owner_id;
    
    -- Update both gyms' owner_id
    UPDATE gyms 
    SET owner_id = v_owner_id 
    WHERE id = ANY(v_both_gym_ids);
    
    -- Add to Jiujitsio gym chat
    INSERT INTO chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_owner_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    
    -- Add to Jiujitsio West gym chat (if exists)
    IF v_jiujitsio_west_chat_id IS NOT NULL THEN
      INSERT INTO chat_members (chat_id, user_id, joined_at)
      VALUES (v_jiujitsio_west_chat_id, v_owner_id, NOW())
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE '✅ Updated Owner: John Silva (owns both gyms)';
  ELSE
    RAISE NOTICE '⚠️  Owner account not found. Create owner@jiujitsio.com in Dashboard first.';
  END IF;
  
  -- Update Carlos (Instructor 1)
  IF v_carlos_id IS NOT NULL THEN
    UPDATE profiles 
    SET 
      name = 'Professor Carlos Martinez',
      role = 'instructor',
      gym_id = v_jiujitsio_gym_id,
      gym_ids = v_both_gym_ids,
      birthdate = '1985-07-22',
      age_category = 'adult',
      instructor_preferences = jsonb_build_object(
        'specialties', ARRAY['Competition Training', 'Advanced Techniques'],
        'availability', jsonb_build_object(
          'monday', ARRAY['18:00-21:00'],
          'wednesday', ARRAY['18:00-21:00'],
          'friday', ARRAY['18:00-21:00']
        ),
        'bio', 'Black belt with 15+ years experience. Specializes in competition preparation.'
      ),
      private_lessons_enabled = true
    WHERE id = v_carlos_id;
    
    -- Add to both gym chats
    INSERT INTO chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_carlos_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    
    IF v_jiujitsio_west_chat_id IS NOT NULL THEN
      INSERT INTO chat_members (chat_id, user_id, joined_at)
      VALUES (v_jiujitsio_west_chat_id, v_carlos_id, NOW())
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE '✅ Updated Instructor: Professor Carlos Martinez (both gyms)';
  ELSE
    RAISE NOTICE '⚠️  Carlos account not found. Create carlos.martinez@jiujitsio.com in Dashboard first.';
  END IF;
  
  -- Update Ana (Instructor 2)
  IF v_ana_id IS NOT NULL THEN
    UPDATE profiles 
    SET 
      name = 'Coach Ana Rodriguez',
      role = 'instructor',
      gym_id = v_jiujitsio_gym_id,
      gym_ids = v_both_gym_ids,
      birthdate = '1990-11-08',
      age_category = 'adult',
      instructor_preferences = jsonb_build_object(
        'specialties', ARRAY['Kids Classes', 'Fundamentals', 'Women''s BJJ'],
        'availability', jsonb_build_object(
          'tuesday', ARRAY['16:00-19:00'],
          'thursday', ARRAY['16:00-19:00'],
          'saturday', ARRAY['10:00-13:00']
        ),
        'bio', 'Brown belt specializing in kids and fundamentals classes.'
      ),
      private_lessons_enabled = true
    WHERE id = v_ana_id;
    
    -- Add to both gym chats
    INSERT INTO chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_ana_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    
    IF v_jiujitsio_west_chat_id IS NOT NULL THEN
      INSERT INTO chat_members (chat_id, user_id, joined_at)
      VALUES (v_jiujitsio_west_chat_id, v_ana_id, NOW())
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE '✅ Updated Instructor: Coach Ana Rodriguez (both gyms)';
  ELSE
    RAISE NOTICE '⚠️  Ana account not found. Create ana.rodriguez@jiujitsio.com in Dashboard first.';
  END IF;
  
  -- Update Mike (Instructor 3)
  IF v_mike_id IS NOT NULL THEN
    UPDATE profiles 
    SET 
      name = 'Professor Mike Chen',
      role = 'instructor',
      gym_id = v_jiujitsio_gym_id,
      gym_ids = v_both_gym_ids,
      birthdate = '1988-04-30',
      age_category = 'adult',
      instructor_preferences = jsonb_build_object(
        'specialties', ARRAY['No-GI', 'MMA Grappling', 'Wrestling'],
        'availability', jsonb_build_object(
          'monday', ARRAY['19:00-21:00'],
          'wednesday', ARRAY['19:00-21:00'],
          'saturday', ARRAY['14:00-16:00']
        ),
        'bio', 'Black belt in BJJ, wrestling background. Specializes in no-gi and MMA grappling.'
      ),
      private_lessons_enabled = true
    WHERE id = v_mike_id;
    
    -- Add to both gym chats
    INSERT INTO chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_mike_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    
    IF v_jiujitsio_west_chat_id IS NOT NULL THEN
      INSERT INTO chat_members (chat_id, user_id, joined_at)
      VALUES (v_jiujitsio_west_chat_id, v_mike_id, NOW())
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
    
    RAISE NOTICE '✅ Updated Instructor: Professor Mike Chen (both gyms)';
  ELSE
    RAISE NOTICE '⚠️  Mike account not found. Create mike.chen@jiujitsio.com in Dashboard first.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Profile updates complete!';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Demo Login Credentials (password: demo123456):';
  RAISE NOTICE '  Owner: owner@jiujitsio.com';
  RAISE NOTICE '  Instructor 1: carlos.martinez@jiujitsio.com';
  RAISE NOTICE '  Instructor 2: ana.rodriguez@jiujitsio.com';
  RAISE NOTICE '  Instructor 3: mike.chen@jiujitsio.com';
END $$;

