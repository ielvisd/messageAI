-- Migration 2: Parent-Child Relationships
-- Enables parents to manage dependent children's gym memberships

-- ============================================
-- PARENT TYPE ON PROFILES
-- ============================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS parent_type TEXT CHECK (parent_type IN ('training_parent', 'non_training_parent'));

COMMENT ON COLUMN public.profiles.parent_type IS 'training_parent = parent who also trains, non_training_parent = parent who only has children enrolled';

-- ============================================
-- DEPENDENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Child information
  child_name TEXT NOT NULL,
  birthdate DATE NOT NULL,
  age_category TEXT CHECK (age_category IN ('pee_wee', 'junior', 'teen', 'adult')),
  
  -- Gym enrollment
  gym_id UUID REFERENCES public.gyms(id) ON DELETE SET NULL,
  
  -- Teen account linking
  is_account_holder BOOLEAN DEFAULT false,
  child_account_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: if is_account_holder is true, must have child_account_id
  CHECK (
    (is_account_holder = false) OR 
    (is_account_holder = true AND child_account_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dependents_parent ON public.dependents(parent_id);
CREATE INDEX IF NOT EXISTS idx_dependents_child_account ON public.dependents(child_account_id) WHERE child_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dependents_gym ON public.dependents(gym_id) WHERE gym_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Parents can view their dependents"
  ON public.dependents FOR SELECT
  USING (parent_id = auth.uid());

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Parents can manage their dependents"
  ON public.dependents FOR ALL
  USING (parent_id = auth.uid());

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Teen account holders can view their dependent record"
  ON public.dependents FOR SELECT
  USING (child_account_id = auth.uid());

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Owners can view dependents at their gyms"
  ON public.dependents FOR SELECT
  USING (
    gym_id IN (
      SELECT unnest(owned_gym_ids) FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS FOR DEPENDENT MANAGEMENT
-- ============================================

-- Auto-update dependent age category based on birthdate
CREATE OR REPLACE FUNCTION public.update_dependent_age_category()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.age_category := public.calculate_age_category(NEW.birthdate);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_dependent_age ON public.dependents;
CREATE TRIGGER update_dependent_age
  BEFORE INSERT OR UPDATE OF birthdate ON public.dependents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_dependent_age_category();

-- Function to get all students (profiles + dependents) for notifications
CREATE OR REPLACE FUNCTION public.get_all_students_at_gym(p_gym_id UUID)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  age_category TEXT,
  parent_id UUID,
  is_dependent BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- Regular student accounts
  SELECT 
    p.id as user_id,
    p.name,
    p.age_category,
    NULL::UUID as parent_id,
    false as is_dependent
  FROM public.profiles p
  WHERE p.gym_id = p_gym_id 
    AND p.role = 'student'
  
  UNION ALL
  
  -- Dependent children (without their own accounts)
  SELECT 
    d.parent_id as user_id, -- Notify parent
    d.child_name as name,
    d.age_category,
    d.parent_id,
    true as is_dependent
  FROM public.dependents d
  WHERE d.gym_id = p_gym_id
    AND d.is_account_holder = false
  
  UNION ALL
  
  -- Dependent teens with their own accounts
  SELECT 
    d.child_account_id as user_id, -- Notify teen directly
    p.name,
    d.age_category,
    d.parent_id,
    true as is_dependent
  FROM public.dependents d
  JOIN public.profiles p ON p.id = d.child_account_id
  WHERE d.gym_id = p_gym_id
    AND d.is_account_holder = true;
END;
$$;

-- Function to link teen dependent to their new account
CREATE OR REPLACE FUNCTION public.link_dependent_to_account(
  p_dependent_id UUID,
  p_account_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id UUID;
  v_dependent_age_category TEXT;
  v_account_age_category TEXT;
BEGIN
  -- Get dependent info
  SELECT parent_id, age_category INTO v_parent_id, v_dependent_age_category
  FROM public.dependents
  WHERE id = p_dependent_id;
  
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Dependent not found';
  END IF;
  
  -- Verify the account belongs to auth.uid()
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_account_id AND id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: can only link your own account';
  END IF;
  
  -- Get account age category
  SELECT age_category INTO v_account_age_category
  FROM public.profiles
  WHERE id = p_account_id;
  
  -- Verify age category matches (teens only)
  IF v_dependent_age_category != 'teen' OR v_account_age_category != 'teen' THEN
    RAISE EXCEPTION 'Can only link teen accounts';
  END IF;
  
  -- Link the accounts
  UPDATE public.dependents
  SET 
    is_account_holder = true,
    child_account_id = p_account_id,
    updated_at = NOW()
  WHERE id = p_dependent_id;
  
  RETURN TRUE;
END;
$$;

-- ============================================
-- VIEWS FOR EASIER QUERIES
-- ============================================

-- View combining profiles and dependents for parent dashboard
CREATE OR REPLACE VIEW public.parent_children_view AS
SELECT 
  d.id as dependent_id,
  d.parent_id,
  d.child_name as name,
  d.birthdate,
  d.age_category,
  d.gym_id,
  d.is_account_holder,
  d.child_account_id,
  p.name as account_name,
  p.email as account_email
FROM public.dependents d
LEFT JOIN public.profiles p ON p.id = d.child_account_id
WHERE d.parent_id = auth.uid();

-- Comments
COMMENT ON TABLE public.dependents IS 'Child dependents linked to parent accounts for class management';
COMMENT ON COLUMN public.dependents.is_account_holder IS 'True if teen has their own account for login';
COMMENT ON COLUMN public.dependents.child_account_id IS 'Links to profiles table if teen has their own account';
COMMENT ON FUNCTION public.get_all_students_at_gym IS 'Returns all students at gym including dependents for notifications';
COMMENT ON FUNCTION public.link_dependent_to_account IS 'Links a teen dependent to their newly created account';




