<template>
  <q-dialog v-model="showDialog" @hide="onClose">
    <q-card style="min-width: 300px; max-width: 400px">
      <q-card-section>
        <div class="text-h6">React with emoji</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <!-- Quick Reactions (Most Common) -->
        <div class="text-subtitle2 text-grey-7 q-mb-sm">Quick reactions</div>
        <div class="row q-gutter-sm q-mb-md">
          <q-btn
            v-for="emoji in quickEmojis"
            :key="emoji"
            flat
            round
            size="lg"
            class="emoji-btn"
            @click="handleEmojiSelect(emoji)"
          >
            <span class="emoji-large">{{ emoji }}</span>
          </q-btn>
        </div>

        <q-separator class="q-my-md" />

        <!-- Gym/Fitness Themed Emojis -->
        <div class="text-subtitle2 text-grey-7 q-mb-sm">Fitness</div>
        <div class="row q-gutter-sm q-mb-md">
          <q-btn
            v-for="emoji in fitnessEmojis"
            :key="emoji"
            flat
            round
            size="md"
            class="emoji-btn"
            @click="handleEmojiSelect(emoji)"
          >
            <span class="emoji-medium">{{ emoji }}</span>
          </q-btn>
        </div>

        <q-separator class="q-my-md" />

        <!-- All Other Emojis -->
        <div class="text-subtitle2 text-grey-7 q-mb-sm">More reactions</div>
        <div class="emoji-grid">
          <q-btn
            v-for="emoji in allEmojis"
            :key="emoji"
            flat
            dense
            class="emoji-btn-small"
            @click="handleEmojiSelect(emoji)"
          >
            <span class="emoji-small">{{ emoji }}</span>
          </q-btn>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="grey" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'emoji-selected': [emoji: string]
}>()

const showDialog = ref(props.modelValue)

// Sync with v-model
watch(() => props.modelValue, (val) => {
  showDialog.value = val
})

watch(showDialog, (val) => {
  emit('update:modelValue', val)
})

// Quick reactions (most commonly used)
const quickEmojis = ['👍', '❤️', '😂', '🔥', '👏', '🎉']

// Gym/Fitness themed emojis
const fitnessEmojis = ['💪', '🏋️', '🥋', '🤸', '🏃', '⚡', '🥇', '🎯']

// All other emojis
const allEmojis = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😊',
  '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
  '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
  '🤨', '🧐', '🤓', '😎', '🥳', '🤩', '🥺', '😢',
  '😭', '😤', '😠', '😡', '🤬', '😱', '😨', '😰',
  '👋', '🤚', '✋', '🖐️', '👌', '🤌', '🤏', '✌️',
  '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕',
  '👇', '☝️', '👊', '✊', '🤛', '🤜', '👏', '🙌',
  '🫶', '💝', '💖', '💗', '💓', '💞', '💕', '💟',
  '❣️', '💔', '❤️‍🔥', '❤️‍🩹', '💯', '🔥', '✨', '⭐',
  '🌟', '💫', '🎊', '🎉', '🎈', '🎁', '🏆', '🥇'
]

const handleEmojiSelect = (emoji: string) => {
  emit('emoji-selected', emoji)
  showDialog.value = false
}

const onClose = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.emoji-btn {
  min-width: 48px;
  min-height: 48px;
}

.emoji-btn-small {
  min-width: 40px;
  min-height: 40px;
  padding: 4px;
}

.emoji-large {
  font-size: 32px;
  line-height: 1;
}

.emoji-medium {
  font-size: 28px;
  line-height: 1;
}

.emoji-small {
  font-size: 24px;
  line-height: 1;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
}
</style>



