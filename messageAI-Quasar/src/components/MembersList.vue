<template>
  <div>
    <div class="row items-center q-mb-md">
      <div class="text-h6">Gym Members</div>
      <q-space />
      <q-btn
        icon="person_add"
        label="Invite"
        color="primary"
        @click="$emit('invite')"
      />
    </div>

    <!-- Role Filter Tabs -->
    <q-tabs
      v-model="roleFilter"
      dense
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="left"
    >
      <q-tab name="all" label="All" />
      <q-tab name="instructor" label="Instructors" />
      <q-tab name="student" label="Students" />
      <q-tab name="parent" label="Parents" />
    </q-tabs>

    <q-separator class="q-mb-md" />

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Members List -->
    <q-list v-else bordered separator>
      <q-item v-for="member in filteredMembers" :key="member.id">
        <q-item-section avatar>
          <q-avatar :color="getRoleColor(member.role)" text-color="white">
            {{ getInitials(member.name) }}
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label>{{ member.name }}</q-item-label>
          <q-item-label caption>{{ member.email }}</q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-badge :color="getRoleColor(member.role)">
            {{ member.role?.toUpperCase() }}
          </q-badge>
        </q-item-section>

        <q-item-section side>
          <div class="row q-gutter-xs">
            <q-btn
              flat
              round
              dense
              icon="chat"
              color="primary"
              @click="startChat(member)"
            >
              <q-tooltip>Message</q-tooltip>
            </q-btn>
            <q-btn
              v-if="member.role === 'instructor'"
              flat
              round
              dense
              icon="schedule"
              color="primary"
              @click="viewSchedule(member)"
            >
              <q-tooltip>View Classes</q-tooltip>
            </q-btn>
          </div>
        </q-item-section>
      </q-item>

      <!-- Empty State -->
      <q-item v-if="filteredMembers.length === 0">
        <q-item-section class="text-center text-grey-6">
          No members found
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '../boot/supabase';
import { useChatRequests } from '../composables/useChatRequests';
import { user } from '../state/auth';
import { Notify } from 'quasar';

const props = defineProps<{
  gymId: string;
}>();

defineEmits<{
  'invite': [];
}>();

const router = useRouter();

// Chat requests composable
const { createChatRequest, checkExistingChatHistory } = useChatRequests();

const members = ref<any[]>([]);
const loading = ref(false);
const roleFilter = ref('all');

const filteredMembers = computed(() => {
  if (roleFilter.value === 'all') return members.value;
  return members.value.filter(m => m.role === roleFilter.value);
});

async function loadMembers() {
  loading.value = true;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('gym_id', props.gymId)
      .in('age_category', ['teen', 'adult']) // Only show teens and adults
      .order('name', { ascending: true });

    if (error) throw error;
    members.value = data || [];
  } catch (err) {
    console.error('Error loading members:', err);
  } finally {
    loading.value = false;
  }
}

function getRoleColor(role: string) {
  switch (role) {
    case 'owner': return 'deep-purple';
    case 'instructor': return 'primary';
    case 'student': return 'teal';
    case 'parent': return 'orange';
    default: return 'grey';
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

async function startChat(member: { id: string; name: string }) {
  if (!user.value) {
    Notify.create({
      type: 'negative',
      message: 'You must be logged in to send messages'
    });
    return;
  }

  try {
    // Check if there's existing chat history
    const hasHistory = await checkExistingChatHistory(user.value.id, member.id);
    
    if (hasHistory) {
      // Navigate to the existing chat
      // The chat list will handle finding the correct chat
      await router.push('/chats');
      Notify.create({
        type: 'info',
        message: `Opening chat with ${member.name}`
      });
    } else {
      // Create a new chat request
      const request = await createChatRequest(
        member.id,
        `Chat with ${member.name}`,
        `Hello ${member.name}! I'd like to start a conversation with you.`
      );
      
      if (request) {
        Notify.create({
          type: 'positive',
          message: `Chat request sent to ${member.name}!`
        });
        // Navigate to requests tab
        await router.push('/chats');
      } else {
        Notify.create({
          type: 'negative',
          message: 'Failed to send chat request'
        });
      }
    }
  } catch (err) {
    console.error('Error starting chat:', err);
    Notify.create({
      type: 'negative',
      message: 'Failed to start chat'
    });
  }
}

function viewSchedule(member: { id: string; name: string }) {
  // Navigate to schedule filtered by this instructor
  void router.push(`/schedule?instructor=${member.id}`);
}

onMounted(() => {
  void loadMembers();
});
</script>

