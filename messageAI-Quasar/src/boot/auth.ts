import { boot } from 'quasar/wrappers'
import { initAuth } from '../state/auth'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default boot(async (/* { app, router, ... } */) => {
  // Initialize authentication before the app starts
  await initAuth()
})
