/**
 * @o4o/auth-client 테스트 설정
 *
 * WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config packages/auth-client/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest / jsdom 을 그대로 쓴다. 이 패키지에 테스트 의존성을 추가하지 않는다.
 * (CI 편입은 별도 판단 — ci-pipeline.yml 은 이 WO 범위 밖)
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['packages/auth-client/src/**/*.test.ts'],
    passWithNoTests: false,
  },
});
