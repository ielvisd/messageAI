-- QR Code Gym Join Migration
-- Adds QR code tokens, join requests table, and multiple gym ownership support

-- ============================================
-- 1. Add QR token and approval settings to gyms
-- ============================================

ALTER TABLE public.gyms 
  ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gym_chat_id UUID REFERENCES public.chats(id);

CREATE INDEX IF NOT EXISTS idx_gyms_qr_token ON public.gyms(qr_token);

-- ============================================
-- 2. Create gym join requests table
-- ============================================

CREATE TABLE IF NOT EXISTS public.gym_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  joined_via TEXT DEFAULT 'qr_code',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gym_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gym_join_requests_gym_id ON public.gym_join_requests(gym_id);
CREATE INDEX IF NOT EXISTS idx_gym_join_requests_user_id ON public.gym_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gym_join_requests_status ON public.gym_join_requests(status);

-- ============================================
-- 3. Add multiple gym ownership support
-- ============================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS owned_gym_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Update existing owners to have their current gym in owned_gym_ids
UPDATE public.profiles 
SET owned_gym_ids = ARRAY[gym_id] 
WHERE role = 'owner' AND gym_id IS NOT NULL AND owned_gym_ids = ARRAY[]::UUID[];

CREATE INDEX IF NOT EXISTS idx_profiles_owned_gym_ids ON public.profiles USING GIN(owned_gym_ids);

-- ============================================
-- 4. RLS Policies for gym_join_requests
-- ============================================

ALTER TABLE public.gym_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own join requests
DROP POLICY IF EXISTS "Users can view their own join requests" ON public.gym_join_requests;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can view their own join requests"
  ON public.gym_join_requests FOR SELECT
  USING (user_id = auth.uid());

-- Users can create their own join requests
DROP POLICY IF EXISTS "Users can create join requests" ON public.gym_join_requests;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Users can create join requests"
  ON public.gym_join_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Gym owners can view all join requests for their gyms
DROP POLICY IF EXISTS "Gym owners can view join requests for their gyms" ON public.gym_join_requests;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Gym owners can view join requests for their gyms"
  ON public.gym_join_requests FOR SELECT
  USING (
    gym_id IN (
      SELECT unnest(owned_gym_ids) FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Gym owners can update join requests for their gyms
DROP POLICY IF EXISTS "Gym owners can update join requests for their gyms" ON public.gym_join_requests;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Gym owners can update join requests for their gyms"
  ON public.gym_join_requests FOR UPDATE
  USING (
    gym_id IN (
      SELECT unnest(owned_gym_ids) FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    gym_id IN (
      SELECT unnest(owned_gym_ids) FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================
-- 5. Function to auto-update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_gym_join_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gym_join_requests_updated_at_trigger ON public.gym_join_requests;
CREATE TRIGGER update_gym_join_requests_updated_at_trigger
  BEFORE UPDATE ON public.gym_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gym_join_requests_updated_at();

-- ============================================
-- 6. Update gyms RLS to allow lookup by qr_token
-- ============================================

-- Allow anyone to read gym info by qr_token (for join page)
DROP POLICY IF EXISTS "Anyone can lookup gym by qr_token" ON public.gyms;
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "Anyone can lookup gym by qr_token"
  ON public.gyms FOR SELECT
  USING (qr_token IS NOT NULL);

