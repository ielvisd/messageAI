import { ref } from 'vue'
import { supabase } from '../boot/supabase'

export type BeltColor = 'white' | 'blue' | 'purple' | 'brown' | 'black'

export interface BeltPromotion {
  id: string
  userId: string
  gymId: string
  beltColor: BeltColor
  stripes: number
  awardedBy: string
  awardedDate: string
  notes: string | null
  createdAt: string
}

export function useBeltProgression() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Get user's current belt
   */
  async function getCurrentBelt(userId: string): Promise<{
    beltColor: BeltColor
    stripes: number
  }> {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('current_belt, current_stripes')
        .eq('id', userId)
        .maybeSingle()  // Use maybeSingle() instead of single() to handle no rows

      // If no data or error, return default white belt
      if (fetchError || !data) {
        console.warn('No belt data found, defaulting to white belt:', fetchError)
        return {
          beltColor: 'white',
          stripes: 0
        }
      }

      return {
        beltColor: (data.current_belt || 'white') as BeltColor,
        stripes: data.current_stripes || 0
      }
    } catch (err) {
      console.error('Error getting current belt:', err)
      error.value = (err as Error).message
      // Return default instead of throwing
      return {
        beltColor: 'white',
        stripes: 0
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Get belt history for a user
   */
  async function getBeltHistory(userId: string): Promise<Array<BeltPromotion & { awardedByName: string }>> {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('belt_progression')
        .select(`
          *,
          profiles!awarded_by (
            name
          )
        `)
        .eq('user_id', userId)
        .order('awarded_date', { ascending: false })

      if (fetchError) throw fetchError

      return (data || []).map((promo: any) => ({
        ...promo,
        awardedByName: promo.profiles?.name || 'Unknown'
      })) as any
    } catch (err) {
      console.error('Error getting belt history:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Award a belt promotion
   */
  async function awardBelt(
    userId: string,
    gymId: string,
    beltColor: BeltColor,
    stripes: number,
    notes?: string
  ): Promise<{ success: boolean; beltColor: BeltColor; stripes: number }> {
    try {
      loading.value = true
      error.value = null

      const { data, error: rpcError } = await supabase.rpc('record_belt_promotion', {
        p_user_id: userId,
        p_belt_color: beltColor,
        p_stripes: stripes,
        p_gym_id: gymId,
        p_notes: notes || null
      })

      if (rpcError) throw rpcError
      return data as any
    } catch (err) {
      console.error('Error awarding belt:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get promotion statistics for a gym
   */
  async function getPromotionStats(gymId: string): Promise<{
    totalPromotions: number
    byBelt: Record<BeltColor, number>
    recentPromotions: Array<BeltPromotion & { userName: string }>
  }> {
    try {
      loading.value = true
      error.value = null

      // Get all promotions for gym
      const { data, error: fetchError } = await supabase
        .from('belt_progression')
        .select(`
          *,
          profiles!user_id (
            name
          )
        `)
        .eq('gym_id', gymId)
        .order('awarded_date', { ascending: false })

      if (fetchError) throw fetchError

      const promotions = data || []

      // Calculate stats
      const byBelt: Record<string, number> = {
        white: 0,
        blue: 0,
        purple: 0,
        brown: 0,
        black: 0
      }

      promotions.forEach((promo: any) => {
        byBelt[promo.belt_color] = (byBelt[promo.belt_color] || 0) + 1
      })

      return {
        totalPromotions: promotions.length,
        byBelt: byBelt as any,
        recentPromotions: promotions.slice(0, 10).map((promo: any) => ({
          ...promo,
          userName: promo.profiles?.name || 'Unknown'
        })) as any
      }
    } catch (err) {
      console.error('Error getting promotion stats:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get belt display info
   */
  function getBeltDisplay(beltColor: BeltColor, stripes: number): {
    color: string
    label: string
    icon: string
  } {
    const beltInfo: Record<BeltColor, { color: string; label: string }> = {
      white: { color: '#FFFFFF', label: 'White Belt' },
      blue: { color: '#2196F3', label: 'Blue Belt' },
      purple: { color: '#9C27B0', label: 'Purple Belt' },
      brown: { color: '#795548', label: 'Brown Belt' },
      black: { color: '#000000', label: 'Black Belt' }
    }

    const info = beltInfo[beltColor]
    const stripeText = stripes > 0 ? ` (${stripes} stripe${stripes > 1 ? 's' : ''})` : ''

    return {
      color: info.color,
      label: `${info.label}${stripeText}`,
      icon: 'military_tech'
    }
  }

  /**
   * Calculate days at current belt
   */
  async function getDaysAtBelt(userId: string): Promise<number> {
    try {
      const { data, error: fetchError } = await supabase
        .from('belt_progression')
        .select('awarded_date')
        .eq('user_id', userId)
        .order('awarded_date', { ascending: false })
        .limit(1)
        .maybeSingle()  // Use maybeSingle() to handle no rows

      if (fetchError || !data) {
        // No promotion history, assume white belt from account creation
        const { data: profile } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('id', userId)
          .maybeSingle()  // Use maybeSingle() here too

        if (profile) {
          const createdDate = new Date(profile.created_at)
          const today = new Date()
          return Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        }
        return 0
      }

      const promotionDate = new Date(data.awarded_date)
      const today = new Date()
      return Math.floor((today.getTime() - promotionDate.getTime()) / (1000 * 60 * 60 * 24))
    } catch (err) {
      console.error('Error calculating days at belt:', err)
      return 0
    }
  }

  return {
    loading,
    error,
    getCurrentBelt,
    getBeltHistory,
    awardBelt,
    getPromotionStats,
    getBeltDisplay,
    getDaysAtBelt
  }
}

