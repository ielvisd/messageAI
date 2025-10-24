<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card style="min-width: 400px; max-width: 600px;">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Student Notes: {{ studentName }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <!-- Add New Note Form -->
      <q-card-section>
        <q-form @submit="saveNote">
          <q-select
            v-model="noteType"
            :options="noteTypeOptions"
            label="Note Type"
            outlined
            dense
            class="q-mb-sm"
          />

          <q-input
            v-model="noteContent"
            type="textarea"
            label="Note"
            placeholder="Enter your observation or note about this student..."
            outlined
            rows="4"
            class="q-mb-sm"
          />

          <q-input
            v-model="classDate"
            type="date"
            label="Class Date (optional)"
            outlined
            dense
            class="q-mb-md"
          />

          <q-btn
            type="submit"
            color="primary"
            label="Add Note"
            icon="add"
            :loading="saving"
            :disable="!noteContent.trim()"
            class="full-width"
          />
        </q-form>
      </q-card-section>

      <q-separator />

      <!-- Previous Notes -->
      <q-card-section>
        <div class="text-subtitle2 q-mb-md">Previous Notes</div>

        <div v-if="loading" class="text-center q-py-md">
          <q-spinner color="primary" size="40px" />
        </div>

        <q-list v-else-if="notes.length > 0" separator>
          <q-item v-for="note in notes" :key="note.id">
            <q-item-section>
              <q-item-label>
                <q-chip
                  size="sm"
                  :color="getNoteTypeColor(note.noteType)"
                  text-color="white"
                >
                  {{ capitalize(note.noteType) }}
                </q-chip>
              </q-item-label>
              <q-item-label class="q-mt-sm">{{ note.content }}</q-item-label>
              <q-item-label caption class="q-mt-xs">
                {{ formatDate(note.createdAt) }}
                <span v-if="note.classDate"> · Class: {{ formatDate(note.classDate) }}</span>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row q-gutter-xs">
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  icon="edit"
                  @click="editNote(note)"
                />
                <q-btn
                  flat
                  round
                  dense
                  size="sm"
                  icon="delete"
                  color="negative"
                  @click="confirmDeleteNote(note.id)"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>

        <div v-else class="text-center text-grey-6 q-py-lg">
          <q-icon name="note" size="48px" />
          <div class="q-mt-sm">No notes yet</div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useStudentNotes, type NoteType } from '../composables/useStudentNotes'
import { Notify, Dialog } from 'quasar'

const props = defineProps<{
  modelValue: boolean
  studentId: string
  studentName: string
  gymId: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'noteSaved'): void
}>()

const { loading, saving, createNote, getStudentNotes, updateNote, deleteNote } = useStudentNotes()

const noteContent = ref('')
const noteType = ref<NoteType>('general')
const classDate = ref('')
const notes = ref<any[]>([])
const editingNoteId = ref<string | null>(null)

const noteTypeOptions = [
  { label: 'Progress', value: 'progress' },
  { label: 'Behavioral', value: 'behavioral' },
  { label: 'General', value: 'general' }
]

async function loadNotes() {
  try {
    const data = await getStudentNotes(props.studentId, { limit: 20 })
    notes.value = data
  } catch (err) {
    console.error('Error loading notes:', err)
  }
}

async function saveNote() {
  try {
    saving.value = true

    if (editingNoteId.value) {
      // Update existing note
      await updateNote(editingNoteId.value, {
        content: noteContent.value,
        noteType: noteType.value,
        classDate: classDate.value ? new Date(classDate.value) : undefined
      })
      Notify.create({
        type: 'positive',
        message: 'Note updated successfully'
      })
      editingNoteId.value = null
    } else {
      // Create new note
      await createNote(
        props.studentId,
        props.gymId,
        noteContent.value,
        noteType.value,
        classDate.value ? new Date(classDate.value) : undefined
      )
      Notify.create({
        type: 'positive',
        message: 'Note added successfully'
      })
    }

    // Reset form
    noteContent.value = ''
    classDate.value = ''
    noteType.value = 'general'

    // Reload notes
    await loadNotes()
    emit('noteSaved')

  } catch (err) {
    console.error('Error saving note:', err)
    Notify.create({
      type: 'negative',
      message: 'Failed to save note'
    })
  } finally {
    saving.value = false
  }
}

function editNote(note: any) {
  noteContent.value = note.content
  noteType.value = note.noteType
  classDate.value = note.classDate || ''
  editingNoteId.value = note.id
}

function confirmDeleteNote(noteId: string) {
  Dialog.create({
    title: 'Delete Note',
    message: 'Are you sure you want to delete this note?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await deleteNote(noteId)
      Notify.create({
        type: 'positive',
        message: 'Note deleted'
      })
      await loadNotes()
      emit('noteSaved')
    } catch (err) {
      Notify.create({
        type: 'negative',
        message: 'Failed to delete note'
      })
    }
  })
}

function getNoteTypeColor(type: NoteType): string {
  const colors: Record<NoteType, string> = {
    progress: 'positive',
    behavioral: 'warning',
    general: 'info'
  }
  return colors[type] || 'grey'
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    loadNotes()
  }
})

onMounted(() => {
  if (props.modelValue) {
    loadNotes()
  }
})
</script>

