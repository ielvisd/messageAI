-- ================================================================
-- VERIFICATION QUERIES FOR ADVANCED SCHEDULING MIGRATIONS
-- ================================================================
-- Run these queries after applying migrations to verify everything worked
-- Expected results are shown in comments

-- ================================================================
-- 1. CHECK GYMS
-- ================================================================
SELECT 
  name,
  id,
  qr_token IS NOT NULL as has_student_qr,
  instructor_qr_token IS NOT NULL as has_instructor_qr
FROM public.gyms
ORDER BY name;

-- Expected: 2 gyms (Jiujitsio, Jiujitsio West), both have QR codes

-- ================================================================
-- 2. CHECK INSTRUCTORS
-- ================================================================
SELECT 
  p.name,
  g.name as gym,
  p.private_lessons_enabled,
  jsonb_array_length(p.instructor_preferences->'age_groups') as age_groups_count,
  jsonb_array_length(p.instructor_preferences->'class_types') as class_types_count
FROM public.profiles p
JOIN public.gyms g ON g.id = p.gym_id
WHERE p.role = 'instructor'
ORDER BY g.name, p.name;

-- Expected: 5 instructors at Jiujitsio West with varied preferences

-- ================================================================
-- 3. CHECK SCHEDULES
-- ================================================================
SELECT 
  g.name as gym,
  gs.day_of_week,
  gs.start_time,
  gs.class_type,
  gs.level,
  gs.notes,
  gs.instructor_name,
  CASE WHEN gs.instructor_id IS NULL THEN 'UNASSIGNED' ELSE 'Assigned' END as status
FROM public.gym_schedules gs
JOIN public.gyms g ON g.id = gs.gym_id
WHERE g.name IN ('Jiujitsio', 'Jiujitsio West')
ORDER BY g.name, 
  CASE gs.day_of_week
    WHEN 'Monday' THEN 1
    WHEN 'Tuesday' THEN 2
    WHEN 'Wednesday' THEN 3
    WHEN 'Thursday' THEN 4
    WHEN 'Friday' THEN 5
    WHEN 'Saturday' THEN 6
    ELSE 7
  END,
  gs.start_time;

-- Expected: ~12 classes per gym, some marked as UNASSIGNED

-- ================================================================
-- 4. CHECK PRIVATE LESSON SLOTS
-- ================================================================
SELECT 
  p.name as instructor,
  pls.day_of_week,
  pls.start_time || ' - ' || pls.end_time as time_range,
  pls.max_students,
  pls.current_students,
  pls.status,
  pls.is_recurring
FROM public.private_lesson_slots pls
JOIN public.profiles p ON p.id = pls.instructor_id
ORDER BY p.name, pls.day_of_week, pls.start_time;

-- Expected: ~8 slots from 3 instructors (Sarah, Jessica, Coach Ana)

-- ================================================================
-- 5. CHECK GYM SETTINGS
-- ================================================================
SELECT 
  g.name,
  gs.can_self_assign_classes,
  gs.private_lessons_require_approval,
  gs.ai_auto_assign_enabled,
  gs.ai_auto_assign_confidence_threshold,
  gs.notification_preferences->>'notify_on_class_cancellation' as notify_cancellations,
  gs.notification_preferences->>'show_instructor_on_schedule' as show_instructors
FROM public.gym_settings gs
JOIN public.gyms g ON g.id = gs.gym_id
WHERE g.name IN ('Jiujitsio', 'Jiujitsio West');

-- Expected: Settings for Jiujitsio West with defaults (self-assign=false, AI=false, threshold=95)

-- ================================================================
-- 6. TEST INSTRUCTOR MATCHING FUNCTION
-- ================================================================
-- Get an unassigned class from Jiujitsio West
DO $$
DECLARE
  v_unassigned_class UUID;
  v_gym_id UUID;
