<template>
  <q-dialog v-model="model" persistent>
    <q-card style="min-width: 500px; max-width: 600px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ isEditing ? 'Edit Class' : 'Create Class' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <!-- Day of Week -->
          <q-select
            v-model="formData.day_of_week"
            :options="daysOfWeek"
            label="Day of Week"
            outlined
            :rules="[val => !!val || 'Day is required']"
          />

          <!-- Class Type -->
          <q-select
            v-model="formData.class_type"
            :options="classTypes"
            label="Class Type"
            outlined
            :rules="[val => !!val || 'Class type is required']"
          />

          <!-- Time Range -->
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-input
                v-model="formData.start_time"
                label="Start Time"
                type="time"
                outlined
                :rules="[val => !!val || 'Start time is required']"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="formData.end_time"
                label="End Time"
                type="time"
                outlined
                :rules="[
                  val => !!val || 'End time is required',
                  val => isValidTimeRange(formData.start_time, val) || 'End time must be after start time'
                ]"
              />
            </div>
          </div>

          <!-- Level -->
          <q-input
            v-model="formData.level"
            label="Level (e.g., All Levels, Fundamentals, Advanced)"
            outlined
            hint="Optional - specify skill level"
          />

          <!-- Notes (Age Group, etc) -->
          <q-input
            v-model="formData.notes"
            label="Notes (e.g., Adult & Teens, Kids - 8-12 Yrs Old)"
            type="textarea"
            outlined
            rows="3"
            hint="Specify age groups, special requirements, etc."
          />

          <!-- Max Capacity -->
          <q-input
            v-model.number="formData.max_capacity"
            label="Max Capacity"
            type="number"
            outlined
            min="1"
            hint="Optional - maximum number of students"
          />

          <!-- Instructor Selection -->
          <q-select
            v-model="formData.instructor_id"
            :options="instructorOptions"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            label="Instructor"
            outlined
            clearable
            :loading="loadingInstructors"
            hint="Optional - assign an instructor"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">
                  No instructors found
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- Active Toggle -->
          <q-toggle
            v-model="formData.is_active"
            label="Active (visible to students)"
            color="positive"
          />

          <!-- Action Buttons -->
          <div class="row q-gutter-sm q-mt-md">
            <q-btn
              label="Cancel"
              flat
              color="grey"
              v-close-popup
            />
            <q-space />
            <q-btn
              :label="isEditing ? 'Save Changes' : 'Create Class'"
              type="submit"
              color="primary"
              :loading="saving"
              :disable="saving"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '../boot/supabase'
import { profile } from '../state/auth'
import { useQuasar } from 'quasar'

interface ScheduleData {
  id?: string
  gym_id: string
  day_of_week: string
  start_time: string
  end_time: string
  class_type: string
  level?: string
  notes?: string
  max_capacity?: number
  instructor_id?: string
  is_active: boolean
}

interface Instructor {
  id: string
  name: string
}

const props = defineProps<{
  modelValue: boolean
  schedule?: ScheduleData | null
  gymId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'saved': [schedule: ScheduleData]
}>()

const $q = useQuasar()

const model = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
})

const isEditing = computed(() => !!props.schedule?.id)

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const classTypes = ['GI', 'NO-GI', 'Competition', 'Open Mat', 'Private Lesson']

const formData = ref<ScheduleData>({
  gym_id: props.gymId,
  day_of_week: '',
  start_time: '',
  end_time: '',
  class_type: '',
  level: '',
  notes: '',
  max_capacity: undefined,
  instructor_id: undefined,
  is_active: true
})

const saving = ref(false)
const loadingInstructors = ref(false)
const instructorOptions = ref<Instructor[]>([])

// Validation
function isValidTimeRange(start: string, end: string): boolean {
  if (!start || !end) return true
  return end > start
}

// Load instructors for the gym
async function loadInstructors() {
  try {
    loadingInstructors.value = true
    
    // Don't query if gym_id is not valid
    if (!props.gymId || props.gymId === '' || props.gymId === 'null') {
      console.warn('⚠️ Cannot load instructors: invalid gym_id', props.gymId)
      instructorOptions.value = []
      return
    }
    
    // Get instructors and owners for this gym
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('gym_id', props.gymId)
      .in('role', ['instructor', 'owner'])
      .order('name')

    if (error) throw error

    instructorOptions.value = (data || []).map(p => ({
      id: p.id,
      name: p.name || p.id
    }))
  } catch (err) {
    console.error('Error loading instructors:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to load instructors'
    })
  } finally {
    loadingInstructors.value = false
  }
}

// Initialize form data when schedule changes
watch(() => props.schedule, (schedule) => {
  if (schedule) {
    formData.value = {
      id: schedule.id,
      gym_id: schedule.gym_id || props.gymId,
      day_of_week: schedule.day_of_week || '',
      start_time: schedule.start_time || '',
      end_time: schedule.end_time || '',
      class_type: schedule.class_type || '',
      level: schedule.level || '',
      notes: schedule.notes || '',
      max_capacity: schedule.max_capacity,
      instructor_id: schedule.instructor_id,
      is_active: schedule.is_active !== false
    }
  } else {
    // Reset for new class
    formData.value = {
      gym_id: props.gymId,
      day_of_week: '',
      start_time: '',
      end_time: '',
      class_type: '',
      level: '',
      notes: '',
      max_capacity: undefined,
      instructor_id: undefined,
      is_active: true
    }
  }
}, { immediate: true })

// Submit handler
async function onSubmit() {
  try {
    saving.value = true

    const scheduleData = {
      gym_id: formData.value.gym_id,
      day_of_week: formData.value.day_of_week,
      start_time: formData.value.start_time,
      end_time: formData.value.end_time,
      class_type: formData.value.class_type,
      level: formData.value.level || null,
      notes: formData.value.notes || null,
      max_capacity: formData.value.max_capacity || null,
      instructor_id: formData.value.instructor_id || null,
      is_active: formData.value.is_active,
      updated_at: new Date().toISOString()
    }

    if (isEditing.value && formData.value.id) {
      // Update existing schedule
      const { data, error } = await supabase
        .from('gym_schedules')
        .update(scheduleData)
        .eq('id', formData.value.id)
        .select()
        .single()

      if (error) throw error

      $q.notify({
        type: 'positive',
        message: 'Class updated successfully'
      })

      emit('saved', data)
    } else {
      // Create new schedule
      const { data, error } = await supabase
        .from('gym_schedules')
        .insert(scheduleData)
        .select()
        .single()

      if (error) throw error

      $q.notify({
        type: 'positive',
        message: 'Class created successfully'
      })

      emit('saved', data)
    }

    model.value = false
  } catch (err) {
    console.error('Error saving schedule:', err)
    $q.notify({
      type: 'negative',
      message: `Failed to ${isEditing.value ? 'update' : 'create'} class`
    })
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadInstructors()
})
</script>

<style scoped>
.q-field {
  margin-bottom: 0;
}
</style>
