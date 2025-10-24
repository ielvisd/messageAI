<template>
  <q-page class="column">
    <!-- Header -->
    <div class="row items-center q-pa-md bg-primary text-white shadow-1">
      <q-btn
        flat
        round
        icon="arrow_back"
        color="white"
        @click="$router.back()"
        class="q-mr-sm"
      />
      <q-avatar color="white" text-color="primary" icon="smart_toy" class="q-mr-md" />
      <div class="col">
        <div class="text-h6">AI Gym Assistant</div>
        <div class="text-caption">Ask me about schedules, classes, and RSVPs</div>
      </div>
      <q-btn
        flat
        round
        icon="refresh"
        color="white"
        @click="startNewConversation"
      >
        <q-tooltip>Start new conversation</q-tooltip>
      </q-btn>
    </div>

    <!-- Info Banner -->
    <q-banner v-if="!hasStarted" class="bg-blue-1">
      <template #avatar>
        <q-icon name="info" color="primary" />
      </template>
      <div class="text-body2">
        <strong>5 AI Capabilities:</strong>
        <ul class="q-my-sm q-pl-md">
          <li><strong>Conversation History (RAG)</strong>: I remember our past conversations</li>
          <li><strong>User Preferences</strong>: I learn and adapt to your preferences</li>
          <li><strong>Function Calling</strong>: I can check schedules, make RSVPs, and more</li>
          <li><strong>Memory & State</strong>: I maintain context across our interactions</li>
          <li><strong>Error Handling</strong>: I gracefully recover from issues</li>
        </ul>
        Try asking: "What classes are available tomorrow?" or "RSVP me to the next Gi class"
      </div>
    </q-banner>

    <!-- Chat Messages -->
    <div class="col q-pa-md" style="overflow-y: auto; background: #f5f5f5;">
      <!-- Welcome Message -->
      <div v-if="messages.length === 0" class="column items-center justify-center q-py-xl">
        <q-icon name="smart_toy" size="4em" color="primary" class="q-mb-md" />
        <div class="text-h6 text-center">Hi! I'm your AI Gym Assistant</div>
        <div class="text-body2 text-center text-grey-7 q-mt-sm" style="max-width: 400px;">
          I can help you find classes, make RSVPs, check your schedule, and answer questions about the gym.
        </div>
        <div class="q-mt-lg q-gutter-sm">
          <q-chip
            v-for="suggestion in quickSuggestions"
            :key="suggestion"
            clickable
            color="primary"
            text-color="white"
            @click="sendQuickMessage(suggestion)"
          >
            {{ suggestion }}
          </q-chip>
        </div>
      </div>

      <!-- Message List -->
      <div v-for="(message, index) in messages" :key="index" class="q-mb-md">
        <div
          class="row"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="message-bubble"
            :class="{
              'bg-primary text-white': message.role === 'user',
              'bg-white text-black': message.role === 'assistant'
            }"
            style="max-width: 75%; border-radius: 18px; padding: 12px 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
          >
            <div class="text-body2" style="white-space: pre-wrap;">{{ message.content }}</div>
            <div
              class="text-caption q-mt-xs"
              :class="message.role === 'user' ? 'text-white' : 'text-grey-6'"
            >
              {{ formatTime(message.timestamp) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div v-if="loading" class="row justify-start q-mb-md">
        <div class="bg-white" style="border-radius: 18px; padding: 12px 16px;">
          <q-spinner-dots color="primary" size="30px" />
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="row justify-center q-mb-md">
        <q-banner class="bg-negative text-white" rounded>
          <template #avatar>
            <q-icon name="error" />
          </template>
          {{ error }}
        </q-banner>
      </div>
    </div>

    <!-- Input Area -->
    <div class="q-pa-md bg-white shadow-up">
      <!-- Suggestions -->
      <div v-if="messages.length > 0" class="q-mb-sm">
        <q-chip
          v-for="suggestion in contextualSuggestions"
          :key="suggestion"
          clickable
          size="sm"
          outline
          color="primary"
          @click="sendQuickMessage(suggestion)"
        >
          {{ suggestion }}
        </q-chip>
      </div>

      <div class="row items-end q-gutter-sm">
        <q-input
          v-model="newMessage"
          placeholder="Ask me anything about classes and schedules..."
          type="textarea"
          autogrow
          outlined
          class="col"
          :rows="1"
          @keydown.enter.exact.prevent="handleSendMessage"
          :disable="loading"
        />
        <q-btn
          round
          color="primary"
          icon="send"
          @click="handleSendMessage"
          :loading="loading"
          :disable="!newMessage.trim() || loading"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGymAI } from '../composables/useGymAI';
import { profile } from '../state/auth';
import { Notify } from 'quasar';

const gymId = computed(() => profile.value?.gym_id || null);

const {
  messages,
  loading,
  error,
  sendMessage,
  initialize
} = useGymAI();

const newMessage = ref('');
const hasStarted = ref(false);

const quickSuggestions = [
  "What classes are available today?",
  "Show me tomorrow's schedule",
  "What are my upcoming RSVPs?"
];

const contextualSuggestions = computed(() => {
  const lastMessage = messages.value[messages.value.length - 1];
  if (!lastMessage || lastMessage.role !== 'assistant') return [];

  // Generate contextual suggestions based on conversation
  if (lastMessage.content.toLowerCase().includes('schedule') || lastMessage.content.toLowerCase().includes('class')) {
    return ["RSVP me to a class", "What's the capacity?", "Cancel my RSVP"];
  }
  if (lastMessage.content.toLowerCase().includes('rsvp')) {
    return ["Show my schedule", "What other classes are available?"];
  }
  return ["Tell me more", "What else is available?"];
});

function formatTime(timestamp: string | undefined) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function handleSendMessage() {
  if (!newMessage.value.trim() || loading.value) return;

  // Check if user has a gym
  if (!gymId.value) {
    Notify.create({
      type: 'warning',
      message: 'Please join a gym first to use the AI Assistant'
    });
    return;
  }

  const messageText = newMessage.value.trim();
  newMessage.value = '';
  hasStarted.value = true;

  try {
    await sendMessage(messageText, gymId.value);
  } catch {
    Notify.create({
      type: 'negative',
      message: 'Failed to send message. Please try again.'
    });
  }
}

async function sendQuickMessage(message: string) {
  newMessage.value = message;
  await handleSendMessage();
}

function startNewConversation() {
  messages.value = [];
  hasStarted.value = false;
  Notify.create({
    type: 'info',
    message: 'Started new conversation'
  });
}

onMounted(() => {
  if (gymId.value) {
    void initialize(gymId.value);
  }
});
</script>

<style scoped>
.message-bubble {
  word-wrap: break-word;
  word-break: break-word;
}

.shadow-up {
  box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
}
</style>

