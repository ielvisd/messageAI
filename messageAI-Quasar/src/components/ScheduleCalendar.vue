<template>
  <div>
    <!-- Calendar Header -->
    <div class="row items-center q-mb-md">
      <div class="text-h6">Weekly Schedule</div>
      <q-space />
      <q-btn
        v-if="editable"
        icon="add"
        label="Create Class"
        color="primary"
        @click="$emit('create-schedule')"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Week View Grid -->
    <div v-else class="schedule-grid">
      <div class="row q-col-gutter-sm">
        <div
          v-for="day in days"
          :key="day"
          class="col-12 col-md-6 col-lg"
        >
          <q-card>
            <q-card-section class="bg-primary text-white">
              <div class="text-weight-bold">{{ day }}</div>
            </q-card-section>

            <q-card-section class="q-pa-sm">
              <!-- Classes for this day -->
              <div
                v-for="schedule in schedulesByDay[day]"
                :key="schedule.id"
                class="class-card q-mb-sm cursor-pointer"
                :class="`class-${schedule.class_type}`"
                @click="showClassDetails(schedule)"
              >
                <div class="text-subtitle2">{{ schedule.class_type?.toUpperCase() }}</div>
                <div class="text-caption">{{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}</div>
                <div class="text-caption text-grey-7">{{ schedule.instructor_name }}</div>
                <div class="text-caption">
                  <q-icon name="place" size="xs" /> {{ schedule.gym_location }}
                </div>
                <q-linear-progress
                  v-if="schedule.max_capacity"
                  :value="(schedule.current_rsvps || 0) / schedule.max_capacity"
                  :color="getCapacityColor(schedule)"
                  class="q-mt-xs"
                />
                <div v-if="schedule.max_capacity" class="text-caption text-center">
                  {{ schedule.current_rsvps }}/{{ schedule.max_capacity }}
                </div>
              </div>

              <!-- Empty State -->
              <div v-if="!schedulesByDay[day] || schedulesByDay[day].length === 0" class="text-center text-grey-6 q-pa-md">
                No classes
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>

    <!-- Class Details Dialog -->
    <q-dialog v-model="showDetails">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ selectedSchedule?.class_type?.toUpperCase() }} Class</div>
          <div class="text-subtitle2 text-grey-7">{{ selectedSchedule?.day_of_week }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-list>
            <q-item>
              <q-item-section avatar>
                <q-icon name="schedule" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ formatTime(selectedSchedule?.start_time) }} - {{ formatTime(selectedSchedule?.end_time) }}</q-item-label>
                <q-item-label caption>Time</q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section avatar>
                <q-icon name="person" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ selectedSchedule?.instructor_name }}</q-item-label>
                <q-item-label caption>Instructor</q-item-label>
              </q-item-section>
            </q-item>

            <q-item>
              <q-item-section avatar>
                <q-icon name="place" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ selectedSchedule?.gym_location }}</q-item-label>
                <q-item-label caption>Location</q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedSchedule?.level">
              <q-item-section avatar>
                <q-icon name="bar_chart" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ selectedSchedule?.level }}</q-item-label>
                <q-item-label caption>Level</q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedSchedule?.max_capacity">
              <q-item-section avatar>
                <q-icon name="people" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ selectedSchedule?.current_rsvps }}/{{ selectedSchedule?.max_capacity }}</q-item-label>
                <q-item-label caption>Capacity</q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedSchedule?.notes">
              <q-item-section avatar>
                <q-icon name="notes" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ selectedSchedule?.notes }}</q-item-label>
                <q-item-label caption>Notes</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <RsvpButton
            v-if="canRsvp && selectedSchedule"
            :schedule-id="selectedSchedule.id"
            :rsvp-date="getNextClassDate(selectedSchedule.day_of_week)"
          />
          <q-btn
            v-if="canEdit(selectedSchedule)"
            label="Edit"
            icon="edit"
            flat
            color="primary"
            @click="editClass"
          />
          <q-btn
            v-if="canDelete"
            label="Delete"
            icon="delete"
            flat
            color="negative"
            @click="deleteClass"
          />
          <q-btn flat label="Close" color="grey" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSchedule } from '../composables/useSchedule';
import { useRoles } from '../composables/useRoles';
import { user } from '../state/auth';
import RsvpButton from './RsvpButton.vue';

const props = defineProps<{
  gymId: string;
  editable?: boolean;
  filteredInstructorId?: string;
}>();

const emit = defineEmits<{
  'edit-schedule': [scheduleId: string];
  'create-schedule': [];
}>();

const { schedulesByDay, loading, fetchSchedules, deleteSchedule } = useSchedule();
const { isOwner, isInstructor, canRSVPToClasses } = useRoles();

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const showDetails = ref(false);
const selectedSchedule = ref<any>(null);

const canRsvp = computed(() => canRSVPToClasses.value);
const canDelete = computed(() => isOwner.value);

function canEdit(schedule: any) {
  if (isOwner.value) return true;
  if (isInstructor.value && schedule?.instructor_id === user.value?.id) return true;
  return false;
}

function showClassDetails(schedule: any) {
  selectedSchedule.value = schedule;
  showDetails.value = true;
}

function formatTime(time: string | null | undefined) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours || '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes || '00'} ${ampm}`;
}

function getCapacityColor(schedule: any) {
  if (!schedule.max_capacity) return 'grey';
  const ratio = schedule.current_rsvps / schedule.max_capacity;
  if (ratio >= 1) return 'negative';
  if (ratio >= 0.8) return 'warning';
  return 'positive';
}

function getNextClassDate(dayOfWeek: string | undefined): string {
  if (!dayOfWeek) return '';
  const today = new Date();
  const dayIndex = days.indexOf(dayOfWeek);
  const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Adjust for Monday = 0
  
  let daysUntilClass = dayIndex - currentDayIndex;
  if (daysUntilClass <= 0) {
    daysUntilClass += 7; // Next week
  }

  const nextClass = new Date(today);
  nextClass.setDate(today.getDate() + daysUntilClass);
  const dateString = nextClass.toISOString().split('T')[0];
  return dateString || '';
}

function editClass() {
  if (selectedSchedule.value) {
    emit('edit-schedule', selectedSchedule.value.id);
    showDetails.value = false;
  }
}

async function deleteClass() {
  if (!selectedSchedule.value) return;

  const confirmed = confirm(`Delete ${selectedSchedule.value.class_type} class on ${selectedSchedule.value.day_of_week}?`);
  if (!confirmed) return;

  await deleteSchedule(selectedSchedule.value.id);
  showDetails.value = false;
}

onMounted(() => {
  const filters: any = { gym_id: props.gymId };
  if (props.filteredInstructorId) {
    filters.instructor_id = props.filteredInstructorId;
  }
  void fetchSchedules(filters);
});
</script>

<style scoped>
.schedule-grid {
  min-height: 400px;
}

.class-card {
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid;
  background: white;
  transition: all 0.2s;
}

.class-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.class-gi {
  border-left-color: #2196F3;
  background: #E3F2FD;
}

.class-nogi {
  border-left-color: #4CAF50;
  background: #E8F5E9;
}

.class-kids {
  border-left-color: #FF9800;
  background: #FFF3E0;
}

.class-open_mat {
  border-left-color: #9C27B0;
  background: #F3E5F5;
}
</style>

