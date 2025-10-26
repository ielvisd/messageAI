<template>
  <q-dialog v-model="model" persistent>
    <q-card style="min-width: 500px; max-width: 600px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ title }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <q-form @submit="onSubmit" class="q-gutter-md">
          <!-- Event Type Selection -->
          <q-select
            v-model="formData.eventType"
            :options="eventTypeOptions"
            label="Event Type"
            outlined
            emit-value
            map-options
            :rules="[val => !!val || 'Event type is required']"
            @update:model-value="onEventTypeChange"
          />

          <!-- Date Selection -->
          <q-input
            v-model="formData.date"
            label="Date"
            outlined
            readonly
            :rules="[val => !!val || 'Date is required']"
          >
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="formData.date" mask="YYYY-MM-DD">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>

          <!-- Class Type -->
          <q-select
            v-model="formData.classType"
            :options="classTypes"
            label="Class Type"
            outlined
            :rules="[val => !!val || 'Class type is required']"
          />

          <!-- Time Range -->
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-input
                v-model="formData.startTime"
                label="Start Time"
                type="time"
                outlined
                :rules="[val => !!val || 'Start time is required']"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="formData.endTime"
                label="End Time"
                type="time"
                outlined
                :rules="[
                  val => !!val || 'End time is required',
                  val => isValidTimeRange(formData.startTime, val) || 'End time must be after start time'
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

          <!-- Notes -->
          <q-input
            v-model="formData.notes"
            label="Notes"
            type="textarea"
            outlined
            rows="3"
            hint="Specify age groups, special requirements, etc."
          />

          <!-- Max Capacity -->
          <q-input
            v-model.number="formData.maxCapacity"
            label="Max Capacity"
            type="number"
            outlined
            min="1"
            hint="Optional - maximum number of students"
          />

          <!-- Instructor Selection -->
          <q-select
            v-model="formData.instructorId"
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

          <!-- Cancel Checkbox (for overrides) -->
          <q-toggle
            v-if="mode === 'override'"
            v-model="formData.isCancelled"
            label="Cancel this occurrence"
            color="negative"
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
              :label="submitLabel"
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
import { ref, computed, watch, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { supabase } from '../boot/supabase';
import type { ClassInstance } from '../composables/useClassInstances';
import { useClassInstances } from '../composables/useClassInstances';

interface Instructor {
  id: string;
  name: string;
}

type Mode = 'one-time' | 'override';

const props = defineProps<{
  modelValue: boolean;
  gymId: string;
  scheduleId?: string | null;
  date?: string;
  mode?: Mode;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'saved': [instance: ClassInstance];
}>();

const $q = useQuasar();
const { createOneTimeEvent, overrideInstance } = useClassInstances();

const model = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val)
});

const title = computed(() => {
  if (props.mode === 'override') return 'Override Class';
  return 'Create Event';
});

const submitLabel = computed(() => {
  if (props.mode === 'override') return 'Save Override';
  return 'Create Event';
});

const eventTypeOptions = [
  { label: 'Regular Class', value: 'class' },
  { label: 'Workshop', value: 'workshop' },
  { label: 'Seminar', value: 'seminar' },
  { label: 'Belt Test', value: 'belt_test' },
  { label: 'Competition', value: 'competition' },
  { label: 'Other', value: 'other' }
];

const classTypes = ['GI', 'NO-GI', 'Competition', 'Open Mat', 'Private Lesson', 'Other'];

const formData = ref({
  eventType: 'class' as string,
  date: props.date || '',
  classType: '',
  startTime: '',
  endTime: '',
  level: '',
  notes: '',
  maxCapacity: undefined as number | undefined,
  instructorId: undefined as string | undefined,
  isCancelled: false
});

const saving = ref(false);
const loadingInstructors = ref(false);
const instructorOptions = ref<Instructor[]>([]);

function isValidTimeRange(start: string, end: string): boolean {
  if (!start || !end) return true;
  return end > start;
}

