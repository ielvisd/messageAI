import { ref, computed, watch } from 'vue'
import { supabase } from '../boot/supabase'
import type { User } from '@supabase/supabase-js'

// Reactive global state
export const user = ref<User | null>(null)
export const profile = ref<{ 
  id: string; 
  name: string; 
  email?: string; 
  avatar_url?: string; 
  online_status: boolean; 
  last_seen: string; 
  push_token?: string; 
  created_at: string; 
  updated_at: string;
  role?: string | null;
  gym_id?: string | null;
  gym_ids?: string[];
  owned_gym_ids?: string[];
  parent_links?: string[];
  blocked_users?: string[];
} | null>(null)
export const isAuthenticated = computed(() => !!user.value)
export const authInitialized = ref(false)

// Auth functions
export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    console.log('🔐 Sign in successful, updating auth state...', {
      userId: data.user?.id,
      email: data.user?.email
    })

    user.value = data.user
    await loadProfile()

    console.log('✅ Profile loaded after sign in:', {
      userId: user.value?.id,
      profileId: profile.value?.id,
      role: profile.value?.role,
      gymId: profile.value?.gym_id,
      ownedGymIds: profile.value?.owned_gym_ids,
      isAuthenticated: !!user.value
    })

    return { error: null }
  } catch (error) {
    console.error('Sign in error:', error)
    return { data: null, error }
  }
}

export async function signUp(email: string, password: string, name: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    })

    if (error) throw error

    user.value = data.user
    // Profile will be created automatically by the trigger

    return { error: null }
  } catch (error) {
    console.error('Sign up error:', error)
    return { data: null, error }
  }
}

export async function signOut() {
  console.log('🚪 signOut() called')
  try {
    console.log('📤 Calling supabase.auth.signOut()...')
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('❌ Supabase signOut error:', error)
      throw error
    }

    console.log('✅ Supabase signOut successful, clearing local state')
    user.value = null
    profile.value = null

    return { error: null }
  } catch (error) {
    console.error('❌ Sign out error:', error)
    return { error }
  }
}

export async function loadProfile() {
  if (!user.value) {
    console.warn('⚠️ loadProfile called but no user.value')
    return
  }

  console.log('📥 Loading profile for user:', user.value.id)

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

    if (error) {
      console.error('❌ Error loading profile:', error)
      // Don't throw - just log the error and continue
      // This allows login to succeed even if profile loading fails
      return
    }

    profile.value = data
    console.log('✅ Profile loaded successfully:', {
      id: data?.id,
      role: data?.role,
      gym_id: data?.gym_id,
      owned_gym_ids: data?.owned_gym_ids
    })
  } catch (error) {
    console.error('Load profile error:', error)
    // Don't throw - allow login to continue
  }
}

export async function updateProfile(updates: { name?: string; avatar_url?: string }) {
  if (!user.value) return

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.value.id)
      .select()
      .single()

    if (error) throw error

    profile.value = data
    return { data, error: null }
  } catch (error) {
    console.error('Update profile error:', error)
    return { data: null, error }
  }
}

// Initialize auth state
export async function initAuth() {
  try {
    // Check for test auth state first (for E2E tests)
    if (typeof window !== 'undefined' && (window as unknown as { testAuthState?: { user: User; profile: { id: string; name: string; email?: string; avatar_url?: string; online_status: boolean; last_seen: string; push_token?: string; created_at: string; updated_at: string } } }).testAuthState) {
      const testAuth = (window as unknown as { testAuthState: { user: User; profile: { id: string; name: string; email?: string; avatar_url?: string; online_status: boolean; last_seen: string; push_token?: string; created_at: string; updated_at: string } } }).testAuthState
      user.value = testAuth.user
      profile.value = testAuth.profile
      authInitialized.value = true
      return
    }

    const { data: { session } } = await supabase.auth.getSession()

    console.log('🔧 initAuth: Initial session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email
    })

    if (session?.user) {
      user.value = session.user
      await loadProfile()
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state changed:', {
        event,
        userId: session?.user?.id,
        email: session?.user?.email
      })

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ SIGNED_IN event - updating user and loading profile')
        user.value = session.user
        await loadProfile()
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 SIGNED_OUT event - clearing user and profile')
        user.value = null
        profile.value = null
      }
    })

    authInitialized.value = true
  } catch (error) {
    console.error('Init auth error:', error)
    authInitialized.value = true // Still mark as initialized even on error
  }
}

// Helper function to wait for auth initialization
export function waitForAuth(): Promise<void> {
  return new Promise((resolve) => {
    if (authInitialized.value) {
      resolve()
    } else {
      const unwatch = watch(authInitialized, (initialized) => {
        if (initialized) {
          unwatch()
          resolve()
        }
      })
    }
  })
}
