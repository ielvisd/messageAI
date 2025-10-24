import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/LandingLayout.vue'),
    meta: { requiresGuest: true },
    children: [
      { path: '', component: () => import('pages/LandingPage.vue') }
    ]
  },
  {
    path: '/login',
    component: () => import('layouts/AuthLayout.vue'),
    meta: { requiresGuest: true },
    children: [
      { path: '', component: () => import('pages/LoginPage.vue') }
    ]
  },
  {
    path: '/signup',
    component: () => import('layouts/AuthLayout.vue'),
    meta: { requiresGuest: true },
    children: [
      { path: '', component: () => import('pages/SignupPage.vue') }
    ]
  },
  {
    path: '/auth/callback',
    component: () => import('layouts/AuthLayout.vue'),
    meta: { requiresGuest: true },
    children: [
      { path: '', component: () => import('pages/AuthCallbackPage.vue') }
    ]
  },

  // Gym Join via QR Code (no auth required)
  {
    path: '/join/:token',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: '', component: () => import('pages/GymJoinPage.vue') }
    ]
  },

  // Gym Setup (first-time owner)
  {
    path: '/setup/gym',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true, requiresNoGym: true },
    children: [{ path: '', component: () => import('pages/GymSetupPage.vue') }],
  },

  // Owner Dashboard
  {
    path: '/dashboard',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true, requiresRole: 'owner' },
    children: [{ path: '', component: () => import('pages/OwnerDashboard.vue') }],
  },

  // Instructor Dashboard
  {
    path: '/instructor-dashboard',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true, requiresRole: 'instructor' },
    children: [{ path: '', component: () => import('pages/InstructorDashboard.vue') }],
  },

  // Parent Dashboard
  {
    path: '/parent-dashboard',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true, requiresRole: 'parent' },
    children: [{ path: '', component: () => import('pages/ParentDashboard.vue') }],
  },

  // Admin Settings (owner-only)
  {
    path: '/settings',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true, requiresRole: 'owner' },
    children: [{ path: '', component: () => import('pages/AdminSettingsPage.vue') }],
  },

  // Chats (all roles)
  {
    path: '/chats',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [{ path: '', component: () => import('pages/ChatListPage.vue') }],
  },
  {
    path: '/chat/:id',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [{ path: '', component: () => import('pages/ChatViewPage.vue') }],
  },

  // AI Assistant (all roles)
  {
    path: '/ai-assistant',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [{ path: '', component: () => import('pages/AIAssistantPage.vue') }],
  },

  // Schedule (all roles)
  {
    path: '/schedule',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [{ path: '', component: () => import('pages/SchedulePage.vue') }],
  },

  // Student Dashboard
  {
    path: '/student/dashboard',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [{ path: '', component: () => import('pages/StudentDashboardPage.vue') }],
  },

  // Check-In (Scanner)
  {
    path: '/check-in',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [{ path: '', component: () => import('components/CheckInScanner.vue') }],
  },

  // Check-In via QR Token (direct link)
  {
    path: '/check-in/:token',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [{ path: '', component: () => import('components/CheckInScanner.vue') }],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
