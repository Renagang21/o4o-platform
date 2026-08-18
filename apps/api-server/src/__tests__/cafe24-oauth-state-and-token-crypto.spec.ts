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
