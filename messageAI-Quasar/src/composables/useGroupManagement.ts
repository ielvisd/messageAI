import { ref } from 'vue';
import { supabase } from '../boot/supabase';

export function useGroupManagement(chatId?: string) {
  const members = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchGroupMembers(groupChatId: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from('chat_members')
        .select('*, profiles(*)')
        .eq('chat_id', groupChatId);

      if (fetchError) throw fetchError;
      members.value = data || [];
    } catch (err) {
      console.error('Error fetching group members:', err);
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function addMembers(groupChatId: string, userIds: string[]) {
    loading.value = true;
    error.value = null;

    try {
      const membersToAdd = userIds.map(userId => ({
        chat_id: groupChatId,
        user_id: userId
      }));

      const { data, error: insertError } = await supabase
        .from('chat_members')
        .insert(membersToAdd)
        .select('*, profiles(*)');

      if (insertError) throw insertError;

      // Add to local array
      if (data) {
        members.value.push(...data);
      }

      return { data, error: null };
    } catch (err) {
      console.error('Error adding members:', err);
      error.value = (err as Error).message;
      return { data: null, error: err as Error };
    } finally {
      loading.value = false;
    }
  }

  async function removeMember(groupChatId: string, userId: string) {
    loading.value = true;
    error.value = null;

    try {
      const { error: deleteError } = await supabase
        .from('chat_members')
        .delete()
        .eq('chat_id', groupChatId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Remove from local array
      members.value = members.value.filter(m => m.user_id !== userId);

      return { error: null };
    } catch (err) {
      console.error('Error removing member:', err);
      error.value = (err as Error).message;
      return { error: err as Error };
    } finally {
      loading.value = false;
    }
  }

  async function getEligibleStudents(gymId: string, excludeChatId?: string) {
    try {
      const query = supabase
        .from('profiles')
        .select('*')
        .eq('gym_id', gymId)
        .eq('role', 'student');

      const { data: students, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // If excludeChatId provided, filter out users already in that chat
      if (excludeChatId && students) {
        const { data: existingMembers } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('chat_id', excludeChatId);

        const existingUserIds = new Set(existingMembers?.map(m => m.user_id) || []);
        return students.filter(s => !existingUserIds.has(s.id));
      }

      return students || [];
    } catch (err) {
      console.error('Error fetching eligible students:', err);
      return [];
    }
  }

  // Initialize if chatId provided
  if (chatId) {
    void fetchGroupMembers(chatId);
  }

  return {
    members,
    loading,
    error,
    fetchGroupMembers,
    addMembers,
    removeMember,
    getEligibleStudents
  };
}

