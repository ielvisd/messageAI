<template>
  <q-dialog v-model="showDialog" @hide="onClose">
    <q-card style="min-width: 350px; max-width: 500px">
      <q-card-section>
        <div class="text-h6">Profile Picture</div>
      </q-card-section>

      <q-card-section class="q-pt-none column items-center">
        <!-- Current Avatar Preview -->
        <q-avatar size="150px" class="q-mb-md">
          <img v-if="currentAvatarUrl" :src="currentAvatarUrl" alt="Profile" />
          <q-icon v-else name="person" size="80px" color="grey-5" />
        </q-avatar>

        <!-- Action Buttons -->
        <div class="row q-gutter-sm">
          <q-btn
            outline
            color="primary"
            icon="photo_camera"
            label="Take Photo"
            @click="handleTakePhoto"
            :loading="uploading"
          />
          <q-btn
            outline
            color="secondary"
            icon="photo_library"
            label="Choose Photo"
            @click="handleChoosePhoto"
            :loading="uploading"
          />
        </div>

        <q-btn
          v-if="currentAvatarUrl"
          flat
          color="negative"
          icon="delete"
          label="Remove Photo"
          @click="handleRemovePhoto"
          :loading="uploading"
          class="q-mt-md"
        />

        <!-- Upload Progress -->
        <q-linear-progress 
          v-if="uploading" 
          indeterminate 
          color="primary" 
          class="q-mt-md full-width"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Close" color="grey" v-close-popup :disable="uploading" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'
import { Notify } from 'quasar'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const props = defineProps<{
  modelValue: boolean
  avatarUrl?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'avatar-updated': [url: string | null]
}>()

const showDialog = ref(props.modelValue)
const currentAvatarUrl = ref(props.avatarUrl)
const uploading = ref(false)

// Sync with v-model
watch(() => props.modelValue, (val) => {
  showDialog.value = val
})

watch(showDialog, (val) => {
  emit('update:modelValue', val)
})

watch(() => props.avatarUrl, (val) => {
  currentAvatarUrl.value = val
})

/**
 * Check camera permissions (only needed on native platforms)
 */
const checkPermissions = async (): Promise<boolean> => {
  // On web, permissions are handled automatically by the browser
  if (Capacitor.getPlatform() === 'web') {
    return true
  }

  // On native platforms (iOS/Android), check and request permissions
  try {
    const permissions = await Camera.checkPermissions()
    if (permissions.camera === 'granted' && permissions.photos === 'granted') {
      return true
    }

    const requested = await Camera.requestPermissions()
    return requested.camera === 'granted' && requested.photos === 'granted'
  } catch (err) {
    console.error('Permission check failed:', err)
    return false
  }
}

/**
 * Compress and crop image to square
 */
const processImage = async (dataUrl: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Failed to get canvas context'))
      return
    }

    img.onload = () => {
      try {
        // Crop to square (center crop)
        const size = Math.min(img.width, img.height)
        const x = (img.width - size) / 2
        const y = (img.height - size) / 2

        // Resize to 512x512 for profile pictures
        const targetSize = 512
        canvas.width = targetSize
        canvas.height = targetSize

        ctx.drawImage(img, x, y, size, size, 0, 0, targetSize, targetSize)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to convert canvas to blob'))
            }
          },
          'image/jpeg',
          0.9
        )
      } catch (err) {
        console.error('Error processing image:', err)
        reject(err)
      }
    }

    img.onerror = (err) => {
      console.error('Error loading image:', err)
      reject(new Error('Failed to load image'))
    }
    
    img.crossOrigin = 'anonymous' // Important for iOS simulator
    img.src = dataUrl
  })
}

/**
 * Upload avatar to Supabase storage with timeout
 */
const uploadWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Upload timeout')), timeoutMs)
    )
  ])
}

/**
 * Upload avatar to Supabase storage
 */
