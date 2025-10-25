<template>
  <q-page>
    <div class="q-pa-md">
      <div class="row items-center q-mb-md">
        <div class="text-h5">Messages</div>
        <q-space />
        
        <!-- Action buttons -->
        <q-btn
          v-if="!selectionMode && chats.length > 0"
          flat
          dense
          round
          icon="checklist"
          color="grey"
          @click="toggleSelectionMode"
          class="q-mr-sm"
        >
          <q-tooltip>Select Multiple</q-tooltip>
        </q-btn>
        
        <q-btn
          v-if="!selectionMode && chats.length > 0"
          flat
          dense
          round
          icon="delete_sweep"
          color="negative"
          @click="handleDeleteAll"
          class="q-mr-sm"
        >
          <q-tooltip>Delete All Chats</q-tooltip>
        </q-btn>
        
        <q-btn
          flat
          dense
          round
          icon="info"
          color="grey"
          @click="showDebugInfo = !showDebugInfo"
          class="q-mr-sm"
        >
          <q-tooltip>Toggle Debug Info</q-tooltip>
        </q-btn>
        
        <q-btn
          v-if="!selectionMode"
          round
          icon="add"
          color="primary"
          @click="showCreateChat = true"
          aria-label="Add chat"
        />
      </div>
      
      <!-- Selection Mode Toolbar -->
      <div v-if="selectionMode" class="q-mb-md">
        <q-banner class="bg-blue-1">
          <template #avatar>
            <q-icon name="checklist" color="primary" />
          </template>
          <div class="row items-center">
            <div class="col">
              {{ selectedChats.length }} chat(s) selected
            </div>
            <div class="col-auto">
              <q-btn
                flat
                label="Cancel"
                color="grey"
                @click="toggleSelectionMode"
                class="q-mr-sm"
              />
              <q-btn
                flat
                label="Delete Selected"
                color="negative"
                icon="delete"
                @click="handleDeleteSelected"
                :disable="selectedChats.length === 0"
                :loading="deletingChat"
              />
            </div>
          </div>
        </q-banner>
      </div>

      <!-- Debug Info Panel -->
      <q-card v-if="showDebugInfo" class="q-mb-md bg-blue-1" flat bordered>
        <q-card-section>
          <div class="text-h6 text-primary q-mb-sm">🔍 Debug Info</div>
          <div class="row q-gutter-md">
            <div class="col">
              <div class="text-weight-bold text-green-8">📋 Current User:</div>
              <div class="text-caption">ID: {{ user?.id || 'Not logged in' }}</div>
              <div class="text-caption">Email: {{ profile?.email || user?.email || 'N/A' }}</div>
              <div class="text-caption">Name: {{ profile?.name || 'N/A' }}</div>
            </div>
            <div class="col">
              <div class="text-weight-bold text-blue-8">💬 Chat System Status:</div>
              <div class="text-caption">Auth initialized: {{ authInitialized ? '✅' : '⏳' }}</div>
              <div class="text-caption">Chats loaded: {{ chats.length }}</div>
              <div class="text-caption">Pending requests: {{ pendingRequestsCount }}</div>
              <div class="text-caption">Request errors: {{ requestsError ? 'Yes' : 'None' }}</div>
            </div>
          </div>
          <div class="q-mt-sm">
            <div class="text-weight-bold text-orange-8">⚠️ Instructions:</div>
            <div class="text-caption">
              1. Apply the migration in Supabase Dashboard if you still see 404 errors<br/>
              2. When creating a chat, add another user's email to test requests<br/>
              3. Check the "Requests" tab to see incoming requests
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Tab Navigation -->
      <q-tabs
        v-model="activeTab"
        class="text-grey-6 q-mb-md"
        active-color="primary"
        indicator-color="primary"
        align="left"
        dense
      >
        <q-tab name="chats" label="Chats" />
        <q-tab name="requests" :label="`Requests${pendingRequestsCount > 0 ? ` (${pendingRequestsCount})` : ''}`">
          <q-badge 
            v-if="pendingRequestsCount > 0" 
            color="primary" 
            floating 
            :label="pendingRequestsCount > 99 ? '99+' : pendingRequestsCount"
          />
        </q-tab>
        <q-tab name="sent" :label="`Sent${pendingSentCount > 0 ? ` (${pendingSentCount})` : ''}`">
          <q-badge 
            v-if="pendingSentCount > 0" 
            color="orange" 
            floating 
            :label="pendingSentCount > 99 ? '99+' : pendingSentCount"
          />
        </q-tab>
      </q-tabs>

      <q-tab-panels v-model="activeTab" animated>
        <!-- Chats Tab -->
        <q-tab-panel name="chats" class="q-pa-none">
          <div class="chats-content">

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
        <q-slide-item
          v-for="chat in chats"
          :key="chat.id"
          @right="handleDeleteChat(chat.id)"
          right-color="negative"
        >
          <template #right>
            <q-icon name="delete" />
          </template>
          
          <q-item
            clickable
            @click="selectionMode ? toggleChatSelection(chat.id) : selectChat(chat)"
            class="q-py-md"
          >
            <!-- Checkbox in selection mode -->
            <q-item-section v-if="selectionMode" avatar>
              <q-checkbox
                :model-value="isChatSelected(chat.id)"
                @update:model-value="toggleChatSelection(chat.id)"
                color="primary"
              />
            </q-item-section>
            
            <q-item-section avatar>
              <q-avatar
                :color="chat.type === 'group' ? 'primary' : 'secondary'"
                text-color="white"
                :icon="chat.type === 'group' ? 'group' : 'person'"
              >
                <img v-if="chat.type === 'direct' && chat.members[0]?.avatar_url" :src="chat.members[0].avatar_url" />
                <!-- Online status indicator for direct chats -->
                <q-badge 
                  v-if="chat.type === 'direct' && chat.members[0]"
                  :color="isUserOnline(chat.members[0].id) ? 'positive' : 'grey-5'"
                  floating
                  rounded
                  style="width: 12px; height: 12px; bottom: 2px; right: 2px;"
                >
                  <q-tooltip>{{ isUserOnline(chat.members[0].id) ? 'Online' : 'Offline' }}</q-tooltip>
                </q-badge>
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
            
            <!-- Delete button (visible when not in selection mode) -->
            <q-item-section v-if="!selectionMode" side>
              <q-btn
                flat
                dense
                round
                icon="delete"
                color="negative"
                @click.stop="handleDeleteChat(chat.id)"
                size="sm"
              >
                <q-tooltip>Delete Chat</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-slide-item>
      </q-list>
          </div>
        </q-tab-panel>

        <!-- Requests Tab -->
        <q-tab-panel name="requests" class="q-pa-none">
          <!-- Requests Loading State -->
          <div v-if="requestsLoading" class="text-center q-py-lg">
            <q-spinner-dots size="40px" color="primary" />
            <div class="q-mt-sm">Loading requests...</div>
          </div>

          <!-- Requests Error State -->
          <div v-else-if="requestsError" class="text-center q-py-lg">
            <q-icon name="error" size="40px" color="negative" />
            <div class="q-mt-sm text-negative">{{ requestsError }}</div>
            <q-btn
              flat
              color="primary"
              label="Retry"
              @click="loadRequests"
              class="q-mt-sm"
            />
          </div>

          <!-- Empty Requests State -->
          <div v-else-if="pendingReceivedRequests.length === 0" class="text-center q-py-lg">
            <q-icon name="mail" size="60px" color="grey-5" />
            <div class="text-h6 q-mt-sm text-grey-6">No pending requests</div>
            <div class="text-grey-6">New chat requests will appear here</div>
          </div>

          <!-- Requests List -->
          <q-list v-else>
            <q-item
              v-for="request in pendingReceivedRequests"
              :key="request.id"
              class="q-py-md"
            >
              <q-item-section avatar>
                <q-avatar color="secondary" text-color="white">
                  <img v-if="request.sender?.avatar_url" :src="request.sender.avatar_url" />
                  <q-icon v-else name="person" />
                </q-avatar>
              </q-item-section>

              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ request.sender?.name || request.sender?.email }}
                </q-item-label>
                <q-item-label caption class="text-grey-6 q-mb-xs">
                  wants to start a {{ request.chat_type }} chat: "{{ request.chat_name }}"
                </q-item-label>
                <q-item-label v-if="request.message" caption class="text-grey-7">
                  "{{ request.message }}"
                </q-item-label>
                
                <!-- Action Buttons -->
                <div class="q-mt-sm">
                  <q-btn
                    size="sm"
                    color="positive"
                    label="Accept"
                    @click="handleAcceptRequest(request.id)"
                    :loading="processingRequest === request.id"
                    class="q-mr-sm"
                  />
                  <q-btn
                    size="sm"
                    color="negative"
                    outline
                    label="Decline"
                    @click="handleRejectRequest(request.id)"
                    :loading="processingRequest === request.id"
                  />
                </div>
              </q-item-section>

              <q-item-section side top>
                <div class="text-caption text-grey-5">
                  {{ formatTime(request.created_at) }}
                </div>
                <q-chip
                  size="sm"
                  color="orange"
                  text-color="white"
                  label="pending"
                  class="q-mt-xs"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>

        <!-- Sent Requests Tab -->
        <q-tab-panel name="sent" class="q-pa-none">
          <!-- Sent Requests Loading State -->
          <div v-if="requestsLoading" class="text-center q-py-lg">
            <q-spinner-dots size="40px" color="primary" />
            <div class="q-mt-sm">Loading sent requests...</div>
          </div>

          <!-- Sent Requests Error State -->
          <div v-else-if="requestsError" class="text-center q-py-lg">
            <q-icon name="error" size="40px" color="negative" />
            <div class="q-mt-sm text-negative">{{ requestsError }}</div>
            <q-btn
              flat
              color="primary"
              label="Retry"
              @click="loadRequests"
              class="q-mt-sm"
            />
          </div>

          <!-- Empty Sent Requests State -->
          <div v-else-if="pendingSentRequests.length === 0" class="text-center q-py-lg">
            <q-icon name="send" size="60px" color="grey-5" />
            <div class="text-h6 q-mt-sm text-grey-6">No pending sent requests</div>
            <div class="text-grey-6">Requests you send will appear here</div>
          </div>

          <!-- Sent Requests List -->
          <q-list v-else>
            <q-item
              v-for="request in pendingSentRequests"
              :key="request.id"
              class="q-py-md"
            >
              <q-item-section avatar>
                <q-avatar color="secondary" text-color="white">
                  <img v-if="request.recipient?.avatar_url" :src="request.recipient.avatar_url" />
                  <q-icon v-else name="person" />
                </q-avatar>
              </q-item-section>

              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ request.recipient?.name || request.recipient?.email }}
                </q-item-label>
                <q-item-label caption class="text-grey-6 q-mb-xs">
                  {{ request.chat_type }} chat: "{{ request.chat_name }}"
                </q-item-label>
                <q-item-label v-if="request.message" caption class="text-grey-7">
                  "{{ request.message }}"
                </q-item-label>
              </q-item-section>

              <q-item-section side top>
                <div class="text-caption text-grey-5">
                  {{ formatTime(request.created_at) }}
                </div>
                <q-chip
                  size="sm"
                  color="orange"
                  text-color="white"
                  label="pending"
                  class="q-mt-xs"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-tab-panel>
      </q-tab-panels>
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

            <!-- Dynamic Chat Type Label -->
            <div class="q-mb-md q-pa-sm bg-blue-1 rounded-borders">
              <div class="text-caption text-grey-7">Chat Type</div>
              <div class="text-body1 text-primary">
                <q-icon :name="chatTypeIcon" class="q-mr-xs" />
                {{ chatTypeLabel }}
              </div>
            </div>

            <!-- Initial Message for new conversations -->
            <q-input
              v-if="actualChatType === 'direct' && selectedMemberIds.length === 1"
              v-model="initialMessage"
              label="Initial Message (optional)"
              type="textarea"
              rows="2"
              hint="This message will be sent with your chat request"
              class="q-mb-md"
            />

            <div class="text-subtitle2 q-mb-sm">
              Add Members
              <span class="text-caption text-grey-6"> (Required)</span>
            </div>
            
            <GymMemberSelector
              v-model="selectedMemberIds"
              :gym-id="profile?.gym_id"
              multiple
              label="Select Gym Members"
              hint="Only teens (13+) and adults can use messaging"
              class="q-mb-md"
            />
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useChatList, type Chat } from '../composables/useChatList'
import { useChatRequests } from '../composables/useChatRequests'
import { usePresence } from '../composables/usePresence'
import { supabase } from '../boot/supabase'
import { Notify } from 'quasar'
import { user, profile, authInitialized } from '../state/auth'
import GymMemberSelector from '../components/GymMemberSelector.vue'

