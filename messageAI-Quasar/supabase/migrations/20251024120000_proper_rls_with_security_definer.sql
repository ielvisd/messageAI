-- PROPER RLS FIX: Use security definer function with explicit SET search_path
-- This should finally work without recursion

-- ==============================================
-- STEP 1: Create a table to cache chat membership (breaks recursion)
-- ==============================================

-- Create a simple materialized view or cache table
-- This breaks the recursion by having a separate lookup table
CREATE TABLE IF NOT EXISTS public.user_chat_access (
  user_id UUID NOT NULL,
  chat_id UUID NOT NULL,
  PRIMARY KEY (user_id, chat_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_chat_access_user ON public.user_chat_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chat_access_chat ON public.user_chat_access(chat_id);

-- Sync function to keep user_chat_access in sync with chat_members
CREATE OR REPLACE FUNCTION public.sync_user_chat_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.user_chat_access (user_id, chat_id)
    VALUES (NEW.user_id, NEW.chat_id)
    ON CONFLICT (user_id, chat_id) DO NOTHING;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    DELETE FROM public.user_chat_access
    WHERE user_id = OLD.user_id AND chat_id = OLD.chat_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger on chat_members to sync
DROP TRIGGER IF EXISTS sync_chat_access_trigger ON public.chat_members;
CREATE TRIGGER sync_chat_access_trigger
  AFTER INSERT OR DELETE ON public.chat_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_chat_access();

-- Backfill existing data
INSERT INTO public.user_chat_access (user_id, chat_id)
SELECT DISTINCT user_id, chat_id FROM public.chat_members
ON CONFLICT DO NOTHING;

-- ==============================================
-- STEP 2: Enable RLS with non-recursive policies
-- ==============================================

-- Enable RLS
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chat_access ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "chat_members_select_own" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_select_in_my_chats" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_select" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_view_all_in_my_chats" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_select_if_member" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_select_all" ON public.chat_members;
DROP POLICY IF EXISTS "chat_members_view_all" ON public.chat_members;

-- Create policy using the cache table (NO RECURSION!)
CREATE POLICY "chat_members_select_my_chats"
ON public.chat_members FOR SELECT
USING (
  -- Check the cache table, not chat_members itself
  chat_id IN (
    SELECT chat_id FROM public.user_chat_access
    WHERE user_id = auth.uid()
  )
);

-- Allow viewing user_chat_access for own user_id
CREATE POLICY "user_chat_access_select_own"
ON public.user_chat_access FOR SELECT
USING (user_id = auth.uid());

-- Profiles: Allow viewing profiles of users in same chats
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view_all" ON public.profiles;

CREATE POLICY "profiles_select_in_my_chats"
ON public.profiles FOR SELECT
USING (
  -- Can view profiles of users in chats I'm in
  id IN (
    SELECT cm.user_id FROM public.chat_members cm
    WHERE cm.chat_id IN (
      SELECT chat_id FROM public.user_chat_access
      WHERE user_id = auth.uid()
    )
  )
  OR id = auth.uid() -- Can always see own profile
);

-- ==============================================
-- STEP 3: Add comments
-- ==============================================

COMMENT ON TABLE public.user_chat_access IS 
  'Cache table to break RLS recursion. Synced via trigger from chat_members.';

COMMENT ON POLICY "chat_members_select_my_chats" ON public.chat_members IS 
  'Users can view members of chats they belong to. Uses user_chat_access cache to avoid recursion.';

COMMENT ON POLICY "profiles_select_in_my_chats" ON public.profiles IS 
  'Users can view profiles of people in their chats. Uses user_chat_access cache to avoid recursion.';

