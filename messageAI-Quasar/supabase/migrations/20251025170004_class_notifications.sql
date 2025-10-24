-- Migration 5: Class Notification System
-- Smart notifications for class cancellations and changes

-- ============================================
-- NOTIFICATION PREFERENCES IN GYM SETTINGS
-- ============================================

ALTER TABLE public.gym_settings 
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "notify_on_class_cancellation": true,
    "notify_on_instructor_change": true,
    "show_instructor_on_schedule": true,
    "send_daily_digest": false
  }'::jsonb;

-- ============================================
-- CLASS CANCELLATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.class_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.gym_schedules(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  
  -- Cancellation details
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  alternative_suggestions TEXT[], -- Reschedule options, substitute instructors
  
  -- Notification tracking
  students_notified UUID[], -- Array of user IDs who were notified
  notification_sent_at TIMESTAMPTZ,
  
  cancelled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cancellations_schedule ON public.class_cancellations(schedule_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_gym ON public.class_cancellations(gym_id);
CREATE INDEX IF NOT EXISTS idx_cancellations_date ON public.class_cancellations(cancelled_at);

-- Enable RLS
ALTER TABLE public.class_cancellations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can view cancellations at their gyms"
  ON public.class_cancellations FOR SELECT
  USING (
    gym_id IN (
      SELECT unnest(gym_ids) FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Owners can manage cancellations"
  ON public.class_cancellations FOR ALL
  USING (
    gym_id IN (
      SELECT unnest(owned_gym_ids) FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS FOR SMART NOTIFICATIONS
-- ============================================

-- Get affected students for a class (matches age category and preferences)
CREATE OR REPLACE FUNCTION public.get_affected_students(p_schedule_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  age_category TEXT,
  is_parent BOOLEAN,
  notification_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class RECORD;
  v_class_age_category TEXT;
BEGIN
  -- Get class details
  SELECT 
    gym_id,
    class_type,
    level,
    notes,
    day_of_week,
    start_time
  INTO v_class
  FROM public.gym_schedules
  WHERE id = p_schedule_id;
  
  IF v_class IS NULL THEN
    RAISE EXCEPTION 'schedule not found';
  END IF;
  
  -- Determine class age category from notes
  IF v_class.notes ILIKE '%pee wee%' OR v_class.notes ILIKE '%5-7%' THEN
    v_class_age_category := 'pee_wee';
  ELSIF v_class.notes ILIKE '%kids%' OR v_class.notes ILIKE '%8-12%' THEN
    v_class_age_category := 'junior';
  ELSIF v_class.notes ILIKE '%teen%' OR v_class.notes ILIKE '%13-17%' THEN
    v_class_age_category := 'teen';
  ELSE
    v_class_age_category := 'adult';
  END IF;
  
  -- Get students matching age category
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.name as user_name,
    p.email as user_email,
    p.age_category,
    (p.parent_type IS NOT NULL) as is_parent,
    'Matches age group: ' || v_class_age_category as notification_reason
  FROM public.profiles p
  WHERE p.gym_id = v_class.gym_id
    AND p.role IN ('student', 'instructor')
    AND (
      -- Direct age match
      (p.age_category = v_class_age_category)
      OR
      -- Training parents of kids in this age category
      (p.parent_type = 'training_parent' AND EXISTS (
        SELECT 1 FROM public.dependents d
        WHERE d.parent_id = p.id AND d.age_category = v_class_age_category
      ))
      OR
      -- Non-training parents with kids in this age category
      (p.parent_type = 'non_training_parent' AND EXISTS (
        SELECT 1 FROM public.dependents d
        WHERE d.parent_id = p.id AND d.age_category = v_class_age_category
      ))
    )
  
  UNION
  
  -- Include teen account holders if teen class
  SELECT 
    p.id as user_id,
    p.name as user_name,
    p.email as user_email,
    d.age_category,
    false as is_parent,
    'Teen account holder' as notification_reason
  FROM public.dependents d
  JOIN public.profiles p ON p.id = d.child_account_id
  WHERE d.gym_id = v_class.gym_id
    AND d.age_category = v_class_age_category
    AND d.is_account_holder = true;
END;
$$;

-- Cancel a class and notify affected students
CREATE OR REPLACE FUNCTION public.cancel_class(
  p_schedule_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_alternative_suggestions TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gym_id UUID;
  v_cancellation_id UUID;
  v_affected_students UUID[];
  v_notification_enabled BOOLEAN;
  v_student RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Verify user has permission (owner/admin)
  SELECT gym_id INTO v_gym_id
  FROM public.gym_schedules
  WHERE id = p_schedule_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND v_gym_id = ANY(owned_gym_ids)
  ) THEN
    RAISE EXCEPTION 'unauthorized: must own gym';
  END IF;
  
  -- Check if notifications are enabled
  SELECT (notification_preferences->>'notify_on_class_cancellation')::boolean
  INTO v_notification_enabled
  FROM public.gym_settings
  WHERE gym_id = v_gym_id;
  
  -- Get affected students
  SELECT array_agg(gs.user_id)
  INTO v_affected_students
  FROM public.get_affected_students(p_schedule_id) gs;
  
  v_count := COALESCE(array_length(v_affected_students, 1), 0);
  
  -- Mark class as cancelled in gym_schedules
  UPDATE public.gym_schedules
  SET 
    is_active = false,
    notes = COALESCE(notes || ' | ', '') || 'CANCELLED: ' || COALESCE(p_reason, 'No reason provided'),
    updated_at = NOW()
  WHERE id = p_schedule_id;
  
  -- Create cancellation record
  INSERT INTO public.class_cancellations (
    schedule_id,
    gym_id,
    cancelled_by,
    reason,
    alternative_suggestions,
    students_notified,
    notification_sent_at
  ) VALUES (
    p_schedule_id,
    v_gym_id,
    auth.uid(),
    p_reason,
    p_alternative_suggestions,
    v_affected_students,
    CASE WHEN v_notification_enabled THEN NOW() ELSE NULL END
  )
  RETURNING id INTO v_cancellation_id;
  
  -- TODO: Actual push notification integration would go here
  -- For now, we just record who should be notified
  
  RETURN jsonb_build_object(
    'success', true,
    'cancellation_id', v_cancellation_id,
    'students_notified_count', v_count,
    'notification_sent', v_notification_enabled
  );
END;
$$;

-- Get cancellation alternatives (substitute instructors, reschedule options)
CREATE OR REPLACE FUNCTION public.get_cancellation_alternatives(p_schedule_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class RECORD;
  v_substitute_instructors JSONB;
  v_reschedule_options JSONB;
  v_affected_student_count INTEGER;
BEGIN
  -- Get class details
  SELECT * INTO v_class
  FROM public.gym_schedules
  WHERE id = p_schedule_id;
  
  IF v_class IS NULL THEN
    RAISE EXCEPTION 'schedule not found';
  END IF;
  
  -- Get substitute instructors
  SELECT jsonb_agg(
    jsonb_build_object(
      'instructor_id', ga.instructor_id,
      'instructor_name', ga.instructor_name,
      'match_score', ga.match_score,
      'is_available', ga.is_available,
      'match_reasons', ga.match_reasons
    )
    ORDER BY ga.match_score DESC
  )
  INTO v_substitute_instructors
  FROM public.get_available_instructors(v_class.gym_id, p_schedule_id) ga
  WHERE ga.is_available = true
  LIMIT 5;
  
  -- Count affected students
  SELECT COUNT(*)
  INTO v_affected_student_count
  FROM public.get_affected_students(p_schedule_id);
  
  -- Build response
  RETURN jsonb_build_object(
    'class_info', jsonb_build_object(
      'id', v_class.id,
      'class_type', v_class.class_type,
      'level', v_class.level,
      'day_of_week', v_class.day_of_week,
      'start_time', v_class.start_time,
      'notes', v_class.notes
    ),
    'affected_students', v_affected_student_count,
    'substitute_instructors', COALESCE(v_substitute_instructors, '[]'::jsonb),
    'recommendations', ARRAY[
      'Find substitute from available instructors',
      'Reschedule to another day/time',
      'Cancel and notify affected students'
    ]
  );
END;
$$;

-- Comments
COMMENT ON TABLE public.class_cancellations IS 'Tracks cancelled classes and who was notified';
COMMENT ON FUNCTION public.get_affected_students IS 'Returns students who should be notified about a class (matches age, includes parents of young kids)';
COMMENT ON FUNCTION public.cancel_class IS 'Cancels a class and notifies affected students';
COMMENT ON FUNCTION public.get_cancellation_alternatives IS 'Suggests alternatives when considering cancelling a class (substitutes, reschedule options)';




