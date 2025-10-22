// Supabase Edge Function: GymAI Assistant
// Handles AI-powered schedule queries, message categorization, and reply generation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { OpenAI } from 'https://esm.sh/openai@4'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

serve(async (req) => {
  try {
    const { action, data } = await req.json()
    
    switch (action) {
      case 'query_schedule':
        return await handleScheduleQuery(data)
      case 'categorize_message':
        return await handleMessageCategorization(data)
      case 'generate_reply':
        return await handleReplyGeneration(data)
      case 'search_semantic':
        return await handleSemanticSearch(data)
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 })
    }
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 })
  }
})

async function handleScheduleQuery(data: { query: string, user_id?: string }) {
  // Get all schedules
  const { data: schedules, error } = await supabase
    .from('gym_schedules')
    .select('*')
    .eq('is_active', true)
  
  if (error) throw error
  
  // Use AI to interpret query and filter schedules
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a helpful jiu-jitsu gym assistant. Given a natural language query about class schedules, provide a clear, friendly answer.
        
Available schedules:
${JSON.stringify(schedules, null, 2)}

Format your response as conversational text. If multiple options exist, list them clearly with times and locations.
Be concise but helpful. Use friendly, casual language.`
      },
      {
        role: 'user',
        content: data.query
      }
    ],
    temperature: 0.7,
    max_tokens: 300
  })
  
  const answer = completion.choices[0]?.message?.content || 'Sorry, I could not find that information.'
  
  return new Response(JSON.stringify({ answer, schedules }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function handleMessageCategorization(data: { message_id: string, content: string }) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Categorize gym messages into: schedule_question, private_lesson, urgent, billing, injury, general.
        
Urgent indicators: injury, emergency, closed, cancelled, sick, urgent, broke, broken
Schedule: time, when, class, schedule, gi, nogi, no-gi, training, open mat
Private lesson: private, one-on-one, 1-on-1, personal training
Billing: payment, charge, membership, fee, cost, price
Injury: hurt, pain, injured, doctor, medical

Respond with JSON: { "category": "...", "priority": "high|normal|low", "suggested_reply": "..." }`
      },
      {
        role: 'user',
        content: data.content
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })
  
  const result = JSON.parse(completion.choices[0]?.message?.content || '{}')
  
  // Update message category
  await supabase
    .from('messages')
    .update({ category: result.category, ai_processed: true })
    .eq('id', data.message_id)
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function handleReplyGeneration(data: { message_content: string, category?: string }) {
  // Check for quick reply match
  const { data: quickReplies } = await supabase
    .from('quick_replies')
    .select('*')
    .eq('category', data.category || 'general')
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a friendly gym assistant. Generate 3 quick reply options for the gym owner to send.
        
Available quick replies: ${JSON.stringify(quickReplies, null, 2)}

Return JSON with a "replies" array: { "replies": ["Reply option 1", "Reply option 2", "Reply option 3"] }

Keep replies short (1-2 sentences), friendly, and helpful. Use existing quick replies when appropriate.`
      },
      {
        role: 'user',
        content: data.message_content
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8
  })
  
  const result = JSON.parse(completion.choices[0]?.message?.content || '{"replies":[]}')
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function handleSemanticSearch(data: { query: string, limit?: number }) {
  // Generate embedding for query
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: data.query
  })
  
  const queryEmbedding = embedding.data[0].embedding
  
  // Search using pgvector
  const { data: results, error } = await supabase.rpc('search_embeddings', {
    query_embedding: queryEmbedding,
    match_count: data.limit || 5
  })
  
  if (error) throw error
  
  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

