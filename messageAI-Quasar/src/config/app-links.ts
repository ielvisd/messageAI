/**
 * App Store Links and Deep Linking Configuration
 * 
 * Update these values with your actual app store URLs
 * when you publish to App Store and Play Store
 */

export const APP_CONFIG = {
  // iOS App Store URL
  // Get this from: https://apps.apple.com/developer after publishing
  appStoreURL: 'https://apps.apple.com/app/ossome/id123456789', // TODO: Update with real App Store ID
  
  // Android Play Store URL
  // Get this from: https://play.google.com/console after publishing
  playStoreURL: 'https://play.google.com/store/apps/details?id=com.gauntletai.ossome', // TODO: Update with real package name
  
  // Custom URL Scheme for deep linking
  // This should match the scheme in capacitor.config.ts
  deepLinkScheme: 'ossome://',
  
  // App Package/Bundle IDs
  iosBundleId: 'com.gauntletai.ossome',
  androidPackageId: 'com.gauntletai.ossome',
  
  // Universal Links domain (for iOS)
  // This should be your actual domain
  universalLinkDomain: 'ossome.app', // TODO: Update with your domain
  
  // App Links domain (for Android)
  // This should be your actual domain
  appLinkDomain: 'ossome.app', // TODO: Update with your domain
}

/**
 * Generate deep link URL for a specific route
 */
export function getDeepLink(path: string): string {
  return `${APP_CONFIG.deepLinkScheme}${path}`
}

/**
 * Generate universal link (web URL that opens app if installed)
 */
export function getUniversalLink(path: string): string {
  return `https://${APP_CONFIG.universalLinkDomain}/${path}`
}

/**
 * Check if app is likely installed (heuristic)
 * This is not 100% accurate but helps with UX
 */
export function checkIfAppInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false)
    }, 2000)
    
    // Try to open app
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = APP_CONFIG.deepLinkScheme
    
    // If page is still visible after 500ms, app likely not installed
    setTimeout(() => {
      if (document.hidden || (document as any).webkitHidden) {
        clearTimeout(timeout)
        resolve(true)
      }
    }, 500)
    
    document.body.appendChild(iframe)
    
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 2500)
  })
}

