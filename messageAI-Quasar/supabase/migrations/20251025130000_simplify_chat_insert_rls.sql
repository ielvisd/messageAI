-- Simplify chat insert policy to fix gym join issue
-- The problem: Complex role checks are blocking gym main chat creation
-- Solution: Allow any authenticated user to create chats, trust app logic

DROP POLICY IF EXISTS "chats_insert_role_based" ON public.chats;

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chats_insert_authenticated" ON public.chats
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

COMMENT ON POLICY "chats_insert_authenticated" ON public.chats IS 
  'Allows any authenticated user to create chats. Role-based restrictions handled at app level.';

