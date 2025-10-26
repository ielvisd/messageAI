<template>
  <div class="schedule-month-view">
    <!-- Month Navigation -->
    <div class="row items-center q-mb-md">
      <q-btn 
        flat 
        round 
        dense
        icon="chevron_left" 
        @click="previousMonth"
        :disable="loading"
      />
      <div class="text-h6 q-mx-md">{{ currentMonthLabel }}</div>
      <q-btn 
        flat 
        round 
        dense
        icon="chevron_right" 
        @click="nextMonth"
        :disable="loading"
      />
      <q-space />
      <q-btn 
        label="Today" 
        flat
        color="primary"
        @click="goToToday"
        :disable="loading"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>

    <!-- Calendar Grid -->
    <div v-else class="calendar-grid">
      <!-- Days of week header -->
      <div 
        v-for="day in daysOfWeek" 
        :key="day"
        class="day-header text-weight-bold text-grey-7"
      >
        {{ day }}
      </div>
      
      <!-- Date cells -->
      <div
        v-for="dateCell in monthDates"
        :key="dateCell.dateString"
        :class="getDateCellClasses(dateCell)"
        class="date-cell"
        @click="showDayClasses(dateCell)"
      >
        <div class="date-number" :class="{ 'text-primary': dateCell.isToday }">
          {{ dateCell.day }}
        </div>
        
        <!-- Class indicators -->
        <div v-if="dateCell.instances.length > 0" class="class-indicators">
          <div 
            v-for="(instance, idx) in dateCell.instances.slice(0, 3)" 
            :key="idx"
            class="class-dot"
            :class="getClassDotClass(instance)"
          />
          <q-badge 
            v-if="dateCell.instances.length > 3"
            color="grey-7"
            :label="`+${dateCell.instances.length - 3}`"
            class="q-mt-xs"
          />
        </div>
      </div>
    </div>

    <!-- Day Classes Dialog/Bottom Sheet -->
    <q-dialog 
      v-model="showDayDialog"
      :position="$q.platform.is.mobile ? 'bottom' : 'standard'"
    >
      <q-card style="min-width: 350px; max-width: 500px">
        <!-- Swipe indicator for mobile -->
        <div v-if="$q.platform.is.mobile" class="swipe-indicator-bar" />
        
        <q-card-section>
          <div class="text-h6">
            {{ selectedDateLabel }}
          </div>
          <div class="text-subtitle2 text-grey-7">
            {{ selectedInstances.length }} {{ selectedInstances.length === 1 ? 'class' : 'classes' }}
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pt-none scroll" style="max-height: 60vh">
          <q-list>
            <q-item
              v-for="instance in selectedInstances"
              :key="instance.id || `${instance.schedule_id}_${instance.date}`"
              clickable
              @click="viewClassDetails(instance)"
              :class="{ 'cancelled-item': instance.is_cancelled }"
            >
              <q-item-section avatar>
                <q-icon 
                  :name="getClassIcon(instance)" 
                  :color="instance.is_cancelled ? 'grey' : getClassColor(instance)"
                  size="md"
                />
              </q-item-section>

              <q-item-section>
                <q-item-label :class="{ 'text-strike': instance.is_cancelled }">
                  {{ instance.class_type }}
                  <q-badge 
                    v-if="instance.event_type !== 'class'" 
                    :label="instance.event_type" 
                    color="purple"
                    class="q-ml-xs"
                  />
                  <q-badge 
                    v-if="instance.is_cancelled" 
                    label="CANCELLED" 
                    color="negative"
                    class="q-ml-xs"
                  />
                </q-item-label>
                <q-item-label caption :class="{ 'text-strike': instance.is_cancelled }">
                  {{ formatTime(instance.start_time) }} - {{ formatTime(instance.end_time) }}
                </q-item-label>
                <q-item-label caption v-if="instance.instructor_name">
                  {{ instance.instructor_name }}
                  <q-icon 
                    v-if="instance.is_override && instance.instructor_id" 
                    name="swap_horiz" 
                    size="xs"
                    color="orange"
                  >
                    <q-tooltip>Substitute Instructor</q-tooltip>
                  </q-icon>
                </q-item-label>
              </q-item-section>

              <q-item-section side v-if="instance.max_capacity">
                <q-circular-progress
                  :value="(instance.current_rsvps || 0) / instance.max_capacity * 100"
                  size="40px"
                  :color="getCapacityColor(instance)"
                  track-color="grey-3"
                  :thickness="0.15"
                  show-value
                >
                  <div class="text-caption">{{ instance.current_rsvps }}/{{ instance.max_capacity }}</div>
                </q-circular-progress>
              </q-item-section>

              <q-item-section side>
                <q-icon name="chevron_right" color="grey" />
              </q-item-section>
            </q-item>

            <q-item v-if="selectedInstances.length === 0">
              <q-item-section>
                <q-item-label class="text-grey-6 text-center">
                  No classes scheduled
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right">
          <q-btn flat label="Close" color="grey" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { date as dateUtil, useQuasar } from 'quasar';
