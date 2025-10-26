<template>
  <q-dialog v-model="model">
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">{{ schedule?.class_type?.toUpperCase() }} Class</div>
        <div class="text-subtitle2 text-grey-7">{{ schedule?.day_of_week }}</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-list>
          <q-item>
            <q-item-section avatar>
              <q-icon name="schedule" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ formatTime(schedule?.start_time) }} - {{ formatTime(schedule?.end_time) }}</q-item-label>
              <q-item-label caption>Time</q-item-label>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section avatar>
              <q-icon name="person" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ schedule?.instructor_name }}</q-item-label>
              <q-item-label caption>Instructor</q-item-label>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section avatar>
              <q-icon name="place" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ schedule?.gym_location }}</q-item-label>
              <q-item-label caption>Location</q-item-label>
            </q-item-section>
          </q-item>

          <q-item>
            <q-item-section avatar>
              <q-icon name="bar_chart" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ normalizeLevel(schedule) }}</q-item-label>
              <q-item-label caption>Level</q-item-label>
            </q-item-section>
          </q-item>

          <q-item v-if="schedule?.max_capacity">
            <q-item-section avatar>
              <q-icon name="people" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ schedule?.current_rsvps }}/{{ schedule?.max_capacity }}</q-item-label>
              <q-item-label caption>Capacity</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <!-- Instructor Assignment Section (Owners only) -->
      <q-card-section v-if="isOwner">
        <q-expansion-item
          v-model="showInstructorAssignment"
          icon="person_add"
          label="Assign Instructor"
          header-class="text-primary"
          :default-opened="!schedule?.instructor_id"
        >
          <q-card>
            <q-card-section>
              <!-- Current Instructor -->
              <div v-if="schedule?.instructor_name" class="q-mb-md">
                <div class="text-subtitle2 text-grey-7 q-mb-xs">Current Instructor</div>
                <q-chip
                  removable
                  @remove="handleUnassignInstructor"
                  color="primary"
                  text-color="white"
                  icon="person"
                >
                  {{ schedule.instructor_name }}
                </q-chip>
              </div>

              <!-- Loading State -->
              <div v-if="instructorLoading" class="text-center q-pa-md">
                <q-spinner color="primary" size="2em" />
              </div>

              <!-- Instructor Selection -->
              <div v-else>
                <q-select
                  v-model="selectedInstructor"
                  :options="availableInstructors"
                  label="Select Instructor"
                  option-label="name"
                  option-value="id"
                  emit-value
                  map-options
                  clearable
                  outlined
                  dense
                  class="q-mb-md"
                >
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section avatar>
                        <q-avatar color="primary" text-color="white">
                          {{ scope.opt.name.charAt(0) }}
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ scope.opt.name }}</q-item-label>
                        <q-item-label caption>{{ scope.opt.email }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>

                <q-btn
                  v-if="selectedInstructor && selectedInstructor !== schedule?.instructor_id"
                  label="Assign Instructor"
                  icon="check"
                  color="primary"
                  @click="handleAssignInstructor"
                  :loading="instructorLoading"
                  class="full-width"
                />

                <!-- Empty State -->
                <div v-if="availableInstructors.length === 0" class="text-center text-grey-6 q-pa-md">
                  <q-icon name="person_off" size="3em" class="q-mb-sm" />
                  <div class="text-body2">No instructors available</div>
                  <div class="text-caption">Add instructors to your gym first</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </q-card-section>

      <!-- Class Roster Section (Instructors/Admins only) -->
      <q-card-section v-if="canViewRoster">
        <q-expansion-item
          v-model="showRoster"
          icon="people"
          label="Class Roster"
          @show="loadRoster"
        >
          <q-card>
            <q-card-section>
              <!-- Loading State -->
              <div v-if="rosterLoading" class="text-center q-pa-md">
                <q-spinner color="primary" size="2em" />
              </div>

              <!-- Roster List -->
              <q-list v-else-if="rosterEntries.length > 0" separator>
                <q-item v-for="entry in rosterEntries" :key="entry.id">
                  <q-item-section avatar>
                    <q-avatar :color="entry.status === 'confirmed' ? 'positive' : 'warning'" text-color="white">
                      {{ entry.userName.charAt(0).toUpperCase() }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ entry.userName }}</q-item-label>
                    <q-item-label caption>{{ entry.userEmail }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge
                      :color="entry.status === 'confirmed' ? 'positive' : 'warning'"
                      :label="entry.status.toUpperCase()"
                    />
                  </q-item-section>
                </q-item>
              </q-list>

              <!-- Empty State -->
              <div v-else class="text-center text-grey-6 q-pa-md">
                <q-icon name="people_outline" size="3em" class="q-mb-sm" />
                <div class="text-body2">No RSVPs yet for this class</div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </q-card-section>

      <q-card-actions align="right">
        <!-- Edit/Cancel/Delete Buttons for Owners/Instructors -->
        <q-btn
          v-if="canEdit"
          label="Edit"
          icon="edit"
          flat
          color="primary"
          @click="handleEdit"
        />
        
        <q-btn
          v-if="canEdit && !schedule?.is_cancelled"
          label="Cancel Class"
          icon="event_busy"
          flat
          color="warning"
          @click="handleCancel"
        />
        
        <q-btn
          v-if="canEdit && schedule?.is_cancelled"
          label="Restore Class"
          icon="event_available"
          flat
          color="positive"
          @click="handleUncancel"
        />
        
        <q-btn
          v-if="canEdit"
          label="Delete"
          icon="delete"
          flat
          color="negative"
          @click="handleDelete"
        />
        
        <q-space />
        
        <q-btn
          v-if="canCheckIn"
          label="Check In"
          icon="qr_code_scanner"
          color="primary"
          outline
          @click="goToCheckIn"
        />

        <!-- Show ineligibility message -->
        <div v-if="!classEligibility.eligible && schedule && !isOwner" class="text-caption text-negative q-mr-md">
          {{ classEligibility.reason }}
        </div>

        <!-- Owners can RSVP to classes, but not if cancelled -->
        <RsvpButton
          v-if="((canRsvp && schedule && classEligibility.eligible) || (isOwner && schedule)) && !schedule?.is_cancelled"
          :schedule-id="schedule.id"
          :rsvp-date="nextClassDate"
        />

        <q-btn flat label="Close" color="grey" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import RsvpButton from './RsvpButton.vue'
import { useClassEligibility } from '../composables/useClassEligibility'
import { useClassRoster } from '../composables/useClassRoster'
import { useRoles } from '../composables/useRoles'
import { useInstructorAssignment, type Instructor } from '../composables/useInstructorAssignment'
import { user } from '../state/auth'

const props = defineProps<{
  modelValue: boolean
  schedule: any | null
  canRsvp?: boolean
}>()

const emit = defineEmits<{ 
  (e: 'update:modelValue', value: boolean): void
  (e: 'instructorAssigned'): void
  (e: 'edit', schedule: any): void
  (e: 'cancel', schedule: any): void
  (e: 'uncancel', schedule: any): void
  (e: 'delete', schedule: any): void
}>()

const router = useRouter()
const $q = useQuasar()
const { canRSVPForClass } = useClassEligibility()
const { getClassRoster, loading: rosterLoading } = useClassRoster()
const { isInstructor, isOwner, currentRole } = useRoles()
const {
  loading: instructorLoading,
  getGymInstructors,
  assignInstructor,
  unassignInstructor
} = useInstructorAssignment()

// Debug: Log role status
console.log('🔍 ClassDetailsDialog - Role check:', {
  isOwner: isOwner.value,
  isInstructor: isInstructor.value,
  currentRole: currentRole.value,
  userId: user.value?.id
})

const showRoster = ref(false)
const rosterEntries = ref<any[]>([])
const showInstructorAssignment = ref(false)
const availableInstructors = ref<Instructor[]>([])
const selectedInstructor = ref<string | null>(null)

const canViewRoster = computed(() => isInstructor.value || isOwner.value)

const canEdit = computed(() => {
  if (!props.schedule) return false
  if (isOwner.value) return true
  if (isInstructor.value && props.schedule.instructor_id === user.value?.id) return true
  return false
})

const model = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const nextClassDate = computed(() => getNextClassDate(props.schedule?.day_of_week))

const classEligibility = computed(() => {
  if (!props.schedule) return { eligible: false }
  return canRSVPForClass(props.schedule)
})

const canCheckIn = computed(() => {
  if (!props.schedule) return false
  // Only allow check-in if the next occurrence is today and within ±30m of start
  const today = new Date()
  const nextDateStr = nextClassDate.value
  if (!nextDateStr) return false
  const isToday = nextDateStr === today.toISOString().split('T')[0]
  if (!isToday) return false
  return isWithinCheckInWindow(props.schedule)
})

function goToCheckIn() {
  void router.push('/check-in')
}

// Handler functions for edit/cancel/delete
function handleEdit() {
  emit('edit', props.schedule)
}

function handleCancel() {
  emit('cancel', props.schedule)
}

function handleUncancel() {
  emit('uncancel', props.schedule)
}

function handleDelete() {
  emit('delete', props.schedule)
}

function formatTime(time?: string | null) {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours || '0')
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes || '00'} ${ampm}`
}

function getNextClassDate(dayOfWeek?: string): string {
  if (!dayOfWeek) return ''
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

function isWithinCheckInWindow(schedule: any): boolean {
  if (!schedule?.start_time) return false
  const now = new Date()
  const start = new Date()
  const [h, m] = (schedule.start_time as string).split(':')
  start.setHours(parseInt(h), parseInt(m), 0, 0)
  const before = new Date(start.getTime() - 30 * 60 * 1000)
  const after = new Date(start.getTime() + 30 * 60 * 1000)
  return now >= before && now <= after
}

async function loadRoster() {
  if (!props.schedule?.id) return
  const date = nextClassDate.value
  if (!date) return
  
  rosterEntries.value = await getClassRoster(props.schedule.id, date)
}

async function loadInstructors() {
  const gymId = (user.value as any)?.gym_id
  if (!gymId) return
  
  availableInstructors.value = await getGymInstructors(gymId)
  
  // Set selected instructor if there's one already assigned
  if (props.schedule?.instructor_id) {
    selectedInstructor.value = props.schedule.instructor_id
  }
}

async function handleAssignInstructor() {
  if (!selectedInstructor.value || !props.schedule?.id) return
  
  const success = await assignInstructor(props.schedule.id, selectedInstructor.value)
  
  if (success) {
    $q.notify({
      type: 'positive',
      message: 'Instructor assigned successfully',
      position: 'top'
    })
    emit('instructorAssigned')
    // Close the expansion panel
    showInstructorAssignment.value = false
  } else {
    $q.notify({
      type: 'negative',
      message: 'Failed to assign instructor',
      position: 'top'
    })
  }
}

async function handleUnassignInstructor() {
  if (!props.schedule?.id) return
  
  $q.dialog({
    title: 'Unassign Instructor',
    message: 'Are you sure you want to unassign this instructor?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    const success = await unassignInstructor(props.schedule.id)
    
    if (success) {
      $q.notify({
        type: 'positive',
        message: 'Instructor unassigned successfully',
        position: 'top'
      })
      emit('instructorAssigned')
      selectedInstructor.value = null
    } else {
      $q.notify({
        type: 'negative',
        message: 'Failed to unassign instructor',
        position: 'top'
      })
    }
  })
}

// Watch for schedule changes to reset state
watch(() => props.schedule, () => {
  showRoster.value = false
  rosterEntries.value = []
  showInstructorAssignment.value = false
  selectedInstructor.value = props.schedule?.instructor_id || null
})

// Watch for dialog open to load instructors
watch(() => props.modelValue, (isOpen) => {
  if (isOpen && isOwner.value) {
    void loadInstructors()
  }
})
</script>


