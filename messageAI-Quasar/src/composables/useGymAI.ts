import { ref } from 'vue';
import { supabase } from '../boot/supabase';
import { user } from '../state/auth';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  tool_calls?: unknown[];
};

type ConversationState = {
  preferences?: Record<string, unknown>;
  context?: string[];
  lastScheduleQuery?: string;
};

export function useGymAI() {
  const messages = ref<Message[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const conversationId = ref<string | null>(null);
  const conversationState = ref<ConversationState>({});

  // Capability 1: RAG Pipeline - Retrieve conversation history and relevant context
  async function loadConversationHistory(gymId: string | null) {
    if (!gymId) return; // Skip if no gym
    try {
      const { data, error: fetchError } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.value?.id)
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (data) {
        conversationId.value = data.id;
        messages.value = (data.messages as Message[]) || [];
        conversationState.value = (data.conversation_state as ConversationState) || {};
      }
    } catch (err) {
      console.error('Error loading conversation history:', err);
    }
  }

  // Capability 2: User Preference Storage
  async function loadUserPreferences() {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('ai_preferences')
        .eq('id', user.value?.id)
        .single();

      if (fetchError) throw fetchError;

      if (data?.ai_preferences) {
        conversationState.value.preferences = data.ai_preferences as Record<string, unknown>;
      }
    } catch (err) {
      console.error('Error loading user preferences:', err);
    }
  }

  async function updateUserPreferences(preferences: Record<string, unknown>) {
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ ai_preferences: preferences })
        .eq('id', user.value?.id);

      if (updateError) throw updateError;

      conversationState.value.preferences = preferences;
    } catch (err) {
      console.error('Error updating preferences:', err);
      throw err;
    }
  }

  // Capability 3: Function Calling - Tool definitions
  const tools = [
    {
      name: 'get_schedule',
      description: 'Get gym class schedules for a specific day or the entire week. Returns all schedules that match the filters.',
      parameters: {
        day_of_week: { type: 'string', description: 'Day of week (Monday-Sunday) or "all" for entire week' },
        class_type: { type: 'string', description: 'Optional: Filter by class type. Use "GI" for gi classes, "NO-GI" for no-gi classes, "Open Mat" for open mat sessions, "Competition" for competition training. Note: Open Mat classes are often no-gi but stored separately.', optional: true },
        include_related: { type: 'boolean', description: 'Optional: If true and class_type is NO-GI, also include Open Mat classes. Default false.', optional: true }
      }
    },
    {
      name: 'rsvp_to_class',
      description: 'RSVP user to a specific class',
      parameters: {
        schedule_id: { type: 'string', description: 'ID of the gym schedule' },
        rsvp_date: { type: 'string', description: 'Date for RSVP (YYYY-MM-DD format)' }
      }
    },
    {
      name: 'get_my_rsvps',
      description: 'Get user\'s upcoming RSVPs',
      parameters: {}
    },
    {
      name: 'cancel_rsvp',
      description: 'Cancel a user\'s RSVP',
      parameters: {
        rsvp_id: { type: 'string', description: 'ID of the RSVP to cancel' }
      }
    },
    {
      name: 'search_schedule_context',
      description: 'Search for relevant schedule information using semantic search',
      parameters: {
        query: { type: 'string', description: 'Natural language query about schedules' }
      }
    },
    {
      name: 'find_next_class',
      description: 'Find the next available class of a specific type after a given day. Useful for suggesting alternatives.',
      parameters: {
        class_type: { type: 'string', description: 'Class type to find (GI, NO-GI, Open Mat, Competition)' },
        after_day: { type: 'string', description: 'Find classes after this day (Monday-Sunday)' }
      }
    }
  ];

  // Execute function calls
  async function executeTool(toolName: string, parameters: Record<string, unknown>, gymId: string | null) {
    try {
      switch (toolName) {
        case 'get_schedule':
          return await getSchedule(gymId, parameters as { day_of_week?: string; class_type?: string; include_related?: boolean });
        case 'rsvp_to_class':
          return await rsvpToClass(parameters as { schedule_id: string; rsvp_date: string });
        case 'get_my_rsvps':
          return await getMyRsvps();
        case 'cancel_rsvp':
          return await cancelRsvp(parameters as { rsvp_id: string });
        case 'search_schedule_context':
          return await searchScheduleContext(gymId, parameters as { query: string });
        case 'find_next_class':
          return await findNextClass(gymId, parameters as { class_type: string; after_day: string });
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (err) {
      // Capability 5: Error Handling
      console.error(`Error executing tool ${toolName}:`, err);
      return {
        error: true,
        message: `Failed to execute ${toolName}: ${(err as Error).message}`
      };
    }
  }

  // Tool implementations
  async function getSchedule(gymId: string | null, params: { day_of_week?: string; class_type?: string; include_related?: boolean }) {
    if (!gymId) throw new Error('No gym selected');
    let query = supabase
      .from('gym_schedules')
      .select('*')
      .eq('gym_id', gymId)
      .eq('is_active', true);

    if (params.day_of_week && params.day_of_week !== 'all') {
      query = query.eq('day_of_week', params.day_of_week);
    }

    if (params.class_type) {
      // Normalize class type to uppercase and handle variations
      const normalizedType = params.class_type.toUpperCase();
      
      // If asking for NO-GI and include_related is true, get both NO-GI and Open Mat
      if ((normalizedType === 'NO-GI' || normalizedType === 'NOGI') && params.include_related) {
        query = query.in('class_type', ['NO-GI', 'Open Mat']);
      } else if (normalizedType === 'NOGI') {
        query = query.eq('class_type', 'NO-GI');
      } else if (normalizedType === 'OPEN_MAT' || normalizedType === 'OPENMAT') {
        query = query.eq('class_type', 'Open Mat');
      } else {
        // Use the normalized uppercase version
        query = query.eq('class_type', normalizedType);
      }
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) throw error;
    return { schedules: data };
  }

  async function rsvpToClass(params: { schedule_id: string; rsvp_date: string }) {
    if (!user.value?.id) throw new Error('User not authenticated');

    // Check capacity
    const { data: schedule } = await supabase
      .from('gym_schedules')
      .select('max_capacity, current_rsvps')
      .eq('id', params.schedule_id)
      .single();

    const status = schedule && schedule.max_capacity && schedule.current_rsvps >= schedule.max_capacity
      ? 'waitlist'
      : 'confirmed';

    const { data, error } = await supabase
      .from('class_rsvps')
      .insert({
        schedule_id: params.schedule_id,
        user_id: user.value.id,
        rsvp_date: params.rsvp_date,
        status
      })
      .select()
      .single();

    if (error) throw error;
    return { rsvp: data, status };
  }

  async function getMyRsvps() {
    if (!user.value?.id) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('class_rsvps')
      .select('*, gym_schedules(*)')
      .eq('user_id', user.value.id)
      .gte('rsvp_date', new Date().toISOString().split('T')[0])
      .order('rsvp_date', { ascending: true });

    if (error) throw error;
    return { rsvps: data };
  }

  async function cancelRsvp(params: { rsvp_id: string }) {
    const { error } = await supabase
      .from('class_rsvps')
      .delete()
      .eq('id', params.rsvp_id);

    if (error) throw error;
    return { success: true };
  }

  // RAG: Semantic search over schedule embeddings
  async function searchScheduleContext(gymId: string | null, params: { query: string }) {
    try {
      // Call Edge Function to generate embedding and search
      const { data, error } = await supabase.functions.invoke('search-schedule-embeddings', {
        body: {
          query: params.query,
          gymId
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error searching schedule context:', err);
      return { results: [], error: 'Failed to search' };
    }
  }

  // Find next available class of a specific type
  async function findNextClass(gymId: string | null, params: { class_type: string; after_day: string }) {
    if (!gymId) throw new Error('No gym selected');
    
    // Days of the week in order
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const afterDayIndex = daysOfWeek.indexOf(params.after_day);
    
    if (afterDayIndex === -1) throw new Error('Invalid day of week');
    
    // Normalize class type
    const normalizedType = params.class_type.toUpperCase();
    
    // Build query to find classes
    let classTypes: string[] = [];
    if (normalizedType === 'NO-GI' || normalizedType === 'NOGI') {
      // For no-gi, also include open mat
      classTypes = ['NO-GI', 'Open Mat'];
    } else if (normalizedType === 'OPEN_MAT' || normalizedType === 'OPENMAT') {
      classTypes = ['Open Mat'];
    } else {
      classTypes = [normalizedType];
    }
    
    // Get all matching classes for the week
    const { data, error } = await supabase
      .from('gym_schedules')
      .select('*')
      .eq('gym_id', gymId)
      .eq('is_active', true)
      .in('class_type', classTypes)
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    
    // Find the next class after the given day
    const sortedDays = [...daysOfWeek.slice(afterDayIndex + 1), ...daysOfWeek.slice(0, afterDayIndex + 1)];
    
    for (const day of sortedDays) {
      const dayClasses = data?.filter(s => s.day_of_week === day);
      if (dayClasses && dayClasses.length > 0) {
        return { 
          next_class_day: day,
          schedules: dayClasses,
          message: `Next ${params.class_type} classes are on ${day}`
        };
      }
    }
    
    return { schedules: [], message: `No ${params.class_type} classes found in the schedule` };
  }

  // Capability 4: Memory/State Management
  async function saveConversation(gymId: string | null) {
    try {
      const conversationData = {
        user_id: user.value?.id,
        gym_id: gymId || null,
        messages: messages.value,
        conversation_state: conversationState.value,
        updated_at: new Date().toISOString()
      };

      if (conversationId.value) {
        // Update existing conversation
        const { error: updateError } = await supabase
          .from('ai_conversations')
          .update(conversationData)
          .eq('id', conversationId.value);

        if (updateError) throw updateError;
      } else {
        // Create new conversation
        const { data, error: insertError } = await supabase
          .from('ai_conversations')
          .insert(conversationData)
          .select()
          .single();

        if (insertError) throw insertError;
        if (data) conversationId.value = data.id;
      }
    } catch (err) {
      console.error('Error saving conversation:', err);
      throw err;
    }
  }

  // Main chat function
  async function sendMessage(userMessage: string, gymId: string | null, userTimezone?: string) {
    if (!gymId) {
      error.value = 'Please join a gym to use the AI Assistant';
      return { success: false, error: error.value, message: '' };
    }
    loading.value = true;
    error.value = null;

    try {
      // Add user message to history
      messages.value.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      });

      // Get user's timezone if not provided
      const timezone = userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Call Edge Function with conversation context
      const { data, error: aiError } = await supabase.functions.invoke('gym-ai-assistant', {
        body: {
          message: userMessage,
          conversationHistory: messages.value.slice(-10), // Last 10 messages for context
          conversationState: conversationState.value,
          gymId,
          userId: user.value?.id,
          tools,
          userTimezone: timezone
        }
      });

      if (aiError) throw aiError;

      // Handle tool calls if any
      if (data.tool_calls && data.tool_calls.length > 0) {
        console.log('🔧 AI wants to use tools:', data.tool_calls);
        
        // Add the initial AI message to show it's working
        messages.value.push({
          role: 'assistant',
          content: data.message || 'Let me check that for you...',
          timestamp: new Date().toISOString()
        });
        
        // Execute tools and collect results
        const toolResultsArray = [];
        for (const toolCall of data.tool_calls) {
          console.log(`🔨 Executing tool: ${toolCall.name}`, toolCall.parameters);
          const toolResult = await executeTool(toolCall.name, toolCall.parameters, gymId);
          console.log(`✅ Tool result for ${toolCall.name}:`, toolResult);
          
          toolResultsArray.push({
            tool: toolCall.name,
            result: toolResult
          });
          
          // Add summary to context (not full data to keep payload small)
          const contextSummary = toolCall.name === 'get_schedule' && toolResult.schedules
            ? `Tool ${toolCall.name}: Found ${toolResult.schedules.length} classes`
            : `Tool ${toolCall.name}: Completed`;
          
          conversationState.value.context = [
            ...(conversationState.value.context || []),
            contextSummary
          ];
        }

        console.log('🔄 Calling AI again with tool results...');
        // Call AI again with tool results (don't send full conversationState to reduce payload size)
        const { data: followupData, error: followupError } = await supabase.functions.invoke('gym-ai-assistant', {
          body: {
            message: userMessage,
            conversationHistory: messages.value,
            conversationState: {
              preferences: conversationState.value.preferences,
              context: (conversationState.value.context || []).slice(-5) // Only last 5 context items
            },
            gymId,
            userId: user.value?.id,
            tools,
            userTimezone: timezone,
            toolResults: toolResultsArray
          }
        });

        if (followupError) {
          console.error('❌ Follow-up call error:', followupError);
          throw followupError;
        }

        console.log('✅ Got final AI response:', followupData.message);
        
        // Add assistant response
        messages.value.push({
          role: 'assistant',
          content: followupData.message,
          timestamp: new Date().toISOString()
        });
      } else {
        // No tool calls, just add response
        messages.value.push({
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString()
        });
      }

      // Save conversation state
      await saveConversation(gymId);

      return { success: true, message: data.message };
    } catch (err) {
      console.error('Error sending message:', err);
      error.value = (err as Error).message;
      
      // Capability 5: Error Recovery - provide fallback
      const fallbackMessage = 'I apologize, but I\'m having trouble processing your request right now. Please try asking in a different way or contact the gym directly.';
      messages.value.push({
        role: 'assistant',
        content: fallbackMessage,
        timestamp: new Date().toISOString()
      });

      return { success: false, error: error.value, message: fallbackMessage };
    } finally {
      loading.value = false;
    }
  }

  // Initialize
  async function initialize(gymId: string | null) {
    if (!gymId) return;
    await loadConversationHistory(gymId);
    await loadUserPreferences();
  }

  return {
    messages,
    loading,
    error,
    conversationState,
    tools,
    sendMessage,
    initialize,
    updateUserPreferences,
    saveConversation
  };
}
