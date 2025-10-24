-- Apply new migrations directly
-- This script applies only the two new migrations we created

\echo 'Applying 20251025160000_seed_jiujitsio_schedule.sql...'
\i supabase/migrations/20251025160000_seed_jiujitsio_schedule.sql

\echo 'Applying 20251025160001_support_multi_gym_membership.sql...'
\i supabase/migrations/20251025160001_support_multi_gym_membership.sql

\echo 'Done! New migrations applied successfully.'




