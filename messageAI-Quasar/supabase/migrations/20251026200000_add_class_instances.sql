-- Add class_instances table for specific dated occurrences and one-time events
-- This allows infinite future planning by storing only exceptions/overrides

-- ==============================================
-- STEP 1: Create class_instances table
-- ==============================================

CREATE TABLE IF NOT EXISTS public.class_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  schedule_id UUID REFERENCES public.gym_schedules(id) ON DELETE CASCADE NULL, -- NULL for one-time events
  date DATE NOT NULL, -- Specific occurrence date
  start_time TIME,
  end_time TIME,
  instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  class_type TEXT,
  level TEXT,
  notes TEXT,
  max_capacity INTEGER,
  current_rsvps INTEGER DEFAULT 0,
  gym_location TEXT,
  is_cancelled BOOLEAN DEFAULT false,
  is_override BOOLEAN DEFAULT false, -- true if overriding recurring template
  event_type TEXT CHECK (event_type IN ('class', 'workshop', 'seminar', 'belt_test', 'competition', 'other')) DEFAULT 'class',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- STEP 2: Create indexes for performance
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_class_instances_date ON public.class_instances(date);
CREATE INDEX IF NOT EXISTS idx_class_instances_gym_date ON public.class_instances(gym_id, date);
CREATE INDEX IF NOT EXISTS idx_class_instances_schedule ON public.class_instances(schedule_id);
CREATE INDEX IF NOT EXISTS idx_class_instances_gym_schedule ON public.class_instances(gym_id, schedule_id);
CREATE INDEX IF NOT EXISTS idx_class_instances_instructor ON public.class_instances(instructor_id);
CREATE INDEX IF NOT EXISTS idx_class_instances_cancelled ON public.class_instances(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_class_instances_event_type ON public.class_instances(event_type);

-- Partial unique index to ensure no duplicate instances for the same schedule on the same date
-- Only applies when schedule_id is NOT NULL (one-time events can have same date)
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_instances_unique_schedule_date 
  ON public.class_instances(schedule_id, date) 
  WHERE schedule_id IS NOT NULL;

-- ==============================================
-- STEP 3: Enable RLS
-- ==============================================

ALTER TABLE public.class_instances ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 4: RLS Policies
-- ==============================================

-- Students and members can view active class instances in their gym
DROP POLICY IF EXISTS "view_gym_class_instances" ON public.class_instances;
CREATE POLICY "view_gym_class_instances" ON public.class_instances
  FOR SELECT USING (
    gym_id IN (
      SELECT gym_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Owners can view all class instances for their gym
DROP POLICY IF EXISTS "owners_view_class_instances" ON public.class_instances;
CREATE POLICY "owners_view_class_instances" ON public.class_instances
  FOR SELECT USING (
    gym_id IN (
      SELECT gym_id FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Instructors can view class instances they're assigned to or for their gym
DROP POLICY IF EXISTS "instructors_view_class_instances" ON public.class_instances;
CREATE POLICY "instructors_view_class_instances" ON public.class_instances
  FOR SELECT USING (
    instructor_id = auth.uid() OR
    gym_id IN (
      SELECT gym_id FROM profiles 
      WHERE id = auth.uid() AND role = 'instructor'
    )
  );

-- Owners can create class instances for their gym
DROP POLICY IF EXISTS "owners_create_class_instances" ON public.class_instances;
CREATE POLICY "owners_create_class_instances" ON public.class_instances
  FOR INSERT WITH CHECK (
    gym_id IN (
      SELECT gym_id FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Instructors can create class instances for their gym (if allowed by settings)
DROP POLICY IF EXISTS "instructors_create_class_instances" ON public.class_instances;
CREATE POLICY "instructors_create_class_instances" ON public.class_instances
  FOR INSERT WITH CHECK (
    gym_id IN (
      SELECT gym_id FROM profiles 
      WHERE id = auth.uid() AND role = 'instructor'
    )
  );

-- Owners can update any class instance for their gym
DROP POLICY IF EXISTS "owners_update_class_instances" ON public.class_instances;
CREATE POLICY "owners_update_class_instances" ON public.class_instances
  FOR UPDATE USING (
    gym_id IN (
      SELECT gym_id FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Instructors can update their own class instances (if settings allow)
DROP POLICY IF EXISTS "instructors_update_class_instances" ON public.class_instances;
CREATE POLICY "instructors_update_class_instances" ON public.class_instances
  FOR UPDATE USING (
    instructor_id = auth.uid() OR
    (gym_id IN (
      SELECT gym_id FROM profiles 
      WHERE id = auth.uid() AND role = 'instructor'
    ) AND schedule_id IN (
      SELECT id FROM gym_schedules WHERE instructor_id = auth.uid()
    ))
  );

-- Owners can delete class instances for their gym
DROP POLICY IF EXISTS "owners_delete_class_instances" ON public.class_instances;
CREATE POLICY "owners_delete_class_instances" ON public.class_instances
  FOR DELETE USING (
    gym_id IN (
      SELECT gym_id FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ==============================================
-- STEP 5: Update class_rsvps to support instances
-- ==============================================

-- Add instance_id column to class_rsvps (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_rsvps' AND column_name = 'instance_id'
  ) THEN
    ALTER TABLE public.class_rsvps 
    ADD COLUMN instance_id UUID REFERENCES public.class_instances(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for instance_id
CREATE INDEX IF NOT EXISTS idx_class_rsvps_instance ON public.class_rsvps(instance_id);

-- Update unique constraint to handle both recurring and instance-based RSVPs
-- Drop old constraint if it exists
ALTER TABLE public.class_rsvps DROP CONSTRAINT IF EXISTS class_rsvps_schedule_id_user_id_rsvp_date_key;

-- Add new constraint that handles both cases
-- Either: (schedule_id, user_id, rsvp_date) for recurring classes
-- Or: (instance_id, user_id) for one-time events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_rsvps_unique_rsvp'
  ) THEN
    ALTER TABLE public.class_rsvps 
    ADD CONSTRAINT class_rsvps_unique_rsvp 
    UNIQUE NULLS NOT DISTINCT (schedule_id, instance_id, user_id, rsvp_date);
  END IF;
END $$;

-- ==============================================
-- STEP 6: Functions for RSVP count management
-- ==============================================

-- Function to update RSVP count on class_instances
CREATE OR REPLACE FUNCTION public.update_instance_rsvp_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed' AND NEW.instance_id IS NOT NULL) THEN
    UPDATE class_instances 
    SET current_rsvps = current_rsvps + 1 
    WHERE id = NEW.instance_id;
  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'confirmed' AND OLD.instance_id IS NOT NULL) THEN
    UPDATE class_instances 
    SET current_rsvps = GREATEST(current_rsvps - 1, 0)
    WHERE id = OLD.instance_id;
  ELSIF (TG_OP = 'UPDATE' AND NEW.instance_id IS NOT NULL) THEN
    IF (OLD.status = 'confirmed' AND NEW.status != 'confirmed') THEN
      UPDATE class_instances 
      SET current_rsvps = GREATEST(current_rsvps - 1, 0)
      WHERE id = NEW.instance_id;
    ELSIF (OLD.status != 'confirmed' AND NEW.status = 'confirmed') THEN
      UPDATE class_instances 
      SET current_rsvps = current_rsvps + 1 
      WHERE id = NEW.instance_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for instance RSVP count
DROP TRIGGER IF EXISTS update_instance_rsvp_count_trigger ON public.class_rsvps;
CREATE TRIGGER update_instance_rsvp_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.class_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_instance_rsvp_count();

-- ==============================================
-- STEP 7: Comments
-- ==============================================

COMMENT ON TABLE public.class_instances IS 'Specific dated class occurrences - stores overrides and one-time events. Recurring classes are generated from gym_schedules on-the-fly.';
COMMENT ON COLUMN public.class_instances.schedule_id IS 'NULL for one-time events, references gym_schedules for overrides';
COMMENT ON COLUMN public.class_instances.is_override IS 'True when this instance overrides a recurring template (e.g., different instructor, time, or cancellation)';
COMMENT ON COLUMN public.class_instances.event_type IS 'Type of event - class for regular classes, or special events like workshop, seminar, belt_test';

