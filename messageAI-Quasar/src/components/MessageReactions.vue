<template>
  <div v-if="groupedReactions.length > 0" class="message-reactions">
    <q-chip
      v-for="reaction in groupedReactions"
      :key="reaction.emoji"
      clickable
      :outline="!reaction.hasUserReacted"
      :color="reaction.hasUserReacted ? 'primary' : 'grey-3'"
      :text-color="reaction.hasUserReacted ? 'white' : 'grey-8'"
      size="sm"
      dense
      @click="handleReactionClick(reaction.emoji)"
      class="reaction-chip"
    >
      <span class="emoji-icon">{{ reaction.emoji }}</span>
      <span class="reaction-count">{{ reaction.count }}</span>
      
      <!-- Tooltip showing who reacted -->
      <q-tooltip v-if="reaction.users.length > 0" anchor="top middle" self="bottom middle">
        <div class="reaction-tooltip">
          <div v-for="(user, idx) in reaction.users.slice(0, 5)" :key="user.id">
            {{ user.name || 'Unknown' }}
          </div>
          <div v-if="reaction.users.length > 5" class="text-caption">
            +{{ reaction.users.length - 5 }} more
          </div>
        </div>
      </q-tooltip>
    </q-chip>

    <!-- Add Reaction Button -->
    <q-btn
      flat
      round
      dense
      size="sm"
      icon="add"
      color="grey-6"
      @click="showEmojiPicker = true"
      class="add-reaction-btn"
    >
      <q-tooltip>Add reaction</q-tooltip>
    </q-btn>

    <!-- Emoji Picker Dialog -->
    <EmojiPicker 
      v-model="showEmojiPicker"
      @emoji-selected="handleEmojiSelected"
    />
  </div>
  
  <!-- Show add button even if no reactions -->
  <div v-else class="message-reactions-empty">
    <q-btn
      flat
      round
      dense
      size="sm"
      icon="add_reaction"
      color="grey-5"
      @click="showEmojiPicker = true"
      class="add-reaction-btn-empty"
    >
      <q-tooltip>Add reaction</q-tooltip>
    </q-btn>

    <EmojiPicker 
      v-model="showEmojiPicker"
      @emoji-selected="handleEmojiSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useReactions, type Reaction } from '../composables/useReactions'
import EmojiPicker from './EmojiPicker.vue'
import { Notify } from 'quasar'

const props = defineProps<{
  messageId: string
  initialReactions?: Reaction[]
}>()

const emit = defineEmits<{
  'reaction-added': [emoji: string]
  'reaction-removed': [emoji: string]
}>()

const showEmojiPicker = ref(false)

const {
  reactions,
  loading,
  error,
  loadReactions,
  toggleReaction,
  getGroupedReactions,
  subscribeToReactions,
  unsubscribeFromReactions
} = useReactions(props.messageId)

// Initialize with provided reactions or load from DB
watch(() => props.initialReactions, (newReactions) => {
  if (newReactions && newReactions.length > 0) {
    reactions.value = newReactions
  }
}, { immediate: true })

// Group reactions for display
const groupedReactions = computed(() => {
  return getGroupedReactions(reactions.value)
})

// Handle clicking on an existing reaction (toggle)
const handleReactionClick = async (emoji: string) => {
  try {
    await toggleReaction(props.messageId, emoji)
    
    const reacted = reactions.value.find(
      r => r.emoji === emoji && r.message_id === props.messageId
    )
    
    if (reacted) {
      emit('reaction-added', emoji)
    } else {
      emit('reaction-removed', emoji)
    }
  } catch (err) {
    console.error('Error toggling reaction:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to update reaction',
      position: 'top',
      timeout: 2000
    })
  }
}

// Handle selecting a new emoji from picker
const handleEmojiSelected = async (emoji: string) => {
  try {
    await toggleReaction(props.messageId, emoji)
    emit('reaction-added', emoji)
    showEmojiPicker.value = false
  } catch (err) {
    console.error('Error adding reaction:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to add reaction',
      position: 'top',
      timeout: 2000
    })
  }
}

// Load reactions on mount if not provided
onMounted(() => {
  if (!props.initialReactions || props.initialReactions.length === 0) {
    void loadReactions(props.messageId)
  }
  subscribeToReactions(props.messageId)
})

onUnmounted(() => {
  unsubscribeFromReactions()
})
</script>

<style scoped>
.message-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
  align-items: center;
}

.message-reactions-empty {
  margin-top: 4px;
}

.reaction-chip {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 2px 8px;
}

.reaction-chip:hover {
  transform: scale(1.05);
}

.emoji-icon {
  font-size: 16px;
  margin-right: 4px;
}

.reaction-count {
  font-size: 12px;
  font-weight: 600;
}

.add-reaction-btn {
  width: 28px;
  height: 28px;
  min-height: 28px;
}

.add-reaction-btn-empty {
  width: 32px;
  height: 32px;
  min-height: 32px;
}

.reaction-tooltip {
  font-size: 12px;
  max-width: 200px;
}
</style>



