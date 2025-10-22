import { ref, onMounted } from 'vue'
import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'
import { useRouter } from 'vue-router'

export function usePushNotifications() {
  const pushToken = ref<string | null>(null)
  const isRegistered = ref(false)
  const error = ref<string | null>(null)
  const router = useRouter()

  /**
   * Register for push notifications
   */
  const register = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Push notifications only available on native platforms')
      return
    }

    if (!user.value) {
      console.warn('⚠️ User not authenticated, cannot register push notifications')
      return
    }

    try {
      console.log('🔔 Registering for push notifications...')

      // Request permission
      const permissionResult = await PushNotifications.requestPermissions()
      
      if (permissionResult.receive === 'granted') {
        console.log('✅ Push notification permission granted')
        await PushNotifications.register()
      } else {
        console.warn('❌ Push notification permission denied')
        error.value = 'Push notification permission denied'
      }
    } catch (err) {
      console.error('❌ Error registering push notifications:', err)
      error.value = err instanceof Error ? err.message : 'Failed to register push notifications'
    }
  }

  /**
   * Save push token to Supabase
   */
  const savePushToken = async (token: string) => {
    if (!user.value) return

    try {
      console.log('💾 Saving push token to database...')
      
      const platform = Capacitor.getPlatform() // 'ios', 'android', or 'web'
      
      const { error: saveError } = await supabase.rpc('add_push_token', {
        p_user_id: user.value.id,
        p_token: token,
        p_platform: platform
      })

      if (saveError) throw saveError

      pushToken.value = token
      isRegistered.value = true
      console.log(`✅ Push token saved for platform: ${platform}`)
    } catch (err) {
      console.error('❌ Error saving push token:', err)
      error.value = err instanceof Error ? err.message : 'Failed to save push token'
    }
  }

  /**
   * Remove push token from Supabase
   */
  const removePushToken = async () => {
    if (!user.value || !pushToken.value) return

    try {
      console.log('🗑️ Removing push token from database...')
      
      const { error: removeError } = await supabase.rpc('remove_push_token', {
        p_user_id: user.value.id,
        p_token: pushToken.value
      })

      if (removeError) throw removeError

      pushToken.value = null
      isRegistered.value = false
      console.log('✅ Push token removed')
    } catch (err) {
      console.error('❌ Error removing push token:', err)
    }
  }

  /**
   * Handle notification when app is in foreground
   */
  const handleForegroundNotification = (notification: PushNotificationSchema) => {
    console.log('🔔 Foreground notification received:', notification)
    
    // You can show a custom UI notification here if desired
    // For now, we'll just log it since the message will appear in real-time anyway
  }

  /**
   * Handle notification tap (when app is in background or closed)
   */
  const handleNotificationTap = (action: ActionPerformed) => {
    console.log('👆 Notification tapped:', action)
    
    // Navigate to the chat if chat_id is present in notification data
    const chatId = action.notification.data?.chat_id
    if (chatId) {
      console.log(`📱 Navigating to chat: ${chatId}`)
      void router.push(`/chat/${chatId}`)
    }
  }

  /**
   * Setup push notification listeners
   */
  const setupListeners = () => {
    if (!Capacitor.isNativePlatform()) return

    // Registration success
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('✅ Push registration success, token:', token.value)
      void savePushToken(token.value)
    })

    // Registration error
    PushNotifications.addListener('registrationError', (err) => {
      console.error('❌ Push registration error:', err)
      error.value = 'Registration failed'
    })

    // Notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      handleForegroundNotification(notification)
    })

    // Notification tapped (app in background or closed)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      handleNotificationTap(action)
    })

    console.log('🎧 Push notification listeners set up')
  }

  /**
   * Remove all listeners (cleanup)
   */
  const removeListeners = async () => {
    if (!Capacitor.isNativePlatform()) return

    await PushNotifications.removeAllListeners()
    console.log('🔇 Push notification listeners removed')
  }

  /**
   * Initialize push notifications
   */
  const initialize = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Skipping push notifications on web platform')
      return
    }

    setupListeners()
    
    // Auto-register if user is authenticated
    if (user.value) {
      await register()
    }
  }

  // Auto-initialize on mount
  onMounted(() => {
    void initialize()
  })

  return {
    pushToken,
    isRegistered,
    error,
    register,
    removePushToken,
    removeListeners,
    initialize
  }
}

