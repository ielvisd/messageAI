<template>
  <q-page-sticky
    position="bottom-right"
    :offset="[18, 18]"
    style="z-index: 2000"
  >
    <!-- Collapsed State - FAB Button -->
    <q-btn
      v-if="!expanded"
      fab
      :color="alertCount > 0 ? 'negative' : 'primary'"
      icon="smart_toy"
      @click="expanded = true"
      class="shadow-10"
    >
      <q-badge
        v-if="alertCount > 0"
        color="red"
        text-color="white"
        floating
      >
        {{ alertCount }}
      </q-badge>
      <q-tooltip>AI Health Monitor</q-tooltip>
    </q-btn>
    
    <!-- Expanded State - Card -->
    <q-card 
      v-else
      style="width: 320px; max-height: 500px"
      class="shadow-10"
    >
      <!-- Header -->
      <q-card-section class="row items-center q-pb-none">
        <q-icon name="smart_toy" color="primary" size="sm" class="q-mr-sm" />
        <div class="text-h6">AI Health Monitor</div>
        <q-space />
        <q-btn 
          icon="refresh" 
          flat 
          round 
          dense 
          @click="checkForIssues"
          :loading="loading"
        >
          <q-tooltip>Refresh</q-tooltip>
        </q-btn>
        <q-btn 
          icon="close" 
          flat 
          round 
          dense 
          @click="expanded = false" 
        />
      </q-card-section>
      
      <q-separator />
      
      <!-- Scrollable Alerts -->
      <q-card-section class="scroll" style="max-height: 320px">
        <div v-if="loading && alerts.length === 0" class="text-center q-pa-md">
          <q-spinner-dots color="primary" size="40px" />
          <div class="text-caption text-grey-7 q-mt-sm">Checking for issues...</div>
        </div>

        <div v-else-if="alerts.length > 0">
          <div v-for="alert in alerts" :key="alert.id" class="q-mb-md">
            <div class="row items-start">
              <q-icon 
                :name="getAlertIcon(alert.severity)"
                :color="getAlertColor(alert.severity)"
                size="sm"
                class="q-mr-sm q-mt-xs"
              />
              <div class="col">
                <div class="text-weight-bold">{{ alert.title }}</div>
                <div class="text-caption text-grey-7">{{ alert.description }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="text-center q-pa-md">
          <q-icon name="check_circle" size="lg" color="positive" />
          <div class="text-subtitle2 text-positive q-mt-sm">All systems healthy!</div>
          <div class="text-caption text-grey-7 q-mt-xs">No issues detected</div>
        </div>

        <div v-if="lastCheck" class="text-caption text-grey-6 text-center q-mt-md">
          Last checked: {{ formatLastCheck(lastCheck) }}
        </div>
      </q-card-section>
      
      <q-separator />
      
      <!-- Actions -->
      <q-card-actions align="right" style="min-height: 44px">
        <q-btn 
          flat
          label="View Schedule"
          color="primary"
          @click="navigateToSchedule"
          style="min-height: 44px"
        />
        <q-btn 
          flat
          label="Ask AI"
          color="primary"
          @click="openAIAssistant"
          style="min-height: 44px"
        />
      </q-card-actions>
    </q-card>
  </q-page-sticky>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGymAI } from '../composables/useGymAI'
import { profile } from '../state/auth'

const router = useRouter()
const { executeTool } = useGymAI()

const expanded = ref(false)
const alerts = ref<Alert[]>([])
const loading = ref(false)
const lastCheck = ref<Date | null>(null)

interface Alert {
  id: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  title: string
  description: string
  scheduleId?: string
}

const alertCount = computed(() => alerts.value.length)

