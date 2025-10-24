import { ref } from 'vue';
import { supabase } from '../boot/supabase';
import type { Database } from '../types/supabase';

type Invitation = Database['public']['Tables']['invitations']['Row'];
type NewInvitation = Database['public']['Tables']['invitations']['Insert'];

export function useInvitations() {
  const invitations = ref<Invitation[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function generateToken() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function fetchInvitations(gymId: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select('*, profiles!invited_by(*)')
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      invitations.value = data || [];
    } catch (err) {
      console.error('Error fetching invitations:', err);
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function createInvitation(invitation: Omit<NewInvitation, 'token'>) {
    loading.value = true;
    error.value = null;

    try {
      const token = generateToken();
      
      const { data, error: insertError } = await supabase
        .from('invitations')
        .insert({
          ...invitation,
          token
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Call Edge Function to send email
      if (data) {
        invitations.value.unshift(data);
        
        // Send invitation email
        await supabase.functions.invoke('send-invitation-email', {
          body: {
            email: invitation.email,
            token,
            role: invitation.role,
            gymId: invitation.gym_id
          }
        });
      }

      return { data, error: null };
    } catch (err) {
      console.error('Error creating invitation:', err);
      error.value = (err as Error).message;
      return { data: null, error: err as Error };
    } finally {
      loading.value = false;
    }
  }

  async function getInvitationByToken(token: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select('*, gyms(*)')
        .eq('token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (fetchError) throw fetchError;
      return { data, error: null };
    } catch (err) {
      console.error('Error fetching invitation:', err);
      error.value = (err as Error).message;
      return { data: null, error: err as Error };
    } finally {
      loading.value = false;
    }
  }

  async function acceptInvitation(token: string) {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('token', token)
        .select()
        .single();

      if (updateError) throw updateError;

      return { data, error: null };
    } catch (err) {
      console.error('Error accepting invitation:', err);
      error.value = (err as Error).message;
      return { data: null, error: err as Error };
    } finally {
      loading.value = false;
    }
  }

  return {
    invitations,
    loading,
    error,
    fetchInvitations,
    createInvitation,
    getInvitationByToken,
    acceptInvitation,
    generateToken
  };
}

