<template>
  <div>
    <!-- Calendar Header with View Toggle -->
    <div class="row items-center q-mb-md">
      <div class="text-h6">Schedule</div>
      <q-space />
      
      <!-- View Selector -->
      <q-tabs v-model="currentView" dense class="q-mr-md">
        <q-tab name="template" label="Template" icon="event_repeat" />
        <q-tab name="month" label="Month" icon="calendar_month" />
        <q-tab name="week" label="Week" icon="view_week" />
      </q-tabs>
      
      <q-btn
        v-if="editable"
        icon="add"
        label="Create"
        color="primary"
        @click="showCreateMenu = true"
      >
        <q-menu v-model="showCreateMenu">
          <q-list style="min-width: 200px">
            <q-item clickable v-close-popup @click="$emit('create-schedule')">
              <q-item-section avatar>
                <q-icon name="event_repeat" />
              </q-item-section>
              <q-item-section>Recurring Class</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="showInstanceEditor = true">
              <q-item-section avatar>
                <q-icon name="event" />
              </q-item-section>
              <q-item-section>One-Time Event</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>

    <!-- View Panels -->
    <q-tab-panels v-model="currentView" animated>
      <!-- Template View (Original Weekly Grid) -->
      <q-tab-panel name="template" class="q-pa-none">
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
                :class="[getClassStyle(schedule), { 'cancelled-class': schedule.is_cancelled }]"
                @click="showClassDetails(schedule)"
              >
                <div class="class-header">
                  <span class="class-emoji">{{ getClassEmoji(schedule) }}</span>
                  <span class="text-subtitle2 class-title" :class="{ 'text-strike': schedule.is_cancelled }">
                    {{ getClassTitle(schedule) }}
                  </span>
                  <q-badge v-if="schedule.is_cancelled" color="negative" label="CANCELLED" class="q-ml-xs" />
                  <q-space />
                  <q-btn
                    v-if="canEdit(schedule)"
                    icon="edit"
                    size="xs"
                    flat
                    round
                    color="primary"
                    @click.stop="editClass(schedule)"
                  >
                    <q-tooltip>Edit Class</q-tooltip>
                  </q-btn>
                </div>
                <div class="text-caption class-time" :class="{ 'text-strike': schedule.is_cancelled }">
                  {{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}
                </div>
                <div class="text-caption text-grey-7">{{ schedule.instructor_name }}</div>
                <div class="text-caption">
                  <q-icon name="place" size="xs" /> {{ schedule.gym_location }}
                </div>
                <q-linear-progress
                  v-if="schedule.max_capacity && !schedule.is_cancelled"
                  :value="(schedule.current_rsvps || 0) / schedule.max_capacity"
                  :color="getCapacityColor(schedule)"
                  class="q-mt-xs"
                />
                <div v-if="schedule.max_capacity && !schedule.is_cancelled" class="text-caption text-center">
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

      </q-tab-panel>

      <!-- Month View -->
      <q-tab-panel name="month" class="q-pa-none">
        <ScheduleMonthView
          :gym-id="gymId"
          @view-class="viewInstance"
        />
      </q-tab-panel>

      <!-- Week View -->
      <q-tab-panel name="week" class="q-pa-none">
        <ScheduleWeekView
          :gym-id="gymId"
          @view-class="viewInstance"
        />
      </q-tab-panel>
    </q-tab-panels>

    <!-- Class Details Dialog (for Template View) -->
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

            <q-item>
              <q-item-section avatar>
                <q-icon name="bar_chart" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ normalizeLevel(selectedSchedule?.level) }}</q-item-label>
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

    <!-- Instance Details Dialog (for Month/Week Views) -->
    <q-dialog v-model="showInstanceDetails" :position="$q.platform.is.mobile ? 'bottom' : 'standard'">
      <q-card style="min-width: 400px">
        <div v-if="$q.platform.is.mobile" class="swipe-indicator-bar" />
        
        <q-card-section>
          <div class="text-h6">
            {{ selectedInstance?.class_type?.toUpperCase() }}
            <q-badge 
              v-if="selectedInstance?.event_type !== 'class'" 
              :label="selectedInstance?.event_type" 
              color="purple"
              class="q-ml-xs"
            />
          </div>
          <div class="text-subtitle2 text-grey-7">{{ selectedInstance?.date }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-list>
            <q-item>
              <q-item-section avatar>
                <q-icon name="schedule" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ formatTime(selectedInstance?.start_time) }} - {{ formatTime(selectedInstance?.end_time) }}</q-item-label>
                <q-item-label caption>Time</q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedInstance?.instructor_name">
              <q-item-section avatar>
                <q-icon name="person" />
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  {{ selectedInstance?.instructor_name }}
                  <q-icon 
                    v-if="selectedInstance?.is_override" 
                    name="swap_horiz" 
                    size="xs" 
                    color="orange"
                  >
                    <q-tooltip>Substitute Instructor</q-tooltip>
                  </q-icon>
                </q-item-label>
                <q-item-label caption>Instructor</q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedInstance?.level">
              <q-item-section avatar>
                <q-icon name="bar_chart" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ selectedInstance?.level }}</q-item-label>
                <q-item-label caption>Level</q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedInstance?.max_capacity">
              <q-item-section avatar>
                <q-icon name="people" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ selectedInstance?.current_rsvps }}/{{ selectedInstance?.max_capacity }}</q-item-label>
                <q-item-label caption>Capacity</q-item-label>
              </q-item-section>
            </q-item>

            <q-item v-if="selectedInstance?.notes">
              <q-item-section avatar>
                <q-icon name="notes" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ selectedInstance?.notes }}</q-item-label>
                <q-item-label caption>Notes</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <RsvpButton
            v-if="canRsvp && selectedInstance && selectedInstance.schedule_id"
            :schedule-id="selectedInstance.schedule_id"
            :rsvp-date="selectedInstance.date"
          />
          <q-btn flat label="Close" color="grey" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Class Instance Editor -->
    <ClassInstanceEditor
      v-model="showInstanceEditor"
      :gym-id="gymId"
      :date="newInstanceDate"
      mode="one-time"
      @saved="onInstanceSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useSchedule } from '../composables/useSchedule';
