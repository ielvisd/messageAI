<template>
  <q-page class="q-pa-md">
    <div style="max-width: 800px; margin: 0 auto;">
      <div class="text-h4 q-mb-lg">Gym Settings</div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner color="primary" size="3em" />
      </div>

      <!-- Settings Sections -->
      <div v-else class="q-gutter-md">
        <!-- Gym Switcher -->
        <q-card flat bordered v-if="ownedGyms.length > 1">
          <q-card-section>
            <div class="text-h6 q-mb-md">Manage Gyms</div>
            <div class="text-caption text-grey-7 q-mb-md">
              You own multiple gyms. Switch between them or create a new one.
            </div>
          </q-card-section>
          
          <q-card-section>
            <div class="text-subtitle2 q-mb-md">Your Gyms ({{ ownedGyms.length }})</div>
            <q-list bordered separator>
              <q-item 
                v-for="gym in ownedGyms" 
                :key="gym.id"
                clickable
                @click="switchGym(gym.id)"
                :active="gym.id === currentGymId"
              >
                <q-item-section avatar>
                  <q-avatar color="primary" text-color="white">
                    <q-icon :name="gym.id === currentGymId ? 'check_circle' : 'business'" />
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ gym.name }}</q-item-label>
                  <q-item-label caption>
                    {{ gym.members_count }} member{{ gym.members_count !== 1 ? 's' : '' }}
                  </q-item-label>
                  <q-item-label caption v-if="gym.locations && gym.locations.length">
                    {{ gym.locations.length }} location{{ gym.locations.length !== 1 ? 's' : '' }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side v-if="gym.id === currentGymId">
                  <q-badge color="positive">Active</q-badge>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
          
          <q-card-actions>
            <q-btn 
              label="Create New Gym" 
              icon="add" 
              color="primary"
              unelevated
              no-caps
              @click="showCreateGymDialog = true"
            />
          </q-card-actions>
        </q-card>

        <!-- Gym Details -->
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Gym Details</div>
            
            <q-input
              v-model="gymName"
              label="Gym Name"
              filled
              class="q-mb-md"
            />

            <div class="text-subtitle2 q-mb-sm">Locations</div>
            <q-list bordered>
              <q-item v-for="(location, index) in locations" :key="index">
                <q-item-section>
                  <q-item-label>{{ location.name }}</q-item-label>
                  <q-item-label caption>{{ location.address }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    @click="removeLocation(index)"
                  />
                </q-item-section>
              </q-item>
            </q-list>

            <div class="q-mt-md q-gutter-sm">
              <q-input
                v-model="newLocation.name"
                label="Location Name"
                dense
                filled
              />
              <q-input
                v-model="newLocation.address"
                label="Address"
                dense
                filled
              />
              <q-btn
                label="Add Location"
                icon="add"
                outline
                @click="addLocation"
                :disable="!newLocation.name || !newLocation.address"
              />
            </div>

            <q-btn
              label="Save Gym Details"
              color="primary"
              class="q-mt-md"
              @click="saveGymDetails"
              :loading="savingDetails"
            />
          </q-card-section>
        </q-card>

        <!-- Messaging Rules -->
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Messaging Rules</div>
            
            <q-toggle
              v-model="settings.studentsCanMessage"
              label="Students can message each other directly"
              class="q-mb-sm"
            />
            <div class="text-caption text-grey-7 q-ml-xl q-mb-md">
              When enabled, students can start 1-on-1 chats with other students
            </div>

            <q-toggle
              v-model="settings.studentsCanCreateGroups"
              label="Students can create group chats"
              class="q-mb-sm"
            />
            <div class="text-caption text-grey-7 q-ml-xl q-mb-md">
              When enabled, students can create their own study/training groups
            </div>

            <q-btn
              label="Save Messaging Rules"
              color="primary"
              class="q-mt-md"
              @click="saveSettings"
              :loading="savingSettings"
            />
          </q-card-section>
        </q-card>

        <!-- Schedule Permissions -->
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">Schedule Permissions</div>
            
            <q-toggle
              v-model="settings.autoNoteOnOverfullOrUnrsvp"
              label="Auto-create instructor note for walk-ins or full-class check-ins"
              class="q-mb-sm"
            />
            <div class="text-caption text-grey-7 q-ml-xl q-mb-md">
              When enabled, checking in without RSVP or when class is at capacity will add an instructor note automatically.
            </div>

            <q-toggle
              v-model="settings.instructorsCanCreateClasses"
              label="Instructors can create new classes"
              class="q-mb-sm"
            />
            <div class="text-caption text-grey-7 q-ml-xl q-mb-md">
              When enabled, instructors can add classes to the schedule
            </div>

            <q-toggle
              v-model="settings.instructorsEditOwnOnly"
              label="Instructors can only edit their own classes"
              class="q-mb-sm"
            />
            <div class="text-caption text-grey-7 q-ml-xl q-mb-md">
              When enabled, instructors cannot modify other instructors' classes
            </div>

            <q-btn
              label="Save Schedule Permissions"
              color="primary"
              class="q-mt-md"
              @click="saveSettings"
              :loading="savingSettings"
            />
          </q-card-section>
        </q-card>

        <!-- AI Features -->
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">AI Features</div>
            
            <q-toggle
              v-model="settings.aiEnabled"
              label="Enable AI Assistant for all roles"
              class="q-mb-sm"
            />
            <div class="text-caption text-grey-7 q-ml-xl q-mb-md">
              AI can answer schedule questions, provide recommendations, and help with RSVPs
            </div>

            <q-toggle
              v-model="settings.aiAutoRespond"
              label="AI can auto-respond to common schedule questions"
              class="q-mb-sm"
            />
            <div class="text-caption text-grey-7 q-ml-xl q-mb-md">
              AI will automatically suggest answers to frequently asked questions
            </div>

            <q-btn
              label="Save AI Settings"
              color="primary"
              class="q-mt-md"
              @click="saveSettings"
              :loading="savingSettings"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Create New Gym Dialog -->
    <q-dialog v-model="showCreateGymDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Create New Gym</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="newGymForm.name"
            label="Gym Name"
            outlined
            class="q-mb-md"
          />

          <div class="text-subtitle2 q-mb-sm">Initial Location</div>
          <q-input
            v-model="newGymForm.locationName"
            label="Location Name"
            outlined
            class="q-mb-md"
          />
          <q-input
            v-model="newGymForm.locationAddress"
            label="Address"
            outlined
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn 
            label="Create Gym" 
            color="primary"
            unelevated
            :loading="creatingGym"
            :disable="!newGymForm.name || !newGymForm.locationName || !newGymForm.locationAddress"
            @click="createNewGym"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGymSettings } from '../composables/useGymSettings';
import { useGym } from '../composables/useGym';
import { useGymSwitcher } from '../composables/useGymSwitcher';
import { user } from '../state/auth';
import { Notify } from 'quasar';

const gymId = computed(() => (user.value as any)?.gym_id || '');

const { settings, fetchSettings, updateSettings } = useGymSettings(gymId.value);
const { gym, fetchGym, updateGym } = useGym(gymId.value);
const { ownedGyms, currentGymId, loadOwnedGyms, switchGym: switchToGym, createNewGym: createGym } = useGymSwitcher();

const loading = ref(false);
const savingSettings = ref(false);
const savingDetails = ref(false);

const gymName = ref('');
const locations = ref<Array<{ name: string; address: string }>>([]);
const newLocation = ref({ name: '', address: '' });

// Gym switcher
const showCreateGymDialog = ref(false);
const creatingGym = ref(false);
const newGymForm = ref({
  name: '',
  locationName: '',
  locationAddress: ''
});

function addLocation() {
  if (newLocation.value.name && newLocation.value.address) {
    locations.value.push({ ...newLocation.value });
    newLocation.value = { name: '', address: '' };
  }
}

function removeLocation(index: number) {
  locations.value.splice(index, 1);
}

async function saveGymDetails() {
  savingDetails.value = true;

  try {
    const { error } = await updateGym(gymId.value, {
      name: gymName.value,
      locations: locations.value
    });

    if (error) throw error;

    Notify.create({
      type: 'positive',
      message: 'Gym details updated successfully'
    });
  } catch (err) {
    console.error('Error saving gym details:', err);
    Notify.create({
      type: 'negative',
      message: (err as Error).message || 'Failed to save gym details'
    });
  } finally {
    savingDetails.value = false;
  }
}

async function saveSettings() {
  savingSettings.value = true;

  try {
    const { error } = await updateSettings(gymId.value, settings.value);

    if (error) throw error;

    Notify.create({
      type: 'positive',
      message: 'Settings updated successfully'
    });
  } catch (err) {
    console.error('Error saving settings:', err);
    Notify.create({
      type: 'negative',
      message: (err as Error).message || 'Failed to save settings'
    });
  } finally {
    savingSettings.value = false;
  }
}

async function loadData() {
  loading.value = true;

  try {
    await fetchGym(gymId.value);
    await fetchSettings(gymId.value);
    await loadOwnedGyms();

    if (gym.value) {
      gymName.value = gym.value.name || '';
      locations.value = (gym.value.locations as any[]) || [];
    }
  } catch (err) {
    console.error('Error loading data:', err);
  } finally {
    loading.value = false;
  }
}

async function switchGym(gymId: string) {
  try {
    await switchToGym(gymId);
    Notify.create({
      type: 'positive',
      message: 'Switched gym successfully'
    });
    // Reload data for new gym
    void loadData();
  } catch (err) {
    console.error('Error switching gym:', err);
    Notify.create({
      type: 'negative',
      message: 'Failed to switch gym'
    });
  }
}

async function createNewGym() {
  creatingGym.value = true;

  try {
    const result = await createGym({
      name: newGymForm.value.name,
      locations: [{
        name: newGymForm.value.locationName,
        address: newGymForm.value.locationAddress
      }]
    });

    if (result.success) {
      Notify.create({
        type: 'positive',
        message: `${result.gym.name} created successfully!`
      });
      showCreateGymDialog.value = false;
      newGymForm.value = { name: '', locationName: '', locationAddress: '' };
      // Reload data for new gym
      void loadData();
    }
  } catch (err) {
    console.error('Error creating gym:', err);
    Notify.create({
      type: 'negative',
      message: (err as Error).message || 'Failed to create gym'
    });
  } finally {
    creatingGym.value = false;
  }
}

onMounted(() => {
  if (gymId.value) {
    void loadData();
  }
});
</script>

