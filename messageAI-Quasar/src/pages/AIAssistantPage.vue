<template>
  <q-page class="column ai-assistant-page">
    <!-- Header -->
    <div class="row items-center q-pa-md bg-deep-black text-white shadow-2">
      <q-btn
        flat
        round
        icon="arrow_back"
        color="white"
        @click="$router.back()"
        class="q-mr-sm"
      />
      <q-avatar color="accent" text-color="white" icon="fitness_center" class="q-mr-md" />
      <div class="col">
        <div class="text-h6" style="font-weight: 700;">AI Gym Assistant</div>
        <div class="text-caption text-secondary-light">Ask me about schedules, classes, and RSVPs</div>
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
    <q-banner v-if="!hasStarted" class="bg-dark-gray text-white">
      <template #avatar>
        <q-icon name="info" color="accent" />
      </template>
      <div class="text-body2">
        <strong style="color: #ff8c00;">5 AI Capabilities:</strong>
        <ul class="q-my-sm q-pl-md">
          <li><strong>Conversation History (RAG)</strong>: I remember our past conversations</li>
          <li><strong>User Preferences</strong>: I learn and adapt to your preferences</li>
          <li><strong>Function Calling</strong>: I can check schedules, make RSVPs, and more</li>
          <li><strong>Memory & State</strong>: I maintain context across our interactions</li>
          <li><strong>Error Handling</strong>: I gracefully recover from issues</li>
        </ul>
        <span class="text-secondary-light">Try asking: "What classes are available tomorrow?" or "RSVP me to the next Gi class"</span>
      </div>
    </q-banner>

    <!-- Chat Messages -->
    <div class="col q-pa-md messages-container" style="overflow-y: auto; background: #0d0d0d;">
      <!-- Welcome Message -->
      <div v-if="messages.length === 0" class="column items-center justify-center q-py-xl">
        <q-icon name="fitness_center" size="5em" color="accent" class="q-mb-md" />
        <div class="text-h5 text-center text-white" style="font-weight: 700;">Ready to Train?</div>
        <div class="text-body1 text-center text-secondary-light q-mt-sm" style="max-width: 450px; line-height: 1.6;">
          I can help you find classes, make RSVPs, check your schedule, and answer questions about the gym.
        </div>
        <div class="q-mt-lg q-gutter-sm">
          <q-chip
            v-for="suggestion in quickSuggestions"
            :key="suggestion"
            clickable
            color="accent"
            text-color="white"
            @click="sendQuickMessage(suggestion)"
            class="suggestion-chip"
          >
            {{ suggestion }}
          </q-chip>
        </div>
      </div>

      <!-- Message List -->
      <div v-for="(message, index) in messages" :key="index" class="q-mb-lg">
        <div
          class="row"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="message-bubble"
            :class="{
              'user-message': message.role === 'user',
              'assistant-message': message.role === 'assistant'
            }"
            style="max-width: 80%; border-radius: 12px; padding: 14px 18px;"
          >
            <!-- User messages: plain text -->
            <div v-if="message.role === 'user'" class="text-body1" style="white-space: pre-wrap; line-height: 1.6; font-size: 15px;">
              {{ message.content }}
            </div>
            <!-- Assistant messages: rendered markdown -->
            <div 
              v-else 
              class="markdown-content text-body1" 
              style="line-height: 1.7; font-size: 15px;"
              v-html="renderMarkdown(message.content)"
            ></div>
            <div
              class="text-caption q-mt-xs"
              :class="message.role === 'user' ? 'timestamp-user' : 'timestamp-assistant'"
            >
              {{ formatTime(message.timestamp) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div v-if="loading" class="row justify-start q-mb-lg">
        <div class="bg-surface" style="border-radius: 12px; padding: 14px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
          <q-spinner-dots color="accent" size="30px" />
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="row justify-center q-mb-md">
        <q-banner class="bg-negative text-white" rounded style="box-shadow: 0 2px 8px rgba(255,59,59,0.3);">
          <template #avatar>
            <q-icon name="error" />
          </template>
          {{ error }}
        </q-banner>
      </div>
    </div>

    <!-- Input Area -->
    <div class="q-pa-md input-area" style="background: #1a1a1a; border-top: 2px solid #2d2d2d;">
      <!-- Suggestions -->
      <div v-if="messages.length > 0" class="q-mb-sm">
        <q-chip
          v-for="suggestion in contextualSuggestions"
          :key="suggestion"
          clickable
          size="sm"
          outline
          color="accent"
          text-color="white"
          @click="sendQuickMessage(suggestion)"
          class="suggestion-chip-small"
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
          dark
          color="accent"
          class="col input-field"
          :rows="1"
          @keydown.enter.exact.prevent="handleSendMessage"
          :disable="loading"
          bg-color="dark-gray"
          input-style="color: white; font-size: 15px;"
        />
        <q-btn
          round
          color="accent"
          icon="send"
          @click="handleSendMessage"
          :loading="loading"
          :disable="!newMessage.trim() || loading"
          size="md"
          class="send-btn"
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
import { marked } from 'marked';
import DOMPurify from 'dompurify';

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

// Configure marked for secure markdown rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Function to safely render markdown
function renderMarkdown(content: string): string {
  const rawHtml = marked.parse(content) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
}

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
/* Page Background */
.ai-assistant-page {
  background: #0d0d0d;
}

/* Message Bubbles */
.message-bubble {
  word-wrap: break-word;
  word-break: break-word;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  transition: all 0.2s ease;
}

.user-message {
  background: linear-gradient(135deg, #ff8c00 0%, #e67700 100%);
  color: white;
  font-weight: 500;
}

.assistant-message {
  background: #262626;
  color: white;
  border: 1px solid #333;
}

.timestamp-user {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}

.timestamp-assistant {
  color: #b0b0b0;
  font-size: 12px;
}

/* Markdown Content Styling */
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  color: #ff8c00;
  margin-top: 12px;
  margin-bottom: 8px;
  font-weight: 700;
}

.markdown-content :deep(h1) { font-size: 1.5em; }
.markdown-content :deep(h2) { font-size: 1.3em; }
.markdown-content :deep(h3) { font-size: 1.15em; }

.markdown-content :deep(p) {
  margin-bottom: 8px;
  color: white;
}

.markdown-content :deep(strong) {
  font-weight: 700;
  color: #ff8c00;
}

.markdown-content :deep(em) {
  font-style: italic;
  color: #b0b0b0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-left: 20px;
  margin-bottom: 8px;
  color: white;
}

.markdown-content :deep(li) {
  margin-bottom: 4px;
  line-height: 1.6;
}

.markdown-content :deep(code) {
  background: #1a1a1a;
  color: #00d084;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background: #1a1a1a;
  border: 1px solid #2d2d2d;
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  margin: 8px 0;
}

.markdown-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-content :deep(a) {
  color: #ff8c00;
  text-decoration: underline;
}

.markdown-content :deep(a:hover) {
  color: #ffa500;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #ff8c00;
  padding-left: 12px;
  margin: 8px 0;
  color: #b0b0b0;
  font-style: italic;
}

/* Suggestion Chips */
.suggestion-chip {
  font-weight: 600;
  transition: all 0.2s ease;
}

.suggestion-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
}

.suggestion-chip-small {
  font-weight: 500;
  transition: all 0.2s ease;
}

.suggestion-chip-small:hover {
  transform: translateY(-1px);
}

/* Input Area */
.input-area {
  box-shadow: 0 -4px 12px rgba(0,0,0,0.4);
}

.input-field :deep(.q-field__control) {
  background: #2d2d2d !important;
}

.input-field :deep(.q-field__native) {
  color: white !important;
}

.input-field :deep(.q-placeholder) {
  color: #b0b0b0 !important;
}

.send-btn {
  transition: all 0.2s ease;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.4);
}

/* Messages Container */
.messages-container {
  scrollbar-width: thin;
  scrollbar-color: #2d2d2d #0d0d0d;
}

.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: #0d0d0d;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #2d2d2d;
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #3d3d3d;
}
</style>

