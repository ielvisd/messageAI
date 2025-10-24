#!/usr/bin/env node

/**
 * Create demo accounts using Supabase Admin API
 * This properly creates auth users with working passwords
 * 
 * Usage: node scripts/create-demo-accounts.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Error: VITE_SUPABASE_URL not found in .env file');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in .env file');
  console.error('');
  console.error('📋 To get your service role key:');
  console.error('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api');
  console.error('2. Copy the "service_role" secret key (NOT the anon key)');
  console.error('3. Add to your .env file:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('');
  console.error('⚠️  Keep this key SECRET - it bypasses RLS!');
  process.exit(1);
}

// Create Supabase client with service role (admin access)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const demoAccounts = [
  {
    email: 'alex.student@demo.com',
    name: 'Alex Chen',
    age_category: 'adult',
    description: 'Adult, All Levels, Jiujitsio only'
  },
  {
    email: 'jordan.competitor@demo.com',
    name: 'Jordan Martinez',
    age_category: 'adult',
    description: 'Adult, Advanced, Both Gyms, Competition'
  },
  {
    email: 'sam.teen@demo.com',
    name: 'Sam Johnson',
    age_category: 'teen',
    description: 'Teen (15+), All Levels, Jiujitsio'
  },
  {
    email: 'parent.trainer@demo.com',
    name: 'Taylor Smith',
    age_category: 'adult',
    description: 'Parent Who Trains, Jiujitsio West'
  },
  {
    email: 'casey.beginner@demo.com',
    name: 'Casey Thompson',
    age_category: 'adult',
    description: 'Adult Beginner, No-GI focus, Jiujitsio West'
  }
];

async function createDemoAccounts() {
  console.log('🚀 Creating demo accounts...\n');
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const account of demoAccounts) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const userExists = existingUser?.users?.some(u => u.email === account.email);
      
      if (userExists) {
        console.log(`⏭️  Skipped: ${account.name} (${account.email}) - already exists`);
        skipCount++;
        continue;
      }
      
      // Create auth user with Admin API (this properly handles password hashing)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: 'demo123456',
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: account.name
        }
      });
      
      if (authError) {
        console.error(`❌ Failed: ${account.name} - ${authError.message}`);
        errorCount++;
        continue;
      }
      
      console.log(`✅ Created: ${account.name} (${account.email})`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Error creating ${account.name}:`, error.message);
      errorCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Created: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  
  if (successCount > 0 || skipCount > 0) {
    console.log('\n🎯 Next Step:');
    console.log('Run the SQL migration to create profiles and link to gyms:');
    console.log('');
    console.log('1. Go to: Supabase Dashboard → SQL Editor');
    console.log('2. Run: supabase/migrations/20251025180000_create_demo_students.sql');
    console.log('');
    console.log('OR use the command:');
    console.log('  pnpm db:apply supabase/migrations/20251025180000_create_demo_students.sql');
    console.log('');
    console.log('Then you can login with any of these emails and password: demo123456');
  }
}

// Run the script
createDemoAccounts().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

