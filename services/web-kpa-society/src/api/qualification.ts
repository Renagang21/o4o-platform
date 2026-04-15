/**
 * Qualification API
 * WO-O4O-QUALIFICATION-SYSTEM-V1
 */

import { authClient } from '../contexts/AuthContext';

export type QualificationType = 'instructor' | 'content_provider' | 'survey_operator' | 'reviewer';
export type QualificationStatus = 'pending' | 'approved' | 'rejected';

export const QUALIFICATION_TYPE_LABELS: Record<QualificationType, string> = {
  instructor: '강사',
  content_provider: '콘텐츠 제공자',
  survey_operator: '설문 운영자',
  reviewer: '검토자',
};

export interface MemberQualification {
  id: string;
  user_id: string;
  qualification_type: QualificationType;
  status: QualificationStatus;
  requested_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface QualificationRequest {
  id: string;
  user_id: string;
  qualification_type: QualificationType;
  status: QualificationStatus;
  request_data: Record<string, any>;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplyQualificationDto {
  qualificationType: QualificationType;
  data?: {
    bio?: string;
    experience?: string;
    organization?: string;
    [key: string]: any;
  };
}

export const qualificationApi = {
  /** 자격 신청 */
  apply: (dto: ApplyQualificationDto) =>
    authClient.api.post<{ success: boolean; data: QualificationRequest }>('/kpa/qualifications/apply', dto),

  /** 내 자격 목록 */
  getMyQualifications: () =>
    authClient.api.get<{ success: boolean; data: MemberQualification[] }>('/kpa/qualifications/me'),

  /** 내 신청 내역 */
  getMyRequests: () =>
    authClient.api.get<{ success: boolean; data: QualificationRequest[] }>('/kpa/qualifications/requests/me'),

  /** 전체 신청 목록 (operator) */
  listRequests: (params?: {
    status?: string;
    qualificationType?: string;
    page?: number;
    limit?: number;
  }) =>
    authClient.api.get<{
      success: boolean;
      data: QualificationRequest[];
      total: number;
      totalPages: number;
    }>('/kpa/qualifications/requests', { params }),

  /** 승인 / 거절 (operator) */
  reviewRequest: (id: string, payload: { status: 'approved' | 'rejected'; reviewNote?: string }) =>
    authClient.api.patch<{ success: boolean; data: QualificationRequest }>(
      `/kpa/qualifications/requests/${id}`,
      payload,
    ),
};
