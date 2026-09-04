/**
 * WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1
 *
 * 이 spec 이 고정하는 것은 Pilot 의 identity 계약이다.
 *   §D1  합성 email — 결정적 · user_identifier 원문 비노출 · 실제 메일 도달 불가
 *   §D3  Client ID 변경 = identity namespace 변경 (자동 migration 없음)
 *   §4   canonical member key = (mall_id, shop_no, user_identifier) — 교차 충돌 금지
 *   §10  로그 노출 최소화 (mask)
 *   §11  세션 만료 상한은 기존 parseCafe24Timestamp() 결과를 그대로 쓴다 (새 파서 금지)
 */

import {
  deriveCafe24MemberHash,
  deriveCafe24ClientNamespace,
  synthesizeCafe24MemberEmail,
  isCafe24SyntheticEmail,
  maskMemberHash,
  cafe24MemberOrganizationCode,
  CAFE24_B2B_SYNTHETIC_EMAIL_DOMAIN,
} from '../modules/cafe24/cafe24-member-identity.js';
import {
  issueMemberSession,
  verifyMemberSession,
  CAFE24_B2B_SESSION_COOKIE_OPTIONS,
} from '../modules/cafe24/cafe24-member-session.js';
import { parseCafe24Timestamp } from '../modules/cafe24/cafe24-oauth.client.js';

const BASE = {
  clientId: 'CLIENT_AAA',
  mallId: 'testmall',
  shopNo: 1,
  userIdentifier: 'u_9f3c1d2e4b5a6789',
};

