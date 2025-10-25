-- Check what gyms exist in the database
SELECT 
  id,
  name,
  owner_id,
  created_at
FROM gyms
ORDER BY created_at;

