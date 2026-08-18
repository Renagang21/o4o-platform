/**
 * Cafe24 token 암호화 전제 검사
 * WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1 §4 (평문 token 저장 금지)
 *
 * 배경: 저장소의 암호화 선례는 `utils/crypto.ts` 의 AES-256-CBC 이고
 * 이미 store-policy 의 apiKey/apiSecret 이 이 경로를 쓴다. 그러나 이 유틸은
 * `ENCRYPTION_KEY` 가 없으면 **소스에 박힌 기본 키로 조용히 대체**한다.
 * 2026-08-18 확인 결과 프로덕션 Cloud Run 에 `ENCRYPTION_KEY` 가 설정돼 있지 않다.
 *
 * 기본 키로 암호화된 token 은 사실상 난독화일 뿐이므로, Cafe24 OAuth token 은
 * **키가 제대로 설정된 환경에서만 저장한다** — 조용히 약한 암호로 저장하지 않는다.
 * (기존 store-policy 경로의 동작은 이번 WO 범위 밖이라 건드리지 않는다. 별도 보고.)
 */

/** utils/crypto.ts 의 fallback 값과 동일 — 이 값이면 "미설정"으로 본다 */
const CRYPTO_DEFAULT_KEY = 'default-32-char-encryption-key!!';

export function isTokenEncryptionConfigured(): boolean {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) return false;
  if (key === CRYPTO_DEFAULT_KEY) return false;
  return Buffer.from(key).length >= 32;
}

/**
 * token 저장 직전에 호출한다. 부적합하면 저장하지 않고 실패시킨다(fail-closed).
 */
export function assertTokenEncryptionConfigured(): void {
  if (!isTokenEncryptionConfigured()) {
    throw new Error('CAFE24_TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED');
  }
}
