import { ref, computed } from 'vue'
import { supabase } from '../boot/supabase'
import type { User } from '@supabase/supabase-js'

// Reactive global state
export const user = ref<User | null>(null)
export const profile = ref<{ id: string; name: string; avatar_url?: string; online_status: boolean; last_seen: string; push_token?: string; created_at: string; updated_at: string } | null>(null)
export const isAuthenticated = computed(() => !!user.value)

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
    
    return { data, error: null }
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
    
    return { data, error: null }
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
  } catch (error) {
    console.error('Init auth error:', error)
  }
}
