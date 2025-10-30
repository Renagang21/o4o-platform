module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:n/recommended'
  ],
  plugins: ['@typescript-eslint', 'import', 'n'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    },
    warnOnUnsupportedTypeScriptVersion: false
  },
  env: {
    browser: true,
    node: true,
    es2020: true
  },
  settings: {
    'import/resolver': {
      typescript: true,
      node: true
    }
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-namespace': 'warn',
    'no-case-declarations': 'off',
    'no-redeclare': 'off',
    'no-unreachable': 'warn',
    'no-useless-escape': 'warn',
    'no-constant-binary-expression': 'warn',
    // ESM import rules
    'import/extensions': ['error', 'always', {
      'ignorePackages': true,
      'pattern': {
        'ts': 'never',
        'tsx': 'never'
      }
    }],
    'n/no-missing-import': 'off', // TypeScript handles this
    'n/no-unsupported-features/es-syntax': 'off' // We support modern ES
  },
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      rules: {
        'no-unused-vars': 'off',
        'no-undef': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.config.js',
    '*.config.ts'
  ]
};