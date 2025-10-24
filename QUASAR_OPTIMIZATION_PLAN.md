# Quasar Framework Optimization Plan

## Overview
This document outlines the comprehensive Quasar optimization strategy for MessageAI gym app, covering component best practices, mobile/PWA setup, and platform-specific optimizations.

---

## 1. Immediate Issues Found & Fixes Needed

### A. Missing Quasar Plugins
**Current Issue:** Only `Notify` plugin is imported
**Need to Add:**
```typescript
// quasar.config.ts - framework.plugins
plugins: [
  'Notify',
  'Dialog',      // For confirmation dialogs (blocking users, deleting items)
  'Loading',     // For full-screen loading states
  'LocalStorage' // For offline caching and preferences
]
```

### B. Missing Animations
**Current Issue:** `animations: []` (no animations enabled)
**Recommendation:** Add smooth transitions for better UX
```typescript
animations: [
  'fadeIn',
  'fadeOut',
  'slideInUp',
  'slideOutDown'
]
```

### C. PWA Configuration Incomplete
**Current Issue:** Basic PWA setup, missing offline support
**Need:**
- Service worker configuration
- Offline fallback
- Background sync for messages
- Push notification handling

---

## 2. Component-by-Component Review

### GymSetupPage.vue

#### Issues Found:
1. ❌ Using inline styles (`style="max-width: 600px"`)
2. ❌ No form validation feedback
3. ❌ No mobile-optimized layout
4. ❌ Missing QForm ref for programmatic validation
5. ❌ Locations list could use QExpansionItem for better mobile UX

