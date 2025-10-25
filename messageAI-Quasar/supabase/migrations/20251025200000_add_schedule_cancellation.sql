-- Add cancellation support to gym_schedules
-- This allows classes to be marked as cancelled while remaining visible on the schedule

ALTER TABLE public.gym_schedules 
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false;

-- Add index for filtering cancelled classes
CREATE INDEX IF NOT EXISTS idx_gym_schedules_cancelled ON public.gym_schedules(is_cancelled);

COMMENT ON COLUMN public.gym_schedules.is_cancelled IS 'Soft delete flag - cancelled classes remain visible but are clearly marked';

