/**
 * 추천 코드 및 추천 링크 관련 유틸리티
 */

/**
 * 사용자 ID 기반 추천 코드 생성
 * 형식: USER_PREFIX + 랜덤 문자열
 */
export function generateReferralCode(userId: string): string {
  const prefix = userId.substring(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
}

/**
 * 추천 링크 생성
 */
export function generateReferralLink(
  baseUrl: string,
  referralCode: string,
  productId?: string
): string {
  const url = new URL(baseUrl);
  
  // 상품 페이지 또는 메인 페이지
  if (productId) {
    url.pathname = `/products/${productId}`;
  }
  
  // 추천 코드 파라미터 추가
  url.searchParams.set('ref', referralCode);
  
  return url.toString();
}

/**
 * URL에서 추천 코드 추출
 */
export function extractReferralCode(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('ref');
  } catch {
    // URL 파싱 실패시 쿼리 스트링에서 직접 추출
    const match = url.match(/[?&]ref=([^&]+)/);
    return match ? match[1] : null;
  }
}

/**
 * 추천 코드 유효성 검사
 * - 6-10자 영숫자
 * - 대문자만 허용
 */
export function isValidReferralCode(code: string): boolean {
  return /^[A-Z0-9]{6,10}$/.test(code);
}

/**
 * 추천 통계 계산
 */
export interface ReferralStats {
  totalClicks: number;
  uniqueVisitors: number;
  signups: number;
  conversions: number;
  conversionRate: number;
  totalRevenue: number;
  pendingCommission: number;
  paidCommission: number;
}

export function calculateReferralStats(data: {
  clicks: Array<{ timestamp: Date; ip: string }>;
  signups: Array<{ userId: string; timestamp: Date }>;
  orders: Array<{ 
    orderId: string; 
    amount: number; 
    commission: number; 
    status: 'pending' | 'approved' | 'paid';
    timestamp: Date;
  }>;
}): ReferralStats {
  const uniqueIps = new Set(data.clicks.map(click => click.ip));
  
  const totalRevenue = data.orders.reduce((sum, order) => sum + order.amount, 0);
  const pendingCommission = data.orders
    .filter(order => order.status === 'pending' || order.status === 'approved')
    .reduce((sum, order) => sum + order.commission, 0);
  const paidCommission = data.orders
    .filter(order => order.status === 'paid')
    .reduce((sum, order) => sum + order.commission, 0);
  
  const conversions = data.orders.length;
  const conversionRate = data.signups.length > 0 
    ? (conversions / data.signups.length) * 100 
    : 0;
  
  return {
    totalClicks: data.clicks.length,
    uniqueVisitors: uniqueIps.size,
    signups: data.signups.length,
    conversions,
    conversionRate: Math.round(conversionRate * 100) / 100,
    totalRevenue,
    pendingCommission,
    paidCommission,
  };
}

/**
 * 추천 링크 단축 URL 생성 (선택사항)
 * 실제 구현시 URL 단축 서비스 연동 필요
 */
export async function shortenReferralLink(longUrl: string): Promise<string> {
  // TODO: 실제 URL 단축 서비스 연동
  // 예: bit.ly, short.io 등
  return longUrl;
}

/**
 * 추천 코드를 QR 코드로 변환하기 위한 URL 생성
 */
export function generateQRCodeUrl(referralLink: string, size: number = 200): string {
  const encodedUrl = encodeURIComponent(referralLink);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}`;
}

/**
 * 추천 실적 기간별 필터링
 */
export function filterReferralsByPeriod<T extends { timestamp: Date }>(
  items: T[],
  period: 'today' | 'week' | 'month' | 'year' | 'all'
): T[] {
  if (period === 'all') return items;
  
  const now = new Date();
  const startDate = new Date();
  
  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  return items.filter(item => item.timestamp >= startDate);
}

/**
 * 추천 수수료 계산
 * 실제 비즈니스 로직에 따라 수정 필요
 */
export function calculateCommission(
  orderAmount: number,
  commissionRate: number = 0.05, // 기본 5%
  minCommission: number = 1000, // 최소 수수료 1,000원
  maxCommission: number = 100000 // 최대 수수료 100,000원
): number {
  const commission = orderAmount * commissionRate;
  
  if (commission < minCommission) return minCommission;
  if (commission > maxCommission) return maxCommission;
  
  return Math.floor(commission);
}

/**
 * 추천 링크 메시지 템플릿
 */
export const referralMessageTemplates = {
  kakao: (productName: string, referralCode: string) => 
    `🎁 ${productName} 특별 혜택!\n\n` +
    `제 추천 코드 [${referralCode}]로 가입하시면 특별한 혜택을 받으실 수 있어요!\n\n` +
    `지금 바로 확인해보세요! 👇`,
    
  sms: (productName: string, referralCode: string, link: string) =>
    `[O4O Platform] ${productName} 추천!\n` +
    `추천코드: ${referralCode}\n` +
    `${link}`,
    
  email: (productName: string, referralCode: string, link: string) => ({
    subject: `${productName} 특별 혜택 안내`,
    body: `안녕하세요!\n\n` +
          `O4O Platform의 ${productName}을(를) 추천드립니다.\n\n` +
          `아래 링크를 통해 가입하시면 특별한 혜택을 받으실 수 있습니다:\n` +
          `${link}\n\n` +
          `추천 코드: ${referralCode}\n\n` +
          `감사합니다.`
  })
};