const router = useRouter()
const { chats, loading, error, loadChats, createChat, markAsRead, deleteChat, deleteMultipleChats, deleteAllChats } = useChatList()

// Presence system
const { isUserOnline } = usePresence()

// Chat requests composable
const {
  pendingReceivedRequests,
  pendingSentRequests,
  pendingRequestsCount,
  pendingSentCount,
  loading: requestsLoading,
  error: requestsError,
  createChatRequest,
  acceptChatRequest,
  rejectChatRequest,
  loadRequests,
  checkExistingChatHistory
} = useChatRequests({
  onRequestAccepted: (requestId: string, isReceiver: boolean) => {
    void (async () => {
      console.log(`🔔 Request ${requestId} was accepted! IsReceiver: ${isReceiver}`)
      
      // Reload chats to show the new chat
      await loadChats()
    
      // Show notification and switch to chats tab
      if (isReceiver) {
        // We just accepted someone's request
        console.log('✅ You accepted a chat request, new chat created')
        activeTab.value = 'chats'
      } else {
        // Someone accepted our request - show celebration notification!
        Notify.create({
          type: 'positive',
          message: 'Your chat request was accepted! 🎉',
          position: 'top',
          timeout: 3000
        })
        
        // Automatically switch to chats tab to show the new chat
        activeTab.value = 'chats'
      }
    })()
  }
})

