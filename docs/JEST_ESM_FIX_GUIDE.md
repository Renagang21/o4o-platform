# Jest ESM Configuration Fix Guide

**Problem**: Jest fails to parse `import.meta.url` in ESM modules
**Affected Files**: All tests importing from services using database connection
**Status**: Blocking PolicyResolutionService.test.ts execution

---

## Quick Fix (Option 2 - Recommended for Immediate Unblocking)

### Step 1: Create Manual Mock for Database Connection

Create file: `/home/sohae21/o4o-platform/apps/api-server/src/database/__mocks__/connection.ts`

```typescript
/**
 * Manual mock for database connection
 * Used to bypass import.meta.url ESM issues in Jest
 */

export const AppDataSource = {
  getRepository: jest.fn(),
  initialize: jest.fn(),
  isInitialized: true,
  options: {},
  destroy: jest.fn(),
  synchronize: jest.fn(),
  dropDatabase: jest.fn(),
  runMigrations: jest.fn(),
};
```

### Step 2: Update jest.config.cjs

Add to the jest configuration:

```javascript
module.exports = {
  // ... existing config

  // Add this line to enable manual mocks
  modulePathIgnorePatterns: [],

  // This tells Jest to use manual mocks
  clearMocks: true,
  resetMocks: false,
  restoreMocks: false,
};
```

### Step 3: Run Tests

```bash
cd /home/sohae21/o4o-platform/apps/api-server
pnpm test PolicyResolutionService.test.ts
```

**Expected**: Tests should now run successfully!

---

## Alternative: Full ESM Support (Option 1 - Long-term Solution)

### Update jest.config.cjs

Replace entire configuration:

```javascript
/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  passWithNoTests: true,
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/setup/'
  ],
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
      tsconfig: {
        module: 'ES2022',
        target: 'ES2022',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        types: ['jest', 'node'],
      }
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**/*',
    '!src/migrations/**/*',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
};
```

### Add package.json Scripts

```json
{
  "scripts": {
    "test": "NODE_OPTIONS=--experimental-vm-modules jest",
    "test:cov": "NODE_OPTIONS=--experimental-vm-modules jest --coverage",
    "test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch"
  }
}
```

---

## Verification

After applying the fix, verify tests run:

```bash
# Run tests
pnpm test PolicyResolutionService.test.ts

# Expected output:
# Test Suites: 1 passed, 1 total
# Tests:       19 passed, 19 total
# Time:        ~2s

# Generate coverage
pnpm test:cov PolicyResolutionService.test.ts

# Expected coverage:
# Line Coverage:     ≥ 80%
# Branch Coverage:   ≥ 75%
# Function Coverage: ≥ 90%
```

---

## Troubleshooting

### Error: "Cannot find module"
**Solution**: Check moduleNameMapper in jest.config.cjs

### Error: "SyntaxError: Unexpected token 'export'"
**Solution**: Add package to transformIgnorePatterns

### Error: "jest is not defined"
**Solution**: Add `"types": ["jest"]` to tsconfig.json

---

**Last Updated**: 2025-11-07
