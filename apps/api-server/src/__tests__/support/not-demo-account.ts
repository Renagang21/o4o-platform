/**
 * Demo 판정 대역 — "Demo 아님" 으로 고정 (테스트 support · 테스트 파일이 아니다)
 *
 * WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1
 *
 * 일반 사용자 경로를 보는 suite 는 mock DB 가 `demo_accounts` 조회에 답하지 못한다. 그 suite 의 대상은
 * Demo 가 아니므로 판정만 고정한다. Demo 거절 · write 0 · fail-closed 는
 * `services/auth/__tests__/demoAccountWriteGuard.behavior.test.ts` 가 본다.
 *
 *   jest.mock('<rel>/services/auth/demo-account.service.js', () =>
 *     jest.requireActual('<rel>/__tests__/support/not-demo-account.js').notDemoAccountModule(),
 *   );
 */
export function notDemoAccountModule(): Record<string, unknown> {
  const actual = jest.requireActual('../../services/auth/demo-account.service.js');
  return {
    ...actual,
    demoAccountService: {
      isDemoAccount: jest.fn(async () => false),
      isDemoOrganization: jest.fn(async () => false),
      assertNotDemoAccount: jest.fn(async () => undefined),
    },
    rejectDemoAccountTarget: jest.fn(async () => false),
  };
}
