#!/usr/bin/env node

/**
 * Test Supabase connection and service role key
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

console.log('🧪 Testing Supabase Connection...\n');

console.log('📋 Configuration:');
console.log(`   URL: ${supabaseUrl || '❌ MISSING'}`);
console.log(`   Service Key: ${supabaseServiceKey ? '✅ Present (' + supabaseServiceKey.substring(0, 20) + '...)' : '❌ MISSING'}`);
console.log('');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  try {
    // Test 1: List auth users
    console.log('Test 1: Listing auth users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error(`❌ Failed to list users`);
      console.error(`   Error: ${usersError.message}`);
      console.error(`   Status: ${usersError.status || 'N/A'}`);
      console.error('');
      console.error('💡 This usually means:');
      console.error('   • Wrong service role key (check Supabase Dashboard → Settings → API)');
      console.error('   • Service role key is for a different project');
      console.error('   • Network/connection issue');
      return false;
    }
    
    console.log(`✅ Successfully connected! Found ${users.users.length} auth users`);
    console.log('');
    
    // Test 2: Query gyms table
    console.log('Test 2: Querying gyms table...');
    const { data: gyms, error: gymsError } = await supabase
      .from('gyms')
      .select('id, name')
      .limit(5);
    
    if (gymsError) {
      console.error(`❌ Failed to query gyms`);
      console.error(`   Error: ${gymsError.message}`);
      return false;
    }
    
    console.log(`✅ Found ${gyms.length} gyms:`);
    gyms.forEach(gym => {
      console.log(`   • ${gym.name} (${gym.id})`);
    });
    console.log('');
    
    // Test 3: Try to create a test user (and delete it immediately)
    console.log('Test 3: Testing user creation...');
    const testEmail = `test-${Date.now()}@example.com`;
    
    const { data: testUser, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'test123456',
      email_confirm: true
    });
    
    if (createError) {
      console.error(`❌ Failed to create test user`);
      console.error(`   Error: ${createError.message}`);
      return false;
    }
    
    console.log(`✅ Successfully created test user`);
    
    // Delete the test user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(testUser.user.id);
    
    if (deleteError) {
      console.warn(`⚠️  Could not delete test user (you may want to clean this up manually)`);
    } else {
      console.log(`✅ Cleaned up test user`);
    }
    
    console.log('');
    console.log('🎉 All tests passed! Your Supabase connection is working correctly.');
    console.log('');
    console.log('You can now run:');
    console.log('   pnpm demo:create-owner');
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});

