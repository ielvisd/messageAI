import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'
import { useNetwork } from './useNetwork'
import { Preferences } from '@capacitor/preferences'
import { Notify } from 'quasar'

export interface ReadReceipt {
  id: string
  message_id: string
  user_id: string
  read_at: string
  reader_name?: string
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'file'
  media_url?: string | undefined
  status: 'sending' | 'sent' | 'delivered' | 'read'
  read_at?: string | undefined
  created_at: string
  updated_at: string
  sender_name?: string | undefined
  sender_avatar?: string | undefined
  read_receipts?: ReadReceipt[]
}

export interface ChatInfo {
  id: string
  name: string
  type: 'direct' | 'group'
  members: Array<{
    id: string
    name: string
    avatar_url?: string
  }>
}

interface QueuedMessage {
  chatId: string
  content: string
  messageType: 'text' | 'image' | 'file'
  mediaUrl?: string
  timestamp: string
}


interface SupabaseChat {
  id: string
  name: string
  type: string
  chat_members: Array<{
    profiles: {
      id: string
      name: string
      avatar_url?: string
    }
  }>
}

export function useChat(chatId: string) {
  const messages = ref<Message[]>([])
  const chatInfo = ref<ChatInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const sending = ref(false)
  const messageQueue = ref<QueuedMessage[]>([])
  
  // Network status
  const { isOnline } = useNetwork()
  
  const QUEUE_KEY = `message_queue_${chatId}`

  const loadMessages = async () => {
    if (!user.value || !chatId) return

    loading.value = true
    error.value = null

    try {
      // Load chat info
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select(`
          id,
          name,
          type,
          chat_members (
            profiles!inner (
              id,
              name,
              avatar_url
            )
          )
        `)
        .eq('id', chatId)
        .single() as { data: SupabaseChat | null; error: unknown }

      if (chatError) throw new Error('Failed to load chat')

      if (chat) {
        chatInfo.value = {
          id: chat.id,
          name: chat.name || 'Unnamed Chat',
          type: chat.type as 'direct' | 'group',
          members: chat.chat_members?.map((member) => member.profiles) || []
        }
      }

      // Load messages with read receipts
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          chat_id,
          sender_id,
          content,
          message_type,
          media_url,
          status,
          read_at,
          created_at,
          updated_at,
          profiles!inner (
            name,
            avatar_url
          ),
          message_read_receipts (
            id,
            user_id,
            read_at,
            profiles!inner (
              name
            )
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (messagesError) throw new Error('Failed to load messages')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages.value = messagesData?.map((msg: any) => ({
        id: msg.id,
        chat_id: msg.chat_id,
        sender_id: msg.sender_id,
        content: msg.content,
        message_type: msg.message_type as 'text' | 'image' | 'file',
        media_url: msg.media_url || undefined,
        status: msg.status as 'sending' | 'sent' | 'delivered' | 'read',
        read_at: msg.read_at || undefined,
        created_at: msg.created_at,
        updated_at: msg.updated_at,
        sender_name: msg.profiles.name || undefined,
        sender_avatar: msg.profiles.avatar_url || undefined,
        read_receipts: msg.message_read_receipts?.map((receipt: any) => ({
          id: receipt.id,
          message_id: msg.id,
          user_id: receipt.user_id,
          read_at: receipt.read_at,
          reader_name: receipt.profiles?.name || undefined
        })) || []
      })) || []

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load messages'
      console.error('Error loading messages:', err)
    } finally {
      loading.value = false
    }
  }

  // Queue management functions
  const loadQueue = async () => {
    try {
      const { value } = await Preferences.get({ key: QUEUE_KEY })
      if (value) {
        messageQueue.value = JSON.parse(value) as QueuedMessage[]
        console.log(`📦 Loaded ${messageQueue.value.length} queued messages from storage`)
      }
    } catch (err) {
      console.error('Error loading message queue:', err)
    }
  }

  const saveQueue = async () => {
    try {
      await Preferences.set({
        key: QUEUE_KEY,
        value: JSON.stringify(messageQueue.value)
      })
      console.log(`💾 Saved ${messageQueue.value.length} messages to queue`)
    } catch (err) {
      console.error('Error saving message queue:', err)
    }
  }

  const processQueue = async () => {
    if (!isOnline.value || messageQueue.value.length === 0) return
    
    const queueCount = messageQueue.value.length
    console.log(`🔄 Processing ${queueCount} queued messages...`)
    
    const queue = [...messageQueue.value]
    messageQueue.value = []
    await saveQueue()
    
    for (const queuedMsg of queue) {
      if (queuedMsg.chatId === chatId) {
        console.log('📤 Sending queued message:', queuedMsg.content.substring(0, 50))
        await sendMessage(queuedMsg.content, queuedMsg.messageType, queuedMsg.mediaUrl)
      }
    }
    
    // Show success notification
    if (queueCount > 0) {
      Notify.create({
        type: 'positive',
        message: `✅ ${queueCount} queued message${queueCount > 1 ? 's' : ''} sent`,
        position: 'top',
        timeout: 2000
      })
    }
  }

  const addToQueue = async (content: string, messageType: 'text' | 'image' | 'file', mediaUrl?: string) => {
    const queuedMessage: QueuedMessage = {
      chatId,
      content,
      messageType,
      ...(mediaUrl && { mediaUrl }),
      timestamp: new Date().toISOString()
    }
    
    messageQueue.value.push(queuedMessage)
    await saveQueue()
    console.log('📥 Message added to offline queue')
  }

  const sendMessage = async (content: string, messageType: 'text' | 'image' | 'file' = 'text', mediaUrl?: string) => {
    if (!user.value || !chatId || !content.trim()) return

    // If offline, queue the message
    if (!isOnline.value) {
      console.log('📵 Offline: Adding message to queue')
      await addToQueue(content.trim(), messageType, mediaUrl)
      
      // Add optimistic message with 'sending' status (will show as queued)
      const queuedMessage: Message = {
        id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chat_id: chatId,
        sender_id: user.value.id,
        content: content.trim(),
        message_type: messageType,
        media_url: mediaUrl,
        status: 'sending', // Shows as queued/pending
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender_name: user.value.user_metadata?.name || 'You',
        sender_avatar: user.value.user_metadata?.avatar_url
      }
      messages.value.push(queuedMessage)
      return
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const tempMessage: Message = {
      id: tempId,
      chat_id: chatId,
      sender_id: user.value.id,
      content: content.trim(),
      message_type: messageType,
      media_url: mediaUrl,
      status: 'sending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender_name: user.value.user_metadata?.name || 'You',
      sender_avatar: user.value.user_metadata?.avatar_url
    }

    // Add optimistic message immediately
    messages.value.push(tempMessage)
    sending.value = true

    try {
      const { data, error: sendError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.value.id,
          content: content.trim(),
          message_type: messageType,
          media_url: mediaUrl,
          status: 'sent'
        })
        .select(`
          id,
          chat_id,
          sender_id,
          content,
          message_type,
          media_url,
          status,
          read_at,
          created_at,
          updated_at,
          profiles!inner (
            name,
            avatar_url
          )
        `)
        .single()

      if (sendError) throw sendError

      // Replace temp message with real message
      const realMessage: Message = {
        id: data.id,
        chat_id: data.chat_id,
        sender_id: data.sender_id,
        content: data.content,
        message_type: data.message_type,
        media_url: data.media_url || undefined,
        status: data.status,
        read_at: data.read_at || undefined,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sender_name: (data.profiles as any).name || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sender_avatar: (data.profiles as any).avatar_url || undefined
      }

      const tempIndex = messages.value.findIndex(m => m.id === tempId)
      if (tempIndex !== -1) {
        messages.value[tempIndex] = realMessage
      }

    } catch (err) {
      // Remove failed message
      const tempIndex = messages.value.findIndex(m => m.id === tempId)
      if (tempIndex !== -1 && messages.value[tempIndex]) {
        messages.value[tempIndex].status = 'sent' // Keep it but mark as failed
      }
      
      error.value = err instanceof Error ? err.message : 'Failed to send message'
      console.error('Error sending message:', err)
    } finally {
      sending.value = false
    }
  }

  const markAsRead = async () => {
    if (!user.value || !chatId) return

    try {
      console.log('📖 Marking messages as read in chat:', chatId)
      
      // Call database function to mark messages and create receipts
      const { error: markError } = await supabase.rpc('mark_messages_as_read', {
        p_chat_id: chatId,
        p_user_id: user.value.id
      })

      if (markError) {
        console.error('Failed to mark as read:', markError)
        throw markError
      }

      // Update chat_members.last_read_at
      const { error: memberError } = await supabase
        .from('chat_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', user.value.id)

      if (memberError) throw memberError

      console.log('✅ Messages marked as read')
    } catch (err) {
      console.error('Error marking messages as read:', err)
    }
  }

  const updateMessageStatus = (messageId: string, status: Message['status']) => {
    const message = messages.value.find(m => m.id === messageId)
    if (message) {
      message.status = status
      if (status === 'read') {
        message.read_at = new Date().toISOString()
      }
    }
  }

  // Read receipt helper functions
  const getReadCount = (message: Message): number => {
    return message.read_receipts?.length || 0
  }

  const getReadByUsers = (message: Message): string[] => {
    return message.read_receipts?.map(r => r.reader_name || 'Unknown').filter(Boolean) || []
  }

  const hasUserRead = (message: Message, userId: string): boolean => {
    return message.read_receipts?.some(r => r.user_id === userId) || false
  }

  // Watch for online status changes
  watch(isOnline, async (newStatus, oldStatus) => {
    if (newStatus && !oldStatus) {
      console.log('🌐 Back online! Processing queued messages...')
      await processQueue()
    }
  })

  // Set up real-time subscription
  let subscription: unknown = null

  onMounted(() => {
    void loadMessages()
    void loadQueue()

    // Subscribe to message changes
    if (user.value && chatId) {
      subscription = supabase
        .channel(`chat-${chatId}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'messages',
            filter: `chat_id=eq.${chatId}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const newMessage = payload.new as any
              const message: Message = {
                id: newMessage.id,
                chat_id: newMessage.chat_id,
                sender_id: newMessage.sender_id,
                content: newMessage.content,
                message_type: newMessage.message_type as 'text' | 'image' | 'file',
                media_url: newMessage.media_url || undefined,
                status: newMessage.status as 'sending' | 'sent' | 'delivered' | 'read',
                read_at: newMessage.read_at || undefined,
                created_at: newMessage.created_at,
                updated_at: newMessage.updated_at,
                sender_name: 'Unknown', // Will be updated when we load the full message
                sender_avatar: undefined,
                read_receipts: []
              }

              // Only add if not already present (avoid duplicates)
              if (!messages.value.find(m => m.id === message.id)) {
                messages.value.push(message)
              }
            } else if (payload.eventType === 'UPDATE') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const updatedMessage = payload.new as any
              const messageIndex = messages.value.findIndex(m => m.id === updatedMessage.id)
              if (messageIndex !== -1 && messages.value[messageIndex]) {
                messages.value[messageIndex].status = updatedMessage.status as 'sending' | 'sent' | 'delivered' | 'read'
                messages.value[messageIndex].read_at = updatedMessage.read_at
                messages.value[messageIndex].updated_at = updatedMessage.updated_at
              }
            }
          }
        )
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_read_receipts'
          },
          (payload) => {
            console.log('📖 New read receipt:', payload)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const receipt = payload.new as any
            
            // Find the message and add the receipt
            const message = messages.value.find(m => m.id === receipt.message_id)
            if (message) {
              if (!message.read_receipts) message.read_receipts = []
              
              // Only add if not already present
              if (!message.read_receipts.find(r => r.user_id === receipt.user_id)) {
                message.read_receipts.push({
                  id: receipt.id,
                  message_id: receipt.message_id,
                  user_id: receipt.user_id,
                  read_at: receipt.read_at,
                  reader_name: undefined // Name will be fetched if needed
                })
                
                // Update message status if it's our message
                if (message.sender_id === user.value?.id) {
                  message.status = 'read'
                  if (!message.read_at) {
                    message.read_at = receipt.read_at
                  }
                }
                
                console.log(`✅ Added read receipt for message ${receipt.message_id}`)
              }
            }
          }
        )
        .subscribe()

      // Mark as read when component mounts
      void markAsRead()
    }
  })

  onUnmounted(() => {
    if (subscription && typeof subscription === 'object' && subscription !== null && 'unsubscribe' in subscription) {
      (subscription as { unsubscribe: () => void }).unsubscribe()
    }
  })

  return {
    messages: computed(() => messages.value),
    chatInfo: computed(() => chatInfo.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    sending: computed(() => sending.value),
    isOnline,
    queuedCount: computed(() => messageQueue.value.length),
    loadMessages,
    sendMessage,
    markAsRead,
    updateMessageStatus,
    getReadCount,
    getReadByUsers,
    hasUserRead
  }
}
