/**
 * 대칭 암호화 유틸 (AES-256-CBC) — 저장 시 암호화가 필요한 credential 공용 경로
 * WO-O4O-ENCRYPTION-KEY-CANONICAL-ROLLOUT-V1 §5
 *
 * 이 파일은 예전에 `ENCRYPTION_KEY` 가 없으면 **소스에 박힌 기본 키**로 조용히 대체했다.
 * 공개 저장소에 키가 있는 상태의 암호화는 사실상 난독화이므로 그 fallback 을 제거했다.
 *
 * 계약:
 *   - `ENCRYPTION_KEY` 미설정 / 32바이트 미만 / 은퇴한 기본 키와 동일 → **암복호화 자체를 거부**한다(fail-closed).
 *     조용히 약한 키로 암호화하지 않는다.
 *   - 암호문 포맷은 기존과 동일한 `ivHex:cipherHex` — 포맷 변경 없음.
 *   - `encryptWithKey` / `decryptWithKey` 는 키를 명시적으로 받는다. **키 교체 러너 전용**이며
 *     런타임 경로는 항상 canonical 키를 쓰는 `encrypt` / `decrypt` 를 사용한다.
 */

import crypto from 'crypto';
import logger from './logger.js';

const IV_LENGTH = 16; // AES 고정
const MIN_KEY_BYTES = 32; // AES-256

/**
 * 은퇴한 기본 키. 소스에 공개돼 있었으므로 **유효한 키로 취급하지 않는다.**
 * 이 값이 남아있는 이유는 단 하나 — 이 키로 만들어진 암호문을 교체 러너가 읽어내기 위함이다.
 */
export const RETIRED_DEFAULT_ENCRYPTION_KEY = 'default-32-char-encryption-key!!';

export const ENCRYPTION_KEY_NOT_CONFIGURED = 'ENCRYPTION_KEY_NOT_CONFIGURED';

export class EncryptionKeyNotConfiguredError extends Error {
  readonly code = ENCRYPTION_KEY_NOT_CONFIGURED;
  constructor(reason: string) {
    super(`${ENCRYPTION_KEY_NOT_CONFIGURED}: ${reason}`);
    this.name = 'EncryptionKeyNotConfiguredError';
  }
}

/** 임의 키 문자열 → AES-256 용 32바이트. (짧으면 padding, 길면 절단 — 기존 동작 보존) */
const toAesKey = (raw: string): Buffer => {
  const key = Buffer.from(raw);
  if (key.length === 32) return key;
  if (key.length < 32) {
    const padded = Buffer.alloc(32);
    key.copy(padded);
    return padded;
  }
  return key.subarray(0, 32);
};

/** 현재 환경이 canonical 키를 갖췄는가 */
export const isEncryptionKeyConfigured = (): boolean => {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return false;
  if (raw === RETIRED_DEFAULT_ENCRYPTION_KEY) return false;
  return Buffer.from(raw).length >= MIN_KEY_BYTES;
};

/** canonical 키를 가져온다. 조건 미달이면 던진다(fail-closed). */
export const getCanonicalKey = (): Buffer => {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new EncryptionKeyNotConfiguredError('ENCRYPTION_KEY 가 설정돼 있지 않습니다');
  if (raw === RETIRED_DEFAULT_ENCRYPTION_KEY) {
    throw new EncryptionKeyNotConfiguredError('은퇴한 기본 키는 사용할 수 없습니다');
  }
  if (Buffer.from(raw).length < MIN_KEY_BYTES) {
    throw new EncryptionKeyNotConfiguredError(`키 길이가 ${MIN_KEY_BYTES}바이트 미만입니다`);
  }
  return toAesKey(raw);
};

/** 키를 명시적으로 받아 암호화한다. **키 교체 러너 전용.** */
export const encryptWithKey = (text: string, rawKey: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', toAesKey(rawKey), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

/** 키를 명시적으로 받아 복호화한다. **키 교체 러너 전용.** */
export const decryptWithKey = (text: string, rawKey: string): string => {
  const parts = text.split(':');
  if (parts.length !== 2) throw new Error('Invalid encrypted format');
  const iv = Buffer.from(parts[0], 'hex');
  const payload = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', toAesKey(rawKey), iv);
  const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
  return decrypted.toString('utf8');
};

export const encrypt = (text: string): string => {
  const key = getCanonicalKey(); // 미설정이면 여기서 던진다 — 약한 키로 저장하지 않는다
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

export const decrypt = (text: string): string => {
  const key = getCanonicalKey();
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const payload = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Hash function for non-reversible data (like passwords)
export const hash = (text: string): string => {
  return crypto
    .createHash('sha256')
    .update(text)
    .digest('hex');
};

// Compare hash for verification
export const verifyHash = (text: string, hashedText: string): boolean => {
  return hash(text) === hashedText;
};
