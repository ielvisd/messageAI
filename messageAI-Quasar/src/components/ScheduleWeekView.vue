<template>
  <div class="schedule-week-view">
    <!-- Week Navigation -->
    <div class="row items-center q-mb-md">
      <q-btn 
        flat 
        round 
        dense
        icon="chevron_left" 
        @click="previousWeek"
        :disable="loading"
      />
      <div class="text-h6 q-mx-md">{{ currentWeekLabel }}</div>
      <q-btn 
        flat 
        round 
        dense
        icon="chevron_right" 
        @click="nextWeek"
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

    <!-- Week Grid with Touch Swipe -->
    <div 
      v-else
      v-touch-swipe.mouse.horizontal="handleSwipe"
      class="week-grid-container"
    >
      <div class="week-grid">
        <!-- Time column -->
        <div class="time-column">
          <div class="time-header"></div>
          <div 
            v-for="hour in timeSlots" 
            :key="hour"
            class="time-slot"
          >
            {{ formatHour(hour) }}
          </div>
        </div>

        <!-- Day columns -->
        <div 
          v-for="day in weekDays"
          :key="day.dateString"
          class="day-column"
          :class="{ 'today-column': day.isToday }"
        >
          <!-- Day header -->
          <div class="day-header" :class="{ 'today-header': day.isToday }">
            <div class="day-name">{{ day.dayName }}</div>
            <div class="day-date">{{ day.date }}</div>
          </div>

          <!-- Time slots -->
          <div class="time-slots-container">
            <div 
              v-for="hour in timeSlots"
              :key="`${day.dateString}-${hour}`"
              class="time-slot-cell"
            />
            
            <!-- Class cards positioned absolutely -->
            <div 
              v-for="instance in day.instances"
              :key="instance.id || `${instance.schedule_id}_${instance.date}`"
              class="class-card"
              :class="getClassCardClasses(instance)"
              :style="getClassCardStyle(instance)"
              @click="viewClassDetails(instance)"
            >
              <div class="class-card-content">
                <div class="class-type">
                  {{ instance.class_type }}
                  <q-badge 
                    v-if="instance.is_cancelled" 
                    label="X" 
                    color="negative"
                    class="q-ml-xs"
                  />
                </div>
                <div class="class-time">
                  {{ formatTime(instance.start_time) }} - {{ formatTime(instance.end_time) }}
                </div>
                <div v-if="instance.instructor_name" class="class-instructor">
                  <q-icon 
                    v-if="instance.is_override" 
                    name="swap_horiz" 
                    size="xs"
                  />
                  {{ instance.instructor_name }}
                </div>
                <div v-if="instance.max_capacity" class="class-capacity">
                  <q-icon name="people" size="xs" />
                  {{ instance.current_rsvps }}/{{ instance.max_capacity }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { date as dateUtil } from 'quasar';
import type { ClassInstance } from '../composables/useClassInstances';
import { useClassInstances } from '../composables/useClassInstances';

const props = defineProps<{
  gymId: string;
}>();

const emit = defineEmits<{
  'view-class': [instance: ClassInstance];
}>();

const { instances, loading, fetchInstances } = useClassInstances();

const currentWeekStart = ref(getWeekStart(new Date()));

// Time slots (6 AM to 10 PM)
const timeSlots = Array.from({ length: 16 }, (_, i) => i + 6); // 6-21 (6 AM - 9 PM)

// Current week label
const currentWeekLabel = computed(() => {
  const weekEnd = dateUtil.addToDate(currentWeekStart.value, { days: 6 });
  const startLabel = dateUtil.formatDate(currentWeekStart.value, 'MMM D');
  const endLabel = dateUtil.formatDate(weekEnd, 'MMM D, YYYY');
  return `${startLabel} - ${endLabel}`;
});

// Week days
const weekDays = computed(() => {
  const days = [];
  const today = dateUtil.formatDate(new Date(), 'YYYY-MM-DD');
  
  for (let i = 0; i < 7; i++) {
    const date = dateUtil.addToDate(currentWeekStart.value, { days: i });
    const dateString = dateUtil.formatDate(date, 'YYYY-MM-DD');
    
    days.push({
      date: dateUtil.formatDate(date, 'D'),
      dayName: dateUtil.formatDate(date, 'ddd'),
      dateString,
      fullDate: date,
      isToday: dateString === today,
      instances: instances.value
        .filter(i => i.date === dateString)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    });
  }
  
  return days;
});

function getWeekStart(date: Date): Date {
  // Get Sunday of the week
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour} ${ampm}`;
}

function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours || '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes || '00'} ${ampm}`;
}

