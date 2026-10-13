/**
 * Auth Runtime E2E — 은퇴한 password endpoint 가 되살아나지 않는다
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 Phase A 의 런타임 판정을 **실제 배포된 API** 에서 확인한다.
 * 정적 guard(`apps/api-server/src/__tests__/legacy-password-auth-retirement.spec.ts`)는 소스를 보고,
 * 이 스위트는 같은 계약을 HTTP 로 본다 — 빌드·배포 과정에서 구 revision 이 남는 경우를 잡는다.
 *
 * 고정하는 것
 * -----------
 *  R1 공개 라우터의 은퇴 endpoint 는 **404**(route 부재).
 *     인증이 먼저 실행되는 라우터의 401 은 route 부재를 증명하지 않는다(R1-b·정적 P2 병행).
 *  R2 Google 경로는 살아 있고 **검증이 동작한다** — 가짜 idToken 에 401 `GOOGLE_ID_TOKEN_INVALID`.
 *     (성공 경로는 실제 Google 계정이 필요하므로 통제된 배포 창의 사용자 smoke 에서 본다.)
 *  R3 은퇴 endpoint 응답에 password 관련 힌트가 없다(존재를 알려주는 메시지 0).
 *
 * 비밀번호·계정 데이터 쓰기 없음. 공개 Demo 세션을 만들고 그 세션만 종료한다.
 * 실제 사용자·운영자 자격정보는 사용하지 않는다.
 */
import { test, expect } from '@playwright/test';
import { PUBLIC_DEMO_ACCOUNTS } from '../../packages/auth-utils/src/demoAccounts';

const API_BASE_URL = process.env.E2E_API_BASE_URL || 'https://api.neture.co.kr';
const V1 = `${API_BASE_URL}/api/v1`;

/** [설명, method, path, body] — 전부 404 여야 한다 */
const RETIRED_ENDPOINTS: [string, 'post' | 'put' | 'patch', string, Record<string, unknown>][] = [
  ['email/password 로그인', 'post', '/auth/login', { email: 'retired@example.test', password: 'x' }],
  ['password 회원가입', 'post', '/auth/register', { email: 'retired@example.test', password: 'x', name: 'x' }],
  ['password 회원가입(alias)', 'post', '/auth/signup', { email: 'retired@example.test', password: 'x', name: 'x' }],
  ['가입 UX email 존재확인', 'post', '/auth/check-email', { email: 'retired@example.test' }],
  ['비밀번호 재설정 요청', 'post', '/auth/forgot-password', { email: 'retired@example.test' }],
  ['비밀번호 재설정 적용', 'post', '/auth/reset-password', { token: 'x', newPassword: 'x' }],
  ['아이디 찾기', 'post', '/auth/find-id', { phone: '01000000000' }],
  ['Google 명시 연결(password 재인증)', 'post', '/auth/google/link', { idToken: 'x', currentPassword: 'x' }],
];

test.describe('은퇴한 password endpoint (R1·R3)', () => {
  for (const [label, method, routePath, body] of RETIRED_ENDPOINTS) {
    test(`${label} — ${method.toUpperCase()} ${routePath} → 404`, async ({ request }) => {
      const res = await request[method](`${V1}${routePath}`, { data: body, failOnStatusCode: false });
      expect(res.status(), `${routePath} 가 살아 있다(status=${res.status()})`).toBe(404);

      // R3 — 응답이 password 경로의 존재를 암시하지 않는다
      const text = (await res.text()).toLowerCase();
      for (const hint of ['invalid_credentials', 'invalid password', 'password_not_set', '비밀번호가 올바르지']) {
        expect(text.includes(hint), `응답에 password 힌트가 있다: ${hint}`).toBe(false);
      }
    });
  }

});

