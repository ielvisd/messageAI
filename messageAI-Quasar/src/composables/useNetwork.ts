import { ref, onMounted, onUnmounted } from 'vue'
import { Network } from '@capacitor/network'

export function useNetwork() {
  const isOnline = ref(true)
  const connectionType = ref<string>('unknown')
  
  let networkListener: { remove: () => void } | null = null

  const checkStatus = async () => {
    try {
      const status = await Network.getStatus()
      isOnline.value = status.connected
      connectionType.value = status.connectionType
      console.log('📡 Network status:', { connected: status.connected, type: status.connectionType })
    } catch (error) {
      console.warn('Network plugin not available, assuming online:', error)
      // Fallback to browser API if Capacitor plugin fails
      isOnline.value = navigator.onLine
      connectionType.value = 'unknown'
    }
  }

  const setupListener = async () => {
    try {
      networkListener = await Network.addListener('networkStatusChange', (status) => {
        console.log('📡 Network status changed:', status)
        isOnline.value = status.connected
        connectionType.value = status.connectionType
      })
    } catch (error) {
      console.warn('Could not set up network listener, using browser events:', error)
      // Fallback to browser events
      window.addEventListener('online', () => {
        console.log('📡 Browser detected: online')
        isOnline.value = true
      })
      window.addEventListener('offline', () => {
        console.log('📡 Browser detected: offline')
        isOnline.value = false
      })
    }
  }

  const cleanup = async () => {
    if (networkListener) {
      await networkListener.remove()
      networkListener = null
    }
  }

  onMounted(() => {
    void checkStatus()
    void setupListener()
  })

  onUnmounted(() => {
    void cleanup()
  })

  return {
    isOnline,
    connectionType,
    checkStatus
  }
}

