-- Diagnostic SQL to check why instructor list is empty
-- Run this to see the current state of gym members and their roles

-- 1. Check all gyms and their owners
SELECT 
  g.id as gym_id,
  g.name as gym_name,
  g.owner_id,
  p.name as owner_name,
  p.role as owner_role,
  p.gym_id as owner_gym_id_field
FROM gyms g
LEFT JOIN profiles p ON g.owner_id = p.id;

-- 2. Check all profiles with gym_id set
SELECT 
  p.id,
  p.name,
  p.email,
  p.role,
  p.gym_id,
  g.name as gym_name,
  p.instructor_preferences
FROM profiles p
LEFT JOIN gyms g ON p.gym_id = g.id
WHERE p.gym_id IS NOT NULL
ORDER BY p.gym_id, p.role;

-- 3. Check for instructors and owners specifically
SELECT 
  p.id,
  p.name,
  p.email,
  p.role,
  p.gym_id,
  g.name as gym_name,
  p.instructor_preferences IS NOT NULL as has_preferences
FROM profiles p
LEFT JOIN gyms g ON p.gym_id = g.id
WHERE p.role IN ('instructor', 'owner')
ORDER BY p.gym_id, p.role;

-- 4. Check gym schedules and their instructors
SELECT 
  gs.id as schedule_id,
  gs.gym_id,
  g.name as gym_name,
  gs.day_of_week,
  gs.start_time,
  gs.class_type,
  gs.instructor_id,
  gs.instructor_name,
  p.name as actual_instructor_name,
  p.role as instructor_role,
  p.gym_id as instructor_gym_id
FROM gym_schedules gs
LEFT JOIN gyms g ON gs.gym_id = g.id
LEFT JOIN profiles p ON gs.instructor_id = p.id
WHERE gs.is_active = true
ORDER BY gs.gym_id, gs.day_of_week, gs.start_time;

-- 5. Summary: Count by gym and role
SELECT 
  g.id as gym_id,
  g.name as gym_name,
  p.role,
  COUNT(p.id) as count
FROM gyms g
LEFT JOIN profiles p ON p.gym_id = g.id
GROUP BY g.id, g.name, p.role
ORDER BY g.name, p.role;



