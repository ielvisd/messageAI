<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title>
          MessageAI
        </q-toolbar-title>

        <q-space />

        <!-- User Menu (Mobile Friendly) -->
        <q-btn v-if="isAuthenticated && profile" flat dense round>
          <q-avatar size="32px" color="primary" text-color="white">
            <img v-if="profile.avatar_url" :src="profile.avatar_url" />
            <span v-else>{{ profile.name?.charAt(0)?.toUpperCase() || 'U' }}</span>
          </q-avatar>
          
          <q-menu>
            <q-list style="min-width: 200px">
              <q-item>
                <q-item-section avatar>
                  <q-avatar color="primary" text-color="white">
                    <img v-if="profile.avatar_url" :src="profile.avatar_url" />
                    <span v-else>{{ profile.name?.charAt(0)?.toUpperCase() || 'U' }}</span>
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ profile.name }}</q-item-label>
                  <q-item-label caption>{{ profile?.email || user?.email }}</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-separator />
              
              <q-item clickable v-close-popup @click="handleSignOut">
                <q-item-section avatar>
                  <q-icon name="logout" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Sign Out</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Essential Links </q-item-label>

        <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import EssentialLink, { type EssentialLinkProps } from 'components/EssentialLink.vue';
import { user, profile, isAuthenticated, signOut } from '../state/auth';
import { usePresence } from '../composables/usePresence';

// Initialize presence system (runs for entire app session)
usePresence();


const linksList: EssentialLinkProps[] = [
  {
    title: 'Docs',
    caption: 'quasar.dev',
    icon: 'school',
    link: 'https://quasar.dev',
  },
  {
    title: 'Github',
    caption: 'github.com/quasarframework',
    icon: 'code',
    link: 'https://github.com/quasarframework',
  },
  {
    title: 'Discord Chat Channel',
    caption: 'chat.quasar.dev',
    icon: 'chat',
    link: 'https://chat.quasar.dev',
  },
  {
    title: 'Forum',
    caption: 'forum.quasar.dev',
    icon: 'record_voice_over',
    link: 'https://forum.quasar.dev',
  },
  {
    title: 'Twitter',
    caption: '@quasarframework',
    icon: 'rss_feed',
    link: 'https://twitter.quasar.dev',
  },
  {
    title: 'Facebook',
    caption: '@QuasarFramework',
    icon: 'public',
    link: 'https://facebook.quasar.dev',
  },
  {
    title: 'Quasar Awesome',
    caption: 'Community Quasar projects',
    icon: 'favorite',
    link: 'https://awesome.quasar.dev',
  },
];

const leftDrawerOpen = ref(false);
const router = useRouter();

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function handleSignOut() {
  try {
    await signOut();
    await router.push('/login');
  } catch (error) {
    console.error('Sign out error:', error);
  }
}
</script>
