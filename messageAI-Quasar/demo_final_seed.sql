-- ============================================================================
-- OSSOME - FINAL DEMO SEED SCRIPT
-- ============================================================================
-- Purpose: Ensure all required test data exists for demo video recording
-- Run this before recording to guarantee a smooth demo
-- ============================================================================

DO $$
DECLARE
  v_jiujitsio_gym_id UUID;
  v_gym_chat_id UUID;
  v_owner_id UUID;
  v_carlos_id UUID;
  v_ana_id UUID;
  v_owner_carlos_chat_id UUID;
  v_tomorrow_date DATE;
BEGIN
  -- ============================================================================
  -- 1. VERIFY GYM AND ACCOUNTS EXIST
  -- ============================================================================
  
  RAISE NOTICE '🔍 Verifying demo accounts and gym...';
  
  -- Get Jiujitsio gym
  SELECT id, gym_chat_id INTO v_jiujitsio_gym_id, v_gym_chat_id
  FROM public.gyms
  WHERE LOWER(name) = 'jiujitsio'
  LIMIT 1;
  
  IF v_jiujitsio_gym_id IS NULL THEN
    RAISE EXCEPTION 'Jiujitsio gym not found! Run 20251025190003_create_owner_and_instructors.sql first';
  END IF;
  
  -- Get account IDs
  SELECT id INTO v_owner_id FROM public.profiles WHERE email = 'owner@jiujitsio.com';
  SELECT id INTO v_carlos_id FROM public.profiles WHERE email = 'carlos.martinez@jiujitsio.com';
  SELECT id INTO v_ana_id FROM public.profiles WHERE email = 'ana.rodriguez@jiujitsio.com';
  
  IF v_owner_id IS NULL OR v_carlos_id IS NULL OR v_ana_id IS NULL THEN
    RAISE EXCEPTION 'Demo accounts not found! Run 20251025190003_create_owner_and_instructors.sql first';
  END IF;
  
  RAISE NOTICE '✅ All accounts verified';
  RAISE NOTICE '   Owner: % (owner@jiujitsio.com)', v_owner_id;
  RAISE NOTICE '   Carlos: % (carlos.martinez@jiujitsio.com)', v_carlos_id;
  RAISE NOTICE '   Ana: % (ana.rodriguez@jiujitsio.com)', v_ana_id;
  
  -- ============================================================================
  -- 2. ENSURE GROUP CHAT EXISTS WITH ALL 3 MEMBERS
  -- ============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '💬 Setting up group chat...';
  
  IF v_gym_chat_id IS NULL THEN
    -- Create gym group chat
    INSERT INTO public.chats (type, name, created_at)
    VALUES ('group', 'Jiujitsio - All Members', NOW())
    RETURNING id INTO v_gym_chat_id;
    
    -- Link to gym
    UPDATE public.gyms
    SET gym_chat_id = v_gym_chat_id
    WHERE id = v_jiujitsio_gym_id;
    
    RAISE NOTICE '✅ Created gym group chat: %', v_gym_chat_id;
  ELSE
    RAISE NOTICE '✅ Gym group chat already exists: %', v_gym_chat_id;
  END IF;
  
  -- Ensure all 3 members are in the group chat
  INSERT INTO public.chat_members (chat_id, user_id, joined_at)
  VALUES 
    (v_gym_chat_id, v_owner_id, NOW()),
    (v_gym_chat_id, v_carlos_id, NOW()),
    (v_gym_chat_id, v_ana_id, NOW())
  ON CONFLICT (chat_id, user_id) DO NOTHING;
  
  RAISE NOTICE '✅ All 3 members added to group chat';
  
  -- ============================================================================
  -- 3. CREATE 1:1 CHAT BETWEEN OWNER AND CARLOS (IF NOT EXISTS)
  -- ============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '💬 Setting up 1:1 chats...';
  
  -- Check if chat exists
  SELECT c.id INTO v_owner_carlos_chat_id
  FROM public.chats c
  JOIN public.chat_members cm1 ON c.id = cm1.chat_id AND cm1.user_id = v_owner_id
  JOIN public.chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id = v_carlos_id
  WHERE c.type = 'direct'
  LIMIT 1;
  
  IF v_owner_carlos_chat_id IS NULL THEN
    -- Create 1:1 chat
    INSERT INTO public.chats (type, created_at)
    VALUES ('direct', NOW())
    RETURNING id INTO v_owner_carlos_chat_id;
    
    -- Add both members
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES 
      (v_owner_carlos_chat_id, v_owner_id, NOW()),
      (v_owner_carlos_chat_id, v_carlos_id, NOW());
    
    RAISE NOTICE '✅ Created 1:1 chat between Owner and Carlos: %', v_owner_carlos_chat_id;
    
    -- Add a couple sample messages for demo context
    INSERT INTO public.messages (chat_id, sender_id, content, created_at)
    VALUES 
      (v_owner_carlos_chat_id, v_owner_id, 'Hey Carlos, are you available this week?', NOW() - INTERVAL '2 days'),
      (v_owner_carlos_chat_id, v_carlos_id, 'Yes, I can teach Monday through Friday', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes');
    
    RAISE NOTICE '✅ Added sample messages to 1:1 chat';
  ELSE
    RAISE NOTICE '✅ 1:1 chat already exists: %', v_owner_carlos_chat_id;
  END IF;
  
  -- ============================================================================
  -- 4. CREATE UNASSIGNED CLASS FOR TOMORROW (CRITICAL FOR AI DEMO)
  -- ============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '🚨 Creating unassigned class for AI problem detection...';
  
  v_tomorrow_date := CURRENT_DATE + INTERVAL '1 day';
  
  -- Get day of week for tomorrow
  DECLARE
    v_tomorrow_day TEXT;
    v_unassigned_schedule_id UUID;
  BEGIN
    v_tomorrow_day := TO_CHAR(v_tomorrow_date, 'Day');
    v_tomorrow_day := TRIM(v_tomorrow_day);
    
    -- Check if unassigned schedule already exists for tomorrow
    SELECT id INTO v_unassigned_schedule_id
    FROM public.gym_schedules
    WHERE gym_id = v_jiujitsio_gym_id
      AND day_of_week = v_tomorrow_day
      AND instructor_id IS NULL
      AND is_cancelled = FALSE
    LIMIT 1;
    
    IF v_unassigned_schedule_id IS NULL THEN
      -- Create unassigned class for tomorrow
      INSERT INTO public.gym_schedules (
        gym_id,
        class_type,
        day_of_week,
        start_time,
        end_time,
        max_capacity,
        instructor_id,
        level,
        created_at
      ) VALUES (
        v_jiujitsio_gym_id,
        'GI',
        v_tomorrow_day,
        '19:00',
        '20:30',
        20,
        NULL, -- NO INSTRUCTOR ASSIGNED (This is the problem!)
        'All Levels',
        NOW()
      )
      RETURNING id INTO v_unassigned_schedule_id;
      
      RAISE NOTICE '🚨 CRITICAL: Created unassigned GI class for % at 7:00 PM', v_tomorrow_day;
      RAISE NOTICE '   Schedule ID: %', v_unassigned_schedule_id;
      RAISE NOTICE '   This will trigger CRITICAL alert in AI problem detection!';
    ELSE
      RAISE NOTICE '✅ Unassigned class already exists: %', v_unassigned_schedule_id;
    END IF;
  END;
  
  -- ============================================================================
  -- 5. VERIFY SCHEDULES EXIST
  -- ============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '📅 Verifying schedules...';
  
  DECLARE
    v_schedule_count INT;
  BEGIN
    SELECT COUNT(*) INTO v_schedule_count
    FROM public.gym_schedules
    WHERE gym_id = v_jiujitsio_gym_id;
    
    IF v_schedule_count < 5 THEN
      RAISE WARNING 'Only % schedules found. Recommend having at least 5-10 for demo', v_schedule_count;
      RAISE WARNING 'Run: pnpm db:apply supabase/migrations/20251024010000_seed_gym_data.sql';
    ELSE
      RAISE NOTICE '✅ Found % schedules - sufficient for demo', v_schedule_count;
    END IF;
  END;
  
  -- ============================================================================
  -- 6. SUMMARY
  -- ============================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '🎬 DEMO SETUP COMPLETE!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Demo Accounts (password: demo123456):';
  RAISE NOTICE '   1. owner@jiujitsio.com       (iPad - Owner)';
  RAISE NOTICE '   2. carlos.martinez@jiujitsio.com  (iPhone 1 - Instructor)';
  RAISE NOTICE '   3. ana.rodriguez@jiujitsio.com    (iPhone 2 - Instructor)';
  RAISE NOTICE '';
  RAISE NOTICE '💬 Chats Ready:';
  RAISE NOTICE '   ✅ Group chat: "Jiujitsio - All Members" (all 3 members)';
  RAISE NOTICE '   ✅ 1:1 chat: Owner <-> Carlos (with message history)';
  RAISE NOTICE '';
  RAISE NOTICE '🚨 AI Demo Problem:';
  RAISE NOTICE '   ✅ Unassigned class for TOMORROW at 7:00 PM (CRITICAL)';
  RAISE NOTICE '   ✅ AI will detect this when asked about schedule problems';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '   1. Open 3 simulators (iPad Pro + 2x iPhone 15 Pro)';
  RAISE NOTICE '   2. Login to all 3 accounts';
  RAISE NOTICE '   3. Follow FINAL_DEMO_SCRIPT.md';
  RAISE NOTICE '   4. Record with OBS';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 You are ready to record! Good luck! 🥋';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
END $$;

