import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock environment variables
vi.mock('import.meta.env', () => ({
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key'
}))

// Global test configuration
config.global.mocks = {
  $t: (key: string) => key // Mock i18n
}
