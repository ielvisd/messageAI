import { ref } from 'vue'
import { supabase } from 'src/boot/supabase'
import { user } from 'src/state/auth'

export interface Instructor {
  id: string
  name: string
  email: string
  instructor_preferences?: {
    prefers_gi?: boolean
    prefers_nogi?: boolean
    can_teach_kids?: boolean
    can_teach_fundamentals?: boolean
    can_teach_advanced?: boolean
    can_teach_competition?: boolean
    available_for_private_lessons?: boolean
    private_lesson_rate?: number
    specialties?: string[]
    certifications?: string[]
  }
}

export function useInstructorAssignment() {
  const loading = ref(false)
  const instructors = ref<Instructor[]>([])

  /**
   * Get all instructors for the current user's gym
   */
  async function getGymInstructors(gymId: string): Promise<Instructor[]> {
    if (!gymId) return []
    
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, instructor_preferences')
        .eq('gym_id', gymId)
        .eq('role', 'instructor')
        .order('name')

      if (error) {
        console.error('Error fetching instructors:', error)
        return []
      }

      instructors.value = data || []
      return data || []
    } finally {
      loading.value = false
    }
  }

  /**
   * Assign an instructor to a class schedule
   */
  async function assignInstructor(
    scheduleId: string,
    instructorId: string,
    assignmentType: 'one_time' | 'recurring_weekly' = 'recurring_weekly'
  ): Promise<boolean> {
    if (!scheduleId || !instructorId) return false

    loading.value = true
    try {
      // Call the database function
      const { data, error } = await supabase.rpc('assign_instructor_to_class', {
        p_schedule_id: scheduleId,
        p_instructor_id: instructorId,
        p_assignment_type: assignmentType,
        p_assigned_by: user.value?.id,
        p_assignment_method: 'manual',
        p_ai_confidence: null
      })

      if (error) {
        console.error('Error assigning instructor:', error)
        return false
      }

      return true
    } finally {
      loading.value = false
    }
  }

  /**
   * Unassign instructor from a class schedule
   */
  async function unassignInstructor(scheduleId: string): Promise<boolean> {
    if (!scheduleId) return false

    loading.value = true
    try {
      const { error } = await supabase
        .from('gym_schedules')
        .update({
          instructor_id: null,
          instructor_name: null,
          assignment_type: null
        })
        .eq('id', scheduleId)

      if (error) {
        console.error('Error unassigning instructor:', error)
        return false
      }

      return true
    } finally {
      loading.value = false
    }
  }

  /**
   * Get instructor details by ID
   */
  async function getInstructor(instructorId: string): Promise<Instructor | null> {
    if (!instructorId) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, instructor_preferences')
      .eq('id', instructorId)
      .eq('role', 'instructor')
      .single()

    if (error) {
      console.error('Error fetching instructor:', error)
      return null
    }

    return data
  }

  return {
    loading,
    instructors,
    getGymInstructors,
    assignInstructor,
    unassignInstructor,
    getInstructor
  }
}

