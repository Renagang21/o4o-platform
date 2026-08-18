/**
 * Cafe24 token 암호화 전제 검사
 * WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1 §4 (평문 token 저장 금지)
 * WO-O4O-ENCRYPTION-KEY-CANONICAL-ROLLOUT-V1 §5 — 판정 기준을 `utils/crypto.ts` 로 일원화
 *
 * 이전에는 이 파일이 기본 키 상수를 따로 갖고 있었다. 기준이 두 곳에 있으면 갈라지므로
 * canonical 판정(`isEncryptionKeyConfigured`)에 위임한다. 판단은 한 곳에만 둔다.
 */

import { isEncryptionKeyConfigured } from '../../utils/crypto.js';

export function isTokenEncryptionConfigured(): boolean {
  return isEncryptionKeyConfigured();
}

/**
 * token 저장 직전에 호출한다. 부적합하면 저장하지 않고 실패시킨다(fail-closed).
 */
export function assertTokenEncryptionConfigured(): void {
  if (!isTokenEncryptionConfigured()) {
    throw new Error('CAFE24_TOKEN_ENCRYPTION_KEY_NOT_CONFIGURED');
  }
}
