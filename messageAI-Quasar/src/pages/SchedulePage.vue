<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h4">Class Schedule</div>
        
        <!-- Gym Filter Toggles -->
        <div v-if="gyms.length > 1" class="row q-gutter-sm items-center">
          <q-btn
            size="sm"
            outline
            color="primary"
            label="All Gyms"
            @click="selectAllGyms"
            :disable="loading"
          />
          <q-separator vertical inset />
          <q-checkbox
            v-for="gym in gyms"
            :key="gym.id"
            :model-value="isGymSelected(gym.id)"
            :label="gym.name"
            :color="getGymColor(gym.id)"
            @update:model-value="toggleGymFilter(gym.id)"
            dense
            :disable="loading"
          />
        </div>
      </div>

      <!-- No Gym Message -->
      <div v-if="gyms.length === 0 && !loading" class="text-center q-py-xl">
        <q-icon name="event_busy" size="64px" color="grey-5" class="q-mb-md" />
        <div class="text-h6 text-grey-6">No Gym Enrolled</div>
        <div class="text-body2 text-grey-7 q-mt-sm">
          Join a gym to view the class schedule
        </div>
      </div>

      <!-- Loading State -->
      <div v-else-if="loading" class="text-center q-py-xl">
        <q-spinner-dots size="64px" color="primary" />
        <div class="text-body1 text-grey-6 q-mt-md">Loading schedules...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center q-py-xl">
        <q-icon name="error_outline" size="64px" color="negative" class="q-mb-md" />
        <div class="text-h6 text-negative">Error Loading Schedule</div>
        <div class="text-body2 text-grey-7 q-mt-sm">{{ error }}</div>
        <q-btn
          color="primary"
          label="Retry"
          @click="loadSchedules"
          class="q-mt-md"
        />
      </div>

      <!-- Multi-Gym Schedule Calendar -->
      <div v-else-if="filteredSchedules.length > 0">
        <div class="q-mb-sm text-caption text-grey-7">
          Showing {{ filteredSchedules.length }} classes from {{ selectedGymIds.length }} gym(s)
        </div>
        
        <!-- Schedule List (grouped by day) -->
        <div class="q-gutter-md">
          <div v-for="day in daysOfWeek" :key="day" class="q-mb-md">
            <div class="text-h6 text-weight-medium q-mb-sm">{{ day }}</div>
            <q-list bordered separator>
              <q-item
                v-for="schedule in getSchedulesForDay(day)"
                :key="schedule.id"
                clickable
                v-ripple
              >
                <q-item-section avatar>
                  <q-avatar
                    :color="getGymColor(schedule.gym_id)"
                    text-color="white"
                    size="48px"
                  >
                    {{ schedule.start_time }}
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ schedule.class_type }} - {{ schedule.age_group }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ schedule.start_time }} - {{ schedule.end_time }}
                  </q-item-label>
                  <q-item-label caption class="text-grey-7">
                    <q-icon name="place" size="xs" /> {{ schedule.gym_name }}
                    <span v-if="schedule.instructor_name" class="q-ml-sm">
                      <q-icon name="person" size="xs" /> {{ schedule.instructor_name }}
                    </span>
                  </q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-badge
                    :color="getSkillLevelColor(schedule.skill_level)"
                    :label="schedule.skill_level"
                  />
                </q-item-section>
              </q-item>
              
              <!-- No classes for this day -->
              <q-item v-if="getSchedulesForDay(day).length === 0">
                <q-item-section>
                  <q-item-label class="text-grey-6 text-center">
                    No classes scheduled
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </div>

      <!-- No Filtered Results -->
      <div v-else class="text-center q-py-xl">
        <q-icon name="filter_list_off" size="64px" color="grey-5" class="q-mb-md" />
        <div class="text-h6 text-grey-6">No Classes Match Your Filters</div>
        <div class="text-body2 text-grey-7 q-mt-sm">
          Try selecting different gyms
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSchedule } from '../composables/useMultiGymSchedule'

const {
  filteredSchedules,
  gyms,
  loading,
  error,
  selectedGymIds,
  fetchSchedules,
  toggleGymFilter,
  selectAllGyms,
  isGymSelected
} = useSchedule()

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Gym colors for visual distinction
const gymColors = ['primary', 'secondary', 'accent', 'positive', 'warning', 'info']

function getGymColor(gymId: string): string {
  const index = gyms.value.findIndex(g => g.id === gymId)
  return gymColors[index % gymColors.length] || 'primary'
}

function getSkillLevelColor(level: string | null | undefined): string {
  if (!level) return 'grey'
  switch (level.toLowerCase()) {
    case 'fundamentals':
      return 'positive'
    case 'all_levels':
    case 'all levels':
      return 'info'
    case 'advanced':
      return 'warning'
    default:
      return 'grey'
  }
}

function getSchedulesForDay(day: string) {
  return filteredSchedules.value
    .filter(s => s.day_of_week.toLowerCase() === day.toLowerCase())
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
}

async function loadSchedules() {
  try {
    // TODO: Check gym settings to see if instructor names should be shown
    // For now, default to showing them
    await fetchSchedules({ showInstructorNames: true })
  } catch (err) {
    console.error('Failed to load schedules:', err)
  }
}

onMounted(() => {
  void loadSchedules()
})
</script>

