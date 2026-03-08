/**
 * Referral Token Utility — WO-O4O-PARTNER-HUB-CORE-V1
 *
 * URL ?ref=TOKEN 파라미터를 캡처하여 sessionStorage에 보존.
 * 주문 생성 시 전달, 주문 완료 시 삭제.
 */

const REFERRAL_KEY = 'neture_referral_token';

export function captureReferralToken(): void {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    sessionStorage.setItem(REFERRAL_KEY, ref);
  }
}

export function getReferralToken(): string | null {
  return sessionStorage.getItem(REFERRAL_KEY);
}

export function clearReferralToken(): void {
  sessionStorage.removeItem(REFERRAL_KEY);
}
