<template>
  <q-card>
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">Mark Attendance</div>
      <q-space />
      <q-btn icon="close" flat round dense @click="$emit('close')" />
    </q-card-section>

    <q-card-section v-if="loading" class="text-center">
      <q-spinner color="primary" size="50px" />
      <div class="q-mt-md">Loading attendance...</div>
    </q-card-section>

    <q-card-section v-else>
      <div class="q-mb-md">
        <q-input
          v-model="searchFilter"
          placeholder="Search students..."
          outlined
          dense
        >
          <template #prepend>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>

      <!-- Attendance List -->
      <div class="text-caption text-grey-7 q-mb-sm">
        {{ selectedCount }} of {{ students.length }} marked present
      </div>

      <q-list v-if="filteredStudents.length > 0" separator>
        <q-item v-for="student in filteredStudents" :key="student.id">
          <q-item-section avatar>
            <q-avatar>
              <img v-if="student.avatar_url" :src="student.avatar_url" />
              <q-icon v-else name="person" size="32px" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ student.name }}</q-item-label>
            <q-item-label caption>
              <q-chip
                v-if="student.current_belt"
                size="sm"
                :style="{ backgroundColor: getBeltColor(student.current_belt) }"
                text-color="white"
              >
                {{ capitalize(student.current_belt) }}
                <span v-if="student.current_stripes > 0">
                  ({{ student.current_stripes }})
                </span>
              </q-chip>
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <q-checkbox
              v-model="attendanceMap[student.id]"
              :disable="alreadyCheckedIn.includes(student.id)"
              color="positive"
            />
          </q-item-section>

          <q-item-section side v-if="alreadyCheckedIn.includes(student.id)">
            <q-chip size="sm" color="positive" text-color="white">
              <q-icon name="check_circle" left size="14px" />
              Checked In
            </q-chip>
          </q-item-section>
        </q-item>
      </q-list>

      <div v-else class="text-center text-grey-6 q-py-lg">
        <q-icon name="people_alt" size="48px" />
        <div class="q-mt-sm">No students found</div>
      </div>
    </q-card-section>

    <q-card-actions align="right" class="q-px-md q-pb-md">
      <q-btn flat label="Cancel" @click="$emit('close')" />
      <q-btn
        color="primary"
        label="Save Attendance"
        @click="saveAttendance"
        :loading="saving"
        :disable="selectedCount === 0"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAttendance } from '../composables/useAttendance'
import { supabase } from '../boot/supabase'
import { Notify } from 'quasar'

const props = defineProps<{
  scheduleId: string
  gymId: string
  classDate?: Date
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved', count: number): void
}>()

const { manualCheckIn, getClassAttendance } = useAttendance()

const loading = ref(true)
const saving = ref(false)
const searchFilter = ref('')
const students = ref<any[]>([])
const attendanceMap = ref<Record<string, boolean>>({})
const alreadyCheckedIn = ref<string[]>([])

const filteredStudents = computed(() => {
  if (!searchFilter.value) return students.value
  const filter = searchFilter.value.toLowerCase()
  return students.value.filter(s => 
    s.name.toLowerCase().includes(filter)
  )
})

const selectedCount = computed(() => {
  return Object.values(attendanceMap.value).filter(Boolean).length
})

async function loadData() {
  try {
    loading.value = true

    // Load all students in gym
    const { data: studentData, error: studentError } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, current_belt, current_stripes')
      .eq('gym_id', props.gymId)
      .eq('role', 'student')
      .order('name')

    if (studentError) throw studentError
    students.value = studentData || []

    // Initialize attendance map
    students.value.forEach(student => {
      attendanceMap.value[student.id] = false
    })

    // Load existing attendance
    const attendance = await getClassAttendance(props.scheduleId, props.classDate)
    alreadyCheckedIn.value = attendance.map((a: any) => a.userId)

    // Pre-check already attended students
    alreadyCheckedIn.value.forEach(userId => {
      attendanceMap.value[userId] = true
    })

  } catch (err) {
    console.error('Error loading data:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to load students'
    })
  } finally {
    loading.value = false
  }
}

async function saveAttendance() {
  try {
    saving.value = true

    const studentsToMark = Object.entries(attendanceMap.value)
      .filter(([userId, checked]) => checked && !alreadyCheckedIn.value.includes(userId))
      .map(([userId]) => userId)

    if (studentsToMark.length === 0) {
      Notify.create({
        type: 'warning',
        message: 'No new students to mark'
      })
      return
    }

    // Mark attendance for each student
    for (const userId of studentsToMark) {
      await manualCheckIn(props.scheduleId, userId, props.classDate)
    }

    Notify.create({
      type: 'positive',
      message: `Marked ${studentsToMark.length} student(s) present`,
      icon: 'check_circle'
    })

    emit('saved', studentsToMark.length)
    emit('close')

  } catch (err) {
    console.error('Error saving attendance:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to save attendance'
    })
  } finally {
    saving.value = false
  }
}

function getBeltColor(belt: string): string {
  const colors: Record<string, string> = {
    white: '#FFFFFF',
    blue: '#2196F3',
    purple: '#9C27B0',
    brown: '#795548',
    black: '#000000'
  }
  return colors[belt] || '#gray'
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

onMounted(() => {
  loadData()
})
</script>

