<template>
  <q-page class="q-pa-md">
    <div style="max-width: 1000px; margin: 0 auto;">
      <!-- Header with Gym Switcher -->
      <div class="row items-center q-mb-lg">
        <div class="col">
          <div class="text-h4">Settings</div>
          <div class="text-subtitle2 text-grey-7" v-if="gym">{{ gym.name }}</div>
        </div>
        <div class="col-auto" v-if="ownedGyms.length > 1">
          <q-btn-dropdown
            color="primary"
            :label="gym?.name || 'Select Gym'"
            icon="business"
            unelevated
            no-caps
          >
            <q-list>
              <q-item
                v-for="g in ownedGyms"
                :key="g.id"
                clickable
                v-close-popup
                @click="switchGym(g.id)"
                :active="g.id === currentGymId"
              >
                <q-item-section avatar>
                  <q-icon :name="g.id === currentGymId ? 'check_circle' : 'business'" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ g.name }}</q-item-label>
                  <q-item-label caption>{{ g.members_count }} members</q-item-label>
                </q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="showCreateGymDialog = true">
                <q-item-section avatar>
                  <q-icon name="add_circle" color="positive" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Create New Gym</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-center q-pa-xl">
        <q-spinner color="primary" size="3em" />
      </div>

      <!-- Tabbed Settings -->
      <div v-else>
        <q-tabs
          v-model="activeTab"
          dense
          class="text-grey-7"
          active-color="primary"
          indicator-color="primary"
          align="left"
          narrow-indicator
        >
          <q-tab name="general" icon="settings" label="General" no-caps />
          <q-tab name="ai" icon="smart_toy" label="AI Monitoring" no-caps>
            <q-badge v-if="aiPrefs.severityFilter !== 'warning'" color="info" floating>Custom</q-badge>
          </q-tab>
          <q-tab name="permissions" icon="admin_panel_settings" label="Permissions" no-caps />
          <q-tab name="members" icon="people" label="Member Requests" no-caps>
            <q-badge v-if="pendingRequests.length > 0" color="negative" floating>{{ pendingRequests.length }}</q-badge>
          </q-tab>
        </q-tabs>

        <q-separator class="q-mb-md" />

        <q-tab-panels v-model="activeTab" animated transition-prev="slide-down" transition-next="slide-up">
          <!-- General Tab -->
          <q-tab-panel name="general" class="q-pa-none">
            <div class="q-gutter-md">
              <!-- Gym Details Card -->
              <q-card flat bordered>
                <q-card-section>
                  <div class="row items-center q-mb-md">
                    <q-icon name="business" size="sm" class="q-mr-sm" color="primary" />
                    <div class="text-h6">Gym Details</div>
                  </div>
                  
                  <q-input
                    v-model="gymName"
                    label="Gym Name"
                    filled
                    dense
                    class="q-mb-md"
                    :rules="[val => val && val.length > 0 || 'Name is required']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="edit" />
                    </template>
                  </q-input>

                  <div class="text-subtitle2 q-mb-md">Locations</div>
                  <q-list bordered separator v-if="locations.length > 0">
                    <q-item v-for="(location, index) in locations" :key="index">
                      <q-item-section avatar>
                        <q-avatar color="grey-3" text-color="grey-7" icon="place" />
                      </q-item-section>
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
                        >
                          <q-tooltip>Remove location</q-tooltip>
                        </q-btn>
                      </q-item-section>
                    </q-item>
                  </q-list>
                  <div v-else class="text-center q-pa-md text-grey-7">
                    <q-icon name="location_off" size="md" />
                    <div class="q-mt-sm">No locations added yet</div>
                  </div>

                  <div class="q-mt-md">
                    <q-expansion-item
                      dense
                      dense-toggle
                      expand-separator
                      icon="add_location"
                      label="Add New Location"
                      header-class="text-primary"
                    >
                      <q-card flat bordered class="q-pa-md q-mt-sm">
                        <div class="q-gutter-sm">
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
                            color="primary"
                            unelevated
                            no-caps
                            @click="addLocation"
                            :disable="!newLocation.name || !newLocation.address"
                          />
                        </div>
                      </q-card>
                    </q-expansion-item>
                  </div>
                </q-card-section>
                
                <q-separator />
                
                <q-card-actions align="right">
                  <q-btn 
                    label="Save Changes" 
                    color="primary" 
                    unelevated
                    no-caps
                    icon="save"
                    @click="saveGymDetails"
                    :loading="savingDetails"
                  />
                </q-card-actions>
              </q-card>

              <!-- QR Code Card -->
              <q-card flat bordered>
                <q-card-section>
                  <div class="row items-center q-mb-md">
                    <q-icon name="qr_code_2" size="sm" class="q-mr-sm" color="primary" />
                    <div class="text-h6">Student Join QR Code</div>
                  </div>
                  <div class="text-caption text-grey-7 q-mb-md">Students can scan this code or use the link to join your gym</div>
                  
                  <div class="row q-col-gutter-md">
                    <div class="col-12 col-md-6">
                      <div class="text-center bg-grey-1 rounded-borders q-pa-md">
                        <div v-if="qrCodeURL">
                          <img :src="qrCodeURL" alt="Gym QR Code" style="max-width: 250px; width: 100%;" class="rounded-borders" />
                        </div>
                        <div v-else class="q-pa-xl">
                          <q-spinner-hourglass color="primary" size="50px" />
                          <div class="text-caption q-mt-sm">Generating...</div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="col-12 col-md-6">
                      <div class="q-gutter-sm">
                        <q-input
                          :model-value="joinURL"
                          readonly
                          filled
                          dense
                          label="Join Link"
                        >
                          <template v-slot:append>
                            <q-btn
                              icon="content_copy"
                              flat
                              dense
                              round
                              @click="copyJoinURL"
                            >
                              <q-tooltip>Copy</q-tooltip>
                            </q-btn>
                          </template>
                        </q-input>
                        
                        <q-btn
                          label="Print Flyer"
                          icon="print"
                          color="primary"
                          unelevated
                          no-caps
                          class="full-width"
                          @click="showPrintDialog = true"
                          :disable="!qrCodeURL"
                        />
                        <q-btn
                          label="Download QR"
                          icon="download"
                          outline
                          color="primary"
                          no-caps
                          class="full-width"
                          @click="downloadQR"
                          :disable="!qrCodeURL"
                        />
                        <q-btn
                          label="Regenerate Code"
                          icon="refresh"
                          outline
                          color="grey-7"
                          no-caps
                          class="full-width"
                          @click="regenerateQR"
                          :loading="regeneratingQR"
                        />
                      </div>
                    </div>
                  </div>
                </q-card-section>
                
                <q-separator />
                
                <q-card-section>
                  <q-toggle 
                    v-model="requireApproval" 
                    label="Require admin approval for new members"
                    color="primary"
                    @update:model-value="updateApprovalSetting"
                  />
                </q-card-section>
              </q-card>
            </div>
          </q-tab-panel>

          <!-- AI Monitoring Tab -->
          <q-tab-panel name="ai" class="q-pa-none">
            <q-card flat bordered>
              <q-card-section>
                <div class="row items-center q-mb-md">
                  <q-icon name="psychology" size="sm" class="q-mr-sm" color="primary" />
                  <div class="text-h6">AI Monitoring Preferences</div>
                </div>
                <div class="text-caption text-grey-7 q-mb-lg">
                  Customize how the AI proactively monitors your gym schedule for problems
                </div>

                <!-- Alert Severity -->
                <div class="q-mb-lg">
                  <div class="text-subtitle1 q-mb-sm">Alert Severity</div>
                  <q-option-group
                    v-model="aiPrefs.severityFilter"
                    :options="[
                      { label: '🚨 Critical Only - Urgent issues requiring immediate attention', value: 'critical' },
                      { label: '⚠️ Critical + Warnings - Most scheduling issues (recommended)', value: 'warning' },
                      { label: 'ℹ️ All Alerts - Including informational messages', value: 'all' }
                    ]"
                    color="primary"
                  />
                </div>

                <q-separator class="q-my-lg" />

                <!-- Check Frequency -->
                <div class="q-mb-lg">
                  <div class="text-subtitle1 q-mb-sm">Check Frequency</div>
                  <div class="text-caption text-grey-7 q-mb-md">
                    How often should the AI scan for scheduling problems?
                  </div>
                  <div class="row items-center q-gutter-md">
                    <div class="col">
                      <q-slider
                        v-model="aiPrefs.checkIntervalMinutes"
                        :min="1"
                        :max="30"
                        :step="1"
                        label
                        label-always
                        :label-value="`${aiPrefs.checkIntervalMinutes} min`"
                        color="primary"
                        markers
                        marker-labels
                      />
                    </div>
                    <div class="col-auto">
                      <q-chip color="primary" text-color="white" icon="schedule">
                        Every {{ aiPrefs.checkIntervalMinutes }} min
                      </q-chip>
                    </div>
                  </div>
                </div>

                <q-separator class="q-my-lg" />

                <!-- Notification Preferences -->
                <div class="q-mb-lg">
                  <div class="text-subtitle1 q-mb-sm">Notification Methods</div>
                  <div class="text-caption text-grey-7 q-mb-md">
                    How should you be notified about new problems?
                  </div>
                  <div class="q-gutter-sm">
                    <q-checkbox 
                      v-model="aiPrefs.browserNotifications" 
                      label="Browser Notifications"
                      color="primary"
                    >
                      <q-tooltip>Requires browser permission</q-tooltip>
                    </q-checkbox>
                    <q-checkbox 
                      v-model="aiPrefs.soundAlerts" 
                      label="Sound Alert"
                      color="primary"
                    />
                    <q-checkbox 
                      v-model="aiPrefs.emailDigest" 
                      label="Daily Email Summary"
                      color="primary"
                    />
                  </div>
                </div>

                <q-separator class="q-my-lg" />

                <!-- Problem Types -->
                <div class="q-mb-lg">
                  <div class="text-subtitle1 q-mb-sm">Problem Types to Monitor</div>
                  <div class="text-caption text-grey-7 q-mb-md">
                    Select which types of issues the AI should detect
                  </div>
                  <div class="q-gutter-sm">
                    <q-checkbox 
                      v-model="aiPrefs.monitorTypes.noInstructor" 
                      label="Classes without assigned instructors"
                      color="primary"
                    />
                    <q-checkbox 
                      v-model="aiPrefs.monitorTypes.overCapacity" 
                      label="Over-capacity classes (too many RSVPs)"
                      color="primary"
                    />
                    <q-checkbox 
                      v-model="aiPrefs.monitorTypes.conflicts" 
                      label="Instructor scheduling conflicts"
                      color="primary"
                    />
                    <q-checkbox 
                      v-model="aiPrefs.monitorTypes.cancelled" 
                      label="Cancelled classes with active RSVPs"
                      color="primary"
                    />
                  </div>
                </div>

                <q-separator class="q-my-lg" />

                <!-- Quiet Hours -->
                <div class="q-mb-lg">
                  <div class="text-subtitle1 q-mb-sm">Quiet Hours</div>
                  <div class="text-caption text-grey-7 q-mb-md">
                    Silence notifications during specific hours (monitoring continues)
                  </div>
                  <q-toggle 
                    v-model="aiPrefs.quietHours.enabled" 
                    label="Enable Quiet Hours" 
                    color="primary"
                    class="q-mb-md"
                  />
                  <div v-if="aiPrefs.quietHours.enabled" class="row q-gutter-md items-center">
                    <q-input 
                      v-model="aiPrefs.quietHours.start" 
                      type="time" 
                      label="From" 
                      filled
                      dense
                      style="max-width: 150px"
                    />
                    <q-icon name="arrow_forward" />
                    <q-input 
                      v-model="aiPrefs.quietHours.end" 
                      type="time" 
                      label="To" 
                      filled
                      dense
                      style="max-width: 150px"
                    />
                    <q-chip color="grey-3" text-color="grey-8" icon="bedtime">
                      {{ formatTime(aiPrefs.quietHours.start) }} - {{ formatTime(aiPrefs.quietHours.end) }}
                    </q-chip>
                  </div>
                </div>

                <q-separator class="q-my-lg" />

                <!-- Widget Behavior -->
                <div>
                  <div class="text-subtitle1 q-mb-sm">Widget Behavior</div>
                  <q-checkbox 
                    v-model="aiPrefs.autoExpand" 
                    label="Auto-expand widget when new alerts appear" 
                    color="primary"
                  />
                </div>
              </q-card-section>

              <q-separator />

              <q-card-actions align="right">
                <q-btn 
                  label="Reset to Defaults" 
                  flat 
                  color="grey-7"
                  no-caps
                  @click="resetAIPreferences"
                />
                <q-btn 
                  label="Save Preferences" 
                  color="primary" 
                  unelevated
                  no-caps
                  icon="save"
                  @click="saveAIPreferences"
                  :loading="savingAIPrefs"
                />
              </q-card-actions>
            </q-card>
          </q-tab-panel>

          <!-- Permissions Tab -->
          <q-tab-panel name="permissions" class="q-pa-none">
            <div class="q-gutter-md">
              <!-- Messaging Rules -->
              <q-card flat bordered>
                <q-card-section>
                  <div class="row items-center q-mb-md">
                    <q-icon name="chat" size="sm" class="q-mr-sm" color="primary" />
                    <div class="text-h6">Messaging Rules</div>
                  </div>
                  
                  <div class="q-gutter-md">
                    <div>
                      <q-toggle
                        v-model="settings.studentsCanMessage"
                        label="Students can message each other directly"
                        color="primary"
                      />
                      <div class="text-caption text-grey-7 q-ml-xl">
                        Allow students to start 1-on-1 chats
                      </div>
                    </div>

                    <div>
                      <q-toggle
                        v-model="settings.studentsCanCreateGroups"
                        label="Students can create group chats"
                        color="primary"
                      />
                      <div class="text-caption text-grey-7 q-ml-xl">
                        Allow students to create study/training groups
                      </div>
                    </div>
                  </div>
                </q-card-section>
                
                <q-separator />
                
                <q-card-actions align="right">
                  <q-btn 
                    label="Save Changes" 
                    color="primary" 
                    unelevated
                    no-caps
                    icon="save"
                    @click="saveSettings"
                    :loading="savingSettings"
                  />
                </q-card-actions>
              </q-card>

              <!-- Schedule Permissions -->
              <q-card flat bordered>
                <q-card-section>
                  <div class="row items-center q-mb-md">
                    <q-icon name="event" size="sm" class="q-mr-sm" color="primary" />
                    <div class="text-h6">Schedule Permissions</div>
                  </div>
                  
                  <div class="q-gutter-md">
                    <div>
                      <q-toggle
                        v-model="settings.autoNoteOnOverfullOrUnrsvp"
                        label="Auto-note for walk-ins and over-capacity check-ins"
                        color="primary"
                      />
                      <div class="text-caption text-grey-7 q-ml-xl">
                        Automatically create instructor note for students checking in without RSVP or when class is full
                      </div>
                    </div>

                    <div>
                      <q-toggle
                        v-model="settings.instructorsCanCreateClasses"
                        label="Instructors can create new classes"
                        color="primary"
                      />
                      <div class="text-caption text-grey-7 q-ml-xl">
                        Allow instructors to add classes to the schedule
                      </div>
                    </div>

                    <div>
                      <q-toggle
                        v-model="settings.instructorsEditOwnOnly"
                        label="Instructors can only edit their own classes"
                        color="primary"
                      />
                      <div class="text-caption text-grey-7 q-ml-xl">
                        Restrict instructors from modifying other instructors' classes
                      </div>
                    </div>
                  </div>
                </q-card-section>
                
                <q-separator />
                
                <q-card-actions align="right">
                  <q-btn 
                    label="Save Changes" 
                    color="primary" 
                    unelevated
                    no-caps
                    icon="save"
                    @click="saveSettings"
                    :loading="savingSettings"
                  />
                </q-card-actions>
              </q-card>

              <!-- AI Features -->
              <q-card flat bordered>
                <q-card-section>
                  <div class="row items-center q-mb-md">
                    <q-icon name="auto_awesome" size="sm" class="q-mr-sm" color="primary" />
                    <div class="text-h6">AI Assistant Features</div>
                  </div>
                  
                  <div class="q-gutter-md">
                    <div>
                      <q-toggle
                        v-model="settings.aiEnabled"
                        label="Enable AI Assistant for all roles"
                        color="primary"
                      />
                      <div class="text-caption text-grey-7 q-ml-xl">
                        AI can answer questions, provide recommendations, and help with RSVPs
                      </div>
                    </div>

                    <div>
                      <q-toggle
                        v-model="settings.aiAutoRespond"
                        label="AI can auto-suggest responses to common questions"
                        color="primary"
                      />
                      <div class="text-caption text-grey-7 q-ml-xl">
                        AI will automatically suggest answers to frequently asked questions
                      </div>
                    </div>
                  </div>
                </q-card-section>
                
                <q-separator />
                
                <q-card-actions align="right">
                  <q-btn 
                    label="Save Changes" 
                    color="primary" 
                    unelevated
                    no-caps
                    icon="save"
                    @click="saveSettings"
                    :loading="savingSettings"
                  />
                </q-card-actions>
              </q-card>
            </div>
          </q-tab-panel>

          <!-- Member Requests Tab -->
          <q-tab-panel name="members" class="q-pa-none">
            <q-card flat bordered>
              <q-card-section>
                <div class="row items-center q-mb-md">
                  <q-icon name="how_to_reg" size="sm" class="q-mr-sm" color="primary" />
                  <div class="text-h6">Pending Member Requests</div>
                </div>
                
                <div v-if="!requireApproval" class="text-center q-pa-xl text-grey-7">
                  <q-icon name="lock_open" size="lg" />
                  <div class="q-mt-md text-body1">Auto-approval is enabled</div>
                  <div class="text-caption">New members join automatically without admin approval</div>
                  <q-btn 
                    label="Enable Approval Required" 
                    color="primary" 
                    flat
                    no-caps
                    class="q-mt-md"
                    @click="requireApproval = true; updateApprovalSetting()"
                  />
                </div>

                <div v-else-if="pendingRequests.length === 0" class="text-center q-pa-xl text-grey-7">
                  <q-icon name="check_circle" size="lg" color="positive" />
                  <div class="q-mt-md text-body1">No pending requests</div>
                  <div class="text-caption">All member requests have been processed</div>
                </div>

                <q-list v-else bordered separator>
                  <q-item v-for="request in pendingRequests" :key="request.id">
                    <q-item-section avatar>
                      <q-avatar size="48px">
                        <img v-if="request.profiles?.avatar_url" :src="request.profiles.avatar_url" />
                        <q-icon v-else name="person" size="md" />
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-weight-medium">
                        {{ request.profiles?.name || 'Unknown' }}
                      </q-item-label>
                      <q-item-label caption>
                        {{ request.profiles?.email }}
                      </q-item-label>
                      <q-item-label caption class="text-grey-6">
                        <q-icon name="schedule" size="xs" />
                        Requested {{ formatDate(request.created_at) }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <div class="row q-gutter-sm">
                        <q-btn
                          label="Approve"
                          color="positive"
                          icon="check"
                          unelevated
                          no-caps
                          @click="approveRequest(request.id)"
                        />
                        <q-btn
                          label="Reject"
                          color="negative"
                          icon="close"
                          outline
                          no-caps
                          @click="rejectRequest(request.id)"
                        />
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-card-section>
            </q-card>
          </q-tab-panel>
        </q-tab-panels>
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
            filled
            class="q-mb-md"
            :rules="[val => val && val.length > 0 || 'Name is required']"
          />

          <div class="text-subtitle2 q-mb-sm">Initial Location</div>
          <q-input
            v-model="newGymForm.locationName"
            label="Location Name"
            filled
            class="q-mb-md"
          />
          <q-input
            v-model="newGymForm.locationAddress"
            label="Address"
            filled
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" no-caps v-close-popup />
          <q-btn 
            label="Create Gym" 
            color="primary"
            unelevated
            no-caps
            :loading="creatingGym"
            :disable="!newGymForm.name || !newGymForm.locationName || !newGymForm.locationAddress"
            @click="createNewGym"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

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
              <h1 class="text-h3 q-mb-md" style="color: #1976D2;">{{ gym?.name || 'Join Our Gym' }}</h1>
              <p class="text-h6 text-grey-7 q-mb-xl">Scan the QR code to join our community</p>
              <div class="q-mb-xl">
                <img :src="qrCodeURL" alt="Join QR Code" style="width: 400px; height: 400px;" />
              </div>
              <div class="q-mb-lg">
                <div class="text-subtitle2 text-grey-7 q-mb-sm">Or visit:</div>
                <div class="text-h6 text-weight-bold" style="word-break: break-all;">{{ joinURL }}</div>
              </div>
              <div v-if="gym?.locations && (gym.locations as any[]).length" class="q-mt-xl">
                <div class="text-h6 q-mb-md">Our Locations</div>
                <div v-for="(location, index) in (gym.locations as any[])" :key="index" class="q-mb-sm">
                  <div class="text-weight-bold">{{ (location as any).name }}</div>
                  <div class="text-grey-7">{{ (location as any).address }}</div>
                </div>
              </div>
              <div class="q-mt-xl text-caption text-grey-6">Questions? Contact your gym administrator</div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn label="Cancel" flat no-caps v-close-popup />
          <q-btn label="Print" color="primary" unelevated no-caps icon="print" @click="doPrint" />
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
import { useGymQR } from '../composables/useGymQR';
import { useAIPreferences } from '../composables/useAIPreferences';
import { user } from '../state/auth';
import { Notify } from 'quasar';

const gymId = computed(() => (user.value as any)?.gym_id || '');

const { settings, fetchSettings, updateSettings } = useGymSettings(gymId.value);
const { gym, fetchGym, updateGym } = useGym(gymId.value);
const { ownedGyms, currentGymId, loadOwnedGyms, switchGym: switchToGym, createNewGym: createGym } = useGymSwitcher();
const { generateQRCodeURL, regenerateQRToken, getPendingRequests, handleJoinRequest } = useGymQR();
const { preferences: aiPrefs, loadPreferences: loadAIPrefs, savePreferences, resetToDefaults } = useAIPreferences();

const activeTab = ref('general');
const loading = ref(false);
const savingSettings = ref(false);
const savingDetails = ref(false);
const savingAIPrefs = ref(false);

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

// QR Code
const qrCodeURL = ref('');
const joinURL = ref('');
const requireApproval = ref(false);
const pendingRequests = ref<any[]>([]);
const regeneratingQR = ref(false);
const showPrintDialog = ref(false);

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
      message: 'Gym details updated successfully',
      icon: 'check_circle'
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
      message: 'Settings updated successfully',
      icon: 'check_circle'
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

// AI Preferences Functions
async function saveAIPreferences() {
  savingAIPrefs.value = true;
  try {
    await savePreferences(aiPrefs.value);
    
    Notify.create({
      type: 'positive',
      message: 'AI monitoring preferences saved',
      caption: 'Changes will take effect immediately',
      icon: 'psychology'
    });
  } catch (err) {
    console.error('Error saving AI preferences:', err);
    Notify.create({
      type: 'negative',
      message: 'Failed to save AI preferences'
    });
  } finally {
    savingAIPrefs.value = false;
  }
}

async function resetAIPreferences() {
  try {
    await resetToDefaults();
    
    Notify.create({
      type: 'info',
      message: 'AI preferences reset to defaults',
      icon: 'restart_alt'
    });
  } catch (err) {
    console.error('Error resetting AI preferences:', err);
    Notify.create({
      type: 'negative',
      message: 'Failed to reset preferences'
    });
  }
}

function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

async function loadData() {
  loading.value = true;

  try {
    await fetchGym(gymId.value);
    await fetchSettings(gymId.value);
    await loadOwnedGyms();
    await loadAIPrefs();

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
      message: 'Switched gym successfully',
      icon: 'swap_horiz'
    });
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
        message: `${result.gym.name} created successfully!`,
        icon: 'add_business'
      });
      showCreateGymDialog.value = false;
      newGymForm.value = { name: '', locationName: '', locationAddress: '' };
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

