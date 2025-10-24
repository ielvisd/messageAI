// Apply the fix for chat_members INSERT policies and security definer functions
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// You'll need to set these environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyFix() {
  try {
    console.log('Applying chat_members INSERT policies fix...')

    // Read and execute the INSERT policies migration
    const insertPoliciesSQL = fs.readFileSync('./supabase/migrations/20251023144721_fix_chat_members_insert_policies.sql', 'utf8')
    await supabase.rpc('exec_sql', { sql: insertPoliciesSQL })

    console.log('✅ INSERT policies applied')

    // Read and execute the security definer functions migration
    const securityFunctionsSQL = fs.readFileSync('./supabase/migrations/20251023144722_add_security_definer_chat_functions.sql', 'utf8')
    await supabase.rpc('exec_sql', { sql: securityFunctionsSQL })

    console.log('✅ Security definer functions applied')
    console.log('🎉 Fix applied successfully! Try the QR code flow now.')

  } catch (error) {
    console.error('❌ Error applying fix:', error)

    // Fallback: try direct SQL execution
    console.log('Trying direct SQL execution...')
    try {
      const insertPoliciesSQL = fs.readFileSync('./supabase/migrations/20251023144721_fix_chat_members_insert_policies.sql', 'utf8')
      const securityFunctionsSQL = fs.readFileSync('./supabase/migrations/20251023144722_add_security_definer_chat_functions.sql', 'utf8')

      // Split SQL into individual statements and execute them
      const allSQL = insertPoliciesSQL + '\n' + securityFunctionsSQL
      const statements = allSQL.split(';').filter(stmt => stmt.trim().length > 0)

      for (const statement of statements) {
        if (statement.trim()) {
          await supabase.rpc('exec_sql', { sql: statement + ';' })
        }
      }

      console.log('✅ Fix applied via direct SQL execution!')
    } catch (fallbackError) {
      console.error('❌ Fallback also failed:', fallbackError)
      console.log('Please run these SQL files manually in your Supabase dashboard:')
      console.log('1. supabase/migrations/20251023144721_fix_chat_members_insert_policies.sql')
      console.log('2. supabase/migrations/20251023144722_add_security_definer_chat_functions.sql')
    }
  }
}

applyFix()