import type { ClassInstance } from '../composables/useClassInstances';
import { useClassInstances } from '../composables/useClassInstances';

const props = defineProps<{
  gymId: string;
}>();

const emit = defineEmits<{
  'view-class': [instance: ClassInstance];
}>();

const $q = useQuasar();
const { instances, loading, fetchInstances } = useClassInstances();

const currentDate = ref(new Date());
const showDayDialog = ref(false);
const selectedDate = ref<Date | null>(null);

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Current month label
const currentMonthLabel = computed(() => {
  return dateUtil.formatDate(currentDate.value, 'MMMM YYYY');
});

// Selected date label
const selectedDateLabel = computed(() => {
  if (!selectedDate.value) return '';
  return dateUtil.formatDate(selectedDate.value, 'dddd, MMMM D, YYYY');
});

// Generate calendar grid for current month
const monthDates = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();
  
  // First day of month
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday
  
  // Last day of month
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Previous month days to fill
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  
  const dates: Array<{
    date: Date;
    dateString: string;
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    instances: ClassInstance[];
  }> = [];
  
  // Previous month days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, month - 1, day);
    dates.push({
      date,
      dateString: dateUtil.formatDate(date, 'YYYY-MM-DD'),
      day,
      isCurrentMonth: false,
      isToday: false,
      instances: []
    });
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = dateUtil.formatDate(date, 'YYYY-MM-DD');
    const today = dateUtil.formatDate(new Date(), 'YYYY-MM-DD');
    
    dates.push({
      date,
      dateString,
      day,
      isCurrentMonth: true,
      isToday: dateString === today,
      instances: instances.value.filter(i => i.date === dateString && !i.is_cancelled)
    });
  }
  
  // Next month days to fill grid (6 rows * 7 days = 42)
  const remainingDays = 42 - dates.length;
  for (let day = 1; day <= remainingDays; day++) {
    const date = new Date(year, month + 1, day);
    dates.push({
      date,
      dateString: dateUtil.formatDate(date, 'YYYY-MM-DD'),
      day,
      isCurrentMonth: false,
      isToday: false,
      instances: []
    });
  }
  
  return dates;
});

// Selected day instances
const selectedInstances = computed(() => {
  if (!selectedDate.value) return [];
  const dateString = dateUtil.formatDate(selectedDate.value, 'YYYY-MM-DD');
  return instances.value
    .filter(i => i.date === dateString)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
});

function getDateCellClasses(dateCell: any) {
  return {
    'current-month': dateCell.isCurrentMonth,
    'other-month': !dateCell.isCurrentMonth,
    'today': dateCell.isToday,
    'has-classes': dateCell.instances.length > 0,
    'clickable': dateCell.isCurrentMonth
  };
}

