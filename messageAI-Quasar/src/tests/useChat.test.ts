import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

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
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'

describe('useChat composable', () => {
  const mockChatId = 'test-chat-id'
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg'
    }
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

  describe('loadMessages', () => {
    it('should load chat info and messages successfully', async () => {
      const mockChat = {
        id: mockChatId,
        name: 'Test Chat',
        type: 'direct',
        chat_members: [{
          profiles: {
            id: 'test-user-id',
            name: 'Test User',
            avatar_url: 'https://example.com/avatar.jpg'
          }
        }]
      }

      const mockMessages = [{
        id: 'msg-1',
        chat_id: mockChatId,
        sender_id: 'test-user-id',
        content: 'Hello world',
        message_type: 'text',
        media_url: null,
        status: 'sent',
        read_at: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        profiles: {
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg'
        }
      }]

      // Mock the Supabase chain
      const mockSelect = vi.fn()
      const mockEq = vi.fn()
      const mockSingle = vi.fn()
      const mockOrder = vi.fn()

      mockSelect.mockReturnValue({
        eq: mockEq,
        order: mockOrder
      })
      mockEq.mockReturnValue({
        single: mockSingle
      })
      mockOrder.mockReturnValue({
        eq: mockEq
      })

      // First call for chat info
      mockSingle.mockResolvedValueOnce({ data: mockChat, error: null })
      // Second call for messages
      mockSingle.mockResolvedValueOnce({ data: mockMessages, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      })

      const { loadMessages, chatInfo, messages } = useChat(mockChatId)

      await loadMessages()

      expect(chatInfo.value).toEqual({
        id: mockChatId,
        name: 'Test Chat',
        type: 'direct',
        members: [{
          id: 'test-user-id',
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg'
        }]
      })

      expect(messages.value).toHaveLength(1)
      expect(messages.value[0]).toEqual({
        id: 'msg-1',
        chat_id: mockChatId,
        sender_id: 'test-user-id',
        content: 'Hello world',
        message_type: 'text',
        media_url: undefined,
        status: 'sent',
        read_at: undefined,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        sender_name: 'Test User',
        sender_avatar: 'https://example.com/avatar.jpg'
      })
    })

    it('should handle errors when loading messages', async () => {
      const mockSelect = vi.fn()
      const mockEq = vi.fn()
      const mockSingle = vi.fn()

      mockSelect.mockReturnValue({
        eq: mockEq
      })
      mockEq.mockReturnValue({
        single: mockSingle
      })

      mockSingle.mockResolvedValue({ data: null, error: new Error('Database error') })
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect
      })

      const { loadMessages, error } = useChat(mockChatId)

      await loadMessages()

      expect(error.value).toBe('Failed to load chat')
    })

    it('should not load messages if no user', async () => {
      user.value = null

      const { loadMessages, loading } = useChat(mockChatId)

      await loadMessages()

      expect(loading.value).toBe(false)
    })
  })

  describe('sendMessage', () => {
    it('should send message with optimistic UI', async () => {
      const mockInsert = vi.fn()
      const mockSelect = vi.fn()
      const mockSingle = vi.fn()

      mockInsert.mockReturnValue({
        select: mockSelect
      })
      mockSelect.mockReturnValue({
        single: mockSingle
      })

      const mockSentMessage = {
        id: 'new-msg-id',
        chat_id: mockChatId,
        sender_id: 'test-user-id',
        content: 'Test message',
        message_type: 'text',
        media_url: null,
        status: 'sent',
        read_at: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        profiles: {
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg'
        }
      }

      mockSingle.mockResolvedValue({ data: mockSentMessage, error: null })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      })

      const { sendMessage, messages, sending } = useChat(mockChatId)

      await sendMessage('Test message')

      expect(sending.value).toBe(false)
      expect(messages.value).toHaveLength(1)
      expect(messages.value[0].content).toBe('Test message')
      expect(messages.value[0].status).toBe('sent')
    })

    it('should handle send message errors', async () => {
      const mockInsert = vi.fn()
      const mockSelect = vi.fn()
      const mockSingle = vi.fn()

      mockInsert.mockReturnValue({
        select: mockSelect
      })
      mockSelect.mockReturnValue({
        single: mockSingle
      })

      mockSingle.mockResolvedValue({ data: null, error: new Error('Send failed') })
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      })

      const { sendMessage, error } = useChat(mockChatId)

      await sendMessage('Test message')

      expect(error.value).toBe('Send failed')
    })

    it('should not send empty messages', async () => {
      const { sendMessage, messages } = useChat(mockChatId)

      await sendMessage('')
      await sendMessage('   ')

      expect(messages.value).toHaveLength(0)
    })
  })

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      const mockUpdate = vi.fn()
      const mockEq = vi.fn()

      mockUpdate.mockReturnValue({
        eq: mockEq
      })
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate
      })

      const { markAsRead, messages } = useChat(mockChatId)

      // Add a test message
      messages.value.push({
        id: 'msg-1',
        chat_id: mockChatId,
        sender_id: 'other-user-id',
        content: 'Hello',
        message_type: 'text',
        status: 'sent',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      })

      await markAsRead()

      expect(messages.value[0].status).toBe('read')
      expect(messages.value[0].read_at).toBeDefined()
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

      expect(messages.value[0].status).toBe('delivered')
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

      expect(messages.value[0].status).toBe('read')
      expect(messages.value[0].read_at).toBeDefined()
    })
  })
})
