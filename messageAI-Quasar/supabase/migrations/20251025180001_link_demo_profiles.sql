-- Link demo accounts to profiles and gyms
-- Run this AFTER creating the auth users via Supabase Dashboard
-- See: CREATE_DEMO_ACCOUNTS_PROPERLY.md

DO $$
DECLARE
  v_jiujitsio_gym_id UUID;
  v_jiujitsio_west_gym_id UUID;
  v_jiujitsio_chat_id UUID;
  v_jiujitsio_west_chat_id UUID;
  v_user_id UUID;
  v_count INT := 0;
BEGIN
  -- Get gym IDs
  SELECT id, gym_chat_id INTO v_jiujitsio_gym_id, v_jiujitsio_chat_id
  FROM public.gyms
  WHERE name = 'Jiujitsio'
  LIMIT 1;
  
  SELECT id, gym_chat_id INTO v_jiujitsio_west_gym_id, v_jiujitsio_west_chat_id
  FROM public.gyms
  WHERE name = 'Jiujitsio West'
  LIMIT 1;
  
  IF v_jiujitsio_gym_id IS NULL THEN
    RAISE EXCEPTION 'Jiujitsio gym not found! Run the gym seeding migration first.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Linking demo accounts to profiles and gyms...';
  RAISE NOTICE '';
  
  -- ============================================================================
  -- 1. Alex Chen - Adult, All Levels, Jiujitsio
  -- ============================================================================
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'alex.student@demo.com';
  
  IF v_user_id IS NOT NULL THEN
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
      student_preferences = EXCLUDED.student_preferences,
      updated_at = NOW();
    
    IF v_jiujitsio_chat_id IS NOT NULL THEN
      INSERT INTO public.chat_members (chat_id, user_id, role, joined_at)
      VALUES (v_jiujitsio_chat_id, v_user_id, 'member', NOW())
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
    
    v_count := v_count + 1;
    RAISE NOTICE '✅ Linked: Alex Chen';
  ELSE
    RAISE WARNING '⚠️  User not found: alex.student@demo.com (create in Dashboard first)';
  END IF;
  
  -- ============================================================================
  -- 2. Jordan Martinez - Adult, Advanced, Both Gyms
  -- ============================================================================
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'jordan.competitor@demo.com';
  
  IF v_user_id IS NOT NULL THEN
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
      student_preferences = EXCLUDED.student_preferences,
      updated_at = NOW();
    
    IF v_jiujitsio_chat_id IS NOT NULL THEN
      INSERT INTO public.chat_members (chat_id, user_id, role, joined_at)
      VALUES (v_jiujitsio_chat_id, v_user_id, 'member', NOW())
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
    
    IF v_jiujitsio_west_chat_id IS NOT NULL THEN
      INSERT INTO public.chat_members (chat_id, user_id, role, joined_at)
      VALUES (v_jiujitsio_west_chat_id, v_user_id, 'member', NOW())
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
    
    v_count := v_count + 1;
    RAISE NOTICE '✅ Linked: Jordan Martinez (Both Gyms)';
  ELSE
    RAISE WARNING '⚠️  User not found: jordan.competitor@demo.com (create in Dashboard first)';
  END IF;
  
  -- ============================================================================
  -- 3. Sam Johnson - Teen, Jiujitsio
  -- ============================================================================
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'sam.teen@demo.com';
  
  IF v_user_id IS NOT NULL THEN
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
      student_preferences = EXCLUDED.student_preferences,
      updated_at = NOW();
    
    IF v_jiujitsio_chat_id IS NOT NULL THEN
      INSERT INTO public.chat_members (chat_id, user_id, role, joined_at)
      VALUES (v_jiujitsio_chat_id, v_user_id, 'member', NOW())
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
    
    v_count := v_count + 1;
    RAISE NOTICE '✅ Linked: Sam Johnson';
  ELSE
    RAISE WARNING '⚠️  User not found: sam.teen@demo.com (create in Dashboard first)';
  END IF;
  
  -- ============================================================================
  -- 4. Taylor Smith - Parent Who Trains, Jiujitsio West
  -- ============================================================================
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'parent.trainer@demo.com';
  
  IF v_user_id IS NOT NULL THEN
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
      student_preferences = EXCLUDED.student_preferences,
      updated_at = NOW();
    
    IF v_jiujitsio_west_chat_id IS NOT NULL THEN
      INSERT INTO public.chat_members (chat_id, user_id, role, joined_at)
      VALUES (v_jiujitsio_west_chat_id, v_user_id, 'member', NOW())
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
    
    v_count := v_count + 1;
    RAISE NOTICE '✅ Linked: Taylor Smith';
  ELSE
    RAISE WARNING '⚠️  User not found: parent.trainer@demo.com (create in Dashboard first)';
  END IF;
  
  -- ============================================================================
  -- 5. Casey Thompson - Beginner, Jiujitsio West
  -- ============================================================================
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'casey.beginner@demo.com';
  
  IF v_user_id IS NOT NULL THEN
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
      student_preferences = EXCLUDED.student_preferences,
      updated_at = NOW();
    
    IF v_jiujitsio_west_chat_id IS NOT NULL THEN
      INSERT INTO public.chat_members (chat_id, user_id, role, joined_at)
      VALUES (v_jiujitsio_west_chat_id, v_user_id, 'member', NOW())
      ON CONFLICT (chat_id, user_id) DO NOTHING;
    END IF;
    
    v_count := v_count + 1;
    RAISE NOTICE '✅ Linked: Casey Thompson';
  ELSE
    RAISE WARNING '⚠️  User not found: casey.beginner@demo.com (create in Dashboard first)';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Successfully linked % demo account(s)!', v_count;
  RAISE NOTICE '';
  
  IF v_count < 5 THEN
    RAISE NOTICE '⚠️  Some accounts were not found. Create them via:';
    RAISE NOTICE '   Supabase Dashboard → Authentication → Users';
    RAISE NOTICE '   See: CREATE_DEMO_ACCOUNTS_PROPERLY.md';
  ELSE
    RAISE NOTICE '✨ All demo accounts ready to use!';
  END IF;
  
END $$;

