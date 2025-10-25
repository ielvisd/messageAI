-- Add Taylor Smith to the jiujitsio gym (not jiujitsio west)
DO $$
DECLARE
  v_gym_id UUID;
  v_gym_name TEXT;
  v_gym_chat_id UUID;
  v_user_id UUID;
  v_user_name TEXT;
BEGIN
  -- Find the jiujitsio gym (NOT jiujitsio west)
  SELECT id, name, gym_chat_id INTO v_gym_id, v_gym_name, v_gym_chat_id
  FROM public.gyms
  WHERE name ILIKE '%jiujitsio%' AND name NOT ILIKE '%west%'
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
    SET gym_ids = array_append(COALESCE(gym_ids, ARRAY[]::UUID[]), v_gym_id)
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

-- Verify Taylor is now in both gyms
SELECT 
  p.name as user_name,
  g.name as gym_name
FROM public.profiles p
CROSS JOIN public.gyms g
WHERE p.name ILIKE '%taylor%smith%'
  AND g.id = ANY(p.gym_ids)
ORDER BY g.name;

