#!/usr/bin/env node

/**
 * Delete the wrong Carlos account (carlos.martinez@jobs.com)
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

async function deleteWrongCarlos() {
  console.log('🗑️  Deleting Wrong Carlos Account\n');
  
  // Find the wrong Carlos
  const { data: wrongCarlos, error: findError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'carlos.martinez@jobs.com')
    .single();
  
  if (findError) {
    if (findError.code === 'PGRST116') {
      console.log('✅ Wrong Carlos account does not exist (already deleted or never existed)');
      return;
    }
    console.error('❌ Error finding wrong Carlos:', findError.message);
    process.exit(1);
  }
  
  console.log('Found wrong Carlos account:');
  console.log(`  ID: ${wrongCarlos.id}`);
  console.log(`  Email: ${wrongCarlos.email}`);
  console.log(`  Name: ${wrongCarlos.name}`);
  console.log(`  Role: ${wrongCarlos.role}\n`);
  
  // Check if this Carlos has any classes assigned
  const { data: assignedClasses } = await supabase
    .from('gym_schedules')
    .select('*')
    .eq('instructor_id', wrongCarlos.id);
  
  if (assignedClasses && assignedClasses.length > 0) {
    console.log(`⚠️  This Carlos is assigned to ${assignedClasses.length} classes`);
    console.log('   Unassigning classes first...\n');
    
    // Unassign from all classes
    const { error: unassignError } = await supabase
      .from('gym_schedules')
      .update({ 
        instructor_id: null, 
        instructor_name: null 
      })
      .eq('instructor_id', wrongCarlos.id);
    
    if (unassignError) {
      console.error('❌ Error unassigning classes:', unassignError.message);
      process.exit(1);
    }
    
    console.log('✅ Unassigned from all classes\n');
  }
  
  // Delete the auth user first (this will cascade delete the profile)
  console.log('Deleting auth user...');
  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(wrongCarlos.id);
  
  if (deleteAuthError) {
    console.error('❌ Error deleting auth user:', deleteAuthError.message);
    
    // Try to delete just the profile if auth delete fails
    console.log('Trying to delete profile directly...');
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', wrongCarlos.id);
    
    if (deleteProfileError) {
      console.error('❌ Error deleting profile:', deleteProfileError.message);
      process.exit(1);
    }
  }
  
  console.log('✅ Successfully deleted wrong Carlos account\n');
  console.log('Next steps:');
  console.log('  1. Run: node scripts/fix-carlos-profile.js');
  console.log('  2. Run: node scripts/assign-carlos-to-monday.js');
}

deleteWrongCarlos().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