test.describe('requireAuth 뒤의 은퇴 경로 (R1-b)', () => {
  test('관리자 password 경로는 익명 인증 거절 뒤 공개 Demo 세션에서 실제 404로 구분된다', async ({ request }) => {
    // platform-accounts.routes.ts의 router.use(authenticate)가 route 조회보다 먼저 실행된다.
    // 익명 401만으로 은퇴를 판정하지 않는다. route 부재는 정적 P2가 별도로 검증한다.
    const base = `${V1}/admin/platform-accounts/00000000-0000-4000-8000-000000000000`;
    const retired = await request.patch(`${base}/password`, {
      data: { newPassword: 'x' }, failOnStatusCode: false,
    });
    const nonexistent = await request.patch(`${base}/__does_not_exist__`, {
      data: {}, failOnStatusCode: false,
    });
    expect(retired.status()).toBe(401);
    expect(nonexistent.status()).toBe(401);
    expect((await retired.json()).code).toBe('AUTH_REQUIRED');
    expect((await nonexistent.json()).code).toBe('AUTH_REQUIRED');
    const text = (await retired.text()).toLowerCase();
    for (const hint of ['invalid_credentials', 'invalid password', 'password_not_set', '비밀번호가 올바르지']) {
      expect(text).not.toContain(hint);
    }

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

  /**
   * `PUT /users/password` 는 `/users/*` 라우터 전체에 `requireAuth` 가 걸려 있어 미인증 요청이
   * **404 이전에 401** 로 끝난다(2026-09-24 운영 실측: `/users/me/profile` · 없는 경로도 동일하게 401).
   * 따라서 401 은 은퇴 근거가 되지 못한다 — 같은 라우터의 임의 경로와 **구분 불가**함을 고정해
   * "401 을 보고 은퇴했다고 잘못 판정" 하는 일을 막는다. 소스 수준 부재는 정적 guard
   * (`apps/api-server/src/__tests__/legacy-password-auth-retirement.spec.ts` P2)가 본다.
   */
  test('PUT /users/password 는 미인증에서 401 이며, 같은 라우터의 임의 경로와 구분되지 않는다', async ({ request }) => {
    const retired = await request.put(`${V1}/users/password`, {
      data: { currentPassword: 'x', newPassword: 'y', newPasswordConfirm: 'y' },
      failOnStatusCode: false,
    });
    const nonexistent = await request.put(`${V1}/users/__does_not_exist__`, {
      data: {}, failOnStatusCode: false,
    });

    expect(retired.status()).toBe(401);
    expect(nonexistent.status()).toBe(401);
    // 응답에 password 관련 힌트가 없다(존재를 알려주지 않는다)
    expect((await retired.text()).toLowerCase()).not.toContain('password_not_set');
  });
});

test.describe('Google 경로 생존 + 검증 동작 (R2)', () => {
  test('POST /auth/google/login 은 살아 있고 가짜 토큰을 401 로 거절한다', async ({ request }) => {
    const res = await request.post(`${V1}/auth/google/login`, {
      data: { idToken: 'not-a-real-google-id-token' },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body?.code).toBe('GOOGLE_ID_TOKEN_INVALID');
  });

  test('POST /auth/google/signup 도 같은 검증을 거친다 (동의만으로 계정이 생기지 않는다)', async ({ request }) => {
    const res = await request.post(`${V1}/auth/google/signup`, {
      // 가입은 계정 센터에서만 시작한다. 이 헤더가 없으면 토큰 검증 전에 origin gate가 거절한다.
      headers: { Origin: 'https://neture.co.kr' },
      data: {
        idToken: 'not-a-real-google-id-token',
        consents: {
          // DTO 형식만 충족하는 합성 참조. 토큰 검증에서 거절되므로 약관 조회·계정 write에 도달하지 않는다.
          termsPolicy: { policyDocumentId: '11111111-1111-4111-8111-111111111111', version: 1 },
          terms: true, privacy: true, name: 'Fixture', phone: '01000000000',
        },
      },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body?.code).toBe('GOOGLE_ID_TOKEN_INVALID');
  });

  /**
   * 주의: 빈 body 로 찌르면 DTO 검증이 먼저 걸려 **400** 이 난다(route 생존 신호가 아니다).
   * 닫힘을 보려면 형식이 맞는 body 를 보내야 하고, 그때 404 `GOOGLE_ADMIN_BOOTSTRAP_DISABLED` 가 나온다
   * (2026-09-24 운영 실측 확인).
   */
  test('전환기 bootstrap 경로는 닫혀 있다 — POST /auth/google/bootstrap-admin → 404', async ({ request }) => {
    const res = await request.post(`${V1}/auth/google/bootstrap-admin`, {
      data: { idToken: 'x', bootstrapCode: 'closed-window-code-1234567890' },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(404);
  });
});
