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

// ============================================
// WO-KPA-ORGANIZATION-STRUCTURE-V1
// 임원 역할별 조직 구조 및 회계 접근 권한
// ============================================

// 임원 역할 타입 (조직도용)
export type OfficerRole =
  | 'president'        // 회장 - 전체 회계 접근
  | 'vice_president'   // 부회장 - 산하 위원회 회계 접근
  | 'committee_chair'  // 위원장 - 자기 위원회만
  | 'advisor'          // 고문 - 요약만 (AI 없음)
  | 'member'           // 일반 회원
  | 'operator';        // 운영자

// 확장된 위원회 타입
export type ExtendedCommitteeType =
  | 'standing'      // 상임위원회
  | 'special'       // 특별위원회 (임시)
  | 'ad_hoc';       // 임시위원회

// 임원 정보
export interface Officer {
  id: string;
  userId: string;
  name: string;
  role: OfficerRole;
  title: string;            // 직책명 (예: "회장", "총무위원장")
  committeeId?: string;     // 소속 위원회 (위원장의 경우)
  subordinateCommittees?: string[]; // 산하 위원회 (부회장의 경우)
  startDate: string;
  endDate?: string;
  isActive: boolean;
  order: number;            // 조직도 표시 순서
}

// 확장된 위원회 정의
export interface ExtendedCommittee {
  id: string;
  name: string;
  type: ExtendedCommitteeType;
  description?: string;
  chairId?: string;         // 위원장 ID
  vicePresidentId?: string; // 담당 부회장 ID
  members: string[];        // 위원 목록
  isActive: boolean;
  createdAt: string;
  endDate?: string;         // 특별위원회의 경우 종료일
}

// 조직도 구조
export interface OrganizationChart {
  id: string;
  organizationId: string;   // 지부/분회 ID
  organizationType: 'district' | 'branch';
  president?: Officer;
  vicePresidents: Officer[];
  committees: ExtendedCommittee[];
  advisors: Officer[];
  others: Officer[];
  updatedAt: string;
  updatedBy: string;
}

// 역할별 회계 접근 권한
export interface AccountingAccess {
  role: OfficerRole;
  scope: 'all' | 'subordinate_committees' | 'own_committee' | 'summary_only' | 'none';
  canViewDetails: boolean;
  canExportExcel: boolean;
  canUseAi: boolean;        // AI 분석 사용 가능 여부
  visibleCategories?: string[]; // 볼 수 있는 분류 (고문용)
}

// 기본 역할별 회계 접근 권한
export const DEFAULT_ACCOUNTING_ACCESS: Record<OfficerRole, AccountingAccess> = {
  president: {
    role: 'president',
    scope: 'all',
    canViewDetails: true,
    canExportExcel: true,
    canUseAi: true,
  },
  vice_president: {
    role: 'vice_president',
    scope: 'subordinate_committees',
    canViewDetails: true,
    canExportExcel: true,
    canUseAi: true,
  },
  committee_chair: {
    role: 'committee_chair',
    scope: 'own_committee',
    canViewDetails: true,
    canExportExcel: true,
    canUseAi: true,
  },
  advisor: {
    role: 'advisor',
    scope: 'summary_only',
    canViewDetails: false,
    canExportExcel: false,
    canUseAi: false,  // 고문은 AI 사용 불가
  },
  member: {
    role: 'member',
    scope: 'none',
    canViewDetails: false,
    canExportExcel: false,
    canUseAi: false,
  },
  operator: {
    role: 'operator',
    scope: 'all',
    canViewDetails: true,
    canExportExcel: true,
    canUseAi: true,
  },
};

// 회계 분류 (단식부기용)
export type AccountingCategory =
  // 수입
  | 'membership_fee'      // 연회비
  | 'subsidy'             // 보조금
  | 'donation'            // 기부금
  | 'event_income'        // 행사 수입
  | 'other_income'        // 기타 수입
  // 지출
  | 'personnel'           // 인건비
  | 'office'              // 사무비
  | 'rent'                // 임대료
  | 'event_expense'       // 행사비
  | 'welfare'             // 복리후생비
  | 'meeting'             // 회의비
  | 'travel'              // 여비교통비
  | 'supplies'            // 소모품비
  | 'other_expense';      // 기타 지출

// 회계 분류 메타데이터
export const ACCOUNTING_CATEGORIES: Record<AccountingCategory, {
  label: string;
  type: 'income' | 'expense';
  order: number;
}> = {
  // 수입
  membership_fee: { label: '연회비', type: 'income', order: 1 },
  subsidy: { label: '보조금', type: 'income', order: 2 },
  donation: { label: '기부금', type: 'income', order: 3 },
  event_income: { label: '행사수입', type: 'income', order: 4 },
  other_income: { label: '기타수입', type: 'income', order: 5 },
  // 지출
  personnel: { label: '인건비', type: 'expense', order: 6 },
  office: { label: '사무비', type: 'expense', order: 7 },
  rent: { label: '임대료', type: 'expense', order: 8 },
  event_expense: { label: '행사비', type: 'expense', order: 9 },
  welfare: { label: '복리후생', type: 'expense', order: 10 },
  meeting: { label: '회의비', type: 'expense', order: 11 },
  travel: { label: '여비교통', type: 'expense', order: 12 },
  supplies: { label: '소모품', type: 'expense', order: 13 },
  other_expense: { label: '기타지출', type: 'expense', order: 14 },
};

