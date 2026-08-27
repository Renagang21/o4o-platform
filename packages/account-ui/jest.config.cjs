/**
 * WO-O4O-SERVICE-USER-DISPLAY-NAME-COMMONIZATION-G1-V1
 *
 * packages/asset-copy-core · packages/appearance-system 과 동일한 패키지-로컬 jest 관행.
 * 루트 jest.config.js 는 `require` 를 쓰는데 루트 package.json 이 "type": "module" 이라
 * 기동 불가였고, consumer 가 0 이어서 WO-O4O-PACKAGE-JEST-CI-ADOPTION-FULL-CENSUS-AND-CLOSURE-V1
 * 에서 삭제했다. package-level Jest 는 전부 이 패키지 로컬 config 로만 실행된다(CI 연결됨).
 *
 * 테스트는 `src/` 밖(`__tests__/`)에 두어 패키지 tsconfig(include: src/**)의
 * build · type-check 산출물을 오염시키지 않는다.
 */

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          types: ['jest', 'node'],
        },
        useESM: false,
        diagnostics: false,
      },
    ],
  },
  // ESM 소스가 쓰는 `./foo.js` 상대 import 를 `./foo` 로 되돌려 ts 파일에 매핑한다.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  maxWorkers: 1,
  forceExit: true,
};
