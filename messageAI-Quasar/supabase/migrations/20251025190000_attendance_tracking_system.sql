-- ================================================
-- ATTENDANCE TRACKING & STUDENT PROGRESS SYSTEM
-- ================================================
-- Creates tables for QR check-ins, student notes, 
-- belt progression, and attendance tracking

-- ================================================
-- TABLE 1: class_attendance
-- ================================================
CREATE TABLE IF NOT EXISTS public.class_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.gym_schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_in_method TEXT NOT NULL CHECK (check_in_method IN ('qr_code', 'manual')),
  marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- For manual check-ins
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate check-ins for same user/class/day
  UNIQUE(user_id, schedule_id, DATE(check_in_time))
);

CREATE INDEX idx_class_attendance_user_time ON public.class_attendance(user_id, check_in_time DESC);
CREATE INDEX idx_class_attendance_schedule_date ON public.class_attendance(schedule_id, DATE(check_in_time));
CREATE INDEX idx_class_attendance_gym ON public.class_attendance(gym_id);
CREATE INDEX idx_class_attendance_method ON public.class_attendance(check_in_method);

COMMENT ON TABLE public.class_attendance IS 'Tracks student check-ins to classes via QR or manual marking';
COMMENT ON COLUMN public.class_attendance.check_in_method IS 'How student checked in: qr_code (scanned) or manual (marked by instructor)';
COMMENT ON COLUMN public.class_attendance.marked_by IS 'User ID of instructor/owner who manually marked attendance (null for QR check-ins)';

-- ================================================
-- TABLE 2: student_notes
-- ================================================
CREATE TABLE IF NOT EXISTS public.student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  note_type TEXT NOT NULL CHECK (note_type IN ('progress', 'behavioral', 'general')),
  content TEXT NOT NULL,
  class_date DATE,
  schedule_id UUID REFERENCES public.gym_schedules(id) ON DELETE SET NULL,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_notes_student ON public.student_notes(student_id, created_at DESC);
CREATE INDEX idx_student_notes_instructor ON public.student_notes(instructor_id, created_at DESC);
CREATE INDEX idx_student_notes_gym ON public.student_notes(gym_id);
CREATE INDEX idx_student_notes_date ON public.student_notes(class_date DESC);

COMMENT ON TABLE public.student_notes IS 'Private notes by instructors/owners about student progress and behavior';
COMMENT ON COLUMN public.student_notes.is_private IS 'Always true - notes visible to owners/admins but not students';

-- ================================================
-- TABLE 3: instructor_evaluations
-- ================================================
CREATE TABLE IF NOT EXISTS public.instructor_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- Owner only
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  evaluation_period_start DATE,
  evaluation_period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_instructor_eval_instructor ON public.instructor_evaluations(instructor_id, created_at DESC);
CREATE INDEX idx_instructor_eval_gym ON public.instructor_evaluations(gym_id);

COMMENT ON TABLE public.instructor_evaluations IS 'Performance evaluations of instructors by gym owners (private)';

-- ================================================
-- TABLE 4: belt_progression
-- ================================================
CREATE TABLE IF NOT EXISTS public.belt_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  belt_color TEXT NOT NULL CHECK (belt_color IN ('white', 'blue', 'purple', 'brown', 'black')),
  stripes INTEGER NOT NULL DEFAULT 0 CHECK (stripes >= 0 AND stripes <= 4),
  awarded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  awarded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_belt_progression_user ON public.belt_progression(user_id, awarded_date DESC);
CREATE INDEX idx_belt_progression_gym ON public.belt_progression(gym_id);
CREATE INDEX idx_belt_progression_awarded_by ON public.belt_progression(awarded_by);

COMMENT ON TABLE public.belt_progression IS 'BJJ belt and stripe promotions history';
COMMENT ON COLUMN public.belt_progression.stripes IS 'Number of stripes on belt (0-4)';

-- ================================================
-- TABLE 5: class_qr_codes
-- ================================================
CREATE TABLE IF NOT EXISTS public.class_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.gym_schedules(id) ON DELETE CASCADE,
  qr_token TEXT NOT NULL UNIQUE,
  valid_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One QR code per class per day
  UNIQUE(schedule_id, valid_date)
);

CREATE INDEX idx_class_qr_token ON public.class_qr_codes(qr_token);
CREATE INDEX idx_class_qr_schedule_date ON public.class_qr_codes(schedule_id, valid_date);
CREATE INDEX idx_class_qr_expires ON public.class_qr_codes(expires_at);

COMMENT ON TABLE public.class_qr_codes IS 'QR codes for class check-in, auto-expire after class ends';
COMMENT ON COLUMN public.class_qr_codes.expires_at IS 'QR code expires 30 minutes after class end time';

-- ================================================
-- ADD FIELDS TO PROFILES FOR CURRENT BELT
-- ================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_belt TEXT CHECK (current_belt IN ('white', 'blue', 'purple', 'brown', 'black')) DEFAULT 'white',
  ADD COLUMN IF NOT EXISTS current_stripes INTEGER DEFAULT 0 CHECK (current_stripes >= 0 AND current_stripes <= 4);

