<template>
  <div v-if="replies.length > 0" class="q-pa-sm">
    <div class="text-caption text-grey-7 q-mb-xs">💡 Suggested replies:</div>
    <div class="row q-gutter-xs">
      <q-chip
        v-for="(reply, index) in replies"
        :key="index"
        clickable
        color="primary"
        text-color="white"
        @click="selectReply(reply)"
      >
        {{ reply }}
      </q-chip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGymAI } from '../composables/useGymAI'
import { user } from '../state/auth'
import type { Message } from '../composables/useChat'

const props = defineProps<{
  lastMessage?: Message | undefined
}>()

const emit = defineEmits<{
  (e: 'reply-selected', text: string): void
}>()

const { generateReplies } = useGymAI()
const replies = ref<string[]>([])

watch(() => props.lastMessage, async (newMessage) => {
  if (!newMessage || newMessage.sender_id === user.value?.id) {
    replies.value = []
    return
  }
  
  // Generate suggestions for incoming messages
  const suggestions = await generateReplies(newMessage.content, newMessage.category)
  replies.value = suggestions
}, { immediate: true })

const selectReply = (reply: string) => {
  emit('reply-selected', reply)
  replies.value = [] // Clear after selection
}
</script>

