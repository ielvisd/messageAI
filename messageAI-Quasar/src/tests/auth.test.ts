import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// Mock Supabase using factory function
vi.mock('../boot/supabase', () => ({
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

// Import after mocking
import { user, profile, isAuthenticated } from '../state/auth'

describe('Authentication State Management', () => {
  beforeEach(() => {
    // Reset reactive state
    user.value = null
    profile.value = null
  })

  describe('Reactive State', () => {
    it('should have correct initial state', () => {
      expect(user.value).toBeNull()
      expect(profile.value).toBeNull()
      expect(isAuthenticated.value).toBe(false)
    })

    it('should update isAuthenticated when user changes', () => {
      user.value = { id: 'test-id', email: 'test@example.com' } as any
      expect(isAuthenticated.value).toBe(true)

      user.value = null
      expect(isAuthenticated.value).toBe(false)
    })
  })

  describe('State Updates', () => {
    it('should update user state', () => {
      const mockUser = { id: 'test-id', email: 'test@example.com' }
      user.value = mockUser
      expect(user.value).toEqual(mockUser)
    })

    it('should update profile state', () => {
      const mockProfile = {
        id: 'test-id',
        name: 'Test User',
        avatar_url: null,
        online_status: true,
        last_seen: '2023-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }
      profile.value = mockProfile
      expect(profile.value).toEqual(mockProfile)
    })
  })

  describe('Computed Properties', () => {
    it('should compute isAuthenticated correctly', () => {
      expect(isAuthenticated.value).toBe(false)

      user.value = { id: 'test-id' } as any
      expect(isAuthenticated.value).toBe(true)

      user.value = null
      expect(isAuthenticated.value).toBe(false)
    })
  })
})
