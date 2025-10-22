import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'

export interface ChatRequest {
  id: string
  from_user_id: string
  to_user_id: string | null
  chat_type: 'direct' | 'group'
  chat_name: string
  message: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  group_chat_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  expires_at: string
  responded_at: string | null
  // Related data
  sender?: {
    id: string
    name: string
    email?: string
    avatar_url?: string
  }
  recipient?: {
    id: string
    name: string
    email?: string
    avatar_url?: string
  }
}

export interface GroupRequestMember {
  id: string
  request_id: string
  user_id: string
  status: 'pending' | 'accepted' | 'rejected'
  responded_at: string | null
  user?: {
    id: string
    name: string
    email?: string
    avatar_url?: string
  }
}

export function useChatRequests() {
  const sentRequests = ref<ChatRequest[]>([])
  const receivedRequests = ref<ChatRequest[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed values
  const pendingReceivedRequests = computed(() => 
    receivedRequests.value.filter(req => req.status === 'pending')
  )

  const pendingRequestsCount = computed(() => pendingReceivedRequests.value.length)

  // Check if users have existing chat history
  const checkExistingChatHistory = async (userId1: string, userId2: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('check_existing_chat_history', {
        user1_id: userId1,
        user2_id: userId2
      })

      if (error) throw error
      return data || false
    } catch (err) {
      console.error('Error checking chat history:', err)
      return false
    }
  }

  // Create a new chat request
  const createChatRequest = async (
    toUserId: string, 
    chatName: string, 
    message?: string, 
    chatType: 'direct' | 'group' = 'direct'
  ): Promise<ChatRequest | null> => {  
    if (!user.value) return null

    try {
      // First check if users already have chat history
      if (chatType === 'direct') {
        const hasHistory = await checkExistingChatHistory(user.value.id, toUserId)
        if (hasHistory) {
          throw new Error('You already have a conversation with this user. Please use the existing chat.')
        }

        // Check for existing pending request
        const { data: existingRequest } = await supabase
          .from('chat_requests')
          .select('*')
          .eq('from_user_id', user.value.id)
          .eq('to_user_id', toUserId)
          .eq('status', 'pending')
          .single()

        if (existingRequest) {
          throw new Error('You already have a pending request to this user.')
        }
      }

      console.log('📤 Inserting chat request:', {
        from_user_id: user.value.id,
        to_user_id: toUserId,
        chat_type: chatType,
        chat_name: chatName,
        message: message || null
      })

      const { data: request, error } = await supabase
        .from('chat_requests')
        .insert({
          from_user_id: user.value.id,
          to_user_id: toUserId,
          chat_type: chatType,
          chat_name: chatName,
          message: message || null
        })
        .select(`
          *,
          sender:profiles!from_user_id(id, name, email, avatar_url),
          recipient:profiles!to_user_id(id, name, email, avatar_url)
        `)
        .single()

      if (error) {
        console.error('❌ Failed to insert chat request:', error)
        throw error
      }

      console.log('✅ Chat request created successfully:', request)

      // Add to sent requests
      sentRequests.value.unshift(request as ChatRequest)
      
      return request as ChatRequest
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create chat request'
      console.error('Error creating chat request:', err)
      return null
    }
  }

  // Accept a chat request
  const acceptChatRequest = async (requestId: string): Promise<boolean> => {
    if (!user.value) return false

    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('chat_requests')
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('to_user_id', user.value.id)

      if (updateError) throw updateError

      // Create the actual chat
      const { error: createError } = await supabase.rpc('create_chat_from_request', {
        request_id_param: requestId
      })

      if (createError) throw createError

      // Update local state
      const requestIndex = receivedRequests.value.findIndex(req => req.id === requestId)
      if (requestIndex !== -1) {
        receivedRequests.value[requestIndex]!.status = 'accepted'
        receivedRequests.value[requestIndex]!.responded_at = new Date().toISOString()
      }

      // Refresh chat list (assuming useChatList is available)
      // This will be handled by the parent component

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to accept chat request'
      console.error('Error accepting chat request:', err)
      return false
    }
  }

  // Reject a chat request
  const rejectChatRequest = async (requestId: string): Promise<boolean> => {
    if (!user.value) return false

    try {
      const { error } = await supabase
        .from('chat_requests')
        .update({ 
          status: 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('to_user_id', user.value.id)

      if (error) throw error

      // Update local state
      const requestIndex = receivedRequests.value.findIndex(req => req.id === requestId)
      if (requestIndex !== -1) {
        receivedRequests.value[requestIndex]!.status = 'rejected'
        receivedRequests.value[requestIndex]!.responded_at = new Date().toISOString()
      }

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to reject chat request'
      console.error('Error rejecting chat request:', err)
      return false
    }
  }

  // Load sent requests
  const loadSentRequests = async () => {
    if (!user.value) return

    try {
      console.log('📤 Loading sent requests for user:', user.value.id)
      
      const { data, error } = await supabase
        .from('chat_requests')
        .select(`
          *,
          recipient:profiles!to_user_id(id, name, email, avatar_url)
        `)
        .eq('from_user_id', user.value.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('📬 Sent requests loaded:', data?.length || 0, 'requests')
      console.log('📋 Sent requests data:', data)

      sentRequests.value = data as ChatRequest[]
    } catch (err) {
      console.error('Error loading sent requests:', err)
    }
  }

  // Load received requests
  const loadReceivedRequests = async () => {
    if (!user.value) return

    try {
      console.log('📥 Loading received requests for user:', user.value.id)
      
      const { data, error } = await supabase
        .from('chat_requests')
        .select(`
          *,
          sender:profiles!from_user_id(id, name, email, avatar_url)
        `)
        .eq('to_user_id', user.value.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('📨 Received requests loaded:', data?.length || 0, 'requests')
      console.log('📋 Received requests data:', data)

      receivedRequests.value = data as ChatRequest[]
    } catch (err) {
      console.error('Error loading received requests:', err)
    }
  }

  // Load all requests
  const loadRequests = async () => {
    if (!user.value) return

    loading.value = true
    error.value = null

    try {
      await Promise.all([
        loadSentRequests(),
        loadReceivedRequests()
      ])
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load requests'
    } finally {
      loading.value = false
    }
  }

  // Clean up expired requests
  const cleanupExpiredRequests = async () => {
    try {
      await supabase.rpc('expire_old_requests')
      // Reload requests to update the UI
      await loadRequests()
    } catch (err) {
      console.error('Error cleaning up expired requests:', err)
    }
  }

  // Real-time subscriptions
  let requestSubscription: ReturnType<typeof supabase.channel> | null = null

  const setupRealtimeSubscription = () => {
    if (!user.value) return

    requestSubscription = supabase
      .channel('chat_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_requests',
          filter: `to_user_id=eq.${user.value.id}`
        },
        (payload) => {
          console.log('Request update received:', payload)
          void loadReceivedRequests()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_requests',
          filter: `from_user_id=eq.${user.value.id}`
        },
        (payload) => {
          console.log('Sent request update received:', payload)
          void loadSentRequests()
        }
      )
      .subscribe()
  }

  const cleanup = () => {
    if (requestSubscription) {
      void supabase.removeChannel(requestSubscription)
      requestSubscription = null
    }
  }

  // Lifecycle
  onMounted(() => {
    void loadRequests()
    setupRealtimeSubscription()
    // Clean up expired requests on mount
    void cleanupExpiredRequests()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    sentRequests,
    receivedRequests,
    loading,
    error,
    
    // Computed
    pendingReceivedRequests,
    pendingRequestsCount,
    
    // Actions
    createChatRequest,
    acceptChatRequest,
    rejectChatRequest,
    loadRequests,
    cleanupExpiredRequests,
    checkExistingChatHistory,
    
    // Utils
    cleanup
  }
}
