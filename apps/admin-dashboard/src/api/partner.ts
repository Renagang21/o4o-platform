import { authClient } from '@o4o/auth-client';
import type { 
  PartnerUser,
  CreatePartnerRequest,
  CreatePartnerResponse,
  GetPartnerStatsRequest,
  ProcessCommissionRequest,
  GenerateReferralLinkRequest,
  GenerateReferralLinkResponse
} from '@o4o/types';

/**
 * 파트너 회원 가입/생성
 */
export async function createPartner(data: CreatePartnerRequest): Promise<CreatePartnerResponse> {
  try {
    const response = await authClient.api.post('/partner/create', data);
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    return {
      success: false,
      message: error.response?.data?.message || '파트너 회원 생성에 실패했습니다.'
    };
  }
}

/**
 * 파트너 회원 정보 조회
 */
export async function getPartnerUser(userId?: string): Promise<PartnerUser | null> {
  try {
    const response = await authClient.api.get(`/partner/user${userId ? `/${userId}` : ''}`);
    return response.data;
  } catch (error: any) {
    // Error logging - use proper error handler
    return null;
  }
}

/**
 * 파트너 통계 조회
 */
export async function getPartnerStats(params: GetPartnerStatsRequest) {
  const queryParams = new URLSearchParams();
  
  if (params.partnerId) queryParams.append('partnerId', params.partnerId);
  queryParams.append('period', params.period);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const response = await authClient.api.get(`/partner/stats?${queryParams.toString() as any}`);
  return response.data;
}

/**
 * 커미션 내역 조회
 */
export async function getCommissionHistory(params: {
  partnerId?: string;
  status?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}) {
  const queryParams = new URLSearchParams();
  
  if (params.partnerId) queryParams.append('partnerId', params.partnerId);
  if (params.status) queryParams.append('status', params.status);
  if (params.page) queryParams.append('page', params.page.toString() as any);
  if (params.limit) queryParams.append('limit', params.limit.toString() as any);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);

  const response = await authClient.api.get(`/partner/commissions?${queryParams.toString() as any}`);
  return response.data;
}

/**
 * 커미션 승인/거절/지급 처리 (관리자)
 */
export async function processCommissions(request: ProcessCommissionRequest) {
  const response = await authClient.api.post('/partner/commissions/process', request);
  return response.data;
}

/**
 * 추천 링크 생성
 */
export async function generateReferralLink(
  request: GenerateReferralLinkRequest
): Promise<GenerateReferralLinkResponse> {
  const response = await authClient.api.post('/partner/generate-link', request);
  return response.data;
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
  const response = await authClient.api.post('/partner/track-click', data);
  return response.data;
}

/**
 * 추천 전환 추적
 */
export async function trackReferralConversion(data: {
  userId: string;
  referralCode: string;
  conversionType: 'signup' | 'purchase';
}) {
  const response = await authClient.api.post('/partner/track-conversion', data);
  return response.data;
}

/**
 * 추천 관계 검증 (단일 단계)
 */
export async function validateReferralRelationship(
  referrerId: string,
  referredId: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const response = await authClient.api.post('/partner/validate-referral', {
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
 * 파트너 회원 목록 조회 (관리자)
 */
export async function getPartnerList(params?: {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const queryParams = new URLSearchParams();
  
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', params.page.toString() as any);
  if (params?.limit) queryParams.append('limit', params.limit.toString() as any);
  if (params?.search) queryParams.append('search', params.search);

  const response = await authClient.api.get(`/partner/users?${queryParams.toString() as any}`);
  return response.data;
}

/**
 * 파트너 회원 상태 변경 (관리자)
 */
export async function updatePartnerStatus(
  partnerId: string,
  status: 'active' | 'inactive' | 'suspended',
  reason?: string
) {
  const response = await authClient.api.patch(`/partner/users/${partnerId}/status`, {
    status,
    reason
  });
  return response.data;
}

/**
 * 파트너 정책 조회
 */
export async function getPartnerPolicy() {
  const response = await authClient.api.get('/partner/policy');
  return response.data;
}