// Tab state
const activeTab = ref('chats')
const processingRequest = ref<string | null>(null)

// Debug state  
const showDebugInfo = ref(false)

// Delete/selection state
const selectionMode = ref(false)
const selectedChats = ref<string[]>([])
const deletingChat = ref(false)

// Create chat dialog state
const showCreateChat = ref(false)
const newChatName = ref('')
const initialMessage = ref('')
const selectedMemberIds = ref<string[]>([])
const creating = ref(false)

// Computed properties for smart chat type detection
const chatTypeLabel = computed(() => {
  const count = selectedMemberIds.value.length
  if (count === 0) return 'Select members to start'
  if (count === 1) return 'Direct Message'
  return `Group Chat (${count + 1} members)`
})

const chatTypeIcon = computed(() => {
  const count = selectedMemberIds.value.length
  if (count === 0) return 'question_mark'
  if (count === 1) return 'person'
  return 'group'
})

const actualChatType = computed(() => {
  return selectedMemberIds.value.length === 1 ? 'direct' : 'group'
})

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

// Handle accepting a chat request
const handleAcceptRequest = async (requestId: string) => {
  processingRequest.value = requestId

  try {
    console.log('🎬 handleAcceptRequest called for:', requestId)
    const success = await acceptChatRequest(requestId)
    
    console.log('📊 Accept result:', success)
    
    if (success) {
      console.log('✅ Request accepted successfully')
      Notify.create({
        type: 'positive',
        message: 'Chat request accepted! Chat created successfully.'
      })
      
      // Note: Chat list reload and tab switch are handled by the onRequestAccepted callback
      // which will be triggered automatically
    } else {
      // If not successful, show the error from the composable
      console.error('❌ Accept failed:', requestsError.value)
      Notify.create({
        type: 'negative',
        message: requestsError.value || 'Failed to accept chat request'
      })
    }
  } catch (err) {
    console.error('❌ Exception in handleAcceptRequest:', err)
    Notify.create({
      type: 'negative',
      message: err instanceof Error ? err.message : 'Failed to accept chat request'
    })
  } finally {
    processingRequest.value = null
  }
}

