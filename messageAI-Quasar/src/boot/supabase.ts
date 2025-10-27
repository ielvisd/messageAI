import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web'
    },
    fetch: (url, options) => {
      console.log('📡 Supabase request:', url)
      return fetch(url, options).then(response => {
        console.log('📡 Supabase response:', response.status, url)
        return response
      }).catch(err => {
        console.error('📡 Supabase fetch error:', err, url)
        throw err
      })
    }
  }
})

// Export for global access
export default supabase

// Make Supabase available globally for E2E tests
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase
}
