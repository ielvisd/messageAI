<template>
  <q-dialog v-model="showDialog" maximized @hide="onClose">
    <q-card>
      <q-bar class="bg-primary text-white">
        <q-icon name="photo_library" />
        <div class="text-h6 q-ml-sm">Media Gallery</div>
        <q-space />
        <q-btn flat dense icon="close" @click="showDialog = false" />
      </q-bar>

      <q-card-section class="q-pa-none">
        <!-- Filter Tabs -->
        <q-tabs
          v-model="activeTab"
          dense
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="left"
        >
          <q-tab name="all" label="All Media" />
          <q-tab name="photos" label="Photos" />
          <q-tab name="videos" label="Videos" />
        </q-tabs>

        <q-separator />

        <!-- Loading State -->
        <div v-if="loading" class="flex flex-center q-pa-xl">
          <q-spinner-dots size="40px" color="primary" />
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredMedia.length === 0" class="column items-center justify-center q-pa-xl">
          <q-icon name="photo_library" size="80px" color="grey-5" />
          <div class="text-h6 text-grey-6 q-mt-md">No media shared yet</div>
          <div class="text-caption text-grey-6">Photos and videos will appear here</div>
        </div>

        <!-- Media Grid -->
        <div v-else class="media-grid q-pa-md">
          <div
            v-for="(item, index) in filteredMedia"
            :key="item.id"
            class="media-item"
            @click="openLightbox(index)"
          >
            <!-- Image Thumbnail -->
            <img
              v-if="item.type === 'image'"
              :src="item.url"
              :alt="`Media ${index + 1}`"
              class="media-thumbnail"
            />

            <!-- Video Thumbnail -->
            <div v-else-if="item.type === 'video'" class="media-thumbnail video-thumbnail">
              <img v-if="item.thumbnailUrl" :src="item.thumbnailUrl" alt="Video thumbnail" />
              <div v-else class="video-placeholder">
                <q-icon name="videocam" size="48px" color="white" />
              </div>
              <div class="video-overlay">
                <q-icon name="play_circle" size="48px" color="white" />
              </div>
              <div v-if="item.duration" class="video-duration-badge">
                {{ formatDuration(item.duration) }}
              </div>
            </div>

            <!-- Date Badge -->
            <div class="date-badge">
              {{ formatDate(item.createdAt) }}
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- Lightbox for Full View -->
      <q-dialog v-model="showLightbox" maximized @hide="closeLightbox">
        <q-card class="bg-black">
          <q-bar class="bg-transparent text-white">
            <q-btn flat dense icon="arrow_back" @click="previousMedia" v-if="filteredMedia.length > 1" />
            <q-space />
            <div class="text-body1">{{ currentIndex + 1 }} / {{ filteredMedia.length }}</div>
            <q-space />
            <q-btn flat dense icon="arrow_forward" @click="nextMedia" v-if="filteredMedia.length > 1" />
            <q-btn flat dense icon="close" @click="closeLightbox" />
          </q-bar>

          <q-card-section class="flex flex-center full-height q-pa-none">
            <div v-if="currentMedia" class="lightbox-content">
              <!-- Image -->
              <img
                v-if="currentMedia.type === 'image'"
                :src="currentMedia.url"
                alt="Full size"
                class="lightbox-media"
              />

              <!-- Video -->
              <video
                v-else-if="currentMedia.type === 'video'"
                :src="currentMedia.url"
                controls
                autoplay
                class="lightbox-media"
                ref="lightboxVideo"
              />

              <!-- Caption -->
              <div v-if="currentMedia.caption" class="text-white text-center q-mt-md">
                {{ currentMedia.caption }}
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-dialog>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { supabase } from '../boot/supabase'

interface MediaItem {
  id: string
  url: string
  type: 'image' | 'video'
  thumbnailUrl?: string
  duration?: number
  caption?: string
  createdAt: string
}

const props = defineProps<{
  modelValue: boolean
  chatId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const showDialog = ref(props.modelValue)
const loading = ref(false)
const mediaItems = ref<MediaItem[]>([])
const activeTab = ref('all')
const showLightbox = ref(false)
const currentIndex = ref(0)
const lightboxVideo = ref<HTMLVideoElement | null>(null)

// Sync with v-model
watch(() => props.modelValue, (val) => {
  showDialog.value = val
  if (val) {
    void loadMedia()
  }
})

watch(showDialog, (val) => {
  emit('update:modelValue', val)
})

// Filter media based on active tab
const filteredMedia = computed(() => {
  if (activeTab.value === 'all') {
    return mediaItems.value
  } else if (activeTab.value === 'photos') {
    return mediaItems.value.filter(item => item.type === 'image')
  } else {
    return mediaItems.value.filter(item => item.type === 'video')
  }
})

// Current media item in lightbox
const currentMedia = computed(() => {
  return filteredMedia.value[currentIndex.value] || null
})

/**
 * Load all media messages from the chat
 */
const loadMedia = async () => {
  loading.value = true

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, media_url, message_type, content, media_metadata, created_at')
      .eq('chat_id', props.chatId)
      .in('message_type', ['image', 'video'])
      .order('created_at', { ascending: false })

    if (error) throw error

    mediaItems.value = data.map((msg: any) => ({
      id: msg.id,
      url: msg.media_url,
      type: msg.message_type as 'image' | 'video',
      thumbnailUrl: msg.media_metadata?.thumbnailUrl,
      duration: msg.media_metadata?.duration,
      caption: msg.content,
      createdAt: msg.created_at
    }))
  } catch (err) {
    console.error('Error loading media:', err)
  } finally {
    loading.value = false
  }
}

/**
 * Open lightbox at specific index
 */
const openLightbox = (index: number) => {
  currentIndex.value = index
  showLightbox.value = true
}

/**
 * Close lightbox
 */
const closeLightbox = () => {
  showLightbox.value = false
  if (lightboxVideo.value) {
    lightboxVideo.value.pause()
  }
}

/**
 * Navigate to previous media
 */
const previousMedia = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  } else {
    currentIndex.value = filteredMedia.value.length - 1
  }
}

/**
 * Navigate to next media
 */
const nextMedia = () => {
  if (currentIndex.value < filteredMedia.value.length - 1) {
    currentIndex.value++
  } else {
    currentIndex.value = 0
  }
}

/**
 * Format duration (seconds to mm:ss)
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format date
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}

const onClose = () => {
  emit('update:modelValue', false)
}

// Load media on mount if dialog is open
onMounted(() => {
  if (props.modelValue) {
    void loadMedia()
  }
})

// Cleanup
onBeforeUnmount(() => {
  if (lightboxVideo.value) {
    lightboxVideo.value.pause()
    lightboxVideo.value.src = ''
  }
})
</script>

<style scoped>
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
}

.media-item {
  position: relative;
  aspect-ratio: 1;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.media-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.media-item:hover .media-thumbnail {
  transform: scale(1.05);
}

.video-thumbnail {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
}

.video-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #333;
}

.video-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.9;
  pointer-events: none;
}

.video-duration-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.date-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.lightbox-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  max-height: 100%;
  padding: 16px;
}

.lightbox-media {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
}
</style>



