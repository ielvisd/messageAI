import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { isAuthenticated } from '../state/auth'

export function useAuthGuard() {
  const router = useRouter()

  const requireAuth = () => {
    if (!isAuthenticated.value) {
      void router.push('/login')
      return false
    }
    return true
  }

  const requireGuest = () => {
    if (isAuthenticated.value) {
      void router.push('/chats')
      return false
    }
    return true
  }

  return {
    requireAuth,
    requireGuest,
    isAuthenticated: computed(() => isAuthenticated.value)
  }
}
