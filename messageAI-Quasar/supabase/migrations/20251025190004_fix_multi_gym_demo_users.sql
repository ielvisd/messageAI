-- Fix multi-gym membership for demo users
-- Ensure jordan.competitor and mia.kid have both gym IDs in their gym_ids array

DO $$
DECLARE
  v_jiujitsio_gym_id UUID;
  v_jiujitsio_west_gym_id UUID;
  v_user_id UUID;
BEGIN
  -- Get gym IDs
  SELECT id INTO v_jiujitsio_gym_id
  FROM public.gyms
  WHERE LOWER(name) = 'jiujitsio'
  LIMIT 1;
  
  SELECT id INTO v_jiujitsio_west_gym_id
  FROM public.gyms
  WHERE LOWER(name) = 'jiujitsio west' OR name = 'Jiujitsio West'
  LIMIT 1;
  
  IF v_jiujitsio_gym_id IS NULL THEN
    RAISE WARNING 'Jiujitsio gym not found!';
    RETURN;
  END IF;
  
  IF v_jiujitsio_west_gym_id IS NULL THEN
    RAISE WARNING 'Jiujitsio West gym not found!';
    RETURN;
  END IF;
  
  RAISE NOTICE '🔧 Fixing multi-gym membership for demo users...';
  RAISE NOTICE 'Jiujitsio gym ID: %', v_jiujitsio_gym_id;
  RAISE NOTICE 'Jiujitsio West gym ID: %', v_jiujitsio_west_gym_id;
  
  -- ============================================================================
  -- Fix Jordan Martinez (jordan.competitor@demo.com) - should be part of both gyms
  -- ============================================================================
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'jordan.competitor@demo.com';
  
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET gym_ids = ARRAY[v_jiujitsio_gym_id, v_jiujitsio_west_gym_id]::UUID[]
    WHERE id = v_user_id;
    
    RAISE NOTICE '✅ Fixed Jordan Martinez - gym_ids set to both gyms';
  ELSE
    RAISE WARNING '⚠️  jordan.competitor@demo.com not found in auth.users';
  END IF;
  
  -- ============================================================================
  -- Fix Mia Rodriguez (mia.kid@demo.com) - should be part of both gyms
  -- ============================================================================
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'mia.kid@demo.com';
  
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET gym_ids = ARRAY[v_jiujitsio_gym_id, v_jiujitsio_west_gym_id]::UUID[]
    WHERE id = v_user_id;
    
    RAISE NOTICE '✅ Fixed Mia Rodriguez - gym_ids set to both gyms';
  ELSE
    RAISE WARNING '⚠️  mia.kid@demo.com not found in auth.users';
  END IF;
  
  -- ============================================================================
  -- Verify results
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '📊 Verification:';
  
  FOR v_user_id IN 
    SELECT p.id
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE u.email IN ('jordan.competitor@demo.com', 'mia.kid@demo.com')
  LOOP
    DECLARE
      v_profile RECORD;
    BEGIN
      SELECT 
        p.name,
        u.email,
        array_length(p.gym_ids, 1) as num_gyms,
        (SELECT array_agg(g.name) FROM public.gyms g WHERE g.id = ANY(p.gym_ids)) as gym_names
      INTO v_profile
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE p.id = v_user_id;
      
      RAISE NOTICE '  - %: % gyms - %', 
        v_profile.name, 
        v_profile.num_gyms, 
        array_to_string(v_profile.gym_names, ', ');
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Multi-gym demo users fixed!';
  
END $$;