async function checkForIssues() {
  if (!profile.value?.gym_id) {
    console.warn('No gym_id found for AI monitoring');
    return;
  }
  
  loading.value = true;
  try {
    const result = await executeTool('check_schedule_problems', {
      days_ahead: 7
    });
    
    // Parse result into alerts
    alerts.value = parseProblemsToAlerts(result);
    lastCheck.value = new Date();
    
    // Cache in localStorage with timestamp
    localStorage.setItem('ai_alerts', JSON.stringify({
      timestamp: Date.now(),
      alerts: alerts.value
    }));
  } catch (error) {
    console.error('Error checking for issues:', error);
    // Try to parse error message for user-friendly display
    if (error instanceof Error && error.message.includes('No problems found')) {
      alerts.value = [];
    }
  } finally {
    loading.value = false;
  }
}

function parseProblemsToAlerts(result: any): Alert[] {
  const parsed: Alert[] = []
  
  // Handle different result formats
  if (typeof result === 'string') {
    // AI returned text response
    if (result.toLowerCase().includes('no problems') || result.toLowerCase().includes('no issues')) {
      return []
    }
    // Try to parse critical/warning from text
    const lines = result.split('\n')
    lines.forEach((line: string, idx: number) => {
      if (line.toLowerCase().includes('critical')) {
        parsed.push({
          id: `critical-${idx}`,
          severity: 'CRITICAL',
          title: 'Critical Issue Detected',
          description: line.replace(/CRITICAL:?/i, '').trim()
        })
      } else if (line.toLowerCase().includes('warning')) {
        parsed.push({
          id: `warning-${idx}`,
          severity: 'WARNING',
          title: 'Warning',
          description: line.replace(/WARNING:?/i, '').trim()
        })
      }
    })
  } else if (result && typeof result === 'object') {
    // Handle structured response
    if (result.critical_issues) {
      result.critical_issues.forEach((issue: any, idx: number) => {
        parsed.push({
          id: `critical-${idx}`,
          severity: 'CRITICAL',
          title: issue.title || 'Critical Issue',
          description: issue.description || issue.message || String(issue),
          scheduleId: issue.schedule_id
        })
      })
    }
    
    if (result.warnings) {
      result.warnings.forEach((issue: any, idx: number) => {
        parsed.push({
          id: `warning-${idx}`,
          severity: 'WARNING',
          title: issue.title || 'Warning',
          description: issue.description || issue.message || String(issue),
          scheduleId: issue.schedule_id
        })
      })
    }

    if (result.problems && Array.isArray(result.problems)) {
      result.problems.forEach((problem: any, idx: number) => {
        parsed.push({
          id: `problem-${idx}`,
          severity: problem.severity || 'WARNING',
          title: problem.title || 'Issue Detected',
          description: problem.description || String(problem)
        })
      })
    }
  }
  
  return parsed
}

function getAlertIcon(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'error'
    case 'WARNING': return 'warning'
    default: return 'info'
  }
}

function getAlertColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'negative'
    case 'WARNING': return 'warning'
    default: return 'info'
  }
}

function formatLastCheck(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  return `${diffHours} hours ago`;
}

function navigateToSchedule() {
  expanded.value = false;
  router.push('/schedule');
}

function openAIAssistant() {
  expanded.value = false;
  router.push('/ai-assistant');
}

// Auto-check on mount and every 5 minutes
onMounted(() => {
  // Load cached alerts first for instant display
  const cached = localStorage.getItem('ai_alerts')
  if (cached) {
    try {
      const data = JSON.parse(cached)
      // Only use cache if less than 5 minutes old
      if (Date.now() - data.timestamp < 5 * 60 * 1000) {
        alerts.value = data.alerts || []
        lastCheck.value = new Date(data.timestamp)
      }
    } catch (e) {
      console.error('Error loading cached alerts:', e)
    }
  }
  
  // Then check for real
  checkForIssues()
  
  // Auto-refresh every 5 minutes
  setInterval(checkForIssues, 5 * 60 * 1000)
})
</script>

<style scoped>
/* iOS-optimized touch targets */
.q-btn {
  min-width: 44px;
  min-height: 44px;
}

/* Smooth animations */
.q-page-sticky {
  transition: all 0.3s ease;
}
</style>

