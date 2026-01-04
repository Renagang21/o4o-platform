/**
 * Organization Types - 조직 타입 정의
 * WO-KPA-COMMITTEE-INTRANET-V1
 */

export type OrganizationType = 'branch' | 'division' | 'committee';
export type CommitteeType = 'academic' | 'it' | 'general';
export type MemberRole = 'chair' | 'officer' | 'member';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  parentId?: string;
  committeeType?: CommitteeType;
  memberCount: number;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  permissions: {
    canWriteNotice: boolean;
    canCreateMeeting: boolean;
    canUploadDocument: boolean;
    canChangeSettings: boolean;
  };
}

/**
 * 위원회 유형 라벨
 */
export const COMMITTEE_TYPE_LABELS: Record<CommitteeType, string> = {
  academic: '학술위원회',
  it: '정보통신위원회',
  general: '총무위원회',
};

/**
 * 역할 라벨
 */
export const ROLE_LABELS: Record<MemberRole, string> = {
  chair: '위원장',
  officer: '위원',
  member: '회원',
};

/**
 * 역할별 기본 권한
 */
export const DEFAULT_PERMISSIONS: Record<MemberRole, OrganizationMember['permissions']> = {
  chair: {
    canWriteNotice: true,
    canCreateMeeting: true,
    canUploadDocument: true,
    canChangeSettings: true,
  },
  officer: {
    canWriteNotice: true,
    canCreateMeeting: false,
    canUploadDocument: true,
    canChangeSettings: false,
  },
  member: {
    canWriteNotice: false,
    canCreateMeeting: false,
    canUploadDocument: false,
    canChangeSettings: false,
  },
};

/**
 * WO-KPA-COMMITTEE-GOVERNANCE-V1: 위원회 변경 요청 타입
 */

export type CommitteeRequestType = 'create' | 'update' | 'delete';
export type CommitteeRequestStatus = 'pending' | 'approved' | 'rejected';

/**
 * 위원회 변경 요청 인터페이스
 * - 지부/분회 관리자가 요청
 * - 사이트 운영자가 승인/반려
 */
export interface CommitteeChangeRequest {
  id: string;
  requestType: CommitteeRequestType;
  organizationId: string;        // 요청하는 조직 (지부 또는 분회)
  organizationType: 'branch' | 'division';
  committeeType: CommitteeType | 'other';
  committeeName?: string;        // 기타 위원회인 경우 이름
  targetCommitteeId?: string;    // update/delete 시 대상 위원회 ID
  reason: string;                // 요청 사유
  status: CommitteeRequestStatus;
  requestedBy: string;           // 요청자 ID
  requestedByName: string;       // 요청자 이름
  requestedAt: string;           // 요청 일시
  reviewedBy?: string;           // 검토자 (사이트 운영자) ID
  reviewedByName?: string;       // 검토자 이름
  reviewedAt?: string;           // 검토 일시
  reviewComment?: string;        // 검토 코멘트
}

/**
 * 요청 타입 라벨
 */
export const REQUEST_TYPE_LABELS: Record<CommitteeRequestType, string> = {
  create: '신규 생성',
  update: '변경',
  delete: '폐지',
};

/**
 * 요청 상태 라벨
 */
export const REQUEST_STATUS_LABELS: Record<CommitteeRequestStatus, string> = {
  pending: '검토 대기',
  approved: '승인',
  rejected: '반려',
};

/**
 * 위원회별 주요 역할 정의
 */
export const COMMITTEE_RESPONSIBILITIES: Record<CommitteeType, {
  name: string;
  description: string;
  keyFunctions: string[];
}> = {
  academic: {
    name: '학술위원회',
    description: '연수교육(LMS) 운영 전담',
    keyFunctions: ['교육 과정 기획/운영', '이수 관리', 'LMS 시스템 연결'],
  },
  general: {
    name: '총무위원회',
    description: '행사 운영 담당',
    keyFunctions: ['총회 운영', '단합대회', '워크숍 기획'],
  },
  it: {
    name: '정보통신위원회',
    description: '사이트 운영 담당',
    keyFunctions: ['공지/자료/게시판 관리', '기술/시스템 협의', '사이트 유지보수'],
  },
};
