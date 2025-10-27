#!/usr/bin/env node

/**
 * Test Storage Upload
 * 
 * This script tests if we can upload to the profile-avatars bucket.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

console.log('🔧 Testing storage upload...\n')
console.log('Supabase URL:', supabaseUrl)
console.log('Using ANON key\n')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpload() {
  try {
    // Create a small test image (1x1 pixel red JPEG)
    const base64Image = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q=='
    const buffer = Buffer.from(base64Image, 'base64')
    const testData = new Blob([buffer], { type: 'image/jpeg' })
    const testPath = `test-${Date.now()}.jpg`
    
    console.log('📤 Attempting to upload test file...')
    console.log('Path:', testPath)
    console.log('Size:', testData.size, 'bytes')
    
    const { data, error } = await supabase.storage
      .from('profile-avatars')
      .upload(testPath, testData, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('\n❌ Upload failed:', error)
      console.error('\nPossible issues:')
      console.error('1. Bucket "profile-avatars" does not exist')
      console.error('2. Bucket is not public')
      console.error('3. Storage policies are not set up correctly')
      console.error('4. Network connectivity issue')
      return false
    }
    
    console.log('\n✅ Upload successful!')
    console.log('Data:', data)
    
    // Try to get public URL
    const { data: urlData } = supabase.storage
      .from('profile-avatars')
      .getPublicUrl(testPath)
    
    console.log('\n🔗 Public URL:', urlData.publicUrl)
    
    // Clean up
    console.log('\n🗑️  Cleaning up test file...')
    await supabase.storage
      .from('profile-avatars')
      .remove([testPath])
    
    console.log('✅ Test complete - storage is working!\n')
    return true
  } catch (err) {
    console.error('\n❌ Error:', err)
    return false
  }
}

testUpload()

