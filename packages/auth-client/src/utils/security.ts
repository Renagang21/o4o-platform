/**
 * 보안 관련 유틸리티 함수들
 */

/**
 * 보안 헤더 생성
 */
export function createSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  };

  // CSRF 토큰이 있다면 추가
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  return headers;
}

/**
 * CSRF 토큰 조회
 */
function getCsrfToken(): string | null {
  // 메타 태그에서 CSRF 토큰 조회
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  return metaTag?.getAttribute('content') || null;
}

/**
 * 안전한 쿠키 옵션 생성
 */
export function createSecureCookieOptions(domain: string = '.neture.co.kr') {
  return {
    domain,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    httpOnly: false, // 클라이언트 접근 필요 시
  };
}

/**
 * 세션 스토리지 암호화 키 생성
 */
export function generateSessionKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 로컬 스토리지 데이터 암호화 (간단한 인코딩)
 */
export function encodeStorage(data: string): string {
  try {
    return btoa(encodeURIComponent(data));
  } catch (error) {
    return data;
  }
}

/**
 * 로컬 스토리지 데이터 복호화
 */
export function decodeStorage(encodedData: string): string {
  try {
    return decodeURIComponent(atob(encodedData));
  } catch (error) {
    return encodedData;
  }
}

/**
 * IP 주소 검증 (개발용)
 */
export function isValidIPRange(_ip: string, _allowedRanges: string[]): boolean {
  // 실제 환경에서는 서버에서 처리해야 함
  return true; // 클라이언트에서는 우회 가능하므로 서버 검증 필수
}

/**
 * 사용자 에이전트 검증
 */
export function validateUserAgent(): boolean {
  const userAgent = navigator.userAgent;
  
  // 의심스러운 봇이나 자동화 도구 탐지
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /postman/i
  ];

  return !suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * 브라우저 핑거프린팅 (기본)
 */
export function generateBrowserFingerprint(): string {
  const factors = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    (navigator as any).deviceMemory || 0
  ];

  return btoa(factors.join('|'));
}

/**
 * 세션 만료 경고 시간 계산
 */
export function calculateWarningTime(sessionDuration: number, warningPercent: number = 0.8): number {
  return sessionDuration * warningPercent;
}