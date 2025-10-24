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
      description: 'Get gym class schedules for a specific day or the entire week',
      parameters: {
        day_of_week: { type: 'string', description: 'Day of week (Monday-Sunday) or "all" for entire week' },
        class_type: { type: 'string', description: 'Optional: Filter by class type (gi, nogi, kids, open_mat)', optional: true }
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
    }
  ];

  // Execute function calls
  async function executeTool(toolName: string, parameters: Record<string, unknown>, gymId: string | null) {
    try {
      switch (toolName) {
        case 'get_schedule':
          return await getSchedule(gymId, parameters as { day_of_week?: string; class_type?: string });
        case 'rsvp_to_class':
          return await rsvpToClass(parameters as { schedule_id: string; rsvp_date: string });
        case 'get_my_rsvps':
          return await getMyRsvps();
        case 'cancel_rsvp':
          return await cancelRsvp(parameters as { rsvp_id: string });
        case 'search_schedule_context':
          return await searchScheduleContext(gymId, parameters as { query: string });
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
  async function getSchedule(gymId: string | null, params: { day_of_week?: string; class_type?: string }) {
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
      query = query.eq('class_type', params.class_type);
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
  async function sendMessage(userMessage: string, gymId: string | null) {
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

      // Call Edge Function with conversation context
      const { data, error: aiError } = await supabase.functions.invoke('gym-ai-assistant', {
        body: {
          message: userMessage,
          conversationHistory: messages.value.slice(-10), // Last 10 messages for context
          conversationState: conversationState.value,
          gymId,
          userId: user.value?.id,
          tools
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
        
        for (const toolCall of data.tool_calls) {
          console.log(`🔨 Executing tool: ${toolCall.name}`, toolCall.parameters);
          const toolResult = await executeTool(toolCall.name, toolCall.parameters, gymId);
          console.log(`✅ Tool result for ${toolCall.name}:`, toolResult);
          
          // Add tool result to context
          conversationState.value.context = [
            ...(conversationState.value.context || []),
            `Tool ${toolCall.name}: ${JSON.stringify(toolResult)}`
          ];
        }

        console.log('🔄 Calling AI again with tool results...');
        // Call AI again with tool results
        const { data: followupData, error: followupError } = await supabase.functions.invoke('gym-ai-assistant', {
          body: {
            message: userMessage,
            conversationHistory: messages.value,
            conversationState: conversationState.value,
            gymId,
            userId: user.value?.id,
            tools,
            toolResults: data.tool_calls.map((tc: { name: string }, idx: number) => ({
              tool: tc.name,
              result: conversationState.value.context?.[conversationState.value.context.length - data.tool_calls.length + idx]
            }))
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
