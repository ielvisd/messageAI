-- Cleanup non-recursive RLS: ensure durable, cache-based policies and remove recursive helpers

-- Remove helper that caused recursion (safe if it doesn't exist)
DROP FUNCTION IF EXISTS public.is_user_in_chat(UUID, UUID);

-- Ensure RLS is enabled on required tables
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chat_access ENABLE ROW LEVEL SECURITY;

-- Ensure durable SELECT policy on chat_members uses cache (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chat_members' AND policyname = 'chat_members_select_my_chats'
  ) THEN
    CREATE POLICY "chat_members_select_my_chats"
    ON public.chat_members FOR SELECT
    USING (
      chat_id IN (
        SELECT chat_id FROM public.user_chat_access
        WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Normalize USING clause to the expected cache-based definition
ALTER POLICY "chat_members_select_my_chats" ON public.chat_members
USING (
  chat_id IN (
    SELECT chat_id FROM public.user_chat_access
    WHERE user_id = auth.uid()
  )
);

-- Ensure user_chat_access visibility for the current user (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_chat_access' AND policyname = 'user_chat_access_select_own'
  ) THEN
    CREATE POLICY "user_chat_access_select_own"
    ON public.user_chat_access FOR SELECT
    USING (user_id = auth.uid());
  END IF;
END $$;

-- Profiles: keep non-recursive access to avoid reintroducing recursion
DROP POLICY IF EXISTS "profiles_select_in_my_chats" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'profiles_view_all'
  ) THEN
    CREATE POLICY "profiles_view_all"
    ON public.profiles FOR SELECT TO authenticated
    USING (true);
  END IF;
END $$;

-- Helpful comments
COMMENT ON POLICY "chat_members_select_my_chats" ON public.chat_members IS
  'Non-recursive: uses user_chat_access cache to authorize membership visibility.';
COMMENT ON POLICY "user_chat_access_select_own" ON public.user_chat_access IS
  'Users can read cache rows for themselves.';
COMMENT ON POLICY "profiles_view_all" ON public.profiles IS
  'Temporary non-recursive profiles policy to avoid RLS recursion.';


