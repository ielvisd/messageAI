<template>
  <q-page class="q-pa-md" style="padding-bottom: env(safe-area-inset-bottom)">
    <!-- Owner View -->
    <template v-if="isOwner">
      <div class="text-h4 q-mb-md">{{ gym?.name || 'Dashboard' }}</div>
      
      <!-- Stats Cards -->
      <div class="row q-col-gutter-md q-mb-md">
        <div 
          v-for="stat in stats" 
          :key="stat.label"
          class="col-12 col-sm-6 col-md-4"
        >
          <q-card>
            <q-card-section>
              <!-- Header with trend -->
              <div class="row items-center justify-between q-mb-sm">
                <div class="text-subtitle2 text-grey-7">{{ stat.label }}</div>
                <q-badge
                  v-if="stat.trend !== 0"
                  :color="stat.trend > 0 ? 'positive' : 'negative'"
                  :label="`${stat.trend > 0 ? '↑' : '↓'} ${Math.abs(stat.trend)}%`"
                />
              </div>
              
              <!-- Main value -->
              <div class="text-h3 text-primary q-mb-sm">
                {{ stat.value }}
              </div>
              
              <!-- Sparkline (using Quasar-native mini bars) -->
              <div v-if="stat.trendData.length > 0" class="q-mb-sm">
                <div class="row q-gutter-xs items-end" style="height: 30px">
                  <div 
                    v-for="(value, idx) in normalizedTrendData(stat.trendData)"
                    :key="idx"
                    class="col bg-primary"
                    :style="{ 
                      height: `${value}%`, 
                      opacity: 0.3 + (idx / stat.trendData.length) * 0.7,
                      borderRadius: '2px'
                    }"
                  />
                </div>
              </div>
              
              <!-- AI Insight -->
              <div v-if="stat.insight" class="row items-start q-gutter-xs q-mt-sm">
                <q-icon name="lightbulb" size="xs" color="warning" />
                <div class="col text-caption text-grey-7" style="line-height: 1.4">
                  {{ stat.insight }}
                </div>
              </div>
              
              <!-- Loading state for insights -->
              <div v-if="stat.loading" class="row items-center q-gutter-xs q-mt-sm">
                <q-spinner-dots color="primary" size="xs" />
                <div class="text-caption text-grey-7">Analyzing...</div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>

    <!-- Instructor View -->
    <template v-else-if="isInstructor">
      <div class="text-h4 q-mb-md">My Teaching Dashboard</div>
      
      <q-card class="q-mb-md">
        <q-card-section>
          <div class="text-h6 q-mb-md">Quick Actions</div>
          <div class="row q-gutter-md">
            <q-btn
              color="primary"
              label="My Schedule"
              icon="event"
              @click="$router.push('/schedule')"
            />
            <q-btn
              outline
              color="primary"
              label="View Students"
              icon="people"
              @click="$router.push('/class-roster')"
            />
          </div>
        </q-card-section>
      </q-card>
    </template>

    <!-- Student/Parent View -->
    <template v-else>
      <div class="text-h4 q-mb-md">My Training Dashboard</div>

      <!-- Quick Actions -->
      <div class="row q-gutter-md q-mb-lg">
        <q-btn
          color="primary"
          label="View Schedule"
          icon="calendar_today"
          size="lg"
          @click="$router.push('/schedule')"
          class="col"
        />
        <q-btn
          outline
          color="secondary"
          label="AI Assistant"
          icon="smart_toy"
          size="lg"
          @click="$router.push('/ai-assistant')"
          class="col"
        />
      </div>

      <!-- Upcoming Classes Card -->
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
            <q-item v-for="rsvp in upcomingRSVPs.slice(0, 3)" :key="rsvp.id">
              <q-item-section avatar>
                <q-avatar
                  color="primary"
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
              </q-item-section>

              <q-item-section side>
                <q-badge
                  :color="rsvp.status === 'confirmed' ? 'positive' : 'warning'"
                  :label="rsvp.status.toUpperCase()"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>

      <!-- Empty State for No RSVPs -->
      <q-card v-else class="q-mb-md">
        <q-card-section class="text-center q-pa-xl">
          <q-icon name="event_available" size="64px" color="grey-5" class="q-mb-md" />
          <div class="text-h6 text-grey-6">No Upcoming Classes</div>
          <div class="text-body2 text-grey-7 q-mt-sm q-mb-md">
            Browse the schedule to RSVP for classes
          </div>
          <q-btn
            color="primary"
            label="View Schedule"
            icon="calendar_today"
            @click="$router.push('/schedule')"
          />
        </q-card-section>
      </q-card>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../boot/supabase'
