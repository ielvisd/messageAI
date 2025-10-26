import { ref } from 'vue'
import { supabase } from 'src/boot/supabase'

export interface ScheduleProblem {
  type: 'no_instructor' | 'over_capacity' | 'instructor_conflict' | 'cancelled_with_rsvps' | 'instructor_availability_conflict'
  severity: 'critical' | 'warning' | 'info'
  schedule_id: string
  schedule?: any
  date?: string
  message: string
  suggested_actions: string[]
  instructor_name?: string
}

export function useScheduleProblems() {
  const loading = ref(false)
  const problems = ref<ScheduleProblem[]>([])

  /**
   * Check for schedule problems in a date range
   */
  async function checkProblems(
    gymId: string,
    dateRange?: { start: string; end: string }
  ): Promise<ScheduleProblem[]> {
    if (!gymId) return []

    loading.value = true
    const detectedProblems: ScheduleProblem[] = []

    try {
      // Default to next 7 days if no range provided
      const today = new Date()
      const start = dateRange?.start || today.toISOString().split('T')[0] || today.toISOString().substring(0, 10)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 7)
      const end = dateRange?.end || endDate.toISOString().split('T')[0] || endDate.toISOString().substring(0, 10)

      // Get all active schedules for the gym
      const { data: schedules, error: schedError } = await supabase
        .from('gym_schedules')
        .select('*')
        .eq('gym_id', gymId)
        .eq('is_active', true)

      if (schedError) throw schedError

      if (!schedules) return []

      // Check each schedule for the date range
      for (const schedule of schedules) {
        // Get next occurrences of this class in the date range
        const occurrences = getOccurrencesInRange(schedule, start, end)

        for (const date of occurrences) {
          const daysUntil = getDaysUntil(date)

          // Problem 1: No instructor assigned (critical if within 48h)
          if (!schedule.instructor_id) {
            detectedProblems.push({
              type: 'no_instructor',
              severity: daysUntil <= 2 ? 'critical' : 'warning',
              schedule_id: schedule.id,
              schedule,
              date,
              message: `${schedule.class_type || 'Class'} class on ${schedule.day_of_week} at ${formatTime(schedule.start_time || '')} has no instructor assigned`,
              suggested_actions: [
                'Assign an available instructor',
                'Cancel the class and notify RSVPs',
                'Request instructor coverage in gym chat'
              ]
            })
          }

          // Problem 1b: Instructor assigned but not available at this time
          if (schedule.instructor_id) {
            const { data: instructor } = await supabase
              .from('profiles')
              .select('name, instructor_preferences')
              .eq('id', schedule.instructor_id)
              .single()

            if (instructor?.instructor_preferences) {
              const prefs = instructor.instructor_preferences as any
              const dayLower = schedule.day_of_week?.toLowerCase()
              const isAvailable = prefs.available_days?.includes(dayLower)

              // Check if instructor hasn't marked this day as available
              if (!isAvailable && prefs.available_days && prefs.available_days.length > 0) {
                detectedProblems.push({
                  type: 'instructor_availability_conflict',
                  severity: daysUntil <= 2 ? 'warning' : 'info',
                  schedule_id: schedule.id,
                  schedule,
                  date,
                  instructor_name: instructor.name,
                  message: `${instructor.name} is assigned to ${schedule.class_type || 'Class'} on ${schedule.day_of_week} at ${formatTime(schedule.start_time || '')}, but hasn't marked this time as available`,
                  suggested_actions: [
                    'Confirm availability with instructor',
                    'Assign a different instructor',
                    'Update instructor availability preferences'
                  ]
                })
              }
            }
          }

          // Problem 3: Check if cancelled but has RSVPs
          if (schedule.is_cancelled) {
            const { data: rsvps } = await supabase
              .from('class_rsvps')
              .select('id, user_id')
              .eq('schedule_id', schedule.id)
              .eq('rsvp_date', date)
              .in('status', ['confirmed', 'waitlist'])

            if (rsvps && rsvps.length > 0) {
              detectedProblems.push({
                type: 'cancelled_with_rsvps',
                severity: 'info',
                schedule_id: schedule.id,
                schedule,
                date,
                message: `Cancelled class on ${date} still has ${rsvps.length} active RSVPs`,
                suggested_actions: [
                  'Send notification to affected members',
                  'Suggest alternative classes'
                ]
              })
            }
          }

          // Problem 2: Over capacity
          if (schedule.max_capacity && schedule.current_rsvps > schedule.max_capacity) {
            detectedProblems.push({
              type: 'over_capacity',
              severity: 'warning',
              schedule_id: schedule.id,
              schedule,
              date,
              message: `${schedule.class_type || 'Class'} on ${schedule.day_of_week} is over capacity (${schedule.current_rsvps}/${schedule.max_capacity})`,
              suggested_actions: [
                'Increase class capacity',
                'Add another class session',
                'Contact waitlisted members'
              ]
            })
          }
        }
      }

      // Problem 4: Instructor conflicts (teaching overlapping classes)
      const conflicts = await checkInstructorConflicts(gymId, schedules)
      detectedProblems.push(...conflicts)

      problems.value = detectedProblems
      return detectedProblems
    } catch (err) {
      console.error('Error checking schedule problems:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Check for problems on a specific date
   */
  async function getProblemsForDate(gymId: string, date: string): Promise<ScheduleProblem[]> {
    return checkProblems(gymId, { start: date, end: date })
  }

  /**
   * Check for instructor scheduling conflicts
   */
  async function checkInstructorConflicts(
    gymId: string,
    schedules: any[]
  ): Promise<ScheduleProblem[]> {
    const conflicts: ScheduleProblem[] = []
    const instructorSchedules = new Map<string, any[]>()

    // Group schedules by instructor
    for (const schedule of schedules) {
      if (schedule.instructor_id && !schedule.is_cancelled) {
        if (!instructorSchedules.has(schedule.instructor_id)) {
          instructorSchedules.set(schedule.instructor_id, [])
        }
        instructorSchedules.get(schedule.instructor_id)!.push(schedule)
      }
    }

    // Check each instructor's schedule for overlaps
    for (const [instructorId, instructorClasses] of instructorSchedules) {
      // Group by day of week
      const dayMap = new Map<string, any[]>()
      for (const cls of instructorClasses) {
        if (!dayMap.has(cls.day_of_week)) {
          dayMap.set(cls.day_of_week, [])
        }
        dayMap.get(cls.day_of_week)!.push(cls)
      }

      // Check for overlaps on each day
      for (const [day, classes] of dayMap) {
        for (let i = 0; i < classes.length; i++) {
          for (let j = i + 1; j < classes.length; j++) {
            if (timeRangesOverlap(classes[i], classes[j])) {
              conflicts.push({
                type: 'instructor_conflict',
                severity: 'warning',
                schedule_id: classes[i].id,
                schedule: classes[i],
                message: `Instructor ${classes[i].instructor_name || 'Unknown'} has overlapping classes on ${day}: ${classes[i].class_type || 'Class'} (${formatTime(classes[i].start_time || '')}-${formatTime(classes[i].end_time || '')}) and ${classes[j].class_type || 'Class'} (${formatTime(classes[j].start_time || '')}-${formatTime(classes[j].end_time || '')})`,
                suggested_actions: [
                  'Reassign one class to another instructor',
                  'Adjust class times to avoid overlap'
                ]
              })
            }
          }
        }
      }
    }

    return conflicts
  }

  /**
   * Get all occurrences of a class in a date range
   */
  function getOccurrencesInRange(schedule: any, startDate: string, endDate: string): string[] {
    const occurrences: string[] = []
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const targetDayIndex = days.indexOf(schedule.day_of_week)
    
    if (targetDayIndex === -1) return []

    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)

    // Move to the first occurrence of the target day
    while (current.getDay() !== targetDayIndex && current <= end) {
      current.setDate(current.getDate() + 1)
    }

    // Collect all occurrences
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      if (dateStr) occurrences.push(dateStr)
      current.setDate(current.getDate() + 7) // Move to next week
    }

    return occurrences
  }

  /**
   * Get days until a date
   */
  function getDaysUntil(dateStr: string): number {
    const target = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    target.setHours(0, 0, 0, 0)
    const diff = target.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  /**
   * Check if two time ranges overlap
   */
  function timeRangesOverlap(schedule1: any, schedule2: any): boolean {
    const start1 = timeToMinutes(schedule1.start_time)
    const end1 = timeToMinutes(schedule1.end_time)
    const start2 = timeToMinutes(schedule2.start_time)
    const end2 = timeToMinutes(schedule2.end_time)

    return (start1 < end2 && end1 > start2)
  }

  /**
   * Convert HH:MM time to minutes since midnight
   */
  function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return (hours || 0) * 60 + (minutes || 0)
  }

  /**
   * Format time for display
   */
  function formatTime(time?: string): string {
    if (!time) return ''
    const parts = time.split(':')
    const hours = parts[0] || '0'
    const minutes = parts[1] || '00'
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  return {
    loading,
    problems,
    checkProblems,
    getProblemsForDate,
    checkInstructorConflicts
  }
}

