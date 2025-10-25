-- Comprehensive fix and verification for Alex Chen

DO $$
DECLARE
  v_alex_id uuid;
  v_jiujitsio_gym_id uuid;
  v_current_gym_id uuid;
  v_current_gym_ids uuid[];
  v_current_role text;
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE '🔍 DIAGNOSING ALEX CHEN PROFILE';
  RAISE NOTICE '==================================================';
  
  -- Find Alex in profiles
  SELECT id, gym_id, gym_ids, role 
  INTO v_alex_id, v_current_gym_id, v_current_gym_ids, v_current_role
  FROM profiles 
  WHERE email = 'alex.student@demo.com';
  
  IF v_alex_id IS NULL THEN
    RAISE NOTICE '❌ Alex Chen not found in profiles table';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Found Alex Chen in profiles';
  RAISE NOTICE '   Profile ID: %', v_alex_id;
  RAISE NOTICE '';
  RAISE NOTICE '📋 CURRENT STATE:';
  RAISE NOTICE '   Role: %', v_current_role;
  RAISE NOTICE '   gym_id: %', v_current_gym_id;
  RAISE NOTICE '   gym_ids: %', v_current_gym_ids;
  
  -- Get Jiujitsio gym ID
  SELECT id INTO v_jiujitsio_gym_id
  FROM gyms
  WHERE name ILIKE '%jiujitsio%'
  LIMIT 1;
  
  IF v_jiujitsio_gym_id IS NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ Jiujitsio gym not found!';
    RETURN;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Found Jiujitsio gym: %', v_jiujitsio_gym_id;
  
  -- Fix Alex's profile
  RAISE NOTICE '';
  RAISE NOTICE '🔧 FIXING ALEX CHEN PROFILE...';
  
  UPDATE profiles
  SET 
    gym_id = v_jiujitsio_gym_id,
    gym_ids = ARRAY[v_jiujitsio_gym_id],
    owned_gym_ids = ARRAY[]::uuid[],
    role = 'student',
    updated_at = NOW()
  WHERE id = v_alex_id;
  
  RAISE NOTICE '✅ Profile updated';
  
  -- Get new state
  SELECT gym_id, gym_ids, role 
  INTO v_current_gym_id, v_current_gym_ids, v_current_role
  FROM profiles 
  WHERE id = v_alex_id;
  
  -- Verify the fix
  RAISE NOTICE '';
  RAISE NOTICE '📋 NEW STATE:';
  RAISE NOTICE '   Role: %', v_current_role;
  RAISE NOTICE '   gym_id: %', v_current_gym_id;
  RAISE NOTICE '   gym_ids: %', v_current_gym_ids;
  
  RAISE NOTICE '';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '✅ ALEX CHEN PROFILE FIXED!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: LOG OUT and LOG BACK IN';
  RAISE NOTICE '   for changes to take effect in the app!';
  RAISE NOTICE '';
  
END $$;

-- Show final verification
SELECT 
  '=== VERIFICATION ===' as status,
  p.name,
  p.email,
  p.role,
  p.gym_id,
  p.gym_ids,
  g.name as gym_name
FROM profiles p
LEFT JOIN gyms g ON g.id = p.gym_id
WHERE p.email = 'alex.student@demo.com';
