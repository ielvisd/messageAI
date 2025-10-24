import { App } from '@capacitor/app'
import type { URLOpenListenerEvent } from '@capacitor/app'
import { useRouter } from 'vue-router'
import { onMounted, onUnmounted } from 'vue'

/**
 * Deep Link Handler Composable
 * 
 * Handles deep links when the app is opened via:
 * - Custom URL scheme (ossome://join/TOKEN)
 * - Universal Links (https://ossome.app/join/TOKEN)
 * - App Links (https://ossome.app/join/TOKEN)
 */
export function useDeepLink() {
  const router = useRouter()
  
  /**
   * Handle incoming app URL
   */
  function handleAppUrl(event: URLOpenListenerEvent) {
    const url = event.url
    console.log('📱 Deep link received:', url)
    
    try {
      // Extract path from URL
      let path = ''
      
      // Handle custom scheme: ossome://join/TOKEN
      if (url.includes('ossome://')) {
        path = url.replace('ossome://', '')
      }
      // Handle universal/app links: https://ossome.app/join/TOKEN
      else if (url.includes('ossome.app')) {
        const urlObj = new URL(url)
        path = urlObj.pathname.substring(1) // Remove leading slash
      }
      // Handle hash-based routes: https://ossome.app/#/join/TOKEN
      else if (url.includes('#/')) {
        const parts = url.split('#/')
        path = parts[1] || ''
      }
      
      if (path) {
        console.log('📍 Navigating to:', path)
        // Navigate to the path in the app
        void router.push('/' + path)
      }
    } catch (err) {
      console.error('❌ Error handling deep link:', err)
    }
  }
  
  /**
   * Set up deep link listener
   */
  function setupDeepLinking() {
    // Listen for app URL events (when app is opened via link)
    void App.addListener('appUrlOpen', handleAppUrl)
    
    console.log('✅ Deep link listener registered')
  }
  
  /**
   * Clean up deep link listener
   */
  function cleanupDeepLinking() {
    void App.removeAllListeners()
    console.log('🧹 Deep link listener removed')
  }
  
  /**
   * Auto-setup on mount, cleanup on unmount
   */
  onMounted(() => {
    setupDeepLinking()
  })
  
  onUnmounted(() => {
    cleanupDeepLinking()
  })
  
  return {
    setupDeepLinking,
    cleanupDeepLinking,
    handleAppUrl
  }
}

/**
 * Check if running in native app or web
 */
export function isNativeApp(): boolean {
  return (window as any).Capacitor?.isNativePlatform() || false
}

/**
 * Get current platform
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  const capacitor = (window as any).Capacitor
  if (!capacitor?.isNativePlatform()) return 'web'
  
  if (capacitor.getPlatform() === 'ios') return 'ios'
  if (capacitor.getPlatform() === 'android') return 'android'
  
  return 'web'
}

