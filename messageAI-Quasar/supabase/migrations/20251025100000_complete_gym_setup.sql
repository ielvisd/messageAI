-- Complete Gym Setup Migration (CORRECT ORDER)
-- This combines all necessary gym features in one migration

-- ==============================================
-- STEP 0: Ensure profile auto-creation trigger exists
-- ==============================================

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, avatar_url)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email, NEW.raw_user_meta_data->>'avatar_url')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup (DROP IF EXISTS to avoid errors)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================
-- STEP 1: Create gyms table FIRST
-- ==============================================

CREATE TABLE IF NOT EXISTS public.gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID,
  locations JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{
    "studentsCanMessage": false,
    "studentsCanCreateGroups": false,
    "instructorsCanCreateClasses": true,
    "instructorsEditOwnOnly": true,
    "aiEnabled": true,
    "aiAutoRespond": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gyms_owner ON public.gyms(owner_id);

-- ==============================================
-- STEP 2: Update profiles table with roles
-- ==============================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gym_id') THEN
    ALTER TABLE public.profiles ADD COLUMN gym_id UUID;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT CHECK (role IN ('owner', 'instructor', 'student', 'parent'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'parent_links') THEN
    ALTER TABLE public.profiles ADD COLUMN parent_links JSONB DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'blocked_users') THEN
    ALTER TABLE public.profiles ADD COLUMN blocked_users UUID[] DEFAULT ARRAY[]::UUID[];
  END IF;
END $$;

-- Add foreign key constraints AFTER both tables exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'gyms_owner_id_fkey'
  ) THEN
    ALTER TABLE public.gyms ADD CONSTRAINT gyms_owner_id_fkey 
      FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_gym_id_fkey'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_gym_id_fkey 
      FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_gym ON public.profiles(gym_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================
-- STEP 3: Create gym_schedules table
-- ==============================================

CREATE TABLE IF NOT EXISTS public.gym_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID,
  instructor_id UUID,
  instructor_name TEXT,
  class_type TEXT,
  day_of_week TEXT CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  start_time TIME,
  end_time TIME,
  max_capacity INTEGER,
  current_rsvps INTEGER DEFAULT 0,
  gym_location TEXT,
  level TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign keys AFTER tables exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'gym_schedules_gym_id_fkey'
  ) THEN
    ALTER TABLE public.gym_schedules ADD CONSTRAINT gym_schedules_gym_id_fkey 
      FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'gym_schedules_instructor_id_fkey'
  ) THEN
    ALTER TABLE public.gym_schedules ADD CONSTRAINT gym_schedules_instructor_id_fkey 
      FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gym_schedules_gym ON public.gym_schedules(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_schedules_instructor ON public.gym_schedules(instructor_id);
CREATE INDEX IF NOT EXISTS idx_gym_schedules_day ON public.gym_schedules(day_of_week);

-- Add columns if table already existed
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gym_schedules' AND column_name = 'gym_id') THEN
    ALTER TABLE public.gym_schedules ADD COLUMN gym_id UUID;
    ALTER TABLE public.gym_schedules ADD CONSTRAINT gym_schedules_gym_id_fkey 
      FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gym_schedules' AND column_name = 'current_rsvps') THEN
    ALTER TABLE public.gym_schedules ADD COLUMN current_rsvps INTEGER DEFAULT 0;
  END IF;
END $$;

-- ==============================================
-- STEP 4: Create invitations table
-- ==============================================

CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('instructor', 'student', 'parent')),
  token TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  CONSTRAINT invitations_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE,
  CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invitations_gym ON public.invitations(gym_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);

-- ==============================================
-- STEP 5: Create class_rsvps table
-- ==============================================

CREATE TABLE IF NOT EXISTS public.class_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rsvp_date DATE NOT NULL,
  status TEXT CHECK (status IN ('confirmed', 'waitlist', 'cancelled')) DEFAULT 'confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(schedule_id, user_id, rsvp_date),
  CONSTRAINT class_rsvps_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.gym_schedules(id) ON DELETE CASCADE,
  CONSTRAINT class_rsvps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rsvps_schedule ON public.class_rsvps(schedule_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user ON public.class_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_date ON public.class_rsvps(rsvp_date);

-- ==============================================
-- STEP 6: Enable RLS on new tables
-- ==============================================

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_schedules ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- STEP 7: Create RLS Policies
-- ==============================================

-- Gyms: Only owners can manage their gym
DROP POLICY IF EXISTS "Owners can manage their gym" ON public.gyms;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Owners can manage their gym" 
  ON public.gyms 
  FOR ALL 
  USING (owner_id = auth.uid()) 
  WITH CHECK (owner_id = auth.uid());

-- Profiles: Users can view profiles in their gym
DROP POLICY IF EXISTS "Users can view profiles in their gym" ON public.profiles;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can view profiles in their gym" 
  ON public.profiles 
  FOR SELECT 
  USING (
    gym_id = (SELECT gym_id FROM public.profiles WHERE id = auth.uid())
    OR id = auth.uid()
  );

-- Gym Schedules: Gym members can view
DROP POLICY IF EXISTS "Gym members can view schedules" ON public.gym_schedules;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Gym members can view schedules" 
  ON public.gym_schedules 
  FOR SELECT 
  USING (
    gym_id = (SELECT gym_id FROM public.profiles WHERE id = auth.uid())
  );

-- Gym Schedules: Owners and instructors can manage
DROP POLICY IF EXISTS "Owners and instructors can manage schedules" ON public.gym_schedules;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Owners and instructors can manage schedules" 
  ON public.gym_schedules 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND gym_id = gym_schedules.gym_id
      AND role IN ('owner', 'instructor')
      AND (role = 'owner' OR instructor_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND gym_id = gym_schedules.gym_id
      AND role IN ('owner', 'instructor')
    )
  );

-- Class RSVPs: Users can manage their own
DROP POLICY IF EXISTS "Users can manage their own RSVPs" ON public.class_rsvps;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can manage their own RSVPs" 
  ON public.class_rsvps 
  FOR ALL 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- Invitations: Invited users can view their invitation
DROP POLICY IF EXISTS "Invited users can view their invitation" ON public.invitations;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Invited users can view their invitation" 
  ON public.invitations 
  FOR SELECT 
  USING (email = auth.email());

-- Invitations: Owners and instructors can create
DROP POLICY IF EXISTS "Owners and instructors can create invitations" ON public.invitations;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Owners and instructors can create invitations" 
  ON public.invitations 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND gym_id = invitations.gym_id
      AND role IN ('owner', 'instructor')
    )
  );
