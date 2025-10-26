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

  async function rsvpToClass(
    scheduleId: string | null, 
    rsvpDate: string, 
    uid: string,
    instanceId?: string | null
  ) {
    loading.value = true;
    error.value = null;

    try {
      let maxCapacity: number | null = null;
      let currentRsvps = 0;

      // Check capacity based on whether it's a recurring class or instance
      if (instanceId) {
        // For one-time events/instances, check capacity from class_instances table
        const { data: instance } = await supabase
          .from('class_instances')
          .select('max_capacity, current_rsvps')
          .eq('id', instanceId)
          .single();
        
        maxCapacity = instance?.max_capacity || null;
        currentRsvps = instance?.current_rsvps || 0;
      } else if (scheduleId) {
        // For recurring classes, check capacity from gym_schedules table
        const { data: schedule } = await supabase
          .from('gym_schedules')
          .select('max_capacity, current_rsvps')
          .eq('id', scheduleId)
          .single();
        
        maxCapacity = schedule?.max_capacity || null;
        currentRsvps = schedule?.current_rsvps || 0;
      }

      const status = maxCapacity && currentRsvps >= maxCapacity
        ? 'waitlist'
        : 'confirmed';

      const { data, error: insertError } = await supabase
        .from('class_rsvps')
        .insert({
          schedule_id: scheduleId,
          instance_id: instanceId || null,
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

  async function checkRSVPStatus(
    scheduleId: string | null, 
    rsvpDate: string, 
    uid: string,
    instanceId?: string | null
  ) {
    try {
      let query = supabase
        .from('class_rsvps')
        .select('*')
        .eq('user_id', uid)
        .eq('rsvp_date', rsvpDate);

      // Add appropriate filter based on what we're checking
      if (instanceId) {
        query = query.eq('instance_id', instanceId);
      } else if (scheduleId) {
        query = query.eq('schedule_id', scheduleId);
      }

      const { data, error } = await query.maybeSingle();

      // maybeSingle returns null if no row found, which is fine
      if (error) {
        console.error('Error checking RSVP status:', error);
        return null;
      }

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

