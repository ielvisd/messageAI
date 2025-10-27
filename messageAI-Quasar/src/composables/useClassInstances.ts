import { ref } from 'vue';
import { date as dateUtil } from 'quasar';
import { supabase } from '../boot/supabase';

export interface ClassInstance {
  id?: string;
  gym_id: string;
  gym_name?: string | undefined;
  schedule_id?: string | null;
  date: string; // YYYY-MM-DD format
  start_time: string;
  end_time: string;
  instructor_id?: string | undefined;
  instructor_name?: string | undefined;
  class_type: string;
  level?: string | undefined;
  notes?: string | undefined;
  max_capacity?: number | undefined;
  current_rsvps?: number | undefined;
  gym_location?: string | undefined;
  is_cancelled: boolean;
  is_override: boolean;
  event_type: 'class' | 'workshop' | 'seminar' | 'belt_test' | 'competition' | 'other';
  created_at?: string;
  // From recurring template
  day_of_week?: string | undefined;
}

interface Schedule {
  id: string;
  gym_id: string;
  gym_name?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  class_type: string;
  level?: string | undefined;
  notes?: string | undefined;
  max_capacity?: number | undefined;
  current_rsvps?: number | undefined;
  gym_location?: string | undefined;
  instructor_id?: string | undefined;
  instructor_name?: string | undefined;
  is_active: boolean;
  is_cancelled?: boolean;
}

