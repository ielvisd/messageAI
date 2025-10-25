<template>
  <q-page class="q-pa-md">
    <div class="text-h4 q-mb-md">My Training Dashboard</div>

    <!-- Quick Actions -->
    <div class="row q-gutter-md q-mb-lg">
      <q-btn
        color="primary"
        label="Check In"
        icon="qr_code_scanner"
        size="lg"
        @click="$router.push('/check-in')"
        class="col"
      />
      <q-btn
        outline
        color="secondary"
        label="Schedule"
        icon="calendar_today"
        size="lg"
        @click="$router.push('/schedule')"
        class="col"
      />
    </div>

    <!-- My Upcoming Classes -->
    <q-card v-if="upcomingRSVPs.length > 0" class="q-mb-md">
      <q-card-section>
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h6">My Upcoming Classes</div>
          <q-btn
            flat
            dense
            label="View All"
            color="primary"
            @click="$router.push('/schedule')"
          />
        </div>

        <q-list separator>
          <q-item v-for="rsvp in upcomingRSVPs" :key="rsvp.id">
            <q-item-section avatar>
              <q-avatar
                :color="getClassTypeColor(rsvp.gym_schedules?.class_type)"
                text-color="white"
                size="48px"
              >
                {{ getClassEmoji(rsvp.gym_schedules?.class_type) }}
              </q-avatar>
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-weight-medium">
                {{ rsvp.gym_schedules?.class_type?.toUpperCase() || 'Class' }}
              </q-item-label>
              <q-item-label caption>
                {{ formatRSVPDate(rsvp.rsvp_date) }} · 
                {{ formatTime(rsvp.gym_schedules?.start_time) }}
              </q-item-label>
              <q-item-label caption v-if="rsvp.gym_schedules?.instructor_name">
                Instructor: {{ rsvp.gym_schedules.instructor_name }}
              </q-item-label>
            </q-item-section>

            <q-item-section side>
              <div class="column items-end q-gutter-xs">
                <q-badge
                  :color="rsvp.status === 'confirmed' ? 'positive' : 'warning'"
                  :label="rsvp.status.toUpperCase()"
                />
                <q-btn
                  flat
                  dense
                  size="sm"
                  label="Cancel"
                  color="negative"
                  @click="handleCancelRSVP(rsvp.id)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Belt Display -->
    <q-card v-if="beltInfo" class="q-mb-md bg-gradient-primary text-white">
      <q-card-section class="row items-center q-pa-md">
        <!-- Belt Visual Representation -->
        <div class="belt-icon q-mr-md">
          <div 
            class="belt-rectangle"
            :style="{ backgroundColor: getBeltHexColor(currentBelt?.beltColor || 'white') }"
          >
            <q-icon 
              v-for="n in (currentBelt?.stripes || 0)" 
              :key="n" 
              name="remove" 
              size="12px" 
              color="white"
              class="stripe-icon"
            />
          </div>
        </div>
        <div class="col">
          <div class="text-subtitle1 text-weight-bold">{{ capitalize(currentBelt?.beltColor || 'white') }} Belt</div>
          <div class="text-caption">
            {{ currentBelt?.stripes || 0 }} stripe{{ (currentBelt?.stripes || 0) !== 1 ? 's' : '' }}
          </div>
          <div class="text-caption q-mt-xs">{{ daysAtBelt }} days at current belt</div>
        </div>
        <q-btn
          flat
          round
          icon="history"
          color="white"
          @click="showBeltHistory = true"
        />
      </q-card-section>
    </q-card>

    <!-- Attendance Stats -->
    <q-card v-if="stats" class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">This Month's Stats</div>
        
        <div class="row q-col-gutter-md">
          <div class="col-6 col-sm-3">
            <q-card flat bordered>
              <q-card-section class="text-center q-pa-md">
                <div class="text-h5 text-primary q-mb-xs">{{ stats.totalClasses }}</div>
                <div class="text-caption text-grey-7">Classes</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-6 col-sm-3">
            <q-card flat bordered>
              <q-card-section class="text-center q-pa-md">
                <div class="text-h5 text-secondary q-mb-xs">{{ stats.totalHours }}</div>
                <div class="text-caption text-grey-7">Hours</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-6 col-sm-3">
            <q-card flat bordered>
              <q-card-section class="text-center q-pa-md">
                <div class="text-h5 text-positive q-mb-xs">{{ stats.currentStreak }}</div>
                <div class="text-caption text-grey-7">Day Streak</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-6 col-sm-3">
            <q-card flat bordered>
              <q-card-section class="text-center q-pa-md">
                <div class="text-h5 text-orange q-mb-xs">{{ stats.giClasses + stats.nogiClasses }}</div>
                <div class="text-caption text-grey-7">Total</div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Class Breakdown -->
    <q-card v-if="stats" class="q-mb-md">
      <q-card-section>
        <div class="text-h6 q-mb-md">Class Breakdown</div>
        
        <div class="row q-col-gutter-md">
          <div class="col-6">
            <div class="text-center">
              <q-circular-progress
                :value="giPercentage"
                size="120px"
                :thickness="0.15"
                color="primary"
                track-color="grey-3"
                class="q-ma-md"
              >
                <div class="text-h6">{{ stats.giClasses }}</div>
                <div class="text-caption">GI</div>
              </q-circular-progress>
            </div>
          </div>
          <div class="col-6">
            <div class="text-center">
              <q-circular-progress
                :value="nogiPercentage"
                size="120px"
                :thickness="0.15"
                color="secondary"
                track-color="grey-3"
                class="q-ma-md"
              >
                <div class="text-h6">{{ stats.nogiClasses }}</div>
                <div class="text-caption">NO-GI</div>
              </q-circular-progress>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Recent Attendance -->
    <q-card>
      <q-card-section>
        <div class="text-h6 q-mb-md">Recent Classes</div>
        
        <q-list v-if="recentAttendance.length > 0" separator>
          <q-item v-for="attendance in recentAttendance" :key="attendance.id" class="column items-stretch">
            <div class="row items-center full-width">
              <q-item-section avatar>
                <q-icon 
                  :name="attendance.check_in_method === 'qr_code' ? 'qr_code' : 'check'" 
                  :color="attendance.check_in_method === 'qr_code' ? 'primary' : 'secondary'" 
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>
                  {{ attendance.gym_schedules?.class_type || 'Class' }}
                  <q-icon 
                    v-if="attendance.student_notes" 
                    name="note" 
                    size="xs" 
                    color="primary" 
                    class="q-ml-xs"
                  >
                    <q-tooltip>Has notes</q-tooltip>
                  </q-icon>
                </q-item-label>
                <q-item-label caption>
                  {{ formatDate(attendance.check_in_time) }} · 
                  {{ formatTime(attendance.gym_schedules?.start_time) }}
                  <span v-if="attendance.gym_schedules"> · {{ normalizeLevel(attendance.gym_schedules) }}</span>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="column items-end q-gutter-xs">
                  <q-chip 
                    :color="attendance.gym_schedules?.class_type === 'GI' ? 'primary' : 'secondary'" 
                    text-color="white"
                    size="sm"
                  >
                    {{ attendance.gym_schedules?.class_type }}
                  </q-chip>
                  <q-btn
                    flat
                    dense
                    size="sm"
                    :icon="attendance.student_notes ? 'edit_note' : 'add_note'"
                    :label="attendance.student_notes ? 'Edit Note' : 'Add Note'"
                    color="primary"
                    @click="startEditingNote(attendance)"
                  />
                </div>
              </q-item-section>
            </div>

            <!-- Notes Display/Editor -->
            <div v-if="editingNoteId === attendance.id" class="q-mt-sm q-pl-lg">
              <q-input
                v-model="noteText"
                type="textarea"
                label="Personal Notes"
                placeholder="Add personal notes about this class..."
                outlined
                dense
                :rows="3"
                :maxlength="1000"
                counter
                autofocus
              />
              <div class="row q-gutter-sm q-mt-xs">
                <q-btn
                  label="Save"
                  color="primary"
                  size="sm"
                  :loading="savingNote"
                  @click="saveNote(attendance.id)"
                />
                <q-btn
                  label="Cancel"
                  color="grey"
                  flat
                  size="sm"
                  @click="cancelEditingNote"
                />
              </div>
            </div>
            <div v-else-if="attendance.student_notes" class="q-mt-sm q-pl-lg">
              <div class="text-body2 text-grey-8 bg-grey-2 q-pa-sm rounded-borders">
                {{ attendance.student_notes }}
              </div>
            </div>
          </q-item>
        </q-list>

        <div v-else class="text-center text-grey-6 q-py-lg">
          <q-icon name="event_busy" size="48px" />
          <div class="q-mt-sm">No recent attendance</div>
          <q-btn 
            flat 
            color="primary" 
            label="Check In Now" 
            @click="$router.push('/check-in')"
            class="q-mt-sm"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Belt History Dialog -->
    <q-dialog v-model="showBeltHistory">
      <q-card style="min-width: 350px;">
        <q-card-section>
          <div class="text-h6">Belt Progression History</div>
        </q-card-section>

        <q-card-section v-if="beltHistory.length > 0">
          <q-timeline color="primary">
            <q-timeline-entry
              v-for="promo in beltHistory"
              :key="promo.id"
              :title="`${capitalize(promo.beltColor)} Belt`"
              :subtitle="`${promo.stripes} stripe${promo.stripes !== 1 ? 's' : ''}`"
              icon="military_tech"
            >
              <div class="text-caption">{{ formatDate(promo.awardedDate) }}</div>
              <div class="text-caption text-grey-7">Awarded by {{ promo.awardedByName }}</div>
              <div v-if="promo.notes" class="text-body2 q-mt-xs">{{ promo.notes }}</div>
            </q-timeline-entry>
          </q-timeline>
        </q-card-section>

        <q-card-section v-else class="text-center text-grey-6">
          <div>No belt progression history yet</div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAttendance } from '../composables/useAttendance'
