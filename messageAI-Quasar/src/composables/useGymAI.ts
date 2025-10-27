import { ref } from 'vue';
import { supabase } from '../boot/supabase';
import { user } from '../state/auth';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  tool_calls?: unknown[];
  suggested_actions?: SuggestedAction[];
};

type SuggestedAction = {
  type: string;
  label: string;
  icon: string;
  color: string;
  params: Record<string, unknown>;
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
      description: 'RSVP user to a specific class. CRITICAL: You must have the actual schedule UUID from a previous get_schedule or find_next_class call. Do NOT make up or guess schedule IDs.',
      parameters: {
        schedule_id: { type: 'string', description: 'The ACTUAL UUID of the gym schedule from the [ID: uuid] in the get_schedule results. Example: "123e4567-e89b-12d3-a456-426614174000". NEVER use fake IDs like "uuid-gi-monday-7pm".' },
        rsvp_date: { type: 'string', description: 'Date for RSVP (YYYY-MM-DD format). Use the next occurrence of the class day.' }
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
    },
    {
      name: 'get_instructors',
      description: 'List all instructors at the gym with their preferences and current assignments. Only available to owners/admins.',
      parameters: {
        include_schedule: { type: 'boolean', description: 'Optional: If true, include each instructor\'s current class schedule. Default false.', optional: true }
      }
    },
    {
      name: 'assign_instructor_to_class',
      description: 'Assign an instructor to a recurring class template (all future occurrences). Only available to owners/admins. CRITICAL: You MUST call get_instructors first to get the actual instructor UUIDs. NEVER use descriptive IDs like "ana-rodriguez" - ONLY use the full UUID from get_instructors results.',
      parameters: {
        schedule_id: { type: 'string', description: 'UUID of the gym schedule to assign instructor to (from get_schedule results)' },
        instructor_id: { type: 'string', description: 'UUID of the instructor profile to assign (MUST be from get_instructors results, looks like "a1b2c3d4-e5f6-7890-abcd-ef1234567890")' },
        assignment_type: { type: 'string', description: 'Type of assignment: "one_time" for a single class or "recurring_weekly" for all future occurrences. Default "recurring_weekly"', optional: true }
      }
    },
    {
      name: 'assign_instructor_to_date_instance',
      description: 'Assign an instructor to a specific future date occurrence (not recurring). Use this for one-time assignments like "assign John to Monday Dec 15th class". Only available to owners/admins. CRITICAL: You MUST call get_instructors first to get the actual instructor UUIDs.',
      parameters: {
        schedule_id: { type: 'string', description: 'UUID of the gym schedule (from get_schedule results)' },
        instructor_id: { type: 'string', description: 'UUID of the instructor profile to assign (MUST be from get_instructors results)' },
        date: { type: 'string', description: 'Specific date for the assignment (YYYY-MM-DD format)' }
      }
    },
    {
      name: 'check_schedule_problems',
      description: 'Detect scheduling issues like missing instructors, capacity problems, or conflicts. NOTE: Automatically checks user role - students get a professional message, instructors/owners get detailed problems. Returns a list of problems with severity and suggested actions.',
      parameters: {
        date_range: { type: 'object', description: 'Optional: {start: "YYYY-MM-DD", end: "YYYY-MM-DD"}. Default is next 7 days.', optional: true }
      }
    },
    {
      name: 'get_instructor_schedule',
      description: 'Get an instructor\'s full teaching schedule. Shows all classes they are assigned to.',
      parameters: {
        instructor_id: { type: 'string', description: 'UUID of the instructor' },
        date_range: { type: 'object', description: 'Optional: {start: "YYYY-MM-DD", end: "YYYY-MM-DD"}. Default is next 7 days.', optional: true }
      }
    },
    {
      name: 'send_alert',
      description: 'Send a notification/alert message to gym members via chat. Only available to owners/admins.',
      parameters: {
        message: { type: 'string', description: 'The alert message to send' },
        target: { type: 'string', description: 'Where to send: "gym_chat" for all gym members, "instructors" for instructors only, or a specific user_id' }
      }
    },
    {
      name: 'cancel_class_with_notification',
      description: 'Cancel a class and optionally notify all RSVPed members. Only available to owners/admins.',
      parameters: {
        schedule_id: { type: 'string', description: 'UUID of the schedule to cancel' },
        date: { type: 'string', description: 'Optional: Specific date (YYYY-MM-DD) to cancel. If not provided, cancels the entire recurring class.', optional: true },
        reason: { type: 'string', description: 'Reason for cancellation to include in notification' },
        notify_members: { type: 'boolean', description: 'Whether to send notifications to RSVPed members. Default true.', optional: true }
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
        case 'get_instructors':
          return await getInstructors(gymId, parameters as { include_schedule?: boolean });
        case 'assign_instructor_to_class':
          return await assignInstructorToClass(parameters as { schedule_id: string; instructor_id: string; assignment_type?: string });
        case 'assign_instructor_to_date_instance':
          return await assignInstructorToDateInstance(gymId, parameters as { schedule_id: string; instructor_id: string; date: string });
        case 'check_schedule_problems':
          return await checkScheduleProblems(gymId, parameters as { date_range?: { start: string; end: string } });
        case 'get_instructor_schedule':
          return await getInstructorSchedule(gymId, parameters as { instructor_id: string; date_range?: { start: string; end: string } });
        case 'send_alert':
          return await sendAlert(gymId, parameters as { message: string; target: string });
        case 'cancel_class_with_notification':
          return await cancelClassWithNotification(gymId, parameters as { schedule_id: string; date?: string; reason: string; notify_members?: boolean });
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

    console.log(`🔄 Making RSVP for schedule_id: ${params.schedule_id}, date: ${params.rsvp_date}`);

    // Validate UUID format (8-4-4-4-12 pattern)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(params.schedule_id)) {
      console.error('❌ Invalid schedule_id format:', params.schedule_id);
      throw new Error(`Invalid schedule ID format. Please ask for the schedule again to get a valid ID.`);
    }

    // First, try to find the schedule WITHOUT .single() to see if it exists at all
    const { data: scheduleCheck, error: checkError } = await supabase
      .from('gym_schedules')
      .select('id, gym_id, class_type, is_active')
      .eq('id', params.schedule_id);

    if (checkError) {
      console.error('❌ Error checking schedule existence:', checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    if (!scheduleCheck || scheduleCheck.length === 0) {
      console.error('❌ Schedule not found in database. ID:', params.schedule_id);
      console.error('❌ This likely means the AI used an invalid or outdated schedule_id');
      throw new Error(`Schedule not found. Please try asking for the schedule again to get the correct ID.`);
    }

    const scheduleInfo = scheduleCheck[0];
    if (!scheduleInfo) {
      throw new Error(`Schedule not found. Please try asking for the schedule again to get the correct ID.`);
    }

    console.log(`📋 Found schedule:`, scheduleInfo);

    if (!scheduleInfo.is_active) {
      throw new Error(`This class is no longer active. Please check the current schedule.`);
    }

    // Now get full schedule details with .single() since we know it exists
    const { data: schedule, error: scheduleError } = await supabase
      .from('gym_schedules')
      .select('max_capacity, current_rsvps, class_type, day_of_week, start_time, gym_id')
      .eq('id', params.schedule_id)
      .single();

    if (scheduleError || !schedule) {
      console.error('❌ Error fetching full schedule details:', scheduleError);
      throw new Error(`Unable to access schedule details. You may not have permission to RSVP to this class.`);
    }

    const status = schedule.max_capacity && schedule.current_rsvps >= schedule.max_capacity
      ? 'waitlist'
      : 'confirmed';

    console.log(`📋 Schedule capacity: ${schedule.current_rsvps}/${schedule.max_capacity}, status: ${status}`);

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

    if (error) {
      console.error('❌ Error creating RSVP:', error);
      throw error;
    }

    console.log(`✅ RSVP created successfully:`, data);
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

  // New Tool: Get instructors
  async function getInstructors(gymId: string | null, params: { include_schedule?: boolean }) {
    if (!gymId) throw new Error('No gym selected');

    const { data: instructors, error } = await supabase
      .from('profiles')
      .select('id, name, email, role, instructor_preferences')
      .eq('gym_id', gymId)
      .in('role', ['instructor', 'owner'])
      .order('name');

    if (error) throw error;

    const result: any[] = [];

    for (const instructor of instructors || []) {
      const instructorData: any = {
        id: instructor.id,
        name: instructor.name,
        email: instructor.email,
        role: instructor.role,
        preferences: instructor.instructor_preferences || {}
      };

      if (params.include_schedule) {
        const { data: schedule } = await supabase
          .from('gym_schedules')
          .select('*')
          .eq('instructor_id', instructor.id)
          .eq('is_active', true)
          .order('day_of_week');

        instructorData.current_schedule = schedule || [];
      }

      result.push(instructorData);
    }

    return { instructors: result };
  }

  // New Tool: Assign instructor to class
  async function assignInstructorToClass(params: { schedule_id: string; instructor_id: string; assignment_type?: string }) {
    if (!user.value?.id) throw new Error('User not authenticated');

    // Check if user is owner/admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.value.id)
      .single();

    if (!profile || profile.role !== 'owner') {
      throw new Error('Only gym owners can assign instructors');
    }

    // Get instructor name
    const { data: instructor } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', params.instructor_id)
      .single();

    if (!instructor) throw new Error('Instructor not found');

    // Call the database function
    const { data, error } = await supabase.rpc('assign_instructor_to_class', {
      p_schedule_id: params.schedule_id,
      p_instructor_id: params.instructor_id,
      p_assignment_type: params.assignment_type || 'recurring_weekly',
      p_assigned_by: user.value.id,
      p_assignment_method: 'ai_suggested',
      p_ai_confidence: null
    });

    if (error) throw error;

    return {
      success: true,
      message: `Successfully assigned ${instructor.name} to the class`,
      instructor_name: instructor.name
    };
  }

  // New Tool: Assign instructor to specific date instance
  async function assignInstructorToDateInstance(gymId: string | null, params: { schedule_id: string; instructor_id: string; date: string }) {
    if (!gymId) throw new Error('No gym selected');
    if (!user.value?.id) throw new Error('User not authenticated');

    // Check if user is owner/admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.value.id)
      .single();

    if (!profile || profile.role !== 'owner') {
      throw new Error('Only gym owners can assign instructors');
    }

    // Get instructor name
    const { data: instructor } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', params.instructor_id)
      .single();

    if (!instructor) throw new Error('Instructor not found');

    // Get schedule details to include in the override
    const { data: schedule } = await supabase
      .from('gym_schedules')
      .select('*')
      .eq('id', params.schedule_id)
      .single();

    if (!schedule) throw new Error('Schedule not found');

    // Use the useClassInstances composable to create an override
    const { useClassInstances } = await import('./useClassInstances');
    const { overrideInstance } = useClassInstances();

    // Create an override for this specific date with the new instructor
    await overrideInstance(params.schedule_id, params.date, {
      instructor_id: params.instructor_id,
      gym_id: gymId,
      class_type: schedule.class_type,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      level: schedule.level,
      notes: schedule.notes,
      max_capacity: schedule.max_capacity,
      gym_location: schedule.gym_location,
      is_cancelled: false
    });

    return {
      success: true,
      message: `Successfully assigned ${instructor.name} to ${schedule.class_type} class on ${params.date}`,
      instructor_name: instructor.name,
      date: params.date,
      class_type: schedule.class_type
    };
  }

  // New Tool: Check schedule problems
  async function checkScheduleProblems(gymId: string | null, params: { date_range?: { start: string; end: string } }) {
    if (!gymId) throw new Error('No gym selected');
    if (!user.value?.id) throw new Error('User not authenticated');

    // Check user role - only instructors and owners can see detailed problems
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.value.id)
      .single();

    const isStaff = profile && (profile.role === 'instructor' || profile.role === 'owner');

    if (!isStaff) {
      // Students get a professional, reassuring response
      return {
        is_student: true,
        message: 'As a student, you don\'t have access to detailed scheduling information. All classes shown on the schedule are currently active unless marked as cancelled. If there are any changes or updates, the gym staff will post announcements in the gym chat. If you have specific questions about a class, please reach out to the gym staff directly.',
        problems: [],
        summary: { total: 0, critical: 0, warnings: 0, info: 0 }
      };
    }

    // Use the useScheduleProblems composable for staff
    const { useScheduleProblems } = await import('./useScheduleProblems');
    const { checkProblems: checkFn } = useScheduleProblems();
    
    const problems = await checkFn(gymId, params.date_range);

    return {
      is_student: false,
      problems,
      summary: {
        total: problems.length,
        critical: problems.filter(p => p.severity === 'critical').length,
        warnings: problems.filter(p => p.severity === 'warning').length,
        info: problems.filter(p => p.severity === 'info').length
      }
    };
  }

  // New Tool: Get instructor schedule
  async function getInstructorSchedule(gymId: string | null, params: { instructor_id: string; date_range?: { start: string; end: string } }) {
    if (!gymId) throw new Error('No gym selected');

    const { data: schedule, error } = await supabase
      .from('gym_schedules')
      .select('*')
      .eq('gym_id', gymId)
      .eq('instructor_id', params.instructor_id)
      .eq('is_active', true)
      .order('day_of_week, start_time');

    if (error) throw error;

    const { data: instructor } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', params.instructor_id)
      .single();

    return {
      instructor: instructor || { name: 'Unknown', email: '' },
      schedule: schedule || [],
      total_classes: schedule?.length || 0
    };
  }

  // New Tool: Send alert
  async function sendAlert(gymId: string | null, params: { message: string; target: string }) {
    if (!gymId) throw new Error('No gym selected');
    if (!user.value?.id) throw new Error('User not authenticated');

    // Check if user is owner/admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.value.id)
      .single();

    if (!profile || profile.role !== 'owner') {
      throw new Error('Only gym owners can send alerts');
    }

    // Determine target chat
    let chatId: string | null = null;

    if (params.target === 'gym_chat') {
      // Get gym's main chat
      const { data: gym } = await supabase
        .from('gyms')
        .select('gym_chat_id')
        .eq('id', gymId)
        .single();

      chatId = gym?.gym_chat_id || null;
    } else if (params.target === 'instructors') {
      // Find or create instructor chat
      // For now, use gym_chat (future: create dedicated instructor chat)
      const { data: gym } = await supabase
        .from('gyms')
        .select('gym_chat_id')
        .eq('id', gymId)
        .single();

      chatId = gym?.gym_chat_id || null;
    } else {
      // Assume it's a user_id for direct message
      chatId = params.target;
    }

    if (!chatId) {
      throw new Error('Could not determine target chat');
    }

    // Send message
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.value.id,
        content: `🚨 ${params.message}`,
        message_type: 'text'
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: 'Alert sent successfully',
      message_id: message?.id
    };
  }

  // New Tool: Cancel class with notification
  async function cancelClassWithNotification(
    gymId: string | null,
    params: { schedule_id: string; date?: string; reason: string; notify_members?: boolean }
  ) {
    if (!gymId) throw new Error('No gym selected');
    if (!user.value?.id) throw new Error('User not authenticated');

    // Check if user is owner/admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.value.id)
      .single();

    if (!profile || profile.role !== 'owner') {
      throw new Error('Only gym owners can cancel classes');
    }

    // Get class details
    const { data: schedule } = await supabase
      .from('gym_schedules')
      .select('*')
      .eq('id', params.schedule_id)
      .single();

    if (!schedule) throw new Error('Schedule not found');

    // Cancel the class
    const { error: cancelError } = await supabase
      .from('gym_schedules')
      .update({ is_cancelled: true })
      .eq('id', params.schedule_id);

    if (cancelError) throw cancelError;

    // Get affected RSVPs if notify_members is true
    let affectedMembers = 0;
    if (params.notify_members !== false) {
      const rsvpQuery = supabase
        .from('class_rsvps')
        .select('user_id, profiles(name)')
        .eq('schedule_id', params.schedule_id)
        .in('status', ['confirmed', 'waitlist']);

      if (params.date) {
        rsvpQuery.eq('rsvp_date', params.date);
      }

      const { data: rsvps } = await rsvpQuery;

      if (rsvps && rsvps.length > 0) {
        affectedMembers = rsvps.length;

        // Send notification to gym chat
        const { data: gym } = await supabase
          .from('gyms')
          .select('gym_chat_id')
          .eq('id', gymId)
          .single();

        if (gym?.gym_chat_id) {
          const cancelMessage = `🚨 Class Cancellation\n\nClass: ${schedule.class_type} - ${schedule.day_of_week} ${schedule.start_time}\nReason: ${params.reason}\n\n${affectedMembers} members affected.`;

          await supabase
            .from('messages')
            .insert({
              chat_id: gym.gym_chat_id,
              sender_id: user.value.id,
              content: cancelMessage,
              message_type: 'text'
            });
        }
      }
    }

    return {
      success: true,
      message: 'Class cancelled successfully',
      affected_members: affectedMembers,
      class_details: {
        class_type: schedule.class_type,
        day: schedule.day_of_week,
        time: schedule.start_time
      }
    };
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
          timestamp: new Date().toISOString(),
          suggested_actions: []
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
        console.log('🔍 DEBUG: Tool results being sent:', JSON.stringify(toolResultsArray, null, 2));
        
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

        console.log('✅ Got follow-up response:', followupData.message);
        console.log('🔍 Does AI want more tools?', followupData.tool_calls?.length > 0 ? 'YES' : 'NO');
        
        // Check if AI wants to make MORE tool calls (multi-step workflow)
        // SAFETY: Only allow ONE additional round of tool calls to prevent infinite loops
        if (followupData.tool_calls && followupData.tool_calls.length > 0) {
          console.log('🔁 AI requested more tools after first round:', followupData.tool_calls);
          
          // Execute the additional tools
          const additionalToolResults = [];
          for (const toolCall of followupData.tool_calls) {
            console.log(`🔨 Executing additional tool: ${toolCall.name}`, toolCall.parameters);
            const toolResult = await executeTool(toolCall.name, toolCall.parameters, gymId);
            console.log(`✅ Additional tool result for ${toolCall.name}:`, toolResult);
            
            additionalToolResults.push({
              tool: toolCall.name,
              result: toolResult
            });
          }
          
          // CRITICAL: Combine ALL tool results (original + additional) for the final call
          // The action extraction needs BOTH check_schedule_problems AND get_instructors results
          const allToolResults = [...toolResultsArray, ...additionalToolResults];
          console.log('🔗 Combining tool results for final call:', allToolResults.map(tr => tr.tool));
          
          // Call AI one more time with these results (FINAL CALL - no more tools allowed)
          console.log('🔄 Final AI call with ALL tool results...');
          const { data: finalData, error: finalError } = await supabase.functions.invoke('gym-ai-assistant', {
            body: {
              message: userMessage,
              conversationHistory: messages.value,
              conversationState: {
                preferences: conversationState.value.preferences,
                context: (conversationState.value.context || []).slice(-5)
              },
              gymId,
              userId: user.value?.id,
              tools: [], // IMPORTANT: No tools on final call to force a response
              userTimezone: timezone,
              toolResults: allToolResults // Pass ALL tool results, not just additional ones
            }
          });
          
          if (finalError) {
            console.error('❌ Final call error:', finalError);
            throw finalError;
          }
          
          console.log('✅ Got final AI response:', finalData.message);
          
          // Safeguard: If AI still didn't provide a proper response, use a fallback
          const hasValidResponse = finalData.message && 
                                    finalData.message.length > 30 && 
                                    !finalData.message.includes('Let me check that for you');
          
          if (!hasValidResponse) {
            console.warn('⚠️ AI failed to provide proper response after tool execution');
            console.log('📋 Suggested actions (fallback):', followupData.suggested_actions);
            // Use the follow-up response instead
            messages.value.push({
              role: 'assistant',
              content: followupData.message || 'I found the information you requested. Please let me know if you need anything else!',
              timestamp: new Date().toISOString(),
              suggested_actions: followupData.suggested_actions || []
            });
          } else {
            // Add the final response
            console.log('📋 Suggested actions (final):', finalData.suggested_actions);
            messages.value.push({
              role: 'assistant',
              content: finalData.message,
              timestamp: new Date().toISOString(),
              suggested_actions: finalData.suggested_actions || []
            });
          }
        } else {
          // No more tools needed, just add the response
          console.log('📋 Suggested actions received:', followupData.suggested_actions);
          console.log('🐛 DEBUG INFO from Edge Function:', followupData._debug);
          messages.value.push({
            role: 'assistant',
            content: followupData.message,
            timestamp: new Date().toISOString(),
            suggested_actions: followupData.suggested_actions || []
          });
        }
      } else {
        // No tool calls, just add response
        messages.value.push({
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          suggested_actions: data.suggested_actions || []
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
  async function initialize(gymId: string | null, options: { skipHistory?: boolean } = {}) {
    if (!gymId) return;
    if (!options.skipHistory) {
      await loadConversationHistory(gymId);
    }
    await loadUserPreferences();
  }

  return {
    messages,
    loading,
    error,
    conversationId, // Export for session management
    conversationState,
    tools,
    sendMessage,
    initialize,
    updateUserPreferences,
    saveConversation,
    executeTool // Export for AIInsightsWidget
  };
}
