<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md">
      <div class="text-h4">Kids' Dashboard</div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner color="primary" size="3em" />
      </div>

      <!-- No Kids Linked -->
      <div v-else-if="linkedStudents.length === 0">
        <q-card>
          <q-card-section class="text-center q-pa-xl">
            <q-icon name="child_care" size="4em" color="grey-5" class="q-mb-md" />
            <div class="text-h6 text-grey-7">No students linked</div>
            <div class="text-body2 text-grey-6 q-mt-sm">
              Please contact the gym owner to link your account to your child's account
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Kids Tabs -->
      <div v-else>
        <q-tabs
          v-model="selectedStudentId"
          dense
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="left"
        >
          <q-tab
            v-for="student in linkedStudents"
            :key="student.id"
            :name="student.id"
            :label="student.name"
          />
        </q-tabs>

        <q-separator class="q-mb-md" />

        <!-- Per-Kid Content -->
        <div v-if="selectedStudent">
          <q-tabs
            v-model="contentTab"
            dense
            class="text-grey"
            active-color="primary"
            indicator-color="primary"
            align="left"
          >
            <q-tab name="schedule" label="Schedule" />
            <q-tab name="groups" label="Class Groups" />
          </q-tabs>

          <q-separator class="q-mb-md" />

          <q-tab-panels v-model="contentTab" animated>
            <!-- Schedule Tab -->
            <q-tab-panel name="schedule">
              <div class="text-h6 q-mb-md">{{ selectedStudent.name }}'s Schedule</div>

              <!-- Loading RSVPs -->
              <div v-if="loadingRsvps" class="flex flex-center q-pa-xl">
                <q-spinner color="primary" size="2em" />
              </div>

              <!-- RSVPs List -->
              <div v-else>
                <q-list v-if="studentRsvps.length > 0" bordered separator>
                  <q-item v-for="rsvp in studentRsvps" :key="rsvp.id">
                    <q-item-section avatar>
                      <q-avatar :color="getClassColor(rsvp.gym_schedules?.class_type)" text-color="white">
                        <q-icon name="sports_martial_arts" />
                      </q-avatar>
                    </q-item-section>

                    <q-item-section>
                      <q-item-label>{{ rsvp.gym_schedules?.class_type?.toUpperCase() }}</q-item-label>
                      <q-item-label caption>
                        {{ rsvp.gym_schedules?.day_of_week }} - 
                        {{ formatTime(rsvp.gym_schedules?.start_time) }}
                      </q-item-label>
                      <q-item-label caption>{{ rsvp.rsvp_date }}</q-item-label>
                    </q-item-section>

                    <q-item-section side>
                      <q-badge :color="rsvp.status === 'confirmed' ? 'positive' : 'warning'">
                        {{ rsvp.status }}
                      </q-badge>
                    </q-item-section>
                  </q-item>
                </q-list>

                <!-- Empty State -->
                <q-card v-else>
                  <q-card-section class="text-center q-pa-xl">
                    <q-icon name="event_busy" size="3em" color="grey-5" class="q-mb-md" />
                    <div class="text-body1 text-grey-7">No upcoming classes</div>
                  </q-card-section>
                </q-card>
              </div>
            </q-tab-panel>

            <!-- Groups Tab -->
            <q-tab-panel name="groups">
              <div class="text-h6 q-mb-md">{{ selectedStudent.name }}'s Class Groups</div>

              <!-- Loading Groups -->
              <div v-if="loadingGroups" class="flex flex-center q-pa-xl">
                <q-spinner color="primary" size="2em" />
              </div>

              <!-- Groups List -->
              <div v-else>
                <q-list v-if="studentGroups.length > 0" bordered separator>
                  <q-item
                    v-for="group in studentGroups"
                    :key="group.id"
                    clickable
                    @click="viewGroup(group)"
                  >
                    <q-item-section avatar>
                      <q-avatar color="primary" text-color="white">
                        <q-icon name="groups" />
                      </q-avatar>
                    </q-item-section>

                    <q-item-section>
                      <q-item-label>{{ group.chats?.name }}</q-item-label>
                      <q-item-label caption>Class Group</q-item-label>
                    </q-item-section>

                    <q-item-section side>
                      <q-icon name="chevron_right" />
                    </q-item-section>
                  </q-item>
                </q-list>

                <!-- Empty State -->
                <q-card v-else>
                  <q-card-section class="text-center q-pa-xl">
                    <q-icon name="group_off" size="3em" color="grey-5" class="q-mb-md" />
                    <div class="text-body1 text-grey-7">No class groups yet</div>
                  </q-card-section>
                </q-card>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useParentView } from '../composables/useParentView';
import { user } from '../state/auth';

const router = useRouter();

const userId = computed(() => user.value?.id || '');
const { linkedStudents, selectedStudent, loading, fetchLinkedStudents, getStudentSchedule, getStudentGroups, selectStudent } = useParentView(userId.value);

const selectedStudentId = ref('');
const contentTab = ref('schedule');

const studentRsvps = ref<any[]>([]);
const studentGroups = ref<any[]>([]);
const loadingRsvps = ref(false);
const loadingGroups = ref(false);

async function loadStudentData() {
  if (!selectedStudent.value) return;

  // Load RSVPs
  loadingRsvps.value = true;
  studentRsvps.value = await getStudentSchedule(selectedStudent.value.id);
  loadingRsvps.value = false;

  // Load Groups
  loadingGroups.value = true;
  studentGroups.value = await getStudentGroups(selectedStudent.value.id);
  loadingGroups.value = false;
}

function formatTime(time: string | null | undefined) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours || '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes || '00'} ${ampm}`;
}

function getClassColor(classType: string | null | undefined) {
  switch (classType) {
    case 'gi': return 'blue';
    case 'nogi': return 'green';
    case 'kids': return 'orange';
    default: return 'grey';
  }
}

function viewGroup(group: { chat_id: string }) {
  void router.push(`/chat/${group.chat_id}`);
}

watch(selectedStudentId, (newId) => {
  const student = linkedStudents.value.find(s => s.id === newId);
  if (student) {
    selectStudent(student);
    void loadStudentData();
  }
});

watch(linkedStudents, (newStudents) => {
  if (newStudents.length > 0 && !selectedStudentId.value) {
    selectedStudentId.value = newStudents[0].id;
  }
});

onMounted(() => {
  if (userId.value) {
    void fetchLinkedStudents(userId.value);
  }
});
</script>

