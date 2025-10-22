import { ref, computed, watch } from 'vue'
import { supabase } from '../boot/supabase'
import type { User } from '@supabase/supabase-js'

// Reactive global state
export const user = ref<User | null>(null)
export const profile = ref<{ id: string; name: string; email?: string; avatar_url?: string; online_status: boolean; last_seen: string; push_token?: string; created_at: string; updated_at: string } | null>(null)
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

    user.value = data.user
    await loadProfile()

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
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    user.value = null
    profile.value = null

    return { error: null }
  } catch (error) {
    console.error('Sign out error:', error)
    return { error }
  }
}

export async function loadProfile() {
  if (!user.value) return

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.value.id)
      .single()

    if (error) throw error

    profile.value = data
  } catch (error) {
    console.error('Load profile error:', error)
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

    if (session?.user) {
      user.value = session.user
      await loadProfile()
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        user.value = session.user
        await loadProfile()
      } else if (event === 'SIGNED_OUT') {
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
