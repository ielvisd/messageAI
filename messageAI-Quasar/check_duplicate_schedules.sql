-- Check for duplicate schedules in gym_schedules table
SELECT 
  gym_id,
  day_of_week,
  start_time,
  end_time,
  class_type,
  age_group,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id) as schedule_ids
FROM gym_schedules
WHERE gym_id = '3d5d4abf-13fc-4bce-96d7-3bfe0747acb9'
GROUP BY gym_id, day_of_week, start_time, end_time, class_type, age_group
HAVING COUNT(*) > 1
ORDER BY day_of_week, start_time;
