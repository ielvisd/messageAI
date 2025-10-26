<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="instructor-dialog" style="min-width: 350px; max-width: 450px;">
      <!-- Header with instructor info -->
      <q-card-section class="row items-center q-pb-none">
        <q-avatar size="60px" color="primary" text-color="white" class="q-mr-md">
          <img v-if="instructor?.avatar_url" :src="instructor.avatar_url" />
          <span v-else class="text-h5">{{ instructorInitial }}</span>
        </q-avatar>
        <div class="col">
          <div class="text-h6 text-weight-bold">{{ instructor?.name }}</div>
          <q-badge 
            :color="instructor?.role === 'owner' ? 'accent' : 'primary'" 
            :label="roleLabel"
            class="q-mt-xs"
          />
        </div>
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-separator class="q-mt-md" />

      <!-- Details Section -->
      <q-card-section class="q-pt-md">
        <q-list>
          <q-item v-if="instructor?.email">
            <q-item-section avatar>
              <q-icon name="email" color="grey-7" />
            </q-item-section>
            <q-item-section>
              <q-item-label caption>Email</q-item-label>
              <q-item-label class="text-body2">{{ instructor.email }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item v-if="specialties && specialties.length > 0">
            <q-item-section avatar>
              <q-icon name="stars" color="grey-7" />
            </q-item-section>
            <q-item-section>
              <q-item-label caption>Specialties</q-item-label>
              <div class="q-gutter-xs q-mt-xs">
                <q-chip 
                  v-for="specialty in specialties" 
                  :key="specialty"
                  size="sm"
                  color="primary"
                  text-color="white"
                  dense
                >
                  {{ specialty }}
                </q-chip>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-separator />

      <!-- Action Buttons -->
      <q-card-actions align="right" class="q-pa-md">
        <q-btn
          flat
          label="View Schedule"
          color="grey-7"
          icon="calendar_month"
          @click="onViewSchedule"
          class="q-mr-sm"
        />
        <q-btn
          unelevated
          label="Direct Message"
          color="primary"
          icon="chat"
          @click="onDirectMessage"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDialogPluginComponent } from 'quasar';

interface Instructor {
  id: string;
  name: string;
  email?: string;
  role: string;
  avatar_url?: string;
  instructor_preferences?: {
    specialties?: string[];
  };
}

interface Props {
  instructor: Instructor;
}

const props = defineProps<Props>();

// Required for dialog plugin component
defineEmits([
  ...useDialogPluginComponent.emits
]);

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent();

const instructorInitial = computed(() => {
  return props.instructor?.name?.charAt(0).toUpperCase() || 'I';
});

const roleLabel = computed(() => {
  const role = props.instructor?.role;
  if (role === 'owner') return 'Owner';
  if (role === 'instructor') return 'Instructor';
  return role;
});

const specialties = computed(() => {
  return props.instructor?.instructor_preferences?.specialties || [];
});

function onDirectMessage() {
  onDialogOK({ action: 'dm', instructorId: props.instructor.id });
}

function onViewSchedule() {
  onDialogOK({ action: 'schedule', instructorId: props.instructor.id });
}
</script>

<style scoped>
.instructor-dialog {
  border-radius: 12px;
}

.instructor-dialog :deep(.q-card__section) {
  padding: 16px 20px;
}

.instructor-dialog :deep(.q-list) {
  padding: 0;
}

.instructor-dialog :deep(.q-item) {
  padding: 8px 0;
  min-height: auto;
}
</style>

