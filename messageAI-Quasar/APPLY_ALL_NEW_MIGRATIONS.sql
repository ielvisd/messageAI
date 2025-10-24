-- ================================================================
-- APPLY ALL NEW MIGRATIONS FOR ADVANCED SCHEDULING SYSTEM
-- ================================================================
-- Run this file in Supabase SQL Editor to apply all new migrations
-- This includes: 
-- - Original schedule seeding + multi-gym support
-- - Instructor preferences & private lessons
-- - Parent-child accounts
-- - Instructor QR codes
-- - Class assignments
-- - Notifications
-- - Jiujitsio West gym seeding

-- ================================================================
-- MIGRATION 1: Seed Jiujitsio Original Schedule
-- ================================================================

\echo 'Applying: 20251025160000_seed_jiujitsio_schedule.sql'

\i supabase/migrations/20251025160000_seed_jiujitsio_schedule.sql

-- ================================================================
-- MIGRATION 2: Multi-Gym Membership Support
-- ================================================================

\echo 'Applying: 20251025160001_support_multi_gym_membership.sql'

\i supabase/migrations/20251025160001_support_multi_gym_membership.sql

-- ================================================================
-- MIGRATION 3: Instructor Preferences & Private Lessons
-- ================================================================

\echo 'Applying: 20251025170000_instructor_preferences_private_lessons.sql'

\i supabase/migrations/20251025170000_instructor_preferences_private_lessons.sql

-- ================================================================
-- MIGRATION 4: Parent-Child Accounts
-- ================================================================

\echo 'Applying: 20251025170001_parent_child_accounts.sql'

\i supabase/migrations/20251025170001_parent_child_accounts.sql

-- ================================================================
-- MIGRATION 5: Instructor QR Codes
-- ================================================================

\echo 'Applying: 20251025170002_instructor_qr_codes.sql'

\i supabase/migrations/20251025170002_instructor_qr_codes.sql

-- ================================================================
-- MIGRATION 6: Class Assignments
-- ================================================================

\echo 'Applying: 20251025170003_class_assignments.sql'

\i supabase/migrations/20251025170003_class_assignments.sql

-- ================================================================
-- MIGRATION 7: Class Notifications
-- ================================================================

\echo 'Applying: 20251025170004_class_notifications.sql'

\i supabase/migrations/20251025170004_class_notifications.sql

-- ================================================================
-- MIGRATION 8: Seed Jiujitsio West
-- ================================================================

\echo 'Applying: 20251025170005_seed_jiujitsio_west.sql'

\i supabase/migrations/20251025170005_seed_jiujitsio_west.sql

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check Jiujitsio West was created
SELECT name, id FROM public.gyms WHERE name = 'Jiujitsio West';

-- Check instructors were created
SELECT name, role, private_lessons_enabled FROM public.profiles WHERE role = 'instructor' AND gym_id IN (SELECT id FROM public.gyms WHERE name = 'Jiujitsio West');

-- Check schedule was created
SELECT COUNT(*) as class_count FROM public.gym_schedules WHERE gym_id IN (SELECT id FROM public.gyms WHERE name = 'Jiujitsio West');

-- Check private lesson slots were created
SELECT COUNT(*) as slot_count FROM public.private_lesson_slots WHERE gym_id IN (SELECT id FROM public.gyms WHERE name = 'Jiujitsio West');

\echo 'All migrations applied successfully!'




