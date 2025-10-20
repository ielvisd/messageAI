<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-md" style="width: 400px">
      <q-card-section class="text-center">
        <div v-if="loading" class="q-mb-md">
          <q-spinner-dots size="40px" color="primary" />
          <div class="q-mt-md">Confirming your email...</div>
        </div>

        <div v-else-if="error" class="text-negative">
          <q-icon name="error" size="40px" class="q-mb-md" />
          <div class="text-h6 q-mb-sm">Confirmation Failed</div>
          <div class="text-body2">{{ error }}</div>
          <q-btn
            color="primary"
            label="Try Again"
            class="q-mt-md"
            @click="retryConfirmation"
          />
        </div>

        <div v-else class="text-positive">
          <q-icon name="check_circle" size="40px" class="q-mb-md" />
          <div class="text-h6 q-mb-sm">Email Confirmed!</div>
          <div class="text-body2">Your account has been verified successfully.</div>
          <q-btn
            color="primary"
            label="Continue to App"
            class="q-mt-md"
            @click="goToChats"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../boot/supabase'
import { user } from '../state/auth'
import { Notify } from 'quasar'

const router = useRouter()
const loading = ref(true)
const error = ref('')

const handleAuthCallback = async () => {
  try {
    // Get the URL hash parameters
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const errorCode = hashParams.get('error')
    const errorDescription = hashParams.get('error_description')

    if (errorCode) {
      throw new Error(errorDescription || 'Authentication failed')
    }

    if (accessToken && refreshToken) {
      // Set the session in Supabase
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })

      if (sessionError) {
        throw sessionError
      }

      if (data.user) {
        user.value = data.user
        Notify.create({
          type: 'positive',
          message: 'Email confirmed successfully!'
        })
      }
    } else {
      throw new Error('Missing authentication tokens')
    }
  } catch (err) {
    console.error('Auth callback error:', err)
    error.value = (err as Error).message || 'Failed to confirm email'
    Notify.create({
      type: 'negative',
      message: error.value
    })
  } finally {
    loading.value = false
  }
}

const retryConfirmation = () => {
  loading.value = true
  error.value = ''
  void handleAuthCallback()
}

const goToChats = () => {
  void router.push('/chats')
}

onMounted(() => {
  void handleAuthCallback()
})
</script>
