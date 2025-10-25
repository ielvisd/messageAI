<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h4">My Classes</div>
        <q-btn
          color="primary"
          label="View Class Rosters"
          icon="people"
          @click="$router.push('/class-roster')"
          outline
        />
      </div>

      <!-- Tabs -->
      <q-tabs
        v-model="tab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
      >
        <q-tab name="schedule" label="Schedule" />
        <q-tab name="groups" label="Class Groups" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <!-- Schedule Tab -->
        <q-tab-panel name="schedule">
          <ScheduleCalendar
            :gym-id="gymId"
            :filtered-instructor-id="userId"
            :editable="canEditSchedule"
            @edit-schedule="editSchedule"
            @create-schedule="showScheduleEditor = true"
          />
        </q-tab-panel>

        <!-- Class Groups Tab -->
        <q-tab-panel name="groups">
          <div class="row items-center q-mb-md">
            <div class="text-h6">My Class Groups</div>
          </div>

          <!-- Loading State -->
          <div v-if="loadingGroups" class="flex flex-center q-pa-xl">
            <q-spinner color="primary" size="3em" />
          </div>

          <!-- Groups List -->
          <div v-else class="row q-col-gutter-md">
            <div
              v-for="group in classGroups"
              :key="group.id"
              class="col-12 col-md-6"
            >
              <q-card>
                <q-card-section>
                  <div class="text-h6">{{ group.name }}</div>
                  <div class="text-caption text-grey-7">
                    {{ group.members_count }} members
                  </div>
                </q-card-section>

                <q-card-actions>
                  <q-btn
                    flat
                    label="View Chat"
                    icon="chat"
                    color="primary"
                    @click="openChat(group.id)"
                  />
                  <q-btn
                    flat
                    label="Add Members"
                    icon="person_add"
                    color="primary"
                    @click="addMembersToGroup(group)"
                  />
                </q-card-actions>
              </q-card>
            </div>

            <!-- Empty State -->
            <div v-if="classGroups.length === 0" class="col-12">
              <q-card>
                <q-card-section class="text-center q-pa-xl">
                  <q-icon name="groups" size="4em" color="grey-5" class="q-mb-md" />
                  <div class="text-h6 text-grey-7">No class groups yet</div>
                  <div class="text-body2 text-grey-6 q-mt-sm">
                    Class groups are automatically created when you create a new class
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- Schedule Editor Dialog -->
    <ScheduleEditorDialog
      v-model="showScheduleEditor"
      :gym-id="gymId"
      :schedule-id="editingScheduleId"
      @saved="onScheduleSaved"
    />

    <!-- Add Members Dialog -->
    <q-dialog v-model="showAddMembers">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Add Members to {{ selectedGroup?.name }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-select
            v-model="selectedStudents"
            :options="availableStudents"
            option-value="id"
            option-label="name"
            label="Select Students"
            multiple
            use-chips
            filled
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="grey" v-close-popup />
          <q-btn
            label="Add Members"
            color="primary"
            @click="confirmAddMembers"
            :loading="addingMembers"
            :disable="selectedStudents.length === 0"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { user } from '../state/auth';
import { supabase } from '../boot/supabase';
import { useGroupManagement } from '../composables/useGroupManagement';
import { useGymSettings } from '../composables/useGymSettings';
import ScheduleCalendar from '../components/ScheduleCalendar.vue';
import ScheduleEditorDialog from '../components/ScheduleEditorDialog.vue';
import { Notify } from 'quasar';

const router = useRouter();

const gymId = computed(() => (user.value as any)?.gym_id || '');
const userId = computed(() => user.value?.id || '');

const { settings, fetchSettings } = useGymSettings(gymId.value);
const { addMembers, getEligibleStudents } = useGroupManagement();

const tab = ref('schedule');
const classGroups = ref<any[]>([]);
const loadingGroups = ref(false);

const showScheduleEditor = ref(false);
const editingScheduleId = ref<string | null>(null);

const showAddMembers = ref(false);
const selectedGroup = ref<any>(null);
const selectedStudents = ref<any[]>([]);
const availableStudents = ref<any[]>([]);
const addingMembers = ref(false);

const canEditSchedule = computed(() => {
  return settings.value.instructorsCanCreateClasses || settings.value.instructorsEditOwnOnly;
});

async function loadClassGroups() {
  loadingGroups.value = true;

  try {
    // Get chats where instructor is creator and type is group
    const { data, error } = await supabase
      .from('chats')
      .select('*, chat_members(count)')
      .eq('created_by', userId.value)
      .eq('type', 'group');

    if (error) throw error;

    classGroups.value = (data || []).map(chat => ({
      ...chat,
      members_count: chat.chat_members?.[0]?.count || 0
    }));
  } catch (err) {
    console.error('Error loading class groups:', err);
  } finally {
    loadingGroups.value = false;
  }
}

function editSchedule(scheduleId: string) {
  editingScheduleId.value = scheduleId;
  showScheduleEditor.value = true;
}

function onScheduleSaved() {
  showScheduleEditor.value = false;
  editingScheduleId.value = null;
}

function openChat(chatId: string) {
  void router.push(`/chat/${chatId}`);
}

async function addMembersToGroup(group: { id: string; name: string }) {
  selectedGroup.value = group;
  
  // Load available students
  availableStudents.value = await getEligibleStudents(gymId.value, group.id);
  
  showAddMembers.value = true;
}

async function confirmAddMembers() {
  if (!selectedGroup.value || selectedStudents.value.length === 0) return;

  addingMembers.value = true;

  try {
    const userIds = selectedStudents.value.map(s => s.id);
    const { error } = await addMembers(selectedGroup.value.id, userIds);

    if (error) throw error;

    Notify.create({
      type: 'positive',
      message: `${selectedStudents.value.length} member(s) added to group`
    });

    showAddMembers.value = false;
    selectedStudents.value = [];
    void loadClassGroups(); // Refresh count
  } catch (err) {
    console.error('Error adding members:', err);
    Notify.create({
      type: 'negative',
      message: (err as Error).message || 'Failed to add members'
    });
  } finally {
    addingMembers.value = false;
  }
}

onMounted(() => {
  if (gymId.value) {
    void fetchSettings(gymId.value);
    void loadClassGroups();
  }
});
</script>

