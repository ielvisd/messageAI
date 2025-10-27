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

// Extract suggested actions from AI response
// Looks for patterns like "I can assign X", "You can click", "Reschedule", "Cancel"
function extractSuggestedActions(content: string, toolResults: any[], conversationHistory: any[]) {
  console.log('🎬 extractSuggestedActions called')
  console.log('  Content preview:', content.substring(0, 100))
  console.log('  Tool results count:', toolResults?.length || 0)
  
  const actions: any[] = []
  
  // Check if this is a response about missing instructor
  const hasNoInstructor = content.toLowerCase().includes('no instructor') || 
                          content.toLowerCase().includes('not available') ||
                          content.toLowerCase().includes('instructor assigned') ||
                          content.toLowerCase().includes('assign professor') ||
                          content.toLowerCase().includes('assign coach') ||
                          content.toLowerCase().includes('regarding instructor')
  
  console.log('  hasNoInstructor:', hasNoInstructor)
  
  if (!hasNoInstructor) {
    console.log('  ❌ No instructor keywords found, skipping action extraction')
    return actions
  }
  
  // Get instructor and schedule info from tool results if available
  let instructors: any[] = []
  let schedules: any[] = []
  
  if (toolResults) {
    for (const tr of toolResults) {
      // Get instructors from get_instructors tool
      if (tr.tool === 'get_instructors' && tr.result?.instructors) {
        instructors = tr.result.instructors
        console.log(`📋 Found ${instructors.length} instructors from get_instructors`)
      }
      
      // Get schedule from check_schedule_problems tool
      if (tr.tool === 'check_schedule_problems' && tr.result?.problems) {
        console.log(`🔍 check_schedule_problems returned ${tr.result.problems.length} problems`)
        const noInstructorProblems = tr.result.problems.filter((p: any) => p.type === 'no_instructor')
        console.log(`📌 Found ${noInstructorProblems.length} no_instructor problems`)
        
        schedules = noInstructorProblems.map((p: any) => p.schedule).filter(Boolean)
        console.log(`📅 Extracted ${schedules.length} schedules from problems`)
        
        // Debug: Log first schedule if available
        if (schedules.length > 0) {
          console.log('📅 First schedule:', {
            id: schedules[0].id,
            class_type: schedules[0].class_type,
            day: schedules[0].day_of_week,
            time: schedules[0].start_time
          })
        }
      }
      
      // FALLBACK: Get schedule from get_schedule tool if we don't have it yet
      if (schedules.length === 0 && tr.tool === 'get_schedule' && tr.result?.schedules) {
        console.log('🔄 FALLBACK: Using get_schedule results')
        // Find schedules without instructor (instructor_id is null or instructor_name is 'TBD')
        schedules = tr.result.schedules.filter((s: any) => 
          !s.instructor_id || s.instructor_name === 'TBD' || s.instructor_name === null
        )
        console.log(`📅 Found ${schedules.length} schedules without instructor`)
      }
    }
  }
  
  // FALLBACK 2: Try to parse class info from the AI's response text
  // Look for patterns like "GI class on Monday at 5:00 PM"
  if (schedules.length === 0 && content) {
    const classMatch = content.match(/(\w+)\s+class\s+on\s+(\w+)\s+at\s+([\d:]+\s*[AP]M)/i)
    if (classMatch) {
      const [, classType, dayOfWeek, time] = classMatch
      schedules.push({
        // Partial schedule info - won't have ID but can still show text-based options
        class_type: classType,
        day_of_week: dayOfWeek,
        start_time: time,
        id: null // No ID means we can't execute actions, but we tried
      })
    }
  }
  
  // Use the first schedule if we found any
  const schedule = schedules.length > 0 ? schedules[0] : null
  
  // Only create action buttons if we have both instructors AND a valid schedule with ID
  if (instructors.length > 0 && schedule && schedule.id) {
    // Action 1: Assign instructor buttons - SMART SELECTION
    // Find instructors that were actually mentioned in the AI response
    const mentionedInstructors = instructors.filter((instructor: any) => {
      // Check if instructor's name appears in the content
      const namePattern = new RegExp(instructor.name.replace(/\s+/g, '\\s+'), 'i')
      return namePattern.test(content)
    })
    
    console.log('📋 Instructors mentioned in response:', mentionedInstructors.map((i: any) => i.name))
    
    // Use mentioned instructors if any, otherwise fall back to all instructors
    const instructorsToShow = mentionedInstructors.length > 0 
      ? mentionedInstructors.slice(0, 3) 
      : instructors.slice(0, 3)
    
    // Create buttons for selected instructors
    for (const instructor of instructorsToShow) {
      actions.push({
        type: 'assign_instructor',
        label: `Assign ${instructor.name}`,
        icon: 'person_add',
        color: 'primary',
        params: {
          schedule_id: schedule.id,
          instructor_id: instructor.id,
          instructor_name: instructor.name,
          class_info: `${schedule.class_type} - ${schedule.day_of_week} ${schedule.start_time}`
        }
      })
    }
    
    // Action 2: Reschedule class
    actions.push({
      type: 'reschedule_class',
      label: 'Reschedule Class',
      icon: 'schedule',
      color: 'warning',
      params: {
        schedule_id: schedule.id,
        class_info: `${schedule.class_type} - ${schedule.day_of_week} ${schedule.start_time}`
      }
    })
    
    // Action 3: Cancel class
    actions.push({
      type: 'cancel_class',
      label: 'Cancel Class',
      icon: 'cancel',
      color: 'negative',
      params: {
        schedule_id: schedule.id,
        class_info: `${schedule.class_type} - ${schedule.day_of_week} ${schedule.start_time}`
      }
    })
  }
  
  // Log what we found for debugging
  console.log('🎬 Action extraction:', {
    hasInstructors: instructors.length > 0,
    hasSchedule: !!schedule,
    hasScheduleId: !!(schedule?.id),
    actionsCreated: actions.length
  })
  
  return actions
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
4. When showing schedules to users, present them in a clean, readable format:
   - NEVER show Schedule IDs to users (you see them internally, but don't display them)
   - Use 12-hour time format (7:00 PM, not 19:00)
   - Format like: "GI Class - Monday 7:00 PM with Instructor Name (All Levels)"
   - Example: "NO-GI - Tuesday 6:00 PM with John Silva (Advanced)"
5. When making RSVPs, extract the Schedule ID from the tool results (you have access to [Schedule ID: xxx] internally) but DO NOT show it to the user
6. If user asks "what did I ask last time" or similar, reference the conversation history provided above

CRITICAL RSVP WORKFLOW (FOLLOW EXACTLY):
Step 1: When user asks to RSVP, get the schedule using get_schedule or find_next_class
Step 2: The tool results will show "[Schedule ID: xxxxx-xxxx-xxxx-xxxx-xxxxx]" for each class
Step 3: Extract the ENTIRE UUID from inside the brackets - it's a long hex string with dashes (36 characters)
Step 4: Use that EXACT UUID in rsvp_to_class - do NOT modify it, do NOT shorten it
Step 5: Set rsvp_date to the next occurrence of that class day (YYYY-MM-DD format)

UUID FORMAT EXAMPLES:
- VALID: "2c5f5b2d-4f7d-4a26-b0b0-7b5b84a710a8" (full 36-char UUID with dashes)
- VALID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" (full UUID)
- INVALID: "abc123..." (shortened with dots)
- INVALID: "uuid-gi-monday-7pm" (descriptive text, not a UUID)
- INVALID: Any ID less than 36 characters

CRITICAL: If the schedule ID you extracted is not a valid UUID format (8-4-4-4-12 hexadecimal pattern), DO NOT attempt the RSVP. Ask the user to check the schedule again.

INSTRUCTOR MANAGEMENT (Owners/Admins only):
- You can assign instructors to recurring classes (all future occurrences) using assign_instructor_to_class
- You can assign instructors to specific date instances using assign_instructor_to_date_instance
- You can check for scheduling problems (missing instructors, conflicts) using check_schedule_problems
- You can list all instructors with get_instructors
- You can view an instructor's schedule with get_instructor_schedule
- You can send alerts to the gym about problems using send_alert
- You can cancel classes with notifications using cancel_class_with_notification

CRITICAL: RESPONDING TO "NO INSTRUCTOR ASSIGNED" PROBLEMS:
When a user asks about scheduling issues, instructor assignments, or fixing classes without instructors:

**STEP 1: ALWAYS call BOTH tools in sequence:**
1. First call check_schedule_problems to identify the problematic class
2. Then call get_instructors to see available instructors

**STEP 2: Provide these actionable options:**

1. **Assign an instructor anyway** - Instructors can be assigned even if they haven't marked that time as available
   - Suggest specific instructors by name
   - Example: "I can assign Professor Mike Chen to this class if you'd like"

2. **Direct message instructors** - Instructor names are CLICKABLE in your text
   - List each instructor's name with their title clearly
   - Example: "You can reach out to **Professor Mike Chen** or **Coach Ana Rodriguez** by clicking their names"
   - DO NOT add a generic "Message Instructors" option - the names themselves are the links

3. **Reschedule the class** - Suggest alternative times when instructors are available
   - Example: "Or we could reschedule the GI class to Monday evening when **Professor Carlos Martinez** is available"

4. **Cancel the class** - Offer to cancel and notify members
   - Example: "I can also cancel the class and notify anyone who has RSVPed"

**CRITICAL:** If a user asks "can you help me assign an instructor" or similar, you MUST call check_schedule_problems first to identify which class needs help, then call get_instructors.

ALWAYS present ALL FOUR options when discussing unassigned classes. Never just say "no instructors available" without offering solutions.

CRITICAL INSTRUCTOR ASSIGNMENT WORKFLOW (FOLLOW EXACTLY):
Step 1: ALWAYS call get_instructors first to get the list of available instructors
Step 2: Look at the tool result to find the instructor's actual UUID (looks like: "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
Step 3: Call get_schedule to get the class schedule UUID you need to assign to
Step 4: IMMEDIATELY call assign_instructor_to_class or assign_instructor_to_date_instance
  - Recurring: "assign John to all Monday 7pm classes" → use assign_instructor_to_class
  - Single date: "assign John to Monday Dec 15th class" → use assign_instructor_to_date_instance
Step 5: Do NOT say "let me assign" or "I'll go ahead" without ACTUALLY calling the assignment tool
Step 6: After the tool returns success, THEN inform the user it's done

CRITICAL EXECUTION RULE:
- If user says "assign X to Y" → Execute the assignment immediately (don't ask for permission)
- If user says "who should teach X?" → Suggest options but don't assign
- If user says "can you assign?" → That's permission - execute immediately
- NEVER say you'll do something and then not do it

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
- "GI class Monday 6:30 AM has no instructor" → check_schedule_problems → get_instructors → Present ALL 4 options with action buttons
- "Can you help me assign an instructor?" → check_schedule_problems → get_instructors → Present options
- "I need help fixing this scheduling issue: The GI class on Monday at 5:00 PM has no instructor" → check_schedule_problems → get_instructors → Present action buttons

CRITICAL TOOL SEQUENCING FOR INSTRUCTOR ISSUES:
If the user mentions a specific class having no instructor or needing help with scheduling:
1. FIRST call check_schedule_problems (to get the schedule ID and full context)
2. THEN call get_instructors (to get available instructors)
3. FINALLY respond with ALL FOUR OPTIONS - the system will automatically create clickable action buttons

CRITICAL: DO NOT say "I will go ahead and assign" without actually calling assign_instructor_to_class tool!
Instead, present the options and let the user click a button:
- "Here are your options: 1) Assign Professor X (click the button below), 2) Message instructors, 3) Reschedule, 4) Cancel"
- DO NOT execute assignments unless the user explicitly confirms via the action buttons

CRITICAL: INSTRUCTOR NAMES ARE CLICKABLE LINKS:
- ALL instructor names in your responses are automatically converted to clickable links
- Users can click ANY instructor name (Coach X, Professor Y, Instructor Z) to send them a DM
- When suggesting to contact instructors, format their names clearly with titles: "Coach Ana Rodriguez", "Professor Mike Chen", "Instructor John Silva"
- DO NOT say "click here" or use generic links - use the actual instructor names
- Present multiple instructors as a list with their names prominently formatted
- Examples:
  * "You can reach out to **Coach Ana Rodriguez** or **Professor Mike Chen** by clicking their names"
  * "I recommend messaging **Professor Carlos Martinez** directly to check his availability"
  * "Contact any of these instructors: **Coach Ana Rodriguez**, **Professor Mike Chen**, or **Instructor John Silva**"
- The names themselves ARE the buttons - no additional "Message" buttons needed

PROACTIVE PROBLEM DETECTION (Owners/Admins only):
- When asked about schedule issues, problems, or concerns, use check_schedule_problems
- The tool checks the user's role automatically:
  * STUDENTS: Get a reassuring message that staff handles scheduling
  * INSTRUCTORS/OWNERS: Get detailed problems with severity levels
- If the result has is_student: true, relay the message field directly to the user
- For staff, report problems by severity: CRITICAL (red flag), WARNING (yellow flag), INFO (blue flag)
- Always suggest specific actions for each problem
- For missing instructors within 48h, mark as CRITICAL
- For instructor conflicts (overlapping classes), mark as WARNING

STUDENT QUESTIONS ABOUT INSTRUCTORS:
- If a student asks "who's teaching tomorrow?" or "is there an instructor?" - check schedule normally
- If they ask "are there problems?" or "what's wrong with the schedule?" - use check_schedule_problems
- The system will automatically give them an appropriate student-friendly response

NOTIFICATION STRATEGY:
- Gym-wide issues → send_alert with target="gym_chat"
- Instructor-specific → send_alert with target="instructors"
- Class cancellations → use cancel_class_with_notification to auto-notify RSVPs

You have access to tools to check schedules, make RSVPs, manage instructors, and send alerts.

User preferences: ${JSON.stringify(conversationState?.preferences || {})}

Current context: ${conversationState?.context?.join(', ') || 'None'}

CRITICAL ACTION EXECUTION:
- When users ask to RSVP, book classes, cancel RSVPs, or assign instructors - you MUST call the appropriate tool
- Do NOT just acknowledge the request - EXECUTE it using tools
- Do NOT repeat the same tool call multiple times - if you've already called get_schedule, use the result
- Do NOT say "let me do X" and then call get_schedule again - call the ACTION tool (rsvp_to_class, assign_instructor_to_class, etc.)

RESPONSE RULE: 
- Information questions → Answer directly
- Action requests → Execute tools, then respond with results
- If you've gathered all needed UUIDs → Execute the final action tool immediately

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
          // For schedules, provide summary WITH schedule IDs so AI can use them for RSVP
          const schedules = tr.result.schedules
          formattedResult = `Found ${schedules.length} classes:\n` +
            schedules.slice(0, 20).map((s: any, idx: number) =>
              `${idx + 1}. ${s.class_type} - ${s.day_of_week} ${s.start_time}-${s.end_time} with ${s.instructor_name || 'TBD'} (${s.level || 'All Levels'})${s.notes ? ' - ' + s.notes : ''}\n   [Schedule ID: ${s.id}]`
            ).join('\n\n') +
            (schedules.length > 20 ? `\n... and ${schedules.length - 20} more classes` : '') +
            '\n\nIMPORTANT: Use the exact Schedule ID shown above when making RSVPs. Do NOT modify or shorten the ID.'
        } else if (tr.tool === 'find_next_class' && tr.result?.schedules) {
          // For find_next_class, provide schedule info WITH IDs so AI can use them for RSVP
          const schedules = tr.result.schedules
          formattedResult = `Found ${schedules.length} ${tr.result.next_class_day} classes:\n` +
            schedules.map((s: any, idx: number) =>
              `${idx + 1}. ${s.class_type} - ${s.start_time}-${s.end_time} with ${s.instructor_name || 'TBD'} (${s.level || 'All Levels'})${s.notes ? ' - ' + s.notes : ''}\n   [Schedule ID: ${s.id}]`
            ).join('\n\n') +
            '\n\nIMPORTANT: Use the exact Schedule ID shown above when making RSVPs. Do NOT modify or shorten the ID.'
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
        content: `Here are the results from the tools you requested:\n\n${toolSummary}\n\nCRITICAL: You now have all the information you need. Provide a complete, natural response to the user based on these results. DO NOT request more tools unless absolutely necessary for a multi-step action (like RSVP after getting schedule, or assign instructor after getting instructor list). If you're just providing information, answer directly now.`
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
    // IMPORTANT: Only include tools if we don't have tool results OR if we have results that require follow-up actions
    // This prevents infinite loops while allowing multi-step operations like: 1) get_schedule, 2) rsvp_to_class
    
    // Check if any tool results indicate we need follow-up actions
    const needsFollowUpTools = toolResults && toolResults.length > 0 && toolResults.some((tr: any) => {
      // Allow follow-up tools only for specific action sequences:
      // 1. After get_schedule -> allow rsvp_to_class or find_next_class
      // 2. After get_instructors -> allow assign_instructor_to_class (only if user requested assignment)
      // 3. After check_schedule_problems -> allow various remediation tools
      const actionTools = ['get_schedule', 'find_next_class', 'check_schedule_problems']
      return actionTools.includes(tr.tool)
    })
    
    // Include tools if: no tool results yet OR tool results need follow-up
    const shouldIncludeTools = openaiTools.length > 0 && (!toolResults || needsFollowUpTools)
    
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
        max_tokens: 1000
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
          requiresToolExecution: true,
          suggested_actions: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract suggested actions from the response
    const suggestedActions = extractSuggestedActions(assistantMessage.content, toolResults, conversationHistory)
    
    console.log('✅ Final response - suggested_actions count:', suggestedActions.length)

    // Return assistant message
    return new Response(
      JSON.stringify({
        message: assistantMessage.content,
        tool_calls: [],
        requiresToolExecution: false,
        suggested_actions: suggestedActions,
        // DEBUG INFO (temporary) - remove after debugging
        _debug: {
          action_count: suggestedActions.length,
          tool_results_count: toolResults?.length || 0,
          has_tool_results: !!toolResults && toolResults.length > 0
        }
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
