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

const router = useRouter()
const name = ref('')
const email = ref('')
const password = ref('')

const onSubmit = () => {
  // TODO: Implement signup logic
  console.log('Signup attempt:', { name: name.value, email: email.value, password: password.value })
  // For now, redirect to chats
  void router.push('/chats')
}
</script>
