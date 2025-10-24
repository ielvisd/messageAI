<template>
  <q-dialog v-model="showDialog" persistent transition-show="slide-up" transition-hide="slide-down" maximized>
    <q-card class="schedule-editor-card">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ isEditing ? 'Edit' : 'Create' }} Class</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <q-form ref="formRef" @submit="onSubmit" class="q-gutter-md" greedy>
          <q-select
            v-model="form.gym_location"
            :options="locationOptions"
            label="Location"
            :rules="[val => !!val || 'Location is required']"
            filled
            lazy-rules
          >
            <template v-slot:prepend>
              <q-icon name="place" />
            </template>
          </q-select>

          <q-select
            v-model="form.class_type"
            :options="classTypeOptions"
            label="Class Type"
            :rules="[val => !!val || 'Class type is required']"
            filled
            lazy-rules
          >
            <template v-slot:prepend>
              <q-icon name="fitness_center" />
            </template>
          </q-select>

          <q-select
            v-model="form.day_of_week"
            :options="dayOptions"
            label="Day of Week"
            :rules="[val => !!val || 'Day is required']"
            filled
            lazy-rules
          >
            <template v-slot:prepend>
              <q-icon name="calendar_today" />
            </template>
          </q-select>

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input
                v-model="form.start_time"
                label="Start Time *"
                type="time"
                :rules="[val => !!val || 'Start time is required']"
                filled
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="form.end_time"
                label="End Time *"
                type="time"
                :rules="[val => !!val || 'End time is required']"
                filled
              />
            </div>
          </div>

          <q-input
            v-model="form.level"
            label="Level"
            placeholder="e.g., All Levels, Beginner, Advanced"
            filled
          />

          <q-select
            v-model="form.instructor_id"
            :options="instructorOptions"
            option-value="id"
            option-label="name"
            emit-value
            map-options
            label="Instructor *"
            :rules="[val => !!val || 'Instructor is required']"
            filled
          />

          <q-input
            v-model.number="form.max_capacity"
            type="number"
            label="Max Capacity"
            hint="Leave empty for unlimited"
            filled
          />

          <q-input
            v-model="form.notes"
            type="textarea"
            label="Notes"
            rows="3"
            filled
          />
        </q-form>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="grey" @click="closeDialog" />
        <q-btn
          :label="isEditing ? 'Update' : 'Create'"
          color="primary"
          @click="submitForm"
          :loading="loading"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useSchedule } from '../composables/useSchedule';
import { useGym } from '../composables/useGym';
import { supabase } from '../boot/supabase';
import { Notify, QForm } from 'quasar';

const props = defineProps<{
  modelValue: boolean;
  gymId: string;
  scheduleId?: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'saved': [];
}>();

const showDialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const { createSchedule, updateSchedule } = useSchedule();
const { gym, fetchGym } = useGym();

const formRef = ref<QForm>();
const loading = ref(false);
const instructorOptions = ref<any[]>([]);

const isEditing = computed(() => !!props.scheduleId);

const form = ref({
  gym_id: props.gymId,
  gym_location: '',
  class_type: '',
  day_of_week: '',
  start_time: '',
  end_time: '',
  level: '',
  instructor_id: '',
  instructor_name: '',
  max_capacity: null as number | null,
  notes: '',
  is_active: true
});

const locationOptions = computed(() => {
  if (!gym.value?.locations) return [];
  return (gym.value.locations as any[]).map(l => l.name);
});

const classTypeOptions = [
  { label: 'Gi', value: 'gi' },
  { label: 'No-Gi', value: 'nogi' },
  { label: 'Kids', value: 'kids' },
  { label: 'Open Mat', value: 'open_mat' }
];

const dayOptions = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

async function loadInstructors() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('gym_id', props.gymId)
      .eq('role', 'instructor');

    if (error) throw error;
    instructorOptions.value = data || [];
  } catch (err) {
    console.error('Error loading instructors:', err);
  }
}

async function loadSchedule() {
  if (!props.scheduleId) return;

  try {
    const { data, error } = await supabase
      .from('gym_schedules')
      .select('*')
      .eq('id', props.scheduleId)
      .single();

    if (error) throw error;

    form.value = {
      ...form.value,
      ...data
    };
  } catch (err) {
    console.error('Error loading schedule:', err);
  }
}

async function submitForm() {
  const valid = await formRef.value?.validate();
  if (!valid) return;

  await onSubmit();
}

async function onSubmit() {
  loading.value = true;

  try {
    // Get instructor name
    const instructor = instructorOptions.value.find(i => i.id === form.value.instructor_id);
    if (instructor) {
      form.value.instructor_name = instructor.name;
    }

    if (isEditing.value && props.scheduleId) {
      const { error } = await updateSchedule(props.scheduleId, form.value);
      if (error) throw error;

      Notify.create({
        type: 'positive',
        message: 'Class updated successfully'
      });
    } else {
      const { error } = await createSchedule(form.value);
      if (error) throw error;

      Notify.create({
        type: 'positive',
        message: 'Class created successfully'
      });
    }

    emit('saved');
    closeDialog();
  } catch (err) {
    console.error('Error saving schedule:', err);
    Notify.create({
      type: 'negative',
      message: (err as Error).message || 'Failed to save class'
    });
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.value = {
    gym_id: props.gymId,
    gym_location: '',
    class_type: '',
    day_of_week: '',
    start_time: '',
    end_time: '',
    level: '',
    instructor_id: '',
    instructor_name: '',
    max_capacity: null,
    notes: '',
    is_active: true
  };
}

function closeDialog() {
  resetForm();
  showDialog.value = false;
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    void loadInstructors();
    if (props.scheduleId) {
      void loadSchedule();
    } else {
      resetForm();
    }
  }
});

onMounted(() => {
  if (props.gymId) {
    void fetchGym(props.gymId);
    void loadInstructors();
  }
  if (props.scheduleId) {
    void loadSchedule();
  }
});
</script>

