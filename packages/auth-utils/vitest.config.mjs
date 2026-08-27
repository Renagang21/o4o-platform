/**
 * @o4o/auth-utils 테스트 설정
 *
 * WO-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1
 *
 * WO-O4O-PACKAGE-LEVEL-VITEST-CI-ADOPTION-FULL-CENSUS-AND-CLOSURE-V1:
 *   CI Pipeline / Code Quality Check 의 "Run tests (auth-utils Vitest)" 로 연결됨(blocking).
 *   여기 include 에 잡히는 테스트는 전부 CI 에서 실행된다.
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config packages/auth-utils/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest 를 그대로 쓴다. 이 패키지에 테스트 의존성을 추가하지 않는다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/auth-utils/src/**/*.test.ts'],
    passWithNoTests: false,
  },
});
