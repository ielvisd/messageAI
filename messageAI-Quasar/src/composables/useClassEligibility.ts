import { computed } from 'vue'
import { profile } from '../state/auth'

/**
 * Composable to determine if a user can RSVP for a class based on age and skill level
 */
export function useClassEligibility() {
  
  /**
   * Calculate age from date of birth
   */
  function calculateAge(dateOfBirth: string | null | undefined): number | null {
    if (!dateOfBirth) return null
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  /**
   * Get the user's current age
   */
  const userAge = computed(() => {
    return calculateAge((profile.value as any)?.date_of_birth)
  })

  /**
   * Get the user's belt/skill level
   */
  const userBeltLevel = computed(() => {
    return (profile.value as any)?.belt_level || null
  })

  /**
   * Check if user can attend a class based on age group
   */
  function canAttendByAge(schedule: any): boolean {
    const age = userAge.value
    if (age === null) return true // If no age info, allow by default

    const notes = schedule.notes?.toLowerCase() || ''

    // Pee Wees: 5-7 years old
    if (notes.includes('pee wee')) {
      return age >= 5 && age <= 7
    }

    // Kids: 8-12 years old
    if (notes.includes('kid') && !notes.includes('teen')) {
      return age >= 8 && age <= 12
    }

    // Teens only: 13-17 years old
    if (notes.includes('teen') && !notes.includes('adult')) {
      return age >= 13 && age <= 17
    }

    // Adults & Teens: 13+ years old
    if (notes.includes('adult')) {
      return age >= 13
    }

    return true // Default to allowing
  }

  /**
   * Check if user meets skill level requirement
   * 
   * Business Rule: If an "adults & teens" class is NOT "all levels", 
   * it is classified as either "advanced" or "competition"
   */
  function canAttendBySkillLevel(schedule: any): boolean {
    const level = schedule.level?.toLowerCase() || ''
    const notes = schedule.notes?.toLowerCase() || ''
    const userBelt = userBeltLevel.value?.toLowerCase() || ''

    // Check if this is an adults & teens class
    const isAdultsAndTeens = notes.includes('adult')

    // All levels - anyone can attend
    if (level.includes('all levels')) {
      return true
    }

    // Fundamentals - anyone can attend (it's for beginners)
    if (level.includes('fundamentals')) {
      return true
    }

    // For adults & teens classes: if NOT "all levels", treat as advanced or competition
    if (isAdultsAndTeens && !level.includes('all levels') && level) {
      // If explicitly labeled as competition, treat as competition
      if (level.includes('competition')) {
        // Competition classes - for now, allow (could add invitation system later)
        return true
      }
      
      // Otherwise, treat as advanced (requires skill level check)
      // Check if user has advanced belt or 2+ stripes
      const hasAdvancedBelt = userBelt.includes('blue') || 
                             userBelt.includes('purple') || 
                             userBelt.includes('brown') || 
                             userBelt.includes('black')
      
      // Check for 2+ stripes on white belt
      const hasTwoStripes = userBelt.includes('2 stripe') || 
                           userBelt.includes('3 stripe') || 
                           userBelt.includes('4 stripe')
      
      return hasAdvancedBelt || hasTwoStripes
    }

    // Advanced - requires at least 2 stripes or higher belt
    if (level.includes('advanced')) {
      // Check if user has advanced belt or 2+ stripes
      const hasAdvancedBelt = userBelt.includes('blue') || 
                             userBelt.includes('purple') || 
                             userBelt.includes('brown') || 
                             userBelt.includes('black')
      
      // Check for 2+ stripes on white belt
      const hasTwoStripes = userBelt.includes('2 stripe') || 
                           userBelt.includes('3 stripe') || 
                           userBelt.includes('4 stripe')
      
      return hasAdvancedBelt || hasTwoStripes
    }

    // Competition - invitation only (check notes)
    if (level.includes('competition') || notes.includes('invitation only')) {
      // For now, allow - could add invitation system later
      return true
    }

    // If no level specified, allow by default
    if (!level) {
      return true
    }

    return true // Default to allowing
  }

  /**
   * Check if user can RSVP for a class (combines age and skill level)
   */
  function canRSVPForClass(schedule: any): { eligible: boolean; reason?: string } {
    const age = userAge.value

    // Check age eligibility
    if (!canAttendByAge(schedule)) {
      const notes = schedule.notes?.toLowerCase() || ''
      let ageRange = ''
      
      if (notes.includes('pee wee')) {
        ageRange = '5-7 years old'
      } else if (notes.includes('kid') && !notes.includes('teen')) {
        ageRange = '8-12 years old'
      } else if (notes.includes('teen') && !notes.includes('adult')) {
        ageRange = '13-17 years old'
      } else if (notes.includes('adult')) {
        ageRange = '13+ years old'
      }

      return {
        eligible: false,
        reason: `This class is for ${ageRange}. ${age !== null ? `You are ${age} years old.` : 'Please update your age in your profile.'}`
      }
    }

    // Check skill level eligibility
    if (!canAttendBySkillLevel(schedule)) {
      const level = schedule.level?.toLowerCase() || ''
      const notes = schedule.notes?.toLowerCase() || ''
      const isAdultsAndTeens = notes.includes('adult')
      
      // Provide specific messaging based on class type
      let reason = 'This advanced class requires at least 2 stripes or higher belt level.'
      
      if (isAdultsAndTeens && !level.includes('all levels')) {
        reason = 'This class is for advanced students. You need at least 2 stripes or a higher belt level to attend.'
      }
      
      return {
        eligible: false,
        reason
      }
    }

    return { eligible: true }
  }

  return {
    userAge,
    userBeltLevel,
    canAttendByAge,
    canAttendBySkillLevel,
    canRSVPForClass
  }
}

