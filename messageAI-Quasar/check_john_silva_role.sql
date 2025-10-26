-- Check John Silva's role
SELECT 
    id,
    name,
    email,
    role,
    gym_id,
    owned_gym_ids
FROM public.profiles
WHERE name ILIKE '%john%silva%' 
   OR email ILIKE '%john%silva%';

-- If you need to set the role to 'owner', run this:
-- UPDATE public.profiles 
-- SET role = 'owner' 
-- WHERE name ILIKE '%john%silva%';

