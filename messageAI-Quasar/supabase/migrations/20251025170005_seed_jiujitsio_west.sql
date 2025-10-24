-- Migration 6: Seed Jiujitsio West
-- Creates second gym with instructors and evening schedule

-- ============================================
-- CREATE JIUJITSIO WEST GYM
-- ============================================

-- Insert gym (will generate QR tokens automatically via defaults)
INSERT INTO public.gyms (name, locations, created_at)
VALUES (
  'Jiujitsio West',
  '["West Side Location - Evening Classes"]'::jsonb,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Get the gym ID for later use
DO $$
DECLARE
  v_gym_id UUID;
  v_gym_chat_id UUID;
  v_owner_id UUID;
  
  -- Instructor IDs
  v_sarah_id UUID;
  v_mike_id UUID;
  v_jessica_id UUID;
  v_tom_id UUID;
  v_ana_id UUID;
BEGIN
  -- Get gym ID
  SELECT id INTO v_gym_id
  FROM public.gyms
  WHERE name = 'Jiujitsio West';
  
  IF v_gym_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create Jiujitsio West gym';
  END IF;
  
  -- Get first owner for assignment purposes (or use existing owner)
  SELECT id INTO v_owner_id
  FROM public.profiles
  WHERE role = 'owner'
  LIMIT 1;
  
  -- Create gym chat
  INSERT INTO public.chats (type, name, created_by)
  VALUES ('group', 'Jiujitsio West - All Members', v_owner_id)
  RETURNING id INTO v_gym_chat_id;
  
  -- Link chat to gym
  UPDATE public.gyms
  SET gym_chat_id = v_gym_chat_id
  WHERE id = v_gym_id;
  
  -- ============================================
  -- CREATE INSTRUCTOR PROFILES
  -- ============================================
  
  -- 1. Sarah Chen - All classes, prefers GI, all ages, private lessons ENABLED
  v_sarah_id := public.create_demo_instructor(
    'sarah.chen@jiujitsiowest.test',
    'Sarah Chen',
    v_gym_id,
    '1990-03-15',
    '{
      "age_groups": ["pee_wees", "kids", "teens", "adults"],
      "class_types": ["gi", "no_gi"],
      "skill_levels": ["all_levels", "fundamentals", "advanced"],
      "available_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "available_times": {"start": "16:00", "end": "21:00"},
      "teaches_private_lessons": true
    }'::jsonb,
    true -- Private lessons enabled
  );
  
  -- 2. Mike Rodriguez - Kids/Teens only, GI + NO-GI, private lessons DISABLED
  v_mike_id := public.create_demo_instructor(
    'mike.rodriguez@jiujitsiowest.test',
    'Mike Rodriguez',
    v_gym_id,
    '1988-07-22',
    '{
      "age_groups": ["kids", "teens"],
      "class_types": ["gi", "no_gi"],
      "skill_levels": ["all_levels", "fundamentals"],
      "available_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
      "available_times": {"start": "17:00", "end": "20:00"},
      "teaches_private_lessons": false
    }'::jsonb,
    false -- Private lessons disabled
  );
  
  -- 3. Jessica Park - Adults only, Fundamentals specialist, private lessons ENABLED
  v_jessica_id := public.create_demo_instructor(
    'jessica.park@jiujitsiowest.test',
    'Jessica Park',
    v_gym_id,
    '1992-11-08',
    '{
      "age_groups": ["adults"],
      "class_types": ["gi"],
      "skill_levels": ["fundamentals", "all_levels"],
      "available_days": ["tuesday", "wednesday", "friday"],
      "available_times": {"start": "18:00", "end": "21:00"},
      "teaches_private_lessons": true
    }'::jsonb,
    true -- Private lessons enabled
  );
  
  -- 4. Tom Silva - All levels, evening only, private lessons DISABLED
  v_tom_id := public.create_demo_instructor(
    'tom.silva@jiujitsiowest.test',
    'Tom Silva',
    v_gym_id,
    '1985-05-30',
    '{
      "age_groups": ["teens", "adults"],
      "class_types": ["gi", "no_gi"],
      "skill_levels": ["all_levels", "advanced"],
      "available_days": ["monday", "wednesday", "thursday", "friday"],
      "available_times": {"start": "18:00", "end": "21:00"},
      "teaches_private_lessons": false
    }'::jsonb,
    false -- Private lessons disabled
  );
  
  -- 5. Coach Ana - Pee Wees specialist, private lessons ENABLED
  v_ana_id := public.create_demo_instructor(
    'ana.santos@jiujitsiowest.test',
    'Coach Ana',
    v_gym_id,
    '1994-09-12',
    '{
      "age_groups": ["pee_wees", "kids"],
      "class_types": ["gi"],
      "skill_levels": ["all_levels"],
      "available_days": ["monday", "wednesday", "friday"],
      "available_times": {"start": "16:00", "end": "19:00"},
      "teaches_private_lessons": true
    }'::jsonb,
    true -- Private lessons enabled
  );
  
  -- Add instructors to gym chat
  INSERT INTO public.chat_members (chat_id, user_id)
  VALUES 
    (v_gym_chat_id, v_sarah_id),
    (v_gym_chat_id, v_mike_id),
    (v_gym_chat_id, v_jessica_id),
    (v_gym_chat_id, v_tom_id),
    (v_gym_chat_id, v_ana_id)
  ON CONFLICT DO NOTHING;
  
  -- ============================================
  -- CREATE EVENING SCHEDULE
  -- ============================================
  
  -- MONDAY
  INSERT INTO public.gym_schedules (gym_id, class_type, day_of_week, start_time, end_time, level, notes, is_active, instructor_id, instructor_name)
  VALUES
    (v_gym_id, 'GI', 'Monday', '17:00:00', '18:00:00', 'All Levels', 'Pee Wees - 5-7 Yrs Old', true, v_ana_id, 'Coach Ana'),
    (v_gym_id, 'GI', 'Monday', '18:00:00', '19:00:00', 'All Levels', 'Kids - 8-12 Yrs Old', true, v_sarah_id, 'Sarah Chen'),
    (v_gym_id, 'GI', 'Monday', '19:00:00', '20:00:00', 'All Levels', 'Adult & Teens', true, NULL, NULL); -- Unassigned
  
  -- TUESDAY
  INSERT INTO public.gym_schedules (gym_id, class_type, day_of_week, start_time, end_time, level, notes, is_active, instructor_id, instructor_name)
  VALUES
    (v_gym_id, 'GI', 'Tuesday', '18:00:00', '19:00:00', 'All Levels', 'Kids - 8-12 Yrs Old', true, v_mike_id, 'Mike Rodriguez'),
    (v_gym_id, 'GI', 'Tuesday', '19:00:00', '20:00:00', 'Fundamentals', 'Adult & Teens - Fundamentals/Beginners', true, v_jessica_id, 'Jessica Park');
  
  -- WEDNESDAY
  INSERT INTO public.gym_schedules (gym_id, class_type, day_of_week, start_time, end_time, level, notes, is_active, instructor_id, instructor_name)
  VALUES
    (v_gym_id, 'GI', 'Wednesday', '17:00:00', '18:00:00', 'All Levels', 'Pee Wees - 5-7 Yrs Old', true, v_ana_id, 'Coach Ana'),
    (v_gym_id, 'GI', 'Wednesday', '18:00:00', '19:00:00', 'All Levels', 'Kids - 8-12 Yrs Old', true, v_sarah_id, 'Sarah Chen'),
    (v_gym_id, 'GI', 'Wednesday', '19:00:00', '20:00:00', 'All Levels', 'Adult & Teens', true, v_tom_id, 'Tom Silva');
  
  -- THURSDAY
  INSERT INTO public.gym_schedules (gym_id, class_type, day_of_week, start_time, end_time, level, notes, is_active, instructor_id, instructor_name)
  VALUES
    (v_gym_id, 'NO-GI', 'Thursday', '18:00:00', '19:00:00', 'All Levels', 'Kids - 8-12 Yrs Old', true, v_mike_id, 'Mike Rodriguez'),
    (v_gym_id, 'NO-GI', 'Thursday', '19:00:00', '20:00:00', 'All Levels', 'Adult & Teens', true, NULL, NULL); -- Unassigned
  
  -- FRIDAY
  INSERT INTO public.gym_schedules (gym_id, class_type, day_of_week, start_time, end_time, level, notes, is_active, instructor_id, instructor_name)
  VALUES
    (v_gym_id, 'GI', 'Friday', '17:00:00', '18:00:00', 'All Levels', 'Pee Wees - 5-7 Yrs Old', true, v_ana_id, 'Coach Ana'),
    (v_gym_id, 'GI', 'Friday', '18:00:00', '19:00:00', 'All Levels', 'Kids - 8-12 Yrs Old', true, NULL, NULL), -- Unassigned for testing
    (v_gym_id, 'GI', 'Friday', '19:00:00', '20:00:00', 'All Levels', 'Adult & Teens', true, v_tom_id, 'Tom Silva');
  
  -- ============================================
  -- CREATE SAMPLE PRIVATE LESSON SLOTS
  -- ============================================
  
  -- Sarah's recurring private lesson slots (Saturdays)
  INSERT INTO public.private_lesson_slots (gym_id, instructor_id, day_of_week, start_time, end_time, is_recurring, max_students, status)
  VALUES
    (v_gym_id, v_sarah_id, 'saturday', '09:00:00', '10:00:00', true, 1, 'available'),
    (v_gym_id, v_sarah_id, 'saturday', '10:00:00', '11:00:00', true, 2, 'available'), -- Group private
    (v_gym_id, v_sarah_id, 'saturday', '11:00:00', '12:00:00', true, 1, 'available');
  
  -- Jessica's recurring private lesson slots (Weekday afternoons)
  INSERT INTO public.private_lesson_slots (gym_id, instructor_id, day_of_week, start_time, end_time, is_recurring, max_students, status)
  VALUES
    (v_gym_id, v_jessica_id, 'tuesday', '16:00:00', '17:00:00', true, 1, 'available'),
    (v_gym_id, v_jessica_id, 'thursday', '16:00:00', '17:00:00', true, 1, 'available');
  
  -- Coach Ana's recurring private lesson slots (for kids)
  INSERT INTO public.private_lesson_slots (gym_id, instructor_id, day_of_week, start_time, end_time, is_recurring, max_students, status)
  VALUES
    (v_gym_id, v_ana_id, 'monday', '16:00:00', '17:00:00', true, 2, 'available'), -- Group private for kids
    (v_gym_id, v_ana_id, 'wednesday', '16:00:00', '17:00:00', true, 2, 'available'),
    (v_gym_id, v_ana_id, 'friday', '16:00:00', '17:00:00', true, 2, 'available');
  
  -- ============================================
  -- CREATE GYM SETTINGS
  -- ============================================
  
  INSERT INTO public.gym_settings (gym_id, can_self_assign_classes, private_lessons_require_approval, ai_auto_assign_enabled, ai_auto_assign_confidence_threshold, notification_preferences)
  VALUES (
    v_gym_id,
    false, -- Instructors cannot self-assign by default
    true, -- Private lessons require approval
    false, -- AI auto-assign disabled by default
    95, -- 95% confidence threshold
    '{
      "notify_on_class_cancellation": true,
      "notify_on_instructor_change": true,
      "show_instructor_on_schedule": true,
      "send_daily_digest": false
    }'::jsonb
  )
  ON CONFLICT (gym_id) DO UPDATE
  SET 
    can_self_assign_classes = EXCLUDED.can_self_assign_classes,
    private_lessons_require_approval = EXCLUDED.private_lessons_require_approval;
  
  RAISE NOTICE 'Successfully seeded Jiujitsio West gym with ID: %', v_gym_id;
  RAISE NOTICE 'Created 5 instructors with varied preferences';
  RAISE NOTICE 'Created evening schedule (5 PM - 8 PM) across 5 days';
  RAISE NOTICE 'Added sample private lesson slots for 3 instructors';
END $$;

-- Comments
COMMENT ON TABLE public.gyms IS 'Updated with Jiujitsio West - second gym location with evening-only schedule';