function onEventTypeChange(value: string) {
  // Pre-fill some defaults based on event type
  if (value === 'workshop' || value === 'seminar') {
    formData.value.maxCapacity = 20;
  }
}

// Load instructors for the gym
async function loadInstructors() {
  try {
    loadingInstructors.value = true;
    
    if (!props.gymId || props.gymId === '' || props.gymId === 'null') {
      instructorOptions.value = [];
      return;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('gym_id', props.gymId)
      .in('role', ['instructor', 'owner'])
      .order('name');

    if (error) throw error;

    instructorOptions.value = (data || []).map(p => ({
      id: p.id,
      name: p.name || p.id
    }));
  } catch (err) {
    console.error('Error loading instructors:', err);
    $q.notify({
      type: 'negative',
      message: 'Failed to load instructors'
    });
  } finally {
    loadingInstructors.value = false;
  }
}

// Load schedule data if in override mode
async function loadScheduleData() {
  if (props.mode !== 'override' || !props.scheduleId) return;
  
  try {
    const { data, error } = await supabase
      .from('gym_schedules')
      .select('*')
      .eq('id', props.scheduleId)
      .single();
    
    if (error) throw error;
    
    // Pre-fill form with schedule data
    formData.value.classType = data.class_type || '';
    formData.value.startTime = data.start_time || '';
    formData.value.endTime = data.end_time || '';
    formData.value.level = data.level || '';
    formData.value.notes = data.notes || '';
    formData.value.maxCapacity = data.max_capacity;
    formData.value.instructorId = data.instructor_id;
  } catch (err) {
    console.error('Error loading schedule data:', err);
  }
}

// Submit handler
async function onSubmit() {
  try {
    saving.value = true;

    if (props.mode === 'override' && props.scheduleId && formData.value.date) {
      // Override existing recurring class
      const overrides: Partial<ClassInstance> = {
        gym_id: props.gymId,
        class_type: formData.value.classType,
        start_time: formData.value.startTime,
        end_time: formData.value.endTime,
        level: formData.value.level || undefined,
        notes: formData.value.notes || undefined,
        max_capacity: formData.value.maxCapacity,
        instructor_id: formData.value.instructorId,
        is_cancelled: formData.value.isCancelled
      };

      const result = await overrideInstance(
        props.scheduleId,
        formData.value.date,
        overrides
      );

      $q.notify({
        type: 'positive',
        message: formData.value.isCancelled ? 'Class cancelled' : 'Class updated'
      });

      emit('saved', result as ClassInstance);
    } else {
      // Create one-time event
      const eventData: Partial<ClassInstance> = {
        gym_id: props.gymId,
        date: formData.value.date,
        class_type: formData.value.classType,
        start_time: formData.value.startTime,
        end_time: formData.value.endTime,
        level: formData.value.level || undefined,
        notes: formData.value.notes || undefined,
        max_capacity: formData.value.maxCapacity,
        instructor_id: formData.value.instructorId,
        event_type: formData.value.eventType as any,
        is_cancelled: false,
        is_override: false
      };

      const result = await createOneTimeEvent(eventData);

      $q.notify({
        type: 'positive',
        message: 'Event created successfully'
      });

      emit('saved', result as ClassInstance);
    }

    model.value = false;
  } catch (err) {
    console.error('Error saving:', err);
    $q.notify({
      type: 'negative',
      message: 'Failed to save'
    });
  } finally {
    saving.value = false;
  }
}

// Reset form when dialog opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    formData.value = {
      eventType: 'class',
      date: props.date || '',
      classType: '',
      startTime: '',
      endTime: '',
      level: '',
      notes: '',
      maxCapacity: undefined,
      instructorId: undefined,
      isCancelled: false
    };
    
    void loadScheduleData();
  }
});

onMounted(() => {
  void loadInstructors();
});
</script>

<style scoped>
.q-field {
  margin-bottom: 0;
}
</style>

