<template>
  <q-page padding class="flex flex-center">
    <div class="col-12 col-sm-10 col-md-8 col-lg-6">
      <q-card flat bordered>
        <q-card-section>
          <div class="text-h5 text-weight-medium text-center q-mb-md">Welcome! Let's set up your gym</div>
          <div class="text-body2 text-center text-grey-7 q-mb-lg">
            You'll be able to invite instructors and students after setup
          </div>

          <q-form ref="formRef" @submit="onSubmit" class="q-gutter-md" greedy>
            <!-- Gym Name -->
            <q-input
              v-model="gymName"
              label="Gym Name"
              hint="e.g., Elite Brazilian Jiu-Jitsu Academy"
              :rules="[val => !!val || 'Gym name is required']"
              filled
              lazy-rules
              clearable
              autofocus
            >
              <template v-slot:prepend>
                <q-icon name="business" />
              </template>
            </q-input>

            <!-- Locations -->
            <div>
              <div class="text-subtitle2 q-mb-sm">
                Gym Locations
                <q-badge v-if="locations.length > 0" color="primary" class="q-ml-sm">
                  {{ locations.length }}
                </q-badge>
              </div>
              
              <q-list v-if="locations.length > 0" bordered separator class="rounded-borders">
                <q-item v-for="(location, index) in locations" :key="index" class="q-py-sm">
                  <q-item-section avatar>
                    <q-icon name="place" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">{{ location.name }}</q-item-label>
                    <q-item-label caption lines="2">{{ location.address }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      @click="removeLocation(index)"
                    >
                      <q-tooltip>Remove location</q-tooltip>
                    </q-btn>
                  </q-item-section>
                </q-item>
              </q-list>

              <!-- Add Location Card -->
              <q-card flat bordered class="q-mt-md">
                <q-card-section>
                  <div class="text-subtitle2 q-mb-md">Add New Location</div>
                  <div class="q-gutter-sm">
                    <q-input
                      v-model="newLocation.name"
                      label="Location Name"
                      placeholder="e.g., North, South, Downtown"
                      filled
                      dense
                    >
                      <template v-slot:prepend>
                        <q-icon name="location_city" />
                      </template>
                    </q-input>
                    <q-input
                      v-model="newLocation.address"
                      label="Address"
                      placeholder="123 Main St, City, State"
                      filled
                      dense
                    >
                      <template v-slot:prepend>
                        <q-icon name="place" />
                      </template>
                    </q-input>
                  </div>
                </q-card-section>
                <q-card-actions>
                  <q-btn
                    label="Add Location"
                    icon="add"
                    color="primary"
                    @click="addLocation"
                    :disable="!newLocation.name || !newLocation.address"
                    class="full-width"
                    unelevated
                  />
                </q-card-actions>
              </q-card>

              <q-banner 
                v-if="locations.length === 0" 
                class="bg-warning text-white q-mt-sm"
                dense
                rounded
              >
                <template v-slot:avatar>
                  <q-icon name="warning" />
                </template>
                Please add at least one location
              </q-banner>
            </div>

            <!-- Default Settings (optional customization) -->
            <q-card flat bordered class="q-mt-lg">
              <q-card-section>
                <div class="text-subtitle2 q-mb-md">Initial Settings</div>
                <div class="text-caption text-grey-7 q-mb-md">
                  You can change these anytime in settings
                </div>
                
                <q-list>
                  <q-item tag="label" v-ripple>
                    <q-item-section avatar>
                      <q-toggle
                        v-model="settings.studentsCanMessage"
                        color="primary"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>Student Messaging</q-item-label>
                      <q-item-label caption>
                        Allow students to message each other directly
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item tag="label" v-ripple>
                    <q-item-section avatar>
                      <q-toggle
                        v-model="settings.studentsCanCreateGroups"
                        color="primary"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>Student Groups</q-item-label>
                      <q-item-label caption>
                        Allow students to create group chats
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-separator spaced />

                  <q-item>
                    <q-item-section avatar>
                      <q-toggle
                        v-model="settings.instructorsCanCreateClasses"
                        color="positive"
                        disable
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>Instructor Class Creation</q-item-label>
                      <q-item-label caption>
                        Enabled by default
                      </q-item-label>
                    </q-item-section>
                  </q-item>

                  <q-item>
                    <q-item-section avatar>
                      <q-toggle
                        v-model="settings.aiEnabled"
                        color="primary"
                        disable
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>AI Assistant</q-item-label>
                      <q-item-label caption>
                        Smart scheduling and messaging help
                      </q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>

            <!-- Submit -->
            <div class="q-mt-lg">
              <q-btn
                type="submit"
                color="primary"
                label="Create Gym & Continue"
                class="full-width"
                :loading="loading"
                :disable="loading || locations.length === 0"
                size="lg"
                unelevated
                no-caps
              >
                <template v-slot:loading>
                  <q-spinner-hourglass />
                </template>
              </q-btn>
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useGym } from '../composables/useGym';
import { user, profile, loadProfile } from '../state/auth';
import { supabase } from '../boot/supabase';
import { useQuasar, QForm } from 'quasar';