// QR Code Functions
async function loadQRCode() {
  if (!gymId.value) return;
  
  try {
    const result = await generateQRCodeURL(gymId.value);
    qrCodeURL.value = result.qrCodeURL;
    joinURL.value = result.joinURL;
  } catch (err) {
    console.error('Error loading QR code:', err);
  }
}

async function regenerateQR() {
  if (!gymId.value) return;
  
  regeneratingQR.value = true;
  try {
    await regenerateQRToken(gymId.value);
    await loadQRCode();
    Notify.create({
      type: 'positive',
      message: 'QR code regenerated successfully',
      icon: 'refresh'
    });
  } catch (err) {
    console.error('Error regenerating QR:', err);
    Notify.create({
      type: 'negative',
      message: 'Failed to regenerate QR code'
    });
  } finally {
    regeneratingQR.value = false;
  }
}

function copyJoinURL() {
  void navigator.clipboard.writeText(joinURL.value);
  Notify.create({
    type: 'positive',
    message: 'Join URL copied to clipboard',
    icon: 'content_copy',
    timeout: 1000
  });
}

function downloadQR() {
  const link = document.createElement('a');
  link.download = `${gym.value?.name || 'gym'}-qr-code.png`;
  link.href = qrCodeURL.value;
  link.click();
}

