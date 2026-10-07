/**
 * kpa-branch-web 테스트 설정
 *
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 — 이 서비스의 첫 테스트 수단.
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-kpa-branch/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest / jsdom 을 그대로 쓴다(web-neture 와 같은 방식).
 * 이 서비스에 테스트 의존성을 추가하지 않는다 (package.json · lockfile 무변경).
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['services/web-kpa-branch/src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
});
