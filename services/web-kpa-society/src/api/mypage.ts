/**
 * MyPage API 서비스
 */

import { apiClient } from './client';
import { authClient } from '../contexts/AuthContext';
import type {
  Enrollment,
  Certificate,
  EventOfferParticipation,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export interface ProfileUpdateRequest {
  lastName?: string;
  firstName?: string;
  nickname?: string;
  phone?: string;
  email?: string;
  university?: string;
  workplace?: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export interface UserSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingConsent: boolean;
}

export interface UserActivity {
  type: 'course_progress' | 'forum_post' | 'groupbuy' | 'certificate';
  title: string;
  description: string;
  date: string;
  link?: string;
}

/**
 * 프로필 API 응답 타입
 * API에서 반환하는 역할별 프로필 데이터 구조
 */
export interface ProfileResponse {
  // 기본 정보 (모든 사용자)
  id: string;
  name: string;
  lastName: string;
  firstName: string;
  nickname: string | null;
  email: string;
  phone: string;
  roles: string[];

  // 사용자 유형 플래그
  userType: {
    isSuperOperator: boolean;
    isPharmacyOwner: boolean;
    isOfficer: boolean;
  };

  // 약사 정보 (Super Operator가 아닌 경우)
  pharmacist: {
    licenseNumber: string | null;
    university: string | null;
    workplace: string | null;
  } | null;

  // 약국 정보 (약국개설자인 경우)
  pharmacy: {
    name: string | null;
    address: string | null;
  } | null;

  // 사업장/근무지 정보 (users.businessInfo JSONB)
  businessInfo: {
    businessName?: string;
    phone?: string;
    storeAddress?: {
      zipCode?: string;
      baseAddress?: string;
      detailAddress?: string;
    };
    address?: string;
    zipCode?: string;
  } | null;

  // 조직/임원 정보
  organizations: Array<{
    id: string;
    name: string;
    type: string;
    role: string;
    position: string | null;
  }>;
}

/**
 * 통합 승인 요청 항목 — WO-KPA-A-MYPAGE-UNIFIED-REQUEST-INBOX-V1
 */
export interface UnifiedRequestItem {
  id: string;
  entityType: string;
  status: string;
  displayTitle: string;
  displayDescription: string;
  reviewComment: string | null;
  revisionNote: string | null;
  reviewedAt: string | null;
  resultEntityId: string | null;
  resultMetadata: Record<string, any> | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  payload: Record<string, any>;
}

export const mypageApi = {
  // 프로필
  getProfile: () =>
    apiClient.get<ApiResponse<ProfileResponse>>('/mypage/profile'),

  updateProfile: (data: ProfileUpdateRequest) =>
    apiClient.put<ApiResponse<ProfileResponse>>('/mypage/profile', data),

  // 비밀번호 변경 - /api/v1/users/password 엔드포인트 사용
  changePassword: async (data: PasswordChangeRequest): Promise<ApiResponse<{ message: string }>> => {
    const response = await authClient.api.put('/users/password', data);
    return response.data;
  },

  // 설정
  getSettings: () =>
    apiClient.get<ApiResponse<UserSettings>>('/mypage/settings'),

  updateSettings: (data: Partial<UserSettings>) =>
    apiClient.put<ApiResponse<UserSettings>>('/mypage/settings', data),

  // 활동 내역
  getActivities: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<UserActivity>>('/mypage/activities', params),

  // 대시보드 요약
  getDashboardSummary: () =>
    apiClient.get<ApiResponse<{
      enrolledCourses: number;
      completedCourses: number;
      certificates: number;
      forumPosts: number;
      groupbuyParticipations: number;
    }>>('/mypage/summary'),

  // 내 수강
  getMyEnrollments: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Enrollment>>('/mypage/enrollments', params),

  // 내 수료증
  getMyCertificates: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Certificate>>('/mypage/certificates', params),

  // 내 이벤트 오퍼
  getMyEventOffers: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<EventOfferParticipation>>('/mypage/groupbuys', params),

  // 통합 승인 요청 — WO-KPA-A-MYPAGE-UNIFIED-REQUEST-INBOX-V1
  getMyApprovalRequests: (params?: { entityType?: string; status?: string }) =>
    apiClient.get<ApiResponse<UnifiedRequestItem[]>>('/mypage/my-requests', params as any),
};
