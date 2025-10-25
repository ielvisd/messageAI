-- Remove duplicate schedule entries for Jiujitsio West
-- Keep only one instance of each class (the one created first)

DO $$
DECLARE
  v_gym_id UUID := '3d5d4abf-13fc-4bce-96d7-3bfe0747acb9'; -- Jiujitsio West
  v_initial_count INT;
  v_final_count INT;
  v_deleted_count INT;
BEGIN
  RAISE NOTICE '🔧 Removing duplicate schedules for Jiujitsio West...';
  RAISE NOTICE '';
  
  -- Count initial schedules
  SELECT COUNT(*) INTO v_initial_count
  FROM public.gym_schedules
  WHERE gym_id = v_gym_id;
  
  RAISE NOTICE '📊 Initial schedule count: %', v_initial_count;
  RAISE NOTICE '';
  
  -- Show duplicates before deletion
  RAISE NOTICE '🔍 Duplicate schedules found:';
  DECLARE
    rec RECORD;
  BEGIN
    FOR rec IN (
      SELECT 
        day_of_week,
        start_time,
        end_time,
        class_type,
        notes,
        COUNT(*) as duplicate_count
      FROM gym_schedules
      WHERE gym_id = v_gym_id
      GROUP BY day_of_week, start_time, end_time, class_type, notes
      HAVING COUNT(*) > 1
      ORDER BY day_of_week, start_time
    )
    LOOP
      RAISE NOTICE '   % % - % (% | %): % duplicates', 
        rec.day_of_week, rec.start_time, rec.end_time, rec.class_type, rec.notes, rec.duplicate_count;
    END LOOP;
  END;
  RAISE NOTICE '';
  
  -- Delete duplicates, keeping only the oldest (first created) of each
  -- Using CTID (physical row identifier) to ensure we can distinguish between identical rows
  DELETE FROM public.gym_schedules
  WHERE id IN (
    SELECT id
    FROM (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY 
            gym_id, 
            day_of_week, 
            start_time, 
            end_time, 
            class_type,
            COALESCE(notes, ''),
            COALESCE(level, ''),
            COALESCE(instructor_id::text, '')
          ORDER BY created_at ASC NULLS LAST, id ASC
        ) as rn
      FROM public.gym_schedules
      WHERE gym_id = v_gym_id
    ) ranked
    WHERE rn > 1
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Count final schedules
  SELECT COUNT(*) INTO v_final_count
  FROM public.gym_schedules
  WHERE gym_id = v_gym_id;
  
  RAISE NOTICE '✅ Removed % duplicate schedule(s)', v_deleted_count;
  RAISE NOTICE '📊 Final schedule count: %', v_final_count;
  RAISE NOTICE '';
  
  -- Show remaining schedules grouped by day
  RAISE NOTICE '📅 Remaining schedule:';
  DECLARE
    rec2 RECORD;
  BEGIN
    FOR rec2 IN (
      SELECT 
        day_of_week,
        start_time,
        end_time,
        class_type,
        notes,
        instructor_name
      FROM gym_schedules
      WHERE gym_id = v_gym_id
      ORDER BY 
        CASE day_of_week
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
        END,
        start_time
    )
    LOOP
      RAISE NOTICE '   % % - %: % (%)', 
        rec2.day_of_week, 
        rec2.start_time, 
        rec2.end_time, 
        rec2.notes,
        COALESCE(rec2.instructor_name, 'Unassigned');
    END LOOP;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Duplicate schedules removed! Refresh browser to see the fix.';
  
END $$;

