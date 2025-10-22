import { ref } from 'vue'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'

export interface ScheduleQuery {
  query: string
  answer?: string
  schedules?: GymSchedule[]
}

export interface GymSchedule {
  id: string
  gym_location: string
  class_type: string
  day_of_week: string
  start_time: string
  end_time: string
  level?: string
  instructor_name?: string
  max_capacity?: number
  is_active: boolean
  notes?: string
}

export interface MessageCategory {
  category: string
  priority: 'high' | 'normal' | 'low'
  suggested_reply?: string
}

export interface QuickReply {
  text: string
  category?: string
}

export function useGymAI() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  /**
   * Query gym schedules with natural language
   */
  const querySchedule = async (query: string): Promise<string | null> => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('gym-ai-assistant', {
        body: { action: 'query_schedule', data: { query, user_id: user.value?.id } }
      })
      
      if (fnError) throw fnError
      
      return data.answer
    } catch (err) {
      console.error('Error querying schedule:', err)
      error.value = err instanceof Error ? err.message : 'Failed to query schedule'
      return null
    } finally {
      loading.value = false
    }
  }
  
  /**
   * Categorize a message (for owner triage)
   */
  const categorizeMessage = async (messageId: string, content: string): Promise<MessageCategory | null> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('gym-ai-assistant', {
        body: { action: 'categorize_message', data: { message_id: messageId, content } }
      })
      
      if (fnError) throw fnError
      
      return data as MessageCategory
    } catch (err) {
      console.error('Error categorizing message:', err)
      return null
    }
  }
  
  /**
   * Generate quick reply suggestions
   */
  const generateReplies = async (messageContent: string, category?: string): Promise<string[]> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('gym-ai-assistant', {
        body: { action: 'generate_reply', data: { message_content: messageContent, category } }
      })
      
      if (fnError) throw fnError
      
      return data.replies || []
    } catch (err) {
      console.error('Error generating replies:', err)
      return []
    }
  }
  
  /**
   * Semantic search across content
   */
  const semanticSearch = async (query: string, limit = 5): Promise<unknown[]> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('gym-ai-assistant', {
        body: { action: 'search_semantic', data: { query, limit } }
      })
      
      if (fnError) throw fnError
      
      return data.results || []
    } catch (err) {
      console.error('Error in semantic search:', err)
      return []
    }
  }
  
  return {
    loading,
    error,
    querySchedule,
    categorizeMessage,
    generateReplies,
    semanticSearch
  }
}

