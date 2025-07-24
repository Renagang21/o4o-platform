/**
 * Affiliate 추적 및 쿠키 관리 유틸리티
 * 단일 단계 추천만 허용 (법적 준수)
 */

const REFERRAL_COOKIE_NAME = 'o4o_ref';
const REFERRAL_COOKIE_DAYS = 30;

/**
 * 쿠키 설정
 */
export function setReferralCookie(referralCode: string, source?: string): void {
  const expires = new Date();
  expires.setDate(expires.getDate() + REFERRAL_COOKIE_DAYS);
  
  const cookieData = {
    code: referralCode,
    source: source || 'direct',
    timestamp: new Date().toISOString()
  };
  
  document.cookie = `${REFERRAL_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(cookieData))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * 쿠키 읽기
 */
export function getReferralCookie(): { code: string; source: string; timestamp: string } | null {
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === REFERRAL_COOKIE_NAME && value) {
      try {
        return JSON.parse(decodeURIComponent(value));
      } catch {
        return null;
      }
    }
  }
  
  return null;
}

/**
 * 쿠키 삭제
 */
export function clearReferralCookie(): void {
  document.cookie = `${REFERRAL_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * URL에서 추천 파라미터 추출
 */
export function extractReferralFromURL(): { code: string; source: string } | null {
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref');
  const source = urlParams.get('utm_source') || urlParams.get('source') || 'direct';
  
  if (referralCode) {
    return { code: referralCode, source };
  }
  
  return null;
}

/**
 * 추천 클릭 추적
 */
export async function trackReferralClick(
  referralCode: string,
  source: string,
  productId?: string
): Promise<void> {
  try {
    const clickData = {
      referralCode,
      source,
      productId,
      landingPage: window.location.pathname,
      userAgent: navigator.userAgent,
      referer: document.referrer,
      timestamp: new Date().toISOString()
    };
    
    // API 호출로 클릭 기록
    await fetch('/api/v1/affiliate/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clickData)
    });
  } catch (error) {
    console.error('Failed to track referral click:', error);
  }
}

/**
 * 추천 전환 추적 (회원가입)
 */
export async function trackReferralConversion(
  userId: string,
  referralCode: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/v1/affiliate/track-conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        referralCode,
        conversionType: 'signup'
      })
    });
    
    const result = await response.json();
    
    // 전환 성공 시 쿠키 삭제
    if (result.success) {
      clearReferralCookie();
    }
    
    return result.success;
  } catch (error) {
    console.error('Failed to track referral conversion:', error);
    return false;
  }
}

/**
 * 단일 단계 추천 검증
 */
export async function validateSingleTierReferral(
  referrerId: string,
  referredId: string
): Promise<{ valid: boolean; reason?: string }> {
  // 자기 자신 추천 불가
  if (referrerId === referredId) {
    return { valid: false, reason: '자기 자신을 추천할 수 없습니다.' };
  }
  
  try {
    // API를 통해 순환 추천 체크
    const response = await fetch('/api/v1/affiliate/validate-referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referrerId, referredId })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to validate referral:', error);
    return { valid: false, reason: '추천 관계 검증에 실패했습니다.' };
  }
}

/**
 * 추천 관계 설정 (1단계만)
 */
export async function establishReferralRelationship(
  referralCode: string,
  referredUserId: string,
  source: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch('/api/v1/affiliate/establish-relationship', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referralCode,
        referredUserId,
        source,
        singleTierOnly: true // 명시적으로 1단계만
      })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to establish referral relationship:', error);
    return { success: false, message: '추천 관계 설정에 실패했습니다.' };
  }
}

/**
 * 페이지 로드 시 추천 추적 초기화
 */
export function initializeReferralTracking(): void {
  // URL에서 추천 코드 확인
  const urlReferral = extractReferralFromURL();
  
  if (urlReferral) {
    // 새로운 추천 코드가 있으면 쿠키 설정
    setReferralCookie(urlReferral.code, urlReferral.source);
    
    // 클릭 추적
    const productId = new URLSearchParams(window.location.search).get('product_id');
    trackReferralClick(urlReferral.code, urlReferral.source, productId || undefined);
    
    // URL에서 추천 파라미터 제거 (깔끔한 URL 유지)
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('ref');
    cleanUrl.searchParams.delete('utm_source');
    window.history.replaceState({}, '', cleanUrl.toString());
  }
}

/**
 * 추천 성과 실시간 업데이트를 위한 WebSocket 연결 (선택사항)
 */
export class ReferralRealtimeTracker {
  private ws: WebSocket | null = null;
  
  connect(affiliateUserId: string): void {
    // 실시간 기능은 복잡성을 피하기 위해 제외
    // 필요시 간단한 폴링으로 대체
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * 로컬 스토리지를 활용한 중복 클릭 방지
 */
export function isDuplicateClick(referralCode: string): boolean {
  const clickKey = `ref_click_${referralCode}`;
  const lastClick = localStorage.getItem(clickKey);
  
  if (lastClick) {
    const lastClickTime = new Date(lastClick).getTime();
    const now = new Date().getTime();
    const hourInMs = 60 * 60 * 1000;
    
    // 1시간 이내 중복 클릭 방지
    if (now - lastClickTime < hourInMs) {
      return true;
    }
  }
  
  localStorage.setItem(clickKey, new Date().toISOString());
  return false;
}