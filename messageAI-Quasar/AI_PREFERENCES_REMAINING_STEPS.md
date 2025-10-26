# AI Preferences Implementation - Remaining Steps

## ✅ Completed So Far

1. ✅ Created `useAIPreferences.ts` composable with full preference management
2. ✅ Added AI Monitoring Settings UI to AdminSettingsPage.vue
3. ✅ Added save/reset functions for preferences
4. ✅ Updated AIInsightsWidget to import and use preferences
5. ✅ Updated widget to filter alerts based on user preferences

## 🔄 Remaining Implementation Steps

### Step 1: Add Notification Functions to AIInsightsWidget.vue

Add these functions before the `onMounted` block (around line 330):

```typescript
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
      showBrowserNotification(newAlerts)
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
      showBrowserNotification(alerts)
    }
  }
}

function playAlertSound() {
  // Simple beep sound using Web Audio API
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  
  oscillator.frequency.value = 800 // Hz
  oscillator.type = 'sine'
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
  
  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + 0.5)
}

function setupCheckInterval() {
  // Clear existing interval
  if (checkInterval) {
    clearInterval(checkInterval)
  }
  
  console.log(`⏱️  Setting up check interval: every ${preferences.value.checkIntervalMinutes} minutes`)
  
  // Setup new interval based on user preference
  checkInterval = setInterval(() => { 
    void checkForIssues() 
  }, checkIntervalMs.value)
}
```

### Step 2: Update onMounted in AIInsightsWidget.vue

Replace the current `onMounted` block (around line 335) with:

```typescript
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
        rawAlerts.value = data.alerts || []
        alerts.value = filterAlerts(rawAlerts.value)
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
```

## 📋 Manual Steps to Complete

1. **Add the notification functions** (Step 1 above) - Insert before `onMounted`
2. **Replace the onMounted block** (Step 2 above)
3. **Run linter** and fix any errors
4. **Test all features:**
   - Severity filter (Critical/Warning/All)
   - Check frequency slider
   - Browser notifications toggle
   - Sound alerts toggle
   - Quiet hours
   - Monitor types checkboxes
   - Auto-expand widget toggle

## 🎯 Expected Behavior After Implementation

**User Flow:**
1. Owner opens Settings → AI Monitoring Settings
2. Changes check frequency from 5min to 10min
3. Toggles "Critical Only" filter
4. Enables quiet hours (22:00 - 07:00)
5. Clicks "Save Preferences"
6. Widget immediately updates:
   - Shows only CRITICAL alerts
   - Checks every 10 minutes instead of 5
   - No alerts shown during quiet hours

**Demo Points:**
- "Owners have full control over AI monitoring"
- "Adjust check frequency from 1 to 30 minutes"
- "Filter by severity - see only what matters"
- "Quiet hours prevent alerts during off-hours"
- "Choose which problems to monitor"
- "Browser notifications keep you informed"

## 🚀 Quick Test Commands

```bash
cd messageAI-Quasar
pnpm dev
```

Then:
1. Login as owner@jiujitsio.com
2. Go to Settings
3. Scroll to "AI Monitoring Settings"
4. Change check interval to 1 minute (for quick testing)
5. Toggle "Critical Only"
6. Save preferences
7. Watch console logs for "⏱️ Setting up check interval: every 1 minutes"
8. Verify widget refreshes every 1 minute
9. Verify only CRITICAL alerts show

## 📝 Notes

- Preferences are stored in database (`profiles.ai_preferences`)
- Widget respects preferences immediately after save
- Quiet hours don't stop checks, just hide alerts
- Browser notifications require user permission
- Sound alerts use Web Audio API (no external files needed)

