import { authClient } from '@o4o/auth-client';
import type { 
  AffiliateUser,
  CreateAffiliateRequest,
  CreateAffiliateResponse,
  GetAffiliateStatsRequest,
  ProcessCommissionRequest,
  GenerateReferralLinkRequest,
  GenerateReferralLinkResponse
} from '@o4o/types';

/**
 * 제휴 회원 가입/생성
 */
export async function createAffiliate(data: CreateAffiliateRequest): Promise<CreateAffiliateResponse> {
  try {
    const response = await authClient.api.post('/v1/affiliate/create', data);
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    return {
      success: false,
      message: error.response?.data?.message || '제휴 회원 생성에 실패했습니다.'
    };
  }
}

/**
 * 제휴 회원 정보 조회
 */
export async function getAffiliateUser(userId?: string): Promise<AffiliateUser | null> {
  try {
    const response = await authClient.api.get(`/v1/affiliate/user${userId ? `/${userId}` : ''}`);
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    return null;
  }
}

/**
 * 제휴 통계 조회
 */
export async function getAffiliateStats(params: GetAffiliateStatsRequest) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.affiliateId) queryParams.append('affiliateId', params.affiliateId);
    queryParams.append('period', params.period);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const response = await authClient.api.get(`/v1/affiliate/stats?${queryParams.toString() as any}`);
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    throw error;
  }
}

/**
 * 커미션 내역 조회
 */
export async function getCommissionHistory(params: {
  affiliateId?: string;
  status?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.affiliateId) queryParams.append('affiliateId', params.affiliateId);
    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString() as any);
    if (params.limit) queryParams.append('limit', params.limit.toString() as any);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const response = await authClient.api.get(`/v1/affiliate/commissions?${queryParams.toString() as any}`);
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    throw error;
  }
}

/**
 * 커미션 승인/거절/지급 처리 (관리자)
 */
export async function processCommissions(request: ProcessCommissionRequest) {
  try {
    const response = await authClient.api.post('/v1/affiliate/commissions/process', request);
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    throw error;
  }
}

/**
 * 추천 링크 생성
 */
export async function generateReferralLink(
  request: GenerateReferralLinkRequest
): Promise<GenerateReferralLinkResponse> {
  try {
    const response = await authClient.api.post('/v1/affiliate/generate-link', request);
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    throw error;
  }
}

/**
 * 추천 클릭 추적
 */
export async function trackReferralClick(data: {
  referralCode: string;
  source?: string;
  productId?: string;
  landingPage?: string;
  userAgent?: string;
  referer?: string;
}) {
  try {
    const response = await authClient.api.post('/v1/affiliate/track-click', data);
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    throw error;
  }
}

/**
 * 추천 전환 추적
 */
export async function trackReferralConversion(data: {
  userId: string;
  referralCode: string;
  conversionType: 'signup' | 'purchase';
}) {
  try {
    const response = await authClient.api.post('/v1/affiliate/track-conversion', data);
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    throw error;
  }
}

/**
 * 추천 관계 검증 (단일 단계)
 */
export async function validateReferralRelationship(
  referrerId: string,
  referredId: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const response = await authClient.api.post('/v1/affiliate/validate-referral', {
      referrerId,
      referredId
    });
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    return {
      valid: false,
      reason: error.response?.data?.message || '추천 관계 검증에 실패했습니다.'
    };
  }
}

/**
 * 제휴 회원 목록 조회 (관리자)
 */
export async function getAffiliateList(params?: {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString() as any);
    if (params?.limit) queryParams.append('limit', params.limit.toString() as any);
    if (params?.search) queryParams.append('search', params.search);

    const response = await authClient.api.get(`/v1/affiliate/users?${queryParams.toString() as any}`);
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    throw error;
  }
}

/**
 * 제휴 회원 상태 변경 (관리자)
 */
export async function updateAffiliateStatus(
  affiliateId: string,
  status: 'active' | 'inactive' | 'suspended',
  reason?: string
) {
  try {
    const response = await authClient.api.patch(`/v1/affiliate/users/${affiliateId}/status`, {
      status,
      reason
    });
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    throw error;
  }
}

/**
 * 제휴 정책 조회
 */
export async function getAffiliatePolicy() {
  try {
    const response = await authClient.api.get('/v1/affiliate/policy');
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    throw error;
  }
}