<template>
  <q-page class="column items-center justify-center q-pa-md">
    <div class="text-h5 q-mb-md">Scan QR to Check In</div>

    <!-- Camera Scanner -->
    <div v-if="!checkedIn" class="scanner-container">
      <div v-if="!cameraActive" class="column items-center justify-center" style="height: 400px;">
        <q-icon name="qr_code_scanner" size="100px" color="grey-5" />
        <q-btn
          color="primary"
          label="Start Scanner"
          icon="camera_alt"
          @click="startScanner"
          class="q-mt-md"
          size="lg"
        />
      </div>

      <div v-if="cameraActive" class="camera-view">
        <video ref="videoElement" autoplay playsinline style="width: 100%; max-width: 500px; border-radius: 8px;"></video>
        <div class="scanner-overlay">
          <div class="scanner-frame"></div>
        </div>
        <q-btn
          round
          color="negative"
          icon="close"
          @click="stopScanner"
          class="q-mt-md"
        />
      </div>

      <q-banner v-if="scanning" class="bg-info text-white q-mt-md" rounded>
        <template #avatar>
          <q-spinner color="white" />
        </template>
        Scanning for QR code...
      </q-banner>
    </div>

    <!-- Success View -->
    <div v-if="checkedIn && checkInDetails" class="column items-center q-mt-lg">
      <q-icon name="check_circle" size="100px" color="positive" />
      
      <div class="text-h5 q-mt-md text-positive">
        Checked In Successfully!
      </div>

      <q-card class="q-mt-md" style="min-width: 300px;">
        <q-card-section>
          <div class="text-subtitle1 text-weight-bold">{{ checkInDetails.classType }}</div>
          <div class="text-caption text-grey-7 q-mt-xs">
            {{ formatTime(checkInDetails.startTime) }} - {{ formatTime(checkInDetails.endTime) }}
          </div>
          <q-separator class="q-my-sm" />
          <div v-if="checkInDetails.level" class="text-body2">
            <strong>Level:</strong> {{ checkInDetails.level }}
          </div>
          <div v-if="checkInDetails.instructorName" class="text-body2">
            <strong>Instructor:</strong> {{ checkInDetails.instructorName }}
          </div>
          <div class="text-body2 q-mt-sm">
            <strong>Check-in Time:</strong> {{ formatDateTime(checkInDetails.checkInTime) }}
          </div>
        </q-card-section>
        <q-card-actions align="center">
          <q-btn
            flat
            color="primary"
            label="Done"
            @click="$router.push('/student/dashboard')"
          />
        </q-card-actions>
      </q-card>
    </div>

    <!-- Error Display -->
    <q-banner v-if="errorMessage" class="bg-negative text-white q-mt-md" rounded>
      <template #avatar>
        <q-icon name="error" />
      </template>
      {{ errorMessage }}
      <template #action>
        <q-btn flat label="Try Again" @click="resetScanner" />
      </template>
    </q-banner>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAttendance } from '../composables/useAttendance'
import { Notify } from 'quasar'
import jsQR from 'jsqr'

const { checkInViaQR } = useAttendance()

const cameraActive = ref(false)
const scanning = ref(false)
const checkedIn = ref(false)
const errorMessage = ref<string | null>(null)
const checkInDetails = ref<any>(null)

const videoElement = ref<HTMLVideoElement | null>(null)
let mediaStream: MediaStream | null = null
let scanInterval: number | null = null

async function startScanner() {
  try {
    errorMessage.value = null
    cameraActive.value = true

    // Request camera access
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' } // Use back camera on mobile
    })

    if (videoElement.value) {
      videoElement.value.srcObject = mediaStream
      scanning.value = true
      startScanning()
    }
  } catch (err) {
    console.error('Camera error:', err)
    errorMessage.value = 'Unable to access camera. Please check permissions.'
    cameraActive.value = false
  }
}

function startScanning() {
  scanInterval = window.setInterval(() => {
    if (videoElement.value && videoElement.value.readyState === videoElement.value.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) return

      canvas.width = videoElement.value.videoWidth
      canvas.height = videoElement.value.videoHeight
      context.drawImage(videoElement.value, 0, 0, canvas.width, canvas.height)

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        handleQRCodeDetected(code.data)
      }
    }
  }, 300) // Scan every 300ms
}

async function handleQRCodeDetected(qrData: string) {
  // Stop scanning to prevent multiple check-ins
  stopScanner()
  scanning.value = false

  try {
    // Extract QR token from URL
    const url = new URL(qrData)
    const pathParts = url.hash.split('/')
    const qrToken = pathParts[pathParts.length - 1]

    if (!qrToken || !qrToken.startsWith('class_')) {
      throw new Error('Invalid QR code. Please scan a class check-in QR code.')
    }

    // Check in
    const result = await checkInViaQR(qrToken)
    checkInDetails.value = result
    checkedIn.value = true

    const extras: string[] = []
    if (result && (result as any).had_rsvp === false) extras.push('no RSVP')
    if (result && (result as any).was_full_at_checkin === true) extras.push('class full')
    const suffix = extras.length ? ` (${extras.join(', ')})` : ''
    Notify.create({
      type: 'positive',
      message: `Checked in to ${result.classType}!${suffix}`,
      position: 'top'
    })
  } catch (err) {
    console.error('Check-in error:', err)
    const error = err as Error
    
    if (error.message.includes('expired')) {
      errorMessage.value = 'This QR code has expired. Please ask the instructor for a new one.'
    } else if (error.message.includes('already checked in')) {
      errorMessage.value = 'You have already checked in to this class today.'
    } else if (error.message.includes('invalid')) {
      errorMessage.value = 'Invalid QR code. Please scan the correct class check-in QR code.'
    } else {
      errorMessage.value = 'Check-in failed. Please try again or contact the instructor.'
    }

    Notify.create({
      type: 'negative',
      message: errorMessage.value
    })
  }
}

function stopScanner() {
  cameraActive.value = false
  scanning.value = false

  if (scanInterval) {
    clearInterval(scanInterval)
    scanInterval = null
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop())
    mediaStream = null
  }

  if (videoElement.value) {
    videoElement.value.srcObject = null
  }
}

function resetScanner() {
  errorMessage.value = null
  checkedIn.value = false
  checkInDetails.value = null
  startScanner()
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

function formatDateTime(dateTimeString: string): string {
  const date = new Date(dateTimeString)
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onBeforeUnmount(() => {
  stopScanner()
})
</script>

<style scoped>
.scanner-container {
  width: 100%;
  max-width: 500px;
}

.camera-view {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.scanner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.scanner-frame {
  width: 250px;
  height: 250px;
  border: 3px solid #fff;
  border-radius: 16px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
}
</style>

