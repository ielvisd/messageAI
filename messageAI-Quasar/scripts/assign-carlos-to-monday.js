#!/usr/bin/env node

/**
 * Assign Carlos Martinez to all Monday classes
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

async function assignCarlos() {
  console.log('👨‍🏫 Assigning Carlos Martinez to Monday Classes\n');
  
  // Step 1: Find Carlos
  const { data: carlos, error: carlosError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'carlos.martinez@jiujitsio.com')
    .single();
  
  if (carlosError || !carlos) {
    console.error('❌ Error finding Carlos:', carlosError?.message);
    process.exit(1);
  }
  
  if (!carlos.gym_id) {
    console.error('❌ Carlos has no gym assigned. Run fix-carlos-profile.js first.');
    process.exit(1);
  }
  
  console.log(`Found Carlos (${carlos.name})`);
  console.log(`  Role: ${carlos.role}`);
  console.log(`  Gym ID: ${carlos.gym_id}\n`);
  
  // Step 2: Find all Monday classes
  const { data: mondayClasses, error: classError } = await supabase
    .from('gym_schedules')
    .select('*')
    .eq('gym_id', carlos.gym_id)
    .eq('day_of_week', 'Monday');
  
  if (classError) {
    console.error('❌ Error finding Monday classes:', classError.message);
    process.exit(1);
  }
  
  if (!mondayClasses || mondayClasses.length === 0) {
    console.log('ℹ️  No Monday classes found for this gym');
    process.exit(0);
  }
  
  console.log(`Found ${mondayClasses.length} Monday classes\n`);
  
  // Step 3: Assign Carlos to each Monday class
  let updated = 0;
  let alreadyAssigned = 0;
  
  for (const classSchedule of mondayClasses) {
    if (classSchedule.instructor_id === carlos.id) {
      console.log(`✓ ${classSchedule.start_time} ${classSchedule.class_type} - Already assigned to Carlos`);
      alreadyAssigned++;
      continue;
    }
    
    const { error: updateError } = await supabase
      .from('gym_schedules')
      .update({
        instructor_id: carlos.id,
        instructor_name: carlos.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', classSchedule.id);
    
    if (updateError) {
      console.error(`❌ Failed to update ${classSchedule.start_time} ${classSchedule.class_type}:`, updateError.message);
    } else {
      console.log(`✅ ${classSchedule.start_time} ${classSchedule.class_type} - Assigned to Carlos`);
      updated++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Already assigned: ${alreadyAssigned}`);
  console.log(`  Total: ${mondayClasses.length}`);
  console.log(`\n✅ Done! Carlos should now see his Monday classes.`);
}

assignCarlos().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

