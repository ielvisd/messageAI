#!/usr/bin/env node

/**
 * Fix Demo Account Passwords
 * Updates demo accounts with properly hashed passwords
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import pg from 'pg';

const { Client } = pg;

// Load environment variables
config();

const DEMO_PASSWORD = 'demo123456';
const DEMO_EMAILS = [
  'alex.student@demo.com',
  'jordan.competitor@demo.com',
  'sam.teen@demo.com',
  'mia.kid@demo.com',
  'parent.trainer@demo.com',
  'casey.beginner@demo.com',
  'lily.peewee@demo.com'
];

async function fixDemoPasswords() {
  console.log('🔧 Fixing demo account passwords...\n');

  // Generate bcrypt hash for demo password
  console.log('🔐 Generating password hash...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  console.log(`✅ Hash generated: ${passwordHash.substring(0, 20)}...\n`);

  // Connect to database
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Update passwords
    console.log('📝 Updating demo account passwords...');
    const result = await client.query(`
      UPDATE auth.users 
      SET encrypted_password = $1,
          email_confirmed_at = NOW(),
          confirmation_token = '',
          recovery_token = ''
      WHERE email = ANY($2::text[])
      RETURNING email
    `, [passwordHash, DEMO_EMAILS]);

    console.log(`✅ Updated ${result.rowCount} accounts\n`);

    // Verify
    console.log('🔍 Verifying updates...');
    const verify = await client.query(`
      SELECT 
        email,
        email_confirmed_at IS NOT NULL as confirmed,
        encrypted_password != '$2a$10$AAAAAAAAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' as has_real_password
      FROM auth.users 
      WHERE email = ANY($1::text[])
      ORDER BY email
    `, [DEMO_EMAILS]);

    console.log('\n📋 Demo Account Status:');
    console.log('─'.repeat(70));
    verify.rows.forEach(row => {
      const status = row.confirmed && row.has_real_password ? '✅' : '❌';
      console.log(`${status} ${row.email.padEnd(30)} | Confirmed: ${row.confirmed} | Valid Password: ${row.has_real_password}`);
    });
    console.log('─'.repeat(70));

    console.log(`\n🎉 All demo accounts ready!`);
    console.log(`📧 Email: any of the ${DEMO_EMAILS.length} demo accounts`);
    console.log(`🔑 Password: ${DEMO_PASSWORD}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixDemoPasswords();

