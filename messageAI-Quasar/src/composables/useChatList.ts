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

interface UserChat {
  chat_id: string
  chat_name: string
  chat_type: string
  created_at: string
  updated_at: string
  last_read_at: string | null
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
      // Get chats where user is a member using security definer function
      const { data: userChats, error: membersError } = await supabase
        .rpc('get_user_chats', { p_user_id: user.value.id })

      if (membersError) throw membersError

      // Get last messages and unread counts for each chat
      const chatPromises = userChats?.map(async (userChat: UserChat) => {
        const chat = {
          id: userChat.chat_id,
          name: userChat.chat_name,
          type: userChat.chat_type as 'direct' | 'group',
          created_at: userChat.created_at,
          updated_at: userChat.updated_at
        }
        
        const lastReadAt = userChat.last_read_at

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
          .gt('created_at', lastReadAt || '1970-01-01')

        // Get chat members - WORKAROUND: Fetch separately to avoid RLS join issues
        const { data: memberRecords } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('chat_id', chat.id)

        // Fetch profiles separately
        let members: ChatMemberProfile[] = []
        if (memberRecords && memberRecords.length > 0) {
          const userIds = memberRecords.map(m => m.user_id)
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .in('id', userIds)
          
          // Join in memory
          members = profilesData?.map(profile => ({
            profiles: {
              id: profile.id,
              name: profile.name,
              avatar_url: profile.avatar_url
            }
          })) || []
        }

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

      console.log('Chat created successfully:', chat.id)

      // Explicitly add creator as member (don't rely only on trigger)
      // This ensures the creator can always see their own chat
      const { error: creatorMemberError } = await supabase
        .from('chat_members')
        .insert({
          chat_id: chat.id,
          user_id: user.value.id
        })

      if (creatorMemberError) {
        // Log but don't fail - the trigger might have already added the creator
        console.warn('Could not add creator as member (trigger may have handled it):', creatorMemberError)
      }

      // Add other members to chat
      if (memberIds.length > 0) {
        const memberInserts = memberIds.map(memberId => ({
          chat_id: chat.id,
          user_id: memberId
        }))

        const { error: membersError } = await supabase
          .from('chat_members')
          .insert(memberInserts)

        if (membersError) {
          console.error('Failed to add members:', membersError)
          throw new Error('Failed to add members to chat')
        }

        console.log(`Successfully added ${memberIds.length} members to chat`)
      }

      // Reload chats to include the new one
      console.log('Reloading chats...')
      await loadChats()

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

    // Subscribe to changes in user's chats
    if (user.value) {
      console.log('🔔 Setting up real-time subscription for chat list...')
      
      subscription = supabase
        .channel('chat-list-updates')
        // Listen for new messages in any chat
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            console.log('📨 New message received:', payload)
            void loadChats()
          }
        )
        // Listen for chat deletions
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'chats' },
          (payload) => {
            console.log('🗑️ Chat deleted:', payload)
            // Remove from local state immediately
            const chatId = (payload.old as { id?: string })?.id
            if (chatId) {
              chats.value = chats.value.filter(c => c.id !== chatId)
            }
          }
        )
        // Listen for new chats
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chats' },
          (payload) => {
            console.log('➕ New chat created:', payload)
            void loadChats()
          }
        )
        .subscribe((status) => {
          console.log('🔔 Chat list subscription status:', status)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to chat updates')
          // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Failed to subscribe to chat updates')
          }
        })
    }
  })

  onUnmounted(() => {
    if (subscription && typeof subscription === 'object' && subscription !== null && 'unsubscribe' in subscription) {
      (subscription as { unsubscribe: () => void }).unsubscribe()
    }
  })

  const deleteChat = async (chatId: string): Promise<boolean> => {
    if (!user.value) return false

    try {
      console.log('🗑️ Deleting chat:', chatId)

      // Delete the chat - this will cascade delete messages and members due to FK constraints
      const { error: deleteError } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId)

      if (deleteError) {
        console.error('❌ Failed to delete chat:', deleteError)
        throw deleteError
      }

      // Remove from local state
      chats.value = chats.value.filter(c => c.id !== chatId)
      console.log('✅ Chat deleted successfully')

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete chat'
      console.error('Error deleting chat:', err)
      return false
    }
  }

  const deleteMultipleChats = async (chatIds: string[]): Promise<boolean> => {
    if (!user.value) return false

    try {
      console.log('🗑️ Deleting multiple chats:', chatIds.length)

      const { error: deleteError } = await supabase
        .from('chats')
        .delete()
        .in('id', chatIds)

      if (deleteError) {
        console.error('❌ Failed to delete chats:', deleteError)
        throw deleteError
      }

      // Remove from local state
      chats.value = chats.value.filter(c => !chatIds.includes(c.id))
      console.log('✅ Chats deleted successfully')

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete chats'
      console.error('Error deleting chats:', err)
      return false
    }
  }

  const deleteAllChats = async (): Promise<boolean> => {
    if (!user.value) return false

    try {
      console.log('🗑️ Deleting all chats for user:', user.value.id)

      // Get all chat IDs for the user
      const { data: memberData } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.value.id)

      if (!memberData || memberData.length === 0) {
        console.log('No chats to delete')
        return true
      }

      const chatIds = memberData.map(m => m.chat_id)
      console.log(`Found ${chatIds.length} chats to delete`)

      const { error: deleteError } = await supabase
        .from('chats')
        .delete()
        .in('id', chatIds)

      if (deleteError) {
        console.error('❌ Failed to delete all chats:', deleteError)
        throw deleteError
      }

      // Clear local state
      chats.value = []
      console.log('✅ All chats deleted successfully')

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete all chats'
      console.error('Error deleting all chats:', err)
      return false
    }
  }

  return {
    chats: computed(() => chats.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    loadChats,
    createChat,
    markAsRead,
    deleteChat,
    deleteMultipleChats,
    deleteAllChats
  }
}
