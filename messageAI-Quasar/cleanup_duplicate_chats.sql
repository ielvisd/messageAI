-- Cleanup duplicate Jiujitsio West chats
-- This will keep only ONE "Jiujitsio West" chat and remove duplicates

DO $$
DECLARE
  v_gym_id UUID;
  v_correct_chat_id UUID;
  v_duplicate_chat_ids UUID[];
BEGIN
  -- Find the jiujitsio west gym
  SELECT id, gym_chat_id INTO v_gym_id, v_correct_chat_id
  FROM public.gyms
  WHERE name ILIKE '%jiujitsio%west%'
  LIMIT 1;

  IF v_gym_id IS NULL THEN
    RAISE NOTICE 'No Jiujitsio West gym found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found gym: % with chat: %', v_gym_id, v_correct_chat_id;

  -- Find all chats with similar names
  SELECT ARRAY_AGG(id) INTO v_duplicate_chat_ids
  FROM public.chats
  WHERE name ILIKE '%jiujitsio%west%all%members%'
    AND id != v_correct_chat_id;

  IF v_duplicate_chat_ids IS NULL OR array_length(v_duplicate_chat_ids, 1) = 0 THEN
    RAISE NOTICE 'No duplicate chats found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % duplicate chat(s)', array_length(v_duplicate_chat_ids, 1);

  -- Move all members from duplicate chats to the correct chat
  INSERT INTO public.chat_members (chat_id, user_id, joined_at)
  SELECT v_correct_chat_id, user_id, joined_at
  FROM public.chat_members
  WHERE chat_id = ANY(v_duplicate_chat_ids)
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RAISE NOTICE 'Merged members into correct chat';

  -- Delete duplicate chats (this will cascade delete chat_members and messages)
  DELETE FROM public.chats
  WHERE id = ANY(v_duplicate_chat_ids);

  RAISE NOTICE '✅ Cleaned up duplicate chats';
END $$;

-- Verify the cleanup
SELECT 
  c.id,
  c.name,
  COUNT(cm.user_id) as member_count
FROM public.chats c
LEFT JOIN public.chat_members cm ON c.id = cm.chat_id
WHERE c.name ILIKE '%jiujitsio%west%'
GROUP BY c.id, c.name;

