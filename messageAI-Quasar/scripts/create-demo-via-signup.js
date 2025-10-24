#!/usr/bin/env node

/**
 * Create Demo Users via Normal Signup Flow
 * Uses regular signup instead of Admin API
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import pg from 'pg';

const { Client } = pg;

// Load environment variables
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client (regular client, not admin)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  console.log('🏋️  Creating Demo Users via Signup Flow...\n');
  
  try {
    // Get gym data
    console.log('📍 Fetching gym data...');
    const gyms = await getGymData();
    console.log(`✅ Found ${Object.keys(gyms).length} gyms\n`);
    
    // Create users
    console.log('👥 Creating demo users...\n');
    const created = [];
    
    for (const userData of DEMO_USERS) {
      console.log(`Creating: ${userData.email}`);
      
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name
          },
          emailRedirectTo: undefined // Disable email confirmation
        }
      });
      
      if (authError) {
        console.error(`   ❌ Signup error: ${authError.message}`);
        continue;
      }
      
      if (!authData.user) {
        console.error(`   ❌ No user returned from signup`);
        continue;
      }
      
      console.log(`   ✅ User signed up: ${authData.user.id}`);
      
      // Wait a moment for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
      
      // Update the profile with our data
      const client = new Client({
        connectionString: process.env.SUPABASE_DB_URL
      });
      
      await client.connect();
      
      // Confirm the email manually in the database
      await client.query(`
        UPDATE auth.users
        SET email_confirmed_at = NOW(),
            confirmation_token = ''
        WHERE id = $1
      `, [authData.user.id]);
      
      // Update profile
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
      
      console.log(`   ✅ Profile updated and email confirmed`);
      console.log('');
      
      created.push(userData.email);
      
      // Small delay between creations
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log('─'.repeat(70));
    console.log(`\n🎉 Successfully created ${created.length} demo users!\n`);
    console.log('📧 Login with any of these accounts:');
    created.forEach(email => console.log(`   • ${email}`));
    console.log(`\n🔑 Password for all: demo123456\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createDemoUsers();

