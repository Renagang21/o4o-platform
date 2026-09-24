/**
 * @o4o/auth-context 테스트 설정
 *
 * WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1 §18
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config packages/auth-context/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest 를 그대로 쓴다(이 패키지에 테스트 의존성 추가 0).
 *
 * ⚠️ CI 연결은 **아직 없다.** `ci-pipeline.yml` 에 step 을 추가하는 것은 CI 인프라 변경이라
 *    사용자 승인이 필요하다(CLAUDE.md 중지 조건). 승인 전까지 이 설정은 로컬 실행용이며,
 *    같은 계약의 **정적 축**은 `apps/api-server/src/__tests__/identity-account-display-contract.spec.ts`
 *    가 jest 로 CI 에서 자동 실행한다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/auth-context/src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
});