CREATE INDEX IF NOT EXISTS idx_profiles_belt ON public.profiles(current_belt, current_stripes);

COMMENT ON COLUMN public.profiles.current_belt IS 'Current BJJ belt color';
COMMENT ON COLUMN public.profiles.current_stripes IS 'Current number of stripes on belt (0-4)';

-- ================================================
-- RLS POLICIES
-- ================================================

-- Enable RLS
ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.belt_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_qr_codes ENABLE ROW LEVEL SECURITY;

-- class_attendance policies
DROP POLICY IF EXISTS "Students view own attendance" ON public.class_attendance;
CREATE POLICY "Students view own attendance" ON public.class_attendance
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Instructors view gym attendance" ON public.class_attendance;
CREATE POLICY "Instructors view gym attendance" ON public.class_attendance
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'owner'))
  );

DROP POLICY IF EXISTS "Students can check in" ON public.class_attendance;
CREATE POLICY "Students can check in" ON public.class_attendance
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can mark attendance" ON public.class_attendance;
CREATE POLICY "Instructors can mark attendance" ON public.class_attendance
  FOR INSERT WITH CHECK (
    marked_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'owner'))
  );

-- student_notes policies (private to instructors/owners)
DROP POLICY IF EXISTS "Instructors view own notes" ON public.student_notes;
CREATE POLICY "Instructors view own notes" ON public.student_notes
  FOR SELECT USING (instructor_id = auth.uid());

DROP POLICY IF EXISTS "Owners view all gym notes" ON public.student_notes;
CREATE POLICY "Owners view all gym notes" ON public.student_notes
  FOR SELECT USING (
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Instructors create notes" ON public.student_notes;
CREATE POLICY "Instructors create notes" ON public.student_notes
  FOR INSERT WITH CHECK (
    instructor_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'owner'))
  );

DROP POLICY IF EXISTS "Instructors update own notes" ON public.student_notes;
CREATE POLICY "Instructors update own notes" ON public.student_notes
  FOR UPDATE USING (instructor_id = auth.uid());

DROP POLICY IF EXISTS "Instructors delete own notes" ON public.student_notes;
CREATE POLICY "Instructors delete own notes" ON public.student_notes
  FOR DELETE USING (instructor_id = auth.uid());

-- instructor_evaluations policies (owner only)
DROP POLICY IF EXISTS "Owners create evaluations" ON public.instructor_evaluations;
CREATE POLICY "Owners create evaluations" ON public.instructor_evaluations
  FOR INSERT WITH CHECK (
    evaluator_id = auth.uid() AND
    gym_id IN (SELECT id FROM public.gyms WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners view own evaluations" ON public.instructor_evaluations;
CREATE POLICY "Owners view own evaluations" ON public.instructor_evaluations
  FOR SELECT USING (evaluator_id = auth.uid());

DROP POLICY IF EXISTS "Instructors view own evaluations" ON public.instructor_evaluations;
CREATE POLICY "Instructors view own evaluations" ON public.instructor_evaluations
  FOR SELECT USING (instructor_id = auth.uid());

-- belt_progression policies
DROP POLICY IF EXISTS "Students view own belt history" ON public.belt_progression;
CREATE POLICY "Students view own belt history" ON public.belt_progression
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Instructors view gym belt history" ON public.belt_progression;
CREATE POLICY "Instructors view gym belt history" ON public.belt_progression
  FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'owner'))
  );

DROP POLICY IF EXISTS "Instructors award belts" ON public.belt_progression;
CREATE POLICY "Instructors award belts" ON public.belt_progression
  FOR INSERT WITH CHECK (
    awarded_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'owner'))
  );

-- class_qr_codes policies
DROP POLICY IF EXISTS "Instructors create QR codes" ON public.class_qr_codes;
CREATE POLICY "Instructors create QR codes" ON public.class_qr_codes
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'owner'))
  );

DROP POLICY IF EXISTS "All authenticated users view valid QR codes" ON public.class_qr_codes;
CREATE POLICY "All authenticated users view valid QR codes" ON public.class_qr_codes
  FOR SELECT USING (
    expires_at > NOW() AND
    valid_date = CURRENT_DATE
  );

-- ================================================
-- UPDATED_AT TRIGGER
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_student_notes_updated_at ON public.student_notes;
CREATE TRIGGER handle_student_notes_updated_at
  BEFORE UPDATE ON public.student_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_instructor_evaluations_updated_at ON public.instructor_evaluations;
CREATE TRIGGER handle_instructor_evaluations_updated_at
  BEFORE UPDATE ON public.instructor_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Attendance tracking system tables created successfully';
  RAISE NOTICE '📊 Tables: class_attendance, student_notes, instructor_evaluations, belt_progression, class_qr_codes';
  RAISE NOTICE '🔒 RLS policies enabled for all tables';
END $$;

