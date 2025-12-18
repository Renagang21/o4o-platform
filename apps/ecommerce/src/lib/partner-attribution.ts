/**
 * Partner Attribution System
 *
 * Last-touch Attribution 기반 파트너 추적
 * - URL param (ref=PARTNER_CODE) 캡처
 * - Cookie 저장 (30일 TTL, 재클릭 시 갱신)
 * - 로그인 시 userId 매핑
 * - 자기귀속 방지
 *
 * @package Phase K - Partner Flow
 */

const PARTNER_COOKIE_NAME = 'partner_ref';
const PARTNER_COOKIE_TTL_DAYS = 30;

/**
 * Partner Attribution 정보
 */
export interface PartnerAttribution {
  partnerCode: string;
  capturedAt: string;
  source: 'url' | 'cookie';
}

/**
 * URL에서 파트너 코드 추출
 */
export function extractPartnerCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('ref') || urlParams.get('partner') || null;
}

/**
 * Cookie에서 파트너 코드 읽기
 */
export function getPartnerCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === PARTNER_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Cookie에 파트너 코드 저장 (Last-touch, TTL 갱신)
 */
export function setPartnerCookie(partnerCode: string): void {
  if (typeof document === 'undefined') return;

  const expires = new Date();
  expires.setDate(expires.getDate() + PARTNER_COOKIE_TTL_DAYS);

  document.cookie = `${PARTNER_COOKIE_NAME}=${encodeURIComponent(
    partnerCode
  )}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Cookie 삭제
 */
export function clearPartnerCookie(): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${PARTNER_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/**
 * Attribution 캡처 (URL → Cookie)
 * Last-touch: 재클릭 시 기존 값 덮어쓰고 TTL 갱신
 */
export function captureAttribution(): PartnerAttribution | null {
  const urlCode = extractPartnerCodeFromUrl();

  if (urlCode) {
    // URL에서 파트너 코드 발견 → Cookie 저장 (Last-touch)
    setPartnerCookie(urlCode);
    return {
      partnerCode: urlCode,
      capturedAt: new Date().toISOString(),
      source: 'url',
    };
  }

  const cookieCode = getPartnerCookie();
  if (cookieCode) {
    return {
      partnerCode: cookieCode,
      capturedAt: new Date().toISOString(),
      source: 'cookie',
    };
  }

  return null;
}

/**
 * 현재 Attribution 파트너 코드 반환
 */
export function getCurrentPartnerCode(): string | null {
  // URL 우선 (Last-touch)
  const urlCode = extractPartnerCodeFromUrl();
  if (urlCode) {
    setPartnerCookie(urlCode); // TTL 갱신
    return urlCode;
  }

  return getPartnerCookie();
}

/**
 * 자기귀속 여부 확인
 * @param currentUserPartnerId 현재 로그인 사용자의 파트너 ID (있는 경우)
 * @param attributedPartnerId 귀속될 파트너 ID
 */
export function isSelfAttribution(
  currentUserPartnerId: string | null | undefined,
  attributedPartnerId: string | null | undefined
): boolean {
  if (!currentUserPartnerId || !attributedPartnerId) return false;
  return currentUserPartnerId === attributedPartnerId;
}

/**
 * 주문용 Attribution 정보 해결
 * 자기귀속 방지 포함
 */
export function resolveAttributionForOrder(
  currentUserPartnerId?: string | null
): string | null {
  const partnerCode = getCurrentPartnerCode();

  if (!partnerCode) return null;

  // 자기귀속 방지 (코드 수준에서는 ID 비교 필요 - API에서 처리)
  // 여기서는 코드만 반환, 실제 검증은 서버에서

  return partnerCode;
}

/**
 * URL에서 ref 파라미터 제거 (히스토리 정리용)
 */
export function cleanUrlAfterCapture(): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  if (url.searchParams.has('ref') || url.searchParams.has('partner')) {
    url.searchParams.delete('ref');
    url.searchParams.delete('partner');
    window.history.replaceState({}, '', url.toString());
  }
}

/**
 * LocalStorage에 userId-partnerCode 매핑 저장 (로그인 시)
 */
export function mapAttributionToUser(userId: string): void {
  const partnerCode = getCurrentPartnerCode();
  if (!partnerCode) return;

  const mapping = {
    userId,
    partnerCode,
    mappedAt: new Date().toISOString(),
  };

  localStorage.setItem('partner_user_mapping', JSON.stringify(mapping));
}

/**
 * userId-partnerCode 매핑 조회
 */
export function getUserAttributionMapping(): {
  userId: string;
  partnerCode: string;
  mappedAt: string;
} | null {
  const stored = localStorage.getItem('partner_user_mapping');
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Cookie에서 파트너 ID 읽기 (Alias)
 * Phase N-1 Checkout에서 사용
 */
export function getPartnerIdFromCookie(): string | null {
  return getCurrentPartnerCode();
}
