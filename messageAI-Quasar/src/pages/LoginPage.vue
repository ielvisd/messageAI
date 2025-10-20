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

const router = useRouter()
const email = ref('')
const password = ref('')

const onSubmit = () => {
  // TODO: Implement login logic
  console.log('Login attempt:', { email: email.value, password: password.value })
  // For now, redirect to chats
  void router.push('/chats')
}
</script>
