import { ref, computed } from 'vue'
import { supabase } from '../boot/supabase'
import { profile as globalProfile } from '../state/auth'

export interface AIPreferences {
  // Alert severity filter
  severityFilter: 'critical' | 'warning' | 'all'
  
  // Check frequency in minutes
  checkIntervalMinutes: number
  
  // Notification preferences
  browserNotifications: boolean
  soundAlerts: boolean
  emailDigest: boolean
  
  // Problem types to monitor
  monitorTypes: {
    noInstructor: boolean
    overCapacity: boolean
    conflicts: boolean
    cancelled: boolean
  }
  
  // Quiet hours
  quietHours: {
    enabled: boolean
    start: string  // HH:mm format
    end: string    // HH:mm format
  }
  
  // UI preferences
  widgetPosition?: [number, number]
  autoExpand: boolean
}

const defaultPreferences: AIPreferences = {
  severityFilter: 'all',
  checkIntervalMinutes: 5,
  browserNotifications: false,
  soundAlerts: false,
  emailDigest: false,
  monitorTypes: {
    noInstructor: true,
    overCapacity: true,
    conflicts: true,
    cancelled: true
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00'
  },
  autoExpand: false
}

const preferences = ref<AIPreferences>({ ...defaultPreferences })
const loading = ref(false)
const initialized = ref(false)

export function useAIPreferences() {
  
  /**
   * Load preferences from database
   */
  async function loadPreferences() {
    if (!globalProfile.value?.id) {
      console.warn('No user profile for loading AI preferences')
      return
    }
    
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_preferences')
        .eq('id', globalProfile.value.id)
        .single()
      
      if (error) throw error
      
      if (data?.ai_preferences) {
        // Merge with defaults to handle missing fields
        preferences.value = {
          ...defaultPreferences,
          ...data.ai_preferences as AIPreferences
        }
      }
      
      initialized.value = true
      console.log('✅ AI Preferences loaded:', preferences.value)
    } catch (err) {
      console.error('❌ Error loading AI preferences:', err)
      // Use defaults on error
      preferences.value = { ...defaultPreferences }
      initialized.value = true
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Save preferences to database
   */
  async function savePreferences(newPrefs: Partial<AIPreferences>) {
    if (!globalProfile.value?.id) {
      throw new Error('No user profile for saving preferences')
    }
    
    loading.value = true
    try {
      // Update local state
      preferences.value = {
        ...preferences.value,
        ...newPrefs
      }
      
      // Save to database
      const { error } = await supabase
        .from('profiles')
        .update({ ai_preferences: preferences.value })
        .eq('id', globalProfile.value.id)
      
      if (error) throw error
      
      console.log('✅ AI Preferences saved:', preferences.value)
      return true
    } catch (err) {
      console.error('❌ Error saving AI preferences:', err)
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Reset to defaults
   */
  async function resetToDefaults() {
    await savePreferences(defaultPreferences)
  }
  
  /**
   * Check if we're in quiet hours
   */
  const isQuietHours = computed(() => {
    if (!preferences.value.quietHours.enabled) return false
    
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    const { start, end } = preferences.value.quietHours
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end
    }
    
    // Handle same-day quiet hours (e.g., 13:00 to 17:00)
    return currentTime >= start && currentTime <= end
  })
  
  /**
   * Filter alerts based on preferences
   */
  function filterAlerts(alerts: any[]) {
    let filtered = [...alerts]
    
    // Filter by severity
    if (preferences.value.severityFilter === 'critical') {
      filtered = filtered.filter(a => a.severity.toLowerCase() === 'critical')
    } else if (preferences.value.severityFilter === 'warning') {
      filtered = filtered.filter(a => 
        a.severity.toLowerCase() === 'critical' || 
        a.severity.toLowerCase() === 'warning'
      )
    }
    
    // Filter by problem types
    const types = preferences.value.monitorTypes
    filtered = filtered.filter(alert => {
      if (alert.type === 'no_instructor' && !types.noInstructor) return false
      if (alert.type === 'over_capacity' && !types.overCapacity) return false
      if (alert.type === 'instructor_conflict' && !types.conflicts) return false
      if (alert.type === 'cancelled_with_rsvps' && !types.cancelled) return false
      return true
    })
    
    return filtered
  }
  
  /**
   * Get check interval in milliseconds
   */
  const checkIntervalMs = computed(() => {
    return preferences.value.checkIntervalMinutes * 60 * 1000
  })
  
  return {
    preferences,
    loading,
    initialized,
    loadPreferences,
    savePreferences,
    resetToDefaults,
    isQuietHours,
    filterAlerts,
    checkIntervalMs,
    defaultPreferences
  }
}

