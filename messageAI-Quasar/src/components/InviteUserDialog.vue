<template>
  <q-dialog v-model="showDialog" persistent transition-show="slide-up" transition-hide="slide-down">
    <q-card class="invite-dialog-card">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Invite User</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <q-form ref="formRef" @submit="onSubmit" class="q-gutter-md" greedy>
          <q-input
            v-model="email"
            type="email"
            label="Email Address"
            :rules="[val => !!val || 'Email is required', val => /.+@.+\..+/.test(val) || 'Invalid email']"
            filled
            lazy-rules
            autofocus
          >
            <template v-slot:prepend>
              <q-icon name="email" />
            </template>
          </q-input>

          <q-select
            v-model="role"
            :options="roleOptions"
            label="Role"
            :rules="[val => !!val || 'Role is required']"
            filled
            lazy-rules
          >
            <template v-slot:prepend>
              <q-icon name="person" />
            </template>
          </q-select>

          <!-- Parent-specific: Link to students -->
          <q-select
            v-if="role === 'parent'"
            v-model="linkedStudents"
            :options="studentOptions"
            option-value="id"
            option-label="name"
            label="Link to Students"
            multiple
            filled
            use-chips
            hint="Select which students this parent can view"
          >
            <template v-slot:prepend>
              <q-icon name="group" />
            </template>
          </q-select>
        </q-form>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Cancel" color="grey-7" @click="closeDialog" v-close-popup no-caps />
        <q-btn
          label="Send Invitation"
          color="primary"
          @click="onSubmit"
          :loading="loading"
          :disable="!email || !role"
          unelevated
          no-caps
        >
          <template v-slot:loading>
            <q-spinner-hourglass />
          </template>
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style lang="scss" scoped>
.invite-dialog-card {
  min-width: 400px;
  max-width: 90vw;
  
  @media (max-width: 600px) {
    min-width: unset;
    width: 100%;
  }
}
</style>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useInvitations } from '../composables/useInvitations';
import { supabase } from '../boot/supabase';
import { user } from '../state/auth';
import { useQuasar, QForm } from 'quasar';

const $q = useQuasar();
const formRef = ref<QForm>();

const props = defineProps<{
  modelValue: boolean;
  gymId: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'invited': [email: string, role: string];
}>();

const showDialog = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const { createInvitation } = useInvitations();

const email = ref('');
const role = ref<string | null>(null);
const linkedStudents = ref<any[]>([]);
const studentOptions = ref<any[]>([]);
const loading = ref(false);

const roleOptions = [
  { label: 'Instructor', value: 'instructor' },
  { label: 'Student', value: 'student' },
  { label: 'Parent', value: 'parent' }
];

async function loadStudents() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('gym_id', props.gymId)
      .eq('role', 'student');

    if (error) throw error;
    studentOptions.value = data || [];
  } catch (err) {
    console.error('Error loading students:', err);
  }
}

async function onSubmit() {
  // Validate form first
  const valid = await formRef.value?.validate();
  if (!valid) return;

  if (!email.value || !role.value) return;

  loading.value = true;

  try {
    const metadata = role.value === 'parent' && linkedStudents.value.length > 0
      ? { studentIds: linkedStudents.value.map(s => s.id) }
      : {};

    const { error } = await createInvitation({
      gym_id: props.gymId,
      invited_by: user.value?.id || '',
      email: email.value,
      role: role.value as 'instructor' | 'student' | 'parent',
      metadata
    });

    if (error) throw error;

    $q.notify({
      type: 'positive',
      message: `Invitation sent to ${email.value}`,
      icon: 'send'
    });

    emit('invited', email.value, role.value);
    closeDialog();
  } catch (err) {
    console.error('Error sending invitation:', err);
    $q.notify({
      type: 'negative',
      message: (err as Error).message || 'Failed to send invitation',
      icon: 'error'
    });
  } finally {
    loading.value = false;
  }
}

function closeDialog() {
  email.value = '';
  role.value = null;
  linkedStudents.value = [];
  showDialog.value = false;
}

watch(() => props.modelValue, (newVal) => {
  if (newVal && role.value === 'parent') {
    void loadStudents();
  }
});

onMounted(() => {
  if (props.modelValue && role.value === 'parent') {
    void loadStudents();
  }
});
</script>

