// O4O Platform - 루트 ESLint flat config (SSOT)
//
// WO-O4O-VERIFICATION-COMMAND-COVERAGE-RESTORATION-V1
// 이전 설정은 `**/*.ts` 등 모든 소스를 ignore 해 사실상 아무것도 검사하지 않았다.
// 여기서는 기존 devDependencies 만 재사용해 실제 검사를 복구한다 (신규 의존성 0).
//
// 규칙 범위 원칙 — 대규모 규칙 강화는 이번 범위가 아니다.
//   - no-explicit-any        : 저장소 전반의 기존 패턴이라 off (별도 WO 대상)
//   - no-unused-vars         : warn (가시화하되 게이트를 막지 않음)
//   - react-hooks/exhaustive-deps : warn
//   - 그 외 eslint/tseslint recommended 는 error 유지
//
// react-hooks 플러그인은 반드시 등록해야 한다. 등록하지 않으면 소스의
// `eslint-disable react-hooks/*` 주석이 "Definition for rule ... was not found"
// 오류로 집계된다.

import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.next/**',
      '**/.vite-cache/**',
      '**/*.d.ts',
      'apps/*.backup/**',
      'packages/*.backup/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
