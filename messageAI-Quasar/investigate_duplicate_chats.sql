-- Investigate duplicate Jiujitsio West chats
-- Check gyms
SELECT 
  id,
  name,
  gym_chat_id,
  created_at
FROM gyms
WHERE name ILIKE '%jiujitsio%'
ORDER BY name, created_at;

-- Check chats
SELECT 
  c.id,
  c.name,
  c.type,
  c.created_at,
  COUNT(cm.user_id) as member_count
FROM chats c
LEFT JOIN chat_members cm ON c.id = cm.chat_id
WHERE c.name ILIKE '%jiujitsio%'
GROUP BY c.id, c.name, c.type, c.created_at
ORDER BY c.name, c.created_at;

-- Check Taylor Smith's chat memberships
SELECT 
  c.id as chat_id,
  c.name as chat_name,
  c.type,
  cm.joined_at,
  g.name as gym_name
FROM profiles p
JOIN chat_members cm ON p.id = cm.user_id
JOIN chats c ON cm.chat_id = c.id
LEFT JOIN gyms g ON c.id = g.gym_chat_id
WHERE p.name ILIKE '%taylor%smith%'
  AND c.name ILIKE '%jiujitsio%'
ORDER BY c.name, cm.joined_at;

-- Check for duplicate gym chats
SELECT 
  name,
  COUNT(*) as duplicate_count
FROM chats
WHERE name ILIKE '%jiujitsio%'
GROUP BY name
HAVING COUNT(*) > 1;

