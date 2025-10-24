-- Fix owned_gym_ids for existing gym owners
-- This ensures all gym owners have their owned_gym_ids array properly populated

-- Update profiles where user is marked as owner but owned_gym_ids is empty
-- This handles the case where gym_id is set but owned_gym_ids wasn't populated
UPDATE public.profiles 
SET owned_gym_ids = ARRAY[gym_id]
WHERE role = 'owner' 
  AND gym_id IS NOT NULL 
  AND (owned_gym_ids IS NULL OR owned_gym_ids = ARRAY[]::UUID[]);

-- Also handle cases where a user owns gyms (based on gyms.owner_id) 
-- but their profile doesn't reflect this
UPDATE public.profiles p
SET 
  role = 'owner',
  owned_gym_ids = ARRAY(
    SELECT g.id 
    FROM public.gyms g 
    WHERE g.owner_id = p.id
  )
WHERE p.id IN (
  SELECT DISTINCT owner_id 
  FROM public.gyms 
  WHERE owner_id IS NOT NULL
)
AND (p.role IS NULL OR p.owned_gym_ids IS NULL OR p.owned_gym_ids = ARRAY[]::UUID[]);

-- Set gym_id to first owned gym if not already set
UPDATE public.profiles
SET gym_id = owned_gym_ids[1]
WHERE role = 'owner'
  AND gym_id IS NULL
  AND owned_gym_ids IS NOT NULL
  AND array_length(owned_gym_ids, 1) > 0;

