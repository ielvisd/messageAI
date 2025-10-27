<template>
  <q-page class="column ai-assistant-page no-padding">
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
              @click="handleMessageClick($event)"
            ></div>
            
            <!-- Suggested Actions -->
            <div v-if="message.suggested_actions && message.suggested_actions.length > 0" class="q-mt-md row q-gutter-sm">
              <q-btn
                v-for="(action, idx) in message.suggested_actions"
                :key="`${index}-action-${idx}`"
                :label="action.label"
                :icon="action.icon"
                :color="getActionColor(action)"
                size="md"
                unelevated
                no-caps
                @click="handleActionClick(action)"
                class="action-button"
                style="min-width: 140px;"
              />
            </div>
            
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
    <div 
      class="q-pa-md input-area" 
      style="background: #1a1a1a; border-top: 2px solid #2d2d2d; padding-bottom: calc(16px + env(safe-area-inset-bottom));"
    >
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
        
        <!-- Voice Button (iOS-optimized) -->
        <q-btn
          v-if="isVoiceSupported"
          round
          :color="isListening ? 'negative' : 'accent'"
          :icon="isListening ? 'mic' : 'mic_none'"
          @click="toggleVoice"
          :disable="loading"
          size="md"
          :class="{ 'pulse-animation': isListening }"
          style="min-width: 44px; min-height: 44px;"
        >
          <q-tooltip>{{ isListening ? 'Listening...' : 'Voice input' }}</q-tooltip>
        </q-btn>
        
        <q-btn
          round
          color="accent"
          icon="send"
          @click="handleSendMessage"
          :loading="loading"
          :disable="!newMessage.trim() || loading"
          size="md"
          class="send-btn"
          style="min-width: 44px; min-height: 44px;"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useGymAI } from '../composables/useGymAI';
import { useVoiceInput } from '../composables/useVoiceInput';
import { profile, user } from '../state/auth';
import { Notify, Dialog } from 'quasar';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { supabase } from '../boot/supabase';
import InstructorDetailsDialog from '../components/InstructorDetailsDialog.vue';
import { useChatList } from '../composables/useChatList';
import { useChatRequests } from '../composables/useChatRequests';

const router = useRouter();
const route = useRoute();
const { createChat } = useChatList();
const { checkExistingChatHistory } = useChatRequests();
const gymId = computed(() => profile.value?.gym_id || null);

const {
  messages,
  loading,
  error,
  conversationId,
  sendMessage,
  initialize,
  executeTool
} = useGymAI();

const { 
  isListening, 
  transcript, 
  isSupported: isVoiceSupported, 
  startListening, 
  stopListening 
} = useVoiceInput();

const newMessage = ref('');

// Watch transcript and update input
watch(transcript, (newValue) => {
  newMessage.value = newValue
});

// Configure marked for secure markdown rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Function to safely render markdown with clickable instructor names
function renderMarkdown(content: string): string {
  let rawHtml = marked.parse(content) as string;
  
  // Convert instructor names to clickable links
  // Pattern: "Coach Ana Rodriguez", "Professor Carlos Martinez", etc.
  rawHtml = rawHtml.replace(
    /(Coach|Professor|Instructor)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
    '<span class="instructor-link" data-instructor="$1 $2">$1 $2</span>'
  );
  
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-instructor']
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

function toggleVoice() {
  if (isListening.value) {
    stopListening();
    // Auto-submit after stopping if there's content
    if (newMessage.value.trim()) {
      setTimeout(() => handleSendMessage(), 500);
    }
  } else {
    newMessage.value = ''; // Clear before starting
    startListening();
  }
}

function startNewConversation() {
  // Clear conversation state temporarily (UI only)
  // Page refresh will reload the last conversation from DB
  // Next message will create a new conversation in DB
  conversationId.value = null;
  messages.value = [];
  
  console.log('🆕 Cleared AI conversation UI (page refresh will restore last conversation)');
  
  Notify.create({
    type: 'positive',
    message: 'Conversation cleared. Refresh to restore, or start chatting fresh.',
    icon: 'chat',
    timeout: 2500
  });
}

// Handle clicks on instructor names in messages
function handleMessageClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  
  if (target.classList.contains('instructor-link')) {
    const instructorName = target.getAttribute('data-instructor');
    if (instructorName) {
      void showInstructorModal(instructorName);
    }
  }
}

