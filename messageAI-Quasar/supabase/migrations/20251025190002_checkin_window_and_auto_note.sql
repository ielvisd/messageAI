-- Enforce check-in window and add optional auto-note behavior

-- 1) Optional: gyms settings already a JSONB column; no schema change needed for settings
--    If you prefer a dedicated column, uncomment below:
-- ALTER TABLE public.gyms
--   ADD COLUMN IF NOT EXISTS auto_note_on_overfull_or_unrsvp boolean NOT NULL DEFAULT false;

-- 2) Update check_in_via_qr to enforce ±30 minutes window and return flags
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
  v_had_rsvp BOOLEAN := false;
  v_was_full BOOLEAN := false;
  v_now TIMESTAMPTZ := NOW();
  v_gym_settings JSONB := '{}'::jsonb;
  v_auto_note BOOLEAN := false;
BEGIN
  -- Get QR code details
  SELECT * INTO v_qr
  FROM class_qr_codes
  WHERE qr_token = p_qr_token;

  IF v_qr IS NULL THEN
    RAISE EXCEPTION 'invalid QR code';
  END IF;

  -- Check if expired
  IF v_qr.expires_at < v_now THEN
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

  -- Enforce check-in window: from start_time -30m to start_time +30m (on valid_date)
  IF v_now < (v_qr.valid_date + v_schedule.start_time - INTERVAL '30 minutes')
     OR v_now > (v_qr.valid_date + v_schedule.start_time + INTERVAL '30 minutes') THEN
    RAISE EXCEPTION 'check-in outside allowed window';
  END IF;

  -- Check if already checked in today
  SELECT EXISTS(
    SELECT 1 FROM class_attendance
    WHERE user_id = auth.uid()
      AND schedule_id = v_qr.schedule_id
      AND DATE(check_in_time) = CURRENT_DATE
  ) INTO v_already_checked_in;

  IF v_already_checked_in THEN
    RAISE EXCEPTION 'already checked in to this class today';
  END IF;

  -- Check RSVP status for today
  SELECT EXISTS(
    SELECT 1 FROM class_rsvps
    WHERE schedule_id = v_qr.schedule_id
      AND user_id = auth.uid()
      AND rsvp_date = CURRENT_DATE
  ) INTO v_had_rsvp;

  -- Check capacity
  IF COALESCE(v_schedule.max_capacity, 0) > 0 THEN
    v_was_full := COALESCE(v_schedule.current_rsvps, 0) >= v_schedule.max_capacity;
  END IF;

  -- Get gym settings
  SELECT COALESCE(settings, '{}'::jsonb) INTO v_gym_settings FROM gyms WHERE id = v_schedule.gym_id;
  v_auto_note := COALESCE((v_gym_settings ->> 'autoNoteOnOverfullOrUnrsvp')::boolean, false);

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
    v_now,
    'qr_code',
    v_schedule.gym_id
  );

  -- Optionally create an instructor note if enabled and condition met
  IF v_auto_note AND (NOT v_had_rsvp OR v_was_full) THEN
    INSERT INTO student_notes (
      student_id,
      instructor_id,
      gym_id,
      note_type,
      content,
      class_date,
      schedule_id
    )
    VALUES (
      auth.uid(),
      NULL, -- system/generated; can be NULL or owner_id if desired
      v_schedule.gym_id,
      'general',
      'Auto-note: Student checked in without RSVP and/or class at capacity.',
      CURRENT_DATE,
      v_qr.schedule_id
    );
  END IF;

  -- Return success with class details and flags
  RETURN jsonb_build_object(
    'success', true,
    'class_type', v_schedule.class_type,
    'day_of_week', v_schedule.day_of_week,
    'start_time', v_schedule.start_time,
    'end_time', v_schedule.end_time,
    'level', v_schedule.level,
    'instructor_name', v_schedule.instructor_name,
    'check_in_time', v_now,
    'had_rsvp', v_had_rsvp,
    'was_full_at_checkin', v_was_full
  );
END;
$$;

COMMENT ON FUNCTION public.check_in_via_qr IS 'Checks in student via QR; enforces ±30m window; returns flags and optionally creates auto-note.';