BEGIN
  -- Get Jiujitsio West gym ID
  SELECT id INTO v_gym_id FROM public.gyms WHERE name = 'Jiujitsio West';
  
  -- Get first unassigned class
  SELECT id INTO v_unassigned_class 
  FROM public.gym_schedules 
  WHERE gym_id = v_gym_id AND instructor_id IS NULL 
  LIMIT 1;
  
  IF v_unassigned_class IS NOT NULL THEN
    RAISE NOTICE 'Testing instructor matching for unassigned class: %', v_unassigned_class;
    
    -- Show matching instructors
    RAISE NOTICE 'Available instructors:';
    FOR rec IN 
      SELECT * FROM public.get_available_instructors(v_gym_id, v_unassigned_class)
      ORDER BY match_score DESC
    LOOP
      RAISE NOTICE '  % - Score: %, Available: %, Reasons: %', 
        rec.instructor_name, rec.match_score, rec.is_available, rec.match_reasons;
    END LOOP;
  ELSE
    RAISE NOTICE 'No unassigned classes found (all assigned - that is okay!)';
  END IF;
END $$;

-- Expected: List of instructors ranked by match score with reasons

-- ================================================================
-- 7. TEST AGE CATEGORY CALCULATION
-- ================================================================
SELECT 
  'Pee Wee (6 years old)' as test_case,
  calculate_age_category(CURRENT_DATE - INTERVAL '6 years') as result
UNION ALL
SELECT 
  'Junior (10 years old)',
  calculate_age_category(CURRENT_DATE - INTERVAL '10 years')
UNION ALL
SELECT 
  'Teen (15 years old)',
  calculate_age_category(CURRENT_DATE - INTERVAL '15 years')
UNION ALL
SELECT 
  'Adult (25 years old)',
  calculate_age_category(CURRENT_DATE - INTERVAL '25 years');

-- Expected: pee_wee, junior, teen, adult

-- ================================================================
-- 8. CHECK TABLE COUNTS
-- ================================================================
SELECT 
  'gyms' as table_name,
  COUNT(*) as record_count
FROM public.gyms
UNION ALL
SELECT 'instructors', COUNT(*) FROM public.profiles WHERE role = 'instructor'
UNION ALL
SELECT 'gym_schedules', COUNT(*) FROM public.gym_schedules
UNION ALL
SELECT 'private_lesson_slots', COUNT(*) FROM public.private_lesson_slots
UNION ALL
SELECT 'private_lesson_bookings', COUNT(*) FROM public.private_lesson_bookings
UNION ALL
SELECT 'dependents', COUNT(*) FROM public.dependents
UNION ALL
SELECT 'class_assignments', COUNT(*) FROM public.class_assignments
UNION ALL
SELECT 'class_cancellations', COUNT(*) FROM public.class_cancellations;

-- Expected counts:
-- gyms: 2
-- instructors: 5+
-- gym_schedules: 24+
-- private_lesson_slots: 8
-- bookings/dependents/assignments/cancellations: 0 (empty until used)

-- ================================================================
-- 9. TEST AFFECTED STUDENTS FUNCTION
-- ================================================================
-- This will show how smart notification targeting works
DO $$
DECLARE
  v_kids_class UUID;
  v_gym_id UUID;
BEGIN
  SELECT id INTO v_gym_id FROM public.gyms WHERE name = 'Jiujitsio West';
  
  -- Get a kids class
  SELECT id INTO v_kids_class 
  FROM public.gym_schedules 
  WHERE gym_id = v_gym_id AND notes ILIKE '%kids%'
  LIMIT 1;
  
  IF v_kids_class IS NOT NULL THEN
    RAISE NOTICE 'Testing affected students for Kids class: %', v_kids_class;
    RAISE NOTICE 'Students who would be notified:';
    
    FOR rec IN 
      SELECT * FROM public.get_affected_students(v_kids_class)
    LOOP
      RAISE NOTICE '  % - Age: %, Parent: %, Reason: %', 
        rec.user_name, rec.age_category, rec.is_parent, rec.notification_reason;
    END LOOP;
  END IF;
END $$;

-- Expected: Shows students matching age category + parents with kids in that age group

-- ================================================================
-- 10. SUMMARY
-- ================================================================
SELECT 
  'VERIFICATION COMPLETE' as status,
  (SELECT COUNT(*) FROM public.gyms) as gyms,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'instructor') as instructors,
  (SELECT COUNT(*) FROM public.gym_schedules) as classes,
  (SELECT COUNT(*) FROM public.private_lesson_slots) as private_slots,
  'All systems ready!' as message;

-- ================================================================
-- If all queries run successfully, migrations are applied correctly!
-- ================================================================




