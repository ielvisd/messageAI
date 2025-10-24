import { ref } from 'vue';
import { supabase } from '../boot/supabase';
import type { Database } from '../types/supabase';

type ClassRSVP = Database['public']['Tables']['class_rsvps']['Row'];

export function useRSVP(userId?: string) {
  const rsvps = ref<ClassRSVP[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchUserRSVPs(uid: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from('class_rsvps')
        .select('*, gym_schedules(*)')
        .eq('user_id', uid)
        .gte('rsvp_date', new Date().toISOString().split('T')[0]) // Future RSVPs
        .order('rsvp_date', { ascending: true });

      if (fetchError) throw fetchError;
      rsvps.value = data || [];
    } catch (err) {
      console.error('Error fetching RSVPs:', err);
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function rsvpToClass(scheduleId: string, rsvpDate: string, uid: string) {
    loading.value = true;
    error.value = null;

    try {
      // First, check capacity
      const { data: schedule } = await supabase
        .from('gym_schedules')
        .select('max_capacity, current_rsvps')
        .eq('id', scheduleId)
        .single();

      const status = schedule && schedule.max_capacity && schedule.current_rsvps >= schedule.max_capacity
        ? 'waitlist'
        : 'confirmed';

      const { data, error: insertError } = await supabase
        .from('class_rsvps')
        .insert({
          schedule_id: scheduleId,
          user_id: uid,
          rsvp_date: rsvpDate,
          status
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to local array
      if (data) {
        rsvps.value.push(data);
      }

      return { data, error: null, status };
    } catch (err) {
      console.error('Error creating RSVP:', err);
      error.value = (err as Error).message;
      return { data: null, error: err as Error, status: null };
    } finally {
      loading.value = false;
    }
  }

  async function cancelRSVP(rsvpId: string) {
    loading.value = true;
    error.value = null;

    try {
      const { error: deleteError } = await supabase
        .from('class_rsvps')
        .delete()
        .eq('id', rsvpId);

      if (deleteError) throw deleteError;

      // Remove from local array
      rsvps.value = rsvps.value.filter((r: ClassRSVP) => r.id !== rsvpId);

      return { error: null };
    } catch (err) {
      console.error('Error canceling RSVP:', err);
      error.value = (err as Error).message;
      return { error: err as Error };
    } finally {
      loading.value = false;
    }
  }

  async function checkRSVPStatus(scheduleId: string, rsvpDate: string, uid: string) {
    try {
      const { data } = await supabase
        .from('class_rsvps')
        .select('*')
        .eq('schedule_id', scheduleId)
        .eq('user_id', uid)
        .eq('rsvp_date', rsvpDate)
        .single();

      return data;
    } catch {
      return null;
    }
  }

  // Initialize if userId provided
  if (userId) {
    void fetchUserRSVPs(userId);
  }

  return {
    rsvps,
    loading,
    error,
    fetchUserRSVPs,
    rsvpToClass,
    cancelRSVP,
    checkRSVPStatus
  };
}