const uploadAvatar = async (imageBlob: Blob): Promise<string> => {
  if (!user.value) {
    throw new Error('User not authenticated')
  }

  uploading.value = true

  try {
    console.log('Starting upload process...')
    console.log('User ID:', user.value.id)
    console.log('Blob size:', imageBlob.size, 'bytes')

    // Get auth token - WORKAROUND: getSession() hangs on iOS, read from localStorage
    console.log('Getting auth token...')
    let accessToken: string | null = null
    
    try {
      // Try to read directly from localStorage where Supabase stores it
      const supabaseAuthKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
      const authData = localStorage.getItem(supabaseAuthKey)
      console.log('Auth key:', supabaseAuthKey)
      console.log('Auth data exists:', !!authData)
      
      if (authData) {
        const parsed = JSON.parse(authData)
        accessToken = parsed?.access_token || parsed?.currentSession?.access_token
        console.log('✅ Got token from localStorage')
      }
    } catch (err) {
      console.warn('Could not read token from localStorage:', err)
    }
    
    // Fallback: try getSession() with short timeout
    if (!accessToken) {
      console.log('Trying getSession() as fallback...')
      try {
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 2000)
        )
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any
        accessToken = session?.access_token
        console.log('✅ Got token from getSession()')
      } catch (err) {
        console.error('getSession() failed:', err)
      }
    }
    
    if (!accessToken) {
      throw new Error('Could not get access token')
    }
    console.log('✅ Ready to upload with token')

    // Delete old avatar if exists (don't block upload on this)
    if (currentAvatarUrl.value) {
      const oldPath = currentAvatarUrl.value.split('/').pop()
      if (oldPath) {
        console.log('Deleting old avatar (non-blocking):', oldPath)
        const deleteUrl = `${supabaseUrl}/storage/v1/object/profile-avatars/${user.value.id}/${oldPath}`
        
        // Fire and forget - don't await this
        fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }).then(response => {
          if (response.ok) {
            console.log('✅ Old avatar deleted')
          } else {
            console.warn('⚠️  Could not delete old avatar:', response.status)
          }
        }).catch(err => {
          console.warn('⚠️  Delete failed:', err)
        })
        console.log('Delete request sent (continuing with upload)')
      }
    }

    // Upload new avatar with timeout
    const fileName = `${user.value.id}/${Date.now()}.jpg`
    console.log('Uploading to:', fileName)
    console.log('Bucket: profile-avatars')
    console.log('File size:', imageBlob.size, 'bytes')
    
    // WORKAROUND: Bypass Supabase Storage SDK on iOS - use direct fetch
    console.log('Converting Blob to ArrayBuffer...')
    const arrayBuffer = await imageBlob.arrayBuffer()
    console.log('✅ Converted to ArrayBuffer:', arrayBuffer.byteLength, 'bytes')
    
    console.log('Attempting direct upload to Storage API...')
    const storageUrl = `${supabaseUrl}/storage/v1/object/profile-avatars/${fileName}`
    console.log('Upload URL:', storageUrl)
    
    const uploadResponse = await uploadWithTimeout(
      fetch(storageUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'false'
        },
        body: arrayBuffer
      }),
      15000 // 15 second timeout for testing
    )
    
    console.log('Upload response status:', uploadResponse.status)
    
    const uploadResult = {
      data: uploadResponse.ok ? { path: fileName } : null,
      error: uploadResponse.ok ? null : { message: await uploadResponse.text() }
    }

    console.log('Upload result:', uploadResult)

    if (uploadResult.error) {
      console.error('❌ Upload error details:', {
        message: uploadResult.error.message,
        status: uploadResult.error.status,
        statusCode: uploadResult.error.statusCode,
        error: uploadResult.error
      })
      throw new Error(`Upload failed: ${uploadResult.error.message || JSON.stringify(uploadResult.error)}`)
    }

    // Get public URL
    console.log('Getting public URL...')
    const { data: urlData } = supabase.storage
      .from('profile-avatars')
      .getPublicUrl(fileName)

    console.log('Public URL:', urlData.publicUrl)

    // Update profile with timeout - WORKAROUND: Use direct PostgREST API
    console.log('Updating profile...')
    const postgrestUrl = `${supabaseUrl}/rest/v1/profiles?id=eq.${user.value.id}`
    console.log('PostgREST URL:', postgrestUrl)
    
    const updateResponse = await uploadWithTimeout(
      fetch(postgrestUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ avatar_url: urlData.publicUrl })
      }),
      10000
    )

    console.log('Update response status:', updateResponse.status)

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('Update error:', errorText)
      throw new Error(`Profile update failed: ${errorText}`)
    }

    currentAvatarUrl.value = urlData.publicUrl
    emit('avatar-updated', urlData.publicUrl)

    console.log('✅ Avatar upload complete!')

    Notify.create({
      type: 'positive',
      message: 'Profile picture updated successfully',
      position: 'top',
      timeout: 2000
    })

    return urlData.publicUrl
  } catch (err) {
    console.error('❌ Error uploading avatar:', err)
    console.error('Error type:', typeof err)
    console.error('Error stringified:', JSON.stringify(err))
    if (err instanceof Error) {
      console.error('Error message:', err.message)
      console.error('Error stack:', err.stack)
    }
    
    let errorMessage = 'Failed to upload profile picture'
    if (err instanceof Error) {
      if (err.message === 'Upload timeout') {
        errorMessage = 'Upload timed out. Please check your connection and try again.'
      } else if (err.message.includes('bucket')) {
        errorMessage = 'Storage configuration error. Please contact support.'
      } else if (err.message.includes('policy')) {
        errorMessage = 'Permission denied. Storage policies may not be configured correctly.'
      } else {
        errorMessage = `Upload failed: ${err.message}`
      }
    }
    
    Notify.create({
      type: 'negative',
      message: errorMessage,
      position: 'top',
      timeout: 5000
    })
    throw err
  } finally {
    uploading.value = false
    console.log('Upload process finished')
  }
}

