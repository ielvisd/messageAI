-- Check status of owner and instructor accounts

SELECT 
  p.email,
  p.name,
  p.role,
  p.gym_id,
  p.gym_ids,
  p.owned_gym_ids,
  g.name as gym_name,
  u.email_confirmed_at IS NOT NULL as confirmed
FROM profiles p
LEFT JOIN gyms g ON p.gym_id = g.id
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.email IN (
  'owner@jiujitsio.com',
  'carlos.martinez@jiujitsio.com',
  'ana.rodriguez@jiujitsio.com',
  'mike.chen@jiujitsio.com'
)
ORDER BY 
  CASE p.role 
    WHEN 'owner' THEN 1
    WHEN 'instructor' THEN 2
    ELSE 3
  END,
  p.email;

