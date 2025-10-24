<template>
  <q-page class="q-pa-md">
    <div class="q-gutter-md">
      <!-- Header -->
      <div class="row items-center justify-between">
        <div class="text-h4">{{ gym?.name || 'Dashboard' }}</div>
        <q-btn
          icon="settings"
          flat
          round
          @click="$router.push('/settings')"
          v-if="isOwner"
        >
          <q-tooltip>Gym Settings</q-tooltip>
        </q-btn>
      </div>

      <!-- Tabs -->
      <q-tabs
        v-model="tab"
        dense
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="justify"
        narrow-indicator
      >
        <q-tab name="overview" label="Overview" />
        <q-tab name="schedule" label="Schedule" />
        <q-tab name="members" label="Members" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <!-- Overview Tab -->
        <q-tab-panel name="overview">
          <div class="row q-col-gutter-md">
            <!-- Stats Cards -->
            <div class="col-12 col-md-4">
              <q-card>
                <q-card-section>
                  <div class="text-h6">Total Students</div>
                  <div class="text-h3 text-primary">{{ stats.students }}</div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-4">
              <q-card>
                <q-card-section>
                  <div class="text-h6">Instructors</div>
                  <div class="text-h3 text-primary">{{ stats.instructors }}</div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-4">
              <q-card>
                <q-card-section>
                  <div class="text-h6">Active Classes</div>
                  <div class="text-h3 text-primary">{{ stats.classes }}</div>
                </q-card-section>
              </q-card>
            </div>

            <!-- QR Code Section -->
            <div class="col-12">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-h6">Gym QR Code</div>
                <div class="text-caption text-grey-7">Students can scan this to join your gym</div>
              </q-card-section>
              
              <q-card-section class="text-center">
                <div v-if="qrCodeURL">
                  <img :src="qrCodeURL" alt="Gym QR Code" style="max-width: 300px; width: 100%;" />
                  
                  <!-- Join Link -->
                  <div class="q-mt-md">
                    <div class="text-caption text-grey-7 q-mb-xs">Join Link</div>
                    <q-input
                      :model-value="joinURL"
                      readonly
                      outlined
                      dense
                      class="text-center"
                    >
                      <template v-slot:append>
                        <q-btn
                          icon="content_copy"
                          flat
                          dense
                          round
                          @click="copyJoinURL"
                        >
                          <q-tooltip>Copy Link</q-tooltip>
                        </q-btn>
                      </template>
                    </q-input>
                  </div>
                </div>
                <div v-else class="q-pa-md">
                  <q-spinner-hourglass color="primary" size="50px" />
                  <div class="text-caption q-mt-sm">Loading QR code...</div>
                </div>
                
                <div class="q-mt-md q-gutter-sm">
                  <q-btn
                    label="Print Flyer"
                    icon="print"
                    color="primary"
                    unelevated
                    @click="printFlyer"
                    :disable="!qrCodeURL"
                  />
                  <q-btn
                    label="Download QR"
                    icon="download"
                    outline
                    color="primary"
                    @click="downloadQR"
                    :disable="!qrCodeURL"
                  />
                  <q-btn
                    label="Regenerate"
                    icon="refresh"
                    outline
                    color="primary"
                    @click="regenerateQR"
                    :loading="regeneratingQR"
                  />
                </div>
              </q-card-section>
                
                <q-card-section>
                  <q-toggle 
                    v-model="requireApproval" 
                    label="Require admin approval for new members"
                    @update:model-value="updateApprovalSetting"
                  />
                </q-card-section>
                
                <!-- Show pending requests if approval is enabled -->
                <q-card-section v-if="requireApproval && pendingRequests.length > 0">
                  <div class="text-subtitle2 q-mb-md">Pending Join Requests ({{ pendingRequests.length }})</div>
                  <q-list separator>
                    <q-item v-for="request in pendingRequests" :key="request.id">
                      <q-item-section avatar>
                        <q-avatar>
                          <img v-if="request.profiles?.avatar_url" :src="request.profiles.avatar_url" />
                          <q-icon v-else name="person" />
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ request.profiles?.name || 'Unknown' }}</q-item-label>
                        <q-item-label caption>{{ request.profiles?.email }}</q-item-label>
                        <q-item-label caption class="text-grey-6">
                          Requested {{ formatDate(request.created_at) }}
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <div class="q-gutter-xs">
                          <q-btn
                            color="positive"
                            icon="check"
                            round
                            dense
                            @click="approveRequest(request.id)"
                          >
                            <q-tooltip>Approve</q-tooltip>
                          </q-btn>
                          <q-btn
                            color="negative"
                            icon="close"
                            round
                            dense
                            @click="rejectRequest(request.id)"
                          >
                            <q-tooltip>Reject</q-tooltip>
                          </q-btn>
                        </div>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>

            <!-- Quick Actions -->
            <div class="col-12">
              <q-card>
                <q-card-section>
                  <div class="text-h6 q-mb-md">Quick Actions</div>
                  <div class="row q-col-gutter-sm">
                    <div class="col-12 col-sm-6">
                      <q-btn
                        label="Invite User"
                        icon="person_add"
                        color="primary"
                        class="full-width"
                        @click="showInviteDialog = true"
                      />
                    </div>
                    <div class="col-12 col-sm-6">
                      <q-btn
                        label="Create Class"
                        icon="add"
                        color="primary"
                        outline
                        class="full-width"
                        @click="showScheduleEditor = true"
                      />
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-tab-panel>

        <!-- Schedule Tab -->
        <q-tab-panel name="schedule">
          <ScheduleCalendar
            :gym-id="gymId"
            :editable="true"
            @edit-schedule="editSchedule"
            @create-schedule="showScheduleEditor = true"
          />
        </q-tab-panel>

        <!-- Members Tab -->
        <q-tab-panel name="members">
          <MembersList
            :gym-id="gymId"
            @invite="showInviteDialog = true"
          />
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- Invite Dialog -->
    <InviteUserDialog
      v-model="showInviteDialog"
      :gym-id="gymId"
    />

    <!-- Schedule Editor Dialog -->
    <ScheduleEditorDialog
      v-model="showScheduleEditor"
      :gym-id="gymId"
      :schedule-id="editingScheduleId"
      @saved="onScheduleSaved"
    />

    <!-- Print Flyer Dialog -->
    <q-dialog v-model="showPrintDialog" full-width>
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Print Gym Join Flyer</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <div id="print-flyer" class="print-flyer">
            <div class="text-center q-pa-xl">
              <!-- Gym Name -->
              <h1 class="text-h3 q-mb-md" style="color: #1976D2;">{{ gym?.name || 'Join Our Gym' }}</h1>
              
              <!-- Tagline -->
              <p class="text-h6 text-grey-7 q-mb-xl">
                Scan the QR code to join our community
              </p>
              
              <!-- QR Code -->
              <div class="q-mb-xl">
                <img :src="qrCodeURL" alt="Join QR Code" style="width: 400px; height: 400px;" />
              </div>
              
              <!-- Join URL -->
              <div class="q-mb-lg">
                <div class="text-subtitle2 text-grey-7 q-mb-sm">Or visit:</div>
                <div class="text-h6 text-weight-bold" style="word-break: break-all;">
                  {{ joinURL }}
                </div>
              </div>
              
              <!-- Locations -->
              <div v-if="gym?.locations && (gym.locations as any[]).length" class="q-mt-xl">
                <div class="text-h6 q-mb-md">Our Locations</div>
                <div v-for="(location, index) in (gym.locations as any[])" :key="index" class="q-mb-sm">
                  <div class="text-weight-bold">{{ (location as any).name }}</div>
                  <div class="text-grey-7">{{ (location as any).address }}</div>
                </div>
              </div>
              
              <!-- Footer -->
              <div class="q-mt-xl text-caption text-grey-6">
                Questions? Contact your gym administrator
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn label="Cancel" flat v-close-popup />
          <q-btn 
            label="Print" 
            color="primary" 
            unelevated
            icon="print"
            @click="doPrint"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useGym } from '../composables/useGym';
