<template>
  <div class="media-message" :class="{ 'sent': isSent }">
    <!-- Image Message -->
    <div v-if="messageType === 'image'" class="media-container" @click="openLightbox">
      <q-skeleton v-if="loading" type="rect" height="200px" />
      <img
        v-else
        :src="mediaUrl"
        :alt="caption || 'Image'"
        class="media-image"
        @load="onMediaLoad"
        @error="onMediaError"
      />
      <div v-if="failed" class="media-error">
        <q-icon name="broken_image" size="48px" color="grey-5" />
        <div class="text-caption text-grey-6 q-mt-sm">Failed to load image</div>
      </div>
    </div>

    <!-- Video Message -->
    <div v-else-if="messageType === 'video'" class="media-container" @click="openLightbox">
      <q-skeleton v-if="loading" type="rect" height="200px" />
      <div v-else class="video-wrapper">
        <video
          :src="mediaUrl"
          :poster="thumbnailUrl"
          class="media-video"
          @loadeddata="onMediaLoad"
          @error="onMediaError"
        />
        <div class="video-overlay">
          <q-icon name="play_circle" size="64px" color="white" />
        </div>
        <div v-if="duration" class="video-duration">
          {{ formatDuration(duration) }}
        </div>
      </div>
      <div v-if="failed" class="media-error">
        <q-icon name="videocam_off" size="48px" color="grey-5" />
        <div class="text-caption text-grey-6 q-mt-sm">Failed to load video</div>
      </div>
    </div>

    <!-- Caption -->
    <div v-if="caption" class="media-caption q-mt-xs">
      {{ caption }}
    </div>

    <!-- Lightbox Dialog -->
    <q-dialog v-model="showLightbox" maximized>
      <q-card class="bg-black">
        <q-bar class="bg-transparent text-white">
          <q-space />
          <q-btn flat dense icon="close" @click="closeLightbox" />
        </q-bar>

        <q-card-section class="flex flex-center full-height q-pa-none">
          <!-- Image Lightbox -->
          <img
            v-if="messageType === 'image'"
            :src="mediaUrl"
            alt="Full size"
            style="max-width: 100%; max-height: 90vh; object-fit: contain;"
          />

          <!-- Video Lightbox -->
          <video
            v-else-if="messageType === 'video'"
            :src="mediaUrl"
            controls
            autoplay
            style="max-width: 100%; max-height: 90vh;"
            ref="lightboxVideo"
          />
        </q-card-section>

        <!-- Caption in lightbox -->
        <q-card-section v-if="caption" class="text-white text-center">
          {{ caption }}
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

interface Props {
  messageType: 'image' | 'video' | 'file'
  mediaUrl: string
  caption?: string
  thumbnailUrl?: string
  duration?: number
  isSent?: boolean
}

const props = defineProps<Props>()

const loading = ref(true)
const failed = ref(false)
const showLightbox = ref(false)
const lightboxVideo = ref<HTMLVideoElement | null>(null)

/**
 * Handle media load success
 */
const onMediaLoad = () => {
  loading.value = false
  failed.value = false
}

/**
 * Handle media load error
 */
const onMediaError = () => {
  loading.value = false
  failed.value = true
}

/**
 * Open lightbox for full-screen view
 */
const openLightbox = () => {
  if (!failed.value) {
    showLightbox.value = true
  }
}

/**
 * Close lightbox
 */
const closeLightbox = () => {
  showLightbox.value = false
  // Pause video when closing lightbox
  if (lightboxVideo.value) {
    lightboxVideo.value.pause()
  }
}

/**
 * Format video duration (seconds to mm:ss)
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Cleanup
onBeforeUnmount(() => {
  if (lightboxVideo.value) {
    lightboxVideo.value.pause()
    lightboxVideo.value.src = ''
  }
})
</script>

<style scoped>
.media-message {
  max-width: 70%;
  margin-bottom: 8px;
}

.media-message.sent {
  margin-left: auto;
}

.media-container {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background-color: #f5f5f5;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.media-image {
  width: 100%;
  max-width: 100%;
  display: block;
  border-radius: 12px;
}

.media-video {
  width: 100%;
  max-width: 100%;
  display: block;
  border-radius: 12px;
}

.video-wrapper {
  position: relative;
  width: 100%;
}

.video-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0.9;
}

.video-duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.media-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  min-height: 150px;
}

.media-caption {
  font-size: 14px;
  padding: 4px 8px;
  word-wrap: break-word;
}
</style>