// Show instructor quick info modal
async function showInstructorModal(instructorName: string) {
  if (!gymId.value) {
    Notify.create({
      type: 'warning',
      message: 'No gym selected'
    });
    return;
  }

  // Fetch instructor details from database
  const { data: instructor, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, instructor_preferences, avatar_url')
    .ilike('name', instructorName)
    .eq('gym_id', gymId.value)
    .single();
  
  if (error || !instructor) {
    Notify.create({
      type: 'warning',
      message: 'Instructor not found in the system'
    });
    return;
  }
  
  // Show custom dialog component
  Dialog.create({
    component: InstructorDetailsDialog,
    componentProps: {
      instructor
    }
  }).onOk((result: { action: string; instructorId: string }) => {
    // Handle dialog actions
    if (result.action === 'dm') {
      void navigateToDM(result.instructorId);
    } else if (result.action === 'schedule') {
      void viewInstructorSchedule(result.instructorId);
    }
  });
}

// Navigate to DM with instructor
async function navigateToDM(instructorId: string) {
  if (!user.value) {
    Notify.create({
      type: 'warning',
      message: 'Please log in to send messages'
    });
    return;
  }

  try {
    // Check if chat already exists with this instructor
    const hasExistingChat = await checkExistingChatHistory(user.value.id, instructorId);
    
    if (hasExistingChat) {
      // Find the existing chat and navigate to it
      // Only look for direct message chats (not group or gym chats)
      const { data: chats, error } = await supabase
        .from('chat_members')
        .select('chat_id, chats!inner(id, type)')
        .eq('user_id', user.value.id)
        .eq('chats.type', 'direct');
      
      if (error) throw error;
      
      // Find chat where both users are members
      for (const chatMember of chats || []) {
        const { data: members } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('chat_id', chatMember.chat_id);
        
        const memberIds = members?.map(m => m.user_id) || [];
        // Direct chats should have exactly 2 members
        if (memberIds.length === 2 && memberIds.includes(instructorId) && memberIds.includes(user.value.id)) {
          await router.push(`/chat/${chatMember.chat_id}`);
          return;
        }
      }
    }
    
    // No existing chat, create new DM
    const newChat = await createChat('', 'direct', [instructorId]);
    
    if (newChat) {
      Notify.create({
        type: 'positive',
        message: 'Chat created successfully!'
      });
      await router.push(`/chat/${newChat.id}`);
    } else {
      throw new Error('Failed to create chat');
    }
  } catch (error) {
    console.error('Error with DM navigation:', error);
    Notify.create({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Failed to create or open chat'
    });
  }
}

// View instructor's schedule
async function viewInstructorSchedule(instructorId: string) {
  // Navigate to schedule page with instructor filter
  await router.push({
    path: '/schedule',
    query: { instructor: instructorId }
  });
}

// Get color based on action type
function getActionColor(action: any): string {
  // Use different colors for different action types for better visual distinction
  switch (action.type) {
    case 'assign_instructor':
      return 'blue'; // Blue for assignments
    case 'reschedule_class':
      return 'purple'; // Purple for reschedule
    case 'cancel_class':
      return 'deep-orange'; // Deep orange for cancel
    default:
      return action.color || 'primary';
  }
}

// Handle action button clicks - Execute actions directly
async function handleActionClick(action: any) {
  console.log('🎬 Handling action:', action);
  
  switch (action.type) {
    case 'assign_instructor':
      await handleAssignInstructor(action);
      break;
    case 'reschedule_class':
      await handleRescheduleClass(action);
      break;
    case 'cancel_class':
      await handleCancelClass(action);
      break;
    default:
      console.warn('Unknown action type:', action.type);
      return;
  }
}

// Direct action handlers
async function handleAssignInstructor(action: any) {
  if (!gymId.value) return;
  
  // Show confirmation
  Dialog.create({
    title: 'Assign Instructor',
    message: `Assign ${action.params.instructor_name} to ${action.params.class_info}?`,
    cancel: true,
    persistent: false,
    color: 'primary'
  }).onOk(async () => {
    loading.value = true;
    
    try {
      // Call the tool directly
      const result = await executeTool('assign_instructor_to_class', {
        schedule_id: action.params.schedule_id,
        instructor_id: action.params.instructor_id,
        assignment_type: 'recurring_weekly'
      }, gymId.value);
      
      if (result.error) {
        throw new Error(result.message || 'Failed to assign instructor');
      }
      
      // Add success message to chat
      messages.value.push({
        role: 'assistant',
        content: `✅ Successfully assigned **${action.params.instructor_name}** to the ${action.params.class_info} class!`,
        timestamp: new Date().toISOString()
      });
      
      Notify.create({
        type: 'positive',
        message: `Instructor assigned successfully!`,
        icon: 'check_circle'
      });
      
      // Trigger a refresh of AI insights to update alert count
      window.dispatchEvent(new CustomEvent('refresh-ai-insights'));
    } catch (error) {
      console.error('Error assigning instructor:', error);
      
      Notify.create({
        type: 'negative',
        message: error instanceof Error ? error.message : 'Failed to assign instructor',
        icon: 'error'
      });
      
      // Add error message to chat
      messages.value.push({
        role: 'assistant',
        content: `❌ Failed to assign instructor: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      loading.value = false;
    }
  });
}

async function handleRescheduleClass(action: any) {
  // For now, send a prompt to get AI assistance with rescheduling
  newMessage.value = `I want to reschedule the ${action.params.class_info} class to a better time.`;
  await handleSendMessage();
}

async function handleCancelClass(action: any) {
  if (!gymId.value) return;
  
  // Show confirmation with reason input
  Dialog.create({
    title: 'Cancel Class',
    message: `Cancel ${action.params.class_info}?`,
    prompt: {
      model: '',
      type: 'text',
      label: 'Reason for cancellation',
      filled: true
    },
    cancel: true,
    persistent: false,
    color: 'negative'
  }).onOk(async (reason: string) => {
    loading.value = true;
    
    try {
      // Call the cancel tool directly
      const result = await executeTool('cancel_class_with_notification', {
        schedule_id: action.params.schedule_id,
        reason: reason || 'Class cancelled',
        notify_members: true
      }, gymId.value);
      
      if (result.error) {
        throw new Error(result.message || 'Failed to cancel class');
      }
      
      // Add success message to chat
      const affectedCount = result.affected_members || 0;
      messages.value.push({
        role: 'assistant',
        content: `✅ Successfully cancelled the ${action.params.class_info} class. ${affectedCount} member${affectedCount !== 1 ? 's' : ''} ${affectedCount !== 1 ? 'have' : 'has'} been notified.`,
        timestamp: new Date().toISOString()
      });
      
      Notify.create({
        type: 'positive',
        message: 'Class cancelled and members notified',
        icon: 'check_circle'
      });
    } catch (error) {
      console.error('Error cancelling class:', error);
      
      Notify.create({
        type: 'negative',
        message: error instanceof Error ? error.message : 'Failed to cancel class',
        icon: 'error'
      });
      
      // Add error message to chat
      messages.value.push({
        role: 'assistant',
        content: `❌ Failed to cancel class: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      loading.value = false;
    }
  });
}

// Extracted function to handle fresh sessions and alert context
function handleFreshSessionAndAlerts() {
  // Check if we should start a fresh conversation (from alert click only)
  const startFresh = sessionStorage.getItem('ai_start_fresh');
  
  if (startFresh === 'true') {
    // Clear session storage flag (one-time use)
    sessionStorage.removeItem('ai_start_fresh');
    
    // Clear conversation state to start fresh
    // This will force creation of a new conversation on first message
    // The old conversation is already saved in the database
    conversationId.value = null;
    messages.value = [];
    
    console.log('🆕 Starting fresh AI conversation from alert (previous one auto-saved)');
    
    // Initialize preferences only, skip loading conversation history
    if (gymId.value) {
      void initialize(gymId.value, { skipHistory: true });
    }
  } else {
    // Normal flow - always load existing conversation on page load/refresh
    if (gymId.value) {
      void initialize(gymId.value);
    }
  }
  
  // Check if we were navigated here from an alert click
  const alertContext = sessionStorage.getItem('ai_context_alert');
  if (alertContext) {
    try {
      const alert = JSON.parse(alertContext);
      // Clear it immediately so it doesn't re-trigger
      sessionStorage.removeItem('ai_context_alert');
      
      // Pre-fill the message based on the alert
      let suggestedMessage = '';
      
      if (alert.title?.toLowerCase().includes('instructor')) {
        // Include schedule info if available for better AI context
        const scheduleInfo = alert.metadata?.schedule ? 
          ` (Class: ${alert.metadata.schedule.class_type} on ${alert.metadata.schedule.day_of_week} at ${alert.metadata.schedule.start_time})` : 
          '';
        suggestedMessage = `I need help fixing this scheduling issue: ${alert.description}${scheduleInfo}. Can you help me assign an instructor?`;
      } else if (alert.title?.toLowerCase().includes('capacity')) {
        suggestedMessage = `There's a capacity issue: ${alert.description}. What should I do?`;
      } else {
        suggestedMessage = `I need help with this issue: ${alert.title}. ${alert.description}`;
      }
      
      // Auto-send the message after a brief delay so user sees it
      newMessage.value = suggestedMessage;
      setTimeout(() => {
        void handleSendMessage();
      }, 800);
      
      // Show notification
      Notify.create({
        type: 'info',
        message: 'AI is analyzing the problem from the alert...',
        timeout: 2000
      });
    } catch (e) {
      console.error('Error parsing alert context:', e);
    }
  }
}

onMounted(() => {
  handleFreshSessionAndAlerts();
});

// Watch for route changes (when already on the page and query params change)
watch(() => route.query.t, (newVal, oldVal) => {
  if (newVal !== oldVal && newVal) {
    console.log('🔄 Route query changed - checking for fresh session');
    handleFreshSessionAndAlerts();
  }
});
</script>

<style scoped>
/* Override global padding for AI assistant page - needs edge-to-edge layout */
.q-page.no-padding {
  padding: 0 !important;
}

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

/* Voice Input Pulse Animation */
.pulse-animation {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
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

/* Clickable Instructor Names */
.markdown-content :deep(.instructor-link) {
  color: #ff8c00;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.markdown-content :deep(.instructor-link:hover) {
  color: #ffa500;
  text-decoration: none;
  background: rgba(255, 140, 0, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
}

.markdown-content :deep(.instructor-link:active) {
  transform: scale(0.98);
}

/* Action Buttons */
.action-button {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  border-radius: 8px !important;
  letter-spacing: 0.3px;
}

.action-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.35);
}

.action-button:active {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0,0,0,0.3);
}
</style>

