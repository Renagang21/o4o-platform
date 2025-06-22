// @ts-check
import js from '@eslint/js';

export default [
  // ESLint recommended rules
  js.configs.recommended,
  
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'services/**', // 각 서비스는 자체 ESLint 설정 사용
      '*.config.js',
      '*.config.mjs',
      '.github/**',
    ],
  },
  
  // Root level JavaScript files
  {
    files: ['scripts/**/*.js', '*.js', '*.mjs'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
    },
    rules: {
      'no-console': 'off', // Scripts에서는 console 허용
      'no-unused-vars': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
