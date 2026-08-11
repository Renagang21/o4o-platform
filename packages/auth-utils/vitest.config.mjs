/**
 * @o4o/auth-utils 테스트 설정
 *
 * WO-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config packages/auth-utils/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest 를 그대로 쓴다. 이 패키지에 테스트 의존성을 추가하지 않는다.
 * CI 파이프라인 연결은 CI 인프라 변경이라 이번 WO 범위 밖이다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/auth-utils/src/**/*.test.ts'],
    passWithNoTests: false,
  },
});