// Handle rejecting a chat request
const handleRejectRequest = async (requestId: string) => {
  processingRequest.value = requestId

  try {
    const success = await rejectChatRequest(requestId)
    
    if (success) {
      Notify.create({
        type: 'positive',
        message: 'Chat request declined'
      })
    }
  } catch {
    Notify.create({
      type: 'negative',
      message: 'Failed to decline chat request'
    })
  } finally {
    processingRequest.value = null
  }
}

const handleCreateChat = async () => {
  if (!newChatName.value) return
  
  // Validation: Need at least one member
  if (selectedMemberIds.value.length === 0) {
    Notify.create({
      type: 'warning',
      message: 'Please add at least one member'
    })
    return
  }

  creating.value = true

  try {
    // Auto-detect chat type based on member count
    const detectedType = actualChatType.value
    
    console.log('🚀 Creating chat:', {
      chatName: newChatName.value,
      detectedType,
      memberCount: selectedMemberIds.value.length,
      memberIds: selectedMemberIds.value,
      currentUser: user.value?.id
    })
    
    // For direct messages with 1 member, check if we should send a request
    if (detectedType === 'direct') {
      const otherUserId = selectedMemberIds.value[0]
      if (!otherUserId) return
      
      console.log('📨 Checking for existing chat history between:', user.value?.id, 'and', otherUserId)
      
      const hasHistory = user.value ? 
        await checkExistingChatHistory(user.value.id, otherUserId) : false
      
      console.log('📋 Has existing chat history:', hasHistory)
      
      if (!hasHistory) {
        console.log('✉️ No history found - sending chat request...')
        // Send chat request for new 1:1 conversation
        const request = await createChatRequest(
          otherUserId,
          newChatName.value,
          initialMessage.value || `Hello! I'd like to start a conversation with you.`
        )
        
        console.log('📬 Chat request result:', request)
        
        if (request) {
          Notify.create({
            type: 'positive',
            message: 'Chat request sent!'
          })
          resetForm()
        } else {
          Notify.create({
            type: 'negative',
            message: 'Failed to send chat request.'
          })
        }
        return
      } else {
        console.log('👥 Existing history found - creating chat directly...')
      }
    }
    
    // For group chats (2+ members) or existing DM history, create directly
    const chat = await createChat(newChatName.value, detectedType, selectedMemberIds.value)

    if (chat) {
      Notify.create({
        type: 'positive',
        message: detectedType === 'group' ? 
          'Group chat created!' : 
          'Chat created successfully!'
      })
      resetForm()
    }
  } catch (err) {
    Notify.create({
      type: 'negative',
      message: err instanceof Error ? err.message : 'Failed to create chat'
    })
  } finally {
    creating.value = false
  }
}

