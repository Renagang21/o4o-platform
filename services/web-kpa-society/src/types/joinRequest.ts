/**
 * Organization Join Request Types
 *
 * WO-CONTEXT-JOIN-REQUEST-MVP-V1
 */

export type JoinRequestType = 'join' | 'promotion' | 'operator';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';
export type RequestedRole = 'admin' | 'manager' | 'member' | 'moderator';

export interface OrganizationJoinRequest {
  id: string;
  user_id: string;
  organization_id: string;
  requested_role: RequestedRole;
  requested_sub_role: string | null;
  request_type: JoinRequestType;
  payload: Record<string, any> | null;
  status: JoinRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export const JOIN_REQUEST_STATUS_LABELS: Record<JoinRequestStatus, string> = {
  pending: '검토 대기',
  approved: '승인',
  rejected: '반려',
};

export const JOIN_REQUEST_TYPE_LABELS: Record<JoinRequestType, string> = {
  join: '가입 요청',
  promotion: '권한 상향 요청',
  operator: '운영자 요청',
};

export const REQUESTED_ROLE_LABELS: Record<RequestedRole, string> = {
  admin: '관리자',
  manager: '매니저',
  member: '일반 회원',
  moderator: '모더레이터',
};
