<template>
  <q-page padding class="flex flex-center bg-grey-2">
    <q-card class="col-12 col-sm-8 col-md-6 shadow-10">
      <!-- Loading State -->
      <q-card-section v-if="loadingGym" class="text-center">
        <q-spinner-hourglass color="primary" size="50px" />
        <div class="text-body1 q-mt-md">Loading gym information...</div>
      </q-card-section>

      <!-- Gym Info -->
      <template v-else-if="gymInfo">
        <!-- Platform Detection Banner (Mobile Only, Not Simulated App) -->
        <q-banner v-if="isMobile && !isAuthenticated && !simulatedAppOpen" class="bg-primary text-white" dense>
          <template v-slot:avatar>
            <q-icon :name="isIOS ? 'phone_iphone' : 'phone_android'" />
          </template>
          <div class="text-body2">
            Get the best experience with our mobile app
          </div>
        </q-banner>

        <q-card-section class="text-center">
          <q-icon name="business" size="64px" color="primary" class="q-mb-md" />
          <div class="text-h5">Join {{ gymInfo.name }}</div>
          <div class="text-body2 text-grey-7">
            You've been invited to join this gym
          </div>
        </q-card-section>

        <q-separator />

        <!-- App Download Options (Mobile, Not Authenticated, Not Simulated) -->
        <q-card-section v-if="isMobile && !isAuthenticated && !showSignupForm" class="q-gutter-md">
          <div class="text-h6 text-center q-mb-md">Choose How to Join</div>
          
          <!-- Option 1: Download App (Recommended) -->
          <q-card flat bordered class="q-pa-md bg-blue-1">
            <div class="row items-center">
              <q-icon name="star" color="amber" size="32px" class="q-mr-md" />
              <div class="col">
                <div class="text-body1 text-weight-bold">Recommended</div>
                <div class="text-caption text-grey-7">Best experience with push notifications</div>
              </div>
            </div>
            
            <q-btn
              :label="isIOS ? 'Download on App Store' : 'Get it on Play Store'"
              :icon="isIOS ? 'apple' : 'android'"
              color="primary"
              unelevated
              no-caps
              class="full-width q-mt-md"
              @click="openAppStore"
              :loading="attemptingDeepLink"
            />
            
            <div class="text-caption text-grey-6 text-center q-mt-sm">
              Free • {{ isIOS ? 'iOS 13+' : 'Android 8+' }}
            </div>
          </q-card>

          <!-- Option 2: Continue in Browser -->
          <q-card flat bordered class="q-pa-md">
            <div class="text-body2 text-weight-medium q-mb-sm">
              Or continue in browser
            </div>
            <div class="text-caption text-grey-7 q-mb-md">
              Quick access without installing an app
            </div>
            <q-btn
              label="Continue in Browser"
              icon="public"
              outline
              color="primary"
              no-caps
              class="full-width"
              @click="continueInBrowser"
            />
          </q-card>
        </q-card-section>

        <!-- Desktop or Already Chose Browser -->
        <q-card-section v-if="!isAuthenticated && (showSignupForm || !isMobile)" class="q-gutter-md">
          <div v-if="!hasSignedUp" class="text-body1 text-weight-medium q-mb-md">
            Create your account to join
          </div>

          <!-- Quick Signup Form -->
          <q-form v-if="!hasSignedUp" @submit="onSignup" class="q-gutter-md">
            <q-input
              v-model="signupForm.name"
              label="Full Name"
              required
              outlined
              :rules="[(val) => !!val || 'Name is required']"
            >
              <template v-slot:prepend>
                <q-icon name="person" />
              </template>
            </q-input>

            <q-input
              v-model="signupForm.email"
              label="Email"
              type="email"
              required
              outlined
              :rules="[(val) => !!val || 'Email is required']"
            >
              <template v-slot:prepend>
                <q-icon name="email" />
              </template>
            </q-input>

            <q-input
              v-model="signupForm.password"
              label="Password"
              :type="showPassword ? 'text' : 'password'"
              required
              outlined
              :rules="[(val) => val.length >= 6 || 'Password must be at least 6 characters']"
            >
              <template v-slot:prepend>
                <q-icon name="lock" />
              </template>
              <template v-slot:append>
                <q-icon
                  :name="showPassword ? 'visibility_off' : 'visibility'"
                  class="cursor-pointer"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>

            <q-btn
              type="submit"
              label="Sign Up & Join Gym"
              color="primary"
              unelevated
              no-caps
              class="full-width"
              :loading="loading"
            />
          </q-form>

          <!-- Inline Login Form (shows after email confirmation required) -->
          <div v-if="showLoginForm" class="q-mt-lg q-pt-lg" style="border-top: 1px solid #e0e0e0">
            <div class="text-h6 text-center q-mb-md">
              Already confirmed? Login here:
            </div>
            
            <q-form @submit="handleLogin" class="q-gutter-md">
              <q-input
                v-model="loginForm.email"
                label="Email"
                type="email"
                required
                outlined
                :rules="[(val) => !!val || 'Email is required']"
              >
                <template v-slot:prepend>
                  <q-icon name="email" />
                </template>
              </q-input>

              <q-input
                v-model="loginForm.password"
                label="Password"
                :type="showPassword ? 'text' : 'password'"
                required
                outlined
                :rules="[(val) => !!val || 'Password is required']"
              >
                <template v-slot:prepend>
                  <q-icon name="lock" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <q-btn
                type="submit"
                label="Login & Join Gym"
                color="primary"
                unelevated
                no-caps
                class="full-width"
                :loading="loginLoading"
              />
            </q-form>
          </div>

          <div v-if="!hasSignedUp && !showLoginForm" class="text-center q-mt-md">
            <div class="text-body2 text-grey-7">Already have an account?</div>
            <q-btn
              label="Log In Instead"
              flat
              color="primary"
              no-caps
              @click="redirectToLogin"
            />
          </div>
        </q-card-section>

        <!-- Logged In - Show Join Button or Status -->
        <q-card-section v-else>
          <div v-if="joinStatus === 'pending'" class="text-center">
            <q-icon name="schedule" size="48px" color="orange" class="q-mb-md" />
            <div class="text-h6">Request Pending</div>
            <div class="text-body2 text-grey-7">
              Your request to join {{ gymInfo.name }} is pending approval from the gym owner.
            </div>
          </div>

          <div v-else-if="joinStatus === 'success'" class="text-center">
            <q-icon name="check_circle" size="48px" color="positive" class="q-mb-md" />
            <div class="text-h6">Welcome!</div>
            <div class="text-body2 text-grey-7 q-mb-md">
              You've successfully joined {{ gymInfo.name }}
            </div>
            <q-btn
              label="Go to Chats"
              color="primary"
              unelevated
              no-caps
              icon="chat"
              @click="redirectToChats"
            />
          </div>

          <div v-else>
            <div class="text-body1 q-mb-md text-center">
              Ready to join <strong>{{ gymInfo.name }}</strong>?
            </div>
            <q-btn
              label="Join Gym"
              color="primary"
              unelevated
              no-caps
              icon="done"
              @click="joinGym"
              :loading="loading"
              class="full-width"
            />
          </div>
        </q-card-section>
      </template>

      <!-- Error State -->
      <q-card-section v-else class="text-center">
        <q-icon name="error_outline" size="64px" color="negative" class="q-mb-md" />
        <div class="text-h6">Invalid QR Code</div>
        <div class="text-body2 text-grey-7">
          This QR code is invalid or has expired.
        </div>
        <q-btn
          label="Go Home"
          color="primary"
          flat
          no-caps
          class="q-mt-md"
          @click="() => $router.push('/')"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar, LocalStorage } from 'quasar'
