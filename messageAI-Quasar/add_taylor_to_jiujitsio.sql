-- Add Taylor Smith to jiujitsio gym
-- Step 1: Find the gym
DO $$
DECLARE
  v_gym_id UUID;
  v_gym_name TEXT;
  v_gym_chat_id UUID;
  v_user_id UUID;
  v_user_name TEXT;
BEGIN
  -- Find jiujitsio gym
  SELECT id, name, gym_chat_id INTO v_gym_id, v_gym_name, v_gym_chat_id
  FROM public.gyms
  WHERE name ILIKE '%jiujitsio%'
  LIMIT 1;

  IF v_gym_id IS NULL THEN
    RAISE EXCEPTION 'jiujitsio gym not found';
  END IF;

  RAISE NOTICE 'Found gym: % (ID: %)', v_gym_name, v_gym_id;

  -- Find Taylor Smith
  SELECT id, name INTO v_user_id, v_user_name
  FROM public.profiles
  WHERE name ILIKE '%taylor%smith%' OR name ILIKE '%taylor smith%'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Taylor Smith not found in profiles';
  END IF;

  RAISE NOTICE 'Found user: % (ID: %)', v_user_name, v_user_id;

  -- Check if already a member
  IF v_gym_id = ANY(SELECT UNNEST(COALESCE(gym_ids, ARRAY[]::UUID[])) FROM public.profiles WHERE id = v_user_id) THEN
    RAISE NOTICE 'User is already a member of this gym';
  ELSE
    -- Add gym to user's gym_ids array
    UPDATE public.profiles
    SET gym_ids = array_append(COALESCE(gym_ids, ARRAY[]::UUID[]), v_gym_id),
        gym_id = COALESCE(gym_id, v_gym_id)  -- Set as primary gym if they don't have one
    WHERE id = v_user_id;

    RAISE NOTICE 'Added % to gym_ids', v_gym_name;
  END IF;

  -- Add to gym chat if exists
  IF v_gym_chat_id IS NOT NULL THEN
    -- Add to chat_members
    INSERT INTO public.chat_members (chat_id, user_id)
    VALUES (v_gym_chat_id, v_user_id)
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Added user to gym chat';
  ELSE
    RAISE NOTICE 'No gym chat found for this gym';
  END IF;

  RAISE NOTICE '✅ Successfully added Taylor Smith to jiujitsio gym!';
END $$;

-- Verify the addition
SELECT 
  p.name as user_name,
  g.name as gym_name,
  cm.chat_id as in_chat
FROM public.profiles p
CROSS JOIN public.gyms g
LEFT JOIN public.chat_members cm ON cm.user_id = p.id AND cm.chat_id = g.gym_chat_id
WHERE p.name ILIKE '%taylor%smith%'
  AND g.name ILIKE '%jiujitsio%'
  AND g.id = ANY(p.gym_ids);

