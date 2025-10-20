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
        icon="more_vert"
        @click="showChatMenu = true"
      />
    </div>

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
      <q-chat
        v-if="messages.length > 0"
        :messages="formattedMessages"
        :sent="isMessageSent"
        :text-color="getMessageTextColor"
        :bg-color="getMessageBgColor"
        class="col"
      />
      
      <!-- Empty State -->
      <div v-else class="column items-center justify-center q-py-xl">
        <q-icon name="chat" size="60px" color="grey-5" />
        <div class="text-h6 q-mt-sm text-grey-6">No messages yet</div>
        <div class="text-grey-6">Start the conversation!</div>
      </div>
    </div>

    <!-- Message Input -->
    <div class="q-pa-md bg-white shadow-1">
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
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useChat, type Message } from '../composables/useChat'
import { user } from '../state/auth'

const route = useRoute()
const $q = useQuasar()
const chatId = route.params.id as string

const { 
  messages, 
  chatInfo, 
  loading, 
  error, 
  sending, 
  loadMessages, 
  sendMessage, 
  markAsRead 
} = useChat(chatId)

const newMessage = ref('')
const showChatMenu = ref(false)

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
    status: msg.status
  }))
})

const isMessageSent = (message: { sent: boolean }) => {
  return message.sent
}

const getMessageTextColor = (message: { sent: boolean }) => {
  return message.sent ? 'white' : 'black'
}

const getMessageBgColor = (message: { sent: boolean }) => {
  return message.sent ? 'primary' : 'grey-3'
}

const handleSendMessage = async () => {
  if (!newMessage.value.trim() || sending.value) return

  const messageText = newMessage.value
  newMessage.value = ''

  try {
    await sendMessage(messageText)
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Failed to send message'
    })
    // Restore message on error
    newMessage.value = messageText
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
.q-chat {
  height: 100%;
  overflow-y: auto;
}
</style>