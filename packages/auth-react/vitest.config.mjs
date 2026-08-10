/**
 * @o4o/auth-react 테스트 설정
 *
 * WO-O4O-FRONTEND-AUTH-CONTEXT-AND-ROUTE-GUARD-COMMONIZATION-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config packages/auth-react/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest / jsdom / @testing-library/react 를 그대로 쓴다.
 * 이 패키지에 테스트용 의존성을 추가하지 않는다(이번 WO 는 외부 의존성 추가 0 이 조건).
 * CI 파이프라인 연결은 CI 인프라 변경이라 이번 WO 범위 밖이다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['packages/auth-react/src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
});
