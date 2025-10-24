-- Nuclear fix: Drop ALL policies on chats and recreate
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chats' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chats', r.policyname);
    END LOOP;
END $$;

-- Create simple, permissive policies
DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chats_select_all" ON public.chats
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chats_insert_authenticated" ON public.chats
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chats_update_creator" ON public.chats
  FOR UPDATE 
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chats_delete_creator" ON public.chats
  FOR DELETE 
  USING (created_by = auth.uid());

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