import { useBeltProgression } from '../composables/useBeltProgression'
import { useRSVP } from '../composables/useRSVP'
import { user, profile } from '../state/auth'
import { Notify, Loading } from 'quasar'

const router = useRouter()
const { getMyAttendance, getAttendanceStats, updateAttendanceNotes } = useAttendance()
const { getCurrentBelt, getBeltHistory, getBeltDisplay, getDaysAtBelt } = useBeltProgression()
const { rsvps, fetchUserRSVPs, cancelRSVP } = useRSVP()

const stats = ref<any>(null)
const recentAttendance = ref<any[]>([])
const beltInfo = ref<any>(null)
const currentBelt = ref<{ beltColor: string; stripes: number } | null>(null)
const beltHistory = ref<any[]>([])
const daysAtBelt = ref(0)
const showBeltHistory = ref(false)
const editingNoteId = ref<string | null>(null)
const noteText = ref('')
const savingNote = ref(false)

const gymId = computed(() => profile.value?.gym_id || null)
const userId = computed(() => user.value?.id)

// Upcoming RSVPs (limit to next 5)
const upcomingRSVPs = computed(() => {
  const now = new Date()
  return rsvps.value
    .filter(rsvp => new Date(rsvp.rsvp_date) >= now)
    .slice(0, 5)
})

