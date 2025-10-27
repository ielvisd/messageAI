<template>
  <q-page-sticky
    position="bottom-right"
    :offset="widgetOffset"
    style="z-index: 2000"
  >
    <!-- Collapsed State - FAB Button -->
    <q-btn
      v-if="!expanded"
      fab
      :color="alertCount > 0 ? 'negative' : 'primary'"
      icon="smart_toy"
      @click="handleClick"
      :disable="isDragging"
      v-touch-pan.prevent.mouse="moveFab"
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
      <q-tooltip>AI Health Monitor (drag to reposition)</q-tooltip>
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
          <div 
            v-for="alert in alerts" 
            :key="alert.id" 
            class="q-mb-md alert-item cursor-pointer"
            @click="handleAlertClick(alert)"
          >
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
              <q-icon name="chevron_right" size="xs" color="grey-5" class="q-ml-sm" />
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
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useGymAI } from '../composables/useGymAI'
import { useAIPreferences } from '../composables/useAIPreferences'
import { profile } from '../state/auth'

const router = useRouter()
const { executeTool } = useGymAI()
const { preferences, loadPreferences, filterAlerts, checkIntervalMs, isQuietHours } = useAIPreferences()

const expanded = ref(false)
const alerts = ref<Alert[]>([])
const rawAlerts = ref<Alert[]>([]) // Store unfiltered alerts
const loading = ref(false)
const lastCheck = ref<Date | null>(null)
const widgetOffset = ref<[number, number]>([18, 18])
const isDragging = ref(false)
let checkInterval: NodeJS.Timeout | null = null

interface Alert {
  id: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  title: string
  description: string
  scheduleId?: string
}

const alertCount = computed(() => {
  // Don't show count during quiet hours
  if (isQuietHours.value) return 0
  return alerts.value.length
})

async function checkForIssues() {
  if (!profile.value?.gym_id) {
    console.warn('🤖 AI Widget: No gym_id found for monitoring');
    return;
  }
  
  console.log('🤖 AI Widget: Starting proactive check for gym:', profile.value.gym_id);
  loading.value = true;
  try {
    // Use default date_range (next 7 days)
    const result = await executeTool('check_schedule_problems', {}, profile.value.gym_id);
    
    console.log('✅ AI Widget: Got result from check_schedule_problems:', result);
    
    // Parse result into alerts
    rawAlerts.value = parseProblemsToAlerts(result);
    
    // Apply user preference filters
    alerts.value = filterAlerts(rawAlerts.value);
    lastCheck.value = new Date();
    
    console.log(`🔔 AI Widget: Parsed ${rawAlerts.value.length} total alerts, showing ${alerts.value.length} after filters`);
    
    // Check for new alerts and trigger notifications
    checkForNewAlerts(alerts.value);
    
    // Cache in localStorage with timestamp
    localStorage.setItem('ai_alerts', JSON.stringify({
      timestamp: Date.now(),
      alerts: rawAlerts.value // Store raw alerts
    }));
  } catch (error) {
    console.error('❌ AI Widget: Error checking for issues:', error);
    // Clear alerts on error (don't show stale data)
    alerts.value = [];
  } finally {
    loading.value = false;
  }
}