import { useRoles } from '../composables/useRoles';
import { user } from '../state/auth';
import type { ClassInstance } from '../composables/useClassInstances';
import RsvpButton from './RsvpButton.vue';
import ScheduleMonthView from './ScheduleMonthView.vue';
import ScheduleWeekView from './ScheduleWeekView.vue';
import ClassInstanceEditor from './ClassInstanceEditor.vue';

const props = defineProps<{
  gymId: string;
  editable?: boolean;
  filteredInstructorId?: string;
}>();

const emit = defineEmits<{
  'edit-schedule': [scheduleId: string];
  'create-schedule': [];
}>();

const $q = useQuasar();
const { schedulesByDay, loading, fetchSchedules, deleteSchedule } = useSchedule();
const { isOwner, isInstructor, canRSVPToClasses } = useRoles();

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const currentView = ref('month');
const showDetails = ref(false);
const selectedSchedule = ref<any>(null);
const showInstanceDetails = ref(false);
const selectedInstance = ref<ClassInstance | null>(null);
const showCreateMenu = ref(false);
const showInstanceEditor = ref(false);
const newInstanceDate = ref('');

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

// Fun styling functions for class cards
function getClassStyle(schedule: any): string {
  const notes = schedule.notes?.toLowerCase() || ''
  const classType = schedule.class_type?.toLowerCase() || ''
  const level = schedule.level?.toLowerCase() || ''
  const normalizedLevel = normalizeLevel(schedule).toLowerCase()

  // Competition and special classes
  if (classType.includes('competition')) {
    return 'class-competition'
  }
  if (classType.includes('open mat') || notes.includes('open mat')) {
    return 'class-openmat'
  }

  // Age group based styles with level variations
  if (notes.includes('pee wee') || notes.includes('pee_wee')) {
    return 'class-peewee'
  }
  if (notes.includes('kid') && !notes.includes('teen')) {
    if (level.includes('advanced')) return 'class-kids-advanced'
    return 'class-kids'
  }
  if (notes.includes('teen') && !notes.includes('adult')) {
    return 'class-teens'
  }
  if (notes.includes('adult')) {
    // Use normalized level (applies business rule)
    if (normalizedLevel.includes('fundamentals')) return 'class-adults-fundamentals'
    if (normalizedLevel.includes('advanced')) return 'class-adults-advanced'
    return 'class-adults'
  }

  // Class type fallback styles
  if (classType.includes('gi') && !classType.includes('no-gi')) {
    return 'class-gi'
  }
  if (classType.includes('no-gi') || classType.includes('no gi')) {
    return 'class-nogi'
  }

  return 'class-default'
}

