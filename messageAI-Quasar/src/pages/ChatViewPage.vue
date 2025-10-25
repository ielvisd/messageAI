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
      <!-- Media Gallery Button -->
      <q-btn
        flat
        round
        icon="photo_library"
        @click="showMediaGallery = true"
      >
        <q-tooltip>View shared media</q-tooltip>
      </q-btn>
      
      <!-- Chat Menu Button -->
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
    <div v-else class="col column" style="background: #f0f2f5;">
      <div v-if="messages.length > 0" class="col q-pa-md" style="overflow-y: auto;">
        <div
          v-for="(message, index) in formattedMessages"
          :key="index"
          class="q-mb-md"
        >
          <!-- Sent messages (right aligned) -->
          <div v-if="message.sent" class="row justify-end">
            <div style="max-width: 75%;">
              <!-- Media Message -->
              <div v-if="message.messageType === 'image' || message.messageType === 'video'">
                <MediaMessage
                  :message-type="message.messageType"
                  :media-url="message.mediaUrl!"
                  :caption="message.text"
                  :thumbnail-url="message.thumbnailUrl"
                  :duration="message.duration"
                  :is-sent="message.sent"
                />
                <div class="text-caption q-mt-xs text-right text-blue-1">
                  {{ message.timestamp }}
                  
                  <!-- Read Receipt Icons -->
                  <template v-if="message.sent">
                    <q-icon 
                      v-if="message.status === 'sending'" 
                      name="schedule" 
                      size="14px" 
                      class="q-ml-xs"
                    >
                      <q-tooltip>Queued - will send when online</q-tooltip>
                    </q-icon>
                    
                    <q-icon 
                      v-else-if="message.readCount === 0"
                      name="done" 
                      size="14px" 
                      class="q-ml-xs"
                    />
                    
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
                
                <MessageReactions 
                  v-if="message.id && !message.id.startsWith('temp_') && !message.id.startsWith('queued_')"
                  :message-id="message.id"
                />
              </div>
              
              <!-- Text Message -->
              <div v-else>
                <div
                  class="message-bubble"
                  :class="{
                    'bg-primary text-white': message.status === 'sent',
                    'bg-blue-2 text-primary': message.status === 'sending'
                  }"
                  style="border-radius: 18px; padding: 12px 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"
                >
                  <div class="text-body1">{{ message.text }}</div>
                  <div
                    class="text-caption q-mt-xs"
                    :class="message.status === 'sending' ? 'text-primary' : 'text-blue-1'"
                  >
                    {{ message.timestamp }}
                    
                    <!-- Read Receipt Icons -->
                    <q-icon 
                      v-if="message.status === 'sending'" 
                      name="schedule" 
                      size="14px" 
                      class="q-ml-xs"
                    >
                      <q-tooltip>Queued - will send when online</q-tooltip>
                    </q-icon>
                    
                    <q-icon 
                      v-else-if="message.readCount === 0"
                      name="done" 
                      size="14px" 
                      class="q-ml-xs"
                    />
                    
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
                  </div>
                </div>
                
                <MessageReactions 
                  v-if="message.id && !message.id.startsWith('temp_') && !message.id.startsWith('queued_')"
                  :message-id="message.id"
                  class="q-mt-xs"
                />
              </div>
            </div>
          </div>
          
          <!-- Received messages (left aligned with avatar and name) -->
          <div v-else class="row justify-start items-start q-gutter-sm">
            <!-- Avatar -->
            <q-avatar size="40px" color="secondary" text-color="white">
              <img v-if="message.avatar" :src="message.avatar" />
              <span v-else class="text-subtitle2">{{ (message.name || 'U')[0].toUpperCase() }}</span>
            </q-avatar>
            
            <div style="max-width: calc(75% - 48px);">
              <!-- Sender Name (show in group chats) -->
              <div v-if="chatInfo?.type === 'group'" class="text-caption text-grey-7 q-mb-xs q-ml-sm">
                {{ message.name || 'Unknown' }}
              </div>
              
              <!-- Media Message -->
              <div v-if="message.messageType === 'image' || message.messageType === 'video'">
                <MediaMessage
                  :message-type="message.messageType"
                  :media-url="message.mediaUrl!"
                  :caption="message.text"
                  :thumbnail-url="message.thumbnailUrl"
                  :duration="message.duration"
                  :is-sent="message.sent"
                />
                <div class="text-caption q-mt-xs text-grey-6 q-ml-sm">
                  {{ message.timestamp }}
                </div>
                
                <MessageReactions 
                  v-if="message.id && !message.id.startsWith('temp_') && !message.id.startsWith('queued_')"
                  :message-id="message.id"
                />
              </div>
              
              <!-- Text Message -->
              <div v-else>
                <div
                  class="message-bubble bg-grey-2 text-black"
                  style="border-radius: 18px; padding: 12px 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"
                >
                  <div class="text-body1">{{ message.text }}</div>
                  <div class="text-caption q-mt-xs text-grey-6">
                    {{ message.timestamp }}
                  </div>
                </div>
                
                <MessageReactions 
                  v-if="message.id && !message.id.startsWith('temp_') && !message.id.startsWith('queued_')"
                  :message-id="message.id"
                  class="q-mt-xs"
                />
              </div>
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
      <!-- Upload Progress -->
      <q-linear-progress 
        v-if="uploading" 
        :value="uploadProgress.percentage / 100" 
        color="primary" 
        class="q-mb-sm"
      />
      
      <div class="q-pa-md">
        <div class="row items-end q-gutter-sm">
          <!-- Media Attachment Button -->
          <q-btn
            flat
            round
            icon="attach_file"
            color="grey-7"
            @click="showMediaPicker = true"
            :disable="sending || uploading"
          >
            <q-tooltip>Attach photo or video</q-tooltip>
          </q-btn>
          
          <q-input
            v-model="newMessage"
            placeholder="Type a message..."
            outlined
            dense
            class="col"
            @keyup.enter="handleSendMessage"
            :disable="sending || uploading"
          />
          <q-btn
            round
            color="primary"
            icon="send"
            @click="handleSendMessage"
            :loading="sending"
            :disable="!newMessage.trim() || uploading"
          />
        </div>
      </div>
    </div>

    <!-- Media Picker Dialog -->
    <MediaPicker 
      v-model="showMediaPicker"
      @media-selected="handleMediaSelected"
    />

    <!-- Media Gallery Dialog -->
    <MediaGallery 
      v-model="showMediaGallery"
      :chat-id="chatId"
    />

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
              <q-item-section side v-if="member.id !== user?.id">
                <q-btn
                  flat
                  dense
                  round
                  :icon="isBlockedUser(member.id) ? 'check_circle' : 'block'"
                  :color="isBlockedUser(member.id) ? 'positive' : 'negative'"
                  @click="handleBlockToggle(member)"
                >
                  <q-tooltip>{{ isBlockedUser(member.id) ? 'Unblock' : 'Block' }} user</q-tooltip>
                </q-btn>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <!-- Block Action (for direct chats) -->
        <q-card-section v-if="chatInfo?.type === 'direct' && otherUserId">
          <q-separator class="q-mb-md" />
          <q-item
            clickable
            @click="handleBlockToggle(chatInfo.members[0])"
          >
            <q-item-section avatar>
              <q-icon :name="isBlockedUser(otherUserId) ? 'check_circle' : 'block'" :color="isBlockedUser(otherUserId) ? 'positive' : 'negative'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ isBlockedUser(otherUserId) ? 'Unblock User' : 'Block User' }}</q-item-label>
              <q-item-label caption>
                {{ isBlockedUser(otherUserId) ? 'Allow messages from this user' : 'Stop receiving messages from this user' }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" @click="showChatMenu = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useChat, type Message } from '../composables/useChat'
