-- Remove duplicate "Jiujitsio West" gym
-- Keep the older one with schedules, delete the newer empty one

DO $$
DECLARE
  v_old_gym_id UUID := '3d5d4abf-13fc-4bce-96d7-3bfe0747acb9'; -- Created Oct 24 02:43, HAS schedules
  v_new_gym_id UUID := 'adf27313-2550-46f1-9327-6344eadc855a'; -- Created Oct 24 23:28, EMPTY
  v_schedule_count_old INT;
  v_schedule_count_new INT;
  v_affected_profiles INT;
BEGIN
  RAISE NOTICE '🔧 Removing duplicate Jiujitsio West gym...';
  RAISE NOTICE '';
  
  -- Verify which gym has schedules
  SELECT COUNT(*) INTO v_schedule_count_old
  FROM public.gym_schedules
  WHERE gym_id = v_old_gym_id;
  
  SELECT COUNT(*) INTO v_schedule_count_new
  FROM public.gym_schedules
  WHERE gym_id = v_new_gym_id;
  
  RAISE NOTICE '📊 Gym Analysis:';
  RAISE NOTICE '   Old gym (3d5d4abf...): % schedules', v_schedule_count_old;
  RAISE NOTICE '   New gym (adf27313...): % schedules', v_schedule_count_new;
  RAISE NOTICE '';
  
  -- Safety check: make sure we're deleting the empty one
  IF v_schedule_count_new > 0 THEN
    RAISE EXCEPTION 'ERROR: New gym has schedules! Aborting to prevent data loss.';
  END IF;
  
  IF v_schedule_count_old = 0 THEN
    RAISE EXCEPTION 'ERROR: Old gym has no schedules! Something is wrong.';
  END IF;
  
  -- Step 1: Find any profiles that reference the duplicate gym
  SELECT COUNT(*) INTO v_affected_profiles
  FROM public.profiles
  WHERE v_new_gym_id = ANY(gym_ids) OR gym_id = v_new_gym_id;
  
  RAISE NOTICE '🔍 Found % profiles referencing the duplicate gym', v_affected_profiles;
  
  -- Step 2: Remove the duplicate gym ID from gym_ids arrays
  UPDATE public.profiles
  SET gym_ids = array_remove(gym_ids, v_new_gym_id)
  WHERE v_new_gym_id = ANY(gym_ids);
  
  -- Step 3: Update any profiles that have the duplicate as primary gym_id
  UPDATE public.profiles
  SET gym_id = v_old_gym_id
  WHERE gym_id = v_new_gym_id;
  
  RAISE NOTICE '✅ Cleaned up profile references';
  RAISE NOTICE '';
  
  -- Step 4: Delete the gym chat if it exists
  DELETE FROM public.chats
  WHERE id = (SELECT gym_chat_id FROM public.gyms WHERE id = v_new_gym_id);
  
  -- Step 5: Delete the duplicate gym
  DELETE FROM public.gyms
  WHERE id = v_new_gym_id;
  
  RAISE NOTICE '✅ Deleted duplicate gym (adf27313...)';
  RAISE NOTICE '';
  
  -- Verify: Check remaining Jiujitsio West gyms
  DECLARE
    v_remaining_count INT;
  BEGIN
    SELECT COUNT(*) INTO v_remaining_count
    FROM public.gyms
    WHERE LOWER(name) LIKE '%west%';
    
    IF v_remaining_count = 1 THEN
      RAISE NOTICE '✅ SUCCESS: Only 1 Jiujitsio West gym remains';
      
      -- Show the remaining gym details
      DECLARE
        v_gym RECORD;
      BEGIN
        SELECT 
          id,
          name,
          (SELECT COUNT(*) FROM gym_schedules WHERE gym_id = g.id) as schedule_count,
          created_at
        INTO v_gym
        FROM public.gyms g
        WHERE id = v_old_gym_id;
        
        RAISE NOTICE '';
        RAISE NOTICE '📋 Remaining Jiujitsio West:';
        RAISE NOTICE '   ID: %', v_gym.id;
        RAISE NOTICE '   Name: %', v_gym.name;
        RAISE NOTICE '   Schedules: %', v_gym.schedule_count;
        RAISE NOTICE '   Created: %', v_gym.created_at;
      END;
    ELSE
      RAISE WARNING 'Still have % gyms with "west" in name', v_remaining_count;
    END IF;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Duplicate gym removed! Refresh your browser to see the fix.';
  
END $$;

