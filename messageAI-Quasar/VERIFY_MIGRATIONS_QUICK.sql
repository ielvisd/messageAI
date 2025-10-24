-- Quick verification queries to confirm successful migration
-- Run these in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check both gyms exist
SELECT 
  name,
  id,
  CASE WHEN locations IS NOT NULL THEN jsonb_array_length(locations) ELSE 0 END as location_count,
  qr_token IS NOT NULL as has_qr_token,
  instructor_qr_token IS NOT NULL as has_instructor_qr_token
FROM public.gyms 
ORDER BY name;
-- Expected: 2 rows (Jiujitsio, Jiujitsio West)

-- 2. Check instructors at Jiujitsio West
SELECT 
  name,
  email,
  role,
  private_lessons_enabled,
  birthdate,
  age_category
FROM public.profiles 
WHERE role = 'instructor' 
  AND gym_id IN (SELECT id FROM public.gyms WHERE name = 'Jiujitsio West')
ORDER BY name;
-- Expected: 5 instructors (Ana Santos, Jessica Park, Mike Rodriguez, Sarah Chen, Tom Silva)

-- 3. Check schedule classes for both gyms
SELECT 
  g.name as gym_name,
  gs.day_of_week,
  gs.class_type,
  gs.age_group,
  gs.skill_level,
  gs.start_time,
  gs.end_time
FROM public.gym_schedules gs
JOIN public.gyms g ON g.id = gs.gym_id
ORDER BY g.name, gs.day_of_week, gs.start_time;
-- Expected: Multiple classes for each gym

-- 4. Count classes per gym
SELECT 
  g.name as gym_name,
  COUNT(*) as class_count
FROM public.gym_schedules gs
JOIN public.gyms g ON g.id = gs.gym_id
GROUP BY g.name
ORDER BY g.name;
-- Expected: ~12-15 classes per gym

-- 5. Check new columns exist on profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('instructor_preferences', 'private_lessons_enabled', 'birthdate', 'age_category', 'gym_ids')
ORDER BY column_name;
-- Expected: 5 rows

-- 6. Check new tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('gym_settings', 'private_lesson_slots', 'private_lesson_bookings', 'dependents', 'class_assignments', 'class_cancellations')
ORDER BY table_name;
-- Expected: 6 rows

-- 7. Check new functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'create_demo_instructor',
    'calculate_age_category',
    'assign_instructor_to_class',
    'get_available_instructors',
    'bulk_assign_instructor',
    'get_affected_students',
    'cancel_class',
    'get_cancellation_alternatives',
    'join_gym_as_instructor'
  )
ORDER BY routine_name;
-- Expected: 9 functions

-- 8. Summary report
SELECT 
  '✅ Gyms' as category,
  COUNT(*)::text as count
FROM public.gyms
UNION ALL
SELECT 
  '✅ Instructors (West)',
  COUNT(*)::text
FROM public.profiles 
WHERE role = 'instructor' 
  AND gym_id IN (SELECT id FROM public.gyms WHERE name = 'Jiujitsio West')
UNION ALL
SELECT 
  '✅ Schedule Classes',
  COUNT(*)::text
FROM public.gym_schedules
UNION ALL
SELECT 
  '✅ New Functions',
  COUNT(*)::text
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'create_demo_instructor',
    'calculate_age_category',
    'assign_instructor_to_class',
    'get_available_instructors',
    'bulk_assign_instructor',
    'get_affected_students',
    'cancel_class',
    'get_cancellation_alternatives',
    'join_gym_as_instructor'
  )
UNION ALL
SELECT 
  '✅ New Tables',
  COUNT(*)::text
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('gym_settings', 'private_lesson_slots', 'private_lesson_bookings', 'dependents', 'class_assignments', 'class_cancellations');




