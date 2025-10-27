#!/usr/bin/env node

/**
 * Verify Storage Bucket Configuration
 * 
 * This script checks if the required storage buckets exist and are properly configured.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyStorageConfig() {
  console.log('🔍 Checking storage bucket configuration...\n')

  try {
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError)
      return
    }

    console.log('📦 Available buckets:')
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.id} (public: ${bucket.public})`)
    })
    console.log('')

    // Check for required buckets
    const requiredBuckets = ['profile-avatars', 'chat-media']
    const existingBucketIds = buckets.map(b => b.id)

    console.log('✅ Required buckets check:')
    requiredBuckets.forEach(required => {
      const exists = existingBucketIds.includes(required)
      console.log(`  ${exists ? '✅' : '❌'} ${required}`)
    })
    console.log('')

    // Test profile-avatars bucket access
    if (existingBucketIds.includes('profile-avatars')) {
      console.log('🧪 Testing profile-avatars bucket access...')
      const { data: files, error: listError } = await supabase.storage
        .from('profile-avatars')
        .list('', { limit: 1 })

      if (listError) {
        console.error('  ⚠️  Cannot list files:', listError.message)
      } else {
        console.log(`  ✅ Can list files (found ${files?.length || 0} items)`)
      }
    }

    // Test chat-media bucket access
    if (existingBucketIds.includes('chat-media')) {
      console.log('🧪 Testing chat-media bucket access...')
      const { data: files, error: listError } = await supabase.storage
        .from('chat-media')
        .list('', { limit: 1 })

      if (listError) {
        console.error('  ⚠️  Cannot list files:', listError.message)
      } else {
        console.log(`  ✅ Can list files (found ${files?.length || 0} items)`)
      }
    }

    console.log('')
    console.log('💡 If buckets are missing, run:')
    console.log('   pnpm db:apply scripts/create-storage-buckets.sql')
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

verifyStorageConfig()

