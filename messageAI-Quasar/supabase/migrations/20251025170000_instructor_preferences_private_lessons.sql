-- Migration 1: Instructor Preferences & Private Lessons
-- Adds instructor teaching preferences, student preferences, age tracking, and private lesson infrastructure

-- ============================================
-- INSTRUCTOR PREFERENCES
-- ============================================

-- Add instructor preferences JSONB column to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS instructor_preferences JSONB DEFAULT '{
    "age_groups": [],
    "class_types": [],
    "skill_levels": [],
    "available_days": [],
    "available_times": {"start": null, "end": null},
    "teaches_private_lessons": false
  }'::jsonb;

-- Add private lessons enabled flag (owner/admin must enable)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS private_lessons_enabled BOOLEAN DEFAULT false;

-- ============================================
-- GYM SETTINGS FOR INSTRUCTOR FEATURES
-- ============================================

-- Add class self-assignment setting
ALTER TABLE public.gym_settings 
  ADD COLUMN IF NOT EXISTS can_self_assign_classes BOOLEAN DEFAULT false;

-- Add private lesson approval requirement
ALTER TABLE public.gym_settings 
  ADD COLUMN IF NOT EXISTS private_lessons_require_approval BOOLEAN DEFAULT true;

-- Add AI features settings
ALTER TABLE public.gym_settings 
  ADD COLUMN IF NOT EXISTS ai_auto_assign_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_auto_assign_confidence_threshold INTEGER DEFAULT 95 CHECK (ai_auto_assign_confidence_threshold BETWEEN 0 AND 100);

-- ============================================
-- STUDENT PREFERENCES & AGE TRACKING
-- ============================================

-- Add student preferences
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS student_preferences JSONB DEFAULT '{
    "preferred_class_types": [],
    "preferred_skill_levels": []
  }'::jsonb;

-- Add birthdate and age category
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS birthdate DATE,
  ADD COLUMN IF NOT EXISTS age_category TEXT CHECK (age_category IN ('pee_wee', 'junior', 'teen', 'adult')),
  ADD COLUMN IF NOT EXISTS age_category_override BOOLEAN DEFAULT false;

-- Function to calculate age category from birthdate
CREATE OR REPLACE FUNCTION public.calculate_age_category(p_birthdate DATE)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_age INTEGER;
BEGIN
  IF p_birthdate IS NULL THEN
    RETURN 'adult'; -- Default to adult if no birthdate
  END IF;
  
  v_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, p_birthdate));
  
  IF v_age BETWEEN 5 AND 7 THEN
    RETURN 'pee_wee';
  ELSIF v_age BETWEEN 8 AND 12 THEN
    RETURN 'junior';
  ELSIF v_age BETWEEN 13 AND 17 THEN
    RETURN 'teen';
  ELSE
    RETURN 'adult';
  END IF;
END;
$$;

-- Trigger to auto-update age_category when birthdate changes
CREATE OR REPLACE FUNCTION public.update_age_category_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only update if override is not set or birthdate changed
  IF NEW.birthdate IS NOT NULL AND (NEW.age_category_override IS FALSE OR OLD.birthdate IS DISTINCT FROM NEW.birthdate) THEN
    NEW.age_category := public.calculate_age_category(NEW.birthdate);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create fresh
DROP TRIGGER IF EXISTS update_age_category ON public.profiles;
CREATE TRIGGER update_age_category
  BEFORE INSERT OR UPDATE OF birthdate, age_category_override ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_age_category_trigger();

