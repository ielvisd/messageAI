-- Fix Alex Chen's null gym_ids issue

DO $$
DECLARE
  v_alex_id uuid;
  v_jiujitsio_gym_id uuid;
  v_current_gym_ids uuid[];
  v_current_gym_id uuid;
BEGIN
  RAISE NOTICE '🔍 Diagnosing Alex Chen profile...';
  
  -- Get Alex's ID and current state
  SELECT id, gym_id, gym_ids INTO v_alex_id, v_current_gym_id, v_current_gym_ids
  FROM profiles 
  WHERE email = 'alex.student@demo.com';
  
  IF v_alex_id IS NULL THEN
    RAISE NOTICE '❌ Alex Chen not found in database';
    RETURN;
  END IF;
  
  RAISE NOTICE '📋 Current state:';
  RAISE NOTICE '   ID: %', v_alex_id;
  RAISE NOTICE '   gym_id: %', v_current_gym_id;
  RAISE NOTICE '   gym_ids: %', v_current_gym_ids;
  
  -- Get Jiujitsio gym ID
  SELECT id INTO v_jiujitsio_gym_id
  FROM gyms
  WHERE name = 'Jiujitsio'
  LIMIT 1;
  
  IF v_jiujitsio_gym_id IS NULL THEN
    RAISE NOTICE '❌ Jiujitsio gym not found';
    RETURN;
  END IF;
  
  RAISE NOTICE '🏋️  Jiujitsio gym ID: %', v_jiujitsio_gym_id;
  
  -- Fix the profile
  RAISE NOTICE '🔧 Fixing Alex Chen profile...';
  
  UPDATE profiles
  SET 
    gym_id = v_jiujitsio_gym_id,
    gym_ids = ARRAY[v_jiujitsio_gym_id],
    owned_gym_ids = COALESCE(owned_gym_ids, ARRAY[]::uuid[])
  WHERE id = v_alex_id;
  
  -- Verify the fix
  SELECT gym_id, gym_ids INTO v_current_gym_id, v_current_gym_ids
  FROM profiles 
  WHERE id = v_alex_id;
  
  RAISE NOTICE '✅ Alex Chen profile fixed!';
  RAISE NOTICE '   New gym_id: %', v_current_gym_id;
  RAISE NOTICE '   New gym_ids: %', v_current_gym_ids;
  
  -- Also clean up any other profiles with null in gym_ids array
  RAISE NOTICE '🔍 Checking for other profiles with null gym_ids...';
  
  UPDATE profiles
  SET gym_ids = ARRAY[]::uuid[]
  WHERE gym_ids IS NULL OR NULL = ANY(gym_ids);
  
  RAISE NOTICE '✅ Cleaned up all profiles with null gym_ids';
  
END $$;

