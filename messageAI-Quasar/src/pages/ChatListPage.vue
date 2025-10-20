<template>
  <q-page>
    <div class="q-pa-md">
      <div class="text-h5 q-mb-md">Chats</div>
      <q-list>
        <q-item
          v-for="chat in chats"
          :key="chat.id"
          clickable
          @click="$router.push(`/chat/${chat.id}`)"
        >
          <q-item-section avatar>
            <q-avatar>
              <img :src="chat.avatar" />
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ chat.name }}</q-item-label>
            <q-item-label caption>{{ chat.lastMessage }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge v-if="chat.unreadCount" color="primary" :label="chat.unreadCount" />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// Mock data for now
const chats = ref([
  {
    id: '1',
    name: 'John Doe',
    lastMessage: 'Hey, how are you?',
    unreadCount: 2,
    avatar: 'https://via.placeholder.com/40'
  },
  {
    id: '2',
    name: 'Jane Smith',
    lastMessage: 'See you tomorrow!',
    unreadCount: 0,
    avatar: 'https://via.placeholder.com/40'
  }
])
</script>
