import { ref, computed } from 'vue';
import { supabase } from '../boot/supabase';

export function useParentView(parentId?: string) {
  const linkedStudents = ref<any[]>([]);
  const selectedStudent = ref<any>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const studentIds = computed(() => {
    return linkedStudents.value.map(s => s.id);
  });

  async function fetchLinkedStudents(pid: string) {
    loading.value = true;
    error.value = null;

    try {
      // Get parent's profile to access parent_links
      const { data: parentProfile, error: parentError } = await supabase
        .from('profiles')
        .select('parent_links')
        .eq('id', pid)
        .single();

      if (parentError) throw parentError;

      const studentIds = (parentProfile?.parent_links as string[]) || [];

      if (studentIds.length === 0) {
        linkedStudents.value = [];
        return;
      }

      // Fetch student profiles
      const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', studentIds);

      if (studentsError) throw studentsError;

      linkedStudents.value = students || [];
      
      // Set first student as selected by default
      if (linkedStudents.value.length > 0 && !selectedStudent.value) {
        selectedStudent.value = linkedStudents.value[0];
      }
    } catch (err) {
      console.error('Error fetching linked students:', err);
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function getStudentSchedule(studentId: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('class_rsvps')
        .select('*, gym_schedules(*)')
        .eq('user_id', studentId)
        .gte('rsvp_date', new Date().toISOString().split('T')[0]);

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('Error fetching student schedule:', err);
      return [];
    }
  }

  async function getStudentGroups(studentId: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('chat_members')
        .select('*, chats(*)')
        .eq('user_id', studentId)
        .eq('chats.type', 'group');

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('Error fetching student groups:', err);
      return [];
    }
  }

  function selectStudent(student: any) {
    selectedStudent.value = student;
  }

  // Initialize if parentId provided
  if (parentId) {
    void fetchLinkedStudents(parentId);
  }

  return {
    linkedStudents,
    selectedStudent,
    studentIds,
    loading,
    error,
    fetchLinkedStudents,
    getStudentSchedule,
    getStudentGroups,
    selectStudent
  };
}

