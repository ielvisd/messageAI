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
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()
const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)

const onSubmit = async () => {
  if (!name.value || !email.value || !password.value) {
    $q.notify({
      type: 'negative',
      message: 'Please fill in all fields'
    })
    return
  }

  if (password.value.length < 6) {
    $q.notify({
      type: 'negative',
      message: 'Password must be at least 6 characters'
    })
    return
  }

  loading.value = true
  
  try {
    const { error } = await signUp(email.value, password.value, name.value)
    
    if (error) {
      $q.notify({
        type: 'negative',
        message: (error as Error).message || 'Signup failed'
      })
    } else {
      $q.notify({
        type: 'positive',
        message: 'Signup successful! Please check your email to verify your account.'
      })
      void router.push('/chats')
    }
  } catch {
    $q.notify({
      type: 'negative',
      message: 'An unexpected error occurred'
    })
  } finally {
    loading.value = false
  }
}
</script>
