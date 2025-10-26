-- ============================================================================
-- VERIFY DEMO DATA SCRIPT
-- ============================================================================
-- Purpose: Check that all required data exists before recording demo
-- Run this to diagnose any missing pieces
-- ============================================================================

\echo '═══════════════════════════════════════════════════════════════'
\echo '🔍 DEMO DATA VERIFICATION'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

-- 1. Check Demo Accounts
\echo '1️⃣ DEMO ACCOUNTS:'
\echo ''
SELECT 
  '✅ ' || name || ' (' || email || ') - ' || role AS account_status
FROM public.profiles
WHERE email IN (
  'owner@jiujitsio.com',
  'carlos.martinez@jiujitsio.com',
  'ana.rodriguez@jiujitsio.com'
)
ORDER BY 
  CASE role
    WHEN 'owner' THEN 1
    WHEN 'instructor' THEN 2
    ELSE 3
  END;

\echo ''

-- 2. Check Jiujitsio Gym
\echo '2️⃣ JIUJITSIO GYM:'
\echo ''
SELECT 
  '✅ Gym ID: ' || id AS gym_info,
  '   Group Chat ID: ' || COALESCE(gym_chat_id::TEXT, '❌ MISSING') AS chat_info
FROM public.gyms
WHERE LOWER(name) = 'jiujitsio';

\echo ''

-- 3. Check Group Chat Membership
\echo '3️⃣ GROUP CHAT MEMBERSHIP:'
\echo ''
SELECT 
  p.name || ' (' || p.role || ')' AS member
FROM public.gyms g
JOIN public.chat_members cm ON cm.chat_id = g.gym_chat_id
JOIN public.profiles p ON p.id = cm.user_id
WHERE LOWER(g.name) = 'jiujitsio'
ORDER BY 
  CASE p.role
    WHEN 'owner' THEN 1
    WHEN 'instructor' THEN 2
    ELSE 3
  END;

\echo ''

-- 4. Check 1:1 Chats
\echo '4️⃣ 1:1 CHATS:'
\echo ''
SELECT 
  c.id AS chat_id,
  p1.name || ' <-> ' || p2.name AS participants
FROM public.chats c
JOIN public.chat_members cm1 ON c.id = cm1.chat_id
JOIN public.chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id != cm1.user_id
JOIN public.profiles p1 ON p1.id = cm1.user_id
JOIN public.profiles p2 ON p2.id = cm2.user_id
WHERE c.type = 'direct'
  AND (
    p1.email = 'owner@jiujitsio.com' OR 
    p2.email = 'owner@jiujitsio.com'
  )
  AND (
    p1.email IN ('carlos.martinez@jiujitsio.com', 'ana.rodriguez@jiujitsio.com') OR
    p2.email IN ('carlos.martinez@jiujitsio.com', 'ana.rodriguez@jiujitsio.com')
  )
LIMIT 2;

\echo ''

-- 5. Check Schedules
\echo '5️⃣ GYM SCHEDULES:'
\echo ''
SELECT 
  COUNT(*) AS total_schedules,
  COUNT(*) FILTER (WHERE instructor_id IS NOT NULL) AS assigned_schedules,
  COUNT(*) FILTER (WHERE instructor_id IS NULL) AS unassigned_schedules
FROM public.gym_schedules gs
JOIN public.gyms g ON g.id = gs.gym_id
WHERE LOWER(g.name) = 'jiujitsio';

\echo ''

-- 6. Check CRITICAL: Unassigned Class for Tomorrow
\echo '6️⃣ 🚨 CRITICAL - UNASSIGNED CLASS FOR TOMORROW (Required for AI demo):'
\echo ''
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Found unassigned class for tomorrow'
    ELSE '❌ MISSING - Need to create unassigned class for AI demo!'
  END AS status,
  string_agg(
    class_type || ' - ' || day_of_week || ' ' || start_time || '-' || end_time,
    ', '
  ) AS unassigned_classes
FROM public.gym_schedules gs
JOIN public.gyms g ON g.id = gs.gym_id
WHERE LOWER(g.name) = 'jiujitsio'
  AND gs.instructor_id IS NULL
  AND gs.is_cancelled = FALSE
  AND gs.day_of_week = TRIM(TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'Day'));

\echo ''

-- 7. Check Sample Messages in 1:1 Chat
\echo '7️⃣ SAMPLE MESSAGES:'
\echo ''
SELECT 
  COUNT(*) AS message_count,
  MIN(timestamp) AS oldest_message,
  MAX(timestamp) AS newest_message
FROM public.messages m
JOIN public.chats c ON c.id = m.chat_id
WHERE c.type = 'direct';

\echo ''

-- 8. Summary
\echo '═══════════════════════════════════════════════════════════════'
\echo '📋 SUMMARY:'
\echo '═══════════════════════════════════════════════════════════════'

DO $$
DECLARE
  v_account_count INT;
  v_gym_exists BOOLEAN;
  v_group_chat_exists BOOLEAN;
  v_chat_member_count INT;
  v_direct_chat_exists BOOLEAN;
  v_schedule_count INT;
  v_unassigned_tomorrow_exists BOOLEAN;
  v_all_ready BOOLEAN := TRUE;
