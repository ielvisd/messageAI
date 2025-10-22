// Supabase Edge Function to send push notifications
// Triggered via database webhook when new messages are created

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FIREBASE_SERVICE_ACCOUNT = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') // Firebase service account JSON

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

    // Send notifications via Firebase Cloud Messaging (HTTP v1 API)
    if (FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT)
      const projectId = serviceAccount.project_id

      const fcmPromises = pushTokens.map((tokenData) =>
        sendFCMNotificationV1(projectId, tokenData.token, {
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
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT not configured')
      return new Response(
        JSON.stringify({ 
          message: 'Firebase not configured', 
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

// Get OAuth 2.0 access token for Firebase
async function getAccessToken() {
  if (!FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT not configured')
  }

  const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT)
  
  // Create JWT for Google OAuth
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const payload = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }))

  // Import the private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '')), c => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(`${header}.${payload}`)
  )

  const jwt = `${header}.${payload}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

// Send notification using FCM HTTP v1 API
async function sendFCMNotificationV1(
  projectId: string,
  token: string,
  data: {
    title: string
    body: string
    chatId: string
    messageId: string
  }
) {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: {
            title: data.title,
            body: data.body
          },
          data: {
            chat_id: data.chatId,
            message_id: data.messageId
          },
          apns: {
            payload: {
              aps: {
                sound: 'default'
              }
            }
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default'
            }
          }
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error('FCM v1 error:', error)
    throw new Error(`FCM request failed: ${error}`)
  }

  return await response.json()
}

