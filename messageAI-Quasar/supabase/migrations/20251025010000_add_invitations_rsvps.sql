-- Add invitations and RSVP system
-- Phase 1: User invitation and class RSVP tables

-- ==============================================
-- STEP 1: Create invitations table
-- ==============================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('instructor', 'student', 'parent')),
  token TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- For parent: {studentIds: []}
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitations_gym ON public.invitations(gym_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);

-- ==============================================
-- STEP 2: Create class_rsvps table
-- ==============================================

CREATE TABLE IF NOT EXISTS public.class_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.gym_schedules(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rsvp_date DATE NOT NULL, -- Specific date for recurring class
  status TEXT CHECK (status IN ('confirmed', 'waitlist', 'cancelled')) DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, user_id, rsvp_date)
);

CREATE INDEX IF NOT EXISTS idx_class_rsvps_schedule ON public.class_rsvps(schedule_id);
CREATE INDEX IF NOT EXISTS idx_class_rsvps_user ON public.class_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_class_rsvps_date ON public.class_rsvps(rsvp_date);
CREATE INDEX IF NOT EXISTS idx_class_rsvps_status ON public.class_rsvps(status);

-- ==============================================
-- STEP 3: Enable RLS
-- ==============================================

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_rsvps ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 4: Invitation policies
-- ==============================================

-- Owner and instructors can view invitations they created
DROP POLICY IF EXISTS "view_own_invitations" ON public.invitations;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "view_own_invitations" ON public.invitations
  FOR SELECT USING (
    invited_by = auth.uid() OR
    gym_id IN (SELECT gym_id FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- Owner and instructors can create invitations
DROP POLICY IF EXISTS "create_invitations" ON public.invitations;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "create_invitations" ON public.invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid() AND
    gym_id IN (
      SELECT gym_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'instructor')
    )
  );

-- ==============================================
-- STEP 5: RSVP policies
-- ==============================================

-- Users can view their own RSVPs
DROP POLICY IF EXISTS "view_own_rsvps" ON public.class_rsvps;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "view_own_rsvps" ON public.class_rsvps
  FOR SELECT USING (user_id = auth.uid());

-- Instructors and owners can view RSVPs for their gym's classes
DROP POLICY IF EXISTS "instructors_view_rsvps" ON public.class_rsvps;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "instructors_view_rsvps" ON public.class_rsvps
  FOR SELECT USING (
    schedule_id IN (
      SELECT id FROM gym_schedules 
      WHERE gym_id IN (
        SELECT gym_id FROM profiles 
        WHERE id = auth.uid() AND role IN ('owner', 'instructor')
      )
    )
  );

-- Students can create RSVPs for classes in their gym
DROP POLICY IF EXISTS "students_create_rsvps" ON public.class_rsvps;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "students_create_rsvps" ON public.class_rsvps
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    schedule_id IN (
      SELECT id FROM gym_schedules 
      WHERE gym_id IN (SELECT gym_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Users can cancel their own RSVPs
DROP POLICY IF EXISTS "cancel_own_rsvps" ON public.class_rsvps;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "cancel_own_rsvps" ON public.class_rsvps
  FOR DELETE USING (user_id = auth.uid());

-- Users can update their own RSVPs
DROP POLICY IF EXISTS "update_own_rsvps" ON public.class_rsvps;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "update_own_rsvps" ON public.class_rsvps
  FOR UPDATE USING (user_id = auth.uid());

-- ==============================================
-- STEP 6: Functions for RSVP management
-- ==============================================

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update RSVP count on schedule
CREATE OR REPLACE FUNCTION public.update_schedule_rsvp_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') THEN
    UPDATE gym_schedules 
    SET current_rsvps = current_rsvps + 1 
    WHERE id = NEW.schedule_id;
  ELSIF (TG_OP = 'DELETE' AND OLD.status = 'confirmed') THEN
    UPDATE gym_schedules 
    SET current_rsvps = GREATEST(current_rsvps - 1, 0)
    WHERE id = OLD.schedule_id;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (OLD.status = 'confirmed' AND NEW.status != 'confirmed') THEN
      UPDATE gym_schedules 
      SET current_rsvps = GREATEST(current_rsvps - 1, 0)
      WHERE id = NEW.schedule_id;
    ELSIF (OLD.status != 'confirmed' AND NEW.status = 'confirmed') THEN
      UPDATE gym_schedules 
      SET current_rsvps = current_rsvps + 1 
      WHERE id = NEW.schedule_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for RSVP count
DROP TRIGGER IF EXISTS update_rsvp_count_trigger ON public.class_rsvps;
CREATE TRIGGER update_rsvp_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.class_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_schedule_rsvp_count();

-- ==============================================
-- STEP 7: Comments
-- ==============================================

COMMENT ON TABLE public.invitations IS 'User invitations to join gym with specific role';
COMMENT ON TABLE public.class_rsvps IS 'Student RSVPs to specific class dates with capacity tracking';
COMMENT ON FUNCTION public.expire_old_invitations() IS 'Automatically expire invitations past their expiry date';
COMMENT ON FUNCTION public.update_schedule_rsvp_count() IS 'Keep gym_schedules.current_rsvps in sync with confirmed RSVPs';

