/**
 * @o4o/web-neture 테스트 설정
 *
 * WO-O4O-LOCAL-AGENT-LNA-UX-CLOSURE-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-neture/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest / jsdom / @testing-library 를 그대로 쓴다.
 * 이 서비스에 테스트 의존성을 추가하지 않는다 (package.json · lockfile 무변경).
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['services/web-neture/src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
});
