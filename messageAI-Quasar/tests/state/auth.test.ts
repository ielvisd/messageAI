import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase
vi.mock('../../src/boot/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }
}))

describe('Auth State', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export auth functions', async () => {
    const authModule = await import('../../src/state/auth')
    
    expect(authModule.signIn).toBeDefined()
    expect(authModule.signUp).toBeDefined()
    expect(authModule.signOut).toBeDefined()
    expect(authModule.loadProfile).toBeDefined()
    expect(authModule.updateProfile).toBeDefined()
    expect(authModule.initAuth).toBeDefined()
  })

  it('should have reactive state', async () => {
    const authModule = await import('../../src/state/auth')
    
    expect(authModule.user).toBeDefined()
    expect(authModule.profile).toBeDefined()
    expect(authModule.isAuthenticated).toBeDefined()
  })
})
