import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default [
  {
    files: ['src/**/*.ts'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Ban raw console — use getLogger() from lib/logger instead
      'no-console': 'error',

      // Catch the most dangerous any usages
      '@typescript-eslint/no-explicit-any': 'warn',

      // Prevent unhandled promise rejections
      '@typescript-eslint/no-floating-promises': 'error',

      // Prevent accidental == vs ===
      'eqeqeq': ['error', 'always'],
    },
  },
]