function getClassDotClass(instance: ClassInstance) {
  const type = instance.class_type.toLowerCase();
  if (type.includes('gi') && !type.includes('no-gi')) return 'dot-gi';
  if (type.includes('no-gi')) return 'dot-nogi';
  if (type.includes('competition')) return 'dot-competition';
  if (type.includes('open mat')) return 'dot-openmat';
  return 'dot-default';
}

function getClassIcon(instance: ClassInstance) {
  if (instance.event_type === 'workshop') return 'school';
  if (instance.event_type === 'seminar') return 'event';
  if (instance.event_type === 'belt_test') return 'military_tech';
  if (instance.event_type === 'competition') return 'emoji_events';
  if (instance.class_type.toLowerCase().includes('gi') && !instance.class_type.toLowerCase().includes('no-gi')) return 'sports_martial_arts';
  if (instance.class_type.toLowerCase().includes('no-gi')) return 'sports_mma';
  return 'fitness_center';
}

function getClassColor(instance: ClassInstance) {
  if (instance.event_type !== 'class') return 'purple';
  if (instance.class_type.toLowerCase().includes('gi') && !instance.class_type.toLowerCase().includes('no-gi')) return 'orange';
  if (instance.class_type.toLowerCase().includes('no-gi')) return 'red';
  if (instance.class_type.toLowerCase().includes('competition')) return 'deep-orange';
  return 'primary';
}

function getCapacityColor(instance: ClassInstance) {
  if (!instance.max_capacity) return 'grey';
  const ratio = (instance.current_rsvps || 0) / instance.max_capacity;
  if (ratio >= 1) return 'negative';
  if (ratio >= 0.8) return 'warning';
  return 'positive';
}

function formatTime(time: string | null | undefined) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours || '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes || '00'} ${ampm}`;
}

function previousMonth() {
  currentDate.value = dateUtil.subtractFromDate(currentDate.value, { months: 1 });
}

function nextMonth() {
  currentDate.value = dateUtil.addToDate(currentDate.value, { months: 1 });
}

function goToToday() {
  currentDate.value = new Date();
}

function showDayClasses(dateCell: any) {
  if (!dateCell.isCurrentMonth) return;
  selectedDate.value = dateCell.date;
  showDayDialog.value = true;
}

function viewClassDetails(instance: ClassInstance) {
  emit('view-class', instance);
  showDayDialog.value = false;
}

// Load instances when month changes
watch(currentDate, async () => {
  const startOfMonth = dateUtil.startOfDate(currentDate.value, 'month');
  const endOfMonth = dateUtil.endOfDate(currentDate.value, 'month');
  
  // Extend range to include days from prev/next month in the grid
  const startDate = dateUtil.subtractFromDate(startOfMonth, { days: 7 });
  const endDate = dateUtil.addToDate(endOfMonth, { days: 7 });
  
  await fetchInstances(props.gymId, startDate, endDate);
}, { immediate: true });
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.day-header {
  padding: 12px 8px;
  text-align: center;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-cell {
  min-height: 80px;
  padding: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.2s;
}

.date-cell.clickable {
  cursor: pointer;
}

.date-cell.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: var(--q-primary);
}

.date-cell.other-month {
  opacity: 0.3;
  background: #fafafa;
}

.date-cell.today {
  border-color: var(--q-primary);
  border-width: 2px;
  background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
}

.date-number {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.class-indicators {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 4px;
}

.class-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-gi {
  background: #FF9800;
}

.dot-nogi {
  background: #F44336;
}

.dot-competition {
  background: #C62828;
}

.dot-openmat {
  background: #FFA000;
}

.dot-default {
  background: var(--q-primary);
}

.swipe-indicator-bar {
  width: 40px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  margin: 8px auto;
}

.cancelled-item {
  opacity: 0.6;
}

@media (max-width: 600px) {
  .calendar-grid {
    gap: 4px;
  }
  
  .date-cell {
    min-height: 60px;
    padding: 4px;
  }
  
  .date-number {
    font-size: 0.9rem;
  }
  
  .day-header {
    padding: 8px 4px;
    font-size: 0.75rem;
  }
}
</style>

