-- Check Alex Chen's current profile state

SELECT 
  id,
  name,
  email,
  role,
  gym_id,
  gym_ids,
  owned_gym_ids,
  created_at
FROM profiles 
WHERE email = 'alex.student@demo.com';

-- Also check what gyms exist
SELECT 
  id,
  name,
  owner_id
FROM gyms
ORDER BY name;

-- Check if Alex is in any chats
SELECT 
  c.id as chat_id,
  c.name as chat_name,
  c.gym_id,
  g.name as gym_name,
  cm.role as alex_role_in_chat
FROM chat_members cm
JOIN chats c ON c.id = cm.chat_id
LEFT JOIN gyms g ON g.id = c.gym_id
WHERE cm.user_id = (SELECT id FROM profiles WHERE email = 'alex.student@demo.com')
ORDER BY c.name;

