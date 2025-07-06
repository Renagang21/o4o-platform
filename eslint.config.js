// @ts-check
import js from '@eslint/js';
import typescriptEslint from 'typescript-eslint';

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

  // TypeScript files in workspaces  
  {
    files: ['**/src/**/*.{ts,tsx}', 'apps/*/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptEslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint.plugin,
    },
    rules: {
      // TypeScript 기본 규칙
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-var-requires': 'error',
      
      // 기본 ESLint 규칙 (TypeScript와 충돌하는 것들 비활성화)
      'no-unused-vars': 'off', // TypeScript 버전 사용
      'no-undef': 'off', // TypeScript에서 처리
      'prefer-const': 'error', // 기본 ESLint 규칙 사용
    },
  },

  // React TypeScript files (admin-dashboard, main-site)
  {
    files: ['**/src/**/*.{ts,tsx}', 'apps/{admin-dashboard,main-site}/src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptEslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      '@typescript-eslint': typescriptEslint.plugin,
    },
    rules: {
      // TypeScript 기본 규칙
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-var-requires': 'error',
      
      // React 관련 기본 규칙 (플러그인 없이)
      'jsx-quotes': ['error', 'prefer-double'],
      
      // 기본 ESLint 규칙 비활성화
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'prefer-const': 'error',
    },
  },
];
