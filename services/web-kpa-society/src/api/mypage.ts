/**
 * MyPage API 서비스
 */

import { apiClient } from './client';
import type {
  User,
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

export const mypageApi = {
  // 프로필
  getProfile: () =>
    apiClient.get<ApiResponse<User>>('/mypage/profile'),

  updateProfile: (data: ProfileUpdateRequest) =>
    apiClient.put<ApiResponse<User>>('/mypage/profile', data),

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