const router = useRouter();
const $q = useQuasar();
const { createGym } = useGym();

const formRef = ref<QForm>();

const gymName = ref('');
const locations = ref<Array<{ name: string; address: string }>>([]);
const newLocation = ref({ name: '', address: '' });
const settings = ref({
  studentsCanMessage: false,
  studentsCanCreateGroups: false,
  instructorsCanCreateClasses: true,
  instructorsEditOwnOnly: true,
  aiEnabled: true,
  aiAutoRespond: true
});
const loading = ref(false);

function addLocation() {
  if (newLocation.value.name && newLocation.value.address) {
    locations.value.push({ ...newLocation.value });
    newLocation.value = { name: '', address: '' };
    
    $q.notify({
      type: 'positive',
      message: 'Location added',
      timeout: 1000
    });
  }
}

function removeLocation(index: number) {
  const location = locations.value[index];
  if (!location) return;
  
  const locationName = location.name;
  
  $q.dialog({
    title: 'Remove Location',
    message: `Remove ${locationName}?`,
    cancel: true,
    persistent: false
  }).onOk(() => {
    locations.value.splice(index, 1);
    $q.notify({
      type: 'info',
      message: 'Location removed',
      timeout: 1000
    });
  });
}

async function onSubmit() {
  // Validate form first
  const valid = await formRef.value?.validate();
  if (!valid) return;

  if (!user.value?.id) {
    $q.notify({
      type: 'negative',
      message: 'You must be logged in to create a gym'
    });
    return;
  }

  if (locations.value.length === 0) {
    $q.notify({
      type: 'negative',
      message: 'Please add at least one location'
    });
    return;
  }

  loading.value = true;

  try {
    // Create gym
    const { data: gym, error: gymError } = await createGym({
      name: gymName.value,
      owner_id: user.value.id,
      locations: locations.value,
      settings: settings.value
    });

    if (gymError) throw gymError;

    if (!gym) {
      throw new Error('Failed to create gym');
    }

    // Update user profile with gym_id, role, and owned_gym_ids
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        gym_id: gym.id,
        role: 'owner',
        owned_gym_ids: [gym.id] // Initialize owned_gym_ids array
      })
      .eq('id', user.value.id);

    if (profileError) throw profileError;

    // Reload profile to get updated gym_id and role
    await loadProfile();
    
    console.log('✅ Profile reloaded:', {
      role: (profile.value as any)?.role,
      gym_id: (profile.value as any)?.gym_id
    });

    $q.notify({
      type: 'positive',
      message: `${gym.name} created successfully! 🎉`,
      timeout: 2000
    });

    // Redirect to owner dashboard
    void router.push('/dashboard');
  } catch (err) {
    console.error('Error creating gym:', err);
    $q.notify({
      type: 'negative',
      message: (err as Error).message || 'Failed to create gym',
      timeout: 3000
    });
  } finally {
    loading.value = false;
  }
}
</script>

