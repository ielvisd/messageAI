import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';

/*
 * If not building with SSR mode, you can
 * directly export the Router instantiation;
 *
 * The function below can be async too; either use
 * async/await or return a Promise which resolves
 * with the Router instance.
 */

export default defineRouter(function (/* { store, ssrContext } */) {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,

    // Leave this as is and make changes in quasar.conf.js instead!
    // quasar.conf.js -> build -> vueRouterMode
    // quasar.conf.js -> build -> publicPath
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  // Add navigation guards
  Router.beforeEach(async (to, from, next) => {
    // Wait for auth to initialize before checking authentication
    const { waitForAuth, isAuthenticated, user, profile } = await import('../state/auth')
    await waitForAuth()
    
    console.log('🔒 Router Guard Check:', {
      from: from.path,
      to: to.path,
      isAuthenticated: isAuthenticated.value,
      userId: user.value?.id,
      profileId: (profile.value as any)?.id,
      role: (profile.value as any)?.role,
      gym_id: (profile.value as any)?.gym_id,
      owned_gym_ids: (profile.value as any)?.owned_gym_ids
    })
    
    // Handle root path based on auth status
    if (to.path === '/' || to.path === '/login') {
      if (isAuthenticated.value) {
        const role = (profile.value as any)?.role
        const gymId = (profile.value as any)?.gym_id
        const ownedGymIds = (profile.value as any)?.owned_gym_ids || []
        
        console.log('✅ User is authenticated, checking role/gym...', {
          gymId,
          role,
          ownedGymIds
        })
        
        // If no gym_id, no role, and no owned gyms, redirect to gym setup
        // BUT: If user has 'owner' role, let them through (they may need to select a gym)
        if (!gymId && !role && ownedGymIds.length === 0) {
          console.log('➡️ No gym/role, redirecting to /setup/gym')
          next('/setup/gym')
          return
        }
        
        // Special case: If owner role but no gymId, they might have owned_gym_ids
        // The dashboard will handle gym selection
        if (role === 'owner' && !gymId && ownedGymIds.length > 0) {
          console.log('➡️ Owner with multiple gyms, redirecting to dashboard')
          next('/dashboard')
          return
        }
        
        // Redirect based on role
        console.log('➡️ Has role/gym, redirecting to dashboard')
        switch (role) {
          case 'owner':
            next('/dashboard')
            break
          case 'instructor':
            next('/instructor-dashboard')
            break
          case 'parent':
            next('/parent-dashboard')
            break
          case 'student':
            next('/chats')
            break
          default:
            next('/chats')
        }
        return
      }
      // Not authenticated, allow to proceed to login
      next()
      return
    }
    
    // Check authentication requirements
    if (to.meta.requiresAuth && !isAuthenticated.value) {
      console.log('❌ Auth required but not authenticated, redirecting to /login')
      next('/login')
      return
    }

    if (to.meta.requiresGuest && isAuthenticated.value) {
      // Redirect to appropriate dashboard based on role
      const role = (profile.value as any)?.role
      const gymId = (profile.value as any)?.gym_id
      const ownedGymIds = (profile.value as any)?.owned_gym_ids || []

      console.log('➡️ Guest page but authenticated, redirecting...', {
        gymId,
        role,
        ownedGymIds
      })

      // If no gym_id, no role, and no owned gyms, redirect to gym setup
      if (!gymId && !role && ownedGymIds.length === 0) {
        next('/setup/gym')
        return
      }
      
      // Special case: If owner role but no gymId, they might have owned_gym_ids
      if (role === 'owner' && !gymId && ownedGymIds.length > 0) {
        next('/dashboard')
        return
      }

      // Redirect based on role
      switch (role) {
        case 'owner':
          next('/dashboard')
          break
        case 'instructor':
          next('/instructor-dashboard')
          break
        case 'parent':
          next('/parent-dashboard')
          break
        case 'student':
          next('/chats')
          break
        default:
          next('/chats')
      }
      return
    }

    // Check if authenticated user needs gym setup (for all authenticated routes)
    if (isAuthenticated.value && to.path !== '/setup/gym') {
      const role = (profile.value as any)?.role
      const gymId = (profile.value as any)?.gym_id
      const ownedGymIds = (profile.value as any)?.owned_gym_ids || []
      
      // If no gym_id, no role, and no owned gyms, redirect to gym setup
      // BUT: If user has 'owner' role, let them through
      if (!gymId && !role && ownedGymIds.length === 0) {
        console.log('⚠️ Authenticated but no gym/role, redirecting to /setup/gym')
        next('/setup/gym')
        return
      }
      
      // Special case: If owner role but no gymId, they might have owned_gym_ids
      if (role === 'owner' && !gymId && ownedGymIds.length > 0) {
        console.log('⚠️ Owner with owned gyms, allowing through')
        // Continue to their intended destination
      }
    }

    // Check role requirements
    if (to.meta.requiresRole) {
      const userRole = (profile.value as any)?.role || (user.value as any)?.role
      if (userRole !== to.meta.requiresRole) {
        // Redirect to their home
        switch (userRole) {
          case 'owner':
            next('/dashboard')
            break
          case 'instructor':
            next('/instructor-dashboard')
            break
          case 'parent':
            next('/parent-dashboard')
            break
          default:
            next('/chats')
        }
        return
      }
    }

    // Check if gym setup is required
    if (to.meta.requiresNoGym) {
      const gymId = (profile.value as any)?.gym_id || (user.value as any)?.gym_id
      const ownedGymIds = (profile.value as any)?.owned_gym_ids || []
      const role = (profile.value as any)?.role || (user.value as any)?.role
      
      if (gymId || ownedGymIds.length > 0) {
        // Already has gym or owns gyms, redirect to dashboard
        next(role === 'owner' ? '/dashboard' : '/chats')
        return
      }
    }

    next()
  });

  return Router;
});
