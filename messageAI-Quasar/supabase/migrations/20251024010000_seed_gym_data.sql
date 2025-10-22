-- Insert gym schedules
INSERT INTO gym_schedules (gym_location, class_type, day_of_week, start_time, end_time, level, instructor_name) VALUES
-- North Gym - Gi
('north', 'gi', 'Monday', '06:00', '07:30', 'All Levels', 'Professor Silva'),
('north', 'gi', 'Monday', '18:00', '19:30', 'All Levels', 'Professor Silva'),
('north', 'gi', 'Wednesday', '06:00', '07:30', 'All Levels', 'Professor Silva'),
('north', 'gi', 'Wednesday', '18:00', '19:30', 'All Levels', 'Professor Silva'),
('north', 'gi', 'Friday', '06:00', '07:30', 'All Levels', 'Coach Martinez'),

-- North Gym - No-Gi
('north', 'nogi', 'Tuesday', '19:30', '21:00', 'All Levels', 'Coach Martinez'),
('north', 'nogi', 'Thursday', '19:30', '21:00', 'All Levels', 'Coach Rodriguez'),

-- North Gym - Kids
('north', 'kids', 'Monday', '16:00', '17:00', 'Ages 6-12', 'Coach Ana'),
('north', 'kids', 'Wednesday', '16:00', '17:00', 'Ages 6-12', 'Coach Ana'),

-- South Gym - Gi
('south', 'gi', 'Tuesday', '06:00', '07:30', 'All Levels', 'Professor Chen'),
('south', 'gi', 'Tuesday', '18:00', '19:30', 'Advanced', 'Professor Chen'),
('south', 'gi', 'Thursday', '06:00', '07:30', 'All Levels', 'Professor Chen'),
('south', 'gi', 'Thursday', '18:00', '19:30', 'Advanced', 'Professor Chen'),
('south', 'gi', 'Saturday', '10:00', '11:30', 'Open Mat', 'All'),

-- South Gym - No-Gi
('south', 'nogi', 'Friday', '19:30', '21:00', 'All Levels', 'Coach Lee')

ON CONFLICT DO NOTHING;

-- Insert common quick replies
INSERT INTO quick_replies (category, trigger_keywords, reply_text) VALUES
('membership', ARRAY['price', 'cost', 'membership', 'fee'], 'Single location membership: $150/month. Multi-location access: $200/month. Drop-in: $25/class. First class free!'),
('billing', ARRAY['payment', 'billing', 'charge'], 'For billing questions, please contact our front desk or email billing@gym.com'),
('private_lesson', ARRAY['private', 'one-on-one', '1-on-1'], 'Private lessons are $80/hour. Please message your preferred instructor directly to schedule.'),
('belt_testing', ARRAY['belt', 'promotion', 'stripe'], 'Belt testing occurs every 4 months. Requirements are posted 30 days in advance. Minimum 80% attendance required.'),
('trial', ARRAY['trial', 'try', 'first class'], 'Your first class is free! Just show up 15 minutes early to fill out a waiver. Wear workout clothes. We have loaner gis available.')

ON CONFLICT DO NOTHING;

