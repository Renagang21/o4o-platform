import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['scripts/**/*.js', '*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 2022,
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'warn',
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'services/**', // 각 서비스는 자체 ESLint 설정 사용
    ],
  },
];
