import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { User } from '@supabase/supabase-js'

// Mock Supabase using factory function
vi.mock('../boot/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({
          unsubscribe: vi.fn()
        }))
      }))
    }))
  }
}))

// Mock auth state
vi.mock('../state/auth', () => ({
  user: ref({
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg'
    }
  })
}))

// Import after mocking
import { useChat } from '../composables/useChat'
import { user } from '../state/auth'

describe('useChat composable - Simple Tests', () => {
  const mockChatId = 'test-chat-id'
  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg'
    },
    aud: 'authenticated',
    created_at: '2023-01-01T00:00:00Z'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    user.value = mockUser
  })

  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      const { messages, chatInfo, loading, error, sending } = useChat(mockChatId)

      expect(messages.value).toEqual([])
      expect(chatInfo.value).toBeNull()
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(sending.value).toBe(false)
    })
  })

  describe('sendMessage', () => {
    it('should not send empty messages', async () => {
      const { sendMessage, messages } = useChat(mockChatId)

      await sendMessage('')
      await sendMessage('   ')

      expect(messages.value).toHaveLength(0)
    })
  })

  describe('updateMessageStatus', () => {
    it('should update message status', () => {
      const { updateMessageStatus, messages } = useChat(mockChatId)

      // Add a test message
      messages.value.push({
        id: 'msg-1',
        chat_id: mockChatId,
        sender_id: 'test-user-id',
        content: 'Hello',
        message_type: 'text',
        status: 'sent',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      })

      updateMessageStatus('msg-1', 'delivered')

      expect(messages.value[0]?.status).toBe('delivered')
    })

    it('should set read_at when status is read', () => {
      const { updateMessageStatus, messages } = useChat(mockChatId)

      messages.value.push({
        id: 'msg-1',
        chat_id: mockChatId,
        sender_id: 'test-user-id',
        content: 'Hello',
        message_type: 'text',
        status: 'sent',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      })

      updateMessageStatus('msg-1', 'read')

      expect(messages.value[0]?.status).toBe('read')
      expect(messages.value[0]?.read_at).toBeDefined()
    })
  })
})
