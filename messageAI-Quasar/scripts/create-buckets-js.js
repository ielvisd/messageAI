#!/usr/bin/env node

/**
 * Create Storage Buckets via JavaScript
 * 
 * This creates the required storage buckets using the Supabase JavaScript client.
 * Note: This requires SERVICE_ROLE key for creating buckets (admin operation).
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔧 Creating storage buckets...\n')

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables\n')
  console.error('Please create a .env file with:')
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co')
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n')
  console.error('You can find these in your Supabase dashboard:')
  console.error('  https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api\n')
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createBuckets() {
  try {
    // Create profile-avatars bucket
    console.log('📦 Creating profile-avatars bucket...')
    const { data: avatarBucket, error: avatarError } = await supabase.storage.createBucket('profile-avatars', {
      public: true,
      fileSizeLimit: 5242880, // 5 MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
    })

    if (avatarError && !avatarError.message.includes('already exists')) {
      console.error('  ❌ Error:', avatarError.message)
    } else if (avatarError) {
      console.log('  ℹ️  Bucket already exists')
    } else {
      console.log('  ✅ Created successfully')
    }

    // Create chat-media bucket
    console.log('📦 Creating chat-media bucket...')
    const { data: mediaBucket, error: mediaError } = await supabase.storage.createBucket('chat-media', {
      public: true,
      fileSizeLimit: 52428800, // 50 MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
    })

    if (mediaError && !mediaError.message.includes('already exists')) {
      console.error('  ❌ Error:', mediaError.message)
    } else if (mediaError) {
      console.log('  ℹ️  Bucket already exists')
    } else {
      console.log('  ✅ Created successfully')
    }

    console.log('\n✅ Storage buckets created!\n')
    console.log('⚠️  You still need to set up storage policies by running:')
    console.log('   pnpm db:apply scripts/create-storage-buckets.sql\n')
    console.log('Or manually run the SQL policies in Supabase SQL Editor.')
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  }
}

createBuckets()

