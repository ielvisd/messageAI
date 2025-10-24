// Quick script to fix the missing chat_members INSERT policies
const { createClient } = require('@supabase/supabase-js')

// You'll need to set these environment variables or replace with your actual values
const supabaseUrl = process.env.SUPABASE_URL || 'your-supabase-url'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixPolicies() {
  try {
    console.log('Fixing chat_members INSERT policies...')

    // Drop existing policies (if any)
    await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "chat_members_insert_self" ON public.chat_members;
        DROP POLICY IF EXISTS "chat_members_insert_creator" ON public.chat_members;
        DROP POLICY IF EXISTS "chat_members_delete_self" ON public.chat_members;
        DROP POLICY IF EXISTS "chat_members_delete_creator" ON public.chat_members;
      `
    })

    // Add INSERT policies
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "chat_members_insert_self"
        ON public.chat_members FOR INSERT
        WITH CHECK (user_id = auth.uid());

        CREATE POLICY "chat_members_insert_creator"
        ON public.chat_members FOR INSERT
        WITH CHECK (
          chat_id IN (
            SELECT id FROM public.chats WHERE created_by = auth.uid()
          )
        );

        CREATE POLICY "chat_members_delete_self"
        ON public.chat_members FOR DELETE
        USING (user_id = auth.uid());

        CREATE POLICY "chat_members_delete_creator"
        ON public.chat_members FOR DELETE
        USING (
          chat_id IN (
            SELECT id FROM public.chats WHERE created_by = auth.uid()
          )
        );
      `
    })

    console.log('✅ Policies fixed successfully!')
  } catch (error) {
    console.error('❌ Error fixing policies:', error)
  }
}

fixPolicies()
