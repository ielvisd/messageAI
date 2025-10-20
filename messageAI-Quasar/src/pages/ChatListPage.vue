<template>
  <q-page>
    <div class="q-pa-md">
      <div class="row items-center q-mb-md">
        <div class="text-h5">Chats</div>
        <q-space />
        <q-btn
          round
          icon="add"
          color="primary"
          @click="showCreateChat = true"
        />
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center q-py-lg">
        <q-spinner-dots size="40px" color="primary" />
        <div class="q-mt-sm">Loading chats...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center q-py-lg">
        <q-icon name="error" size="40px" color="negative" />
        <div class="q-mt-sm text-negative">{{ error }}</div>
        <q-btn
          flat
          color="primary"
          label="Retry"
          @click="loadChats"
          class="q-mt-sm"
        />
      </div>

      <!-- Empty State -->
      <div v-else-if="chats.length === 0" class="text-center q-py-lg">
        <q-icon name="chat" size="60px" color="grey-5" />
        <div class="text-h6 q-mt-sm text-grey-6">No chats yet</div>
        <div class="text-grey-6 q-mb-md">Start a conversation!</div>
        <q-btn
          color="primary"
          label="Create Chat"
          @click="showCreateChat = true"
        />
      </div>

      <!-- Chat List -->
      <q-list v-else>
        <q-item
          v-for="chat in chats"
          :key="chat.id"
          clickable
          @click="selectChat(chat)"
          class="q-py-md"
        >
          <q-item-section avatar>
            <q-avatar
              :color="chat.type === 'group' ? 'primary' : 'secondary'"
              text-color="white"
              :icon="chat.type === 'group' ? 'group' : 'person'"
            >
              <img v-if="chat.type === 'direct' && chat.members[0]?.avatar_url" :src="chat.members[0].avatar_url" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-weight-medium">
              {{ chat.name }}
            </q-item-label>
            <q-item-label caption class="text-grey-6">
              <span v-if="chat.last_message">
                {{ chat.last_message.sender_name }}: {{ chat.last_message.content }}
              </span>
              <span v-else>No messages yet</span>
            </q-item-label>
          </q-item-section>

          <q-item-section side top>
            <div class="text-caption text-grey-5">
              {{ formatTime(chat.last_message?.created_at || chat.updated_at) }}
            </div>
            <q-badge
              v-if="chat.unread_count > 0"
              color="primary"
              :label="chat.unread_count > 99 ? '99+' : chat.unread_count"
              class="q-mt-xs"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <!-- Create Chat Dialog -->
    <q-dialog v-model="showCreateChat">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Create New Chat</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit="handleCreateChat">
            <q-input
              v-model="newChatName"
              label="Chat Name"
              :rules="[val => !!val || 'Name is required']"
              class="q-mb-md"
            />

            <q-select
              v-model="newChatType"
              :options="chatTypeOptions"
              label="Chat Type"
              class="q-mb-md"
            />

            <div class="text-subtitle2 q-mb-sm">Add Members</div>
            <q-input
              v-model="memberEmail"
              label="Member Email"
              @keyup.enter="addMember"
              class="q-mb-sm"
            >
              <template #append>
                <q-btn
                  flat
                  icon="add"
                  @click="addMember"
                  :disable="!memberEmail"
                />
              </template>
            </q-input>

            <div v-if="selectedMembers.length > 0" class="q-mb-md">
              <q-chip
                v-for="member in selectedMembers"
                :key="member.id"
                removable
                @remove="removeMember(member.id)"
                color="primary"
                text-color="white"
              >
                {{ member.name }}
              </q-chip>
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" @click="showCreateChat = false" />
          <q-btn
            color="primary"
            label="Create"
            @click="handleCreateChat"
            :loading="creating"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useChatList, type Chat } from '../composables/useChatList'
import { supabase } from '../boot/supabase'

const router = useRouter()
const $q = useQuasar()
const { chats, loading, error, loadChats, createChat, markAsRead } = useChatList()

// Create chat dialog state
const showCreateChat = ref(false)
const newChatName = ref('')
const newChatType = ref('direct')
const memberEmail = ref('')
const selectedMembers = ref<Array<{ id: string; name: string; email: string }>>([])
const creating = ref(false)

const chatTypeOptions = [
  { label: 'Direct Message', value: 'direct' },
  { label: 'Group Chat', value: 'group' }
]

const selectChat = async (chat: Chat) => {
  // Mark as read
  await markAsRead(chat.id)

  // Navigate to chat
  void router.push(`/chat/${chat.id}`)
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`

  return date.toLocaleDateString()
}

const addMember = async () => {
  if (!memberEmail.value) return

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('email', memberEmail.value)
      .single()

    if (profile) {
      selectedMembers.value.push(profile)
      memberEmail.value = ''
    } else {
      $q.notify({
        type: 'negative',
        message: 'User not found'
      })
    }
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Failed to find user'
    })
  }
}

const removeMember = (memberId: string) => {
  selectedMembers.value = selectedMembers.value.filter(m => m.id !== memberId)
}

const handleCreateChat = async () => {
  if (!newChatName.value) return

  creating.value = true

  try {
    const memberIds = selectedMembers.value.map(m => m.id)
    const chat = await createChat(newChatName.value, newChatType.value as 'direct' | 'group', memberIds)

    if (chat) {
      $q.notify({
        type: 'positive',
        message: 'Chat created successfully!'
      })

      // Reset form
      showCreateChat.value = false
      newChatName.value = ''
      newChatType.value = 'direct'
      selectedMembers.value = []
    }
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Failed to create chat'
    })
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  void loadChats()
})
</script>
