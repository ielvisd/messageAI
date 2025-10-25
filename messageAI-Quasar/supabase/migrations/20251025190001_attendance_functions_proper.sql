-- ================================================
-- ATTENDANCE TRACKING FUNCTIONS
-- ================================================
-- Database functions for QR generation, check-in, 
-- and attendance reporting

-- ================================================
-- FUNCTION 1: generate_class_qr
-- ================================================
CREATE OR REPLACE FUNCTION public.generate_class_qr(
  p_schedule_id UUID,
  p_valid_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_schedule RECORD;
  v_existing_qr RECORD;
BEGIN
  -- Verify caller is instructor/owner
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('instructor', 'owner')
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Get schedule details
  SELECT * INTO v_schedule
  FROM gym_schedules
  WHERE id = p_schedule_id;

  IF v_schedule IS NULL THEN
    RAISE EXCEPTION 'schedule not found';
  END IF;

  -- Check if QR already exists for this class/date
  SELECT * INTO v_existing_qr
  FROM class_qr_codes
  WHERE schedule_id = p_schedule_id
    AND valid_date = p_valid_date
    AND expires_at > NOW();

  IF v_existing_qr IS NOT NULL THEN
    -- Return existing QR
    RETURN jsonb_build_object(
      'qr_token', v_existing_qr.qr_token,
      'expires_at', v_existing_qr.expires_at,
      'valid_date', v_existing_qr.valid_date,
      'class_type', v_schedule.class_type,
      'start_time', v_schedule.start_time,
      'end_time', v_schedule.end_time
    );
  END IF;

  -- Generate new token
  v_qr_token := 'class_' || gen_random_uuid()::TEXT;

  -- Calculate expiration (class end_time + 30 minutes on valid_date)
  v_expires_at := (p_valid_date + v_schedule.end_time + INTERVAL '30 minutes');

  -- Insert QR code
  INSERT INTO class_qr_codes (
    schedule_id,
    qr_token,
    valid_date,
    expires_at,
    created_by
  ) VALUES (
    p_schedule_id,
    v_qr_token,
    p_valid_date,
    v_expires_at,
    auth.uid()
  )
  ON CONFLICT (schedule_id, valid_date) 
  DO UPDATE SET
    qr_token = v_qr_token,
    expires_at = v_expires_at,
    created_by = auth.uid();

  RETURN jsonb_build_object(
    'qr_token', v_qr_token,
    'expires_at', v_expires_at,
    'valid_date', p_valid_date,
    'class_type', v_schedule.class_type,
    'start_time', v_schedule.start_time,
    'end_time', v_schedule.end_time
  );
END;
$$;

COMMENT ON FUNCTION public.generate_class_qr IS 'Generates or retrieves QR code for class check-in (instructor/owner only)';

-- ================================================
-- FUNCTION 2: check_in_via_qr
-- ================================================
CREATE OR REPLACE FUNCTION public.check_in_via_qr(
  p_qr_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qr RECORD;
  v_schedule RECORD;
  v_already_checked_in BOOLEAN;
BEGIN
  -- Get QR code details
  SELECT * INTO v_qr
  FROM class_qr_codes
  WHERE qr_token = p_qr_token;

  IF v_qr IS NULL THEN
    RAISE EXCEPTION 'invalid QR code';
  END IF;

  -- Check if expired
  IF v_qr.expires_at < NOW() THEN
    RAISE EXCEPTION 'QR code expired';
  END IF;

  -- Check if valid for today
  IF v_qr.valid_date != CURRENT_DATE THEN
    RAISE EXCEPTION 'QR code not valid for today';
  END IF;

  -- Get schedule details
  SELECT * INTO v_schedule
  FROM gym_schedules
  WHERE id = v_qr.schedule_id;

  IF v_schedule IS NULL THEN
    RAISE EXCEPTION 'class not found';
  END IF;

  -- Check if already checked in
  SELECT EXISTS(
    SELECT 1 FROM class_attendance
    WHERE user_id = auth.uid()
      AND schedule_id = v_qr.schedule_id
      AND DATE(check_in_time) = CURRENT_DATE
  ) INTO v_already_checked_in;

  IF v_already_checked_in THEN
    RAISE EXCEPTION 'already checked in to this class today';
  END IF;

  -- Record attendance
  INSERT INTO class_attendance (
    schedule_id,
    user_id,
    check_in_time,
    check_in_method,
    gym_id
  ) VALUES (
    v_qr.schedule_id,
    auth.uid(),
    NOW(),
    'qr_code',
    v_schedule.gym_id
  );

  -- Return success with class details
  RETURN jsonb_build_object(
    'success', true,
    'class_type', v_schedule.class_type,
    'day_of_week', v_schedule.day_of_week,
    'start_time', v_schedule.start_time,
    'end_time', v_schedule.end_time,
    'level', v_schedule.level,
    'instructor_name', v_schedule.instructor_name,
    'check_in_time', NOW()
  );
END;
$$;

COMMENT ON FUNCTION public.check_in_via_qr IS 'Checks in student to class via scanned QR code';

-- ================================================
-- FUNCTION 3: manual_check_in
-- ================================================
CREATE OR REPLACE FUNCTION public.manual_check_in(
  p_schedule_id UUID,
  p_user_id UUID,
  p_check_in_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_marker_role TEXT;
  v_already_checked_in BOOLEAN;
BEGIN
  -- Verify caller is instructor/owner
  SELECT role INTO v_marker_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_marker_role NOT IN ('instructor', 'owner') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Get schedule details
  SELECT * INTO v_schedule
  FROM gym_schedules
  WHERE id = p_schedule_id;

  IF v_schedule IS NULL THEN
    RAISE EXCEPTION 'class not found';
  END IF;

  -- Check if already checked in
  SELECT EXISTS(
    SELECT 1 FROM class_attendance
    WHERE user_id = p_user_id
      AND schedule_id = p_schedule_id
      AND DATE(check_in_time) = p_check_in_date
  ) INTO v_already_checked_in;

  IF v_already_checked_in THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Student already checked in'
    );
  END IF;

  -- Record attendance
  INSERT INTO class_attendance (
    schedule_id,
    user_id,
    check_in_time,
    check_in_method,
    marked_by,
    gym_id
  ) VALUES (
    p_schedule_id,
    p_user_id,
    (p_check_in_date + v_schedule.start_time), -- Use class start time
    'manual',
    auth.uid(),
    v_schedule.gym_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Attendance marked'
  );
END;
$$;

COMMENT ON FUNCTION public.manual_check_in IS 'Instructor manually marks student attendance (instructor/owner only)';

-- ================================================
-- FUNCTION 4: get_class_attendance_list
-- ================================================
CREATE OR REPLACE FUNCTION public.get_class_attendance_list(
  p_schedule_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  check_in_time TIMESTAMPTZ,
  check_in_method TEXT,
  current_belt TEXT,
  current_stripes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is instructor/owner
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('instructor', 'owner')
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT 
    ca.user_id,
    p.name AS user_name,
    p.avatar_url,
    ca.check_in_time,
    ca.check_in_method,
    p.current_belt,
    p.current_stripes
  FROM class_attendance ca
  JOIN profiles p ON ca.user_id = p.id
  WHERE ca.schedule_id = p_schedule_id
    AND DATE(ca.check_in_time) = p_date
  ORDER BY ca.check_in_time ASC;
END;
$$;

COMMENT ON FUNCTION public.get_class_attendance_list IS 'Gets list of students who checked into a class (instructor/owner only)';

-- ================================================
-- FUNCTION 5: get_student_attendance_stats
-- ================================================
CREATE OR REPLACE FUNCTION public.get_student_attendance_stats(
  p_user_id UUID,
  p_gym_id UUID,
  p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_classes INTEGER;
  v_total_hours NUMERIC;
  v_gi_classes INTEGER;
  v_nogi_classes INTEGER;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  -- Verify caller is viewing own stats or is instructor/owner
  IF auth.uid() != p_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('instructor', 'owner')
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Calculate total classes attended
  SELECT COUNT(DISTINCT DATE(check_in_time))
  INTO v_total_classes
  FROM class_attendance
  WHERE user_id = p_user_id
    AND gym_id = p_gym_id
    AND DATE(check_in_time) BETWEEN p_start_date AND p_end_date;

  -- Calculate total hours (approximate)
  SELECT COALESCE(SUM(
    EXTRACT(EPOCH FROM (gs.end_time - gs.start_time)) / 3600
  ), 0)
  INTO v_total_hours
  FROM class_attendance ca
  JOIN gym_schedules gs ON ca.schedule_id = gs.id
  WHERE ca.user_id = p_user_id
    AND ca.gym_id = p_gym_id
    AND DATE(ca.check_in_time) BETWEEN p_start_date AND p_end_date;

  -- Count GI classes
  SELECT COUNT(*)
  INTO v_gi_classes
  FROM class_attendance ca
  JOIN gym_schedules gs ON ca.schedule_id = gs.id
  WHERE ca.user_id = p_user_id
    AND ca.gym_id = p_gym_id
    AND gs.class_type = 'GI'
    AND DATE(ca.check_in_time) BETWEEN p_start_date AND p_end_date;

  -- Count NO-GI classes
  SELECT COUNT(*)
  INTO v_nogi_classes
  FROM class_attendance ca
  JOIN gym_schedules gs ON ca.schedule_id = gs.id
  WHERE ca.user_id = p_user_id
    AND ca.gym_id = p_gym_id
    AND gs.class_type = 'NO-GI'
    AND DATE(ca.check_in_time) BETWEEN p_start_date AND p_end_date;

  -- Calculate current streak (consecutive days with attendance)
  WITH daily_attendance AS (
    SELECT DISTINCT DATE(check_in_time) as attendance_date
    FROM class_attendance
    WHERE user_id = p_user_id
      AND gym_id = p_gym_id
    ORDER BY DATE(check_in_time) DESC
  ),
  streak AS (
    SELECT 
      attendance_date,
      attendance_date - ROW_NUMBER() OVER (ORDER BY attendance_date DESC)::INTEGER AS streak_group
    FROM daily_attendance
  )
  SELECT COUNT(*)
  INTO v_current_streak
  FROM streak
  WHERE streak_group = (SELECT MAX(streak_group) FROM streak WHERE attendance_date = CURRENT_DATE);

  v_current_streak := COALESCE(v_current_streak, 0);

  RETURN jsonb_build_object(
    'total_classes', v_total_classes,
    'total_hours', ROUND(v_total_hours, 1),
    'gi_classes', v_gi_classes,
    'nogi_classes', v_nogi_classes,
    'current_streak', v_current_streak,
    'period_start', p_start_date,
    'period_end', p_end_date
  );
END;
$$;

COMMENT ON FUNCTION public.get_student_attendance_stats IS 'Gets attendance statistics for a student';

-- ================================================
-- FUNCTION 6: record_belt_promotion
-- ================================================
CREATE OR REPLACE FUNCTION public.record_belt_promotion(
  p_user_id UUID,
  p_belt_color TEXT,
  p_stripes INTEGER,
  p_gym_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is instructor/owner
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('instructor', 'owner')
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Insert belt progression record
  INSERT INTO belt_progression (
    user_id,
    gym_id,
    belt_color,
    stripes,
    awarded_by,
    notes
  ) VALUES (
    p_user_id,
    p_gym_id,
    p_belt_color,
    p_stripes,
    auth.uid(),
    p_notes
  );

  -- Update user's current belt
  UPDATE profiles
  SET 
    current_belt = p_belt_color,
    current_stripes = p_stripes
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'belt_color', p_belt_color,
    'stripes', p_stripes
  );
END;
$$;

COMMENT ON FUNCTION public.record_belt_promotion IS 'Records a belt promotion and updates student profile (instructor/owner only)';

-- ================================================
-- FUNCTION 7: get_gym_attendance_report
-- ================================================
CREATE OR REPLACE FUNCTION public.get_gym_attendance_report(
  p_gym_id UUID,
  p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  total_classes INTEGER,
  attendance_rate NUMERIC,
  current_belt TEXT,
  current_stripes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_days INTEGER;
BEGIN
  -- Verify caller is owner
  IF NOT EXISTS (
    SELECT 1 FROM gyms 
    WHERE id = p_gym_id 
    AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  v_total_days := (p_end_date - p_start_date) + 1;

  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.name AS user_name,
    COUNT(DISTINCT DATE(ca.check_in_time))::INTEGER AS total_classes,
    ROUND((COUNT(DISTINCT DATE(ca.check_in_time))::NUMERIC / v_total_days) * 100, 1) AS attendance_rate,
    p.current_belt,
    p.current_stripes
  FROM profiles p
  LEFT JOIN class_attendance ca ON p.id = ca.user_id 
    AND ca.gym_id = p_gym_id
    AND DATE(ca.check_in_time) BETWEEN p_start_date AND p_end_date
  WHERE p.gym_id = p_gym_id
    AND p.role = 'student'
  GROUP BY p.id, p.name, p.current_belt, p.current_stripes
  ORDER BY total_classes DESC;
END;
$$;

COMMENT ON FUNCTION public.get_gym_attendance_report IS 'Gets attendance report for all students in gym (owner only)';

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Attendance tracking functions created successfully';
  RAISE NOTICE '📊 Functions: generate_class_qr, check_in_via_qr, manual_check_in, get_class_attendance_list, get_student_attendance_stats, record_belt_promotion, get_gym_attendance_report';
END $$;

