#!/usr/bin/env node

/**
 * Check all Carlos accounts in the database
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

async function checkAllCarlos() {
  console.log('🔍 Checking All Carlos Accounts\n');
  
  // Find all profiles with carlos in name or email
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .or('email.ilike.%carlos%,name.ilike.%carlos%');
  
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  console.log(`Found ${profiles.length} Carlos account(s):\n`);
  
  profiles.forEach((profile, idx) => {
    console.log(`${idx + 1}. ${profile.email}`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Name: ${profile.name}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Gym ID: ${profile.gym_id || 'NULL'}`);
    console.log('');
  });
  
  // Check which one has classes assigned
  for (const profile of profiles) {
    const { data: classes } = await supabase
      .from('gym_schedules')
      .select('day_of_week, start_time, class_type')
      .eq('instructor_id', profile.id);
    
    if (classes && classes.length > 0) {
      console.log(`📚 ${profile.email} is teaching ${classes.length} classes:`);
      classes.forEach(c => {
        console.log(`   - ${c.day_of_week} ${c.start_time} ${c.class_type}`);
      });
      console.log('');
    }
  }
  
  // Recommendations
  console.log('💡 Recommendations:');
  const correctCarlos = profiles.find(p => p.email === 'carlos.martinez@jiujitsio.com');
  const wrongCarlos = profiles.find(p => p.email === 'carlos.martinez@jobs.com');
  
  if (correctCarlos && wrongCarlos) {
    console.log(`   • CORRECT Carlos: ${correctCarlos.email} (ID: ${correctCarlos.id})`);
    console.log(`   • WRONG Carlos: ${wrongCarlos.email} (ID: ${wrongCarlos.id})`);
    console.log(`\n   To fix:`);
    console.log(`   1. Delete wrong Carlos: node scripts/delete-wrong-carlos.js`);
    console.log(`   2. Fix correct Carlos: node scripts/fix-carlos-profile.js`);
    console.log(`   3. Assign to Monday: node scripts/assign-carlos-to-monday.js`);
  } else if (correctCarlos) {
    console.log(`   • Only correct Carlos exists: ${correctCarlos.email}`);
    console.log(`   • Run: node scripts/fix-carlos-profile.js`);
  } else if (wrongCarlos) {
    console.log(`   • Only wrong Carlos exists: ${wrongCarlos.email}`);
    console.log(`   • This should be deleted or email should be updated`);
  }
}

checkAllCarlos().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

