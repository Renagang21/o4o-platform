/**
 * WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1 §5-2 · §4
 *
 * 외부 자격정보 없이 검증 가능한 두 계약만 다룬다:
 *   1. OAuth state 서명/만료 (CSRF 방지 — 저장소 없이 stateless)
 *   2. token 암호화 전제 (약한 기본 키에서 fail-closed)
 *
 * Cafe24 네트워크 호출은 이 테스트 범위가 아니다(실 몰 필요).
 */

import { issueState, verifyState } from '../modules/cafe24/cafe24-oauth-state.js';
import { isTokenEncryptionConfigured } from '../modules/cafe24/cafe24-token-crypto.js';

const SECRET = 'test-client-secret-value';

describe('cafe24 oauth state', () => {
  it('정상 발급된 state 를 검증하고 mallId/shopNo 를 복원한다', () => {
    const state = issueState(SECRET, 'myshop', 2);
    const payload = verifyState(SECRET, state);
    expect(payload).not.toBeNull();
    expect(payload?.mallId).toBe('myshop');
    expect(payload?.shopNo).toBe(2);
  });

  it('다른 secret 으로 서명된 state 는 거부한다', () => {
    const state = issueState(SECRET, 'myshop', 1);
    expect(verifyState('another-secret', state)).toBeNull();
  });

  it('본문이 변조된 state 는 거부한다', () => {
    const state = issueState(SECRET, 'myshop', 1);
    const [body, mac] = state.split('.');
    const tampered = Buffer.from(
      JSON.stringify({ mallId: 'attacker', shopNo: 1, nonce: 'x', exp: Date.now() + 60000 }),
    ).toString('base64url');
    expect(tampered).not.toBe(body);
    expect(verifyState(SECRET, `${tampered}.${mac}`)).toBeNull();
  });

  it('형식이 깨진 state 는 거부한다', () => {
    expect(verifyState(SECRET, '')).toBeNull();
    expect(verifyState(SECRET, 'no-dot')).toBeNull();
    expect(verifyState(SECRET, 'a.b.c')).toBeNull();
  });
});

describe('cafe24 token 암호화 전제', () => {
  const original = process.env.ENCRYPTION_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = original;
  });

  it('ENCRYPTION_KEY 미설정이면 저장을 허용하지 않는다', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(isTokenEncryptionConfigured()).toBe(false);
  });

  it('utils/crypto 의 기본 fallback 키는 미설정으로 취급한다', () => {
    process.env.ENCRYPTION_KEY = 'default-32-char-encryption-key!!';
    expect(isTokenEncryptionConfigured()).toBe(false);
  });

  it('32바이트 미만 키는 거부한다', () => {
    process.env.ENCRYPTION_KEY = 'too-short';
    expect(isTokenEncryptionConfigured()).toBe(false);
  });

  it('32바이트 이상 고유 키는 허용한다', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(32);
    expect(isTokenEncryptionConfigured()).toBe(true);
  });
});

/**
 * WO-O4O-CAFE24-OAUTH-CALLBACK-AUTH-BOUNDARY-FIX-V1
 *
 * callback 은 O4O 로그인 쿠키가 아니라 **서명 state** 를 신뢰 경계로 쓴다.
 * 따라서 state 가 그 역할을 감당하는지 — 만료·변조·attribution — 를 못 박는다.
 */
describe('cafe24 callback 신뢰 경계 (state)', () => {
  it('만료된 state 는 거부한다', () => {
    const state = issueState(SECRET, 'myshop', 1);
    const real = Date.now;
    try {
      Date.now = () => real() + 6 * 60 * 1000; // TTL 5분 초과
      expect(verifyState(SECRET, state)).toBeNull();
    } finally {
      Date.now = real;
    }
  });

  it('OAuth 를 시작한 관리자 id 를 state 에 담아 복원한다 (attribution 전용)', () => {
    const state = issueState(SECRET, 'myshop', 1, 'admin-uuid-1');
    expect(verifyState(SECRET, state)?.uid).toBe('admin-uuid-1');
  });

  it('uid 없이 발급된 state 도 유효하다 (구 revision 호환)', () => {
    const payload = verifyState(SECRET, issueState(SECRET, 'myshop', 1));
    expect(payload).not.toBeNull();
    expect(payload?.uid ?? null).toBeNull();
  });

  it('uid 를 변조하면 서명이 깨져 거부된다 — 권한 근거로 쓸 수 없다', () => {
    const state = issueState(SECRET, 'myshop', 1, 'admin-uuid-1');
    const [body, mac] = state.split('.');
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    decoded.uid = 'someone-else';
    const forged = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    expect(verifyState(SECRET, `${forged}.${mac}`)).toBeNull();
  });

  it('state 의 mallId 는 서명 대상이므로 바꿔치기할 수 없다', () => {
    const state = issueState(SECRET, 'myshop', 1);
    const [body, mac] = state.split('.');
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    decoded.mallId = 'attacker-mall';
    const forged = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    expect(verifyState(SECRET, `${forged}.${mac}`)).toBeNull();
  });
});