const resetForm = () => {
  showCreateChat.value = false
  newChatName.value = ''
  initialMessage.value = ''
  selectedMemberIds.value = []
}

// Toggle selection mode
const toggleSelectionMode = () => {
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value) {
    selectedChats.value = []
  }
}

// Toggle chat selection
const toggleChatSelection = (chatId: string) => {
  const index = selectedChats.value.indexOf(chatId)
  if (index === -1) {
    selectedChats.value.push(chatId)
  } else {
    selectedChats.value.splice(index, 1)
  }
}

// Check if chat is selected
const isChatSelected = (chatId: string) => {
  return selectedChats.value.includes(chatId)
}

// Delete individual chat
const handleDeleteChat = async (chatId: string) => {
  const confirmed = confirm('Are you sure you want to delete this chat? This cannot be undone.')
  if (!confirmed) return

  deletingChat.value = true
  try {
    const success = await deleteChat(chatId)
    if (success) {
      Notify.create({
        type: 'positive',
        message: 'Chat deleted successfully'
      })
    } else {
      Notify.create({
        type: 'negative',
        message: 'Failed to delete chat'
      })
    }
  } catch (err) {
    Notify.create({
      type: 'negative',
      message: err instanceof Error ? err.message : 'Failed to delete chat'
    })
  } finally {
    deletingChat.value = false
  }
}

// Delete selected chats
const handleDeleteSelected = async () => {
  if (selectedChats.value.length === 0) return

  const confirmed = confirm(`Are you sure you want to delete ${selectedChats.value.length} chat(s)? This cannot be undone.`)
  if (!confirmed) return

  deletingChat.value = true
  try {
    const success = await deleteMultipleChats(selectedChats.value)
    if (success) {
      Notify.create({
        type: 'positive',
        message: `${selectedChats.value.length} chat(s) deleted successfully`
      })
      selectedChats.value = []
      selectionMode.value = false
    } else {
      Notify.create({
        type: 'negative',
        message: 'Failed to delete chats'
      })
    }
  } catch (err) {
    Notify.create({
      type: 'negative',
      message: err instanceof Error ? err.message : 'Failed to delete chats'
    })
  } finally {
    deletingChat.value = false
  }
}

// Delete all chats
const handleDeleteAll = async () => {
  if (chats.value.length === 0) return

  const confirmed = confirm(`⚠️ Are you sure you want to delete ALL ${chats.value.length} chat(s)? This cannot be undone!`)
  if (!confirmed) return

  deletingChat.value = true
  try {
    const success = await deleteAllChats()
    if (success) {
      Notify.create({
        type: 'positive',
        message: 'All chats deleted successfully'
      })
      selectedChats.value = []
      selectionMode.value = false
    } else {
      Notify.create({
        type: 'negative',
        message: 'Failed to delete all chats'
      })
    }
  } catch (err) {
    Notify.create({
      type: 'negative',
      message: err instanceof Error ? err.message : 'Failed to delete all chats'
    })
  } finally {
    deletingChat.value = false
  }
}

onMounted(() => {
  void loadChats()
})
</script>
