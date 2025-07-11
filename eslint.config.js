import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        File: 'readonly',
        Blob: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        HTMLElement: 'readonly',
        HTMLSpanElement: 'readonly',
        Element: 'readonly',
        Node: 'readonly',
        MouseEvent: 'readonly',
        KeyboardEvent: 'readonly',
        CustomEvent: 'readonly',
        React: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        process: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn'
    }
  },
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      '*.config.js',
      '*.config.ts'
    ]
  }
];