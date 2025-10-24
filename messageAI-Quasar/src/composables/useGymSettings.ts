import { ref, computed } from 'vue';
import { supabase } from '../boot/supabase';

type GymSettings = {
  studentsCanMessage: boolean;
  studentsCanCreateGroups: boolean;
  instructorsCanCreateClasses: boolean;
  instructorsEditOwnOnly: boolean;
  aiEnabled: boolean;
  aiAutoRespond: boolean;
};

export function useGymSettings(gymId?: string) {
  const settings = ref<GymSettings>({
    studentsCanMessage: false,
    studentsCanCreateGroups: false,
    instructorsCanCreateClasses: true,
    instructorsEditOwnOnly: true,
    aiEnabled: true,
    aiAutoRespond: true
  });
  const loading = ref(false);
  const error = ref<string | null>(null);

  const messagesEnabled = computed(() => settings.value.studentsCanMessage);
  const groupCreationEnabled = computed(() => settings.value.studentsCanCreateGroups);
  const instructorScheduleEnabled = computed(() => settings.value.instructorsCanCreateClasses);
  const aiEnabled = computed(() => settings.value.aiEnabled);

  async function fetchSettings(gid: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from('gyms')
        .select('settings')
        .eq('id', gid)
        .single();

      if (fetchError) throw fetchError;

      if (data?.settings) {
        settings.value = { ...settings.value, ...data.settings as GymSettings };
      }
    } catch (err) {
      console.error('Error fetching gym settings:', err);
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function updateSettings(gid: string, updates: Partial<GymSettings>) {
    loading.value = true;
    error.value = null;

    try {
      const newSettings = { ...settings.value, ...updates };

      const { error: updateError } = await supabase
        .from('gyms')
        .update({ settings: newSettings })
        .eq('id', gid);

      if (updateError) throw updateError;

      settings.value = newSettings;
      return { error: null };
    } catch (err) {
      console.error('Error updating gym settings:', err);
      error.value = (err as Error).message;
      return { error: err as Error };
    } finally {
      loading.value = false;
    }
  }

  // Initialize if gymId provided
  if (gymId) {
    void fetchSettings(gymId);
  }

  return {
    settings,
    messagesEnabled,
    groupCreationEnabled,
    instructorScheduleEnabled,
    aiEnabled,
    loading,
    error,
    fetchSettings,
    updateSettings
  };
}

