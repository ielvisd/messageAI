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

const props = defineProps<{
  gymId: string;
}>();

defineEmits<{
  'invite': [];
}>();

const router = useRouter();

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

function startChat(member: { id: string; name: string }) {
  // Navigate to chat or create new chat with this member
  // This will be implemented with useChatRequests
  void router.push(`/chats?user=${member.id}`);
}

function viewSchedule(member: { id: string; name: string }) {
  // Navigate to schedule filtered by this instructor
  void router.push(`/schedule?instructor=${member.id}`);
}

onMounted(() => {
  void loadMembers();
});
</script>

