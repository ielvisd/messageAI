import { ref } from 'vue'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'

export type NoteType = 'progress' | 'behavioral' | 'general'

export interface StudentNote {
  id: string
  studentId: string
  instructorId: string
  gymId: string
  noteType: NoteType
  content: string
  classDate: string | null
  scheduleId: string | null
  createdAt: string
  updatedAt: string
}

export function useStudentNotes() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Create a new student note
   */
  async function createNote(
    studentId: string,
    gymId: string,
    content: string,
    noteType: NoteType = 'general',
    classDate?: Date,
    scheduleId?: string
  ): Promise<StudentNote> {
    try {
      loading.value = true
      error.value = null

      const { data, error: insertError } = await supabase
        .from('student_notes')
        .insert({
          student_id: studentId,
          instructor_id: user.value?.id,
          gym_id: gymId,
          note_type: noteType,
          content,
          class_date: classDate ? classDate.toISOString().split('T')[0] : null,
          schedule_id: scheduleId || null
        })
        .select()
        .single()

      if (insertError) throw insertError
      if (!data) throw new Error('Failed to create note')

      return data
    } catch (err) {
      console.error('Error creating note:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get notes for a student
   */
  async function getStudentNotes(
    studentId: string,
    filters?: {
      noteType?: NoteType
      startDate?: Date
      endDate?: Date
      limit?: number
    }
  ): Promise<StudentNote[]> {
    try {
      loading.value = true
      error.value = null

      let query = supabase
        .from('student_notes')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (filters?.noteType) {
        query = query.eq('note_type', filters.noteType)
      }

      if (filters?.startDate) {
        query = query.gte('class_date', filters.startDate.toISOString().split('T')[0])
      }

      if (filters?.endDate) {
        query = query.lte('class_date', filters.endDate.toISOString().split('T')[0])
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      return (data || []) as any
    } catch (err) {
      console.error('Error getting notes:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Update a note
   */
  async function updateNote(
    noteId: string,
    updates: {
      content?: string
      noteType?: NoteType
      classDate?: Date
    }
  ): Promise<StudentNote> {
    try {
      loading.value = true
      error.value = null

      const updateData: any = {}
      if (updates.content) updateData.content = updates.content
      if (updates.noteType) updateData.note_type = updates.noteType
      if (updates.classDate) updateData.class_date = updates.classDate.toISOString().split('T')[0]

      const { data, error: updateError } = await supabase
        .from('student_notes')
        .update(updateData)
        .eq('id', noteId)
        .select()
        .single()

      if (updateError) throw updateError
      if (!data) throw new Error('Failed to update note')

      return data
    } catch (err) {
      console.error('Error updating note:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Delete a note
   */
  async function deleteNote(noteId: string): Promise<void> {
    try {
      loading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('student_notes')
        .delete()
        .eq('id', noteId)

      if (deleteError) throw deleteError
    } catch (err) {
      console.error('Error deleting note:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Get notes by instructor (own notes)
   */
  async function getMyNotes(
    gymId: string,
    limit: number = 50
  ): Promise<Array<StudentNote & { studentName: string }>> {
    try {
      loading.value = true
      error.value = null

      const { data, error: fetchError } = await supabase
        .from('student_notes')
        .select(`
          *,
          profiles!student_id (
            name
          )
        `)
        .eq('instructor_id', user.value?.id)
        .eq('gym_id', gymId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError

      return (data || []).map((note: any) => ({
        ...note,
        studentName: note.profiles?.name || 'Unknown'
      })) as any
    } catch (err) {
      console.error('Error getting my notes:', err)
      error.value = (err as Error).message
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    createNote,
    getStudentNotes,
    updateNote,
    deleteNote,
    getMyNotes
  }
}

