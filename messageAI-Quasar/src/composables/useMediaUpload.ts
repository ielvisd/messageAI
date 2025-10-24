import { ref } from 'vue'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'

interface MediaMetadata {
  width?: number
  height?: number
  duration?: number
  thumbnailUrl?: string
  fileSize: number
  mimeType: string
}

interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export function useMediaUpload() {
  const uploadProgress = ref<UploadProgress>({ loaded: 0, total: 0, percentage: 0 })
  const uploading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Compress an image file to optimize for upload
   * Resizes to max 1920px width while maintaining aspect ratio
   */
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        const maxWidth = 1920
        const maxHeight = 1920
        let width = img.width
        let height = img.height

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to compress image'))
            }
          },
          'image/jpeg',
          0.85 // Quality setting
        )
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Extract metadata from an image file
   */
  const getImageMetadata = async (file: File): Promise<MediaMetadata> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          fileSize: file.size,
          mimeType: file.type
        })
      }
      img.onerror = () => reject(new Error('Failed to load image metadata'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Extract metadata from a video file
   */
  const getVideoMetadata = async (file: File): Promise<MediaMetadata> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        resolve({
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          fileSize: file.size,
          mimeType: file.type
        })
      }

      video.onerror = () => reject(new Error('Failed to load video metadata'))
      video.src = URL.createObjectURL(file)
    })
  }

  /**
   * Generate a thumbnail from a video file
   */
  const generateVideoThumbnail = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      video.preload = 'metadata'
      video.muted = true

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        video.currentTime = Math.min(1, video.duration / 2) // Seek to middle or 1s
      }

      video.onseeked = () => {
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to generate thumbnail'))
            }
          },
          'image/jpeg',
          0.8
        )
      }

      video.onerror = () => reject(new Error('Failed to load video for thumbnail'))
      video.src = URL.createObjectURL(file)
    })
  }

  /**
   * Upload media file to Supabase Storage
   */
  const uploadMedia = async (
    file: File | Blob,
    chatId: string,
    mediaType: 'image' | 'video'
  ): Promise<{ url: string; metadata: MediaMetadata }> => {
    if (!user.value) {
      throw new Error('User not authenticated')
    }

    uploading.value = true
    error.value = null
    uploadProgress.value = { loaded: 0, total: 0, percentage: 0 }

    try {
      let processedFile: File | Blob = file
      let metadata: MediaMetadata

      // Process based on media type
      if (mediaType === 'image' && file instanceof File) {
        // Compress image
        processedFile = await compressImage(file)
        metadata = await getImageMetadata(file)
      } else if (mediaType === 'video' && file instanceof File) {
        metadata = await getVideoMetadata(file)
        
        // Generate and upload thumbnail
        try {
          const thumbnail = await generateVideoThumbnail(file)
          const thumbnailPath = `${chatId}/${user.value.id}/${Date.now()}_thumb.jpg`
          const { error: thumbError } = await supabase.storage
            .from('chat-media')
            .upload(thumbnailPath, thumbnail)

          if (!thumbError) {
            const { data: thumbData } = supabase.storage
              .from('chat-media')
              .getPublicUrl(thumbnailPath)
            metadata.thumbnailUrl = thumbData.publicUrl
          }
        } catch (thumbErr) {
          console.warn('Failed to generate video thumbnail:', thumbErr)
        }
      } else {
        metadata = {
          fileSize: file.size,
          mimeType: file.type
        }
      }

      // Generate unique file path: chatId/userId/timestamp_random.ext
      const fileExt = file instanceof File ? file.name.split('.').pop() : (mediaType === 'image' ? 'jpg' : 'mp4')
      const fileName = `${chatId}/${user.value.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, processedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(data.path)

      uploadProgress.value = { loaded: 100, total: 100, percentage: 100 }

      return {
        url: urlData.publicUrl,
        metadata
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Upload failed'
      throw err
    } finally {
      uploading.value = false
    }
  }

  /**
   * Get a signed URL for private media (if needed in future)
   */
  const getMediaUrl = async (path: string, expiresIn = 3600): Promise<string> => {
    const { data, error: urlError } = await supabase.storage
      .from('chat-media')
      .createSignedUrl(path, expiresIn)

    if (urlError) {
      throw urlError
    }

    return data.signedUrl
  }

  /**
   * Delete media from storage
   */
  const deleteMedia = async (path: string): Promise<void> => {
    const { error: deleteError } = await supabase.storage
      .from('chat-media')
      .remove([path])

    if (deleteError) {
      throw deleteError
    }
  }

  return {
    uploadMedia,
    getMediaUrl,
    deleteMedia,
    uploadProgress,
    uploading,
    error
  }
}



