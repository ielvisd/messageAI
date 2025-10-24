<template>
  <q-page class="flex flex-center">
    <div class="q-pa-md" style="max-width: 400px; width: 100%">
      <q-card>
        <q-card-section>
          <div class="text-h6 text-center q-mb-md">Login to Ossome</div>
          <q-form @submit="onSubmit" class="q-gutter-md">
            <q-input
              v-model="email"
              type="email"
              label="Email"
              :rules="[val => !!val || 'Email is required']"
            />
            <q-input
              v-model="password"
              type="password"
              label="Password"
              :rules="[val => !!val || 'Password is required']"
            />
            <div class="q-gutter-sm">
            <q-btn
              type="submit"
              color="primary"
              label="Login"
              class="full-width"
              :loading="loading"
              :disable="loading"
            />
              <q-btn
                flat
                color="primary"
                label="Sign Up"
                class="full-width"
                @click="$router.push('/signup')"
              />
              <q-separator class="q-my-sm" />
              <div class="text-caption text-grey-7 text-center q-mb-sm">
                🧪 Quick Demo Login
              </div>
              <q-select
                v-model="selectedDemo"
                :options="demoAccounts"
                option-value="email"
                option-label="label"
                outlined
                dense
                label="Select Demo Profile"
                class="q-mb-sm"
              >
                <template v-slot:prepend>
                  <q-icon name="account_circle" />
                </template>
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar>
                      <q-icon :name="scope.opt.icon" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ scope.opt.name }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.description }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <q-btn
                unelevated
                color="secondary"
                label="Login as Selected Profile"
                class="full-width"
                :loading="loading"
                :disable="loading || !selectedDemo"
                @click="loginAsDemo"
              >
                <q-tooltip v-if="!selectedDemo">Select a demo profile first</q-tooltip>
                <q-tooltip v-else>Login as {{ selectedDemo.name }}</q-tooltip>
              </q-btn>
            </div>
          </q-form>
        </q-card-section>

        <!-- QR Code Demo Section (Always visible for testing) -->
        <q-card-section class="bg-grey-2">
          <q-separator class="q-mb-md" />
          
          <div class="text-caption text-grey-7 text-center q-mb-sm">
            🧪 Testing Mode
          </div>
          <div class="text-body2 text-weight-medium q-mb-sm">
            QR Code Demo
          </div>
          <div class="text-caption text-grey-7 q-mb-md">
            Simulate scanning a QR code by pasting the join link below
          </div>
          
          <q-input
            v-model="qrDemoLink"
            label="QR Code Link"
            placeholder="https://yourapp.com/#/join/abc123"
            outlined
            dense
            clearable
            class="q-mb-sm"
          >
            <template v-slot:prepend>
              <q-icon name="qr_code_scanner" />
            </template>
          </q-input>
          
          <div class="row q-gutter-sm">
            <q-btn
              label="Scan QR (Browser)"
              icon="arrow_forward"
              color="secondary"
              outline
              no-caps
              class="col"
              :disable="!isValidQRLink"
              @click="testQRCode"
            >
              <q-tooltip>Opens join page directly (web flow)</q-tooltip>
            </q-btn>
            <q-btn
              label="Scan → Open App"
              icon="phone_iphone"
              color="primary"
              unelevated
              no-caps
              class="col"
              :disable="!isValidQRLink"
              @click="simulateDeepLink"
            >
              <q-tooltip>Simulates scanning QR → downloading app → opening app with deep link</q-tooltip>
            </q-btn>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { signIn } from '../state/auth'
import { Notify, LocalStorage } from 'quasar'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)

// Demo Accounts
interface DemoAccount {
  email: string
  name: string
  description: string
  label: string
  icon: string
}

