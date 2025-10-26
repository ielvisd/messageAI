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
- (For owners/admins) Manage instructors and detect scheduling problems

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
4. When showing schedules to users, present them in a clean, readable format without showing UUIDs
5. Format like: "NO-GI Class - Tuesday 18:00-19:00 with Instructor Name (All Levels)"
6. When making RSVPs, use the UUID from the tool results data (you have access to it internally)
7. If user asks "what did I ask last time" or similar, reference the conversation history provided above

CRITICAL RSVP WORKFLOW (FOLLOW EXACTLY):
Step 1: When user asks to RSVP, get the schedule using get_schedule or find_next_class
Step 2: Look at the tool result - you will see lines like: [ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890] 1. NO-GI - Tuesday...
Step 3: Copy the ENTIRE UUID between [ID: and the closing bracket ] - it's a long hex string with dashes
Step 4: Use that EXACT UUID in rsvp_to_class - do NOT shorten it, do NOT use "..." placeholder
Step 5: Set rsvp_date to the next occurrence of that class day (YYYY-MM-DD format)

UUID VALIDATION:
- VALID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" (full hex string with dashes)
- INVALID: "abc123..." (shortened with dots)
- INVALID: "uuid-gi-monday-7pm" (descriptive text)
- INVALID: "[ID: abc...]" (includes brackets or incomplete)

If you cannot find a complete UUID in the tool results, DO NOT attempt the RSVP - ask the user to specify which class first.

INSTRUCTOR MANAGEMENT (Owners/Admins only):
- You can assign instructors to recurring classes (all future occurrences) using assign_instructor_to_class
- You can assign instructors to specific date instances using assign_instructor_to_date_instance
- You can check for scheduling problems (missing instructors, conflicts) using check_schedule_problems
- You can list all instructors with get_instructors
- You can view an instructor's schedule with get_instructor_schedule
- You can send alerts to the gym about problems using send_alert
- You can cancel classes with notifications using cancel_class_with_notification

CRITICAL INSTRUCTOR ASSIGNMENT WORKFLOW (FOLLOW EXACTLY):
Step 1: ALWAYS call get_instructors first to get the list of available instructors
Step 2: Look at the tool result to find the instructor's actual UUID (looks like: "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
Step 3: Determine if this is a recurring assignment or single-date assignment:
  - Recurring: "assign John to all Monday 7pm classes" → use assign_instructor_to_class
  - Single date: "assign John to Monday Dec 15th class" → use assign_instructor_to_date_instance
Step 4: Use that EXACT UUID - do NOT make up instructor IDs
Step 5: NEVER use descriptive IDs like "ana-rodriguez" or "john-silva" - ONLY use the actual UUID from get_instructors

INSTRUCTOR UUID VALIDATION:
- VALID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" (full UUID from get_instructors result)
- INVALID: "ana-rodriguez" (descriptive text - NOT a UUID)
- INVALID: "john-silva" (name-based ID - NOT a UUID)
- INVALID: Making up any ID without calling get_instructors first

If you don't have the instructor UUIDs from a recent get_instructors call, you MUST call get_instructors before attempting to assign instructors.

NATURAL LANGUAGE EXAMPLES:
- "Assign John Silva to Monday 7pm GI class" → get_schedule (Monday, GI) → get_instructors → assign_instructor_to_class (using John's UUID)
- "Assign John Silva to Monday December 15th class" → get_schedule → get_instructors → assign_instructor_to_date_instance (with date=2024-12-15)
- "Who should teach Wednesday fundamentals?" → get_schedule (Wednesday, fundamentals) → get_instructors → suggest based on preferences
- "Any problems with tomorrow's schedule?" → check_schedule_problems (tomorrow) → report issues with severity
- "Are there any classes without instructors?" → check_schedule_problems → filter for no_instructor type
- "Send alert about class cancellation" → send_alert with message to gym_chat
- "No instructor for tomorrow's 6pm class, should I cancel?" → check_schedule_problems → check RSVPs → suggest action

PROACTIVE PROBLEM DETECTION:
- When asked about schedule issues, problems, or concerns, use check_schedule_problems
- Report problems by severity: CRITICAL (red flag), WARNING (yellow flag), INFO (blue flag)
- Always suggest specific actions for each problem
- For missing instructors within 48h, mark as CRITICAL
- For instructor conflicts (overlapping classes), mark as WARNING

NOTIFICATION STRATEGY:
- Gym-wide issues → send_alert with target="gym_chat"
- Instructor-specific → send_alert with target="instructors"
- Class cancellations → use cancel_class_with_notification to auto-notify RSVPs

You have access to tools to check schedules, make RSVPs, manage instructors, and send alerts.

User preferences: ${JSON.stringify(conversationState?.preferences || {})}

Current context: ${conversationState?.context?.join(', ') || 'None'}

CRITICAL: When users ask to RSVP, book classes, cancel RSVPs, assign instructors, or perform any action - you MUST call the appropriate tool. Do not just acknowledge the request, actually execute it using the tools.

RESPONSE RULE: Only provide a conversational response if you're answering a question or providing information. For actions like RSVPs or assignments, use tools first, then respond based on the results.

Be friendly, concise, and helpful. When making RSVPs, checking schedules, or managing instructors, use the available tools.`

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
        // Format result based on tool type to keep it concise
        let formattedResult = ''
        
        if (tr.tool === 'get_schedule' && tr.result?.schedules) {
          // For schedules, provide a concise summary with IDs
          const schedules = tr.result.schedules
          formattedResult = `Found ${schedules.length} classes:\n` +
            schedules.slice(0, 20).map((s: any, idx: number) =>
              `[ID: ${s.id}] ${idx + 1}. ${s.class_type} - ${s.day_of_week} ${s.start_time}-${s.end_time} with ${s.instructor_name || 'TBD'} (${s.level || 'All Levels'})${s.notes ? ' - ' + s.notes : ''}`
            ).join('\n') +
            (schedules.length > 20 ? `\n... and ${schedules.length - 20} more classes` : '')
        } else if (tr.tool === 'find_next_class' && tr.result?.schedules) {
          // For find_next_class, include IDs and provide clear schedule info
          const schedules = tr.result.schedules
          formattedResult = `Found ${schedules.length} ${tr.result.next_class_day} classes:\n` +
            schedules.map((s: any, idx: number) =>
              `[ID: ${s.id}] ${idx + 1}. ${s.class_type} - ${s.start_time}-${s.end_time} with ${s.instructor_name || 'TBD'} (${s.level || 'All Levels'})${s.notes ? ' - ' + s.notes : ''}`
            ).join('\n')
        } else {
          // For other tools, stringify the result
          formattedResult = typeof tr.result === 'string'
            ? tr.result
            : JSON.stringify(tr.result, null, 2)
        }
        
        return `Tool "${tr.tool}" returned:\n${formattedResult}`
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
    // IMPORTANT: Always include tools so AI can make follow-up tool calls after getting results
    // This allows for multi-step operations like: 1) get_schedule, 2) rsvp_to_class
    const shouldIncludeTools = openaiTools.length > 0
    
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