const instances = ref<ClassInstance[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Map of day names to ISO day numbers (1=Monday, 7=Sunday)
const DAY_MAP: Record<string, number> = {
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
  'Sunday': 7
};

export function useClassInstances() {
  
  /**
   * Generate class instances from recurring schedule template for a date range
   * Uses Quasar date utilities for all date manipulation
   */
  function generateInstancesFromSchedule(
    schedule: Schedule,
    startDate: Date,
    endDate: Date
  ): ClassInstance[] {
    const generated: ClassInstance[] = [];
    
    if (!schedule.is_active) return generated;
    
    const targetDayOfWeek = DAY_MAP[schedule.day_of_week];
    if (!targetDayOfWeek) return generated;
    
    // Start from startDate
    let current = new Date(startDate);
    
    // Find first occurrence of target day of week
    while (dateUtil.getDayOfWeek(current) !== targetDayOfWeek && current <= endDate) {
      current = dateUtil.addToDate(current, { days: 1 });
    }
    
    // Generate instances for each week until endDate
    while (current <= endDate) {
      const dateString = dateUtil.formatDate(current, 'YYYY-MM-DD');
      
      const instance: ClassInstance = {
        gym_id: schedule.gym_id,
        gym_name: schedule.gym_name ?? undefined,
        schedule_id: schedule.id,
        date: dateString,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        instructor_id: schedule.instructor_id ?? undefined,
        instructor_name: schedule.instructor_name ?? undefined,
        class_type: schedule.class_type,
        level: schedule.level ?? undefined,
        notes: schedule.notes ?? undefined,
        max_capacity: schedule.max_capacity ?? undefined,
        current_rsvps: 0, // Will be calculated from RSVPs
        gym_location: schedule.gym_location ?? undefined,
        is_cancelled: schedule.is_cancelled || false,
        is_override: false,
        event_type: 'class',
        day_of_week: schedule.day_of_week
      };
      
      generated.push(instance);
      
      // Move to next week
      current = dateUtil.addToDate(current, { days: 7 });
    }
    
    return generated;
  }
  
  /**
   * Fetch class instances for one or more gyms within a date range
   * Combines generated recurring instances with database overrides
   */
  async function fetchInstances(
    gymId: string | string[],
    startDate: Date,
    endDate: Date
  ): Promise<ClassInstance[]> {
    // Handle multiple gyms
    if (Array.isArray(gymId)) {
      const allInstances: ClassInstance[] = [];
      for (const id of gymId) {
        const instances = await fetchInstances(id, startDate, endDate);
        allInstances.push(...instances);
      }
      return allInstances;
    }
    
    // Single gym logic below
    try {
      loading.value = true;
      error.value = null;
      
      const startDateStr = dateUtil.formatDate(startDate, 'YYYY-MM-DD');
      const endDateStr = dateUtil.formatDate(endDate, 'YYYY-MM-DD');
      
      // 1. Fetch gym name
      const { data: gymData } = await supabase
        .from('gyms')
        .select('name')
        .eq('id', gymId)
        .single();
      
      const gymName = gymData?.name;
      
      // 2. Fetch recurring schedules
      const { data: schedules, error: schedulesError } = await supabase
        .from('gym_schedules')
        .select('*')
        .eq('gym_id', gymId)
        .eq('is_active', true);
      
      if (schedulesError) throw schedulesError;
      
      // 3. Add gym_name to each schedule
      const schedulesWithGym = (schedules || []).map(schedule => ({
        ...schedule,
        gym_name: gymName
      }));
      
      // 4. Generate instances from recurring schedules
      const generatedInstances: ClassInstance[] = [];
      schedulesWithGym.forEach(schedule => {
        const generated = generateInstancesFromSchedule(schedule, startDate, endDate);
        generatedInstances.push(...generated);
      });
      
      // 3. Fetch overrides and one-time events from database
      const { data: dbInstances, error: instancesError } = await supabase
        .from('class_instances')
        .select(`
          *,
          profiles:instructor_id (name)
        `)
        .eq('gym_id', gymId)
        .gte('date', startDateStr)
        .lte('date', endDateStr);
      
      if (instancesError) throw instancesError;
      
      // 4. Map database instances with instructor names and gym name
      const mappedDbInstances: ClassInstance[] = (dbInstances || []).map(instance => ({
        ...instance,
        gym_name: gymName,
        instructor_name: (instance.profiles)?.name,
        is_cancelled: instance.is_cancelled || false,
        is_override: instance.is_override || false
      }));
      
      // 5. Merge: overrides replace generated instances
      const instanceMap = new Map<string, ClassInstance>();
      
      // Add all generated instances
      generatedInstances.forEach(instance => {
        const key = `${instance.schedule_id}_${instance.date}`;
        instanceMap.set(key, instance);
      });
      
      // Override with database instances
      mappedDbInstances.forEach(instance => {
        if (instance.schedule_id) {
          // This is an override
          const key = `${instance.schedule_id}_${instance.date}`;
          instanceMap.set(key, instance);
        } else {
          // This is a one-time event
          const key = `onetime_${instance.id}_${instance.date}`;
          instanceMap.set(key, instance);
        }
      });
      
      // 6. Convert to array and filter out cancelled
      const allInstances = Array.from(instanceMap.values());
      
      // 7. Fetch RSVP counts for all instances
      const datesWithSchedules = allInstances
        .filter(i => i.schedule_id)
        .map(i => ({ schedule_id: i.schedule_id, date: i.date }));
      
      if (datesWithSchedules.length > 0) {
        // Get RSVP counts grouped by schedule_id and date
        const { data: rsvpCounts } = await supabase
          .from('class_rsvps')
          .select('schedule_id, rsvp_date')
          .eq('status', 'confirmed')
          .in('schedule_id', [...new Set(datesWithSchedules.map(d => d.schedule_id))])
          .gte('rsvp_date', startDateStr)
          .lte('rsvp_date', endDateStr);
        
        // Count RSVPs per schedule/date
        const countMap = new Map<string, number>();
        (rsvpCounts || []).forEach(rsvp => {
          const key = `${rsvp.schedule_id}_${rsvp.rsvp_date}`;
          countMap.set(key, (countMap.get(key) || 0) + 1);
        });
        
        // Update current_rsvps
        allInstances.forEach(instance => {
          if (instance.schedule_id) {
            const key = `${instance.schedule_id}_${instance.date}`;
            instance.current_rsvps = countMap.get(key) || 0;
          }
        });
      }
      
      instances.value = allInstances;
      return allInstances;
      
    } catch (err) {
      console.error('Error fetching class instances:', err);
      error.value = err instanceof Error ? err.message : 'Failed to fetch class instances';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  /**
   * Create a one-time event (workshop, seminar, etc.)
   */
  async function createOneTimeEvent(data: Partial<ClassInstance>) {
    try {
      loading.value = true;
      error.value = null;
      
      const { data: instance, error: createError } = await supabase
        .from('class_instances')
        .insert({
          gym_id: data.gym_id,
          date: data.date,
          start_time: data.start_time,
          end_time: data.end_time,
          instructor_id: data.instructor_id,
          class_type: data.class_type,
          level: data.level,
          notes: data.notes,
          max_capacity: data.max_capacity,
          gym_location: data.gym_location,
          event_type: data.event_type || 'class',
          is_cancelled: false,
          is_override: false,
          schedule_id: null // NULL indicates one-time event
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      return instance;
    } catch (err) {
      console.error('Error creating one-time event:', err);
      error.value = err instanceof Error ? err.message : 'Failed to create event';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  /**
   * Override a specific occurrence of a recurring class
   */
  async function overrideInstance(
    scheduleId: string,
    date: string,
    overrides: Partial<ClassInstance>
  ) {
    try {
      loading.value = true;
      error.value = null;
      
      // Check if override already exists
      const { data: existing } = await supabase
        .from('class_instances')
        .select('id')
        .eq('schedule_id', scheduleId)
        .eq('date', date)
        .single();
      
      if (existing) {
        // Update existing override
        const { data: updated, error: updateError } = await supabase
          .from('class_instances')
          .update({
            ...overrides,
            is_override: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        return updated;
      } else {
        // Create new override
        const { data: created, error: createError } = await supabase
          .from('class_instances')
          .insert({
            schedule_id: scheduleId,
            date,
            ...overrides,
            is_override: true
          })
          .select()
          .single();
        
        if (createError) throw createError;
        return created;
      }
    } catch (err) {
      console.error('Error overriding instance:', err);
      error.value = err instanceof Error ? err.message : 'Failed to override instance';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  /**
   * Cancel a specific occurrence of a recurring class
   */
  async function cancelInstance(scheduleId: string, date: string) {
    return overrideInstance(scheduleId, date, { is_cancelled: true });
  }
  
  /**
   * Bulk cancel classes in a date range
   */
  async function bulkCancelInRange(
    scheduleId: string,
    startDate: Date,
    endDate: Date
  ) {
    try {
      loading.value = true;
      error.value = null;
      
      // Fetch the schedule to know which day of week
      const { data: schedule, error: scheduleError } = await supabase
        .from('gym_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();
      
      if (scheduleError) throw scheduleError;
      
      // Generate all dates in range that match the day of week
      const datesToCancel: string[] = [];
      const generated = generateInstancesFromSchedule(schedule, startDate, endDate);
      generated.forEach(instance => {
        datesToCancel.push(instance.date);
      });
      
      // Create cancelled instances for each date
      const cancellations = datesToCancel.map(date => ({
        schedule_id: scheduleId,
        gym_id: schedule.gym_id,
        date,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        class_type: schedule.class_type,
        is_cancelled: true,
        is_override: true
      }));
      
      const { data, error: insertError } = await supabase
        .from('class_instances')
        .upsert(cancellations, {
          onConflict: 'schedule_id,date',
          ignoreDuplicates: false
        })
        .select();
      
      if (insertError) throw insertError;
      
      return data;
    } catch (err) {
      console.error('Error bulk cancelling instances:', err);
      error.value = err instanceof Error ? err.message : 'Failed to bulk cancel';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  /**
   * Delete a class instance (override or one-time event)
   */
  async function deleteInstance(instanceId: string) {
    try {
      loading.value = true;
      error.value = null;
      
      const { error: deleteError } = await supabase
        .from('class_instances')
        .delete()
        .eq('id', instanceId);
      
      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Error deleting instance:', err);
      error.value = err instanceof Error ? err.message : 'Failed to delete instance';
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  return {
    instances,
    loading,
    error,
    generateInstancesFromSchedule,
    fetchInstances,
    createOneTimeEvent,
    overrideInstance,
    cancelInstance,
    bulkCancelInRange,
    deleteInstance
  };
}