const demoAccounts: DemoAccount[] = [
  {
    email: 'alex.student@demo.com',
    name: 'Alex Chen',
    description: 'Adult, All Levels, Jiujitsio only',
    label: 'Alex Chen - Adult, All Levels',
    icon: 'person'
  },
  {
    email: 'jordan.competitor@demo.com',
    name: 'Jordan Martinez',
    description: 'Adult, Advanced, Both Gyms, Competition focus',
    label: 'Jordan Martinez - Advanced Competitor',
    icon: 'emoji_events'
  },
  {
    email: 'sam.teen@demo.com',
    name: 'Sam Johnson',
    description: 'Teen (15+), All Levels, Jiujitsio',
    label: 'Sam Johnson - Teen',
    icon: 'school'
  },
  {
    email: 'parent.trainer@demo.com',
    name: 'Taylor Smith',
    description: 'Parent Who Trains, Jiujitsio West',
    label: 'Taylor Smith - Parent/Student',
    icon: 'family_restroom'
  },
  {
    email: 'casey.beginner@demo.com',
    name: 'Casey Thompson',
    description: 'Adult Beginner, No-GI focus, Jiujitsio West',
    label: 'Casey Thompson - Beginner',
    icon: 'fitness_center'
  }
  // Note: Young kids (peewees, kids 8-12) don't have their own accounts
  // They are managed by parents through the parent dashboard
]

const selectedDemo = ref<DemoAccount | null>(null)

// QR Code Demo
const qrDemoLink = ref('')
const isValidQRLink = computed(() => {
  if (!qrDemoLink.value) return false
  // Check if it contains /join/ or #/join/
  return qrDemoLink.value.includes('/join/') || qrDemoLink.value.includes('#/join/')
})

async function loginAsDemo() {
  if (!selectedDemo.value) {
    Notify.create({
      type: 'warning',
      message: 'Please select a demo profile first'
    })
    return
  }

  loading.value = true
  
  const demoEmail = selectedDemo.value.email
  const demoPassword = 'demo123456'
  
  try {
    Notify.create({
      type: 'info',
      message: `🧪 Logging in as ${selectedDemo.value.name}...`,
      timeout: 1500
    })
    
    const { error } = await signIn(demoEmail, demoPassword)

    if (error) {
      // If demo account doesn't exist, show helpful message
      Notify.create({
        type: 'warning',
        message: `Demo account not found. Please run the migration to create demo accounts.`,
        caption: 'See console for instructions',
        timeout: 5000
      })
      console.warn(`
📋 Demo Account Setup Required:

Demo accounts must be created via Supabase Dashboard Auth (SQL migrations don't work for passwords):

1. Go to: Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Email: ${demoEmail}
4. Password: demo123456
5. Click "Create user"

See CREATE_DEMO_ACCOUNTS_PROPERLY.md for details.
      `)
    } else {
      Notify.create({
        type: 'positive',
        message: `✅ Logged in as ${selectedDemo.value.name}!`
      })
      
      // Wait a tick for Vue reactivity to propagate
      await new Promise(resolve => setTimeout(resolve, 100))
      
      console.log('🔄 Attempting redirect to /chats (student role)...')
      
      // Redirect directly to chats for students
      await router.push('/chats')
      console.log('✅ Redirect complete')
    }
  } catch (err) {
    console.error('Demo login error:', err)
    Notify.create({
      type: 'negative',
      message: 'Demo login failed. See console for details.'
    })
  } finally {
    loading.value = false
  }
}