#### Optimizations:
```vue
<template>
  <q-page padding class="flex flex-center">
    <!-- Use Quasar breakpoints instead of inline styles -->
    <div class="col-12 col-sm-10 col-md-8 col-lg-6">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h5 text-weight-medium text-center q-mb-md">
            Welcome! Let's set up your gym
          </div>
          <div class="text-body2 text-center text-grey-7 q-mb-lg">
            You'll be able to invite instructors and students after setup
          </div>

          <!-- Add ref for programmatic validation -->
          <q-form 
            ref="formRef"
            @submit="onSubmit" 
            class="q-gutter-md"
            greedy
          >
            <!-- Use QInput with better mobile experience -->
            <q-input
              v-model="gymName"
              label="Gym Name"
              hint="e.g., Elite Brazilian Jiu-Jitsu Academy"
              :rules="[val => !!val || 'Gym name is required']"
              filled
              lazy-rules
              clearable
              autofocus
            >
              <template v-slot:prepend>
                <q-icon name="business" />
              </template>
            </q-input>

            <!-- Better location management with expansion items -->
            <div>
              <div class="text-subtitle2 q-mb-sm">
                Gym Locations
                <q-badge v-if="locations.length > 0" color="primary">
                  {{ locations.length }}
                </q-badge>
              </div>

              <q-list bordered separator class="rounded-borders">
                <q-expansion-item
                  v-for="(location, index) in locations"
                  :key="index"
                  :label="location.name"
                  :caption="location.address"
                  expand-separator
                  icon="place"
                  header-class="bg-grey-2"
                >
                  <q-card flat>
                    <q-card-section>
                      <div class="text-body2">{{ location.address }}</div>
                    </q-card-section>
                    <q-card-actions align="right">
                      <q-btn
                        flat
                        label="Remove"
                        color="negative"
                        icon="delete"
                        @click="removeLocation(index)"
                      />
                    </q-card-actions>
                  </q-card>
                </q-expansion-item>
              </q-list>

              <!-- Add Location Card -->
              <q-card flat bordered class="q-mt-md">
                <q-card-section>
                  <div class="text-subtitle2 q-mb-md">Add New Location</div>
                  <div class="q-gutter-sm">
                    <q-input
                      v-model="newLocation.name"
                      label="Location Name"
                      placeholder="e.g., North, South, Downtown"
                      filled
                      dense
                    >
                      <template v-slot:prepend>
                        <q-icon name="location_city" />
                      </template>
                    </q-input>
                    <q-input
                      v-model="newLocation.address"
                      label="Address"
                      placeholder="123 Main St, City, State"
                      filled
                      dense
                    >
                      <template v-slot:prepend>
                        <q-icon name="place" />
                      </template>
                    </q-input>
                  </div>
                </q-card-section>
                <q-card-actions>
                  <q-btn
                    label="Add Location"
                    icon="add"
                    color="primary"
                    @click="addLocation"
                    :disable="!newLocation.name || !newLocation.address"
                    class="full-width"
                  />
                </q-card-actions>
              </q-card>

              <q-banner 
                v-if="locations.length === 0" 
                class="bg-warning text-white q-mt-sm"
                dense
              >
                <template v-slot:avatar>
                  <q-icon name="warning" />
                </template>
                Please add at least one location
              </q-banner>
            </div>

            <!-- Settings with better grouping -->
            <q-card flat bordered class="q-mt-lg">
              <q-card-section>
                <div class="text-subtitle2 q-mb-md">Initial Settings</div>
                <div class="text-caption text-grey-7 q-mb-md">
                  You can change these anytime in settings
                </div>
                
                <q-list>
                  <q-item tag="label">
                    <q-item-section avatar>
                      <q-toggle
                        v-model="settings.studentsCanMessage"
                        color="primary"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>Student Messaging</q-item-label>
                      <q-item-label caption>
                        Allow students to message each other directly
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item tag="label">
                    <q-item-section avatar>
                      <q-toggle
                        v-model="settings.studentsCanCreateGroups"
                        color="primary"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>Student Groups</q-item-label>
                      <q-item-label caption>
                        Allow students to create group chats
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-separator spaced />

                  <q-item>
                    <q-item-section avatar>
                      <q-toggle
                        v-model="settings.instructorsCanCreateClasses"
                        color="positive"
                        disable
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>Instructor Class Creation</q-item-label>
                      <q-item-label caption>
                        Enabled by default
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-toggle
                        v-model="settings.aiEnabled"
                        color="primary"
                        disable
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>AI Assistant</q-item-label>
                      <q-item-label caption>
                        Smart scheduling and messaging help
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>

            <!-- Submit with better visual hierarchy -->
            <div class="q-mt-lg">
              <q-btn
                type="submit"
                color="primary"
                label="Create Gym & Continue"
                class="full-width"
                :loading="loading"
                :disable="loading || locations.length === 0"
                size="lg"
                unelevated
                no-caps
              >
                <template v-slot:loading>
                  <q-spinner-hourglass />
                </template>
              </q-btn>
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGym } from '../composables/useGym';
import { user } from '../state/auth';
import { supabase } from '../boot/supabase';
import { useQuasar, QForm } from 'quasar';

const router = useRouter();
const $q = useQuasar();
const { createGym } = useGym();

const formRef = ref<QForm>();
const gymName = ref('');
const locations = ref<Array<{ name: string; address: string }>>([]);
const newLocation = ref({ name: '', address: '' });
const settings = ref({
  studentsCanMessage: false,
  studentsCanCreateGroups: false,
  instructorsCanCreateClasses: true,
  instructorsEditOwnOnly: true,
  aiEnabled: true,
  aiAutoRespond: true
});
const loading = ref(false);

function addLocation() {
  if (newLocation.value.name && newLocation.value.address) {
    locations.value.push({ ...newLocation.value });
    newLocation.value = { name: '', address: '' };
    
    $q.notify({
      type: 'positive',
      message: 'Location added',
      position: 'top',
      timeout: 1000
    });
  }
}

function removeLocation(index: number) {
  const locationName = locations.value[index].name;
  
  $q.dialog({
    title: 'Remove Location',
    message: `Remove ${locationName}?`,
    cancel: true,
    persistent: false
  }).onOk(() => {
    locations.value.splice(index, 1);
    $q.notify({
      type: 'info',
      message: 'Location removed',
      position: 'top',
      timeout: 1000
    });
  });
}

async function onSubmit() {
  // Validate form first
  const valid = await formRef.value?.validate();
  if (!valid) return;

  if (!user.value?.id) {
    $q.notify({
      type: 'negative',
      message: 'You must be logged in to create a gym',
      position: 'top'
    });
    return;
  }

  if (locations.value.length === 0) {
    $q.notify({
      type: 'negative',
      message: 'Please add at least one location',
      position: 'top'
    });
    return;
  }

  loading.value = true;

  try {
    // Create gym
    const { data: gym, error: gymError } = await createGym({
      name: gymName.value,
      owner_id: user.value.id,
      locations: locations.value,
      settings: settings.value
    });

    if (gymError) throw gymError;

    if (!gym) {
      throw new Error('Failed to create gym');
    }

    // Update user profile with gym_id and role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        gym_id: gym.id,
        role: 'owner'
      })
      .eq('id', user.value.id);

    if (profileError) throw profileError;

    // Update local user state
    (user.value as any).gym_id = gym.id;
    (user.value as any).role = 'owner';

    $q.notify({
      type: 'positive',
      message: `${gym.name} created successfully! 🎉`,
      position: 'top',
      timeout: 2000
    });

    // Redirect to owner dashboard
    void router.push('/dashboard');
  } catch (err) {
    console.error('Error creating gym:', err);
    $q.notify({
      type: 'negative',
      message: (err as Error).message || 'Failed to create gym',
      position: 'top',
      timeout: 3000
    });
  } finally {
    loading.value = false;
  }
}
</script>
```

