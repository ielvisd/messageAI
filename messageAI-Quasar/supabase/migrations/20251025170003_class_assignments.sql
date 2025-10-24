-- Migration 4: Class Assignment System
-- Enables instructor assignment to classes with tracking and bulk operations

-- ============================================
-- ADD ASSIGNMENT FIELDS TO GYM_SCHEDULES
-- ============================================

ALTER TABLE public.gym_schedules 
  ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instructor_name TEXT,
  ADD COLUMN IF NOT EXISTS assignment_type TEXT CHECK (assignment_type IN ('one_time', 'recurring_weekly', 'recurring_monthly', 'recurring_yearly')),
  ADD COLUMN IF NOT EXISTS recurring_until DATE;

-- Index for instructor queries
CREATE INDEX IF NOT EXISTS idx_gym_schedules_instructor ON public.gym_schedules(instructor_id) WHERE instructor_id IS NOT NULL;

-- ============================================
-- CLASS ASSIGNMENT HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.gym_schedules(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  
  -- Who assigned
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assignment_method TEXT CHECK (assignment_method IN ('manual', 'self_assigned', 'ai_auto', 'ai_suggested')),
  
  -- Dates
  assignment_date TIMESTAMPTZ DEFAULT NOW(),
  class_date DATE,
  
  -- Status
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'completed', 'cancelled', 'no_show')),
  
  -- AI confidence (if AI-assigned)
  ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assignments_schedule ON public.class_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_assignments_instructor ON public.class_assignments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_gym ON public.class_assignments(gym_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_date ON public.class_assignments(class_date);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.class_assignments(status);

-- Enable RLS
ALTER TABLE public.class_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Instructors can view their assignments"
  ON public.class_assignments FOR SELECT
  USING (instructor_id = auth.uid());

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Owners can manage assignments at their gyms"
  ON public.class_assignments FOR ALL
  USING (
    gym_id IN (
      SELECT unnest(owned_gym_ids) FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can view assignments at their gyms"
  ON public.class_assignments FOR SELECT
  USING (
    gym_id IN (
      SELECT unnest(gym_ids) FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- ASSIGNMENT FUNCTIONS
-- ============================================

-- Assign instructor to a single class
CREATE OR REPLACE FUNCTION public.assign_instructor_to_class(
  p_schedule_id UUID,
  p_instructor_id UUID,
  p_assignment_type TEXT DEFAULT 'one_time',
  p_assigned_by UUID DEFAULT NULL,
  p_assignment_method TEXT DEFAULT 'manual',
  p_ai_confidence INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id UUID;
  v_gym_id UUID;
  v_instructor_name TEXT;
  v_class_date DATE;
BEGIN
  -- Get schedule info
  SELECT gym_id INTO v_gym_id
  FROM public.gym_schedules
  WHERE id = p_schedule_id;
  
  IF v_gym_id IS NULL THEN
    RAISE EXCEPTION 'schedule not found';
  END IF;
  
  -- Get instructor name
  SELECT name INTO v_instructor_name
  FROM public.profiles
  WHERE id = p_instructor_id;
  
  -- Calculate next class date (for tracking)
  -- For now, use current date + day offset
  v_class_date := CURRENT_DATE;
  
  -- Update gym_schedules
  UPDATE public.gym_schedules
  SET 
    instructor_id = p_instructor_id,
    instructor_name = v_instructor_name,
    assignment_type = p_assignment_type,
    updated_at = NOW()
  WHERE id = p_schedule_id;
  
  -- Create assignment record
  INSERT INTO public.class_assignments (
    schedule_id,
    instructor_id,
    gym_id,
    assigned_by,
    assignment_method,
    class_date,
    ai_confidence_score
  ) VALUES (
    p_schedule_id,
    p_instructor_id,
    v_gym_id,
    COALESCE(p_assigned_by, auth.uid()),
    p_assignment_method,
    v_class_date,
    p_ai_confidence
  )
  RETURNING id INTO v_assignment_id;
  
  RETURN v_assignment_id;
END;
$$;

-- Get available instructors for a class
CREATE OR REPLACE FUNCTION public.get_available_instructors(
  p_gym_id UUID,
  p_schedule_id UUID
)
RETURNS TABLE (
  instructor_id UUID,
  instructor_name TEXT,
  match_score INTEGER,
  match_reasons TEXT[],
  is_available BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class RECORD;
  v_instructor RECORD;
  v_score INTEGER;
  v_reasons TEXT[];
BEGIN
  -- Get class details
  SELECT 
    class_type,
    level,
    notes,
    day_of_week,
    start_time,
    end_time
  INTO v_class
  FROM public.gym_schedules
  WHERE id = p_schedule_id;
  
  IF v_class IS NULL THEN
    RAISE EXCEPTION 'schedule not found';
  END IF;
  
  -- Query all instructors at this gym
  FOR v_instructor IN
    SELECT 
      p.id,
      p.name,
      p.instructor_preferences,
      p.private_lessons_enabled
    FROM public.profiles p
    WHERE p.role = 'instructor'
      AND p.gym_id = p_gym_id
  LOOP
    v_score := 0;
    v_reasons := ARRAY[]::TEXT[];
    
    -- Score based on class_type preference
    IF v_class.class_type IS NOT NULL AND 
       v_instructor.instructor_preferences->'class_types' ? LOWER(v_class.class_type) THEN
      v_score := v_score + 30;
      v_reasons := array_append(v_reasons, 'Prefers ' || v_class.class_type);
    END IF;
    
    -- Score based on level preference
    IF v_class.level IS NOT NULL AND 
       v_instructor.instructor_preferences->'skill_levels' ? LOWER(REPLACE(v_class.level, ' ', '_')) THEN
      v_score := v_score + 20;
      v_reasons := array_append(v_reasons, 'Teaches ' || v_class.level);
    END IF;
    
    -- Score based on day availability
    IF v_class.day_of_week IS NOT NULL AND 
       v_instructor.instructor_preferences->'available_days' ? LOWER(v_class.day_of_week) THEN
      v_score := v_score + 25;
      v_reasons := array_append(v_reasons, 'Available ' || v_class.day_of_week);
    END IF;
    
    -- Score based on age group (parsed from notes)
    IF v_class.notes ILIKE '%kids%' AND 
       v_instructor.instructor_preferences->'age_groups' ? 'kids' THEN
      v_score := v_score + 25;
      v_reasons := array_append(v_reasons, 'Teaches kids');
    ELSIF v_class.notes ILIKE '%adult%' AND 
          v_instructor.instructor_preferences->'age_groups' ? 'adults' THEN
      v_score := v_score + 25;
      v_reasons := array_append(v_reasons, 'Teaches adults');
    ELSIF v_class.notes ILIKE '%teen%' AND 
          v_instructor.instructor_preferences->'age_groups' ? 'teens' THEN
      v_score := v_score + 25;
      v_reasons := array_append(v_reasons, 'Teaches teens');
    ELSIF v_class.notes ILIKE '%pee wee%' AND 
          v_instructor.instructor_preferences->'age_groups' ? 'pee_wees' THEN
      v_score := v_score + 25;
      v_reasons := array_append(v_reasons, 'Teaches pee wees');
    END IF;
    
    -- Check if instructor is available (no conflicting assignments)
    is_available := NOT EXISTS (
      SELECT 1 FROM public.gym_schedules gs
      WHERE gs.instructor_id = v_instructor.id
        AND gs.day_of_week = v_class.day_of_week
        AND gs.id != p_schedule_id
        AND (
          (gs.start_time, gs.end_time) OVERLAPS (v_class.start_time, v_class.end_time)
        )
    );
    
    IF NOT is_available THEN
      v_reasons := array_append(v_reasons, 'Has conflicting class');
    END IF;
    
    -- Return this instructor
    instructor_id := v_instructor.id;
    instructor_name := v_instructor.name;
    match_score := v_score;
    match_reasons := v_reasons;
    
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Bulk assign instructor to multiple classes
CREATE OR REPLACE FUNCTION public.bulk_assign_instructor(
  p_instructor_id UUID,
  p_gym_id UUID,
  p_filters JSONB,
  p_duration_days INTEGER
)
RETURNS TABLE (
  schedule_id UUID,
  class_name TEXT,
  day_of_week TEXT,
  start_time TIME,
  was_assigned BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_assigned BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Get matching schedules
  FOR v_schedule IN
    SELECT 
      gs.id,
      gs.class_type || ' - ' || COALESCE(gs.level, 'All Levels') as name,
      gs.day_of_week,
      gs.start_time,
      gs.instructor_id
    FROM public.gym_schedules gs
    WHERE gs.gym_id = p_gym_id
      AND gs.is_active = true
      AND (p_filters->>'class_type' IS NULL OR gs.class_type = p_filters->>'class_type')
      AND (p_filters->>'level' IS NULL OR gs.level = p_filters->>'level')
      AND (p_filters->>'day_of_week' IS NULL OR gs.day_of_week = p_filters->>'day_of_week')
  LOOP
    schedule_id := v_schedule.id;
    class_name := v_schedule.name;
    day_of_week := v_schedule.day_of_week;
    start_time := v_schedule.start_time;
    
    -- Check if already assigned
    IF v_schedule.instructor_id IS NOT NULL THEN
      was_assigned := false;
      reason := 'Already assigned to another instructor';
    ELSE
      -- Assign this class
      PERFORM public.assign_instructor_to_class(
        v_schedule.id,
        p_instructor_id,
        CASE 
          WHEN p_duration_days <= 7 THEN 'recurring_weekly'
          WHEN p_duration_days <= 31 THEN 'recurring_monthly'
          ELSE 'recurring_yearly'
        END,
        auth.uid(),
        'manual',
        NULL
      );
      
      was_assigned := true;
      reason := 'Successfully assigned';
    END IF;
    
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Comments
COMMENT ON TABLE public.class_assignments IS 'History of instructor assignments to classes';
COMMENT ON FUNCTION public.assign_instructor_to_class IS 'Assigns an instructor to a class and creates history record';
COMMENT ON FUNCTION public.get_available_instructors IS 'Returns instructors ranked by match quality for a specific class';
COMMENT ON FUNCTION public.bulk_assign_instructor IS 'Assigns instructor to multiple matching classes at once';