function getClassEmoji(schedule: any): string {
  const notes = schedule.notes?.toLowerCase() || ''
  const classType = schedule.class_type?.toLowerCase() || ''
  const level = schedule.level?.toLowerCase() || ''
  const normalizedLevel = normalizeLevel(schedule).toLowerCase()

  // Competition class - special handling
  if (classType.includes('competition')) {
    return '🏆'
  }

  // Open mat - special handling
  if (classType.includes('open mat') || notes.includes('open mat')) {
    return '🤝'
  }

  // Pee Wees (always dinosaur)
  if (notes.includes('pee wee') || notes.includes('pee_wee')) {
    if (classType.includes('no-gi')) return '🦖' // T-Rex for no-gi
    return '🦕' // Dinosaur for GI
  }

  // Kids - varied by class type and level
  if (notes.includes('kid') && !notes.includes('teen')) {
    if (level.includes('advanced')) {
      return classType.includes('no-gi') ? '🥷' : '⭐'
    }
    if (classType.includes('no-gi')) return '🤸'
    return '🧒'
  }

  // Teens - varied by class type
  if (notes.includes('teen') && !notes.includes('adult')) {
    if (classType.includes('no-gi')) return '🤼‍♂️'
    return '🥋'
  }

  // Adults - varied by level and class type (use normalized level)
  if (notes.includes('adult')) {
    if (normalizedLevel.includes('fundamentals')) {
      return classType.includes('no-gi') ? '💪' : '📚'
    }
    if (normalizedLevel.includes('advanced')) {
      return classType.includes('no-gi') ? '⚡' : '🔥'
    }
    // All levels
    if (classType.includes('no-gi')) return '🤼'
    return '🥋'
  }

  // Fallback based on class type only
  if (classType.includes('gi') && !classType.includes('no-gi')) {
    return '🥋'
  }
  if (classType.includes('no-gi') || classType.includes('no gi')) {
    return '🤼'
  }

  return '🏃' // Default running emoji
}

/**
 * Normalize the level display based on business rules
 * Business Rule: If an "adults & teens" class is NOT "all levels" or "fundamentals", 
 * it is classified as either "advanced" or "competition"
 */
function normalizeLevel(schedule: any): string {
  const level = schedule?.level
  const notes = schedule?.notes?.toLowerCase() || ''
  const isAdultsAndTeens = notes.includes('adult')
  
  if (!level) {
    // If no level specified for adults & teens, treat as advanced
    return isAdultsAndTeens ? 'Advanced' : 'All Levels'
  }
  
  const normalized = level.toLowerCase().trim()
  
  // Specific level types
  if (normalized.includes('fundamental')) return 'Fundamentals'
  if (normalized.includes('competition')) return 'Competition'
  if (normalized.includes('advanced')) return 'Advanced'
  
  // Business rule: Adults & Teens that are NOT "all levels" or "fundamentals" = Advanced
  if (isAdultsAndTeens && !normalized.includes('all levels')) {
    return 'Advanced'
  }
  
  // Everything else is "All Levels"
  return 'All Levels'
}

