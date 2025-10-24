import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../boot/supabase'
import { user, profile, loadProfile } from '../state/auth'

export function useGymSwitcher() {
  const router = useRouter()
  const ownedGyms = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const currentGymId = computed(() => (profile.value as any)?.gym_id)
  const ownedGymIds = computed(() => (profile.value as any)?.owned_gym_ids || [])

  /**
   * Load all gyms owned by current user
   */
  async function loadOwnedGyms() {
    try {
      loading.value = true
      error.value = null

      const gymIds = ownedGymIds.value

      if (!gymIds || gymIds.length === 0) {
        ownedGyms.value = []
        return []
      }

      // Fetch gyms where id IN gymIds
      const { data, error: fetchError } = await supabase
        .from('gyms')
        .select(`
          id,
          name,
          locations,
          created_at,
          qr_token
        `)
        .in('id', gymIds)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Get member counts for each gym
      if (data) {
        const gymsWithCounts = await Promise.all(
          data.map(async (gym) => {
            const { count } = await supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .eq('gym_id', gym.id)

            return {
              ...gym,
              members_count: count || 0
            }
          })
        )

        ownedGyms.value = gymsWithCounts
        return gymsWithCounts
      }

      ownedGyms.value = []
      return []
    } catch (err) {
      console.error('Error loading owned gyms:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Switch active gym
   */
  async function switchGym(gymId: string) {
    try {
      loading.value = true
      error.value = null

      if (!user.value?.id) {
        throw new Error('User not authenticated')
      }

      // Verify user owns this gym
      if (!ownedGymIds.value.includes(gymId)) {
        throw new Error('You do not own this gym')
      }

      // Update profile.gym_id to gymId
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ gym_id: gymId })
        .eq('id', user.value.id)

      if (updateError) throw updateError

      // Reload profile to get updated data
      await loadProfile()

      // Redirect to dashboard
      void router.push('/dashboard')

      return { success: true }
    } catch (err) {
      console.error('Error switching gym:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Create new gym (owner can own multiple)
   */
  async function createNewGym(gymData: {
    name: string
    locations: Array<{ name: string; address: string }>
    settings?: Record<string, unknown>
  }) {
    try {
      loading.value = true
      error.value = null

      if (!user.value?.id) {
        throw new Error('User not authenticated')
      }

      // Create gym
      const { data: gym, error: gymError } = await supabase
        .from('gyms')
        .insert({
          name: gymData.name,
          owner_id: user.value.id,
          locations: gymData.locations,
          settings: gymData.settings || {
            studentsCanMessage: false,
            studentsCanCreateGroups: false,
            instructorsCanCreateClasses: true,
            instructorsEditOwnOnly: true,
            aiEnabled: true,
            aiAutoRespond: true
          }
        })
        .select('id, name, qr_token')
        .single()

      if (gymError) throw gymError
      if (!gym) throw new Error('Failed to create gym')

      // Add gym.id to profile.owned_gym_ids array
      const currentOwnedGymIds = ownedGymIds.value
      const updatedOwnedGymIds = [...currentOwnedGymIds, gym.id]

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          gym_id: gym.id, // Set as current active gym
          owned_gym_ids: updatedOwnedGymIds
        })
        .eq('id', user.value.id)

      if (profileError) throw profileError

      // Reload profile
      await loadProfile()

      // Reload owned gyms list
      await loadOwnedGyms()

      return { success: true, gym }
    } catch (err) {
      console.error('Error creating new gym:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get gym details by ID
   */
  async function getGymDetails(gymId: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', gymId)
        .single()

      if (fetchError) throw fetchError
      return data
    } catch (err) {
      console.error('Error getting gym details:', err)
      throw err
    }
  }

  return {
    ownedGyms,
    currentGymId,
    ownedGymIds,
    loading,
    error,
    loadOwnedGyms,
    switchGym,
    createNewGym,
    getGymDetails
  }
}

