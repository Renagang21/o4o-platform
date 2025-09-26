/**
 * 파트너 마케팅 (추천인) 시스템 타입 정의
 * 단계: 1단계 추천만 허용 (다단계 금지)
 */

export interface PartnerUser {
  id: string;
  userId: string;
  referralCode: string;
  status: 'active' | 'inactive' | 'suspended';
  joinedAt: Date;
  
  // 추천 실적
  totalClicks: number;
  totalSignups: number;
  totalOrders: number;
  totalRevenue: number;
  
  // 수수료
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  
  // 설정
  commissionRate?: number; // 개별 수수료율 (없으면 기본값 사용)
  paymentMethod?: 'bank' | 'point';
  bankAccount?: BankAccount;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface ReferralRelationship {
  id: string;
  referrerId: string; // 추천인
  referredId: string; // 피추천인
  referralCode: string;
  signupDate: Date;
  firstOrderDate?: Date;
  status: 'pending' | 'confirmed' | 'expired';
  
  // 추적 정보
  signupIp?: string;
  signupDevice?: string;
  signupSource?: string; // kakao, facebook, band, direct
  
  createdAt: Date;
}

export interface ReferralClick {
  id: string;
  referralCode: string;
  partnerUserId: string;
  
  // 클릭 정보
  clickedAt: Date;
  ip: string;
  userAgent: string;
  referer?: string;
  
  // 추적 정보
  source?: 'kakao' | 'facebook' | 'band' | 'direct' | 'qr';
  productId?: string;
  landingPage?: string;
  
  // 전환 정보
  converted: boolean;
  convertedUserId?: string;
  convertedAt?: Date;
}

export interface PartnerCommission {
  id: string;
  partnerUserId: string;
  orderId: string;
  orderAmount: number;
  
  // 수수료 정보
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  
  // 지급 정보
  approvedAt?: Date;
  approvedBy?: string;
  paidAt?: Date;
  paymentMethod?: 'bank' | 'point';
  paymentReference?: string;
  
  // 취소/조정
  cancelledAt?: Date;
  cancelledReason?: string;
  adjustmentAmount?: number;
  adjustmentReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionPolicy {
  id: string;
  name: string;
  description?: string;
  
  // 기본 수수료율
  defaultRate: number;
  minCommission: number;
  maxCommission: number;
  
  // 카테고리별 수수료율
  categoryRates?: Record<string, number>;
  
  // 실적 기반 보너스
  performanceBonus?: {
    threshold: number; // 월 매출 기준
    bonusRate: number; // 추가 수수료율
  }[];
  
  // 정책 적용 기간
  startDate: Date;
  endDate?: Date;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PartnerStats {
  period: 'today' | 'week' | 'month' | 'year' | 'all';
  
  // 클릭 & 전환
  clicks: number;
  uniqueVisitors: number;
  signups: number;
  orders: number;
  conversionRate: number;
  
  // 매출 & 수수료
  revenue: number;
  commission: number;
  avgOrderValue: number;
  
  // 추천인 현황
  activePartners: number;
  newPartners: number;
  
  // 상위 실적자
  topPartners: {
    partnerId: string;
    userName: string;
    revenue: number;
    commission: number;
  }[];
}

// API 요청/응답 타입
export interface CreatePartnerRequest {
  userId: string;
  commissionRate?: number;
  paymentMethod?: 'bank' | 'point';
  bankAccount?: BankAccount;
}

export interface CreatePartnerResponse {
  success: boolean;
  partner?: PartnerUser;
  referralCode?: string;
  message?: string;
}

export interface GetPartnerStatsRequest {
  partnerId?: string;
  period: 'today' | 'week' | 'month' | 'year' | 'all';
  startDate?: string;
  endDate?: string;
}

export interface ProcessCommissionRequest {
  commissionIds: string[];
  action: 'approve' | 'pay' | 'cancel';
  paymentMethod?: 'bank' | 'point';
  reason?: string;
}

export interface GenerateReferralLinkRequest {
  partnerId: string;
  productId?: string;
  source?: string;
  campaign?: string;
}

export interface GenerateReferralLinkResponse {
  longUrl: string;
  shortUrl?: string;
  qrCodeUrl?: string;
  referralCode: string;
}

// 관리자용 대시보드 타입
export interface AdminPartnerOverview {
  totalPartners: number;
  activePartners: number;
  totalRevenue: number;
  totalCommission: number;
  pendingCommission: number;
  avgCommissionRate: number;
  
  // 차트 데이터
  revenueChart: {
    date: string;
    revenue: number;
    commission: number;
  }[];
  
  // 수수료 지급 현황
  commissionStatus: {
    pending: number;
    approved: number;
    paid: number;
    cancelled: number;
  };
}

// 사용자용 추천 대시보드 타입
export interface UserPartnerDashboard {
  referralCode: string;
  status: 'active' | 'inactive' | 'suspended';
  
  // 이번 달 실적
  monthlyStats: {
    clicks: number;
    signups: number;
    orders: number;
    revenue: number;
    commission: number;
  };
  
  // 전체 실적
  totalStats: {
    signups: number;
    revenue: number;
    paidCommission: number;
    pendingCommission: number;
  };
  
  // 최근 추천 활동
  recentActivities: {
    type: 'click' | 'signup' | 'order' | 'commission';
    description: string;
    amount?: number;
    timestamp: Date;
  }[];
  
  // 추천 링크
  referralLinks: {
    type: 'main' | 'product';
    name: string;
    url: string;
    clicks: number;
  }[];
}