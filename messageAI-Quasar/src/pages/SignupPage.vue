<template>
  <q-page class="flex flex-center">
    <div class="q-pa-md" style="max-width: 400px; width: 100%">
      <q-card>
        <q-card-section>
          <div class="text-h6 text-center q-mb-md">Sign Up for MessageAI</div>
          <q-form @submit="onSubmit" class="q-gutter-md">
            <q-input
              v-model="name"
              label="Full Name"
              :rules="[val => !!val || 'Name is required']"
            />
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
              label="Sign Up"
              class="full-width"
              :loading="loading"
              :disable="loading"
            />
              <q-btn
                flat
                color="primary"
                label="Back to Login"
                class="full-width"
                @click="$router.push('/login')"
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
import { signUp } from '../state/auth'
import { Notify } from 'quasar'

const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)

const onSubmit = async () => {
  if (!name.value || !email.value || !password.value) {
    Notify.create({
      type: 'negative',
      message: 'Please fill in all fields'
    })
    return
  }

  if (password.value.length < 6) {
    Notify.create({
      type: 'negative',
      message: 'Password must be at least 6 characters'
    })
    return
  }

  loading.value = true

  try {
    const { error } = await signUp(email.value, password.value, name.value)

    if (error) {
      // Handle specific error types
      let errorMessage = 'Signup failed'
      const errorObj = error as Error

      if (errorObj.message === 'User already registered') {
        errorMessage = 'An account with this email already exists. Please try logging in instead.'
      } else if (errorObj.message === 'Password should be at least 6 characters') {
        errorMessage = 'Password must be at least 6 characters long.'
      } else if (errorObj.message) {
        errorMessage = errorObj.message
      }

      Notify.create({
        type: 'negative',
        message: errorMessage,
        timeout: 5000
      })
    } else {
      Notify.create({
        type: 'positive',
        message: 'Signup successful! Please check your email and click the confirmation link to verify your account.',
        timeout: 8000,
        actions: [
          {
            label: 'Check Email',
            color: 'white',
            handler: () => {
              // Open email client or show instructions
              Notify.create({
                type: 'info',
                message: 'Please check your email inbox (including spam folder) for the confirmation link.'
              })
            }
          }
        ]
      })
      void router.push('/chats')
    }
  } catch (err) {
    console.error('Signup error:', err)
    Notify.create({
      type: 'negative',
      message: 'An unexpected error occurred. Please try again.'
    })
  } finally {
    loading.value = false
  }
}
</script>