// 회계 항목 (위원회별 구분 추가)
export interface AccountingEntryWithCommittee {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: AccountingCategory;
  categoryLabel: string;
  description: string;
  amount: number;
  balance: number;
  committeeId?: string;     // 위원회 ID (위원회별 회계 구분용)
  committeeName?: string;   // 위원회명
  eventId?: string;         // 관련 행사 ID
  createdBy: string;
  createdAt: string;
}

// 행사/이벤트 타입
export interface OrganizationEvent {
  id: string;
  title: string;
  description?: string;
  eventType: 'meeting' | 'seminar' | 'workshop' | 'social' | 'general_assembly' | 'other';
  committeeId?: string;     // 담당 위원회
  isSpecialCommittee: boolean; // 특별위원회 주관 여부

  // 일정 정보
  startDate: string;
  endDate?: string;
  time?: string;
  location?: string;

  // 참여 정보
  targetParticipants: 'all_members' | 'officers_only' | 'committee_only' | 'invited';
  maxParticipants?: number;
  currentParticipants: number;
  registrationDeadline?: string;

  // 비용 정보
  estimatedBudget?: number;
  actualCost?: number;
  participationFee?: number;

  // 상태
  status: 'planning' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// 일정 관리용 타입
export interface ScheduleItem {
  id: string;
  title: string;
  description?: string;
  type: 'meeting' | 'event' | 'deadline' | 'reminder' | 'other';
  date: string;
  time?: string;
  endDate?: string;
  endTime?: string;
  location?: string;

  // 관련 정보
  committeeId?: string;
  eventId?: string;

  // 참석 대상
  targetRoles?: OfficerRole[];
  isPublic: boolean;        // 전체 임원 공개 여부

  // 알림
  reminderDays?: number[];  // N일 전 알림

  createdBy: string;
  createdAt: string;
}

// 고문용 설정 (운영자가 설정)
export interface AdvisorViewSettings {
  advisorId: string;
  showAccountingSummary: boolean;
  showEventSchedule: boolean;
  showMembershipStats: boolean;
  visibleCategories: AccountingCategory[];
  customMessage?: string;   // 운영자가 설정한 메시지
  updatedBy: string;
  updatedAt: string;
}

// 임원 역할 라벨
export const OFFICER_ROLE_LABELS: Record<OfficerRole, string> = {
  president: '회장',
  vice_president: '부회장',
  committee_chair: '위원장',
  advisor: '고문',
  member: '회원',
  operator: '운영자',
};

// 확장된 위원회 타입 라벨
export const EXTENDED_COMMITTEE_TYPE_LABELS: Record<ExtendedCommitteeType, string> = {
  standing: '상임위원회',
  special: '특별위원회',
  ad_hoc: '임시위원회',
};

// 유틸리티 함수: 역할에 따른 회계 접근 권한 확인
export function getAccountingAccess(role: OfficerRole): AccountingAccess {
  return DEFAULT_ACCOUNTING_ACCESS[role];
}

// 유틸리티 함수: 위원회별 회계 필터링
export function filterAccountingByRole(
  entries: AccountingEntryWithCommittee[],
  role: OfficerRole,
  committeeId?: string,
  subordinateCommitteeIds?: string[]
): AccountingEntryWithCommittee[] {
  const access = getAccountingAccess(role);

  switch (access.scope) {
    case 'all':
      return entries;
    case 'subordinate_committees':
      if (!subordinateCommitteeIds?.length) return [];
      return entries.filter(e =>
        !e.committeeId || subordinateCommitteeIds.includes(e.committeeId)
      );
    case 'own_committee':
      if (!committeeId) return [];
      return entries.filter(e => e.committeeId === committeeId);
    case 'summary_only':
    case 'none':
    default:
      return [];
  }
}

// ============================================
// WO-CONTEXT-SWITCH-FOUNDATION-V1
// Context switching types
// ============================================

/** Context 유형 = OrganizationType + pharmacy */
export type ContextType = OrganizationType | 'pharmacy';

/** Context 유형 라벨 */
export const CONTEXT_TYPE_LABELS: Record<ContextType, string> = {
  branch: '지부',
  division: '분회',
  committee: '위원회',
  pharmacy: '약국',
};

/** 활성 컨텍스트 객체 */
export interface ActiveContext {
  /** 선택된 조직 */
  organization: Organization;
  /** 조직 체인 (root → current) */
  chain: Organization[];
  /** 컨텍스트 유형 */
  contextType: ContextType;
  /** 사용자 역할 */
  role: MemberRole;
  /** 사용자 권한 */
  permissions: OrganizationMember['permissions'];
}

/** localStorage 영속용 직렬화 형태 */
export interface PersistedContext {
  organizationId: string;
  contextType: ContextType;
  role: MemberRole;
  timestamp: number;
}
