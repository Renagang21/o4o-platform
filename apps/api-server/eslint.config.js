// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // ESLint recommended rules
  js.configs.recommended,
  
  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,
  
  // Global ignores
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      '*.config.js',
      '*.config.mjs',
    ],
  },
  
  // TypeScript files configuration
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // TypeScript specific rules (완화)
      '@typescript-eslint/no-unused-vars': 'warn', // error → warn
      '@typescript-eslint/no-explicit-any': 'off',  // warn → off
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      
      // General rules (완화)
      'no-console': 'off',        // warn → off (서버 로그용)
      'no-unused-vars': 'off',    // warn → off (TypeScript가 처리)
      'prefer-const': 'warn',     // error → warn
      'no-var': 'warn',          // error → warn
      'no-case-declarations': 'off', // case문 변수 선언 허용
    },
  },
  
  // JavaScript files configuration
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  }
);
