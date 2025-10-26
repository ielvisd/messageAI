import { ref, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'

export function useVoiceInput() {
  const $q = useQuasar()
  const isListening = ref(false)
  const transcript = ref('')
  const isSupported = ref(false)
  
  let recognition: any = null
  let silenceTimer: any = null

  onMounted(() => {
    // Check browser support (works on iOS Safari 14.5+)
    isSupported.value = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    
    if (!isSupported.value && $q.platform.is.ios) {
      console.warn('Speech recognition requires iOS 14.5+ and Safari')
    }
  })

  function startListening() {
    if (!isSupported.value) {
      $q.notify({
        type: 'warning',
        message: 'Voice input not supported on this device',
        position: 'top'
      })
      return
    }
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    recognition = new SpeechRecognition()
    
    // iOS-optimized settings
    recognition.continuous = false // Better for iOS
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1
    
    recognition.onstart = () => {
      isListening.value = true
    }
    
    recognition.onresult = (event: any) => {
      const current = event.resultIndex
      const result = event.results[current]
      transcript.value = result[0].transcript
      
      // Auto-stop after 1.5s of silence
      clearTimeout(silenceTimer)
      if (result.isFinal) {
        silenceTimer = setTimeout(() => {
          stopListening()
        }, 1500)
      }
    }
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      isListening.value = false
      
      if (event.error === 'not-allowed') {
        $q.notify({
          type: 'negative',
          message: 'Microphone access denied. Please enable in Settings.',
          position: 'top'
        })
      }
    }
    
    recognition.onend = () => {
      isListening.value = false
    }
    
    try {
      recognition.start()
    } catch (e) {
      console.error('Error starting recognition:', e)
      isListening.value = false
    }
  }

  function stopListening() {
    if (recognition) {
      recognition.stop()
    }
    clearTimeout(silenceTimer)
    isListening.value = false
  }

  onUnmounted(() => {
    stopListening()
  })

  return { 
    isListening, 
    transcript, 
    isSupported,
    startListening, 
    stopListening 
  }
}

