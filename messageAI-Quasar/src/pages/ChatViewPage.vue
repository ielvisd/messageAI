<template>
  <q-page class="column">
    <!-- Chat Header -->
    <div class="row items-center q-pa-md bg-white shadow-1">
      <q-btn
        flat
        round
        icon="arrow_back"
        @click="$router.back()"
        class="q-mr-sm"
      />
      <q-avatar
        :color="chatInfo?.type === 'group' ? 'primary' : 'secondary'"
        text-color="white"
        :icon="chatInfo?.type === 'group' ? 'group' : 'person'"
        class="q-mr-md"
      >
        <img v-if="chatInfo?.type === 'direct' && chatInfo.members[0]?.avatar_url" :src="chatInfo.members[0].avatar_url" />
        <!-- Online status indicator -->
        <q-badge 
          v-if="chatInfo?.type === 'direct' && chatInfo.members[0]"
          :color="isUserOnline(chatInfo.members[0].id) ? 'positive' : 'grey-5'"
          floating
          rounded
          style="width: 12px; height: 12px; bottom: 2px; right: 2px;"
        >
          <q-tooltip>{{ isUserOnline(chatInfo.members[0].id) ? 'Online' : 'Offline' }}</q-tooltip>
        </q-badge>
      </q-avatar>
      <div class="col">
        <div class="text-h6">{{ chatInfo?.name || 'Loading...' }}</div>
        <div class="text-caption text-grey-6">
          <span v-if="chatInfo?.type === 'direct' && chatInfo.members[0]">
            {{ chatInfo.members[0].name }}
          </span>
          <span v-else-if="chatInfo?.type === 'group'">
            {{ chatInfo.members.length }} members
          </span>
        </div>
      </div>
      <q-btn
        flat
        round
        icon="smart_toy"
        @click="showScheduleQuery = true"
      >
        <q-tooltip>Ask AI about schedules</q-tooltip>
      </q-btn>
      <q-btn
        flat
        round
        icon="more_vert"
        @click="showChatMenu = true"
      />
    </div>

    <!-- Offline Banner -->
    <q-banner v-if="!isOnline" class="bg-orange text-white">
      <template #avatar>
        <q-icon name="cloud_off" />
      </template>
      <span v-if="queuedCount > 0">
        Offline - {{ queuedCount }} message{{ queuedCount > 1 ? 's' : '' }} queued
      </span>
      <span v-else>
        Offline - messages will be queued
      </span>
    </q-banner>

    <!-- Loading State -->
    <div v-if="loading" class="column items-center justify-center q-py-xl">
      <q-spinner-dots size="40px" color="primary" />
      <div class="q-mt-sm">Loading messages...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="column items-center justify-center q-py-xl">
      <q-icon name="error" size="40px" color="negative" />
      <div class="q-mt-sm text-negative">{{ error }}</div>
      <q-btn
        flat
        color="primary"
        label="Retry"
        @click="loadMessages"
        class="q-mt-sm"
      />
    </div>

    <!-- Chat Messages -->
    <div v-else class="col column">
      <div v-if="messages.length > 0" class="col q-pa-md" style="overflow-y: auto;">
        <div
          v-for="(message, index) in formattedMessages"
          :key="index"
          class="q-mb-md"
          :class="{ 'row justify-end': message.sent, 'row justify-start': !message.sent }"
        >
          <div
            class="message-bubble"
            :class="{
              'bg-primary text-white': message.sent && message.status === 'sent',
              'bg-blue-2 text-primary': message.sent && message.status === 'sending',
              'bg-grey-3 text-black': !message.sent
            }"
            style="max-width: 70%; border-radius: 18px; padding: 12px 16px;"
          >
            <div class="text-body2">{{ message.text }}</div>
            <div
              class="text-caption q-mt-xs"
              :class="message.sent ? (message.status === 'sending' ? 'text-primary' : 'text-blue-1') : 'text-grey-6'"
            >
              {{ message.timestamp }}
              
              <!-- Read Receipt Icons (for sent messages) -->
              <template v-if="message.sent">
                <!-- Queued/sending -->
                <q-icon 
                  v-if="message.status === 'sending'" 
                  name="schedule" 
                  size="14px" 
                  class="q-ml-xs"
                >
                  <q-tooltip>Queued - will send when online</q-tooltip>
                </q-icon>
                
                <!-- Single checkmark: sent -->
                <q-icon 
                  v-else-if="message.readCount === 0"
                  name="done" 
                  size="14px" 
                  class="q-ml-xs"
                />
                
                <!-- Blue double checkmark: read -->
                <q-icon 
                  v-else
                  name="done_all" 
                  size="14px" 
                  color="blue" 
                  class="q-ml-xs"
                >
                  <q-tooltip v-if="chatInfo?.type === 'group' && message.readCount > 0">
                    Read by {{ message.readCount }}<br/>{{ message.readBy.join(', ') }}
                  </q-tooltip>
                  <q-tooltip v-else>
                    Read
                  </q-tooltip>
                </q-icon>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="column items-center justify-center q-py-xl">
        <q-icon name="chat" size="60px" color="grey-5" />
        <div class="text-h6 q-mt-sm text-grey-6">No messages yet</div>
        <div class="text-grey-6">Start the conversation!</div>
      </div>
    </div>

    <!-- Message Input -->
    <div class="bg-white shadow-1">
      <!-- Smart Reply Chips -->
      <SmartReplyChips 
        :last-message="lastMessage" 
        @reply-selected="handleSmartReply"
      />
      
      <div class="q-pa-md">
        <div class="row items-end q-gutter-sm">
          <q-input
            v-model="newMessage"
            placeholder="Type a message..."
            outlined
            dense
            class="col"
            @keyup.enter="handleSendMessage"
            :disable="sending"
          />
          <q-btn
            round
            color="primary"
            icon="send"
            @click="handleSendMessage"
            :loading="sending"
            :disable="!newMessage.trim()"
          />
        </div>
      </div>
    </div>

    <!-- Chat Menu Dialog -->
    <q-dialog v-model="showChatMenu">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">{{ chatInfo?.name }}</div>
          <div class="text-caption text-grey-6">
            {{ chatInfo?.type === 'group' ? 'Group Chat' : 'Direct Message' }}
          </div>
        </q-card-section>

        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Members</div>
          <q-list>
            <q-item
              v-for="member in chatInfo?.members"
              :key="member.id"
              class="q-pa-sm"
            >
              <q-item-section avatar>
                <q-avatar>
                  <img v-if="member.avatar_url" :src="member.avatar_url" />
                  <q-icon v-else name="person" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ member.name }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" @click="showChatMenu = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Schedule Query Dialog -->
    <ScheduleQueryDialog v-model="showScheduleQuery" />
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useChat, type Message } from '../composables/useChat'
import { usePresence } from '../composables/usePresence'
import { user } from '../state/auth'
import { Notify } from 'quasar'
import ScheduleQueryDialog from '../components/ScheduleQueryDialog.vue'
import SmartReplyChips from '../components/SmartReplyChips.vue'