-- ============================================
-- PRIVATE LESSON SLOTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.private_lesson_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Scheduling
  day_of_week TEXT CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  specific_date DATE, -- For one-time slots
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  
  -- Capacity
  max_students INTEGER DEFAULT 1 CHECK (max_students BETWEEN 1 AND 3),
  current_students INTEGER DEFAULT 0 CHECK (current_students >= 0),
  
  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'completed', 'cancelled')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: must have either day_of_week (recurring) or specific_date (one-time)
  CHECK (
    (is_recurring = true AND day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (is_recurring = false AND specific_date IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_private_slots_gym ON public.private_lesson_slots(gym_id);
CREATE INDEX IF NOT EXISTS idx_private_slots_instructor ON public.private_lesson_slots(instructor_id);
CREATE INDEX IF NOT EXISTS idx_private_slots_status ON public.private_lesson_slots(status);
CREATE INDEX IF NOT EXISTS idx_private_slots_date ON public.private_lesson_slots(specific_date) WHERE specific_date IS NOT NULL;

-- Enable RLS
ALTER TABLE public.private_lesson_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can view slots at their gyms"
  ON public.private_lesson_slots FOR SELECT
  USING (gym_id IN (SELECT unnest(gym_ids) FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Instructors can manage their own slots"
  ON public.private_lesson_slots FOR ALL
  USING (instructor_id = auth.uid());

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Owners can manage all slots at their gyms"
  ON public.private_lesson_slots FOR ALL
  USING (
    gym_id IN (
      SELECT unnest(owned_gym_ids) FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- PRIVATE LESSON BOOKINGS
-- ============================================

CREATE TABLE IF NOT EXISTS public.private_lesson_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.private_lesson_slots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
  
  -- Chat integration
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  
  -- Notes
  student_notes TEXT, -- Goals, special requests
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  UNIQUE(slot_id, student_id) -- Prevent duplicate bookings
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON public.private_lesson_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON public.private_lesson_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_instructor ON public.private_lesson_bookings(instructor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.private_lesson_bookings(status);

-- Enable RLS
ALTER TABLE public.private_lesson_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Students can view their own bookings"
  ON public.private_lesson_bookings FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Instructors can view their bookings"
  ON public.private_lesson_bookings FOR SELECT
  USING (instructor_id = auth.uid());

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Students can create bookings"
  ON public.private_lesson_bookings FOR INSERT
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Instructors can update their booking status"
  ON public.private_lesson_bookings FOR UPDATE
  USING (instructor_id = auth.uid());

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Owners can view all bookings at their gyms"
  ON public.private_lesson_bookings FOR SELECT
  USING (
    gym_id IN (
      SELECT unnest(owned_gym_ids) FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Update slot current_students count
CREATE OR REPLACE FUNCTION public.update_slot_student_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    UPDATE public.private_lesson_slots
    SET current_students = current_students + 1,
        status = CASE 
          WHEN current_students + 1 >= max_students THEN 'booked'
          ELSE 'available'
        END
    WHERE id = NEW.slot_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    UPDATE public.private_lesson_slots
    SET current_students = current_students + 1,
        status = CASE 
          WHEN current_students + 1 >= max_students THEN 'booked'
          ELSE 'available'
        END
    WHERE id = NEW.slot_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE public.private_lesson_slots
    SET current_students = GREATEST(0, current_students - 1),
        status = CASE 
          WHEN current_students - 1 < max_students THEN 'available'
          ELSE status
        END
    WHERE id = NEW.slot_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
    UPDATE public.private_lesson_slots
    SET current_students = GREATEST(0, current_students - 1),
        status = CASE 
          WHEN current_students - 1 < max_students THEN 'available'
          ELSE status
        END
    WHERE id = OLD.slot_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS update_slot_count ON public.private_lesson_bookings;
CREATE TRIGGER update_slot_count
  AFTER INSERT OR UPDATE OR DELETE ON public.private_lesson_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_slot_student_count();

-- Comments
COMMENT ON TABLE public.private_lesson_slots IS 'Private lesson time slots created by instructors';
COMMENT ON TABLE public.private_lesson_bookings IS 'Student bookings for private lessons';
COMMENT ON COLUMN public.profiles.instructor_preferences IS 'Instructor teaching preferences (age groups, class types, skill levels, availability)';
COMMENT ON COLUMN public.profiles.private_lessons_enabled IS 'Whether owner/admin has enabled private lessons for this instructor';
COMMENT ON COLUMN public.profiles.student_preferences IS 'Student class preferences (GI/NO-GI, skill levels)';
COMMENT ON COLUMN public.profiles.age_category IS 'Auto-calculated age category based on birthdate';
COMMENT ON COLUMN public.profiles.age_category_override IS 'True if admin manually set age category';




