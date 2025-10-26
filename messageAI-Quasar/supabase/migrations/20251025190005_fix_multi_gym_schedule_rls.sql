-- Fix RLS policy for gym_schedules to support multi-gym membership
-- Allow users to view schedules from ALL gyms they're a member of, not just primary gym

-- Drop the old policy that only checks primary gym_id
DROP POLICY IF EXISTS "members_view_schedules" ON public.gym_schedules;

-- Create new policy that checks gym_ids array for multi-gym membership
CREATE POLICY "members_view_schedules" ON public.gym_schedules
  FOR SELECT USING (
    -- Check if the schedule's gym_id is in the user's gym_ids array
    gym_id IN (
      SELECT unnest(gym_ids) 
      FROM public.profiles 
      WHERE id = auth.uid()
    ) AND
    is_active = true
  );

COMMENT ON POLICY "members_view_schedules" ON public.gym_schedules IS 
  'All gym members can view active schedules from any gym they are a member of (supports multi-gym membership via gym_ids array)';

-- Verify the fix
DO $$
DECLARE
  v_test_user_id UUID;
  v_schedule_count INT;
BEGIN
  -- Find a user with multiple gyms (jordan.competitor@demo.com)
  SELECT id INTO v_test_user_id
  FROM auth.users
  WHERE email = 'jordan.competitor@demo.com'
  LIMIT 1;
  
  IF v_test_user_id IS NOT NULL THEN
    -- Count how many gyms they're in
    DECLARE
      v_gym_count INT;
      v_gym_names TEXT[];
    BEGIN
      SELECT 
        array_length(gym_ids, 1),
        (SELECT array_agg(name) FROM gyms WHERE id = ANY(p.gym_ids))
      INTO v_gym_count, v_gym_names
      FROM profiles p
      WHERE id = v_test_user_id;
      
      RAISE NOTICE '👤 Test User: jordan.competitor@demo.com';
      RAISE NOTICE '   - Member of % gyms: %', v_gym_count, array_to_string(v_gym_names, ', ');
      
      -- Test the RLS policy by counting visible schedules
      -- Note: This runs as the migration user (superuser), not as the test user
      -- So we can't actually test RLS here, but we can verify the data exists
      SELECT COUNT(*)
      INTO v_schedule_count
      FROM gym_schedules
      WHERE gym_id IN (SELECT unnest(gym_ids) FROM profiles WHERE id = v_test_user_id)
        AND is_active = true;
      
      RAISE NOTICE '   - Should see % schedules when logged in', v_schedule_count;
      RAISE NOTICE '';
      RAISE NOTICE '✅ RLS policy updated! User should now see schedules from all their gyms.';
    END;
  ELSE
    RAISE NOTICE '⚠️  Test user not found, but policy is updated';
  END IF;
END $$;