import { useGymQR } from '../composables/useGymQR'
import { isAuthenticated, user, loadProfile } from '../state/auth'
import { supabase } from '../boot/supabase'
import { APP_CONFIG, getDeepLink } from '../config/app-links'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const { joinGymViaQR, getGymByToken, loading } = useGymQR()

const loadingGym = ref(true)
const gymInfo = ref<any>(null)
const token = ref<string>('')
const joinStatus = ref<'idle' | 'pending' | 'success'>('idle')
const showSignupForm = ref(false)
const attemptingDeepLink = ref(false)
const simulatedAppOpen = ref(false)

// Platform detection
const isMobile = computed(() => $q.platform.is.mobile)
const isIOS = computed(() => $q.platform.is.ios)

// App Store URLs from configuration
const APP_STORE_URL = APP_CONFIG.appStoreURL
const PLAY_STORE_URL = APP_CONFIG.playStoreURL

// Signup form
const signupForm = ref({
  name: '',
  email: '',
  password: ''
})
const showPassword = ref(false)
const showLoginForm = ref(false)
const hasSignedUp = ref(false)
const loginForm = ref({
  email: '',
  password: ''
})
const loginLoading = ref(false)

onMounted(async () => {
  token.value = route.params.token as string

  if (!token.value) {
    $q.notify({
      type: 'negative',
      message: 'Invalid QR code'
    })
    loadingGym.value = false
    return
  }

  // Store token in localStorage for post-confirmation flow
  LocalStorage.set('pendingGymJoin', token.value)

  // Check if this is a simulated app open (from deep link simulation)
  const isSimulated = LocalStorage.getItem('simulateAppInstalled')
  if (isSimulated === 'true') {
    simulatedAppOpen.value = true
    showSignupForm.value = true // Skip app download, go straight to signup
    LocalStorage.remove('simulateAppInstalled')
  }

  // If user is already authenticated, check if they just came back after confirmation
  if (isAuthenticated.value && user.value?.id) {
    // Auto-join if they're coming back to complete the flow
    await joinGymAfterAuth()
  }

  try {
    // Fetch gym info
    const gym = await getGymByToken(token.value)
    gymInfo.value = gym

    // Try deep link if mobile and not authenticated (but not if simulated)
    if (isMobile.value && !isAuthenticated.value && !simulatedAppOpen.value) {
      attemptDeepLink()
    }
  } catch (err) {
    console.error('Error loading gym:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to load gym information'
    })
  } finally {
    loadingGym.value = false
  }
})