describe('Cafe24 B2B member identity (§D1 · §D3 · §4)', () => {
  it('같은 입력이면 항상 같은 hash 다 — 재로그인 멱등성의 근거', () => {
    expect(deriveCafe24MemberHash(BASE)).toBe(deriveCafe24MemberHash({ ...BASE }));
    expect(deriveCafe24MemberHash(BASE)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('mall 이 다르면 다른 회원이다 — 다른 몰의 동일 user_identifier 충돌 금지 (§5)', () => {
    expect(deriveCafe24MemberHash({ ...BASE, mallId: 'othermall' })).not.toBe(
      deriveCafe24MemberHash(BASE),
    );
  });

  it('shop_no 가 다르면 다른 회원이다 (§4)', () => {
    expect(deriveCafe24MemberHash({ ...BASE, shopNo: 2 })).not.toBe(deriveCafe24MemberHash(BASE));
  });

  it('필드 경계가 섞여도 충돌하지 않는다 — 구분자 없는 단순 연결 회귀 방지', () => {
    // 'ab' + 'c' 와 'a' + 'bc' 가 같은 문자열로 접히면 서로 다른 회원이 한 계정을 공유한다.
    const a = deriveCafe24MemberHash({ ...BASE, mallId: 'ab', userIdentifier: 'c' });
    const b = deriveCafe24MemberHash({ ...BASE, mallId: 'a', userIdentifier: 'bc' });
    expect(a).not.toBe(b);
  });

  it('Client ID 가 바뀌면 namespace 가 갈린다 (§D3 — 자동 migration 하지 않는다)', () => {
    expect(deriveCafe24MemberHash({ ...BASE, clientId: 'CLIENT_BBB' })).not.toBe(
      deriveCafe24MemberHash(BASE),
    );
    expect(deriveCafe24ClientNamespace('CLIENT_AAA')).not.toBe(
      deriveCafe24ClientNamespace('CLIENT_BBB'),
    );
    expect(deriveCafe24ClientNamespace('CLIENT_AAA')).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('합성 email (§D1 · §10)', () => {
  const hash = deriveCafe24MemberHash(BASE);
  const email = synthesizeCafe24MemberEmail(hash);

  it('결정적이며 예약 도메인을 쓴다 — 실제 메일이 외부로 나갈 수 없다', () => {
    expect(email).toBe(synthesizeCafe24MemberEmail(hash));
    expect(email.endsWith(`@${CAFE24_B2B_SYNTHETIC_EMAIL_DOMAIN}`)).toBe(true);
    expect(CAFE24_B2B_SYNTHETIC_EMAIL_DOMAIN.endsWith('.local')).toBe(true);
  });

  it('user_identifier 원문을 포함하지 않는다 (§4 · §10)', () => {
    expect(email).not.toContain(BASE.userIdentifier);
    expect(email).not.toContain(BASE.mallId);
  });

  it('합성 email 을 식별할 수 있다 — UI 노출·메일 발송 차단 판정용', () => {
    expect(isCafe24SyntheticEmail(email)).toBe(true);
    expect(isCafe24SyntheticEmail('owner@example.com')).toBe(false);
  });

  it('mask 는 앞 8자만 남긴다 (§10 로그 정책)', () => {
    const masked = maskMemberHash(hash);
    expect(masked.startsWith(hash.slice(0, 8))).toBe(true);
    expect(masked.length).toBeLessThan(hash.length);
  });

  it('organization code 도 hash 파생이라 원문이 새지 않는다', () => {
    const code = cafe24MemberOrganizationCode(hash);
    expect(code.startsWith('c24b2b-')).toBe(true);
    expect(code).not.toContain(BASE.userIdentifier);
  });
});

describe('Pilot 세션 (§8 · §10 · §11)', () => {
  const secret = 'test-client-secret';
  const input = {
    linkId: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222',
    organizationId: '33333333-3333-4333-8333-333333333333',
    mallId: 'testmall',
    shopNo: 1,
  };

  it('발급 → 검증 왕복이 성립한다', () => {
    const s = verifyMemberSession(secret, issueMemberSession(secret, input));
    expect(s?.userId).toBe(input.userId);
    expect(s?.organizationId).toBe(input.organizationId);
  });

  it('다른 secret 으로는 검증되지 않는다 — identity spoofing 방지 (§10)', () => {
    expect(verifyMemberSession('other-secret', issueMemberSession(secret, input))).toBeNull();
  });

  it('본문을 조작하면 검증이 깨진다', () => {
    const token = issueMemberSession(secret, input);
    const [body, mac] = token.split('.');
    const tampered = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    tampered.organizationId = '44444444-4444-4444-8444-444444444444';
    const forged = `${Buffer.from(JSON.stringify(tampered)).toString('base64url')}.${mac}`;
    expect(verifyMemberSession(secret, forged)).toBeNull();
  });

  it('형식이 어긋나면 조용히 null 이다', () => {
    expect(verifyMemberSession(secret, '')).toBeNull();
    expect(verifyMemberSession(secret, 'no-dot')).toBeNull();
    expect(verifyMemberSession(secret, 'a.b.c')).toBeNull();
  });

  it('Cafe24 token 만료보다 오래 살지 않는다 (§11 — parseCafe24Timestamp 재사용)', () => {
    // offset 없는 KST 벽시계 문자열. Cloud Run(UTC) 에서도 같은 instant 여야 한다.
    const notAfter = parseCafe24Timestamp(new Date(Date.now() + 60_000).toISOString());
    const s = verifyMemberSession(secret, issueMemberSession(secret, input, notAfter));
    expect(s!.exp).toBe(notAfter.getTime());
  });

  it('token 만료가 세션 TTL 보다 멀면 TTL 이 상한이다', () => {
    const far = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const s = verifyMemberSession(secret, issueMemberSession(secret, input, far));
    expect(s!.exp).toBeLessThan(far.getTime());
  });

  it('이미 만료된 세션은 검증되지 않는다', () => {
    const past = new Date(Date.now() - 1000);
    expect(verifyMemberSession(secret, issueMemberSession(secret, input, past))).toBeNull();
  });

  it('쿠키는 httpOnly 이며 Pilot 경로에만 스코프된다 — O4O 다른 라우트로 새지 않는다', () => {
    expect(CAFE24_B2B_SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(CAFE24_B2B_SESSION_COOKIE_OPTIONS.path).toBe('/api/v1/cafe24-b2b');
  });
});
