-- Fix gym join chat creation RLS issue
-- The problem: When a student joins via QR, they can't create the gym's main chat
-- Solution: Allow the first student to create the gym's main group chat

-- Update the chats insert policy to allow gym main chat creation
DROP POLICY IF EXISTS "chats_insert_role_based" ON public.chats;

DROP POLICY IF EXISTS " ON public.*;
CREATE POLICY "chats_insert_role_based" ON public.chats
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    (
      -- Owner and instructors can always create chats
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('owner', 'instructor')
      ) OR
      -- Students can create the gym's main group chat (if it doesn't exist yet)
      (
        type = 'group' AND
        name LIKE '%All Members%' AND
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid() AND p.role = 'student'
        )
      ) OR
      -- Students can create if settings allow
      EXISTS (
        SELECT 1 FROM profiles p
        JOIN gyms g ON g.id = p.gym_id
        WHERE p.id = auth.uid() 
          AND p.role = 'student'
          AND (
            (type = 'direct' AND (g.settings->>'studentsCanMessage')::boolean = true) OR
            (type = 'group' AND (g.settings->>'studentsCanCreateGroups')::boolean = true)
          )
      ) OR
      -- Parents can create direct chats with instructors
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'parent'
      )
    )
  );

COMMENT ON POLICY "chats_insert_role_based" ON public.chats IS 
  'Allows users to create chats based on their role. Students can create the gym main chat even without permission settings.';

