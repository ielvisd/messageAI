<template>
  <q-page class="q-pa-lg">
    <div class="q-gutter-md">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h4">Class Schedule</div>
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

      <!-- Schedule Calendar View -->
      <div v-else>
        <ScheduleCalendar
          v-if="currentGymId"
          :gym-id="currentGymId"
          :editable="canManageSchedule"
          @edit-schedule="openEditDialogById"
          @create-schedule="openCreateDialog"
        />
        
        <!-- No Gym Selected -->
        <div v-else class="text-center q-py-xl">
          <q-icon name="event_busy" size="64px" color="grey-5" class="q-mb-md" />
          <div class="text-h6 text-grey-6">No Gym Selected</div>
          <div class="text-body2 text-grey-7 q-mt-sm">
            Select a gym to view the schedule
          </div>
        </div>
      </div>
    </div>
  </q-page>
  
  <!-- Class Details Dialog -->
  <ClassDetailsDialog
    :model-value="showDetails"
    :schedule="selectedSchedule"
    :can-rsvp="true"
    @update:modelValue="val => showDetails = val"
    @edit="openEditDialog(selectedSchedule)"
    @cancel="handleCancelClass"
    @uncancel="handleUncancelClass"
    @delete="handleDeleteClass"
  />
  
  <!-- Schedule Editor Dialog -->
  <ScheduleEditorDialog
    v-model="showEditor"
    :schedule="scheduleToEdit"
    :gym-id="currentGymId"
    @saved="handleScheduleSaved"
  />
</template>

<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { useSchedule } from '../composables/useMultiGymSchedule'
import { ref } from 'vue'
import ClassDetailsDialog from '../components/ClassDetailsDialog.vue'
import ScheduleEditorDialog from '../components/ScheduleEditorDialog.vue'
import ScheduleCalendar from '../components/ScheduleCalendar.vue'
import { useRSVP } from '../composables/useRSVP'
import { user, profile } from '../state/auth'
import { useRoles } from '../composables/useRoles'
import { useQuasar } from 'quasar'

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

const { rsvps, fetchUserRSVPs } = useRSVP()
const { isOwner, isInstructor, canEditSchedule: canEditScheduleRole } = useRoles()
const $q = useQuasar()

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const showDetails = ref(false)
const selectedSchedule = ref<any | null>(null)
const showEditor = ref(false)
const scheduleToEdit = ref<any | null>(null)

// Check if user can manage schedule
const canManageSchedule = computed(() => isOwner.value || isInstructor.value)

// Get current gym ID (use first selected gym or first gym)
const currentGymId = computed(() => {
  if (selectedGymIds.value.length > 0) {
    return selectedGymIds.value[0]
  }
  if (gyms.value.length > 0) {
    return gyms.value[0].id
  }
  return ''
})

// Check if user can edit a specific schedule
function canEditSchedule(schedule: any): boolean {
  if (!canManageSchedule.value) return false
  if (isOwner.value) return true
  if (isInstructor.value && schedule.instructor_id === user.value?.id) return true
  return false
}

// Gym colors for visual distinction
const gymColors = ['primary', 'secondary', 'accent', 'positive', 'warning', 'info']

// Map schedule IDs to RSVP status for quick lookup
const rsvpMap = computed(() => {
  const map = new Map<string, { status: string; rsvpDate: string; id: string }>()
  rsvps.value.forEach(rsvp => {
    map.set(`${rsvp.schedule_id}-${rsvp.rsvp_date}`, {
      status: rsvp.status,
      rsvpDate: rsvp.rsvp_date,
      id: rsvp.id
    })
  })
  return map
})

// Handle instructor assignment
async function handleInstructorAssigned() {
  // Refresh schedules to show updated instructor info
  await fetchSchedules()
}

// Get RSVP status for a schedule
function getRSVPStatus(schedule: any): { status: string; rsvpDate: string } | null {
  // Calculate next occurrence date
  const nextDate = getNextClassDate(schedule.day_of_week)
  const key = `${schedule.id}-${nextDate}`
  return rsvpMap.value.get(key) || null
}

// Helper to get next class date
function getNextClassDate(dayOfWeek: string): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const today = new Date()
  const dayIndex = days.indexOf(dayOfWeek)
  const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1
  let daysUntilClass = dayIndex - currentDayIndex
  if (daysUntilClass <= 0) daysUntilClass += 7
  const nextClass = new Date(today)
  nextClass.setDate(today.getDate() + daysUntilClass)
  return nextClass.toISOString().split('T')[0] || ''
}