function getClassCardClasses(instance: ClassInstance) {
  const type = instance.class_type.toLowerCase();
  return {
    'cancelled-class': instance.is_cancelled,
    'class-gi': type.includes('gi') && !type.includes('no-gi'),
    'class-nogi': type.includes('no-gi'),
    'class-competition': type.includes('competition'),
    'class-openmat': type.includes('open mat'),
    'class-special': instance.event_type !== 'class'
  };
}

function getClassCardStyle(instance: ClassInstance) {
  // Calculate position based on start time
  const [startHour, startMinute] = instance.start_time.split(':').map(Number);
  const [endHour, endMinute] = instance.end_time.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const duration = endMinutes - startMinutes;
  
  // Position relative to 6 AM (6 * 60 = 360 minutes)
  const offsetMinutes = startMinutes - (6 * 60);
  const slotHeight = 60; // 60px per hour
  
  const top = (offsetMinutes / 60) * slotHeight;
  const height = (duration / 60) * slotHeight;
  
  return {
    top: `${top}px`,
    height: `${height}px`
  };
}

function previousWeek() {
  currentWeekStart.value = dateUtil.subtractFromDate(currentWeekStart.value, { days: 7 });
}

function nextWeek() {
  currentWeekStart.value = dateUtil.addToDate(currentWeekStart.value, { days: 7 });
}

function goToToday() {
  currentWeekStart.value = getWeekStart(new Date());
}

function handleSwipe(details: any) {
  if (details.direction === 'left') {
    nextWeek();
  } else if (details.direction === 'right') {
    previousWeek();
  }
}

function viewClassDetails(instance: ClassInstance) {
  emit('view-class', instance);
}

// Load instances when week changes
watch(currentWeekStart, async () => {
  const weekEnd = dateUtil.addToDate(currentWeekStart.value, { days: 6 });
  await fetchInstances(props.gymId, currentWeekStart.value, weekEnd);
}, { immediate: true });
</script>

<style scoped>
.week-grid-container {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 70vh;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
}

.week-grid {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  min-width: 800px;
}

.time-column {
  border-right: 2px solid #e0e0e0;
  background: #fafafa;
}

.time-header {
  height: 60px;
  border-bottom: 2px solid #e0e0e0;
}

.time-slot {
  height: 60px;
  padding: 4px 8px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 0.75rem;
  color: #666;
  text-align: right;
}

.day-column {
  border-right: 1px solid #e0e0e0;
  position: relative;
}

.day-column:last-child {
  border-right: none;
}

.today-column {
  background: linear-gradient(180deg, #E3F2FD 0%, #ffffff 60px);
}

.day-header {
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-bottom: 2px solid #e0e0e0;
  background: white;
}

.today-header {
  background: var(--q-primary);
  color: white;
}

.day-name {
  font-weight: 600;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.day-date {
  font-size: 1.2rem;
  font-weight: 700;
}

.time-slots-container {
  position: relative;
  height: calc(16 * 60px); /* 16 hours * 60px */
}

.time-slot-cell {
  height: 60px;
  border-bottom: 1px solid #f0f0f0;
}

.class-card {
  position: absolute;
  left: 4px;
  right: 4px;
  border-radius: 6px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  overflow: hidden;
  border-left: 4px solid;
}

.class-card:hover {
  transform: translateX(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 10;
}

.class-card-content {
  font-size: 0.75rem;
  line-height: 1.3;
}

.class-type {
  font-weight: 700;
  font-size: 0.85rem;
  margin-bottom: 2px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.class-time {
  font-weight: 500;
  margin-bottom: 2px;
}

.class-instructor,
.class-capacity {
  font-size: 0.7rem;
  opacity: 0.9;
}

/* Class type colors */
.class-gi {
  background: linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%);
  border-left-color: #FF9800;
  color: #E65100;
}

.class-nogi {
  background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
  border-left-color: #F44336;
  color: #B71C1C;
}

.class-competition {
  background: linear-gradient(135deg, #FFEBEE 0%, #EF9A9A 100%);
  border-left-color: #C62828;
  color: #B71C1C;
  font-weight: 600;
}

.class-openmat {
  background: linear-gradient(135deg, #FFF8E1 0%, #FFE082 100%);
  border-left-color: #FFA000;
  color: #FF6F00;
}

.class-special {
  background: linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%);
  border-left-color: #9C27B0;
  color: #4A148C;
}

.cancelled-class {
  opacity: 0.5;
  background: #f5f5f5 !important;
  text-decoration: line-through;
}

@media (max-width: 900px) {
  .week-grid {
    grid-template-columns: 60px repeat(7, 100px);
  }
  
  .time-slot {
    font-size: 0.65rem;
    padding: 2px 4px;
  }
  
  .class-card {
    padding: 4px;
  }
  
  .class-card-content {
    font-size: 0.65rem;
  }
  
  .class-type {
    font-size: 0.75rem;
  }
}
</style>

