// Legacy useSchedule composable for ScheduleCalendar and ScheduleEditorDialog
// This is the old implementation for single-gym schedule management
import { ref, computed } from 'vue'
import { supabase } from '../boot/supabase'

interface Schedule {
  id: string
  gym_id: string
  day_of_week: string
  start_time: string
  end_time: string
  class_type: string
  age_group: string
  skill_level: string
  instructor_id?: string
  instructor_name?: string
  max_capacity?: number
  recurring: boolean
  current_rsvps?: number
  is_cancelled?: boolean
  level?: string
  notes?: string
  is_active?: boolean
}

export function useSchedule() {
  const schedules = ref<Schedule[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const schedulesByDay = computed(() => {
    const byDay: Record<string, Schedule[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    }
    
    schedules.value.forEach(schedule => {
      const day = schedule?.day_of_week
      if (day && day in byDay) {
        byDay[day]?.push(schedule)
      }
    })
    
    return byDay
  })

  async function fetchSchedules(filters?: { gym_id?: string; instructor_id?: string }) {
    try {
      loading.value = true
      error.value = null

      let query = supabase
        .from('gym_schedules')
        .select('*')
        .order('start_time', { ascending: true })

      if (filters?.gym_id) {
        query = query.eq('gym_id', filters.gym_id)
      }
      if (filters?.instructor_id) {
        query = query.eq('instructor_id', filters.instructor_id)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      schedules.value = data || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch schedules'
      console.error('Error fetching schedules:', err)
    } finally {
      loading.value = false
    }
  }

  async function createSchedule(schedule: Omit<Schedule, 'id'>) {
    try {
      loading.value = true
      error.value = null

      const { data, error: createError } = await supabase
        .from('gym_schedules')
        .insert(schedule)
        .select()
        .single()

      if (createError) throw createError
      
      schedules.value.push(data)
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create schedule'
      console.error('Error creating schedule:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateSchedule(id: string, updates: Partial<Schedule>) {
    try {
      loading.value = true
      error.value = null

      const { data, error: updateError } = await supabase
        .from('gym_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const index = schedules.value.findIndex(s => s.id === id)
      if (index !== -1) {
        schedules.value[index] = data
      }
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update schedule'
      console.error('Error updating schedule:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteSchedule(id: string) {
    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('gym_schedules')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      schedules.value = schedules.value.filter(s => s.id !== id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete schedule'
      console.error('Error deleting schedule:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function cancelSchedule(id: string) {
    try {
      loading.value = true
      error.value = null

      const { data, error: cancelError } = await supabase
        .from('gym_schedules')
        .update({ is_cancelled: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (cancelError) throw cancelError

      const index = schedules.value.findIndex(s => s.id === id)
      if (index !== -1) {
        schedules.value[index] = data
      }
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to cancel schedule'
      console.error('Error cancelling schedule:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function uncancelSchedule(id: string) {
    try {
      loading.value = true
      error.value = null

      const { data, error: uncancelError } = await supabase
        .from('gym_schedules')
        .update({ is_cancelled: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (uncancelError) throw uncancelError

      const index = schedules.value.findIndex(s => s.id === id)
      if (index !== -1) {
        schedules.value[index] = data
      }
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to restore schedule'
      console.error('Error restoring schedule:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    schedules: computed(() => schedules.value),
    schedulesByDay,
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    cancelSchedule,
    uncancelSchedule
  }
}
