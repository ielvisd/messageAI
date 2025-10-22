// Supabase Edge Function to send push notifications
// Triggered via database webhook when new messages are created

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY') // Firebase Cloud Messaging server key

interface PushPayload {
  type: 'insert'
  table: string
  schema: string
  record: {
    id: string
    chat_id: string
    sender_id: string
    content: string
    created_at: string
  }
  old_record: null
}

interface PushToken {
  token: string
  platform: 'ios' | 'android' | 'web'
}

serve(async (req) => {
  try {
    // Parse the webhook payload
    const payload: PushPayload = await req.json()
    
    console.log('📨 Received webhook:', payload)

    if (payload.type !== 'insert' || payload.table !== 'messages') {
      return new Response(JSON.stringify({ error: 'Invalid webhook' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const message = payload.record
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get sender info
    const { data: sender, error: senderError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', message.sender_id)
      .single()

    if (senderError) {
      console.error('Error fetching sender:', senderError)
      return new Response(JSON.stringify({ error: 'Sender not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get chat info
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('name, type')
      .eq('id', message.chat_id)
      .single()

    if (chatError) {
      console.error('Error fetching chat:', chatError)
    }

    // Get all chat members except the sender
    const { data: members, error: membersError } = await supabase
      .from('chat_members')
      .select('user_id, profiles!inner(push_tokens)')
      .eq('chat_id', message.chat_id)
      .neq('user_id', message.sender_id)

    if (membersError) {
      console.error('Error fetching members:', membersError)
      return new Response(JSON.stringify({ error: 'Members not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Collect all push tokens from members
    const pushTokens: PushToken[] = []
    for (const member of members) {
      const tokens = member.profiles?.push_tokens as PushToken[] | null
      if (tokens && Array.isArray(tokens)) {
        pushTokens.push(...tokens)
      }
    }

    if (pushTokens.length === 0) {
      console.log('No push tokens found for chat members')
      return new Response(JSON.stringify({ message: 'No recipients' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`📤 Sending notifications to ${pushTokens.length} devices`)

    // Prepare notification data
    const notificationTitle = chat?.type === 'group' 
      ? `${sender.name} in ${chat.name}`
      : sender.name || 'New Message'
    
    const notificationBody = message.content.length > 100
      ? message.content.substring(0, 100) + '...'
      : message.content

    // Send notifications via FCM (Firebase Cloud Messaging)
    if (FCM_SERVER_KEY) {
      const fcmPromises = pushTokens.map((tokenData) =>
        sendFCMNotification(tokenData.token, {
          title: notificationTitle,
          body: notificationBody,
          chatId: message.chat_id,
          messageId: message.id
        })
      )

      const results = await Promise.allSettled(fcmPromises)
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      console.log(`✅ Sent: ${successful}, ❌ Failed: ${failed}`)

      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: successful, 
          failed: failed,
          total: pushTokens.length 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    } else {
      console.warn('⚠️ FCM_SERVER_KEY not configured')
      return new Response(
        JSON.stringify({ 
          message: 'FCM not configured', 
          would_notify: pushTokens.length 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

async function sendFCMNotification(
  token: string,
  data: {
    title: string
    body: string
    chatId: string
    messageId: string
  }
) {
  if (!FCM_SERVER_KEY) {
    throw new Error('FCM_SERVER_KEY not configured')
  }

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: token,
      notification: {
        title: data.title,
        body: data.body,
        sound: 'default'
      },
      data: {
        chat_id: data.chatId,
        message_id: data.messageId
      },
      priority: 'high'
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('FCM error:', error)
    throw new Error(`FCM request failed: ${error}`)
  }

  return await response.json()
}

