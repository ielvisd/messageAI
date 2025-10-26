import { ref, onMounted, onUnmounted } from 'vue'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  user_name?: string
}

export interface GroupedReaction {
  emoji: string
  count: number
  users: Array<{ id: string; name?: string }>
  hasUserReacted: boolean
}

export function useReactions(messageId?: string) {
  const reactions = ref<Reaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let realtimeChannel: RealtimeChannel | null = null

  /**
   * Load reactions for a specific message
   */
  const loadReactions = async (msgId: string) => {
    if (!msgId) return

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('message_reactions')
        .select(`
          id,
          message_id,
          user_id,
          emoji,
          created_at,
          profiles!inner (
            name
          )
        `)
        .eq('message_id', msgId)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      reactions.value = data.map((r: any) => ({
        id: r.id,
        message_id: r.message_id,
        user_id: r.user_id,
        emoji: r.emoji,
        created_at: r.created_at,
        user_name: r.profiles?.name
      }))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load reactions'
      console.error('Error loading reactions:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Add a reaction to a message
   */
  const addReaction = async (msgId: string, emoji: string) => {
    if (!user.value || !msgId || !emoji) return

    try {
      const { data, error: insertError } = await supabase
        .from('message_reactions')
        .insert({
          message_id: msgId,
          user_id: user.value.id,
          emoji
        })
        .select(`
          id,
          message_id,
          user_id,
          emoji,
          created_at,
          profiles!inner (
            name
          )
        `)
        .single()

      if (insertError) {
        // Check if it's a duplicate (unique constraint violation)
        if (insertError.code === '23505') {
          console.log('Reaction already exists')
          return
        }
        throw insertError
      }

      // Add to local state if we're tracking this message
      if (messageId === msgId && data) {
        reactions.value.push({
          id: data.id,
          message_id: data.message_id,
          user_id: data.user_id,
          emoji: data.emoji,
          created_at: data.created_at,
          user_name: (data.profiles as any)?.name
        })
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add reaction'
      console.error('Error adding reaction:', err)
      throw err
    }
  }

  /**
   * Remove a reaction from a message
   */
  const removeReaction = async (msgId: string, emoji: string) => {
    if (!user.value || !msgId || !emoji) return

    try {
      const { error: deleteError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', msgId)
        .eq('user_id', user.value.id)
        .eq('emoji', emoji)

      if (deleteError) throw deleteError

      // Remove from local state
      if (messageId === msgId) {
        reactions.value = reactions.value.filter(
          r => !(r.user_id === user.value?.id && r.emoji === emoji)
        )
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to remove reaction'
      console.error('Error removing reaction:', err)
      throw err
    }
  }

  /**
   * Toggle a reaction (add if not present, remove if present)
   */
  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!user.value) return

    const existing = reactions.value.find(
      r => r.user_id === user.value?.id && r.emoji === emoji && r.message_id === msgId
    )

    if (existing) {
      await removeReaction(msgId, emoji)
    } else {
      await addReaction(msgId, emoji)
    }
  }

  /**
   * Get grouped reactions for display (emoji with counts and users)
   */
  const getGroupedReactions = (msgReactions: Reaction[]): GroupedReaction[] => {
    const grouped = new Map<string, GroupedReaction>()

    msgReactions.forEach(reaction => {
      if (!grouped.has(reaction.emoji)) {
        grouped.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          hasUserReacted: false
        })
      }

      const group = grouped.get(reaction.emoji)!
      group.count++
      group.users.push({
        id: reaction.user_id,
        name: reaction.user_name
      })

      if (reaction.user_id === user.value?.id) {
        group.hasUserReacted = true
      }
    })

    return Array.from(grouped.values()).sort((a, b) => b.count - a.count)
  }

  /**
   * Check if current user has reacted with a specific emoji
   */
  const hasUserReacted = (msgId: string, emoji: string): boolean => {
    return reactions.value.some(
      r => r.message_id === msgId && r.user_id === user.value?.id && r.emoji === emoji
    )
  }

  /**
   * Subscribe to realtime updates for reactions
   */
  const subscribeToReactions = (msgId: string) => {
    if (!msgId) return

    realtimeChannel = supabase
      .channel(`reactions:${msgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${msgId}`
        },
        async (payload) => {
          console.log('Reaction change:', payload)

          if (payload.eventType === 'INSERT') {
            // Fetch user name for new reaction
            const { data: profile } = await supabase
              .from('profiles')
              .select('name')
              .eq('id', (payload.new as any).user_id)
              .single()

            const newReaction: Reaction = {
              id: (payload.new as any).id,
              message_id: (payload.new as any).message_id,
              user_id: (payload.new as any).user_id,
              emoji: (payload.new as any).emoji,
              created_at: (payload.new as any).created_at,
              user_name: profile?.name
            }

            // Add if not already present
            if (!reactions.value.find(r => r.id === newReaction.id)) {
              reactions.value.push(newReaction)
            }
          } else if (payload.eventType === 'DELETE') {
            reactions.value = reactions.value.filter(
              r => r.id !== (payload.old as any).id
            )
          }
        }
      )
      .subscribe()
  }

  /**
   * Unsubscribe from realtime updates
   */
  const unsubscribeFromReactions = () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  // Auto-load and subscribe if messageId is provided
  onMounted(() => {
    if (messageId) {
      void loadReactions(messageId)
      subscribeToReactions(messageId)
    }
  })

  // Cleanup
  onUnmounted(() => {
    unsubscribeFromReactions()
  })

  return {
    reactions,
    loading,
    error,
    loadReactions,
    addReaction,
    removeReaction,
    toggleReaction,
    getGroupedReactions,
    hasUserReacted,
    subscribeToReactions,
    unsubscribeFromReactions
  }
}



