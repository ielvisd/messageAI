#!/usr/bin/env node

/**
 * Delete ALL bad Carlos accounts, keep only carlos.martinez@jiujitsio.com
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAccount(email, name) {
  console.log(`\n🗑️  Deleting: ${email}`);
  
  const { data: account, error: findError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  
  if (findError) {
    console.error(`   ❌ Error finding account: ${findError.message}`);
    return false;
  }
  
  if (!account) {
    console.log(`   ℹ️  Account not found (already deleted)`);
    return true;
  }
  
  console.log(`   Found: ${account.name} (ID: ${account.id})`);
  
  // Unassign from any classes
  const { data: classes } = await supabase
    .from('gym_schedules')
    .select('*')
    .eq('instructor_id', account.id);
  
  if (classes && classes.length > 0) {
    console.log(`   Unassigning from ${classes.length} classes...`);
    
    const { error: unassignError } = await supabase
      .from('gym_schedules')
      .update({ 
        instructor_id: null, 
        instructor_name: null 
      })
      .eq('instructor_id', account.id);
    
    if (unassignError) {
      console.error(`   ❌ Error unassigning: ${unassignError.message}`);
      return false;
    }
  }
  
  // Delete auth user (cascades to profile)
  const { error: deleteError } = await supabase.auth.admin.deleteUser(account.id);
  
  if (deleteError) {
    console.error(`   ❌ Error deleting: ${deleteError.message}`);
    
    // Try direct profile delete
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', account.id);
    
    if (profileError) {
      console.error(`   ❌ Profile delete also failed: ${profileError.message}`);
      return false;
    }
  }
  
  console.log(`   ✅ Deleted successfully`);
  return true;
}

async function deleteAllBadCarlos() {
  console.log('🧹 Cleaning Up Bad Carlos Accounts\n');
  console.log('Keeping only: carlos.martinez@jiujitsio.com');
  
  const badEmails = [
    'carlos@carlos.com',
    'carlos.martinez@jobs.com'
  ];
  
  let deleted = 0;
  let failed = 0;
  
  for (const email of badEmails) {
    const success = await deleteAccount(email);
    if (success) {
      deleted++;
    } else {
      failed++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Deleted: ${deleted}`);
  console.log(`   Failed: ${failed}`);
  
  if (failed === 0) {
    console.log(`\n✅ All bad accounts deleted!`);
    console.log(`\nNext: Check Carlos's classes with:`);
    console.log(`   node scripts/check-carlos-classes-details.js`);
  }
}

deleteAllBadCarlos().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

