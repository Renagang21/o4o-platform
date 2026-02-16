/** @type {import("jest").Config} **/
module.exports = {
  preset: 'ts-jest',
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
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        types: ['jest', 'node'],
      },
      useESM: false, // Disable ESM for ts-jest
      diagnostics: false,
    }],
  },
  moduleNameMapper: {
    '^@o4o/security-core$': '<rootDir>/../../packages/security-core/src/index.ts',
    '^@o4o/ai-core$': '<rootDir>/../../packages/ai-core/src/index.ts',
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
  // Prevent OOM on Windows — serialize test execution
  maxWorkers: 1,
  // Force exit after tests complete (prevents open handle hang)
  forceExit: true,
  // Mock problematic ESM modules
  transformIgnorePatterns: [
    'node_modules/(?!(typeorm)/)', // Allow typeorm transformation
  ],
  // Global setup for tests
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/jest.setup.ts'],
};