function doPrint() {
  const content = document.getElementById('print-flyer');
  if (!content) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Print Gym Flyer</title>
        <style>
          body { font-family: Arial, sans-serif; }
          @media print {
            body { margin: 0; padding: 20px; }
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

async function updateApprovalSetting() {
  if (!gymId.value) return;
  
  try {
    await updateSettings(gymId.value, { ...settings.value, requireApproval: requireApproval.value });
    Notify.create({
      type: 'positive',
      message: 'Approval setting updated',
      icon: 'verified_user'
    });
    if (requireApproval.value) {
      void loadPendingRequests();
    }
  } catch (err) {
    console.error('Error updating approval setting:', err);
  }
}

async function loadPendingRequests() {
  if (!gymId.value || !requireApproval.value) return;
  
  try {
    pendingRequests.value = await getPendingRequests(gymId.value);
  } catch (err) {
    console.error('Error loading pending requests:', err);
  }
}

async function approveRequest(requestId: string) {
  try {
    await handleJoinRequest(requestId, 'approved');
    Notify.create({
      type: 'positive',
      message: 'Member approved',
      icon: 'check_circle'
    });
    await loadPendingRequests();
  } catch (err) {
    console.error('Error approving request:', err);
    Notify.create({
      type: 'negative',
      message: 'Failed to approve member'
    });
  }
}

async function rejectRequest(requestId: string) {
  try {
    await handleJoinRequest(requestId, 'rejected');
    Notify.create({
      type: 'info',
      message: 'Request rejected',
      icon: 'cancel'
    });
    await loadPendingRequests();
  } catch (err) {
    console.error('Error rejecting request:', err);
    Notify.create({
      type: 'negative',
      message: 'Failed to reject request'
    });
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

onMounted(() => {
  if (gymId.value) {
    void loadData();
    void loadQRCode();
    void loadPendingRequests();
  }
});
</script>

<style scoped>
@media print {
  .print-flyer {
    page-break-inside: avoid;
  }
}
</style>
