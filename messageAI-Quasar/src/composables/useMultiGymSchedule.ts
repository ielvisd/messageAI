import { ref, computed, watch } from 'vue'
import { supabase } from '../boot/supabase'
import { profile } from '../state/auth'

export interface ScheduleClass {
  id: string
  gym_id: string
  gym_name?: string
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
}

export interface Gym {
  id: string
  name: string
  locations?: string[]
}

const schedules = ref<ScheduleClass[]>([])
const gyms = ref<Gym[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Selected gym IDs for filtering (default to all)
const selectedGymIds = ref<string[]>([])

// Computed filtered schedules based on selected gyms
const filteredSchedules = computed(() => {
  if (selectedGymIds.value.length === 0) {
    return schedules.value
  }
  return schedules.value.filter(schedule => 
    selectedGymIds.value.includes(schedule.gym_id)
  )
})

/**
 * Fetch all gyms that the user is a member of
 */
async function fetchUserGyms(): Promise<Gym[]> {
  try {
    if (!profile.value) {
      throw new Error('No profile loaded')
    }

    // Get gym_ids array from profile (multi-gym membership)
    const gymIds = (profile.value as any).gym_ids || []
    
    console.log('🏋️ fetchUserGyms - profile.gym_ids:', gymIds)
    console.log('🏋️ fetchUserGyms - profile.gym_id:', profile.value.gym_id)
    
    // Also include primary gym_id if it exists and not in gym_ids
    if (profile.value.gym_id && !gymIds.includes(profile.value.gym_id)) {
      gymIds.push(profile.value.gym_id)
      console.log('🏋️ Added primary gym_id to gymIds:', gymIds)
    }

    if (gymIds.length === 0) {
      console.warn('⚠️ No gym IDs found in profile')
      return []
    }

    console.log('🏋️ Fetching gyms for IDs:', gymIds)
    const { data, error: gymError } = await supabase
      .from('gyms')
      .select('id, name, locations')
      .in('id', gymIds)

    if (gymError) throw gymError
    
    console.log('🏋️ Fetched gyms:', data)

    return data || []
  } catch (err) {
    console.error('Error fetching user gyms:', err)
    throw err
  }
}

/**
 * Fetch schedules for all user's gyms
 * @param options.gymIds - Optional: fetch schedules for specific gyms only
 * @param options.showInstructorNames - Whether to fetch and display instructor names
 */
export async function fetchSchedules(options?: {
  gymIds?: string[]
  showInstructorNames?: boolean
}) {
  try {
    loading.value = true
    error.value = null

    console.log('🔄 fetchSchedules called with options:', options)

    // First, fetch user's gyms
    const userGyms = await fetchUserGyms()
    gyms.value = userGyms

    console.log('🔄 fetchSchedules - userGyms:', userGyms)

    // If no gyms, nothing to fetch
    if (userGyms.length === 0) {
      console.warn('⚠️ No user gyms found, returning empty schedules')
      schedules.value = []
      return
    }

    // Determine which gym IDs to fetch schedules for
    const targetGymIds = options?.gymIds || userGyms.map(g => g.id)

    console.log('🔄 fetchSchedules - targetGymIds:', targetGymIds)

    // Initialize selected gyms (all by default)
    if (selectedGymIds.value.length === 0) {
      selectedGymIds.value = targetGymIds
      console.log('🔄 fetchSchedules - initialized selectedGymIds:', selectedGymIds.value)
    }

    // Fetch schedules from gym_schedules table
    const query = supabase
      .from('gym_schedules')
      .select('*')
      .in('gym_id', targetGymIds)

    const { data: scheduleData, error: scheduleError } = await query

    if (scheduleError) throw scheduleError

    console.log('🔄 fetchSchedules - raw scheduleData count:', scheduleData?.length || 0)

    // Map schedules and add gym names
    let mappedSchedules: ScheduleClass[] = (scheduleData || []).map(schedule => ({
      ...schedule,
      gym_name: userGyms.find(g => g.id === schedule.gym_id)?.name
    }))

    // Optionally fetch instructor names
    if (options?.showInstructorNames) {
      const instructorIds = mappedSchedules
        .filter(s => s.instructor_id)
        .map(s => s.instructor_id!)
      
      if (instructorIds.length > 0) {
        const { data: instructors } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', instructorIds)

        const instructorMap = new Map(
          (instructors || []).map(i => [i.id, i.name])
        )

        mappedSchedules = mappedSchedules.map(schedule => ({
          ...schedule,
          instructor_name: schedule.instructor_id 
            ? instructorMap.get(schedule.instructor_id) 
            : undefined
        }))
      }
    }

    schedules.value = mappedSchedules
  } catch (err) {
    console.error('Error fetching schedules:', err)
    error.value = (err as Error).message
    throw err
  } finally {
    loading.value = false
  }
}

/**
 * Toggle a gym in the filter selection
 */
function toggleGymFilter(gymId: string) {
  console.log('🔀 toggleGymFilter called for gym:', gymId)
  console.log('🔀 Current selectedGymIds:', selectedGymIds.value)
  
  const index = selectedGymIds.value.indexOf(gymId)
  if (index > -1) {
    // Remove from selection
    selectedGymIds.value = selectedGymIds.value.filter(id => id !== gymId)
    console.log('🔀 Removed gym, new selectedGymIds:', selectedGymIds.value)
  } else {
    // Add to selection
    selectedGymIds.value = [...selectedGymIds.value, gymId]
    console.log('🔀 Added gym, new selectedGymIds:', selectedGymIds.value)
  }
}

/**
 * Select all gyms
 */
function selectAllGyms() {
  selectedGymIds.value = gyms.value.map(g => g.id)
}

/**
 * Clear all gym selections
 */
function clearGymFilters() {
  selectedGymIds.value = []
}

/**
 * Check if a gym is selected
 */
function isGymSelected(gymId: string): boolean {
  return selectedGymIds.value.includes(gymId)
}

export function useSchedule() {
  return {
    // State
    schedules: computed(() => schedules.value),
    filteredSchedules,
    gyms: computed(() => gyms.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    selectedGymIds: computed(() => selectedGymIds.value),
    
    // Actions
    fetchSchedules,
    toggleGymFilter,
    selectAllGyms,
    clearGymFilters,
    isGymSelected
  }
}
