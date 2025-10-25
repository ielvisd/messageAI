-- Reset Alex Chen back to student role

DO $$
DECLARE
  v_alex_id uuid;
  v_jiujitsio_gym_id uuid;
BEGIN
  RAISE NOTICE '🔧 Resetting Alex Chen to student role...';
  
  -- Get Alex's ID
  SELECT id INTO v_alex_id 
  FROM profiles 
  WHERE email = 'alex.student@demo.com';
  
  IF v_alex_id IS NULL THEN
    RAISE NOTICE '⚠️  Alex Chen not found in database';
    RETURN;
  END IF;
  
  -- Get Jiujitsio gym ID
  SELECT id INTO v_jiujitsio_gym_id
  FROM gyms
  WHERE name = 'Jiujitsio'
  LIMIT 1;
  
  -- Reset Alex to student
  UPDATE profiles
  SET 
    name = 'Alex Chen',
    role = 'student',
    gym_id = v_jiujitsio_gym_id,
    gym_ids = ARRAY[v_jiujitsio_gym_id],
    owned_gym_ids = ARRAY[]::uuid[],
    instructor_preferences = NULL,
    private_lessons_enabled = false
  WHERE id = v_alex_id;
  
  -- Make sure Alex is not set as gym owner
  UPDATE gyms
  SET owner_id = NULL
  WHERE owner_id = v_alex_id;
  
  RAISE NOTICE '✅ Alex Chen reset to student role';
  RAISE NOTICE '   Email: alex.student@demo.com';
  RAISE NOTICE '   Role: student';
  RAISE NOTICE '   Gym: Jiujitsio';
END $$;

