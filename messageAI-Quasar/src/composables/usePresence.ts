import { ref } from 'vue'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'

export interface UserPresence {
  user_id: string
  online_at: string
}

// Module-level state (singleton pattern)
const presenceState = ref<Record<string, UserPresence[]>>({})
const onlineUsers = ref<Set<string>>(new Set())
let presenceChannel: RealtimeChannel | null = null
let isInitialized = false

const isUserOnline = (userId: string): boolean => {
  return onlineUsers.value.has(userId)
}

const setOnline = async () => {
  if (!user.value) return

  try {
    // Update database status
    await supabase.rpc('set_user_online', { user_id_param: user.value.id })
    console.log('✅ User status set to online')
  } catch (error) {
    console.error('❌ Failed to set online status:', error)
  }
}

const setOffline = async () => {
  if (!user.value) return

  try {
    // Update database status
    await supabase.rpc('set_user_offline', { user_id_param: user.value.id })
    console.log('✅ User status set to offline')
  } catch (error) {
    console.error('❌ Failed to set offline status:', error)
  }
}

const setupPresenceChannel = () => {
  if (!user.value || presenceChannel) return

  console.log('🔔 Setting up presence channel (singleton)...')

  presenceChannel = supabase.channel('online-users', {
    config: {
      presence: {
        key: user.value.id,
      },
    },
  })

  // Subscribe to presence state changes
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel?.presenceState<UserPresence>()
      if (state) {
        presenceState.value = state
        
        // Update online users set
        const users = new Set<string>()
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            users.add(presence.user_id)
          })
        })
        onlineUsers.value = users
        
        console.log('👥 Online users updated:', users.size)
      }
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('✅ User joined:', key, newPresences)
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('👋 User left:', key, leftPresences)
    })
    .subscribe((status) => {
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        console.log('✅ Presence channel subscribed')
        
        // Track our presence (fire and forget)
        void presenceChannel?.track({
          user_id: user.value!.id,
          online_at: new Date().toISOString(),
        }).then((presenceTrackStatus) => {
          console.log('👤 Presence tracked:', presenceTrackStatus)
        })
      }
    })
}

const cleanup = async () => {
  if (presenceChannel) {
    // Untrack presence before leaving
    await presenceChannel.untrack()
    await supabase.removeChannel(presenceChannel)
    presenceChannel = null
  }
  
  // Set user offline in database
  await setOffline()
  
  // Reset initialization flag
  isInitialized = false
}

// Handle page visibility changes (user switching tabs or app going to background)
const handleVisibilityChange = () => {
  if (document.hidden) {
    // User switched away or app went to background - set offline
    console.log('📱 User switched away / app backgrounded - setting offline')
    void setOffline()
    if (presenceChannel) {
      void presenceChannel.untrack()
    }
  } else {
    // User came back or app foregrounded - set online
    console.log('📱 User came back / app foregrounded - setting online')
    void setOnline()
    if (presenceChannel && user.value) {
      void presenceChannel.track({
        user_id: user.value.id,
        online_at: new Date().toISOString(),
      })
    }
  }
}

// Handle window/tab close
const handleBeforeUnload = () => {
  // Use navigator.sendBeacon for reliable offline status update
  if (user.value) {
    const data = new FormData()
    data.append('user_id', user.value.id)
    
    // Note: This would need a server endpoint, or we rely on presence untrack
    console.log('🚪 User closing window')
  }
}

/**
 * Initialize presence system (call once from MainLayout)
 */
export function initPresence() {
  if (isInitialized || !user.value) return
  
  console.log('🚀 Initializing presence system (singleton)')
  
  void setOnline()
  setupPresenceChannel()
  
  // Listen for visibility changes
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  isInitialized = true
}

/**
 * Cleanup presence system (call from MainLayout unmount)
 */
export function cleanupPresence() {
  void cleanup()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('beforeunload', handleBeforeUnload)
}

/**
 * Use presence composable - returns shared singleton state
 */
export function usePresence() {
  // Auto-initialize on first call if user is available
  if (!isInitialized && user.value) {
    initPresence()
  }

  return {
    presenceState,
    onlineUsers,
    isUserOnline,
    setOnline,
    setOffline
  }
}