function getClassTitle(schedule: any): string {
  const classType = schedule.class_type || ''
  const notes = schedule.notes || ''
  const normalizedLevel = normalizeLevel(schedule)

  // Extract age group from notes
  let ageGroup = ''
  if (notes.toLowerCase().includes('pee wee')) {
    ageGroup = 'Pee Wees'
  } else if (notes.toLowerCase().includes('kid') && !notes.toLowerCase().includes('teen')) {
    ageGroup = 'Kids'
  } else if (notes.toLowerCase().includes('teen') && !notes.toLowerCase().includes('adult')) {
    ageGroup = 'Teens'
  } else if (notes.toLowerCase().includes('adult')) {
    ageGroup = 'Adults & Teens'
  }

  // Build title
  const parts = []
  if (classType) parts.push(classType)
  if (ageGroup) parts.push(ageGroup)
  // Only show level in title if it's NOT "All Levels"
  if (normalizedLevel !== 'All Levels') parts.push(`(${normalizedLevel})`)

  return parts.join(' - ') || 'CLASS'
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

function editClass(schedule?: any) {
  const scheduleToEdit = schedule || selectedSchedule.value
  if (scheduleToEdit) {
    emit('edit-schedule', scheduleToEdit.id);
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

function viewInstance(instance: ClassInstance) {
  selectedInstance.value = instance;
  showInstanceDetails.value = true;
}

function onInstanceSaved() {
  // Refresh the current view
  if (currentView.value === 'template') {
    const filters: any = { gym_id: props.gymId };
    if (props.filteredInstructorId) {
      filters.instructor_id = props.filteredInstructorId;
    }
    void fetchSchedules(filters);
  }
  // Month and Week views handle their own refreshing
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

.class-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.class-emoji {
  font-size: 1.2em;
}

.class-title {
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.class-time {
  font-weight: 500;
  margin-bottom: 2px;
}

.cancelled-class {
  opacity: 0.5;
  background: #f5f5f5 !important;
}

.text-strike {
  text-decoration: line-through;
}

/* Fun color schemes for different class types */
.class-peewee {
  border-left-color: #FF5722;
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
  color: #E65100;
}

.class-kids {
  border-left-color: #2196F3;
  background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
  color: #0D47A1;
}

.class-kids-advanced {
  border-left-color: #3F51B5;
  background: linear-gradient(135deg, #E8EAF6 0%, #C5CAE9 100%);
  color: #1A237E;
}

.class-teens {
  border-left-color: #9C27B0;
  background: linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%);
  color: #4A148C;
}

.class-adults {
  border-left-color: #4CAF50;
  background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
  color: #1B5E20;
}

.class-adults-fundamentals {
  border-left-color: #009688;
  background: linear-gradient(135deg, #E0F2F1 0%, #B2DFDB 100%);
  color: #004D40;
}

.class-adults-advanced {
  border-left-color: #FF5722;
  background: linear-gradient(135deg, #FBE9E7 0%, #FFCCBC 100%);
  color: #BF360C;
}

.class-competition {
  border-left-color: #C62828;
  background: linear-gradient(135deg, #FFEBEE 0%, #EF9A9A 100%);
  color: #B71C1C;
  font-weight: 600;
}

.class-openmat {
  border-left-color: #FFA000;
  background: linear-gradient(135deg, #FFF8E1 0%, #FFE082 100%);
  color: #FF6F00;
}

.class-gi {
  border-left-color: #FF9800;
  background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%);
  color: #E65100;
}

.class-nogi {
  border-left-color: #F44336;
  background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
  color: #B71C1C;
}

.class-default {
  border-left-color: #607D8B;
  background: linear-gradient(135deg, #ECEFF1 0%, #CFD8DC 100%);
  color: #37474F;
}

.swipe-indicator-bar {
  width: 40px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  margin: 8px auto;
}
</style>

