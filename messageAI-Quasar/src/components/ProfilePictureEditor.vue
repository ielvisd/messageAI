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

    img.onload = () => {
      // Crop to square (center crop)
      const size = Math.min(img.width, img.height)
      const x = (img.width - size) / 2
      const y = (img.height - size) / 2

      // Resize to 512x512 for profile pictures
      const targetSize = 512
      canvas.width = targetSize
      canvas.height = targetSize

      ctx?.drawImage(img, x, y, size, size, 0, 0, targetSize, targetSize)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to process image'))
          }
        },
        'image/jpeg',
        0.9
      )
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
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
    // Delete old avatar if exists
    if (currentAvatarUrl.value) {
      const oldPath = currentAvatarUrl.value.split('/').pop()
      if (oldPath) {
        await supabase.storage
          .from('profile-avatars')
          .remove([`${user.value.id}/${oldPath}`])
      }
    }

    // Upload new avatar
    const fileName = `${user.value.id}/${Date.now()}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('profile-avatars')
      .upload(fileName, imageBlob, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-avatars')
      .getPublicUrl(fileName)

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user.value.id)

    if (updateError) throw updateError

    currentAvatarUrl.value = urlData.publicUrl
    emit('avatar-updated', urlData.publicUrl)

    Notify.create({
      type: 'positive',
      message: 'Profile picture updated successfully',
      position: 'top',
      timeout: 2000
    })

    return urlData.publicUrl
  } catch (err) {
    console.error('Error uploading avatar:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to upload profile picture',
      position: 'top'
    })
    throw err
  } finally {
    uploading.value = false
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
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      quality: 90,
      allowEditing: true,
      saveToGallery: false
    })

    if (photo.dataUrl) {
      const processedBlob = await processImage(photo.dataUrl)
      await uploadAvatar(processedBlob)
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      const errorMessage = (err as { message: string }).message
      if (!errorMessage.includes('cancelled')) {
        Notify.create({
          type: 'negative',
          message: 'Failed to capture photo',
          position: 'top'
        })
      }
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
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      quality: 90,
      allowEditing: true
    })

    if (photo.dataUrl) {
      const processedBlob = await processImage(photo.dataUrl)
      await uploadAvatar(processedBlob)
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      const errorMessage = (err as { message: string }).message
      if (!errorMessage.includes('cancelled')) {
        Notify.create({
          type: 'negative',
          message: 'Failed to select photo',
          position: 'top'
        })
      }
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
    // Delete from storage
    if (currentAvatarUrl.value) {
      const oldPath = currentAvatarUrl.value.split('/').pop()
      if (oldPath) {
        await supabase.storage
          .from('profile-avatars')
          .remove([`${user.value.id}/${oldPath}`])
      }
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.value.id)

    if (updateError) throw updateError

    currentAvatarUrl.value = null
    emit('avatar-updated', null)

    Notify.create({
      type: 'positive',
      message: 'Profile picture removed',
      position: 'top',
      timeout: 2000
    })
  } catch (err) {
    console.error('Error removing avatar:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to remove profile picture',
      position: 'top'
    })
  } finally {
    uploading.value = false
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



