/**
 * Auth Runtime E2E — 은퇴한 password endpoint 가 되살아나지 않는다
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 Phase A 의 런타임 판정을 **실제 배포된 API** 에서 확인한다.
 * 정적 guard(`apps/api-server/src/__tests__/legacy-password-auth-retirement.spec.ts`)는 소스를 보고,
 * 이 스위트는 같은 계약을 HTTP 로 본다 — 빌드·배포 과정에서 구 revision 이 남는 경우를 잡는다.
 *
 * 고정하는 것
 * -----------
 *  R1 은퇴 endpoint 는 **404**(route 부재). 401/400 이면 route 가 살아 있다는 뜻이므로 실패다.
 *  R2 Google 경로는 살아 있고 **검증이 동작한다** — 가짜 idToken 에 401 `GOOGLE_ID_TOKEN_INVALID`.
 *     (성공 경로는 실제 Google 계정이 필요하므로 통제된 배포 창의 사용자 smoke 에서 본다.)
 *  R3 은퇴 endpoint 응답에 password 관련 힌트가 없다(존재를 알려주는 메시지 0).
 *
 * 쓰기 없음 — 전부 거절되는 요청이며 유효한 자격증명을 보내지 않는다.
 */
import { test, expect } from '@playwright/test';

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
  ['내 비밀번호 변경', 'put', '/users/password', { currentPassword: 'x', newPassword: 'y', newPasswordConfirm: 'y' }],
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

  test('관리자 비밀번호 설정 — PATCH /admin/platform-accounts/:id/password → 404', async ({ request }) => {
    const res = await request.patch(
      `${V1}/admin/platform-accounts/00000000-0000-4000-8000-000000000000/password`,
      { data: { newPassword: 'x' }, failOnStatusCode: false },
    );
    // 인증 미보유 상태이므로 401 도 나올 수 있으나, route 자체가 없으면 404 다.
    // 401 이면 route 가 남아 있다는 뜻이므로 실패로 본다.
    expect(res.status()).toBe(404);
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
      data: { idToken: 'not-a-real-google-id-token', consents: { terms: true, privacy: true } },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body?.code).toBe('GOOGLE_ID_TOKEN_INVALID');
  });

  test('전환기 bootstrap 경로는 닫혀 있다 — POST /auth/google/bootstrap-admin → 404', async ({ request }) => {
    const res = await request.post(`${V1}/auth/google/bootstrap-admin`, {
      data: { idToken: 'x', bootstrapCode: 'closed-window-code-1234567890' },
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(404);
  });
});
