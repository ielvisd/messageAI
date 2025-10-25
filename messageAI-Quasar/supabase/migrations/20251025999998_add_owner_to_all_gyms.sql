-- Add owner to all gyms (Jiujitsio and Jiujitsio West)
-- This ensures the owner can see chats and manage schedules for both gyms

DO $$
DECLARE
  v_jiujitsio_gym_id UUID;
  v_jiujitsio_west_gym_id UUID;
  v_jiujitsio_chat_id UUID;
  v_jiujitsio_west_chat_id UUID;
  v_owner_id UUID;
BEGIN
  -- Get gym IDs
  SELECT id, gym_chat_id INTO v_jiujitsio_gym_id, v_jiujitsio_chat_id
  FROM public.gyms
  WHERE LOWER(name) = 'jiujitsio'
  LIMIT 1;
  
  SELECT id, gym_chat_id INTO v_jiujitsio_west_gym_id, v_jiujitsio_west_chat_id
  FROM public.gyms
  WHERE LOWER(name) = 'jiujitsio west'
  LIMIT 1;
  
  -- Get owner
  SELECT id INTO v_owner_id
  FROM auth.users
  WHERE email = 'owner@jiujitsio.com';
  
  IF v_owner_id IS NULL THEN
    RAISE WARNING '⚠️  Owner account not found!';
    RETURN;
  END IF;
  
  IF v_jiujitsio_gym_id IS NULL THEN
    RAISE WARNING '⚠️  Jiujitsio gym not found!';
    RETURN;
  END IF;
  
  IF v_jiujitsio_west_gym_id IS NULL THEN
    RAISE WARNING '⚠️  Jiujitsio West gym not found!';
    RETURN;
  END IF;
  
  RAISE NOTICE '🔧 Adding owner to all gyms...';
  RAISE NOTICE 'Owner ID: %', v_owner_id;
  RAISE NOTICE 'Jiujitsio ID: %', v_jiujitsio_gym_id;
  RAISE NOTICE 'Jiujitsio West ID: %', v_jiujitsio_west_gym_id;
  
  -- Update owner profile to include both gyms
  UPDATE public.profiles
  SET 
    gym_ids = ARRAY[v_jiujitsio_gym_id, v_jiujitsio_west_gym_id]::UUID[],
    owned_gym_ids = ARRAY[v_jiujitsio_gym_id, v_jiujitsio_west_gym_id]::UUID[],
    gym_id = v_jiujitsio_gym_id  -- Primary gym remains Jiujitsio
  WHERE id = v_owner_id;
  
  RAISE NOTICE '✅ Updated owner profile with both gyms';
  
  -- Set owner_id on both gyms
  UPDATE public.gyms
  SET owner_id = v_owner_id
  WHERE id IN (v_jiujitsio_gym_id, v_jiujitsio_west_gym_id);
  
  RAISE NOTICE '✅ Set owner_id on both gyms';
  
  -- Add owner to Jiujitsio gym chat (if not already)
  IF v_jiujitsio_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_chat_id, v_owner_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    
    RAISE NOTICE '✅ Added owner to Jiujitsio gym chat';
  END IF;
  
  -- Add owner to Jiujitsio West gym chat (if not already)
  IF v_jiujitsio_west_chat_id IS NOT NULL THEN
    INSERT INTO public.chat_members (chat_id, user_id, joined_at)
    VALUES (v_jiujitsio_west_chat_id, v_owner_id, NOW())
    ON CONFLICT (chat_id, user_id) DO NOTHING;
    
    RAISE NOTICE '✅ Added owner to Jiujitsio West gym chat';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Owner successfully added to all gyms!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Owner Account Summary:';
  RAISE NOTICE '   Email: owner@jiujitsio.com';
  RAISE NOTICE '   Password: demo123456';
  RAISE NOTICE '   Gyms: Jiujitsio, Jiujitsio West';
  RAISE NOTICE '   Role: owner';
END $$;

