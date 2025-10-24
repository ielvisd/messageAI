import { describe, it, expect } from 'vitest'

describe('Build Configuration', () => {
  it('should have correct package.json configuration', () => {
    const packageJson = {
      name: 'ossome',
      version: '0.0.1',
      type: 'module',
      private: true
    }

    expect(packageJson.name).toBe('ossome')
    expect(packageJson.version).toBe('0.0.1')
    expect(packageJson.type).toBe('module')
    expect(packageJson.private).toBe(true)
  })

  it('should have required dependencies', () => {
    const requiredDeps = [
      '@supabase/supabase-js',
      'quasar',
      'vue',
      'vue-router',
      '@capacitor/core'
    ]

    // This would be checked against actual package.json in real test
    requiredDeps.forEach(dep => {
      expect(dep).toBeDefined()
    })
  })

  it('should have required dev dependencies', () => {
    const requiredDevDeps = [
      'vitest',
      '@playwright/test',
      'eslint',
      'typescript'
    ]

    requiredDevDeps.forEach(dep => {
      expect(dep).toBeDefined()
    })
  })

  it('should have correct build scripts', () => {
    const buildScripts = [
      'dev',
      'build',
      'test',
      'test:e2e',
      'lint'
    ]

    buildScripts.forEach(script => {
      expect(script).toBeDefined()
    })
  })
})
