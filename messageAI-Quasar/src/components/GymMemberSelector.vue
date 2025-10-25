<template>
  <q-select
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :options="filteredOptions"
    :multiple="multiple"
    :label="label"
    :hint="hint"
    :loading="loading"
    use-input
    input-debounce="300"
    @filter="filterMembers"
    option-value="id"
    option-label="name"
    filled
    emit-value
    map-options
    :use-chips="multiple"
    :clearable="clearable"
  >
    <template v-slot:prepend>
      <q-icon name="people" />
    </template>

    <template v-slot:option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section avatar>
          <q-avatar :color="getRoleColor(scope.opt.role)" text-color="white" size="32px">
            {{ getInitials(scope.opt.name) }}
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label>{{ scope.opt.name }}</q-item-label>
          <q-item-label caption>{{ scope.opt.email }}</q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-badge :color="getRoleColor(scope.opt.role)" :label="scope.opt.role?.toUpperCase()" />
        </q-item-section>
      </q-item>
    </template>

    <template v-slot:selected-item="scope" v-if="multiple">
      <q-chip
        removable
        dense
        @remove="scope.removeAtIndex(scope.index)"
        :tabindex="scope.tabindex"
        :color="getRoleColor(scope.opt.role)"
        text-color="white"
        class="q-ma-none q-mr-xs"
      >
        {{ scope.opt.name }}
      </q-chip>
    </template>

    <template v-slot:no-option>
      <q-item>
        <q-item-section class="text-grey">
          No eligible members found
        </q-item-section>
      </q-item>
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'

interface Member {
  id: string
  name: string
  email: string
  role: string
  age_category?: string
}

const props = withDefaults(defineProps<{
  modelValue: string | string[] | null
  gymId?: string
  multiple?: boolean
  label?: string
  hint?: string
  excludeSelf?: boolean
  clearable?: boolean
}>(), {
  multiple: false,
  label: 'Select Member(s)',
  hint: 'Only teens (13+) and adults can use messaging',
  excludeSelf: true,
  clearable: true
})

defineEmits<{
  'update:modelValue': [value: string | string[] | null]
}>()

const members = ref<Member[]>([])
const loading = ref(false)
const filteredOptions = ref<Member[]>([])

const eligibleMembers = computed(() => {
  let filtered = members.value

  // Filter by age category (only teens and adults)
  filtered = filtered.filter(m => 
    m.age_category === 'teen' || m.age_category === 'adult'
  )

  // Exclude self if requested
  if (props.excludeSelf && user.value) {
    filtered = filtered.filter(m => m.id !== user.value?.id)
  }

  return filtered
})

async function loadMembers() {
  loading.value = true

  try {
    let query = supabase
      .from('profiles')
      .select('id, name, email, role, age_category')
      .in('age_category', ['teen', 'adult'])
      .order('name', { ascending: true })

    // Filter by gym if provided
    if (props.gymId) {
      query = query.eq('gym_id', props.gymId)
    }

    const { data, error } = await query

    if (error) throw error

    let filtered = data || []

    // Exclude self if requested
    if (props.excludeSelf && user.value) {
      filtered = filtered.filter(m => m.id !== user.value?.id)
    }

    members.value = filtered
    filteredOptions.value = filtered
  } catch (err) {
    console.error('Error loading gym members:', err)
    members.value = []
    filteredOptions.value = []
  } finally {
    loading.value = false
  }
}

function filterMembers(val: string, update: (fn: () => void) => void) {
  update(() => {
    if (val === '') {
      filteredOptions.value = eligibleMembers.value
    } else {
      const needle = val.toLowerCase()
      filteredOptions.value = eligibleMembers.value.filter(m => 
        m.name.toLowerCase().includes(needle) ||
        m.email.toLowerCase().includes(needle)
      )
    }
  })
}

function getRoleColor(role: string) {
  switch (role) {
    case 'owner': return 'deep-purple'
    case 'instructor': return 'primary'
    case 'student': return 'teal'
    case 'parent': return 'orange'
    default: return 'grey'
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

onMounted(() => {
  void loadMembers()
})
</script>

