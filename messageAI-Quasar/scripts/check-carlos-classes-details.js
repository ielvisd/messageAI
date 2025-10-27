#!/usr/bin/env node

/**
 * Check detailed info about Carlos's classes
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

async function checkClassDetails() {
  console.log('🔍 Checking Carlos Class Details\n');
  
  const carlosId = '9bce9318-80d7-4c20-97df-16e8b2db7f49'; // Correct Carlos
  
  // Get all classes for Carlos
  const { data: classes, error } = await supabase
    .from('gym_schedules')
    .select('*')
    .eq('instructor_id', carlosId)
    .eq('day_of_week', 'Monday')
    .order('start_time');
  
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  console.log(`Found ${classes.length} Monday classes for Carlos:\n`);
  
  classes.forEach((c, idx) => {
    console.log(`${idx + 1}. ${c.start_time} - ${c.class_type}`);
    console.log(`   ID: ${c.id}`);
    console.log(`   Gym ID: ${c.gym_id}`);
    console.log(`   Instructor ID: ${c.instructor_id}`);
    console.log(`   Instructor Name: ${c.instructor_name || 'NULL'}`);
    console.log(`   Is Active: ${c.is_active}`);
    console.log(`   Is Cancelled: ${c.is_cancelled || false}`);
    console.log(`   Day: ${c.day_of_week}`);
    console.log(`   Level: ${c.level || 'NULL'}`);
    console.log(`   Notes: ${c.notes || 'NULL'}`);
    console.log('');
  });
  
  // Check for potential issues
  console.log('🔧 Potential Issues:');
  const inactive = classes.filter(c => !c.is_active);
  const cancelled = classes.filter(c => c.is_cancelled);
  const noName = classes.filter(c => !c.instructor_name);
  
  if (inactive.length > 0) {
    console.log(`   ⚠️  ${inactive.length} classes are INACTIVE (is_active=false)`);
    console.log('      These won\'t show in the calendar!');
  }
  
  if (cancelled.length > 0) {
    console.log(`   ⚠️  ${cancelled.length} classes are CANCELLED`);
  }
  
  if (noName.length > 0) {
    console.log(`   ⚠️  ${noName.length} classes missing instructor_name`);
    console.log('      This might cause display issues');
  }
  
  if (inactive.length === 0 && cancelled.length === 0 && noName.length === 0) {
    console.log('   ✅ All classes look good!');
  }
  
  // Check what the useSchedule composable would fetch
  console.log('\n🔍 Testing useSchedule query with filters:');
  console.log(`   gym_id: ${classes[0]?.gym_id}`);
  console.log(`   instructor_id: ${carlosId}\n`);
  
  const { data: filteredClasses, error: filterError } = await supabase
    .from('gym_schedules')
    .select('*')
    .eq('gym_id', classes[0]?.gym_id)
    .eq('instructor_id', carlosId)
    .order('start_time');
  
  if (filterError) {
    console.error('❌ Filter query error:', filterError.message);
  } else {
    console.log(`✅ Query returned ${filteredClasses.length} classes`);
  }
}

checkClassDetails().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