import { usePresence } from '../composables/usePresence'
import { useBlocking } from '../composables/useBlocking'
import { user } from '../state/auth'
import { Notify } from 'quasar'
import MediaPicker from '../components/MediaPicker.vue'
import MediaMessage from '../components/MediaMessage.vue'
import MessageReactions from '../components/MessageReactions.vue'
import MediaGallery from '../components/MediaGallery.vue'

const route = useRoute()
const chatId = route.params.id as string

const {
  messages,
  chatInfo,
  loading,
  error,
  sending,
  uploading,
  uploadProgress,
  isOnline,
  queuedCount,
  loadMessages,
  sendMessage,
  sendMediaMessage,
  markAsRead,
  getReadCount,
  getReadByUsers
} = useChat(chatId)

// Presence system
const { isUserOnline } = usePresence()

// Blocking system
const { isBlockedUser, blockUser, unblockUser } = useBlocking()

const newMessage = ref('')
const showChatMenu = ref(false)
const showMediaPicker = ref(false)
const showMediaGallery = ref(false)

// For direct chats, get the other user's ID
const otherUserId = computed(() => {
  if (chatInfo.value?.type === 'direct' && chatInfo.value.members) {
    const otherMember = chatInfo.value.members.find((m: any) => m.id !== user.value?.id)
    return otherMember?.id || null
  }
  return null
})

// Get last message for smart replies
const lastMessage = computed(() => messages.value[messages.value.length - 1])

const formattedMessages = computed(() => {
  return messages.value.map((msg: Message) => ({
    id: msg.id,
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
    readBy: getReadByUsers(msg),
    messageType: msg.message_type,
    mediaUrl: msg.media_url,
    thumbnailUrl: msg.media_metadata?.thumbnailUrl,
    duration: msg.media_metadata?.duration
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

const handleMediaSelected = async (result: { file: File; type: 'image' | 'video'; caption?: string }) => {
  try {
    await sendMediaMessage(result.file, result.type, result.caption)
    showMediaPicker.value = false
    
    Notify.create({
      type: 'positive',
      message: `${result.type === 'image' ? 'Photo' : 'Video'} sent successfully`,
      position: 'top',
      timeout: 2000
    })
  } catch (err) {
    console.error('Error sending media:', err)
    // Error notification is already shown in sendMediaMessage
  }
}

async function handleBlockToggle(member: any) {
  if (!user.value?.id || !member) return

  const isBlocked = isBlockedUser(member.id)

  try {
    if (isBlocked) {
      await unblockUser(member.id, user.value.id)
      Notify.create({
        type: 'positive',
        message: `${member.name} unblocked`
      })
    } else {
      const confirmed = confirm(`Block ${member.name}? You won't receive messages from this user.`)
      if (!confirmed) return

      await blockUser(member.id, user.value.id)
      Notify.create({
        type: 'positive',
        message: `${member.name} blocked`
      })
    }
    showChatMenu.value = false
  } catch (err) {
    console.error('Error toggling block:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to update block status'
    })
  }
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
  position: relative;
}

/* Improved message bubble for received messages */
.bg-grey-2 {
  background-color: #ffffff !important;
  border: 1px solid #e4e6eb;
}

/* Sent message bubble styling */
.bg-primary {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.sent-media {
  max-width: 70%;
  margin-left: auto;
}
</style>
