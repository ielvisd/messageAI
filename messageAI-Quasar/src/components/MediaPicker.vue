<template>
  <q-dialog v-model="showDialog" @hide="onCancel">
    <q-card style="min-width: 300px">
      <q-card-section>
        <div class="text-h6">Share Media</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-list>
          <q-item clickable @click="handleTakePhoto" v-close-popup>
            <q-item-section avatar>
              <q-icon name="photo_camera" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Take Photo</q-item-label>
              <q-item-label caption>Use camera to capture a photo</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable @click="handleTakeVideo" v-close-popup>
            <q-item-section avatar>
              <q-icon name="videocam" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Record Video</q-item-label>
              <q-item-label caption>Capture a video (max 30s)</q-item-label>
            </q-item-section>
          </q-item>

          <q-separator class="q-my-sm" />

          <q-item clickable @click="handleChooseFromGallery" v-close-popup>
            <q-item-section avatar>
              <q-icon name="photo_library" color="secondary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Choose from Gallery</q-item-label>
              <q-item-label caption>Select photos or videos</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="grey" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Preview Dialog -->
  <q-dialog v-model="showPreview" @hide="resetPreview">
    <q-card style="min-width: 350px; max-width: 500px">
      <q-card-section>
        <div class="text-h6">Preview</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div v-if="previewType === 'image'" class="preview-container">
          <img :src="previewUrl" alt="Preview" style="max-width: 100%; border-radius: 8px;" />
        </div>
        <div v-else-if="previewType === 'video'" class="preview-container">
          <video 
            :src="previewUrl" 
            controls 
            style="max-width: 100%; border-radius: 8px;"
            ref="videoPreview"
          />
        </div>

        <!-- Caption input -->
        <q-input
          v-model="caption"
          placeholder="Add a caption (optional)..."
          outlined
          dense
          class="q-mt-md"
          autofocus
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="grey" @click="resetPreview" />
        <q-btn 
          flat 
          label="Send" 
          color="primary" 
          @click="handleSend"
          :loading="sending"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Notify } from 'quasar'

interface MediaResult {
  file: File
  type: 'image' | 'video'
  caption?: string
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'media-selected': [result: MediaResult]
}>()

const showDialog = ref(props.modelValue)
const showPreview = ref(false)
const previewUrl = ref<string>('')
const previewType = ref<'image' | 'video'>('image')
const selectedFile = ref<File | null>(null)
const caption = ref('')
const sending = ref(false)
const videoPreview = ref<HTMLVideoElement | null>(null)

// Sync with v-model
watch(() => props.modelValue, (val) => {
  showDialog.value = val
})

watch(showDialog, (val) => {
  emit('update:modelValue', val)
})

/**
 * Request camera permissions
 */
const checkPermissions = async (): Promise<boolean> => {
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
 * Convert data URL to File
 */
const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return new File([blob], fileName, { type: blob.type })
}

/**
 * Handle taking a photo with camera
 */
const handleTakePhoto = async () => {
  const hasPermission = await checkPermissions()
  if (!hasPermission) {
    Notify.create({
      type: 'negative',
      message: 'Camera permission denied. Please enable it in settings.',
      position: 'top'
    })
    return
  }

  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      quality: 90,
      allowEditing: false,
      saveToGallery: false
    })

    if (photo.dataUrl) {
      const file = await dataUrlToFile(photo.dataUrl, `photo_${Date.now()}.jpg`)
      selectedFile.value = file
      previewUrl.value = photo.dataUrl
      previewType.value = 'image'
      showPreview.value = true
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
 * Handle recording a video with camera
 */
const handleTakeVideo = async () => {
  const hasPermission = await checkPermissions()
  if (!hasPermission) {
    Notify.create({
      type: 'negative',
      message: 'Camera permission denied. Please enable it in settings.',
      position: 'top'
    })
    return
  }

  // Note: Capacitor Camera plugin doesn't directly support video recording
  // This would need a custom plugin or use the file input approach
  Notify.create({
    type: 'info',
    message: 'Video recording from gallery selection',
    position: 'top'
  })
  
  // Fallback to gallery for video selection
  await handleChooseFromGallery('video')
}

/**
 * Handle choosing from gallery
 */
const handleChooseFromGallery = async (mediaType?: 'image' | 'video') => {
  const hasPermission = await checkPermissions()
  if (!hasPermission) {
    Notify.create({
      type: 'negative',
      message: 'Photo library permission denied. Please enable it in settings.',
      position: 'top'
    })
    return
  }

  try {
    // For images, use Capacitor Camera plugin
    if (!mediaType || mediaType === 'image') {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        quality: 90,
        allowEditing: false
      })

      if (photo.dataUrl) {
        const file = await dataUrlToFile(photo.dataUrl, `photo_${Date.now()}.jpg`)
        selectedFile.value = file
        previewUrl.value = photo.dataUrl
        previewType.value = 'image'
        showPreview.value = true
      }
    } else {
      // For videos, we need to use file input as Capacitor Camera doesn't support video selection
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'video/*'
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          selectedFile.value = file
          previewUrl.value = URL.createObjectURL(file)
          previewType.value = 'video'
          showPreview.value = true
        }
      }
      input.click()
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'message' in err) {
      const errorMessage = (err as { message: string }).message
      if (!errorMessage.includes('cancelled')) {
        Notify.create({
          type: 'negative',
          message: 'Failed to select media',
          position: 'top'
        })
      }
    }
  }
}

/**
 * Handle sending the selected media
 */
const handleSend = () => {
  if (!selectedFile.value) return

  sending.value = true
  emit('media-selected', {
    file: selectedFile.value,
    type: previewType.value,
    caption: caption.value || undefined
  })

  // Reset after a short delay to allow parent to process
  setTimeout(() => {
    resetPreview()
    sending.value = false
  }, 500)
}

/**
 * Reset preview state
 */
const resetPreview = () => {
  showPreview.value = false
  previewUrl.value = ''
  selectedFile.value = null
  caption.value = ''
  previewType.value = 'image'
  
  // Clean up video preview
  if (videoPreview.value) {
    videoPreview.value.pause()
    videoPreview.value.src = ''
  }
}

/**
 * Handle cancel
 */
const onCancel = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background-color: #f5f5f5;
  border-radius: 8px;
}
</style>



