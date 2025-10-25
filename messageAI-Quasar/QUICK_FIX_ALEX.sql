-- ==========================================
-- QUICK FIX FOR ALEX CHEN
-- Run this in Supabase Dashboard SQL Editor
-- ==========================================

-- Step 1: Check current state
SELECT 
  '==== BEFORE FIX ====' as status,
  id,
  name,
  email,
  role,
  gym_id,
  gym_ids,
  owned_gym_ids
FROM profiles
WHERE email = 'alex.student@demo.com';

-- Step 2: Check available gyms
SELECT 
  '==== AVAILABLE GYMS ====' as status,
  id,
  name
FROM gyms
ORDER BY name;

-- Step 3: Fix Alex's profile (UPDATE)
UPDATE profiles
SET 
  gym_id = (SELECT id FROM gyms WHERE name ILIKE '%jiujitsio%' LIMIT 1),
  gym_ids = ARRAY[(SELECT id FROM gyms WHERE name ILIKE '%jiujitsio%' LIMIT 1)],
  owned_gym_ids = ARRAY[]::uuid[],
  role = 'student',
  updated_at = NOW()
WHERE email = 'alex.student@demo.com';

-- Step 4: Verify the fix
SELECT 
  '==== AFTER FIX ====' as status,
  id,
  name,
  email,
  role,
  gym_id,
  gym_ids,
  owned_gym_ids,
  (SELECT name FROM gyms WHERE id = gym_id) as gym_name
FROM profiles
WHERE email = 'alex.student@demo.com';

