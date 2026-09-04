/**
 * Cafe24 B2B 매장 회원 — Pilot 세션 (HMAC 서명 쿠키)
 *
 * WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1 §8 · §10
 *
 * 왜 O4O JWT 를 발급하지 않는가:
 *   이 사용자는 **비밀번호 credential 이 없는** 합성 계정이다(§10). O4O 표준 JWT 를
 *   내주면 `requireAuth` 만 걸린 모든 `/api/v1/**` 라우트가 즉시 열린다 — Pilot 범위를
 *   훨씬 넘는 권한 확대다. 그래서 **cafe24-b2b Pilot 라우트에서만 통하는** 좁은 세션을
 *   따로 둔다. 기존 O4O login/password 흐름에는 편입하지 않는다(§10).
 *
 * 서명 방식은 `cafe24-oauth-state.ts` 와 동일한 HMAC-SHA256 + timingSafeEqual 이다
 * (검증 규칙을 두 벌로 만들지 않는다).
 */

import crypto from 'crypto';

/** Pilot 세션 수명. Cafe24 access token 수명(2h)과 맞춘다. */
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export const CAFE24_B2B_SESSION_COOKIE = 'c24b2b_session';

export interface Cafe24MemberSession {
  /** cafe24_member_links.id */
  linkId: string;
  userId: string;
  organizationId: string;
  mallId: string;
  shopNo: number;
  exp: number;
}

function sign(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

/**
 * @param notAfter Cafe24 Customer Access Token 의 실제 만료 시각(선택).
 *   주어지면 세션 수명을 그보다 길게 잡지 않는다 — Cafe24 쪽 인증이 끝났는데 O4O
 *   Pilot 세션만 살아 있는 상태를 만들지 않기 위해서다. 이 값은 호출 측에서
 *   `parseCafe24Timestamp()` 로 파싱한 결과여야 한다 (§11 — 새 파서 작성 금지).
 */
export function issueMemberSession(
  secret: string,
  input: Omit<Cafe24MemberSession, 'exp'>,
  notAfter?: Date | null,
): string {
  const ttlExp = Date.now() + SESSION_TTL_MS;
  const capped =
    notAfter instanceof Date && Number.isFinite(notAfter.getTime())
      ? Math.min(ttlExp, notAfter.getTime())
      : ttlExp;
  const payload: Cafe24MemberSession = { ...input, exp: capped };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(secret, body)}`;
}

/** 서명·만료·형식을 한 번에 판정한다. 실패 사유는 구분해 노출하지 않는다(정보 최소화). */
export function verifyMemberSession(secret: string, token: string): Cafe24MemberSession | null {
  const parts = (token || '').split('.');
  if (parts.length !== 2) return null;

  const [body, mac] = parts;
  const expected = sign(secret, body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Cafe24MemberSession;
    if (!payload?.linkId || !payload?.userId || !payload?.organizationId) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export const CAFE24_B2B_SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_TTL_MS,
  path: '/api/v1/cafe24-b2b',
};
