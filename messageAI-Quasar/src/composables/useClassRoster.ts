import { ref } from 'vue';
import { supabase } from '../boot/supabase';

export interface RosterEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'confirmed' | 'waitlist' | 'cancelled';
  rsvpDate: string;
  createdAt: string;
}

export interface ClassRosterData {
  scheduleId: string;
  className: string;
  classType: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  instructorName: string;
  occurrences: {
    date: string;
    rsvps: RosterEntry[];
    confirmedCount: number;
    waitlistCount: number;
  }[];
}

export function useClassRoster() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Fetch all RSVPs for a specific class schedule and date
   */
  async function getClassRoster(scheduleId: string, rsvpDate: string): Promise<RosterEntry[]> {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from('class_rsvps')
        .select(`
          id,
          user_id,
          status,
          rsvp_date,
          created_at,
          profiles:user_id (
            id,
            name,
            email
          )
        `)
        .eq('schedule_id', scheduleId)
        .eq('rsvp_date', rsvpDate)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      return (data || []).map(rsvp => ({
        id: rsvp.id,
        userId: rsvp.user_id,
        userName: (rsvp.profiles as any)?.name || 'Unknown',
        userEmail: (rsvp.profiles as any)?.email || '',
        status: rsvp.status as 'confirmed' | 'waitlist' | 'cancelled',
        rsvpDate: rsvp.rsvp_date,
        createdAt: rsvp.created_at
      }));
    } catch (err) {
      console.error('Error fetching class roster:', err);
      error.value = (err as Error).message;
      return [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch all RSVPs for a specific schedule ID across all future dates
   */
  async function getScheduleRoster(scheduleId: string): Promise<ClassRosterData | null> {
    loading.value = true;
    error.value = null;

    try {
      // First, get the schedule details
      const { data: schedule, error: scheduleError } = await supabase
        .from('gym_schedules')
        .select(`
          id,
          class_type,
          day_of_week,
          start_time,
          end_time,
          notes,
          profiles:instructor_id (
            name
          )
        `)
        .eq('id', scheduleId)
        .single();

      if (scheduleError) throw scheduleError;
      if (!schedule) return null;

      // Get all future RSVPs for this schedule
      const today = new Date().toISOString().split('T')[0];
      const { data: rsvps, error: rsvpsError } = await supabase
        .from('class_rsvps')
        .select(`
          id,
          user_id,
          status,
          rsvp_date,
          created_at,
          profiles:user_id (
            id,
            name,
            email
          )
        `)
        .eq('schedule_id', scheduleId)
        .gte('rsvp_date', today)
        .order('rsvp_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (rsvpsError) throw rsvpsError;

      // Group RSVPs by date
      const occurrenceMap = new Map<string, RosterEntry[]>();
      
      (rsvps || []).forEach(rsvp => {
        const entry: RosterEntry = {
          id: rsvp.id,
          userId: rsvp.user_id,
          userName: (rsvp.profiles as any)?.name || 'Unknown',
          userEmail: (rsvp.profiles as any)?.email || '',
          status: rsvp.status as 'confirmed' | 'waitlist' | 'cancelled',
          rsvpDate: rsvp.rsvp_date,
          createdAt: rsvp.created_at
        };

        if (!occurrenceMap.has(rsvp.rsvp_date)) {
          occurrenceMap.set(rsvp.rsvp_date, []);
        }
        occurrenceMap.get(rsvp.rsvp_date)!.push(entry);
      });

      // Convert map to array of occurrences
      const occurrences = Array.from(occurrenceMap.entries()).map(([date, rsvpList]) => ({
        date,
        rsvps: rsvpList,
        confirmedCount: rsvpList.filter(r => r.status === 'confirmed').length,
        waitlistCount: rsvpList.filter(r => r.status === 'waitlist').length
      }));

      return {
        scheduleId: schedule.id,
        className: schedule.notes || schedule.class_type,
        classType: schedule.class_type,
        dayOfWeek: schedule.day_of_week,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        instructorName: (schedule.profiles as any)?.name || 'Unknown',
        occurrences
      };
    } catch (err) {
      console.error('Error fetching schedule roster:', err);
      error.value = (err as Error).message;
      return null;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch all rosters for instructor's classes
   */
  async function getInstructorRosters(instructorId: string, gymId: string): Promise<ClassRosterData[]> {
    loading.value = true;
    error.value = null;

    try {
      // Get all schedules for this instructor
      const { data: schedules, error: schedulesError } = await supabase
        .from('gym_schedules')
        .select('id')
        .eq('instructor_id', instructorId)
        .eq('gym_id', gymId);

      if (schedulesError) throw schedulesError;

      // Fetch roster for each schedule
      const rosters: ClassRosterData[] = [];
      for (const schedule of schedules || []) {
        const roster = await getScheduleRoster(schedule.id);
        if (roster && roster.occurrences.length > 0) {
          rosters.push(roster);
        }
      }

      return rosters;
    } catch (err) {
      console.error('Error fetching instructor rosters:', err);
      error.value = (err as Error).message;
      return [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch all rosters for all classes in a gym (for owners/admins)
   */
  async function getAllGymRosters(gymId: string): Promise<ClassRosterData[]> {
    loading.value = true;
    error.value = null;

    try {
      // Get all schedules for this gym
      const { data: schedules, error: schedulesError } = await supabase
        .from('gym_schedules')
        .select('id')
        .eq('gym_id', gymId);

      if (schedulesError) throw schedulesError;

      // Fetch roster for each schedule
      const rosters: ClassRosterData[] = [];
      for (const schedule of schedules || []) {
        const roster = await getScheduleRoster(schedule.id);
        if (roster && roster.occurrences.length > 0) {
          rosters.push(roster);
        }
      }

      return rosters;
    } catch (err) {
      console.error('Error fetching gym rosters:', err);
      error.value = (err as Error).message;
      return [];
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    getClassRoster,
    getScheduleRoster,
    getInstructorRosters,
    getAllGymRosters
  };
}

