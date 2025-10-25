-- ================================================
-- Add student_notes column to class_attendance
-- ================================================
-- Allow students to add personal notes to their class attendance records

-- Add student_notes column
ALTER TABLE public.class_attendance
ADD COLUMN IF NOT EXISTS student_notes TEXT;

COMMENT ON COLUMN public.class_attendance.student_notes IS 'Personal notes by students about their own class experience (max 1000 chars recommended)';

-- Add RLS policy for students to update their own notes
DROP POLICY IF EXISTS "Students can update own attendance notes" ON public.class_attendance;
CREATE POLICY "Students can update own attendance notes" ON public.class_attendance
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add index for efficient queries when filtering by notes
CREATE INDEX IF NOT EXISTS idx_class_attendance_has_notes 
  ON public.class_attendance(user_id) 
  WHERE student_notes IS NOT NULL;