function attemptDeepLink() {
  // Try to open app if installed
  const deepLink = getDeepLink(`join/${token.value}`)
  
  attemptingDeepLink.value = true
  
  // Create invisible iframe to attempt deep link
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = deepLink
  document.body.appendChild(iframe)
  
  // Wait 2 seconds - if still on page, app isn't installed
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe)
    }
    attemptingDeepLink.value = false
  }, 2000)
}

function openAppStore() {
  const url = isIOS.value ? APP_STORE_URL : PLAY_STORE_URL
  window.open(url, '_blank')
  
  $q.notify({
    type: 'info',
    message: 'Opening app store...',
    caption: 'After installing, scan the QR code again to join',
    timeout: 5000
  })
}

function continueInBrowser() {
  showSignupForm.value = true
}

async function onSignup() {
  try {
    loading.value = true

    // Sign up user
    const { data, error: signupError } = await supabase.auth.signUp({
      email: signupForm.value.email,
      password: signupForm.value.password,
      options: {
        data: {
          name: signupForm.value.name
        }
      }
    })

    if (signupError) throw signupError
    if (!data.user) throw new Error('Signup failed')

    console.log('✅ Signup successful, user:', data.user.id)
    console.log('🔑 Session:', data.session ? 'exists' : 'null')

    // Wait for session to be established
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Verify session before joining
    const { data: sessionData } = await supabase.auth.getSession()
    console.log('🔐 Current session:', sessionData.session ? 'active' : 'none')

    if (!sessionData.session) {
      // Email confirmation is required - show login form
      hasSignedUp.value = true
      showLoginForm.value = true
      loginForm.value.email = signupForm.value.email // Pre-fill email
      $q.notify({
        type: 'info',
        message: 'Please check your email and confirm your account. Then login below to complete joining.',
        timeout: 5000
      })
      return
    }

    // Join gym
    await joinGymAfterAuth()
  } catch (err) {
    console.error('Error signing up:', err)
    $q.notify({
      type: 'negative',
      message: (err as Error).message || 'Failed to sign up'
    })
  } finally {
    loading.value = false
  }
}

async function joinGym() {
  if (!user.value?.id) {
    $q.notify({
      type: 'negative',
      message: 'You must be logged in to join a gym'
    })
    return
  }

  await joinGymAfterAuth()
}

async function joinGymAfterAuth() {
  try {
    const result = await joinGymViaQR(token.value)

    if (result.requiresApproval) {
      joinStatus.value = 'pending'
      $q.notify({
        type: 'info',
        message: `Your request to join ${result.gymName} has been sent to the gym owner for approval.`,
        timeout: 3000
      })
    } else {
      joinStatus.value = 'success'
      
      // Refresh profile FIRST to update role/gym_id in auth state
      await loadProfile()
      
      // Clear the pending join token from localStorage
      LocalStorage.remove('pendingGymJoin')
      
      $q.notify({
        type: 'positive',
        message: `Welcome to ${result.gymName}! 🎉`,
        timeout: 2000
      })

      // Redirect immediately - router guard will now see updated profile
      void router.push('/chats')
    }
  } catch (err) {
    console.error('Error joining gym:', err)
    $q.notify({
      type: 'negative',
      message: (err as Error).message || 'Failed to join gym',
      timeout: 3000
    })
  }
}

async function handleLogin() {
  try {
    loginLoading.value = true
    
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: loginForm.value.email,
      password: loginForm.value.password
    })

    if (loginError) throw loginError
    if (!data.user) throw new Error('Login failed')

    console.log('✅ Login successful, user:', data.user.id)
    
    // Join gym immediately after successful login
    await joinGymAfterAuth()
  } catch (err) {
    console.error('Error logging in:', err)
    $q.notify({
      type: 'negative',
      message: (err as Error).message || 'Failed to login',
      timeout: 3000
    })
  } finally {
    loginLoading.value = false
  }
}

function redirectToLogin() {
  void router.push(`/login?redirect=/join/${token.value}`)
}

function redirectToChats() {
  void router.push('/chats')
}
</script>

<style scoped lang="scss">
.bg-grey-2 {
  min-height: 100vh;
}
</style>
