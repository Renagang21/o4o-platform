/**
 * Pharmacy Forum Extension Types
 * WO-KPA-FORUM-PHARMACY-EXT-V1
 *
 * 핵심 원칙:
 * - forum-core 수정 금지
 * - 맥락/접근/책임만 추가
 * - 점수/랭킹/알고리즘 구현 금지
 */

// =============================================================================
// A. 작성자 유형 (Context Attribution)
// =============================================================================

/**
 * 약사 서비스 작성자 유형
 * - 게시글/댓글에 표시되는 작성자의 맥락
 */
export enum PharmacyAuthorType {
  /** 개설약사 - 약국 경영자 */
  PHARMACY_OWNER = 'pharmacy_owner',
  /** 근무약사 - 고용된 약사 */
  PHARMACY_EMPLOYEE = 'pharmacy_employee',
  /** 약업 관련 사업자 */
  BUSINESS_OPERATOR = 'business_operator',
  /** 일반 사용자 */
  GENERAL_USER = 'general_user',
}

/**
 * 발언 단위 유형
 * - 개인 발언인지, 약국 단위 발언인지 구분
 */
export enum PharmacyStatementScope {
  /** 개인 의견 */
  PERSONAL = 'personal',
  /** 전문 자격 기반 발언 (평가 없음, 표시만) */
  PROFESSIONAL = 'professional',
  /** 약국 단위 발언 */
  PHARMACY_UNIT = 'pharmacy_unit',
}

/**
 * 책임 경계 표시 유형
 */
export enum PharmacyDisclaimerType {
  /** 개인 의견입니다 */
  PERSONAL_OPINION = 'personal_opinion',
  /** 약사회 공식 입장이 아닙니다 */
  NOT_OFFICIAL = 'not_official',
  /** 전문 의견이나 개인 판단입니다 */
  PROFESSIONAL_PERSONAL = 'professional_personal',
}

// =============================================================================
// B. 게시판 유형 (Scoped Visibility)
// =============================================================================

/**
 * 약사 서비스 전용 게시판 유형
 * - forum-core의 accessLevel, organizationId와 함께 사용
 */
export enum PharmacyBoardType {
  /** 약사 전용 게시판 */
  PHARMACIST_ONLY = 'pharmacist_only',
  /** 약국 단위 비공개 게시판 */
  PHARMACY_PRIVATE = 'pharmacy_private',
  /** 조직(약사회/기관) 단위 게시판 */
  ORGANIZATION = 'organization',
  /** 일반 공개 게시판 */
  PUBLIC = 'public',
}

/**
 * 약사 서비스 카테고리 프리셋
 */
export interface PharmacyCategoryPreset {
  name: string;
  slug: string;
  description: string;
  boardType: PharmacyBoardType;
  color: string;
  /** forum-core accessLevel 매핑 */
  accessLevel: 'all' | 'member' | 'business' | 'admin';
  /** 승인 필요 여부 */
  requireApproval: boolean;
}

// =============================================================================
// C. 메타데이터 (ForumPostMetadata.extensions.pharmacy)
// =============================================================================

/**
 * Pharmacy Forum Extension Metadata
 * - ForumPostMetadata.extensions.pharmacy에 저장
 * - forum-core 수정 없이 확장
 */
export interface PharmacyForumMeta {
  /** 작성자 유형 */
  authorType?: PharmacyAuthorType;
  /** 발언 범위 */
  statementScope?: PharmacyStatementScope;
  /** 책임 고지 유형 */
  disclaimerType?: PharmacyDisclaimerType;
  /** 약국 ID (약국 단위 발언 시) */
  pharmacyId?: string;
  /** 약국명 (표시용) */
  pharmacyName?: string;
  /** 전문 자격 표시 여부 */
  showProfessionalBadge?: boolean;
  /** 게시판 유형 */
  boardType?: PharmacyBoardType;
  /** 커스텀 고지 문구 */
  customDisclaimer?: string;
}

// =============================================================================
// D. 알림 관련 타입 (Communication Assist)
// =============================================================================

/**
 * 약사 서비스 알림 유형
 */
