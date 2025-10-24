import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gauntletai.ossome',
  appName: 'Ossome',
  webDir: 'dist/spa',
  
  // Deep linking configuration
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Allow the app to handle URLs from your domain
    hostname: 'ossome.app', // Update with your actual domain
  },
  
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#ffffff',
    preferredContentMode: 'mobile'
  },
  
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1976D2',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff'
    },
    Keyboard: {
      resize: 'native',
      style: 'dark',
      resizeOnFullScreen: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
    // Note: Custom URL schemes are configured in iOS Info.plist and Android AndroidManifest.xml
    // See SMART_LANDING_SETUP.md for deep linking configuration
  }
};

export default config;
