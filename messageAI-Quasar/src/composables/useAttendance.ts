import { ref } from 'vue'
import { supabase } from '../boot/supabase'
import QRCode from 'qrcode'

export function useAttendance() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Generate QR code for class check-in
   */
  async function generateClassQR(scheduleId: string, validDate?: Date): Promise<{
    qrDataURL: string
    qrToken: string
    expiresAt: string
    classDetails: {
      classType: string
      startTime: string
      endTime: string
    }
  }> {
    try {
      loading.value = true
      error.value = null

      console.log('🔍 Generating class QR for scheduleId:', scheduleId)

      // Call database function to generate/get QR token
      const { data, error: rpcError } = await supabase.rpc('generate_class_qr', {
        p_schedule_id: scheduleId,
        p_valid_date: validDate ? validDate.toISOString().split('T')[0] : undefined
      })

      if (rpcError) {
        console.error('❌ RPC error:', rpcError)
        throw rpcError
      }
      if (!data) {
        throw new Error('Failed to generate QR code')
      }

      console.log('✅ QR token generated:', data)

      // Create check-in URL
      const checkInURL = `${window.location.origin}/#/check-in/${data.qr_token}`
      console.log('🔗 Check-in URL:', checkInURL)

      // Generate QR code as data URL (reusing pattern from useGymQR)
      const qrDataURL = await QRCode.toDataURL(checkInURL, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      console.log('✅ QR code image generated')

      return {
        qrDataURL,
        qrToken: data.qr_token,
        expiresAt: data.expires_at,
        classDetails: {
          classType: data.class_type,
          startTime: data.start_time,
          endTime: data.end_time
        }
      }
    } catch (err) {
      console.error('❌ Error generating class QR:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Check in to class via QR token
   */
  async function checkInViaQR(qrToken: string): Promise<{
    success: boolean
    classType: string
    startTime: string
    endTime: string
    level?: string
    instructorName?: string
    checkInTime: string
  }> {
    try {
      loading.value = true
      error.value = null

      console.log('📱 Checking in with QR token:', qrToken)

      const { data, error: rpcError } = await supabase.rpc('check_in_via_qr', {
        p_qr_token: qrToken
      })

      if (rpcError) {
        console.error('❌ Check-in error:', rpcError)
        throw rpcError
      }
      if (!data) {
        throw new Error('Check-in failed')
      }

      console.log('✅ Check-in successful:', data)

      return data as any
    } catch (err) {
      console.error('❌ Error checking in:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Manually mark attendance (instructor/owner)
   */
  async function manualCheckIn(
    scheduleId: string,
    userId: string,
    checkInDate?: Date
  ): Promise<{ success: boolean; message: string }> {
    try {
      loading.value = true
      error.value = null

      const { data, error: rpcError } = await supabase.rpc('manual_check_in', {
        p_schedule_id: scheduleId,
        p_user_id: userId,
        p_check_in_date: checkInDate ? checkInDate.toISOString().split('T')[0] : undefined
      })

      if (rpcError) throw rpcError
      return data as any
    } catch (err) {
      console.error('Error marking attendance:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get attendance list for a class
   */
  async function getClassAttendance(
    scheduleId: string,
    date?: Date
  ): Promise<Array<{
    userId: string
    userName: string
    avatarUrl: string | null
    checkInTime: string
    checkInMethod: 'qr_code' | 'manual'
    currentBelt: string
    currentStripes: number
  }>> {
    try {
      loading.value = true
      error.value = null

      const { data, error: rpcError } = await supabase.rpc('get_class_attendance_list', {
        p_schedule_id: scheduleId,
        p_date: date ? date.toISOString().split('T')[0] : undefined
      })

      if (rpcError) throw rpcError
      return (data || []) as any
    } catch (err) {
      console.error('Error getting class attendance:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get student's attendance history
   */
  async function getMyAttendance(
    gymId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('class_attendance')
        .select(`
          *,
          gym_schedules (
            class_type,
            day_of_week,
            start_time,
            end_time,
            level,
            instructor_name
          )
        `)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('gym_id', gymId)
        .gte('check_in_time', startDate ? startDate.toISOString() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('check_in_time', endDate ? endDate.toISOString() : new Date().toISOString())
        .order('check_in_time', { ascending: false })

      if (fetchError) throw fetchError
      return data || []
    } catch (err) {
      console.error('Error getting attendance:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get attendance statistics
   */
  async function getAttendanceStats(
    userId: string,
    gymId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalClasses: number
    totalHours: number
    giClasses: number
    nogiClasses: number
    currentStreak: number
    periodStart: string
    periodEnd: string
  }> {
    try {
      loading.value = true
      error.value = null

      const { data, error: rpcError } = await supabase.rpc('get_student_attendance_stats', {
        p_user_id: userId,
        p_gym_id: gymId,
        p_start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
        p_end_date: endDate ? endDate.toISOString().split('T')[0] : undefined
      })

      if (rpcError) throw rpcError
      return data as any
    } catch (err) {
      console.error('Error getting attendance stats:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get gym-wide attendance report (owner only)
   */
  async function getGymAttendanceReport(
    gymId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      loading.value = true
      error.value = null

      const { data, error: rpcError } = await supabase.rpc('get_gym_attendance_report', {
        p_gym_id: gymId,
        p_start_date: startDate ? startDate.toISOString().split('T')[0] : undefined,
        p_end_date: endDate ? endDate.toISOString().split('T')[0] : undefined
      })

      if (rpcError) throw rpcError
      return (data || []) as any
    } catch (err) {
      console.error('Error getting gym report:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    generateClassQR,
    checkInViaQR,
    manualCheckIn,
    getClassAttendance,
    getMyAttendance,
    getAttendanceStats,
    getGymAttendanceReport
  }
}

