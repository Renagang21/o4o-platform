/**
 * WO-O4O-ENCRYPTION-KEY-CANONICAL-ROLLOUT-V1 §5 · §7
 *
 * 검증 대상:
 *   1. 키 미설정 / 은퇴 기본 키 / 32바이트 미만 에서 **암복호화가 거부**되는가 (fail-closed)
 *   2. 정상 키에서 왕복이 성립하는가 (암호문 포맷 불변)
 *   3. 은퇴 기본 키로 만든 기존 암호문을 **읽어서 새 키로 재암호화**할 수 있는가 (교체 러너 전제)
 */

import {
  RETIRED_DEFAULT_ENCRYPTION_KEY,
  decrypt,
  decryptWithKey,
  encrypt,
  encryptWithKey,
  isEncryptionKeyConfigured,
} from '../utils/crypto.js';

const CANONICAL = 'canonical-test-key-0123456789abcdef'; // 32바이트 초과
const CIPHER_FORMAT = /^[0-9a-f]{32}:[0-9a-f]+$/;

describe('ENCRYPTION_KEY canonical 계약', () => {
  const original = process.env.ENCRYPTION_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = original;
  });

  it('키가 없으면 암호화를 거부한다 (소스 기본 키로 조용히 대체하지 않는다)', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(isEncryptionKeyConfigured()).toBe(false);
    expect(() => encrypt('secret')).toThrow(/ENCRYPTION_KEY_NOT_CONFIGURED/);
    expect(() => decrypt('00:00')).toThrow(/ENCRYPTION_KEY_NOT_CONFIGURED/);
  });

  it('은퇴한 기본 키는 유효한 키로 취급하지 않는다', () => {
    process.env.ENCRYPTION_KEY = RETIRED_DEFAULT_ENCRYPTION_KEY;
    expect(isEncryptionKeyConfigured()).toBe(false);
    expect(() => encrypt('secret')).toThrow(/ENCRYPTION_KEY_NOT_CONFIGURED/);
  });

  it('32바이트 미만 키는 거부한다 (padding 으로 통과시키지 않는다)', () => {
    process.env.ENCRYPTION_KEY = 'too-short-key';
    expect(isEncryptionKeyConfigured()).toBe(false);
    expect(() => encrypt('secret')).toThrow(/ENCRYPTION_KEY_NOT_CONFIGURED/);
  });

  it('정상 키에서 왕복하고 암호문 포맷(ivHex:cipherHex)은 그대로다', () => {
    process.env.ENCRYPTION_KEY = CANONICAL;
    expect(isEncryptionKeyConfigured()).toBe(true);
    const ct = encrypt('pg-api-secret-value');
    expect(ct).toMatch(CIPHER_FORMAT);
    expect(decrypt(ct)).toBe('pg-api-secret-value');
  });

  it('같은 평문이라도 IV 가 달라 암호문이 매번 다르다', () => {
    process.env.ENCRYPTION_KEY = CANONICAL;
    expect(encrypt('same')).not.toBe(encrypt('same'));
  });
});

describe('키 교체 (기존 암호문 재암호화)', () => {
  const original = process.env.ENCRYPTION_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = original;
  });

  it('은퇴 기본 키로 만든 암호문은 새 키로 읽히지 않는다 (교체가 필요한 이유)', () => {
    const legacyCt = encryptWithKey('legacy-secret', RETIRED_DEFAULT_ENCRYPTION_KEY);
    expect(() => decryptWithKey(legacyCt, CANONICAL)).toThrow();
  });

  it('legacy 로 복호화 → canonical 로 재암호화 하면 값이 보존된다', () => {
    const legacyCt = encryptWithKey('legacy-secret', RETIRED_DEFAULT_ENCRYPTION_KEY);
    const plaintext = decryptWithKey(legacyCt, RETIRED_DEFAULT_ENCRYPTION_KEY);
    const rotated = encryptWithKey(plaintext, CANONICAL);
    expect(decryptWithKey(rotated, CANONICAL)).toBe('legacy-secret');
  });

  it('이미 canonical 키로 읽히는 값은 재교체 대상이 아니다 (멱등)', () => {
    const ct = encryptWithKey('already', CANONICAL);
    expect(decryptWithKey(ct, CANONICAL)).toBe('already');
    expect(() => decryptWithKey(ct, RETIRED_DEFAULT_ENCRYPTION_KEY)).toThrow();
  });
});
