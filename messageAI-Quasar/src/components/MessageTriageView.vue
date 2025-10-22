<template>
  <q-card class="full-height">
    <q-card-section>
      <div class="text-h5">📥 Triage Inbox</div>
      <div class="text-caption text-grey-7">AI-categorized messages</div>
    </q-card-section>

    <q-separator />

    <q-card-section class="q-pa-none" style="max-height: 70vh; overflow-y: auto;">
      <q-list>
        <!-- Urgent messages -->
        <q-expansion-item
          v-if="urgentMessages.length > 0"
          expand-separator
          icon="warning"
          label="Urgent"
          :caption="`${urgentMessages.length} items`"
          header-class="bg-red-1"
          default-opened
        >
          <q-card>
            <q-list>
              <q-item 
                v-for="msg in urgentMessages" 
                :key="msg.id"
                clickable
                @click="openMessage(msg)"
              >
                <q-item-section avatar>
                  <q-avatar color="red" text-color="white" icon="priority_high" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ msg.sender_name }}</q-item-label>
                  <q-item-label caption lines="2">{{ msg.content }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn flat dense round icon="more_vert" @click.stop>
                    <q-menu>
                      <q-list>
                        <q-item clickable @click="quickReply(msg)">
                          <q-item-section>Quick Reply</q-item-section>
                        </q-item>
                        <q-item clickable @click="delegate(msg)">
                          <q-item-section>Delegate</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </q-expansion-item>
        
        <!-- Schedule questions (auto-answerable) -->
        <q-expansion-item
          v-if="scheduleQuestions.length > 0"
          expand-separator
          icon="schedule"
          label="Schedule Questions"
          :caption="`${scheduleQuestions.length} items - AI can answer`"
        >
          <q-card>
            <q-list>
              <q-item v-for="msg in scheduleQuestions" :key="msg.id">
                <q-item-section avatar>
                  <q-avatar color="blue" text-color="white" icon="calendar_today" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ msg.sender_name }}</q-item-label>
                  <q-item-label caption>{{ msg.content }}</q-item-label>
                  <q-item-label caption class="text-positive q-mt-xs">
                    ✨ Suggested: {{ msg.suggested_reply || 'Generating...' }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn 
                    size="sm" 
                    color="primary" 
                    label="Send" 
                    @click="sendSuggested(msg)"
                    :disable="!msg.suggested_reply"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </q-expansion-item>

        <!-- Private lesson requests -->
        <q-expansion-item
          v-if="privateLessonRequests.length > 0"
          expand-separator
          icon="person"
          label="Private Lesson Requests"
          :caption="`${privateLessonRequests.length} items`"
        >
          <q-card>
            <q-list>
              <q-item v-for="msg in privateLessonRequests" :key="msg.id" clickable @click="openMessage(msg)">
                <q-item-section avatar>
                  <q-avatar color="purple" text-color="white" icon="fitness_center" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ msg.sender_name }}</q-item-label>
                  <q-item-label caption lines="2">{{ msg.content }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </q-expansion-item>

        <!-- Billing questions -->
        <q-expansion-item
          v-if="billingQuestions.length > 0"
          expand-separator
          icon="attach_money"
          label="Billing Questions"
          :caption="`${billingQuestions.length} items`"
        >
          <q-card>
            <q-list>
              <q-item v-for="msg in billingQuestions" :key="msg.id" clickable @click="openMessage(msg)">
                <q-item-section avatar>
                  <q-avatar color="green" text-color="white" icon="credit_card" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ msg.sender_name }}</q-item-label>
                  <q-item-label caption lines="2">{{ msg.content }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </q-expansion-item>

        <!-- General messages -->
        <q-expansion-item
          v-if="generalMessages.length > 0"
          expand-separator
          icon="chat"
          label="General"
          :caption="`${generalMessages.length} items`"
        >
          <q-card>
            <q-list>
              <q-item v-for="msg in generalMessages" :key="msg.id" clickable @click="openMessage(msg)">
                <q-item-section avatar>
                  <q-avatar color="grey" text-color="white" icon="chat_bubble" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ msg.sender_name }}</q-item-label>
                  <q-item-label caption lines="2">{{ msg.content }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </q-expansion-item>

        <q-item v-if="allMessages.length === 0">
          <q-item-section>
            <q-item-label class="text-center text-grey-7">
              No messages to triage 🎉
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'
import { Notify } from 'quasar'

interface TriageMessage {
  id: string
  chat_id: string
  sender_id: string
  sender_name: string
  content: string
  category?: string
  suggested_reply?: string
  created_at: string
}

const router = useRouter()
const allMessages = ref<TriageMessage[]>([])

const urgentMessages = computed(() => 
  allMessages.value.filter(m => m.category === 'urgent' || m.category === 'injury')
)

const scheduleQuestions = computed(() =>
  allMessages.value.filter(m => m.category === 'schedule_question')
)

const privateLessonRequests = computed(() =>
  allMessages.value.filter(m => m.category === 'private_lesson')
)

const billingQuestions = computed(() =>
  allMessages.value.filter(m => m.category === 'billing')
)

const generalMessages = computed(() =>
  allMessages.value.filter(m => !m.category || m.category === 'general')
)

const loadMessages = async () => {
  // Load recent messages that need triage across all chats the user is in
  const { data: chatMembers } = await supabase
    .from('chat_members')
    .select('chat_id')
    .eq('user_id', user.value?.id)

  if (!chatMembers || chatMembers.length === 0) return

  const chatIds = chatMembers.map(cm => cm.chat_id)

  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      chat_id,
      sender_id,
      content,
      category,
      created_at,
      profiles!inner (name, email)
    `)
    .in('chat_id', chatIds)
    .neq('sender_id', user.value?.id) // Don't show own messages
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (!error && data) {
    allMessages.value = data.map((msg: any) => ({
      id: msg.id,
      chat_id: msg.chat_id,
      sender_id: msg.sender_id,
      sender_name: msg.profiles.name,
      content: msg.content,
      category: msg.category,
      created_at: msg.created_at
    }))
  }
}

const openMessage = (msg: TriageMessage) => {
  void router.push(`/chat/${msg.chat_id}`)
}

const sendSuggested = async (msg: TriageMessage) => {
  if (!msg.suggested_reply) return

  const { error } = await supabase.from('messages').insert({
    chat_id: msg.chat_id,
    sender_id: user.value?.id,
    content: msg.suggested_reply
  })

  if (error) {
    Notify.create({
      type: 'negative',
      message: 'Failed to send message'
    })
    return
  }
  
  // Remove from list
  allMessages.value = allMessages.value.filter(m => m.id !== msg.id)
  
  Notify.create({
    type: 'positive',
    message: 'Reply sent!'
  })
}

const quickReply = (msg: TriageMessage) => {
  // For now, just navigate to the chat
  void router.push(`/chat/${msg.chat_id}`)
}

const delegate = (msg: TriageMessage) => {
  // Future feature: delegate to staff member
  Notify.create({
    type: 'info',
    message: 'Delegation feature coming soon!'
  })
}

onMounted(() => {
  void loadMessages()
})
</script>

