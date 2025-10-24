-- Seed schedule for Jiujitsio gym (f036de8e-a750-45a1-8263-e3ea764c489f)
-- Realistic Brazilian Jiu-Jitsu class schedule with GI, NO-GI, age groups, and skill levels

-- Clear any existing schedule for this gym (in case of re-run)
DELETE FROM public.gym_schedules WHERE gym_id = 'f036de8e-a750-45a1-8263-e3ea764c489f';

-- Monday Classes
INSERT INTO public.gym_schedules (gym_id, class_type, day_of_week, start_time, end_time, level, notes, is_active) VALUES
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Monday', '06:30:00', '07:30:00', 'All Levels', 'Adult & Teens', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Monday', '16:00:00', '17:00:00', 'All Levels', 'Kids - 8-12 Yrs Old', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Monday', '17:00:00', '18:00:00', 'All Levels', 'Pee Wees - 5-7 Yrs Old', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Monday', '18:00:00', '19:00:00', 'Fundamentals', 'Adult & Teens', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Monday', '19:00:00', '20:00:00', 'All Levels', 'Adult & Teens', true);

-- Tuesday Classes
INSERT INTO public.gym_schedules (gym_id, class_type, day_of_week, start_time, end_time, level, notes, is_active) VALUES
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Tuesday', '11:30:00', '12:30:00', 'All Levels', 'Adult & Teens', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'NO-GI', 'Tuesday', '16:00:00', '17:00:00', 'All Levels', 'Kids - 8-12 Yrs Old', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'NO-GI', 'Tuesday', '17:00:00', '18:00:00', 'All Levels', 'Teens - 13-17 Yrs Old', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'NO-GI', 'Tuesday', '18:00:00', '19:00:00', 'All Levels', 'Adult & Teens', true);

-- Wednesday Classes
INSERT INTO public.gym_schedules (gym_id, class_type, day_of_week, start_time, end_time, level, notes, is_active) VALUES
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Wednesday', '06:30:00', '07:30:00', 'All Levels', 'Adult & Teens', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Wednesday', '16:00:00', '17:00:00', 'All Levels', 'Kids - 8-12 Yrs Old', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Wednesday', '17:00:00', '18:00:00', 'All Levels', 'Pee Wees - 5-7 Yrs Old', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Wednesday', '18:00:00', '19:00:00', 'Fundamentals', 'Adult & Teens', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Wednesday', '19:00:00', '20:00:00', 'All Levels', 'Adult & Teens', true);

-- Thursday Classes
INSERT INTO public.gym_schedules (gym_id, class_type, day_of_week, start_time, end_time, level, notes, is_active) VALUES
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Thursday', '11:30:00', '12:30:00', 'All Levels', 'Adult & Teens', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Thursday', '16:00:00', '17:00:00', 'All Levels', 'Kids - 8-12 Yrs Old', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'Competition', 'Thursday', '17:00:00', '18:00:00', 'Advanced', 'Competition Class - Invitation Only', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Thursday', '18:00:00', '19:00:00', 'All Levels', 'Adult & Teens', true);

-- Friday Classes
INSERT INTO public.gym_schedules (gym_id, class_type, day_of_week, start_time, end_time, level, notes, is_active) VALUES
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Friday', '06:30:00', '07:30:00', 'All Levels', 'Adult & Teens', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Friday', '16:00:00', '17:00:00', 'Advanced', 'Kids - 8-12 Yrs Old (2 stripes and above)', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Friday', '17:00:00', '18:00:00', 'All Levels', 'Pee Wees - 5-7 Yrs Old', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Friday', '18:00:00', '19:00:00', 'Fundamentals', 'Adult & Teens', true),
('f036de8e-a750-45a1-8263-e3ea764c489f', 'GI', 'Friday', '19:00:00', '20:00:00', 'All Levels', 'Adult & Teens', true);

-- Saturday Classes
INSERT INTO public.gym_schedules (gym_id, class_type, day_of_week, start_time, end_time, level, notes, is_active) VALUES
('f036de8e-a750-45a1-8263-e3ea764c489f', 'Open Mat', 'Saturday', '10:30:00', '12:00:00', 'All Levels', 'Adult & Teens - Open Mat', true);

COMMENT ON TABLE public.gym_schedules IS 'Weekly class schedules for gyms with support for GI/NO-GI, age groups, and skill levels';




