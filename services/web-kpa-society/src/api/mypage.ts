/**
 * MyPage API 서비스
 */

import { apiClient } from './client';
import type {
  Enrollment,
  Certificate,
  GroupbuyParticipation,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export interface ProfileUpdateRequest {
  lastName?: string;
  firstName?: string;
  phone?: string;
  email?: string;
  university?: string;
  workplace?: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
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

  // 조직/임원 정보
  organizations: Array<{
    id: string;
    name: string;
    type: string;
    role: string;
    position: string | null;
  }>;
}

export const mypageApi = {
  // 프로필
  getProfile: () =>
    apiClient.get<ApiResponse<ProfileResponse>>('/mypage/profile'),

  updateProfile: (data: ProfileUpdateRequest) =>
    apiClient.put<ApiResponse<ProfileResponse>>('/mypage/profile', data),

  changePassword: (data: PasswordChangeRequest) =>
    apiClient.post<ApiResponse<void>>('/mypage/password', data),

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

  // 내 공동구매
  getMyGroupbuys: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<GroupbuyParticipation>>('/mypage/groupbuys', params),
};
