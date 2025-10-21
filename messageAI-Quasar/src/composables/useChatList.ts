import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'

export interface Chat {
  id: string
  name: string
  type: 'direct' | 'group'
  last_message?: {
    content: string
    created_at: string
    sender_name: string
  }
  unread_count: number
  members: Array<{
    id: string
    name: string
    avatar_url?: string
  }>
  created_at: string
  updated_at: string
}


interface LastMessage {
  content: string
  created_at: string
  profiles: {
    name: string
  }
}

interface ChatMemberProfile {
  profiles: {
    id: string
    name: string
    avatar_url?: string
  }
}

export function useChatList() {
  const chats = ref<Chat[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const loadChats = async () => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      // Get chats where user is a member
      const { data: chatMembers, error: membersError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          last_read_at,
          chats!inner (
            id,
            name,
            type,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.value.id)

      if (membersError) throw membersError

      // Get last messages and unread counts for each chat
      const chatPromises = chatMembers?.map(async (member) => {
        const chat = Array.isArray(member.chats) ? member.chats[0] : member.chats

        if (!chat) {
          throw new Error('Chat not found')
        }

        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select(`
            content,
            created_at,
            profiles!inner (name)
          `)
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle() as { data: LastMessage | null }

        // Get unread count
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .gt('created_at', member.last_read_at || '1970-01-01')

        // Get chat members
        const { data: members } = await supabase
          .from('chat_members')
          .select(`
            profiles!inner (
              id,
              name,
              avatar_url
            )
          `)
          .eq('chat_id', chat.id) as { data: ChatMemberProfile[] | null }

        return {
          id: String(chat.id),
          name: String(chat.name || 'Unnamed Chat'),
          type: String(chat.type) as 'direct' | 'group',
          last_message: lastMessage ? {
            content: String(lastMessage.content),
            created_at: String(lastMessage.created_at),
            sender_name: String(lastMessage.profiles.name)
          } : undefined,
          unread_count: Number(unreadCount || 0),
          members: members?.map(m => ({
            id: String(m.profiles.id),
            name: String(m.profiles.name),
            avatar_url: m.profiles.avatar_url ? String(m.profiles.avatar_url) : undefined
          })) || [],
          created_at: String(chat.created_at),
          updated_at: String(chat.updated_at)
        }
      }) || []

      const chatData = await Promise.all(chatPromises)

      // Sort by last message time or creation time
      chats.value = chatData as Chat[]
      chats.value.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at
        const bTime = b.last_message?.created_at || b.created_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load chats'
      console.error('Error loading chats:', err)
    } finally {
      loading.value = false
    }
  }

  const createChat = async (name: string, type: 'direct' | 'group' = 'direct', memberIds: string[] = []): Promise<Chat | null> => {
    if (!user.value) return null

    try {
      // Debug: Log the user info
      console.log('Creating chat for user:', user.value.id, user.value.email)

      // Check current auth session
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Current session:', session?.user?.id, session?.user?.email)

      // Ensure user has a profile before creating chat
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.value.id)
        .single()

      if (profileError) {
        console.error('Profile not found for user:', user.value.id, profileError)
        throw new Error('User profile not found. Please refresh and try again.')
      }

      console.log('Profile check passed, attempting to create chat...')

      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name,
          type,
          created_by: user.value.id
        })
        .select()
        .single()

      if (chatError) {
        console.error('Chat creation failed:', chatError)
        throw chatError
      }

      // Add members to chat
      if (memberIds.length > 0) {
        const memberInserts = memberIds.map(memberId => ({
          chat_id: chat.id,
          user_id: memberId
        }))

        const { error: membersError } = await supabase
          .from('chat_members')
          .insert(memberInserts)

        if (membersError) throw membersError
      }

      // Reload chats to include the new one
      void loadChats()

      return chat as Chat
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create chat'
      console.error('Error creating chat:', err)
      return null
    }
  }

  const markAsRead = async (chatId: string) => {
    if (!user.value) return

    try {
      const { error } = await supabase
        .from('chat_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', user.value.id)

      if (error) throw error

      // Update local state
      const chat = chats.value.find(c => c.id === chatId)
      if (chat) {
        chat.unread_count = 0
      }
    } catch (err) {
      console.error('Error marking chat as read:', err)
    }
  }

  // Set up real-time subscription
  let subscription: unknown = null

  onMounted(() => {
    void loadChats()

    // Subscribe to message changes
    if (user.value) {
      subscription = supabase
        .channel('chat-list-updates')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          () => {
            // Reload chats when messages change
            void loadChats()
          }
        )
        .subscribe()
    }
  })

  onUnmounted(() => {
    if (subscription && typeof subscription === 'object' && subscription !== null && 'unsubscribe' in subscription) {
      (subscription as { unsubscribe: () => void }).unsubscribe()
    }
  })

  return {
    chats: computed(() => chats.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    loadChats,
    createChat,
    markAsRead
  }
}