BEGIN
  -- Check accounts
  SELECT COUNT(*) INTO v_account_count
  FROM public.profiles
  WHERE email IN ('owner@jiujitsio.com', 'carlos.martinez@jiujitsio.com', 'ana.rodriguez@jiujitsio.com');
  
  IF v_account_count < 3 THEN
    RAISE NOTICE '❌ MISSING ACCOUNTS: Only % of 3 accounts found', v_account_count;
    RAISE NOTICE '   Run: pnpm db:apply supabase/migrations/20251025190003_create_owner_and_instructors.sql';
    v_all_ready := FALSE;
  ELSE
    RAISE NOTICE '✅ All 3 demo accounts exist';
  END IF;
  
  -- Check gym
  SELECT EXISTS(SELECT 1 FROM public.gyms WHERE LOWER(name) = 'jiujitsio') INTO v_gym_exists;
  IF NOT v_gym_exists THEN
    RAISE NOTICE '❌ MISSING GYM: Jiujitsio gym not found';
    v_all_ready := FALSE;
  ELSE
    RAISE NOTICE '✅ Jiujitsio gym exists';
  END IF;
  
  -- Check group chat
  SELECT gym_chat_id IS NOT NULL INTO v_group_chat_exists
  FROM public.gyms WHERE LOWER(name) = 'jiujitsio' LIMIT 1;
  
  IF NOT v_group_chat_exists THEN
    RAISE NOTICE '❌ MISSING GROUP CHAT';
    RAISE NOTICE '   Run: pnpm db:apply demo_final_seed.sql';
    v_all_ready := FALSE;
  ELSE
    RAISE NOTICE '✅ Group chat exists';
    
    -- Check group chat members
    SELECT COUNT(*) INTO v_chat_member_count
    FROM public.gyms g
    JOIN public.chat_members cm ON cm.chat_id = g.gym_chat_id
    WHERE LOWER(g.name) = 'jiujitsio';
    
    IF v_chat_member_count < 3 THEN
      RAISE NOTICE '❌ INCOMPLETE GROUP CHAT: Only % of 3 members', v_chat_member_count;
      RAISE NOTICE '   Run: pnpm db:apply demo_final_seed.sql';
      v_all_ready := FALSE;
    ELSE
      RAISE NOTICE '✅ All 3 members in group chat';
    END IF;
  END IF;
  
  -- Check 1:1 chats
  SELECT EXISTS(
    SELECT 1 FROM public.chats c
    JOIN public.chat_members cm1 ON c.id = cm1.chat_id
    JOIN public.chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id != cm1.user_id
    JOIN public.profiles p1 ON p1.id = cm1.user_id
    JOIN public.profiles p2 ON p2.id = cm2.user_id
    WHERE c.type = 'direct'
      AND p1.email = 'owner@jiujitsio.com'
      AND p2.email = 'carlos.martinez@jiujitsio.com'
  ) INTO v_direct_chat_exists;
  
  IF NOT v_direct_chat_exists THEN
    RAISE NOTICE '⚠️  NO 1:1 CHAT: Owner <-> Carlos chat not found (recommended)';
    RAISE NOTICE '   Run: pnpm db:apply demo_final_seed.sql';
  ELSE
    RAISE NOTICE '✅ 1:1 chat exists';
  END IF;
  
  -- Check schedules
  SELECT COUNT(*) INTO v_schedule_count
  FROM public.gym_schedules gs
  JOIN public.gyms g ON g.id = gs.gym_id
  WHERE LOWER(g.name) = 'jiujitsio';
  
  IF v_schedule_count < 5 THEN
    RAISE NOTICE '⚠️  LOW SCHEDULE COUNT: Only % schedules (recommend 5-10)', v_schedule_count;
    RAISE NOTICE '   Run: pnpm db:apply supabase/migrations/20251024010000_seed_gym_data.sql';
  ELSE
    RAISE NOTICE '✅ Sufficient schedules (%)', v_schedule_count;
  END IF;
  
  -- Check CRITICAL: unassigned class for tomorrow
  SELECT EXISTS(
    SELECT 1 FROM public.gym_schedules gs
    JOIN public.gyms g ON g.id = gs.gym_id
    WHERE LOWER(g.name) = 'jiujitsio'
      AND gs.instructor_id IS NULL
      AND gs.is_cancelled = FALSE
      AND gs.day_of_week = TRIM(TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'Day'))
  ) INTO v_unassigned_tomorrow_exists;
  
  IF NOT v_unassigned_tomorrow_exists THEN
    RAISE NOTICE '❌ CRITICAL: No unassigned class for TOMORROW';
    RAISE NOTICE '   This is required for AI problem detection demo!';
    RAISE NOTICE '   Run: pnpm db:apply demo_final_seed.sql';
    v_all_ready := FALSE;
  ELSE
    RAISE NOTICE '✅ Unassigned class for tomorrow exists (CRITICAL for AI demo)';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  
  IF v_all_ready THEN
    RAISE NOTICE '🎬 ✅ ALL READY! You can start recording!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next steps:';
    RAISE NOTICE '   1. Open FINAL_DEMO_SCRIPT.md';
    RAISE NOTICE '   2. Launch 3 simulators';
    RAISE NOTICE '   3. Login to all accounts';
    RAISE NOTICE '   4. Start recording with OBS';
  ELSE
    RAISE NOTICE '❌ NOT READY - Fix issues above first';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Quick fix:';
    RAISE NOTICE '   pnpm db:apply demo_final_seed.sql';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

