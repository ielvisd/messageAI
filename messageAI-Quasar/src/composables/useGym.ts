import { ref, computed } from 'vue';
import { supabase } from '../boot/supabase';
import type { Database } from '../types/supabase';

type Gym = Database['public']['Tables']['gyms']['Row'];
type GymSettings = {
  studentsCanMessage: boolean;
  studentsCanCreateGroups: boolean;
  instructorsCanCreateClasses: boolean;
  instructorsEditOwnOnly: boolean;
  aiEnabled: boolean;
  aiAutoRespond: boolean;
};

export function useGym(gymId?: string) {
  const gym = ref<Gym | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const settings = computed<GymSettings>(() => {
    if (!gym.value?.settings) {
      return {
        studentsCanMessage: false,
        studentsCanCreateGroups: false,
        instructorsCanCreateClasses: true,
        instructorsEditOwnOnly: true,
        aiEnabled: true,
        aiAutoRespond: true
      };
    }
    return gym.value.settings as GymSettings;
  });

  const locations = computed(() => {
    if (!gym.value?.locations) return [];
    return gym.value.locations as Array<{ name: string; address: string }>;
  });

  async function fetchGym(id: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      gym.value = data;
    } catch (err) {
      console.error('Error fetching gym:', err);
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function createGym(data: {
    name: string;
    owner_id: string;
    locations: Array<{ name: string; address: string }>;
    settings?: Partial<GymSettings>;
  }) {
    loading.value = true;
    error.value = null;

    try {
      const { data: newGym, error: createError } = await supabase
        .from('gyms')
        .insert({
          name: data.name,
          owner_id: data.owner_id,
          locations: data.locations,
          settings: data.settings || {}
        })
        .select()
        .single();

      if (createError) throw createError;
      gym.value = newGym;
      return { data: newGym, error: null };
    } catch (err) {
      console.error('Error creating gym:', err);
      error.value = (err as Error).message;
      return { data: null, error: err as Error };
    } finally {
      loading.value = false;
    }
  }

  async function updateGym(id: string, updates: Partial<Gym>) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: updateError } = await supabase
        .from('gyms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      gym.value = data;
      return { data, error: null };
    } catch (err) {
      console.error('Error updating gym:', err);
      error.value = (err as Error).message;
      return { data: null, error: err as Error };
    } finally {
      loading.value = false;
    }
  }

  async function updateSettings(id: string, newSettings: Partial<GymSettings>) {
    const currentSettings = gym.value?.settings || {};
    return updateGym(id, {
      settings: { ...currentSettings, ...newSettings }
    });
  }

  // Initialize if gymId provided
  if (gymId) {
    void fetchGym(gymId);
  }

  return {
    gym,
    settings,
    locations,
    loading,
    error,
    fetchGym,
    createGym,
    updateGym,
    updateSettings
  };
}

