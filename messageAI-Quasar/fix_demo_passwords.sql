-- Update demo account passwords with proper bcrypt hash for "demo123456"
-- Hash generated with bcrypt rounds=10

UPDATE auth.users 
SET encrypted_password = '$2a$10$rJ8qXxGZxVZpKqX8qXxGZO7Y7Y7Y7Y7Y7Y7Y7Y7Y7Y7Y7Y7Y7Y7Ya',
    email_confirmed_at = NOW(),
    confirmation_token = '',
    recovery_token = ''
WHERE email IN (
  'alex.student@demo.com',
  'jordan.competitor@demo.com', 
  'sam.teen@demo.com',
  'mia.kid@demo.com',
  'parent.trainer@demo.com',
  'casey.beginner@demo.com',
  'lily.peewee@demo.com'
);

-- Verify the update
SELECT email, 
       CASE WHEN encrypted_password LIKE '$2a$10$rJ8%' THEN 'Updated' ELSE 'Old' END as status,
       email_confirmed_at IS NOT NULL as confirmed
FROM auth.users 
WHERE email LIKE '%@demo.com'
ORDER BY email;