const route = useRoute()
const chatId = route.params.id as string

const {
  messages,
  chatInfo,
  loading,
  error,
  sending,
  isOnline,
  queuedCount,
  loadMessages,
  sendMessage,
  markAsRead,
  getReadCount,
  getReadByUsers
} = useChat(chatId)

// Presence system
const { isUserOnline } = usePresence()

const newMessage = ref('')
const showChatMenu = ref(false)
const showScheduleQuery = ref(false)

// Get last message for smart replies
const lastMessage = computed(() => messages.value[messages.value.length - 1])

const formattedMessages = computed(() => {
  return messages.value.map((msg: Message) => ({
    text: msg.content,
    sent: msg.sender_id === user.value?.id,
    timestamp: new Date(msg.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }),
    name: msg.sender_name,
    avatar: msg.sender_avatar,
    status: msg.status,
    readCount: getReadCount(msg),
    readBy: getReadByUsers(msg)
  }))
})


const handleSendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return

  const messageText = newMessage.value
  newMessage.value = ''

  try {
    await sendMessage(messageText)
  } catch {
    Notify.create({
      type: 'negative',
      message: 'Failed to send message'
    })
    // Restore message on error
    newMessage.value = messageText
  }
}

const handleSmartReply = (text: string) => {
  newMessage.value = text
  // User can edit before sending or just tap send
}

// Mark messages as read when component is visible
onMounted(() => {
  void markAsRead()
})

// Watch for new messages and mark as read
watch(messages, () => {
  void markAsRead()
}, { deep: true })
</script>

<style scoped>
.message-bubble {
  word-wrap: break-word;
  word-break: break-word;
}
</style>
