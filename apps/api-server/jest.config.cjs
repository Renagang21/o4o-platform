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
        // WO-O4O-COMMUNITY-LMS-COURSE-LIST-AND-HUB-VIEW-COMMONIZATION-V1:
        // 공통 LMS View(.tsx) 를 react-dom/server 로 정적 렌더해 계약을 고정한다.
        jsx: 'react-jsx',
      },
      useESM: false, // Disable ESM for ts-jest
      diagnostics: false,
    }],
  },
  moduleNameMapper: {
    '^@o4o/security-core$': '<rootDir>/../../packages/security-core/src/index.ts',
    '^@o4o/ai-core$': '<rootDir>/../../packages/ai-core/src/index.ts',
    // WO-O4O-MARKET-TRIAL-NETURE-FORUM-SYNC-RECOVERY-V1:
    // dist 는 ESM 이라 ts-jest 가 변환하지 못한다. 위 두 패키지와 동일하게 src 로 매핑한다.
    '^@o4o/market-trial$': '<rootDir>/../../packages/market-trial/src/index.ts',
    '^@o4o/action-log-core$': '<rootDir>/../../packages/action-log-core/src/index.ts',
    // WO-O4O-AUTH-ACCOUNT-STATUS-UX-AND-PH-MOBILE-LOGOUT-CLOSURE-V1:
    // BaseController 가 에러코드 SSOT 를 @o4o/types 에서 가져오므로 컨트롤러 단위 테스트에 필요하다.
    '^@o4o/types$': '<rootDir>/../../packages/types/src/index.ts',
    // WO-O4O-CHANNELS-TYPEORM-ENTITY-REGISTRATION-AND-RUNTIME-CLOSURE-V1:
    // channels entity 등록 회귀 테스트는 mock 이 아닌 **실제** entity 클래스로
    // TypeORM metadata 를 build 해야 한다. dist 는 ESM 이라 ts-jest 가 변환하지 못하므로
    // 다른 패키지와 동일하게 src 로 매핑한다.
    '^@o4o-apps/cms-core/entities$': '<rootDir>/../../packages/cms-core/src/entities/index.ts',
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