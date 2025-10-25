<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h4">Class Rosters</div>
        <q-btn
          icon="refresh"
          label="Refresh"
          color="primary"
          outline
          @click="loadRosters"
          :loading="loading"
        />
      </div>

      <!-- Date Range Filter -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-4">
            <q-input
              v-model="dateRange.start"
              type="date"
              label="Start Date"
              outlined
              dense
            />
          </div>
          <div class="col-12 col-md-4">
            <q-input
              v-model="dateRange.end"
              type="date"
              label="End Date"
              outlined
              dense
            />
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="classTypeFilter"
              :options="classTypeOptions"
              label="Class Type"
              outlined
              dense
              clearable
            />
          </div>
        </q-card-section>
      </q-card>

      <!-- Loading State -->
      <div v-if="loading" class="text-center q-py-xl">
        <q-spinner-dots size="64px" color="primary" />
        <div class="text-body1 text-grey-6 q-mt-md">Loading rosters...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center q-py-xl">
        <q-icon name="error_outline" size="64px" color="negative" class="q-mb-md" />
        <div class="text-h6 text-negative">Error Loading Rosters</div>
        <div class="text-body2 text-grey-7 q-mt-sm">{{ error }}</div>
        <q-btn
          color="primary"
          label="Retry"
          @click="loadRosters"
          class="q-mt-md"
        />
      </div>

      <!-- Roster Cards -->
      <div v-else-if="filteredRosters.length > 0" class="q-gutter-md">
        <q-card v-for="roster in filteredRosters" :key="roster.scheduleId" bordered>
          <q-card-section>
            <div class="row items-center justify-between">
              <div>
                <div class="text-h6">{{ roster.className }}</div>
                <div class="text-caption text-grey-7">
                  {{ roster.dayOfWeek }} · {{ formatTime(roster.startTime) }} - {{ formatTime(roster.endTime) }}
                </div>
                <div class="text-caption text-grey-7">
                  Instructor: {{ roster.instructorName }}
                </div>
              </div>
              <q-chip
                :color="getClassTypeColor(roster.classType)"
                text-color="white"
                size="md"
              >
                {{ roster.classType }}
              </q-chip>
            </div>
          </q-card-section>

          <q-separator />

          <!-- Occurrences -->
          <q-card-section>
            <div v-for="occurrence in roster.occurrences" :key="occurrence.date" class="q-mb-md">
              <div class="row items-center q-mb-sm">
                <q-icon name="event" class="q-mr-sm" />
                <span class="text-weight-medium">{{ formatDate(occurrence.date) }}</span>
                <q-space />
                <q-chip size="sm" color="positive" text-color="white">
                  {{ occurrence.confirmedCount }} confirmed
                </q-chip>
                <q-chip v-if="occurrence.waitlistCount > 0" size="sm" color="warning" text-color="white" class="q-ml-xs">
                  {{ occurrence.waitlistCount }} waitlist
                </q-chip>
              </div>

              <!-- Student List -->
              <q-list v-if="occurrence.rsvps.length > 0" bordered separator dense>
                <q-item v-for="rsvp in occurrence.rsvps" :key="rsvp.id">
                  <q-item-section avatar>
                    <q-avatar
                      :color="rsvp.status === 'confirmed' ? 'positive' : 'warning'"
                      text-color="white"
                      size="32px"
                    >
                      {{ rsvp.userName.charAt(0).toUpperCase() }}
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ rsvp.userName }}</q-item-label>
                    <q-item-label caption>{{ rsvp.userEmail }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge
                      :color="rsvp.status === 'confirmed' ? 'positive' : 'warning'"
                      :label="rsvp.status.toUpperCase()"
                    />
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      flat
                      round
                      dense
                      icon="chat"
                      color="primary"
                      @click="messageStudent(rsvp.userId)"
                    >
                      <q-tooltip>Message Student</q-tooltip>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-list>

              <!-- No RSVPs -->
              <div v-else class="text-center text-grey-6 q-pa-sm">
                <q-icon name="people_outline" size="sm" />
                <span class="q-ml-xs">No RSVPs yet</span>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center q-py-xl">
        <q-icon name="people_outline" size="64px" color="grey-5" class="q-mb-md" />
        <div class="text-h6 text-grey-6">No Rosters Found</div>
        <div class="text-body2 text-grey-7 q-mt-sm">
          No upcoming classes with RSVPs in the selected date range
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useClassRoster, type ClassRosterData } from '../composables/useClassRoster'
import { useRoles } from '../composables/useRoles'
import { user, profile } from '../state/auth'
import { Notify } from 'quasar'

const router = useRouter()
const { getInstructorRosters, getAllGymRosters, loading, error } = useClassRoster()
const { isOwner } = useRoles()

const rosters = ref<ClassRosterData[]>([])
const dateRange = ref({
  start: new Date().toISOString().split('T')[0],
  end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
})
const classTypeFilter = ref<string | null>(null)

const classTypeOptions = ['GI', 'NO-GI', 'WRESTLING', 'MMA', 'CARDIO', 'OPEN MAT']

const gymId = computed(() => (profile.value as any)?.gym_id || '')
const userId = computed(() => user.value?.id || '')

// Filter rosters by date range and class type
const filteredRosters = computed(() => {
  return rosters.value
    .map(roster => ({
      ...roster,
      occurrences: roster.occurrences.filter(occ => {
        const occDate = new Date(occ.date)
        const startDate = new Date(dateRange.value.start)
        const endDate = new Date(dateRange.value.end)
        return occDate >= startDate && occDate <= endDate
      })
    }))
    .filter(roster => {
      // Filter by class type if selected
      if (classTypeFilter.value && roster.classType !== classTypeFilter.value) {
        return false
      }
      // Only include rosters with occurrences in date range
      return roster.occurrences.length > 0
    })
})

async function loadRosters() {
  if (!gymId.value) {
    Notify.create({
      type: 'warning',
      message: 'No gym found'
    })
    return
  }

  try {
    if (isOwner.value) {
      // Owners can see all rosters
      rosters.value = await getAllGymRosters(gymId.value)
    } else {
      // Instructors see only their own classes
      rosters.value = await getInstructorRosters(userId.value, gymId.value)
    }
  } catch (err) {
    console.error('Error loading rosters:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to load rosters'
    })
  }
}

function formatTime(time: string): string {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function getClassTypeColor(classType: string): string {
  const colors: Record<string, string> = {
    'GI': 'primary',
    'NO-GI': 'secondary',
    'WRESTLING': 'orange',
    'MMA': 'red',
    'CARDIO': 'pink',
    'OPEN MAT': 'purple'
  }
  return colors[classType] || 'grey'
}

async function messageStudent(studentId: string) {
  // Navigate to create a direct message with the student
  try {
    // TODO: Implement direct chat creation/navigation
    // For now, just navigate to chats page
    await router.push('/chats')
    Notify.create({
      type: 'info',
      message: 'Find the student in your chats or create a new conversation'
    })
  } catch (err) {
    console.error('Error navigating to chat:', err)
  }
}

onMounted(() => {
  loadRosters()
})
</script>

<style scoped>
/* Add any custom styles here */
</style>