const giPercentage = computed(() => {
  if (!stats.value) return 0
  const total = stats.value.giClasses + stats.value.nogiClasses
  return total > 0 ? (stats.value.giClasses / total) * 100 : 0
})

const nogiPercentage = computed(() => {
  if (!stats.value) return 0
  const total = stats.value.giClasses + stats.value.nogiClasses
  return total > 0 ? (stats.value.nogiClasses / total) * 100 : 0
})

async function loadDashboard() {
  if (!userId.value || !gymId.value) {
    Notify.create({
      type: 'warning',
      message: 'Please join a gym first'
    })
    return
  }

  try {
    Loading.show({ message: 'Loading your dashboard...' })

    // Load stats
    const statsData = await getAttendanceStats(
      userId.value,
      gymId.value,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      new Date()
    )
    stats.value = statsData

    // Load recent attendance
    const attendance = await getMyAttendance(gymId.value)
    recentAttendance.value = attendance.slice(0, 10)

    // Load belt info
    const belt = await getCurrentBelt(userId.value)
    currentBelt.value = belt  // Store the actual belt data
    beltInfo.value = getBeltDisplay(belt.beltColor, belt.stripes)

    // Load days at belt
    daysAtBelt.value = await getDaysAtBelt(userId.value)

    // Load belt history
    const history = await getBeltHistory(userId.value)
    beltHistory.value = history

    // Load upcoming RSVPs
    if (userId.value) {
      await fetchUserRSVPs(userId.value)
    }

  } catch (err) {
    console.error('Error loading dashboard:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to load dashboard data'
    })
  } finally {
    Loading.hide()
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatTime(time: string): string {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getBeltHexColor(beltColor: string): string {
  const colors: Record<string, string> = {
    white: '#FFFFFF',
    blue: '#2196F3',
    purple: '#9C27B0',
    brown: '#795548',
    black: '#000000'
  }
  return colors[beltColor] || '#FFFFFF'
}

function getClassTypeColor(classType: string | undefined): string {
  const colors: Record<string, string> = {
    'GI': 'primary',
    'NO-GI': 'secondary',
    'WRESTLING': 'orange',
    'MMA': 'red',
    'CARDIO': 'pink',
    'OPEN MAT': 'purple'
  }
  return colors[classType?.toUpperCase() || ''] || 'primary'
}

function getClassEmoji(classType: string | undefined): string {
  const emojis: Record<string, string> = {
    'GI': '🥋',
    'NO-GI': '🤼',
    'WRESTLING': '🤼‍♂️',
    'MMA': '🥊',
    'CARDIO': '💪',
    'OPEN MAT': '🏃'
  }
  return emojis[classType?.toUpperCase() || ''] || '🥋'
}

function formatRSVPDate(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }
}

async function handleCancelRSVP(rsvpId: string) {
  const confirmed = confirm('Cancel your RSVP for this class?')
  if (!confirmed) return

  try {
    const { error } = await cancelRSVP(rsvpId)
    if (error) throw error
    
    Notify.create({
      type: 'positive',
      message: 'RSVP canceled successfully'
    })
  } catch (err) {
    console.error('Error canceling RSVP:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to cancel RSVP'
    })
  }
}