---

## 3. Mobile/iOS Optimizations

### A. Safe Area Handling
Add to `App.vue` or main layout:
```vue
<style>
/* iOS safe area support */
.q-page {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* For notched devices */
.q-header {
  padding-top: env(safe-area-inset-top);
}

.q-footer {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
```

### B. Capacitor Optimizations
Update `capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gauntletai.messageai',
  appName: 'MessageAI',
  webDir: 'dist/spa',
  server: {
    androidScheme: 'https',
    iosScheme: 'ionic',
    // For development only
    // url: 'http://192.168.1.x:9000',
    // cleartext: true
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
  }
};

export default config;
```

### C. Platform-Specific Styling
Create `src/css/platform.scss`:
```scss
// iOS-specific styles
.platform-ios {
  .q-btn {
    border-radius: 12px; // iOS style rounded buttons
  }
  
  .q-card {
    border-radius: 12px;
  }
  
  .q-dialog__backdrop {
    backdrop-filter: blur(10px);
  }
}

// Android-specific styles
.platform-android {
  .q-btn {
    text-transform: uppercase;
  }
  
  .q-card {
    border-radius: 4px;
  }
}

// Handle keyboard resize
.keyboard-open {
  .q-page-container {
    padding-bottom: 0;
  }
}
```

---

## 4. PWA Best Practices

### A. Update quasar.config.ts PWA section:
```typescript
pwa: {
  workboxMode: 'InjectManifest',
  swFilename: 'sw.js',
  manifestFilename: 'manifest.json',
  useCredentialsForManifestTag: true,
  injectPwaMetaTags: true,
  
  manifest: {
    name: 'MessageAI Gym App',
    short_name: 'MessageAI',
    description: 'AI-powered messaging for gyms and fitness centers',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1976D2',
    categories: ['fitness', 'productivity', 'social'],
    icons: [
      {
        src: 'icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png'
      },
      {
        src: 'icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: 'icons/icon-256x256.png',
        sizes: '256x256',
        type: 'image/png'
      },
      {
        src: 'icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png'
      },
      {
        src: 'icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  },
  
  extendManifestJson(json) {
    json.related_applications = [];
    json.prefer_related_applications = false;
  },
  
  extendInjectManifestOptions(cfg) {
    cfg.maximumFileSizeToCacheInBytes = 5 * 1024 * 1024; // 5MB
  }
}
```

