<template>
  <q-dialog v-model="showDialog" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">🤖 Ask about schedules</div>
      </q-card-section>
      
      <q-card-section class="q-pt-none">
        <q-input
          v-model="query"
          label="Ask anything..."
          placeholder="e.g., When is no-gi at South gym?"
          autofocus
          @keyup.enter="handleQuery"
        />
        
        <div v-if="loading" class="q-mt-md text-center">
          <q-spinner-dots color="primary" size="40px" />
          <p class="text-caption">Thinking...</p>
        </div>
        
        <div v-else-if="answer" class="q-mt-md q-pa-md bg-blue-1 rounded-borders">
          <div class="text-body2" style="white-space: pre-wrap">{{ answer }}</div>
        </div>
      </q-card-section>
      
      <q-card-actions align="right">
        <q-btn flat label="Close" @click="close" />
        <q-btn 
          v-if="!answer" 
          flat 
          label="Ask" 
          color="primary" 
          @click="handleQuery" 
          :disable="!query || loading"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGymAI } from '../composables/useGymAI'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { loading, querySchedule } = useGymAI()
const query = ref('')
const answer = ref('')

const showDialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleQuery = async () => {
  if (!query.value) return
  
  const result = await querySchedule(query.value)
  if (result) {
    answer.value = result
  }
}

const close = () => {
  showDialog.value = false
  query.value = ''
  answer.value = ''
}
</script>