function getGymColor(gymId: string): string {
  const index = gyms.value.findIndex(g => g.id === gymId)
  return gymColors[index % gymColors.length] || 'primary'
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

function getSkillLevelColor(schedule: any): string {
  const normalized = normalizeLevel(schedule)
  switch (normalized.toLowerCase()) {
    case 'fundamentals':
      return 'positive'
    case 'advanced':
      return 'warning'
    case 'competition':
      return 'deep-orange'
    case 'all levels':
      return 'info'
    default:
      return 'info' // Default to info (All Levels color)
  }
}

// Fun color and emoji mappings for class types and age groups
function getClassColor(schedule: any): string {
  const classType = schedule.class_type?.toLowerCase() || ''
  const notes = schedule.notes?.toLowerCase() || ''
  const level = schedule.level?.toLowerCase() || ''

  // Age group based colors with fun themes
  if (notes.includes('pee wee') || notes.includes('pee_wee')) {
    return 'orange-6' // Dinosaur theme - orange
  }
  if (notes.includes('kid') && !notes.includes('teen')) {
    // Vary by level
    if (level.includes('advanced')) return 'indigo-6'
    return 'blue-6' // Kids theme - blue
  }
  if (notes.includes('teen') && !notes.includes('adult')) {
    return 'purple-6' // Teens theme - purple
  }
  if (notes.includes('adult')) {
    // Vary by level
    if (level.includes('fundamentals')) return 'teal-6'
    if (level.includes('advanced')) return 'deep-orange-7'
    return 'green-7' // Adults theme - green
  }

  // Competition class
  if (classType.includes('competition')) {
    return 'red-9'
  }

  // Open mat
  if (classType.includes('open mat') || notes.includes('open mat')) {
    return 'amber-8'
  }

  // Class type fallback colors
  if (classType.includes('gi') && !classType.includes('no-gi')) {
    return 'blue-7'
  }
  if (classType.includes('no-gi') || classType.includes('no gi')) {
    return 'red-6'
  }

  return 'grey-6' // Default
}

function getClassEmoji(schedule: any): string {
  const notes = schedule.notes?.toLowerCase() || ''
  const classType = schedule.class_type?.toLowerCase() || ''
  const level = schedule.level?.toLowerCase() || ''

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

  // Adults - varied by level and class type
  if (notes.includes('adult')) {
    if (level.includes('fundamentals')) {
      return classType.includes('no-gi') ? '💪' : '📚'
    }
    if (level.includes('advanced')) {
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

  return parts.join(' - ') || 'Class'
}

function getSchedulesForDay(day: string) {
  return filteredSchedules.value
    .filter(s => s.day_of_week.toLowerCase() === day.toLowerCase())
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
}

function openDetails(schedule: any) {
  selectedSchedule.value = schedule
  showDetails.value = true
}

// Dialog handlers
function openCreateDialog() {
  scheduleToEdit.value = null
  showEditor.value = true
}

function openEditDialog(schedule: any) {
  scheduleToEdit.value = schedule
  showEditor.value = true
  showDetails.value = false
}

function openEditDialogById(scheduleId: string) {
  // Find schedule by ID and open edit dialog
  const schedule = filteredSchedules.value.find(s => s.id === scheduleId)
  if (schedule) {
    openEditDialog(schedule)
  }
}

async function handleScheduleSaved() {
  // Refresh schedules after save
  await loadSchedules()
  showEditor.value = false
}

async function handleCancelClass(schedule: any) {
  if (!schedule?.id) return
  
  $q.dialog({
    title: 'Cancel Class',
    message: `Cancel ${schedule.class_type} class on ${schedule.day_of_week}? The class will remain visible but marked as cancelled.`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      // Use supabase directly since multi-gym composable doesn't have cancel function
      const { supabase } = await import('../boot/supabase')
      const { error } = await supabase
        .from('gym_schedules')
        .update({ is_cancelled: true, updated_at: new Date().toISOString() })
        .eq('id', schedule.id)
      
      if (error) throw error
      
      $q.notify({
        type: 'positive',
        message: 'Class cancelled successfully'
      })
      
      await loadSchedules()
      showDetails.value = false
    } catch (err) {
      console.error('Error cancelling class:', err)
      $q.notify({
        type: 'negative',
        message: 'Failed to cancel class'
      })
    }
  })
}

async function handleUncancelClass(schedule: any) {
  if (!schedule?.id) return
  
  try {
    const { supabase } = await import('../boot/supabase')
    const { error } = await supabase
      .from('gym_schedules')
      .update({ is_cancelled: false, updated_at: new Date().toISOString() })
      .eq('id', schedule.id)
    
    if (error) throw error
    
    $q.notify({
      type: 'positive',
      message: 'Class restored successfully'
    })
    
    await loadSchedules()
    showDetails.value = false
  } catch (err) {
    console.error('Error restoring class:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to restore class'
    })
  }
}

async function handleDeleteClass(schedule: any) {
  if (!schedule?.id) return
  
  $q.dialog({
    title: 'Delete Class',
    message: `Permanently delete ${schedule.class_type} class on ${schedule.day_of_week}? This cannot be undone.`,
    cancel: true,
    persistent: true,
    color: 'negative'
  }).onOk(async () => {
    try {
      const { supabase } = await import('../boot/supabase')
      const { error } = await supabase
        .from('gym_schedules')
        .delete()
        .eq('id', schedule.id)
      
      if (error) throw error
      
      $q.notify({
        type: 'positive',
        message: 'Class deleted successfully'
      })
      
      await loadSchedules()
      showDetails.value = false
    } catch (err) {
      console.error('Error deleting class:', err)
      $q.notify({
        type: 'negative',
        message: 'Failed to delete class'
      })
    }
  })
}

async function loadSchedules() {
  try {
    // TODO: Check gym settings to see if instructor names should be shown
    // For now, default to showing them
    await fetchSchedules({ showInstructorNames: true })
    
    // Load user's RSVPs if logged in
    if (user.value?.id) {
      await fetchUserRSVPs(user.value.id)
    }
  } catch (err) {
    console.error('Failed to load schedules:', err)
  }
}

onMounted(() => {
  void loadSchedules()
})
</script>

<style scoped>
.class-avatar {
  font-size: 1.5em;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  border: 2px solid rgba(255,255,255,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.class-avatar :deep(.q-avatar__content) {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.cancelled-class {
  opacity: 0.6;
  background-color: #f5f5f5;
}

.text-strike {
  text-decoration: line-through;
}
</style>

