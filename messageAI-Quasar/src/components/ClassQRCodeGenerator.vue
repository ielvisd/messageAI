<template>
  <q-card>
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">Class Check-In QR Code</div>
      <q-space />
      <q-btn icon="close" flat round dense @click="$emit('close')" />
    </q-card-section>

    <q-card-section v-if="!qrData && !loading">
      <div class="text-body2 q-mb-md">
        Generate a QR code for students to check in to this class.
      </div>
      <q-btn
        color="primary"
        label="Generate QR Code"
        icon="qr_code"
        @click="handleGenerate"
        :disable="loading"
        class="full-width"
      />
    </q-card-section>

    <q-card-section v-if="loading" class="text-center">
      <q-spinner color="primary" size="50px" />
      <div class="q-mt-md">Generating QR code...</div>
    </q-card-section>

    <q-card-section v-if="qrData" class="column items-center">
      <!-- QR Code Display -->
      <img 
        :src="qrData.qrDataURL" 
        alt="Check-in QR Code"
        style="width: 100%; max-width: 400px;"
      />

      <!-- Class Details -->
      <div class="q-mt-md full-width">
        <q-chip color="primary" text-color="white" icon="event">
          {{ qrData.classDetails.classType }}
        </q-chip>
        <q-chip color="secondary" text-color="white" icon="schedule">
          {{ formatTime(qrData.classDetails.startTime) }} - {{ formatTime(qrData.classDetails.endTime) }}
        </q-chip>
      </div>

      <!-- Expiration Info -->
      <q-banner class="bg-info text-white q-mt-md full-width" rounded>
        <template #avatar>
          <q-icon name="timer" />
        </template>
        <div class="text-caption">
          Expires at {{ formatDateTime(qrData.expiresAt) }}
        </div>
      </q-banner>

      <!-- Actions -->
      <div class="row q-gutter-sm q-mt-md full-width">
        <q-btn
          outline
          color="primary"
          label="Regenerate"
          icon="refresh"
          @click="handleGenerate"
          class="col"
        />
        <q-btn
          outline
          color="secondary"
          label="Full Screen"
          icon="fullscreen"
          @click="showFullScreen"
          class="col"
        />
      </div>
    </q-card-section>

    <!-- Full Screen QR Dialog -->
    <q-dialog v-model="fullScreenDialog" maximized>
      <q-card class="bg-white column items-center justify-center">
        <q-card-section class="col column items-center justify-center">
          <img 
            :src="qrData?.qrDataURL" 
            alt="Check-in QR Code"
            style="width: 90vmin; height: 90vmin; max-width: 600px; max-height: 600px;"
          />
          <div class="text-h4 q-mt-lg text-center">
            Scan to Check In
          </div>
          <div class="text-h6 text-grey-7 q-mt-sm">
            {{ qrData?.classDetails.classType }}
          </div>
        </q-card-section>
        <q-card-actions>
          <q-btn 
            flat 
            color="primary" 
            label="Close" 
            icon="close"
            size="lg"
            @click="fullScreenDialog = false" 
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAttendance } from '../composables/useAttendance'
import { Notify } from 'quasar'

const props = defineProps<{
  scheduleId: string
  validDate?: Date
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'generated', qrToken: string): void
}>()

const { loading, generateClassQR } = useAttendance()

const qrData = ref<{
  qrDataURL: string
  qrToken: string
  expiresAt: string
  classDetails: {
    classType: string
    startTime: string
    endTime: string
  }
} | null>(null)

const fullScreenDialog = ref(false)

async function handleGenerate() {
  try {
    const result = await generateClassQR(props.scheduleId, props.validDate)
    qrData.value = result
    emit('generated', result.qrToken)
    
    Notify.create({
      type: 'positive',
      message: 'QR code generated successfully!',
      caption: 'Students can now scan to check in'
    })
  } catch (err) {
    Notify.create({
      type: 'negative',
      message: 'Failed to generate QR code',
      caption: (err as Error).message
    })
  }
}

function formatTime(time: string): string {
  // time is in HH:MM:SS format
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

function showFullScreen() {
  fullScreenDialog.value = true
}
</script>