export enum PharmacyNotificationType {
  /** 승인 요청 */
  APPROVAL_REQUEST = 'approval_request',
  /** 승인 완료 */
  APPROVAL_COMPLETE = 'approval_complete',
  /** 반려 */
  APPROVAL_REJECTED = 'approval_rejected',
  /** 멘션 */
  MENTION = 'mention',
  /** 약국 게시판 활동 */
  PHARMACY_ACTIVITY = 'pharmacy_activity',
  /** 조직 게시판 활동 */
  ORGANIZATION_ACTIVITY = 'organization_activity',
}

/**
 * 알림 데이터
 */
export interface PharmacyNotification {
  id: string;
  type: PharmacyNotificationType;
  recipientId: string;
  postId?: string;
  commentId?: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// E. 작성자 배지 표시 데이터
// =============================================================================

/**
 * 작성자 배지 정보
 * - UI에서 표시할 때 사용
 */
export interface PharmacyAuthorBadgeConfig {
  /** 작성자 유형 */
  type: PharmacyAuthorType;
  /** 표시 레이블 */
  label: string;
  /** 표시 색상 */
  color: string;
  /** 배경 색상 */
  backgroundColor: string;
  /** 아이콘 (optional) */
  icon?: string;
}

/**
 * 작성자 유형별 배지 설정
 */
export const PHARMACY_AUTHOR_BADGES: Record<PharmacyAuthorType, PharmacyAuthorBadgeConfig> = {
  [PharmacyAuthorType.PHARMACY_OWNER]: {
    type: PharmacyAuthorType.PHARMACY_OWNER,
    label: '개설약사',
    color: '#1E40AF',
    backgroundColor: '#DBEAFE',
    icon: '💊',
  },
  [PharmacyAuthorType.PHARMACY_EMPLOYEE]: {
    type: PharmacyAuthorType.PHARMACY_EMPLOYEE,
    label: '근무약사',
    color: '#047857',
    backgroundColor: '#D1FAE5',
    icon: '👨‍⚕️',
  },
  [PharmacyAuthorType.BUSINESS_OPERATOR]: {
    type: PharmacyAuthorType.BUSINESS_OPERATOR,
    label: '약업사업자',
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    icon: '🏢',
  },
  [PharmacyAuthorType.GENERAL_USER]: {
    type: PharmacyAuthorType.GENERAL_USER,
    label: '일반',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
  },
};

// =============================================================================
// F. 책임 고지 문구
// =============================================================================

/**
 * 책임 고지 문구 설정
 */
export const PHARMACY_DISCLAIMERS: Record<PharmacyDisclaimerType, string> = {
  [PharmacyDisclaimerType.PERSONAL_OPINION]:
    '이 글은 작성자의 개인 의견이며, 약사회 또는 플랫폼의 공식 입장이 아닙니다.',
  [PharmacyDisclaimerType.NOT_OFFICIAL]:
    '본 내용은 약사회 공식 입장이 아닙니다.',
  [PharmacyDisclaimerType.PROFESSIONAL_PERSONAL]:
    '전문 약사로서의 의견이나, 개인적인 판단에 따른 것입니다.',
};

// =============================================================================
// G. 기본 카테고리 프리셋
// =============================================================================

/**
 * 약사 서비스 기본 카테고리 프리셋
 */
export const PHARMACY_CATEGORY_PRESETS: PharmacyCategoryPreset[] = [
  {
    name: '약사 라운지',
    slug: 'pharmacist-lounge',
    description: '약사 전용 자유 게시판',
    boardType: PharmacyBoardType.PHARMACIST_ONLY,
    color: '#3B82F6',
    accessLevel: 'member',
    requireApproval: false,
  },
  {
    name: '복약지도 공유',
    slug: 'medication-guidance',
    description: '복약지도 경험 및 정보 공유',
    boardType: PharmacyBoardType.PHARMACIST_ONLY,
    color: '#10B981',
    accessLevel: 'member',
    requireApproval: false,
  },
  {
    name: '약국 운영 Q&A',
    slug: 'pharmacy-operation-qa',
    description: '약국 운영 관련 질문과 답변',
    boardType: PharmacyBoardType.PHARMACIST_ONLY,
    color: '#8B5CF6',
    accessLevel: 'member',
    requireApproval: false,
  },
  {
    name: '공지사항',
    slug: 'announcements',
    description: '약사회/조직 공지사항',
    boardType: PharmacyBoardType.ORGANIZATION,
    color: '#EF4444',
    accessLevel: 'all',
    requireApproval: true,
  },
];
