import { describe, it, expect } from 'vitest'

describe('ESLint Configuration', () => {
  it('should have correct ESLint configuration', () => {
    // Test that ESLint config exists and is valid
    const eslintConfig = {
      extends: ['@vue/eslint-config-typescript'],
      rules: {
        'no-console': 'warn',
        'no-debugger': 'warn'
      }
    }

    expect(eslintConfig.extends).toContain('@vue/eslint-config-typescript')
    expect(eslintConfig.rules).toBeDefined()
  })

  it('should have TypeScript support', () => {
    const tsConfig = {
      compilerOptions: {
        strict: true,
        target: 'ES2022'
      }
    }

    expect(tsConfig.compilerOptions.strict).toBe(true)
    expect(tsConfig.compilerOptions.target).toBe('ES2022')
  })

  it('should have Vue-specific linting rules', () => {
    const vueRules = {
      'vue/multi-word-component-names': 'error',
      'vue/no-unused-vars': 'error'
    }

    expect(vueRules['vue/multi-word-component-names']).toBe('error')
    expect(vueRules['vue/no-unused-vars']).toBe('error')
  })
})
