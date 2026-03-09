/**
 * Referral Attribution Utility
 *
 * WO-O4O-REFERRAL-ATTRIBUTION-V1
 *
 * URL ref 파라미터를 cookie에 저장하고, checkout 시 order metadata에 전달.
 * Commerce Core 변경 없이 metadata 기반 구현.
 *
 * ref 형식:
 *   ?ref=partner:abc123  → { referrerId: 'abc123', referrerType: 'partner' }
 *   ?ref=qr:flyer001     → { referrerId: 'flyer001', referrerType: 'qr' }
 *   ?ref=abc123           → { referrerId: 'abc123', referrerType: 'external' }
 */

export type ReferrerType = 'partner' | 'qr' | 'content' | 'external';

export interface ReferralInfo {
  referrerId: string;
  referrerType: ReferrerType;
  timestamp: string;
}

const COOKIE_KEY = 'o4o_ref';
const COOKIE_MAX_AGE_DAYS = 30;

const VALID_TYPES: ReferrerType[] = ['partner', 'qr', 'content', 'external'];

/**
 * URL searchParams에서 ref 파라미터를 추출하여 ReferralInfo로 변환
 */
export function extractReferralFromUrl(): ReferralInfo | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (!ref || !ref.trim()) return null;

    const colonIdx = ref.indexOf(':');
    let referrerType: ReferrerType = 'external';
    let referrerId: string;

    if (colonIdx > 0) {
      const typeCandidate = ref.slice(0, colonIdx) as ReferrerType;
      if (VALID_TYPES.includes(typeCandidate)) {
        referrerType = typeCandidate;
        referrerId = ref.slice(colonIdx + 1);
      } else {
        referrerId = ref;
      }
    } else {
      referrerId = ref;
    }

    if (!referrerId.trim()) return null;

    return {
      referrerId: referrerId.trim(),
      referrerType,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * ReferralInfo를 cookie에 저장 (30일 만료)
 */
export function saveReferralCookie(info: ReferralInfo): void {
  try {
    const value = encodeURIComponent(JSON.stringify(info));
    const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // cookie 저장 실패 시 무시
  }
}

/**
 * Cookie에서 ReferralInfo 읽기
 */
export function getReferralCookie(): ReferralInfo | null {
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [key, ...valueParts] = cookie.trim().split('=');
      if (key === COOKIE_KEY) {
        const value = valueParts.join('=');
        return JSON.parse(decodeURIComponent(value));
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Referral cookie 삭제
 */
export function clearReferralCookie(): void {
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
}