function parseProblemsToAlerts(result: any): Alert[] {
  const parsed: Alert[] = []
  
  // Handle the actual response format from check_schedule_problems
  if (!result) {
    return []
  }
  
  // Check for student response (they don't get detailed problems)
  if (result.is_student) {
    return []
  }
  
  // Check for problems array (the main format)
  if (result.problems && Array.isArray(result.problems)) {
    result.problems.forEach((problem: any, idx: number) => {
      parsed.push({
        id: `problem-${idx}`,
        severity: problem.severity?.toUpperCase() || 'WARNING',
        title: problem.title || problem.type || 'Issue Detected',
        description: problem.description || problem.message || String(problem),
        scheduleId: problem.schedule_id || problem.scheduleId
      })
    })
    return parsed
  }
  
  // Fallback: Handle string responses
  if (typeof result === 'string') {
    if (result.toLowerCase().includes('no problems') || 
        result.toLowerCase().includes('no issues') ||
        result.toLowerCase().includes('all systems')) {
      return []
    }
    // Try to parse critical/warning from text
    const lines = result.split('\n').filter(l => l.trim())
    lines.forEach((line: string, idx: number) => {
      if (line.toLowerCase().includes('critical')) {
        parsed.push({
          id: `critical-${idx}`,
          severity: 'CRITICAL',
          title: 'Critical Issue',
          description: line.replace(/🚨|CRITICAL:?/gi, '').trim()
        })
      } else if (line.toLowerCase().includes('warning')) {
        parsed.push({
          id: `warning-${idx}`,
          severity: 'WARNING',
          title: 'Warning',
          description: line.replace(/⚠️|WARNING:?/gi, '').trim()
        })
      }
    })
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
  void router.push('/schedule');
}

function openAIAssistant() {
  expanded.value = false;
  void router.push('/ai-assistant');
}

function handleAlertClick(alert: Alert) {
  expanded.value = false;
  
  // Signal AI Assistant to start a fresh conversation (archives current one)
  sessionStorage.setItem('ai_start_fresh', 'true');
  
  // Navigate to AI Assistant with context about this specific problem
  // Store the alert details in sessionStorage so AI Assistant can pick it up
  sessionStorage.setItem('ai_context_alert', JSON.stringify({
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    scheduleId: alert.scheduleId,
    timestamp: new Date().toISOString()
  }));
  
  // Force navigation even if already on the page by adding a timestamp
  void router.push({
    path: '/ai-assistant',
    query: { t: Date.now().toString() }
  });
}

function handleClick() {
  if (!isDragging.value) {
    expanded.value = true;
  }
}

function moveFab(ev: any) {
  // Track dragging state using Quasar's touch-pan event properties
  isDragging.value = ev.isFirst !== true && ev.isFinal !== true;
  
  // Update offset based on drag delta
  widgetOffset.value = [
    widgetOffset.value[0] - ev.delta.x,
    widgetOffset.value[1] - ev.delta.y
  ];
  
  // Save position when drag is complete
  if (ev.isFinal) {
    localStorage.setItem('widget_position', JSON.stringify(widgetOffset.value));
  }
}

// Previous alert IDs to detect new alerts
const previousAlertIds = ref<Set<string>>(new Set())

function checkForNewAlerts(currentAlerts: Alert[]) {
  // During quiet hours, don't notify
  if (isQuietHours.value) {
    console.log('🔕 Quiet hours active - skipping notifications')
    return
  }
  
  const currentIds = new Set(currentAlerts.map(a => a.id))
  const newAlerts = currentAlerts.filter(a => !previousAlertIds.value.has(a.id))
  
  if (newAlerts.length > 0) {
    console.log(`🆕 Found ${newAlerts.length} new alerts`)
    
    // Browser notification
    if (preferences.value.browserNotifications) {
      void showBrowserNotification(newAlerts)
    }
    
    // Sound alert
    if (preferences.value.soundAlerts) {
      playAlertSound()
    }
    
    // Auto-expand widget if preference enabled
    if (preferences.value.autoExpand) {
      expanded.value = true
    }
  }
  
  previousAlertIds.value = currentIds
}

async function showBrowserNotification(alerts: Alert[]) {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications')
    return
  }
  
  if (Notification.permission === 'granted') {
    const critical = alerts.filter(a => a.severity === 'CRITICAL')
    const title = critical.length > 0 
      ? `🚨 ${critical.length} Critical Issue${critical.length > 1 ? 's' : ''}`
      : `⚠️ ${alerts.length} New Alert${alerts.length > 1 ? 's' : ''}`
    
    const body = alerts.slice(0, 3).map(a => a.title).join('\n')
    
    new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'ai-widget-alert'
    })
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      void showBrowserNotification(alerts)
    }
  }
}

function playAlertSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (e) {
    console.error('Error playing alert sound:', e)
  }
}

function setupCheckInterval() {
  if (checkInterval) {
    clearInterval(checkInterval)
  }
  
  console.log(`⏱️  Setting up check interval: every ${preferences.value.checkIntervalMinutes} minutes`)
  
  checkInterval = setInterval(() => { 
    void checkForIssues() 
  }, checkIntervalMs.value)
}

// Auto-check on mount and every X minutes based on preferences
onMounted(async () => {
  // Load user preferences first
  await loadPreferences()
  // Load saved widget position
  const savedPosition = localStorage.getItem('widget_position');
  if (savedPosition) {
    try {
      widgetOffset.value = JSON.parse(savedPosition);
    } catch (e) {
      console.error('Error loading widget position:', e);
    }
  }
  
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
  void checkForIssues()
  
  // Setup interval based on user preference
  setupCheckInterval()
})

// Watch for preference changes and update interval
watch(() => preferences.value.checkIntervalMinutes, () => {
  console.log('⏱️  Check interval changed, resetting timer')
  setupCheckInterval()
})

// Listen for external refresh requests (e.g., after instructor assignment)
onMounted(() => {
  const handleRefresh = () => {
    console.log('🔄 AI Widget: External refresh requested')
    void checkForIssues()
  }
  
  window.addEventListener('refresh-ai-insights', handleRefresh)
  
  // Cleanup on unmount
  onBeforeUnmount(() => {
    window.removeEventListener('refresh-ai-insights', handleRefresh)
  })
})

// Watch for preference changes and re-filter alerts
watch(() => preferences.value.severityFilter, () => {
  console.log('🔄 Severity filter changed, re-filtering alerts')
  alerts.value = filterAlerts(rawAlerts.value)
})

watch(() => preferences.value.monitorTypes, () => {
  console.log('🔄 Monitor types changed, re-filtering alerts')
  alerts.value = filterAlerts(rawAlerts.value)
}, { deep: true })

// Cleanup on unmount
onBeforeUnmount(() => {
  if (checkInterval) {
    clearInterval(checkInterval)
  }
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

/* Clickable alert items */
.alert-item {
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.alert-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.alert-item:active {
  background-color: rgba(255, 255, 255, 0.1);
}
</style>

