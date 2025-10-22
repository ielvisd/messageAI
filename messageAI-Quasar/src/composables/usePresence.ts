import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'

export interface UserPresence {
  user_id: string
  online_at: string
}

export function usePresence() {
  const presenceState = ref<Record<string, UserPresence[]>>({})
  const onlineUsers = ref<Set<string>>(new Set())
  
  let presenceChannel: RealtimeChannel | null = null

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
    if (!user.value) return

    console.log('🔔 Setting up presence channel...')

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
  }

  // Handle page visibility changes (user switching tabs)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // User switched away - could set to "away" after a delay
      console.log('📱 User switched away')
    } else {
      // User came back
      console.log('📱 User came back')
      void setOnline()
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

  onMounted(() => {
    if (user.value) {
      void setOnline()
      setupPresenceChannel()
      
      // Listen for visibility changes
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
  })

  onUnmounted(() => {
    void cleanup()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  return {
    presenceState,
    onlineUsers,
    isUserOnline,
    setOnline,
    setOffline
  }
}

