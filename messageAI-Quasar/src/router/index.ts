import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';
import { useAuthGuard } from '../composables/useAuthGuard';

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
    const { waitForAuth, isAuthenticated } = await import('../state/auth')
    await waitForAuth()
    
    // Check authentication requirements
    if (to.meta.requiresAuth && !isAuthenticated.value) {
      next('/login')
      return
    }

    if (to.meta.requiresGuest && isAuthenticated.value) {
      next('/chats')
      return
    }

    next()
  });

  return Router;
});
