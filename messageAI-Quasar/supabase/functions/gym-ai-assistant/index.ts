// Follow this setup guide to integrate the Deno runtime into Supabase Edge Functions:
// https://supabase.com/docs/guides/functions/deno

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, conversationHistory, conversationState, gymId, userId, tools, toolResults, userTimezone } = await req.json()

    if (!message && !toolResults) {
      return new Response(
        JSON.stringify({ error: 'Message or toolResults required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Build system prompt with context - Use user's timezone
    const today = userTimezone 
      ? new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }))
      : new Date()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const todayName = dayNames[today.getDay()]
    const tomorrowName = dayNames[(today.getDay() + 1) % 7]
    
    // Check if there's conversation history
    const hasHistory = conversationHistory && conversationHistory.length > 0
    const historyNote = hasHistory 
      ? `\n\nCONVERSATION MEMORY: You have access to our conversation history above. Reference previous discussions naturally when relevant.`
      : `\n\nCONVERSATION MEMORY: This is the start of a new conversation.`
    
    const systemPrompt = `You are a helpful AI assistant for a Brazilian Jiu-Jitsu gym. You help users:
- Find and understand class schedules
- Make RSVPs to classes
- Cancel RSVPs
- Answer questions about the gym

IMPORTANT: Today is ${todayName}, ${today.toLocaleDateString()}. Tomorrow is ${tomorrowName}.${historyNote}

CLASS TYPES:
- GI: Traditional Brazilian Jiu-Jitsu with the gi (kimono)
- NO-GI: Grappling without the gi (rashguard/shorts)
- Open Mat: Open training session, typically no-gi or mixed
- Competition: Competition-focused training

BEST PRACTICES:
1. When someone asks about "no-gi" classes, consider checking for both NO-GI classes AND Open Mat sessions using include_related: true
2. If no classes are available on a specific day, proactively suggest the next available class of that type using find_next_class tool
3. Always provide helpful alternatives rather than just saying "no classes available"
4. When showing schedules, include the class type, day, time, and level
5. If user asks "what did I ask last time" or similar, reference the conversation history provided above

You have access to tools to check schedules, make RSVPs, and retrieve information.

User preferences: ${JSON.stringify(conversationState?.preferences || {})}

Current context: ${conversationState?.context?.join(', ') || 'None'}

Be friendly, concise, and helpful. When making RSVPs or checking schedules, use the available tools.`

    // Build messages for OpenAI
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ]

    // Add conversation history (last 10 messages for context)
    if (conversationHistory && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-10)
      messages.push(...recentHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })))
    }

    // If we have tool results, format them properly
    if (toolResults && toolResults.length > 0) {
      // Add a message summarizing the tool results for the AI
      const toolSummary = toolResults.map((tr: any) => {
        const result = typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result, null, 2)
        return `Tool "${tr.tool}" returned:\n${result}`
      }).join('\n\n')
      
      messages.push({
        role: 'user',
        content: `Here are the results from the tools you requested:\n\n${toolSummary}\n\nPlease provide a natural, helpful response based on these results.`
      })
    } else if (message) {
      // Add current message if provided and no tool results
      messages.push({ role: 'user', content: message })
    }

    // Prepare tools for OpenAI function calling
    const openaiTools = tools?.map((tool: any) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters,
          required: Object.keys(tool.parameters).filter((key: string) => !tool.parameters[key].optional)
        }
      }
    })) || []

    // Call OpenAI API
    // Don't include tools if we're processing tool results (to get final answer)
    const shouldIncludeTools = (!toolResults || toolResults.length === 0) && openaiTools.length > 0
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools: shouldIncludeTools ? openaiTools : undefined,
        temperature: 0.7,
        max_tokens: 500
      })
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const openaiData = await openaiResponse.json()
    const assistantMessage = openaiData.choices[0].message

    // Check if AI wants to use tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCalls = assistantMessage.tool_calls.map((tc: any) => ({
        name: tc.function.name,
        parameters: JSON.parse(tc.function.arguments)
      }))

      return new Response(
        JSON.stringify({
          message: assistantMessage.content || 'Let me check that for you...',
          tool_calls: toolCalls,
          requiresToolExecution: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Return assistant message
    return new Response(
      JSON.stringify({
        message: assistantMessage.content,
        tool_calls: [],
        requiresToolExecution: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in gym-ai-assistant:', error)
    
    // Error recovery - return helpful fallback
    return new Response(
      JSON.stringify({
        message: "I apologize, but I'm having trouble processing your request right now. You can try:\n• Checking the schedule page directly\n• Asking a simpler question\n• Contacting the gym staff\n\nWhat would you like to do?",
        error: error.message,
        requiresToolExecution: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
