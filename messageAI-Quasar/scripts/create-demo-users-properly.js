#!/usr/bin/env node

/**
 * Create Demo Users Properly
 * Uses Supabase Admin API instead of direct database inserts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import pg from 'pg';

const { Client } = pg;

// Load environment variables
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in .env');
  console.log('\n📝 Please add this to your .env file:');
  console.log('   Go to: Supabase Dashboard → Settings → API');
  console.log('   Copy the "service_role" secret key');
  console.log('   Add: SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEMO_USERS = [
  {
    email: 'alex.student@demo.com',
    name: 'Alex Chen',
    password: 'demo123456',
    gym: 'jiujitsio',
    age_category: 'adult',
    preferences: {
      preferred_class_types: ['GI', 'No-GI'],
      preferred_times: ['evening'],
      skill_level: 'all_levels',
      goals: ['fitness', 'competition']
    }
  },
  {
    email: 'jordan.competitor@demo.com',
    name: 'Jordan Martinez',
    password: 'demo123456',
    gym: 'both',
    age_category: 'adult',
    preferences: {
      preferred_class_types: ['GI', 'Competition'],
      preferred_times: ['morning', 'evening'],
      skill_level: 'advanced',
      goals: ['competition', 'technique']
    }
  },
  {
    email: 'sam.teen@demo.com',
    name: 'Sam Johnson',
    password: 'demo123456',
    gym: 'jiujitsio',
    age_category: 'teen',
    preferences: {
      preferred_class_types: ['No-GI'],
      preferred_times: ['afternoon', 'evening'],
      skill_level: 'all_levels',
      goals: ['fitness', 'self_defense', 'fun']
    }
  },
  {
    email: 'mia.kid@demo.com',
    name: 'Mia Rodriguez',
    password: 'demo123456',
    gym: 'both',
    age_category: 'junior',
    preferences: {
      preferred_class_types: ['GI', 'No-GI'],
      preferred_times: ['afternoon'],
      skill_level: 'fundamentals',
      goals: ['fun', 'discipline', 'fitness']
    }
  },
  {
    email: 'parent.trainer@demo.com',
    name: 'Taylor Smith',
    password: 'demo123456',
    gym: 'jiujitsio_west',
    age_category: 'adult',
    preferences: {
      preferred_class_types: ['GI'],
      preferred_times: ['evening'],
      skill_level: 'fundamentals',
      goals: ['fitness', 'self_defense', 'family_activity'],
      is_parent: true,
      has_children_training: true
    }
  },
  {
    email: 'casey.beginner@demo.com',
    name: 'Casey Thompson',
    password: 'demo123456',
    gym: 'jiujitsio_west',
    age_category: 'adult',
    preferences: {
      preferred_class_types: ['No-GI'],
      preferred_times: ['evening'],
      skill_level: 'fundamentals',
      goals: ['fitness', 'weight_loss', 'technique']
    }
  },
  {
    email: 'lily.peewee@demo.com',
    name: 'Lily Williams',
    password: 'demo123456',
    gym: 'jiujitsio',
    age_category: 'pee_wee',
    preferences: {
      preferred_class_types: ['GI'],
      preferred_times: ['afternoon'],
      skill_level: 'all_levels',
      goals: ['fun', 'discipline']
    }
  }
];

async function getGymData() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL
  });
  
  await client.connect();
  
  const result = await client.query(`
    SELECT id, name, gym_chat_id FROM public.gyms ORDER BY created_at
  `);
  
  await client.end();
  
  const gyms = {};
  result.rows.forEach(row => {
    const key = row.name.toLowerCase().replace(/\s+/g, '_');
    gyms[key] = row;
  });
  
  return gyms;
}

async function createDemoUsers() {
  console.log('🏋️  Creating Demo Users via Supabase Admin API...\n');
  
  try {
    // Get gym data
    console.log('📍 Fetching gym data...');
    const gyms = await getGymData();
    console.log(`✅ Found ${Object.keys(gyms).length} gyms\n`);
    
    // Delete existing demo users first
    console.log('🗑️  Cleaning up existing demo users...');
    for (const user of DEMO_USERS) {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === user.email);
      
      if (existing) {
        await supabase.auth.admin.deleteUser(existing.id);
        console.log(`   Deleted: ${user.email}`);
      }
    }
    console.log('');
    
    // Create users
    console.log('👥 Creating demo users...\n');
    const created = [];
    
    for (const userData of DEMO_USERS) {
      console.log(`Creating: ${userData.email}`);
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          name: userData.name
        }
      });
      
      if (authError) {
        console.error(`   ❌ Auth error: ${authError.message}`);
        continue;
      }
      
      console.log(`   ✅ Auth user created: ${authData.user.id}`);
      
      // Determine gym IDs
      let gym_id, gym_ids = [];
      
      if (userData.gym === 'both') {
        gym_id = gyms.jiujitsio?.id;
        gym_ids = [gyms.jiujitsio?.id, gyms.jiujitsio_west?.id].filter(Boolean);
      } else if (userData.gym === 'jiujitsio_west') {
        gym_id = gyms.jiujitsio_west?.id;
        gym_ids = [gym_id];
      } else {
        gym_id = gyms.jiujitsio?.id;
        gym_ids = [gym_id];
      }
      
      // The profile should be created by the trigger, but let's update it with our data
      const client = new Client({
        connectionString: process.env.SUPABASE_DB_URL
      });
      
      await client.connect();
      
      await client.query(`
        UPDATE public.profiles
        SET 
          role = 'student',
          gym_id = $1,
          gym_ids = $2,
          age_category = $3,
          student_preferences = $4
        WHERE id = $5
      `, [gym_id, gym_ids, userData.age_category, JSON.stringify(userData.preferences), authData.user.id]);
      
      // Add to gym chats
      for (const gid of gym_ids) {
        const gymData = Object.values(gyms).find(g => g.id === gid);
        if (gymData?.gym_chat_id) {
          await client.query(`
            INSERT INTO public.chat_members (chat_id, user_id, joined_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (chat_id, user_id) DO NOTHING
          `, [gymData.gym_chat_id, authData.user.id]);
        }
      }
      
      await client.end();
      
      console.log(`   ✅ Profile updated`);
      console.log('');
      
      created.push(userData.email);
    }
    
    console.log('─'.repeat(70));
    console.log(`\n🎉 Successfully created ${created.length} demo users!\n`);
    console.log('📧 Login with any of these accounts:');
    created.forEach(email => console.log(`   • ${email}`));
    console.log(`\n🔑 Password for all: demo123456\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createDemoUsers();

