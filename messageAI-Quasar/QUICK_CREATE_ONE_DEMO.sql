-- This SQL only updates the PROFILE for a demo account
-- YOU MUST FIRST create the auth user manually via Supabase Dashboard!
--
-- Steps:
-- 1. Go to: https://supabase.com/dashboard → Authentication → Users
-- 2. Click "Add user" → "Create new user"  
-- 3. Email: demo@test.com
-- 4. Password: demo123456
-- 5. Click "Create user"
-- 6. THEN run this SQL below

DO $$
DECLARE
  v_user_id UUID;
  v_gym_id UUID;
  v_chat_id UUID;
BEGIN
  -- Find the auth user you just created
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'demo@test.com';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Demo user not found in auth.users! Create it first via Supabase Dashboard.';
  END IF;
  
  -- Get Jiujitsio gym
  SELECT id, gym_chat_id INTO v_gym_id, v_chat_id
  FROM gyms 
  WHERE name = 'Jiujitsio' 
  LIMIT 1;
  
  IF v_gym_id IS NULL THEN
    RAISE WARNING 'Jiujitsio gym not found. Creating profile without gym.';
  END IF;
  
  -- Update or create profile
  INSERT INTO profiles (
    id, name, role, gym_id, gym_ids, age_category
  ) VALUES (
    v_user_id,
    'Demo Student',
    'student',
    v_gym_id,
    ARRAY[v_gym_id],
    'adult'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    gym_id = EXCLUDED.gym_id,
    gym_ids = EXCLUDED.gym_ids,
    age_category = EXCLUDED.age_category;
  
  -- Add to gym chat
  IF v_chat_id IS NOT NULL THEN
    INSERT INTO chat_members (chat_id, user_id, role, joined_at)
    VALUES (v_chat_id, v_user_id, 'member', NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
  END IF;
  
  RAISE NOTICE '✅ Demo account profile updated!';
  RAISE NOTICE '   Email: demo@test.com';
  RAISE NOTICE '   Password: demo123456';
  RAISE NOTICE '   Now you can login!';
END $$;