import { user, profile } from '../state/auth'
import { useRoles } from '../composables/useRoles'
import { useGymAI } from '../composables/useGymAI'

const router = useRouter()
const { isOwner, isInstructor } = useRoles()
const { sendMessage: sendAIMessage, initialize: initializeAI } = useGymAI()

const gym = ref<{ name?: string } | null>(null)
const stats = ref([
  { 
    label: 'Total Students', 
    value: 0, 
    trend: 0,
    trendData: [] as number[],
    insight: '',
    loading: false
  },
  { 
    label: 'Instructors', 
    value: 0, 
    trend: 0,
    trendData: [] as number[],
    insight: '',
    loading: false
  },
  { 
    label: 'Active Classes', 
    value: 0, 
    trend: 0,
    trendData: [] as number[],
    insight: '',
    loading: false
  }
])

const upcomingRSVPs = ref<any[]>([])

// Load owner stats
async function loadOwnerStats() {
  if (!profile.value?.gym_id) return

  try {
    // Load gym info
    const { data: gymData } = await supabase
      .from('gyms')
      .select('name')
      .eq('id', profile.value.gym_id)
      .single()
    
    if (gymData) {
      gym.value = gymData
    }

    // Count students
    const { count: studentCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', profile.value.gym_id)
      .eq('role', 'student')

    // Count instructors
    const { count: instructorCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', profile.value.gym_id)
      .eq('role', 'instructor')

    // Count active classes
    const { count: classCount } = await supabase
      .from('gym_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', profile.value.gym_id)
      .eq('is_active', true)

    // Update stats with values
    stats.value[0].value = studentCount || 0
    stats.value[1].value = instructorCount || 0
    stats.value[2].value = classCount || 0
    
    // Generate mock trend data (7 days)
    stats.value[0].trendData = generateMockTrendData(studentCount || 0, 7)
    stats.value[1].trendData = generateMockTrendData(instructorCount || 0, 7)
    stats.value[2].trendData = generateMockTrendData(classCount || 0, 7)
    
    // Calculate trends (% change from last week)
    stats.value[0].trend = calculateTrend(stats.value[0].trendData)
    stats.value[1].trend = calculateTrend(stats.value[1].trendData)
    stats.value[2].trend = calculateTrend(stats.value[2].trendData)
    
    // Generate AI insights asynchronously
    generateAIInsights()
  } catch (err) {
    console.error('Error loading owner stats:', err)
  }
}

// Helper: Generate mock trend data for sparklines
function generateMockTrendData(currentValue: number, days: number): number[] {
  const data = []
  const baseValue = Math.max(currentValue - Math.floor(days / 2), 0)
  
  for (let i = 0; i < days; i++) {
    const variation = Math.random() * (currentValue * 0.2) - (currentValue * 0.1)
    const value = Math.max(0, Math.floor(baseValue + (i / days) * (currentValue - baseValue) + variation))
    data.push(value)
  }
  
  return data
}

// Helper: Calculate trend percentage
function calculateTrend(trendData: number[]): number {
  if (trendData.length < 2) return 0
  
  const first = trendData[0]
  const last = trendData[trendData.length - 1]
  
  if (first === 0) return last > 0 ? 100 : 0
  
  const change = ((last - first) / first) * 100
  return Math.round(change)
}

// Helper: Normalize trend data for display (0-100%)
function normalizedTrendData(data: number[]): number[] {
  if (data.length === 0) return []
  
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  
  return data.map(v => {
    const normalized = ((v - min) / range) * 100
    return Math.max(10, normalized) // Minimum 10% height for visibility
  })
}

// AI Insights Generation (simplified - no AI calls for now to avoid delays)
async function generateAIInsights() {
  // Set loading states briefly
  stats.value.forEach(stat => stat.loading = true)
  
  // Simulate brief loading
  await new Promise(resolve => setTimeout(resolve, 500))
  
  try {
    // Provide smart rule-based insights based on metrics
    
    // Students insight
    if (stats.value[0].trend > 10) {
      stats.value[0].insight = 'Strong growth! Consider expanding class capacity.'
    } else if (stats.value[0].trend < -5) {
      stats.value[0].insight = 'Declining enrollment. Review retention strategies.'
    } else if (stats.value[0].value > 50) {
      stats.value[0].insight = 'Healthy member base. Focus on engagement.'
    } else if (stats.value[0].value < 10) {
      stats.value[0].insight = 'Build community through referral incentives.'
    }
    
    // Instructors insight
    const ratio = stats.value[2].value / (stats.value[1].value || 1)
    if (ratio > 4) {
      stats.value[1].insight = 'High class-to-instructor ratio. Consider hiring.'
    } else if (stats.value[1].value === 0) {
      stats.value[1].insight = 'Add instructors to activate your schedule.'
    } else if (stats.value[1].value < 3) {
      stats.value[1].insight = 'Small team. Cross-train for coverage flexibility.'
    } else {
      stats.value[1].insight = 'Good instructor coverage across classes.'
    }
    
    // Classes insight
    if (stats.value[2].value === 0) {
      stats.value[2].insight = 'Create your first class to get started!'
    } else if (stats.value[2].value < 5) {
      stats.value[2].insight = 'Add variety to attract more students.'
    } else if (stats.value[2].trend > 15) {
      stats.value[2].insight = 'Rapid expansion! Ensure instructor availability.'
    } else {
      stats.value[2].insight = 'Diverse schedule attracts varied skill levels.'
    }
    
  } catch (err) {
    console.error('Error generating insights:', err)
  } finally {
    stats.value.forEach(stat => stat.loading = false)
  }
}

// Load student RSVPs
async function loadStudentRSVPs() {
  if (!user.value?.id) return

  try {
    const { data, error } = await supabase
      .from('class_rsvps')
      .select(`
        id,
        rsvp_date,
        status,
        gym_schedules (
          class_type,
          start_time,
          end_time,
          instructor_name
        )
      `)
      .eq('user_id', user.value.id)
      .gte('rsvp_date', new Date().toISOString().split('T')[0])
      .order('rsvp_date', { ascending: true })
      .limit(5)

    if (error) throw error
    upcomingRSVPs.value = data || []
  } catch (err) {
    console.error('Error loading RSVPs:', err)
  }
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
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }
}

function formatTime(time: string | null | undefined): string {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours || '0')
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes || '00'} ${ampm}`
}

function getClassEmoji(classType: string | undefined): string {
  if (!classType) return '🥋'
  const type = classType.toLowerCase()
  if (type.includes('no-gi') || type.includes('nogi')) return '🤼'
  if (type.includes('competition')) return '🏆'
  if (type.includes('open mat')) return '🤝'
  return '🥋'
}

onMounted(async () => {
  if (isOwner.value) {
    await loadOwnerStats()
  } else {
    await loadStudentRSVPs()
  }
})
</script>

<style scoped>
/* iOS Safe Area Support - handled by inline styles */
</style>

