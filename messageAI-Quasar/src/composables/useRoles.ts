import { computed } from 'vue';
import { user, profile } from '../state/auth';

export type UserRole = 'owner' | 'instructor' | 'student' | 'parent' | null;

export function useRoles() {
  const currentRole = computed<UserRole>(() => {
    if (!user.value || !profile.value) return null;
    // Role is stored in the profile, not the auth user object
    return (profile.value.role as UserRole) || null;
  });

  const isOwner = computed(() => currentRole.value === 'owner');
  const isInstructor = computed(() => currentRole.value === 'instructor');
  const isStudent = computed(() => currentRole.value === 'student');
  const isParent = computed(() => currentRole.value === 'parent');

  const canCreateGym = computed(() => isOwner.value);
  
  const canInviteUsers = computed(() => 
    isOwner.value || isInstructor.value
  );

  const canEditSchedule = (schedule: { instructor_id?: string }, gymSettings?: {instructorsCanCreateClasses?: boolean}) => {
    if (isOwner.value) return true;
    if (isInstructor.value) {
      // Check if instructor owns this schedule
      if (schedule.instructor_id === user.value?.id) return true;
      // Check if gym settings allow instructors to create classes
      if (gymSettings?.instructorsCanCreateClasses) return true;
    }
    return false;
  };

  const canDeleteSchedule = computed(() => isOwner.value);

  const canManageSettings = computed(() => isOwner.value);

  const canCreateGroupChat = (gymSettings?: {studentsCanCreateGroups?: boolean}) => {
    if (isOwner.value || isInstructor.value) return true;
    if (isStudent.value && gymSettings?.studentsCanCreateGroups) return true;
    return false;
  };

  const canMessageDirectly = (gymSettings?: {studentsCanMessage?: boolean}) => {
    if (isOwner.value || isInstructor.value || isParent.value) return true;
    if (isStudent.value && gymSettings?.studentsCanMessage) return true;
    return false;
  };

  const canRSVPToClasses = computed(() => 
    isStudent.value || isParent.value
  );

  const canViewClassRosters = computed(() =>
    isOwner.value || isInstructor.value
  );

  const homeRoute = computed(() => {
    switch (currentRole.value) {
      case 'owner':
        return '/dashboard';
      case 'instructor':
        return '/instructor-dashboard';
      case 'student':
        return '/chats';
      case 'parent':
        return '/parent-dashboard';
      default:
        return '/login';
    }
  });

  return {
    currentRole,
    isOwner,
    isInstructor,
    isStudent,
    isParent,
    canCreateGym,
    canInviteUsers,
    canEditSchedule,
    canDeleteSchedule,
    canManageSettings,
    canCreateGroupChat,
    canMessageDirectly,
    canRSVPToClasses,
    canViewClassRosters,
    homeRoute
  };
}

