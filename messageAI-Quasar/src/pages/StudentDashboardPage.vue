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

    <!-- Belt Display -->
    <q-card v-if="beltInfo" class="q-mb-md bg-gradient-primary text-white">
      <q-card-section class="row items-center">
        <q-icon name="military_tech" size="48px" class="q-mr-md" />
        <div class="col">
          <div class="text-h6">{{ beltInfo.label }}</div>
          <div class="text-caption">{{ daysAtBelt }} days at current belt</div>
        </div>
        <q-btn
          flat
          round
          icon="history"
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
              <q-card-section class="text-center">
                <div class="text-h4 text-primary">{{ stats.totalClasses }}</div>
                <div class="text-caption">Classes</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-6 col-sm-3">
            <q-card flat bordered>
              <q-card-section class="text-center">
                <div class="text-h4 text-secondary">{{ stats.totalHours }}</div>
                <div class="text-caption">Hours</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-6 col-sm-3">
            <q-card flat bordered>
              <q-card-section class="text-center">
                <div class="text-h4 text-positive">{{ stats.currentStreak }}</div>
                <div class="text-caption">Day Streak</div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-6 col-sm-3">
            <q-card flat bordered>
              <q-card-section class="text-center">
                <div class="text-h4 text-orange">{{ stats.giClasses + stats.nogiClasses }}</div>
                <div class="text-caption">Total</div>
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
          <q-item v-for="attendance in recentAttendance" :key="attendance.id">
            <q-item-section avatar>
              <q-icon 
                :name="attendance.check_in_method === 'qr_code' ? 'qr_code' : 'check'" 
                :color="attendance.check_in_method === 'qr_code' ? 'primary' : 'secondary'" 
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ attendance.gym_schedules?.class_type || 'Class' }}</q-item-label>
              <q-item-label caption>
                {{ formatDate(attendance.check_in_time) }} · 
                {{ formatTime(attendance.gym_schedules?.start_time) }}
                <span v-if="attendance.gym_schedules?.level"> · {{ attendance.gym_schedules.level }}</span>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-chip 
                :color="attendance.gym_schedules?.class_type === 'GI' ? 'primary' : 'secondary'" 
                text-color="white"
                size="sm"
              >
                {{ attendance.gym_schedules?.class_type }}
              </q-chip>
            </q-item-section>
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
import { useAttendance } from '../composables/useAttendance'
import { useBeltProgression } from '../composables/useBeltProgression'
import { user, profile } from '../state/auth'
import { Notify, Loading } from 'quasar'

const { getMyAttendance, getAttendanceStats } = useAttendance()
const { getCurrentBelt, getBeltHistory, getBeltDisplay, getDaysAtBelt } = useBeltProgression()

const stats = ref<any>(null)
const recentAttendance = ref<any[]>([])
const beltInfo = ref<any>(null)
const beltHistory = ref<any[]>([])
const daysAtBelt = ref(0)
const showBeltHistory = ref(false)

const gymId = computed(() => profile.value?.gym_id || null)
const userId = computed(() => user.value?.id)

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
    beltInfo.value = getBeltDisplay(belt.beltColor, belt.stripes)

    // Load days at belt
    daysAtBelt.value = await getDaysAtBelt(userId.value)

    // Load belt history
    const history = await getBeltHistory(userId.value)
    beltHistory.value = history

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

onMounted(() => {
  loadDashboard()
})
</script>

<style scoped>
.bg-gradient-primary {
  background: linear-gradient(135deg, var(--q-primary) 0%, var(--q-secondary) 100%);
}
</style>

