import { ref } from 'vue';
import { supabase } from '../boot/supabase';
import { user } from '../state/auth';

export function useBlocking() {
  const blockedUsers = ref<string[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isBlockedUser = (userId: string) => {
    return blockedUsers.value.includes(userId);
  };

  async function fetchBlockedUsers(uid: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('blocked_users')
        .eq('id', uid)
        .single();

      if (fetchError) throw fetchError;
      blockedUsers.value = (data?.blocked_users as string[]) || [];
    } catch (err) {
      console.error('Error fetching blocked users:', err);
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function blockUser(userId: string, currentUserId: string) {
    loading.value = true;
    error.value = null;

    try {
      // Add to blocked_users array
      const newBlockedUsers = [...blockedUsers.value, userId];

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ blocked_users: newBlockedUsers })
        .eq('id', currentUserId);

      if (updateError) throw updateError;

      blockedUsers.value = newBlockedUsers;
      return { error: null };
    } catch (err) {
      console.error('Error blocking user:', err);
      error.value = (err as Error).message;
      return { error: err as Error };
    } finally {
      loading.value = false;
    }
  }

  async function unblockUser(userId: string, currentUserId: string) {
    loading.value = true;
    error.value = null;

    try {
      const newBlockedUsers = blockedUsers.value.filter(id => id !== userId);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ blocked_users: newBlockedUsers })
        .eq('id', currentUserId);

      if (updateError) throw updateError;

      blockedUsers.value = newBlockedUsers;
      return { error: null };
    } catch (err) {
      console.error('Error unblocking user:', err);
      error.value = (err as Error).message;
      return { error: err as Error };
    } finally {
      loading.value = false;
    }
  }

  // Initialize with current user's blocked list
  if (user.value?.id) {
    void fetchBlockedUsers(user.value.id);
  }

  return {
    blockedUsers,
    loading,
    error,
    isBlockedUser,
    fetchBlockedUsers,
    blockUser,
    unblockUser
  };
}

