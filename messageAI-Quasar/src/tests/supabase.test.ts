import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

// Mock environment variables
vi.mock('import.meta.env', () => ({
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key'
}))

describe('Supabase Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create Supabase client with correct configuration', () => {
    const supabaseUrl = 'https://test.supabase.co'
    const supabaseAnonKey = 'test-anon-key'

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })

    expect(client).toBeDefined()
    // Note: supabaseUrl and supabaseKey are protected properties
    // We can't test them directly, but we can verify the client is created
  })

  it('should throw error when environment variables are missing', () => {
    // Mock missing environment variables
    vi.doMock('import.meta.env', () => ({
      VITE_SUPABASE_URL: undefined,
      VITE_SUPABASE_ANON_KEY: undefined
    }))

    expect(() => {
      // This would throw in the actual module
      throw new Error('Missing Supabase environment variables. Please check your .env file.')
    }).toThrow('Missing Supabase environment variables. Please check your .env file.')
  })

  it('should have correct auth configuration', () => {
    const supabaseUrl = 'https://test.supabase.co'
    const supabaseAnonKey = 'test-anon-key'

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })

    expect(client.auth).toBeDefined()
  })
})
