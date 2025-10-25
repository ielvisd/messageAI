-- Remove ALL broken @jiujitsio.com accounts from previous SQL attempts
-- This will allow you to create fresh accounts via Dashboard

DO $$
DECLARE
  v_jiujitsio_gym_id uuid;
  v_account RECORD;
BEGIN
  RAISE NOTICE '🔍 Finding all @jiujitsio.com accounts...';
  RAISE NOTICE '';
  
  -- Show what we found
  FOR v_account IN 
    SELECT 
      u.id,
      u.email,
      u.created_at,
      u.email_confirmed_at IS NOT NULL as confirmed,
      p.role,
      p.name
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.email LIKE '%@jiujitsio.com'
    ORDER BY u.created_at
  LOOP
    RAISE NOTICE 'Found: % | Name: % | Role: % | Confirmed: % | Created: %',
      v_account.email,
      COALESCE(v_account.name, 'NULL'),
      COALESCE(v_account.role, 'NULL'),
      v_account.confirmed,
      v_account.created_at;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Starting cleanup...';
  
  -- Get gym ID first
  SELECT id INTO v_jiujitsio_gym_id
  FROM gyms
  WHERE name = 'Jiujitsio'
  LIMIT 1;
  
  -- Remove gym owner relationship (prevents foreign key issues)
  IF v_jiujitsio_gym_id IS NOT NULL THEN
    UPDATE gyms 
    SET owner_id = NULL 
    WHERE id = v_jiujitsio_gym_id;
    RAISE NOTICE '  ✅ Cleared gym owner_id';
  END IF;
  
  -- Remove from chat members
  DELETE FROM chat_members
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@jiujitsio.com'
  );
  RAISE NOTICE '  ✅ Removed from chats';
  
  -- Remove from class assignments
  DELETE FROM class_assignments
  WHERE instructor_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@jiujitsio.com'
  );
  RAISE NOTICE '  ✅ Removed class assignments';
  
  -- Remove instructor assignments from schedules
  UPDATE gym_schedules
  SET instructor_id = NULL, instructor_name = NULL
  WHERE instructor_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@jiujitsio.com'
  );
  RAISE NOTICE '  ✅ Cleared schedule assignments';
  
  -- Remove from gym invitations (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gym_invitations') THEN
    DELETE FROM gym_invitations
    WHERE invited_by IN (
      SELECT id FROM auth.users WHERE email LIKE '%@jiujitsio.com'
    );
    RAISE NOTICE '  ✅ Removed invitations';
  END IF;
  
  -- Remove from attendance records (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_records') THEN
    DELETE FROM attendance_records
    WHERE user_id IN (
      SELECT id FROM auth.users WHERE email LIKE '%@jiujitsio.com'
    )
    OR marked_by IN (
      SELECT id FROM auth.users WHERE email LIKE '%@jiujitsio.com'
    );
    RAISE NOTICE '  ✅ Removed attendance records';
  END IF;
  
  -- Remove from profiles (this should cascade to most things)
  DELETE FROM profiles
  WHERE email LIKE '%@jiujitsio.com';
  RAISE NOTICE '  ✅ Deleted profiles';
  
  -- Remove from auth.identities
  DELETE FROM auth.identities
  WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '%@jiujitsio.com'
  );
  RAISE NOTICE '  ✅ Deleted identities';
  
  -- Remove from auth.users
  DELETE FROM auth.users
  WHERE email LIKE '%@jiujitsio.com';
  RAISE NOTICE '  ✅ Deleted auth.users';
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Cleanup complete!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ You can now create these accounts in Supabase Dashboard:';
  RAISE NOTICE '   1. owner@jiujitsio.com';
  RAISE NOTICE '   2. carlos.martinez@jiujitsio.com';
  RAISE NOTICE '   3. ana.rodriguez@jiujitsio.com';
  RAISE NOTICE '   4. mike.chen@jiujitsio.com';
  RAISE NOTICE '';
  RAISE NOTICE '📝 After creating all 4 accounts, run: pnpm db:apply update_demo_profiles.sql';
END $$;

