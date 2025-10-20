<template>
  <q-page class="column">
    <div class="q-pa-md">
      <div class="text-h6 q-mb-md">Chat View</div>
      <div class="chat-messages q-mb-md">
        <div
          v-for="message in messages"
          :key="message.id"
          class="q-mb-sm"
          :class="message.sent ? 'text-right' : 'text-left'"
        >
          <q-bubble
            :sent="message.sent"
            :color="message.sent ? 'primary' : 'grey-5'"
          >
            {{ message.text }}
          </q-bubble>
        </div>
      </div>
      <q-input
        v-model="newMessage"
        placeholder="Type a message..."
        @keyup.enter="sendMessage"
      >
        <template #append>
          <q-btn
            flat
            round
            icon="send"
            @click="sendMessage"
          />
        </template>
      </q-input>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const newMessage = ref('')

// Mock data for now
const messages = ref([
  {
    id: '1',
    text: 'Hello! How are you?',
    sent: false,
    timestamp: new Date()
  },
  {
    id: '2',
    text: 'I\'m doing great, thanks!',
    sent: true,
    timestamp: new Date()
  }
])

const sendMessage = () => {
  if (newMessage.value.trim()) {
    messages.value.push({
      id: Date.now().toString(),
      text: newMessage.value,
      sent: true,
      timestamp: new Date()
    })
    newMessage.value = ''
  }
}
</script>
