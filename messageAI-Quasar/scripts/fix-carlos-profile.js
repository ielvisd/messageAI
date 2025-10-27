#!/usr/bin/env node

/**
 * Fix Carlos Martinez's profile - set him as instructor and assign to gym
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

async function fixCarlos() {
  console.log('🔧 Fixing Carlos Martinez Profile\n');
  
  // Step 1: Find Carlos
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'carlos.martinez@jiujitsio.com')
    .single();
  
  if (profileError || !profiles) {
    console.error('❌ Error finding Carlos:', profileError?.message);
    process.exit(1);
  }
  
  const carlos = profiles;
  console.log('Found Carlos:');
  console.log(`  Current Role: ${carlos.role}`);
  console.log(`  Current Gym ID: ${carlos.gym_id || 'NULL'}\n`);
  
  // Step 2: Find a gym to assign him to
  const { data: gyms, error: gymError } = await supabase
    .from('gyms')
    .select('id, name')
    .limit(1);
  
  if (gymError || !gyms || gyms.length === 0) {
    console.error('❌ No gyms found in database');
    process.exit(1);
  }
  
  const gym = gyms[0];
  console.log(`Found gym: ${gym.name} (${gym.id})\n`);
  
  // Step 3: Update Carlos's profile
  console.log('Updating Carlos profile...');
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({
      role: 'instructor',
      gym_id: gym.id,
      name: 'Carlos Martinez', // Fix the name too
      updated_at: new Date().toISOString()
    })
    .eq('id', carlos.id)
    .select()
    .single();
  
  if (updateError) {
    console.error('❌ Error updating profile:', updateError.message);
    process.exit(1);
  }
  
  console.log('✅ Profile updated successfully!');
  console.log(`  New Role: ${updated.role}`);
  console.log(`  New Gym ID: ${updated.gym_id}`);
  console.log(`  New Name: ${updated.name}\n`);
  
  // Step 4: Check for Monday classes that need an instructor
  const { data: mondayClasses, error: classError } = await supabase
    .from('gym_schedules')
    .select('*')
    .eq('gym_id', gym.id)
    .eq('day_of_week', 'Monday')
    .is('instructor_id', null);
  
  if (classError) {
    console.error('⚠️  Error checking for unassigned Monday classes:', classError.message);
  } else if (mondayClasses && mondayClasses.length > 0) {
    console.log(`Found ${mondayClasses.length} Monday classes without an instructor:`);
    mondayClasses.forEach(c => {
      console.log(`  - ${c.start_time} ${c.class_type}`);
    });
    console.log('\n💡 To assign Carlos to these classes, run:');
    console.log('   node scripts/assign-carlos-to-monday.js\n');
  } else {
    console.log('ℹ️  All Monday classes already have instructors assigned\n');
  }
  
  // Step 5: Show classes Carlos is currently assigned to
  const { data: carlosClasses } = await supabase
    .from('gym_schedules')
    .select('*')
    .eq('instructor_id', carlos.id);
  
  if (carlosClasses && carlosClasses.length > 0) {
    console.log(`Carlos is currently teaching ${carlosClasses.length} classes:`);
    carlosClasses.forEach(c => {
      console.log(`  - ${c.day_of_week} ${c.start_time} ${c.class_type}`);
    });
  } else {
    console.log('ℹ️  Carlos is not assigned to any classes yet');
  }
  
  console.log('\n✅ Done! Carlos can now log in as an instructor.');
}

fixCarlos().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

