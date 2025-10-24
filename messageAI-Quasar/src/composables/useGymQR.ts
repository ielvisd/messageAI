import { ref } from 'vue'
import { supabase } from '../boot/supabase'
import QRCode from 'qrcode'

export function useGymQR() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Generate QR code data URL for display
   */
  async function generateQRCodeURL(gymId: string): Promise<string> {
    try {
      loading.value = true
      error.value = null

      console.log('🔍 Fetching gym QR token for gymId:', gymId)

      // Get gym qr_token
      const { data: gym, error: gymError } = await supabase
        .from('gyms')
        .select('qr_token')
        .eq('id', gymId)
        .single()

      console.log('📦 Gym data:', { gym, gymError })

      if (gymError) {
        console.error('❌ Supabase error:', gymError)
        throw gymError
      }
      if (!gym?.qr_token) {
        console.error('❌ No QR token found for gym')
        throw new Error('Gym QR token not found - please regenerate or contact support')
      }

      console.log('✅ QR token found:', gym.qr_token)

      // Generate join URL
      const joinURL = `${window.location.origin}/#/join/${gym.qr_token}`
      console.log('🔗 Join URL:', joinURL)

      // Generate QR code as data URL
      console.log('🎨 Generating QR code image...')
      const qrDataURL = await QRCode.toDataURL(joinURL, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      console.log('✅ QR code generated successfully')
      return qrDataURL
    } catch (err) {
      console.error('❌ Error generating QR code:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get the join URL for a gym
   */
  async function getJoinURL(gymId: string): Promise<string> {
    try {
      const { data: gym, error: gymError } = await supabase
        .from('gyms')
        .select('qr_token')
        .eq('id', gymId)
        .single()

      if (gymError) throw gymError
      if (!gym?.qr_token) throw new Error('Gym QR token not found')

      return `${window.location.origin}/#/join/${gym.qr_token}`
    } catch (err) {
      console.error('Error getting join URL:', err)
      throw err
    }
  }

  /**
   * Regenerate QR token (invalidates old QR codes)
   */
  async function regenerateQRToken(gymId: string): Promise<string> {
    try {
      loading.value = true
      error.value = null

      // Generate new UUID token
      const newToken = crypto.randomUUID()

      // Update gym.qr_token
      const { data, error: updateError } = await supabase
        .from('gyms')
        .update({ qr_token: newToken })
        .eq('id', gymId)
        .select('qr_token')
        .single()

      if (updateError) throw updateError
      if (!data) throw new Error('Failed to regenerate QR token')

      return data.qr_token
    } catch (err) {
      console.error('Error regenerating QR token:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Join gym via scanned QR token
   */
  async function joinGymViaQR(token: string) {
    try {
      loading.value = true
      error.value = null

      // Use secure RPC that relies on auth.uid() and handles full flow
      const { data, error: rpcError } = await supabase.rpc('join_gym_by_token', {
        p_token: token
      })

      if (rpcError) throw rpcError
      if (!data) throw new Error('Failed to join gym')

      // data is JSONB with { success, requiresApproval, gymName }
      return data as unknown as { success: boolean; requiresApproval: boolean; gymName: string }
    } catch (err) {
      console.error('Error joining gym via QR:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Add user to gym (helper function)
   */
  async function addUserToGym(gymId: string, userId: string, gymChatId: string | null) {
    // No longer used by QR join; kept for backward compatibility in other flows
    const { error: memberError } = await supabase
      .from('chat_members')
      .insert({ chat_id: gymChatId, user_id: userId })
    if (memberError && memberError.code !== '23505') throw memberError
  }

  /**
   * Get pending join requests (for gym owner)
   */
  async function getPendingRequests(gymId: string) {
    try {
      loading.value = true
      error.value = null

      const { data, error: requestError } = await supabase
        .from('gym_join_requests')
        .select(`
          id,
          gym_id,
          user_id,
          status,
          joined_via,
          created_at,
          profiles:user_id (
            id,
            name,
            email,
            avatar_url
          )
        `)
        .eq('gym_id', gymId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (requestError) throw requestError

      return data || []
    } catch (err) {
      console.error('Error getting pending requests:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Approve or reject join request
   */
  async function handleJoinRequest(requestId: string, approve: boolean) {
    try {
      loading.value = true
      error.value = null

      // Get request details
      const { data: request, error: fetchError } = await supabase
        .from('gym_join_requests')
        .select('gym_id, user_id, gyms(gym_chat_id)')
        .eq('id', requestId)
        .single()

      if (fetchError) throw fetchError
      if (!request) throw new Error('Join request not found')

      if (approve) {
        // Add user to gym
        await addUserToGym(request.gym_id, request.user_id, (request.gyms as any)?.gym_chat_id)

        // Update request status to 'approved'
        const { error: updateError } = await supabase
          .from('gym_join_requests')
          .update({ status: 'approved' })
          .eq('id', requestId)

        if (updateError) throw updateError
      } else {
        // Update request status to 'rejected'
        const { error: updateError } = await supabase
          .from('gym_join_requests')
          .update({ status: 'rejected' })
          .eq('id', requestId)

        if (updateError) throw updateError
      }

      return { success: true }
    } catch (err) {
      console.error('Error handling join request:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get gym info by QR token
   */
  async function getGymByToken(token: string) {
    try {
      const { data, error: gymError } = await supabase
        .from('gyms')
        .select('id, name, require_approval')
        .eq('qr_token', token)
        .single()

      if (gymError) throw gymError
      return data
    } catch (err) {
      console.error('Error getting gym by token:', err)
      throw err
    }
  }

  return {
    loading,
    error,
    generateQRCodeURL,
    getJoinURL,
    regenerateQRToken,
    joinGymViaQR,
    getPendingRequests,
    handleJoinRequest,
    getGymByToken
  }
}

