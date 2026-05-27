/**
 * Qualification Requests API — GlycoPharm Operator
 *
 * WO-O4O-GLYCOPHARM-OPERATOR-LMS-QUALIFICATION-WORKFLOW-V1
 *
 * Backend: WO-O4O-GLYCOPHARM-LMS-QUALIFICATION-BACKEND-FOUNDATION-V1
 *   /api/v1/glycopharm/qualifications (serviceKey='glycopharm' 격리)
 */

import { authClient } from '../lib/apiClient';

export type QualificationType = 'lms_creator';
export type QualificationStatus = 'pending' | 'approved' | 'rejected';

export const QUALIFICATION_TYPE_LABELS: Record<QualificationType, string> = {
  lms_creator: '강사 신청',
};

const LEGACY_LABELS: Record<string, string> = {
  instructor: '강사',
  content_provider: '콘텐츠 제공자',
  survey_operator: '설문 운영자',
  reviewer: '검토자',
};

export function getQualificationLabel(type: string): string {
  return (
    QUALIFICATION_TYPE_LABELS[type as QualificationType] ??
    LEGACY_LABELS[type] ??
    type
  );
}

export interface MemberQualification {
  id: string;
  user_id: string;
  qualification_type: string;
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
  user_name: string | null;
  user_email: string | null;
  user_created_at: string | null;
  qualification_type: string;
  service_key: string | null;
  status: QualificationStatus;
  request_data: Record<string, any>;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const glycopharmQualificationApi = {
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
    }>('/glycopharm/qualifications/requests', { params }),

  /** 승인 / 거절 (operator) */
  reviewRequest: (id: string, payload: { status: 'approved' | 'rejected'; reviewNote?: string }) =>
    authClient.api.patch<{ success: boolean; data: QualificationRequest }>(
      `/glycopharm/qualifications/requests/${id}`,
      payload,
    ),

  /** 이력 삭제 (operator) */
  deleteRequest: (id: string) =>
    authClient.api.delete<{ success: boolean; data: { id: string; deleted: boolean } }>(
      `/glycopharm/qualifications/requests/${id}`,
    ),

  /** 일괄 삭제 (operator, 최대 50건) */
  batchDeleteRequests: (ids: string[]) =>
    authClient.api.post<{
      success: boolean;
      data: { results: Array<{ id: string; status: 'success' | 'skipped' | 'failed'; error?: string }> };
    }>('/glycopharm/qualifications/requests/batch-delete', { ids }),
};
