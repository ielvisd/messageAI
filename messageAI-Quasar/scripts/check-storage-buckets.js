#!/usr/bin/env node

/**
 * Check if storage buckets exist in Supabase
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

console.log('🔍 Checking storage buckets...\n')
console.log('Supabase URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStorageBuckets() {
  try {
    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets()

    if (error) {
      console.error('❌ Error listing buckets:', error.message)
      return
    }

    console.log('📦 Available buckets:')
    if (buckets && buckets.length > 0) {
      buckets.forEach(bucket => {
        console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`)
      })
    } else {
      console.log('  (no buckets found)')
    }

    // Check for required buckets
    const requiredBuckets = ['profile-avatars', 'chat-media']
    console.log('\n🔍 Checking required buckets:')
    
    for (const bucketName of requiredBuckets) {
      const exists = buckets?.some(b => b.name === bucketName || b.id === bucketName)
      if (exists) {
        console.log(`  ✅ ${bucketName} - exists`)
      } else {
        console.log(`  ❌ ${bucketName} - missing`)
      }
    }

    // Try to create missing buckets
    console.log('\n🛠️  Creating missing buckets...')
    for (const bucketName of requiredBuckets) {
      const exists = buckets?.some(b => b.name === bucketName || b.id === bucketName)
      if (!exists) {
        console.log(`  Creating ${bucketName}...`)
        const { data, error } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: bucketName === 'profile-avatars' ? 5242880 : 52428800,
          allowedMimeTypes: bucketName === 'profile-avatars' 
            ? ['image/jpeg', 'image/png', 'image/webp']
            : ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
        })

        if (error) {
          console.error(`  ❌ Failed to create ${bucketName}:`, error.message)
        } else {
          console.log(`  ✅ Created ${bucketName}`)
        }
      }
    }

    console.log('\n✨ Done!')

  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

checkStorageBuckets()

