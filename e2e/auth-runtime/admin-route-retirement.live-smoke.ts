/**
 * 승인된 운영 세션 smoke 전용. 기본 *.spec.ts workflow에서 수집하지 않는다.
 * 공개 Demo 세션만 사용한다. 비밀번호·프로필·권한을 바꾸지 않고 실제 은퇴 route404를 확인한다.
 * 정상 로그인 시각·세션 발급·폐기 원장 변경은 수반한다.
 * 실행 전 운영 배포·다른 session smoke가 없음을 확인하고 순차 실행한다.
 */
import { test, expect } from '@playwright/test';
import { PUBLIC_DEMO_ACCOUNTS } from '../../packages/auth-utils/src/demoAccounts';

const V1 = `${process.env.E2E_API_BASE_URL || 'https://api.neture.co.kr'}/api/v1`;
test('public Demo 세션은 관리자 권한 없이 은퇴 route404를 구분한다', async ({ request }) => {
  const base = `${V1}/admin/platform-accounts/00000000-0000-4000-8000-000000000000`;
    // 실제 인증을 통과하되 관리자 권한이 없는 canonical 공개 Demo를 쓴다.
    // 살아 있는 관리자 route는 ROLE_REQUIRED로 거절되고, 은퇴 route는 404다.
    // 존재하지 않는 대상 UUID와 빈 body라 이전 password handler도 write에 도달하지 않는다.
    const demo = PUBLIC_DEMO_ACCOUNTS.find((account) => account.type === 'SUPPLIER')!;
    const originHeaders = { Origin: 'https://neture.co.kr' };
    let tokens: { accessToken: string; refreshToken: string } | undefined;
    try {
      const login = await request.post(`${V1}/auth/email/login`, {
        headers: originHeaders,
        data: { email: demo.email, password: demo.password, includeLegacyTokens: true },
      });
      expect(login.status()).toBe(200);
      const loginBody = await login.json();
      tokens = loginBody.data?.tokens ?? loginBody.tokens;
      expect(typeof tokens?.accessToken).toBe('string');
      expect(typeof tokens?.refreshToken).toBe('string');
      const headers = { ...originHeaders, Authorization: `Bearer ${tokens!.accessToken}` };
      const me = await request.get(`${V1}/auth/me`, { headers });
      expect(me.status()).toBe(200);
      const protectedRoute = await request.get(`${V1}/admin/platform-accounts`, { headers });
      expect(protectedRoute.status()).toBe(403);
      expect((await protectedRoute.json()).code).toBe('ROLE_REQUIRED');
      for (const path of ['/password', '/__does_not_exist__']) {
        const response = await request.patch(`${base}${path}`, { headers, data: {} });
        expect(response.status()).toBe(404);
      }
    } finally {
      if (tokens?.accessToken) {
        const logout = await request.post(`${V1}/auth/logout`, {
          headers: { ...originHeaders, Authorization: `Bearer ${tokens.accessToken}` },
          data: { refreshToken: tokens.refreshToken },
        });
        expect(logout.status()).toBe(200);
      }
    }
});
