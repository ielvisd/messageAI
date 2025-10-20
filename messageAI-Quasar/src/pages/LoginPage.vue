<template>
  <q-page class="flex flex-center">
    <div class="q-pa-md" style="max-width: 400px; width: 100%">
      <q-card>
        <q-card-section>
          <div class="text-h6 text-center q-mb-md">Login to MessageAI</div>
          <q-form @submit="onSubmit" class="q-gutter-md">
            <q-input
              v-model="email"
              type="email"
              label="Email"
              :rules="[val => !!val || 'Email is required']"
            />
            <q-input
              v-model="password"
              type="password"
              label="Password"
              :rules="[val => !!val || 'Password is required']"
            />
            <div class="q-gutter-sm">
            <q-btn
              type="submit"
              color="primary"
              label="Login"
              class="full-width"
              :loading="loading"
              :disable="loading"
            />
              <q-btn
                flat
                color="primary"
                label="Sign Up"
                class="full-width"
                @click="$router.push('/signup')"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signIn } from '../state/auth'
import { Notify } from 'quasar'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)

const onSubmit = async () => {
  if (!email.value || !password.value) {
    Notify.create({
      type: 'negative',
      message: 'Please fill in all fields'
    })
    return
  }

  loading.value = true

  try {
    const { error } = await signIn(email.value, password.value)

    if (error) {
      // Handle specific error types
      let errorMessage = 'Login failed'
      const errorObj = error as Error

      if (errorObj.message === 'Email not confirmed') {
        errorMessage = 'Please check your email and click the confirmation link before logging in.'
      } else if (errorObj.message === 'Invalid login credentials') {
        errorMessage = 'Invalid email or password. Please try again.'
      } else if (errorObj.message) {
        errorMessage = errorObj.message
      }

      const notifyOptions: Record<string, unknown> = {
        type: 'negative',
        message: errorMessage,
        timeout: 5000
      }

      if (errorObj.message === 'Email not confirmed') {
        notifyOptions.actions = [
          {
            label: 'Resend Email',
            color: 'white',
            handler: () => {
              // TODO: Implement resend confirmation email
              Notify.create({
                type: 'info',
                message: 'Resend functionality coming soon!'
              })
            }
          }
        ]
      }

      Notify.create(notifyOptions)
    } else {
      Notify.create({
        type: 'positive',
        message: 'Login successful!'
      })
      void router.push('/chats')
    }
  } catch (err) {
    console.error('Login error:', err)
    Notify.create({
      type: 'negative',
      message: 'An unexpected error occurred. Please try again.'
    })
  } finally {
    loading.value = false
  }
}
</script>