### B. Create custom service worker (`src-pwa/custom-service-worker.ts`):
```typescript
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

// Precache app shell
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses with network-first strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/rest/v1/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Cache images with cache-first strategy
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// Background sync for messages
const bgSyncPlugin = new BackgroundSyncPlugin('messages-queue', {
  maxRetentionTime: 24 * 60, // Retry for 24 hours
});

registerRoute(
  ({ url }) => url.pathname.includes('/messages'),
  new NetworkFirst({
    cacheName: 'messages-cache',
    plugins: [bgSyncPlugin],
  }),
  'POST'
);
```

---

## 5. Performance Optimizations

### A. Lazy Loading Components
```typescript
// In routes.ts
const routes = [
  {
    path: '/dashboard',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { 
        path: '', 
        component: () => import('pages/OwnerDashboard.vue'),
        // Add prefetch for faster navigation
        meta: { prefetch: true }
      }
    ]
  }
];
```

### B. Component Auto-import Optimization
Update `quasar.config.ts`:
```typescript
framework: {
  config: {
    loadingBar: {
      color: 'primary',
      size: '4px',
      position: 'top'
    },
    notify: {
      position: 'top',
      timeout: 2500,
      actions: [{ icon: 'close', color: 'white' }]
    }
  },
  
  // Auto-import only components we use
  components: [
    'QBtn',
    'QCard',
    'QCardSection',
    'QCardActions',
    'QInput',
    'QForm',
    'QList',
    'QItem',
    'QItemSection',
    'QItemLabel',
    'QToggle',
    'QExpansionItem',
    'QBanner',
    'QBadge',
    'QSpinnerHourglass',
    'QIcon',
    'QSeparator',
    'QDialog',
    'QPage',
    'QPageContainer',
    'QLayout',
    'QHeader',
    'QToolbar',
    'QToolbarTitle',
    'QDrawer',
    'QScrollArea',
    'QAvatar',
    'QChip',
    'QTooltip'
  ],
  
  directives: [
    'Ripple',
    'ClosePopup'
  ],
  
  plugins: [
    'Notify',
    'Dialog',
    'Loading',
    'LocalStorage'
  ]
}
```

---

## 6. Next Steps

### Immediate (Apply SQL first, then these):
1. ✅ Apply profile trigger SQL fix
2. 🔄 Update `quasar.config.ts` with plugins and config
3. 🔄 Optimize GymSetupPage.vue with Quasar best practices
4. 🔄 Update Capacitor config for iOS
5. 🔄 Add platform-specific styles

### Short-term:
6. Review all dialog components (use QDialog properly)
7. Add proper loading states with QLoading
8. Implement offline detection and sync
9. Add pull-to-refresh for mobile
10. Optimize chat scrolling performance

### Medium-term:
11. Implement PWA background sync
12. Add iOS push notification handling
13. Create platform-specific builds
14. Add Quasar animations for transitions
15. Implement dark mode support

---

## 7. Testing Checklist

- [ ] Test on iOS Safari (responsive + PWA)
- [ ] Test on Android Chrome (responsive + PWA)
- [ ] Test offline mode (messages queue)
- [ ] Test keyboard handling on mobile
- [ ] Test safe area on notched devices
- [ ] Test push notifications (iOS + Android)
- [ ] Test back button behavior
- [ ] Test form validation on mobile keyboards
- [ ] Test touch gestures (swipe, pull-to-refresh)
- [ ] Test loading states and transitions

---

## Resources

- Quasar Docs: https://quasar.dev/docs
- Capacitor iOS: https://capacitorjs.com/docs/ios
- PWA Best Practices: https://web.dev/pwa-checklist/
- iOS Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/

