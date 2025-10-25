<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          Ossome
        </q-toolbar-title>

        <q-space />

        <!-- User Menu -->
        <q-btn v-if="isAuthenticated && profile" flat dense round>
          <q-avatar size="32px" color="primary" text-color="white">
            <img v-if="profile.avatar_url" :src="profile.avatar_url" />
            <span v-else>{{ profile.name?.charAt(0)?.toUpperCase() || 'U' }}</span>
          </q-avatar>
          
          <q-menu>
            <q-list style="min-width: 200px">
              <q-item>
                <q-item-section avatar>
                  <q-avatar color="primary" text-color="white">
                    <img v-if="profile.avatar_url" :src="profile.avatar_url" />
                    <span v-else>{{ profile.name?.charAt(0)?.toUpperCase() || 'U' }}</span>
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ profile.name }}</q-item-label>
                  <q-item-label caption>{{ profile?.email || user?.email }}</q-item-label>
                  <q-item-label caption v-if="profile?.role">
                    <q-badge :color="getRoleColor(profile.role)">{{ getRoleLabel(profile.role) }}</q-badge>
                  </q-item-label>
                </q-item-section>
              </q-item>
              
              <q-separator />
              
              <q-item clickable v-close-popup @click="showProfileEditor = true">
                <q-item-section avatar>
                  <q-icon name="photo_camera" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Edit Profile Picture</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-separator />
              
              <q-item 
                clickable 
                @click="handleSignOut"
              >
                <q-item-section avatar>
                  <q-icon name="logout" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Sign Out</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Left Drawer (Navigation) -->
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header>
          Navigation
        </q-item-label>

        <!-- Role-Based Navigation -->
        <q-item v-if="userRole === 'owner'" clickable @click="navigate('/dashboard')">
          <q-item-section avatar>
            <q-icon name="dashboard" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Dashboard</q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="userRole === 'owner'" clickable @click="navigate('/settings')">
          <q-item-section avatar>
            <q-icon name="settings" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Settings</q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="userRole === 'instructor'" clickable @click="navigate('/instructor-dashboard')">
          <q-item-section avatar>
            <q-icon name="fitness_center" />
          </q-item-section>
          <q-item-section>
            <q-item-label>My Classes</q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="userRole === 'parent'" clickable @click="navigate('/parent-dashboard')">
          <q-item-section avatar>
            <q-icon name="child_care" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Kids Dashboard</q-item-label>
          </q-item-section>
        </q-item>

        <!-- Training Dashboard (all roles) -->
        <q-item clickable @click="navigate('/student/dashboard')">
          <q-item-section avatar>
            <q-icon name="insights" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Training Stats</q-item-label>
            <q-item-label caption>My attendance & progress</q-item-label>
          </q-item-section>
        </q-item>

        <q-separator class="q-my-md" />

        <q-item clickable @click="navigate('/chats')">
          <q-item-section avatar>
            <q-icon name="chat" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Messages</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="navigate('/schedule')">
          <q-item-section avatar>
            <q-icon name="event" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Schedule</q-item-label>
          </q-item-section>
        </q-item>

        <q-item clickable @click="navigate('/ai-assistant')">
          <q-item-section avatar>
            <q-icon name="smart_toy" />
          </q-item-section>
          <q-item-section>
            <q-item-label>AI Assistant</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
    
    <!-- Profile Picture Editor Dialog -->
    <ProfilePictureEditor 
      v-model="showProfileEditor"
      :avatar-url="profile?.avatar_url"
      @avatar-updated="handleAvatarUpdated"
    />
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { isAuthenticated, signOut, user } from '../state/auth'
import { useRouter } from 'vue-router'
import { supabase } from '../boot/supabase'
import { usePresence } from '../composables/usePresence'
import { usePushNotifications } from '../composables/usePushNotifications'
import ProfilePictureEditor from '../components/ProfilePictureEditor.vue'
import { Notify } from 'quasar'

// Initialize presence system (runs for entire app session)
usePresence()

// Initialize push notifications (registers for push on native platforms)
usePushNotifications()

const router = useRouter()

const leftDrawerOpen = ref(false)
const showProfileEditor = ref(false)
const profile = ref<{ name?: string; email?: string; avatar_url?: string; role?: string; gym_id?: string } | null>(
  null
)
const gymName = ref<string>('')

const userRole = computed(() => (user.value as any)?.role || profile.value?.role || null)

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

function navigate(path: string) {
  void router.push(path)
  leftDrawerOpen.value = false
}

function handleAvatarUpdated(url: string | null) {
  if (profile.value) {
    profile.value.avatar_url = url || undefined
  }
  // Also update the user's metadata in the auth state
  if (user.value) {
    user.value.user_metadata = {
      ...user.value.user_metadata,
      avatar_url: url
    }
  }
}

function getRoleColor(role: string) {
  switch (role) {
    case 'owner': return 'purple'
    case 'instructor': return 'blue'
    case 'student': return 'green'
    case 'parent': return 'orange'
    default: return 'grey'
  }
}

function getRoleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

async function handleSignOut() {
  console.log('👋 Sign out clicked')
  try {
    Notify.create({
      type: 'info',
      message: 'Signing out...',
      timeout: 1000
    })
    
    const { error } = await signOut()
    if (error) {
      console.error('❌ Sign out error:', error)
      Notify.create({
        type: 'negative',
        message: 'Failed to sign out. Please try again.'
      })
    } else {
      console.log('✅ Sign out successful, redirecting to login')
      Notify.create({
        type: 'positive',
        message: 'Signed out successfully'
      })
      void router.push('/login')
    }
  } catch (err) {
    console.error('❌ Sign out exception:', err)
    Notify.create({
      type: 'negative',
      message: 'An error occurred while signing out'
    })
  }
}

onMounted(async () => {
  if (isAuthenticated.value && user.value) {
    const { data, error } = await supabase
      .from('profiles')
      .select('name, email, avatar_url, role, gym_id')
      .eq('id', user.value.id)
      .single()

    if (error) {
      console.error('Error loading profile:', error)
    } else {
      profile.value = data
      
      // Load gym name if user has a gym
      if (data?.gym_id) {
        const { data: gymData } = await supabase
          .from('gyms')
          .select('name')
          .eq('id', data.gym_id)
          .single()
        
        if (gymData) {
          gymName.value = gymData.name
        }
      }
    }
  }
})
</script>

<style lang="scss" scoped>
// iOS Safe Area Support
.q-header {
  // Already handled by platform.scss global styles
}

.q-drawer {
  // Already handled by platform.scss global styles
}

// Ensure content doesn't go under notch/home indicator
:deep(.q-page-container) {
  // This is handled by platform.scss but can be reinforced here if needed
}
</style>
