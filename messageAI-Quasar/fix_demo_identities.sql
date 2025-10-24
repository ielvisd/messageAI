-- Create missing identity records for demo users
-- This is required for Supabase Auth to work properly

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid() as id,
  u.id as user_id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ) as identity_data,
  'email' as provider,
  u.id::text as provider_id,
  NOW() as last_sign_in_at,
  u.created_at,
  NOW() as updated_at
FROM auth.users u
WHERE u.email LIKE '%@demo.com'
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i 
    WHERE i.user_id = u.id
  );

-- Verify the identities were created
SELECT 
  u.email,
  i.provider,
  i.created_at
FROM auth.users u
INNER JOIN auth.identities i ON u.id = i.user_id
WHERE u.email LIKE '%@demo.com'
ORDER BY u.email;