function startEditingNote(attendance: any) {
  editingNoteId.value = attendance.id
  noteText.value = attendance.student_notes || ''
}

function cancelEditingNote() {
  editingNoteId.value = null
  noteText.value = ''
}

async function saveNote(attendanceId: string) {
  savingNote.value = true
  
  try {
    const result = await updateAttendanceNotes(attendanceId, noteText.value)
    
    if (result.success) {
      // Update the local attendance record
      const attendance = recentAttendance.value.find(a => a.id === attendanceId)
      if (attendance) {
        attendance.student_notes = noteText.value
      }
      
      Notify.create({
        type: 'positive',
        message: 'Note saved successfully'
      })
      
      cancelEditingNote()
    } else {
      throw new Error(result.error || 'Failed to save note')
    }
  } catch (err) {
    console.error('Error saving note:', err)
    Notify.create({
      type: 'negative',
      message: (err as Error).message || 'Failed to save note'
    })
  } finally {
    savingNote.value = false
  }
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

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.bg-gradient-primary {
  background: linear-gradient(135deg, var(--q-primary) 0%, var(--q-secondary) 100%);
}

.belt-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.belt-rectangle {
  width: 60px;
  height: 40px;
  border-radius: 4px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.stripe-icon {
  margin: 0 2px;
}
</style>

