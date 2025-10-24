<template>
  <div>
    <q-btn
      v-if="!currentRsvp"
      :label="buttonLabel"
      :color="buttonColor"
      :icon="buttonIcon"
      :loading="loading"
      @click="handleRsvp"
    />
    <q-btn
      v-else
      label="Cancel RSVP"
      color="negative"
      icon="cancel"
      outline
      :loading="loading"
      @click="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRSVP } from '../composables/useRSVP';
import { user } from '../state/auth';
import { Notify } from 'quasar';

const props = defineProps<{
  scheduleId: string;
  rsvpDate: string;
}>();

const { rsvpToClass, cancelRSVP, checkRSVPStatus } = useRSVP();

const currentRsvp = ref<any>(null);
const loading = ref(false);

const buttonLabel = computed(() => {
  if (!currentRsvp.value) return `RSVP for ${props.rsvpDate}`;
  return currentRsvp.value.status === 'waitlist' ? "You're on waitlist" : 'RSVP\'d';
});

const buttonColor = computed(() => {
  if (!currentRsvp.value) return 'primary';
  return currentRsvp.value.status === 'waitlist' ? 'warning' : 'positive';
});

const buttonIcon = computed(() => {
  if (!currentRsvp.value) return 'check_circle';
  return currentRsvp.value.status === 'waitlist' ? 'schedule' : 'check_circle';
});

async function loadRsvpStatus() {
  if (!user.value?.id) return;

  currentRsvp.value = await checkRSVPStatus(
    props.scheduleId,
    props.rsvpDate,
    user.value.id
  );
}

async function handleRsvp() {
  if (!user.value?.id) {
    Notify.create({
      type: 'negative',
      message: 'Please log in to RSVP'
    });
    return;
  }

  loading.value = true;

  try {
    const { data, error, status } = await rsvpToClass(
      props.scheduleId,
      props.rsvpDate,
      user.value.id
    );

    if (error) throw error;

    currentRsvp.value = data;

    const message = status === 'waitlist'
      ? 'Added to waitlist - we\'ll notify you if a spot opens!'
      : 'RSVP confirmed!';

    Notify.create({
      type: 'positive',
      message
    });
  } catch (err) {
    console.error('Error RSVPing:', err);
    Notify.create({
      type: 'negative',
      message: (err as Error).message || 'Failed to RSVP'
    });
  } finally {
    loading.value = false;
  }
}

async function handleCancel() {
  if (!currentRsvp.value) return;

  const confirmed = confirm('Cancel your RSVP?');
  if (!confirmed) return;

  loading.value = true;

  try {
    const { error } = await cancelRSVP(currentRsvp.value.id);

    if (error) throw error;

    currentRsvp.value = null;

    Notify.create({
      type: 'positive',
      message: 'RSVP canceled'
    });
  } catch (err) {
    console.error('Error canceling RSVP:', err);
    Notify.create({
      type: 'negative',
      message: (err as Error).message || 'Failed to cancel RSVP'
    });
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadRsvpStatus();
});
</script>

