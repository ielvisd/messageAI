<template>
  <q-page class="flex flex-center">
    <div class="q-pa-md" style="max-width: 400px; width: 100%">
      <!-- Loading Invitation -->
      <q-card v-if="loadingInvitation">
        <q-card-section class="flex flex-center q-pa-xl">
          <q-spinner color="primary" size="3em" />
        </q-card-section>
      </q-card>

      <!-- Invalid Invitation -->
      <q-card v-else-if="invitationToken && !invitation">
        <q-card-section>
          <div class="text-h6 text-center q-mb-md text-negative">Invalid Invitation</div>
          <div class="text-body2 text-center">
            This invitation link is invalid or has expired. Please contact the gym owner for a new invitation.
          </div>
          <q-btn
            flat
            color="primary"
            label="Back to Login"
            class="full-width q-mt-md"
            @click="$router.push('/login')"
          />
        </q-card-section>
      </q-card>

      <!-- Signup Form -->
      <q-card v-else>
        <q-card-section>
          <div v-if="invitation" class="text-center q-mb-md">
            <div class="text-h6">Join {{ invitation.gyms?.name }}</div>
            <div class="text-caption text-grey-7">
              You've been invited as {{ invitation.role }}
            </div>
          </div>
          <div v-else class="text-h6 text-center q-mb-md">Sign Up for Ossome</div>

          <q-form @submit="onSubmit" class="q-gutter-md">
            <q-input
              v-model="name"
              label="Full Name"
              :rules="[val => !!val || 'Name is required']"
            />
            
            <!-- Profile Picture Upload -->
            <div class="column items-center q-my-md">
              <q-avatar size="100px" class="cursor-pointer" @click="showAvatarEditor = true">
                <img v-if="avatarUrl" :src="avatarUrl" alt="Profile" />
                <q-icon v-else name="add_a_photo" size="48px" color="grey-5" />
                <q-tooltip>{{ avatarUrl ? 'Change' : 'Add' }} profile picture (optional)</q-tooltip>
              </q-avatar>
              <div class="text-caption text-grey-7 q-mt-sm">Profile picture (optional)</div>
            </div>

            <!-- Belt Selection (only for student role) -->
            <div v-if="!invitation || invitation.role === 'student'" class="q-gutter-sm">
              <div class="text-subtitle2 q-mb-sm">Current BJJ Belt</div>
              <q-select
                v-model="currentBelt"
                :options="beltOptions"
                label="Belt Color"
                outlined
                emit-value
                map-options
              />
              <q-select
                v-model="currentStripes"
                :options="stripeOptions"
                label="Stripes"
                outlined
                emit-value
                map-options
              />
            </div>
            
            <q-input
              v-model="email"
              type="email"
              label="Email"
              :rules="[val => !!val || 'Email is required']"
              :readonly="!!invitation"
              :filled="!!invitation"
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
              :label="invitation ? `Join as ${invitation.role}` : 'Sign Up'"
              class="full-width"
              :loading="loading"
              :disable="loading"
            />
              <q-btn
                flat
                color="primary"
                label="Back to Login"
                class="full-width"
                @click="$router.push('/login')"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
      
      <!-- Profile Picture Editor Dialog -->
      <ProfilePictureEditor 
        v-model="showAvatarEditor"
        :avatar-url="avatarUrl"
        @avatar-updated="handleAvatarUpdated"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { signUp } from '../state/auth'
import { useInvitations } from '../composables/useInvitations'
import { supabase } from '../boot/supabase'
import { Notify } from 'quasar'
import ProfilePictureEditor from '../components/ProfilePictureEditor.vue'

const router = useRouter()
const route = useRoute()
const { getInvitationByToken, acceptInvitation } = useInvitations()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const loadingInvitation = ref(false)
const invitationToken = ref<string | null>(null)
const invitation = ref<any>(null)
const avatarUrl = ref<string | null>(null)
const showAvatarEditor = ref(false)
const currentBelt = ref('white')
const currentStripes = ref(0)

const beltOptions = [
  { label: 'White Belt', value: 'white' },
  { label: 'Blue Belt', value: 'blue' },
  { label: 'Purple Belt', value: 'purple' },
  { label: 'Brown Belt', value: 'brown' },
  { label: 'Black Belt', value: 'black' }
]

const stripeOptions = [
  { label: '0 Stripes', value: 0 },
  { label: '1 Stripe', value: 1 },
  { label: '2 Stripes', value: 2 },
  { label: '3 Stripes', value: 3 },
  { label: '4 Stripes', value: 4 }
]

const handleAvatarUpdated = (url: string | null) => {
  avatarUrl.value = url
}

async function loadInvitation() {
  const token = route.query.invite as string
  if (!token) return

  invitationToken.value = token
  loadingInvitation.value = true

  try {
    const { data, error } = await getInvitationByToken(token)

    if (error || !data) {
      console.error('Invalid invitation:', error)
      return
    }

    invitation.value = data
    email.value = data.email // Pre-fill email from invitation
  } catch (err) {
    console.error('Error loading invitation:', err)
  } finally {
    loadingInvitation.value = false
  }
}

const onSubmit = async () => {
  if (!name.value || !email.value || !password.value) {
    Notify.create({
      type: 'negative',
      message: 'Please fill in all fields'
    })
    return
  }

  if (password.value.length < 6) {
    Notify.create({
      type: 'negative',
      message: 'Password must be at least 6 characters'
    })
    return
  }

  loading.value = true

  try {
    const { error } = await signUp(email.value, password.value, name.value)

    if (error) {
      // Handle specific error types
      let errorMessage = 'Signup failed'
      const errorObj = error as Error

      if (errorObj.message === 'User already registered') {
        errorMessage = 'An account with this email already exists. Please try logging in instead.'
      } else if (errorObj.message === 'Password should be at least 6 characters') {
        errorMessage = 'Password must be at least 6 characters long.'
      } else if (errorObj.message) {
        errorMessage = errorObj.message
      }

      Notify.create({
        type: 'negative',
        message: errorMessage,
        timeout: 5000
      })
      return
    }

    // If invitation exists, accept it and update profile
    if (invitation.value) {
      await acceptInvitation(invitationToken.value!)

      // Update user profile with gym_id, role, belt info, and parent_links
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        const metadata = invitation.value.metadata || {}
        const updates: any = {
          gym_id: invitation.value.gym_id,
          role: invitation.value.role
        }

        // Add belt info for students
        if (invitation.value.role === 'student') {
          updates.current_belt = currentBelt.value
          updates.current_stripes = currentStripes.value
        }

        // If parent, link to students
        if (invitation.value.role === 'parent' && metadata.studentIds) {
          updates.parent_links = metadata.studentIds
        }

        await supabase
          .from('profiles')
          .update(updates)
          .eq('id', currentUser.id)
      }

      Notify.create({
        type: 'positive',
        message: `Welcome to ${invitation.value.gyms?.name}!`
      })
    } else {
      // For regular signup (no invitation), still save belt info
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        await supabase
          .from('profiles')
          .update({
            current_belt: currentBelt.value,
            current_stripes: currentStripes.value
          })
          .eq('id', currentUser.id)
      }

      Notify.create({
        type: 'positive',
        message: 'Signup successful! Please check your email and click the confirmation link to verify your account.',
        timeout: 8000
      })
    }

    // Let router guards handle the redirect based on role/gym setup
    void router.push('/')
  } catch (err) {
    console.error('Signup error:', err)
    Notify.create({
      type: 'negative',
      message: 'An unexpected error occurred. Please try again.'
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadInvitation()
})
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