/**
 * Handle taking a photo with camera
 */
const handleTakePhoto = async () => {
  const hasPermission = await checkPermissions()
  if (!hasPermission) {
    Notify.create({
      type: 'negative',
      message: 'Camera permission denied',
      position: 'top'
    })
    return
  }

  try {
    console.log('Taking photo with camera...')
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      quality: 90,
      allowEditing: true,
      saveToGallery: false
    })

    console.log('Photo captured:', photo ? 'success' : 'no photo')
    
    if (photo.dataUrl) {
      console.log('Processing image...')
      const processedBlob = await processImage(photo.dataUrl)
      console.log('Image processed, uploading...')
      await uploadAvatar(processedBlob)
    } else {
      console.warn('No dataUrl in photo result')
    }
  } catch (err) {
    console.error('Error in handleTakePhoto:', err)
    if (err && typeof err === 'object' && 'message' in err) {
      const errorMessage = (err as { message: string }).message
      if (!errorMessage.includes('cancelled') && !errorMessage.includes('cancel')) {
        Notify.create({
          type: 'negative',
          message: `Failed to capture photo: ${errorMessage}`,
          position: 'top'
        })
      }
    } else {
      Notify.create({
        type: 'negative',
        message: 'An unexpected error occurred',
        position: 'top'
      })
    }
  }
}

/**
 * Handle choosing a photo from gallery
 */
const handleChoosePhoto = async () => {
  const hasPermission = await checkPermissions()
  if (!hasPermission) {
    Notify.create({
      type: 'negative',
      message: 'Photo library permission denied',
      position: 'top'
    })
    return
  }

  try {
    console.log('Getting photo from gallery...')
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      quality: 90,
      allowEditing: true
    })

    console.log('Photo received:', photo ? 'success' : 'no photo')
    
    if (photo.dataUrl) {
      console.log('Processing image...')
      const processedBlob = await processImage(photo.dataUrl)
      console.log('Image processed, uploading...')
      await uploadAvatar(processedBlob)
    } else {
      console.warn('No dataUrl in photo result')
    }
  } catch (err) {
    console.error('Error in handleChoosePhoto:', err)
    if (err && typeof err === 'object' && 'message' in err) {
      const errorMessage = (err as { message: string }).message
      if (!errorMessage.includes('cancelled') && !errorMessage.includes('cancel')) {
        Notify.create({
          type: 'negative',
          message: `Failed to select photo: ${errorMessage}`,
          position: 'top'
        })
      }
    } else {
      Notify.create({
        type: 'negative',
        message: 'An unexpected error occurred',
        position: 'top'
      })
    }
  }
}

