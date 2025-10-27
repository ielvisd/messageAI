#!/usr/bin/env node

/**
 * Investigate Carlos Martinez's schedule entries to understand why they show
 * in InstructorDashboard but not in the overall schedule
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

async function investigate() {
  console.log('🔍 Investigating Carlos Martinez Schedule\n');
  
  // Step 1: Find Carlos's profile
  console.log('Step 1: Finding Carlos Martinez...');
  const { data: carlos, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, email, role, gym_id')
    .eq('email', 'carlos.martinez@jiujitsio.com')
    .single();
  
  if (profileError) {
    console.error('❌ Error finding Carlos:', profileError.message);
    process.exit(1);
  }
  
  if (!carlos) {
    console.log('❌ Carlos Martinez not found in profiles');
    process.exit(1);
  }
  console.log('✅ Found Carlos:');
  console.log(`   ID: ${carlos.id}`);
  console.log(`   Name: ${carlos.name}`);
  console.log(`   Email: ${carlos.email}`);
  console.log(`   Role: ${carlos.role}`);
  console.log(`   Gym ID: ${carlos.gym_id}\n`);
  
  // Step 2: Find all schedules with Carlos as instructor (filtered query)
  console.log('Step 2: Fetching schedules with instructor_id filter...');
  const { data: filteredSchedules, error: filteredError } = await supabase
    .from('gym_schedules')
    .select('*')
    .eq('instructor_id', carlos.id)
    .order('day_of_week');
  
  if (filteredError) {
    console.error('❌ Error fetching filtered schedules:', filteredError.message);
    process.exit(1);
  }
  
  console.log(`✅ Found ${filteredSchedules.length} schedules with instructor_id filter:`);
  filteredSchedules.forEach(s => {
    console.log(`   • ${s.day_of_week} ${s.start_time} - ${s.class_type}`);
    console.log(`     - instructor_id: ${s.instructor_id || 'NULL'}`);
    console.log(`     - instructor_name: ${s.instructor_name || 'NULL'}`);
    console.log(`     - is_active: ${s.is_active}`);
    console.log(`     - is_cancelled: ${s.is_cancelled || false}`);
    console.log(`     - gym_id: ${s.gym_id}`);
  });
  console.log('');
  
  // Step 3: Find all schedules for Carlos's gym (unfiltered query)
  console.log('Step 3: Fetching ALL schedules for Carlos\'s gym...');
  const { data: allSchedules, error: allError } = await supabase
    .from('gym_schedules')
    .select('*')
    .eq('gym_id', carlos.gym_id)
    .order('day_of_week');
  
  if (allError) {
    console.error('❌ Error fetching all schedules:', allError.message);
    process.exit(1);
  }
  
  console.log(`✅ Found ${allSchedules.length} total schedules for the gym\n`);
  
  // Step 4: Find Monday schedules specifically
  const mondaySchedules = allSchedules.filter(s => s.day_of_week === 'Monday');
  console.log(`Step 4: Monday schedules (${mondaySchedules.length} found):`);
  mondaySchedules.forEach(s => {
    const isCarlos = s.instructor_id === carlos.id;
    console.log(`   ${isCarlos ? '👉' : '  '} ${s.start_time} - ${s.class_type}`);
    console.log(`     - instructor_id: ${s.instructor_id || 'NULL'} ${isCarlos ? '(CARLOS)' : ''}`);
    console.log(`     - instructor_name: ${s.instructor_name || 'NULL'}`);
    console.log(`     - is_active: ${s.is_active}`);
    console.log(`     - is_cancelled: ${s.is_cancelled || false}`);
  });
  console.log('');
  
  // Step 5: Analysis
  console.log('📊 Analysis:');
  const carlosMondays = mondaySchedules.filter(s => s.instructor_id === carlos.id);
  console.log(`   • Carlos is assigned to ${carlosMondays.length} Monday classes`);
  
  const inactiveCarlosMondays = carlosMondays.filter(s => !s.is_active);
  if (inactiveCarlosMondays.length > 0) {
    console.log(`   ⚠️  ${inactiveCarlosMondays.length} of Carlos's Monday classes have is_active=false`);
  }
  
  const cancelledCarlosMondays = carlosMondays.filter(s => s.is_cancelled);
  if (cancelledCarlosMondays.length > 0) {
    console.log(`   ⚠️  ${cancelledCarlosMondays.length} of Carlos's Monday classes have is_cancelled=true`);
  }
  
  const missingNameCarlosMondays = carlosMondays.filter(s => !s.instructor_name);
  if (missingNameCarlosMondays.length > 0) {
    console.log(`   ⚠️  ${missingNameCarlosMondays.length} of Carlos's Monday classes have NULL instructor_name`);
  }
  
  console.log('\n💡 Recommendations:');
  if (inactiveCarlosMondays.length > 0) {
    console.log('   • Some classes are marked as inactive - set is_active=true');
  }
  if (missingNameCarlosMondays.length > 0) {
    console.log('   • Some classes missing instructor_name - this field should be populated');
  }
  if (carlosMondays.length === 0) {
    console.log('   • No Monday classes found for Carlos - check instructor assignments');
  }
}

investigate().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