const onSubmit = async () => {
  if (!email.value || !password.value) {
    Notify.create({
      type: 'negative',
      message: 'Please fill in all fields'
    })
    return
  }

  loading.value = true

  try {
    const { error } = await signIn(email.value, password.value)

    if (error) {
      // Handle specific error types
      let errorMessage = 'Login failed'
      const errorObj = error as Error

      if (errorObj.message === 'Email not confirmed') {
        errorMessage = 'Please check your email and click the confirmation link before logging in.'
      } else if (errorObj.message === 'Invalid login credentials') {
        errorMessage = 'Invalid email or password. Please try again.'
      } else if (errorObj.message) {
        errorMessage = errorObj.message
      }

      const notifyOptions: Record<string, unknown> = {
        type: 'negative',
        message: errorMessage,
        timeout: 5000
      }

      if (errorObj.message === 'Email not confirmed') {
        notifyOptions.actions = [
          {
            label: 'Resend Email',
            color: 'white',
            handler: () => {
              // TODO: Implement resend confirmation email
              Notify.create({
                type: 'info',
                message: 'Resend functionality coming soon!'
              })
            }
          }
        ]
      }

      Notify.create(notifyOptions)
    } else {
      Notify.create({
        type: 'positive',
        message: 'Login successful!'
      })
      
      // Wait a tick for Vue reactivity to propagate
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Check if there's a pending gym join from QR code flow
      const pendingJoinToken = LocalStorage.getItem('pendingGymJoin') as string
      if (pendingJoinToken) {
        console.log('📱 Redirecting to complete gym join:', pendingJoinToken)
        await router.push(`/join/${pendingJoinToken}`)
      } else {
        console.log('🔄 Attempting redirect to /chats after manual login...')
        // Redirect directly to chats
        await router.push('/chats')
        console.log('✅ Redirect complete')
      }
    }
  } catch (err) {
    console.error('Login error:', err)
    Notify.create({
      type: 'negative',
      message: 'An unexpected error occurred. Please try again.'
    })
  } finally {
    loading.value = false
  }
}

function testQRCode() {
  if (!qrDemoLink.value) return
  
  try {
    // Extract the path from the URL
    let path = ''
    
    // Handle full URLs: https://yourapp.com/#/join/TOKEN
    if (qrDemoLink.value.includes('#/join/')) {
      const parts = qrDemoLink.value.split('#/')
      path = parts[1] || ''
    }
    // Handle path only: /join/TOKEN
    else if (qrDemoLink.value.startsWith('/join/')) {
      path = qrDemoLink.value.substring(1) // Remove leading slash
    }
    // Handle just the token part: join/TOKEN
    else if (qrDemoLink.value.startsWith('join/')) {
      path = qrDemoLink.value
    }
    
    if (path) {
      Notify.create({
        type: 'info',
        message: '📱 Simulating QR code scan...',
        timeout: 1000
      })
      
      // Navigate to the join page
      setTimeout(() => {
        void router.push('/' + path)
      }, 500)
    } else {
      Notify.create({
        type: 'negative',
        message: 'Invalid QR code link format'
      })
    }
  } catch (err) {
    console.error('Error parsing QR link:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to parse QR code link'
    })
  }
}

function simulateDeepLink() {
  if (!qrDemoLink.value) return
  
  try {
    // Extract the path from the URL
    let path = ''
    
    // Handle full URLs: https://yourapp.com/#/join/TOKEN
    if (qrDemoLink.value.includes('#/join/')) {
      const parts = qrDemoLink.value.split('#/')
      path = parts[1] || ''
    }
    // Handle path only: /join/TOKEN
    else if (qrDemoLink.value.startsWith('/join/')) {
      path = qrDemoLink.value.substring(1) // Remove leading slash
    }
    // Handle just the token part: join/TOKEN
    else if (qrDemoLink.value.startsWith('join/')) {
      path = qrDemoLink.value
    }
    
    if (path) {
      // Store the deep link path and flag that we're simulating app open
      LocalStorage.set('pendingDeepLink', '/' + path)
      LocalStorage.set('simulateAppInstalled', 'true')
      
      Notify.create({
        type: 'info',
        message: '📱 Simulating: QR scanned → App downloaded → Opening app...',
        timeout: 2000
      })
      
      // Simulate app restart with deep link
      setTimeout(() => {
        // Clear the input
        qrDemoLink.value = ''
        
        Notify.create({
          type: 'positive',
          message: '🚀 App opened with deep link!',
          timeout: 1500
        })
        
        // Navigate to the stored deep link
        setTimeout(() => {
          const deepLink = LocalStorage.getItem('pendingDeepLink') as string
          LocalStorage.remove('pendingDeepLink')
          void router.push(deepLink)
        }, 1000)
      }, 1500)
    } else {
      Notify.create({
        type: 'negative',
        message: 'Invalid QR code link format'
      })
    }
  } catch (err) {
    console.error('Error parsing QR link:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to parse QR code link'
    })
  }
}
</script>