/**
 * Handle removing the profile photo
 */
const handleRemovePhoto = async () => {
  if (!user.value) return

  uploading.value = true

  try {
    console.log('🗑️ Starting avatar removal...')
    
    // Get auth token - WORKAROUND: getSession() hangs on iOS, read from localStorage
    console.log('Getting auth token...')
    let accessToken: string | null = null
    
    try {
      // Try to read directly from localStorage where Supabase stores it
      const supabaseAuthKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
      const authData = localStorage.getItem(supabaseAuthKey)
      
      if (authData) {
        const parsed = JSON.parse(authData)
        accessToken = parsed?.access_token || parsed?.currentSession?.access_token
        console.log('✅ Got token from localStorage')
      }
    } catch (err) {
      console.warn('Could not read token from localStorage:', err)
    }
    
    // Fallback: try getSession() with short timeout
    if (!accessToken) {
      console.log('Trying getSession() as fallback...')
      try {
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 2000)
        )
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any
        accessToken = session?.access_token
        console.log('✅ Got token from getSession()')
      } catch (err) {
        console.error('getSession() failed:', err)
      }
    }
    
    if (!accessToken) {
      throw new Error('Could not get access token')
    }
    console.log('✅ Ready to delete with token')
    
    // Delete from storage with timeout using direct fetch
    if (currentAvatarUrl.value) {
      const oldPath = currentAvatarUrl.value.split('/').pop()
      if (oldPath) {
        console.log('Deleting file from storage:', `${user.value.id}/${oldPath}`)
        
        const deleteUrl = `${supabaseUrl}/storage/v1/object/profile-avatars/${user.value.id}/${oldPath}`
        console.log('Delete URL:', deleteUrl)
        
        const deleteResponse = await uploadWithTimeout(
          fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }),
          10000 // 10 second timeout
        )
        
        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text()
          console.error('Delete error:', errorText)
          throw new Error(`Delete failed: ${errorText}`)
        }
        console.log('✅ File deleted from storage')
      }
    }

    // Update profile with timeout - WORKAROUND: Use direct PostgREST API
    console.log('Updating profile to remove avatar_url...')
    const postgrestUrl = `${supabaseUrl}/rest/v1/profiles?id=eq.${user.value.id}`
    console.log('PostgREST URL:', postgrestUrl)
    
    const updateResponse = await uploadWithTimeout(
      fetch(postgrestUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ avatar_url: null })
      }),
      10000 // 10 second timeout
    )

    console.log('Update response status:', updateResponse.status)

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('Update error:', errorText)
      throw new Error(`Profile update failed: ${errorText}`)
    }

    console.log('✅ Profile updated')
    currentAvatarUrl.value = null
    emit('avatar-updated', null)

    Notify.create({
      type: 'positive',
      message: 'Profile picture removed',
      position: 'top',
      timeout: 2000
    })
  } catch (err) {
    console.error('❌ Error removing avatar:', err)
    
    let errorMessage = 'Failed to remove profile picture'
    if (err instanceof Error) {
      if (err.message === 'Upload timeout') {
        errorMessage = 'Operation timed out. Please check your connection and try again.'
      } else {
        errorMessage = `Failed to remove: ${err.message}`
      }
    }
    
    Notify.create({
      type: 'negative',
      message: errorMessage,
      position: 'top',
      timeout: 5000
    })
  } finally {
    uploading.value = false
    console.log('Avatar removal process finished')
  }
}

const onClose = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.full-width {
  width: 100%;
}
</style>