import { useRoles } from '../composables/useRoles';
import { useGymQR } from '../composables/useGymQR';
import { profile } from '../state/auth';
import { supabase } from '../boot/supabase';
import ScheduleCalendar from '../components/ScheduleCalendar.vue';
import MembersList from '../components/MembersList.vue';
import InviteUserDialog from '../components/InviteUserDialog.vue';
import ScheduleEditorDialog from '../components/ScheduleEditorDialog.vue';

const $q = useQuasar();
const { isOwner } = useRoles();
const { generateQRCodeURL, regenerateQRToken, getPendingRequests, handleJoinRequest } = useGymQR();

const gymId = computed(() => (profile.value as any)?.gym_id || '');
const { gym, fetchGym } = useGym(gymId.value);

const tab = ref('overview');
const stats = ref({
  students: 0,
  instructors: 0,
  classes: 0
});

const showInviteDialog = ref(false);
const showScheduleEditor = ref(false);
const editingScheduleId = ref<string | null>(null);

// QR Code related
const qrCodeURL = ref<string>('');
const joinURL = ref<string>('');
const regeneratingQR = ref(false);
const requireApproval = ref(false);
const pendingRequests = ref<any[]>([]);
const showPrintDialog = ref(false);

async function loadStats() {
  if (!gymId.value) return;

  try {
    // Count students
    const { count: studentCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId.value)
      .eq('role', 'student');

    // Count instructors
    const { count: instructorCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId.value)
      .eq('role', 'instructor');

    // Count active classes
    const { count: classCount } = await supabase
      .from('gym_schedules')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId.value)
      .eq('is_active', true);

    stats.value = {
      students: studentCount || 0,
      instructors: instructorCount || 0,
      classes: classCount || 0
    };
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

function editSchedule(scheduleId: string) {
  editingScheduleId.value = scheduleId;
  showScheduleEditor.value = true;
}

function onScheduleSaved() {
  showScheduleEditor.value = false;
  editingScheduleId.value = null;
  void loadStats(); // Refresh stats
}

// QR Code functions
async function loadQRCode() {
  if (!gymId.value) {
    console.error('❌ No gymId available');
    return;
  }
  
  console.log('🔄 Loading QR code for gymId:', gymId.value);
  
  try {
    const url = await generateQRCodeURL(gymId.value);
    console.log('✅ QR code generated successfully:', url.substring(0, 50) + '...');
    qrCodeURL.value = url;
    
    // Also get the join URL
    const { getJoinURL } = useGymQR();
    joinURL.value = await getJoinURL(gymId.value);
  } catch (err) {
    console.error('❌ Error loading QR code:', err);
    $q.notify({
      type: 'negative',
      message: 'Failed to load QR code: ' + (err as Error).message
    });
  }
}

function copyJoinURL() {
  void navigator.clipboard.writeText(joinURL.value);
  $q.notify({
    type: 'positive',
    message: 'Join link copied to clipboard!',
    icon: 'content_copy',
    timeout: 1500
  });
}

function printFlyer() {
  showPrintDialog.value = true;
}

function doPrint() {
  // Wait a tick for dialog to render fully
  setTimeout(() => {
    window.print();
  }, 100);
}

function regenerateQR() {
  if (!gymId.value) return;
  
  $q.dialog({
    title: 'Regenerate QR Code',
    message: 'This will invalidate the current QR code. Students using the old QR code will no longer be able to join. Continue?',
    cancel: true,
    persistent: false
  }).onOk(() => {
    void (async () => {
      try {
        regeneratingQR.value = true;
        await regenerateQRToken(gymId.value);
        await loadQRCode();
        $q.notify({
          type: 'positive',
          message: 'QR code regenerated successfully'
        });
      } catch (err) {
        console.error('Error regenerating QR code:', err);
        $q.notify({
          type: 'negative',
          message: 'Failed to regenerate QR code'
        });
      } finally {
        regeneratingQR.value = false;
      }
    })();
  });
}

function downloadQR() {
  if (!qrCodeURL.value) return;
  
  const link = document.createElement('a');
  link.download = `${gym.value?.name || 'gym'}-qr-code.png`;
  link.href = qrCodeURL.value;
  link.click();
  
  $q.notify({
    type: 'positive',
    message: 'QR code downloaded'
  });
}

async function updateApprovalSetting(value: boolean) {
  if (!gymId.value) return;
  
  try {
    const { error } = await supabase
      .from('gyms')
      .update({ require_approval: value })
      .eq('id', gymId.value);
    
    if (error) throw error;
    
    $q.notify({
      type: 'positive',
      message: value ? 'Approval required for new members' : 'New members can join instantly'
    });
    
    if (value) {
      void loadPendingRequests();
    }
  } catch (err) {
    console.error('Error updating approval setting:', err);
    $q.notify({
      type: 'negative',
      message: 'Failed to update approval setting'
    });
    requireApproval.value = !value; // Revert on error
  }
}

async function loadPendingRequests() {
  if (!gymId.value || !requireApproval.value) return;
  
  try {
    const requests = await getPendingRequests(gymId.value);
    pendingRequests.value = requests;
  } catch (err) {
    console.error('Error loading pending requests:', err);
  }
}

async function approveRequest(requestId: string) {
  try {
    await handleJoinRequest(requestId, true);
    $q.notify({
      type: 'positive',
      message: 'Request approved'
    });
    void loadPendingRequests();
    void loadStats(); // Refresh member count
  } catch (err) {
    console.error('Error approving request:', err);
    $q.notify({
      type: 'negative',
      message: 'Failed to approve request'
    });
  }
}

function rejectRequest(requestId: string) {
  $q.dialog({
    title: 'Reject Request',
    message: 'Are you sure you want to reject this join request?',
    cancel: true,
    persistent: false
  }).onOk(() => {
    void (async () => {
      try {
        await handleJoinRequest(requestId, false);
        $q.notify({
          type: 'info',
          message: 'Request rejected'
        });
        void loadPendingRequests();
      } catch (err) {
        console.error('Error rejecting request:', err);
        $q.notify({
          type: 'negative',
          message: 'Failed to reject request'
        });
      }
    })();
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

async function loadGymSettings() {
  if (!gymId.value) return;
  
  try {
    const { data, error } = await supabase
      .from('gyms')
      .select('require_approval')
      .eq('id', gymId.value)
      .single();
    
    if (error) throw error;
    if (data) {
      requireApproval.value = data.require_approval || false;
      if (requireApproval.value) {
        void loadPendingRequests();
      }
    }
  } catch (err) {
    console.error('Error loading gym settings:', err);
  }
}

onMounted(() => {
  console.log('🚀 OwnerDashboard mounted');
  console.log('🚀 Profile:', profile.value);
  console.log('🚀 GymId from profile:', gymId.value);
  
  if (gymId.value) {
    console.log('✅ GymId found, loading dashboard data...');
    void fetchGym(gymId.value);
    void loadStats();
    void loadQRCode();
    void loadGymSettings();
  } else {
    console.error('❌ No gymId found in profile!');
  }
});
</script>

<style lang="scss" scoped>
// Print styles for the flyer
@media print {
  body * {
    visibility: hidden;
  }
  
  #print-flyer,
  #print-flyer * {
    visibility: visible;
  }
  
  #print-flyer {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    background: white;
    padding: 2rem;
  }
  
  .print-flyer {
    page-break-inside: avoid;
  }
  
  // Hide dialog controls when printing
  .q-dialog__backdrop,
  .q-card__actions {
    display: none !important;
  }
}

// Regular screen styles
.print-flyer {
  background: white;
  min-height: 600px;
}
</style>

