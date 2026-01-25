/**
 * Content App v1 Type Definitions
 *
 * 핵심 원칙:
 * - 콘텐츠를 만든다. 저장한다. 다른 서비스에서 참조할 수 있게 한다.
 * - 특정 도메인에 종속되지 않는 플랫폼 공통 콘텐츠 제작 도구
 * - 역할(Role)이 아닌 소유 주체(Owner) 기준으로 동작
 */

// ============================================
// Content Owner Type (콘텐츠 소유 주체)
// ============================================

/**
 * 콘텐츠 소유 주체 유형
 * - 권한은 "역할"이 아니라 "소유 주체"를 기준으로 한다
 * - 직역(약사/비약사)은 권한 판단에 사용하지 않음
 */
export enum ContentOwnerType {
  /** 개인 사용자 (약사, 근무자, 일반 회원 등) */
  INDIVIDUAL = 'individual',
  /** 사업자 단위 (약국, 공급자, 판매자) */
  BUSINESS = 'business',
  /** 조직 단위 (kpa-society, 지부 등) */
  ORGANIZATION = 'organization',
  /** 플랫폼 운영 주체 (o4o) */
  PLATFORM = 'platform',
}

export const OWNER_TYPE_LABELS: Record<ContentOwnerType, string> = {
  [ContentOwnerType.INDIVIDUAL]: '개인',
  [ContentOwnerType.BUSINESS]: '사업자',
  [ContentOwnerType.ORGANIZATION]: '조직',
  [ContentOwnerType.PLATFORM]: '플랫폼',
};

// ============================================
// Content Type (콘텐츠 유형)
// ============================================

/**
 * 콘텐츠 유형 (v1 고정)
 * - 강의, 퀴즈, 설문, 평가 개념 절대 포함 금지
 */
export enum ContentType {
  /** 안내문, 설명문, 게시용 텍스트 */
  TEXT = 'text',
  /** 이미지/카드형 콘텐츠 */
  IMAGE = 'image',
  /** 인스타·페이스북·블로그용 콘텐츠 */
  SOCIAL = 'social',
  /** 링크·자료 모음 */
  REFERENCE = 'reference',
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  [ContentType.TEXT]: '텍스트',
  [ContentType.IMAGE]: '이미지',
  [ContentType.SOCIAL]: '소셜',
  [ContentType.REFERENCE]: '참조 자료',
};

export const CONTENT_TYPE_ICONS: Record<ContentType, string> = {
  [ContentType.TEXT]: '📝',
  [ContentType.IMAGE]: '🖼️',
  [ContentType.SOCIAL]: '📱',
  [ContentType.REFERENCE]: '🔗',
};

// ============================================
// Content Status (콘텐츠 상태)
// ============================================

/**
 * 콘텐츠 상태
 * - 승인/검수 워크플로우 없음
 */
export enum ContentStatus {
  /** 작성 중 */
  DRAFT = 'draft',
  /** 사용 가능 */
  READY = 'ready',
  /** 보관 */
  ARCHIVED = 'archived',
}

export const STATUS_LABELS: Record<ContentStatus, string> = {
  [ContentStatus.DRAFT]: '작성 중',
  [ContentStatus.READY]: '사용 가능',
  [ContentStatus.ARCHIVED]: '보관됨',
};

// ============================================
// Content Visibility (공개 범위)
// ============================================

/**
 * 콘텐츠 공개 범위
 * - Domain의 해석은 상위 서비스 책임
 */
export enum ContentVisibility {
  /** 소유자만 */
  PRIVATE = 'private',
  /** 도메인 내 (해석은 상위 서비스 책임) */
  DOMAIN = 'domain',
  /** 전체 공개 */
  PUBLIC = 'public',
}

export const VISIBILITY_LABELS: Record<ContentVisibility, string> = {
  [ContentVisibility.PRIVATE]: '비공개',
  [ContentVisibility.DOMAIN]: '도메인 공개',
  [ContentVisibility.PUBLIC]: '전체 공개',
};

// ============================================
// Content Owner (소유자 정보)
// ============================================

/**
 * 콘텐츠 소유자 정보
 */
export interface ContentOwner {
  /** 소유 주체 유형 */
  type: ContentOwnerType;
  /** 소유자 ID (사용자ID, 사업자ID, 조직ID, 플랫폼ID) */
  id: string;
  /** 소유자 이름 (표시용) */
  name: string;
}

// ============================================
// Content (콘텐츠 본체)
// ============================================

/**
 * 콘텐츠 엔티티
 */
export interface Content {
  /** 고유 ID */
  id: string;
  /** 콘텐츠 유형 */
  type: ContentType;
  /** 제목 */
  title: string;
  /** 요약 (선택) */
  summary?: string;
  /** 본문 (HTML 또는 JSON) */
  body: string;
  /** 대표 이미지 URL (선택) */
  imageUrl?: string;
  /** 태그 목록 */
  tags: string[];
  /** 콘텐츠 상태 */
  status: ContentStatus;
  /** 공개 범위 */
  visibility: ContentVisibility;
  /** 소유자 정보 */
  owner: ContentOwner;
  /** 사용처 목록 (어디서 이 콘텐츠를 참조하는지) */
  usedIn: ContentUsage[];
  /** 템플릿 ID (선택) */
  templateId?: string;
  /** 메타데이터 (확장용) */
  metadata?: Record<string, unknown>;
  /** 생성일시 */
  createdAt: string;
  /** 수정일시 */
  updatedAt: string;
  /** 생성자 ID */
  createdBy: string;
}

/**
 * 콘텐츠 사용처 정보
 * - 이 콘텐츠가 어디서 참조되고 있는지
 */
export interface ContentUsage {
  /** 참조 서비스 (forum, learning, participation 등) */
  service: string;
  /** 참조 유형 (link, embed, copy) */
  referenceType: 'link' | 'embed' | 'copy';
  /** 참조 위치 설명 */
  location: string;
  /** 참조 일시 */
  referencedAt: string;
}

// ============================================
// Content Template (템플릿)
// ============================================

/**
 * 콘텐츠 템플릿
 */
export interface ContentTemplate {
  /** 템플릿 ID */
  id: string;
  /** 템플릿 이름 */
  name: string;
  /** 적용 가능한 콘텐츠 유형 */
  contentType: ContentType;
  /** 미리보기 이미지 */
  previewImageUrl?: string;
  /** 템플릿 구조 (HTML 또는 JSON) */
  structure: string;
}

// ============================================
// API Types
// ============================================

/**
 * 콘텐츠 생성 요청
 */
export interface CreateContentRequest {
  type: ContentType;
  title: string;
  summary?: string;
  body: string;
  imageUrl?: string;
  tags?: string[];
  visibility: ContentVisibility;
  owner: ContentOwner;
  templateId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 콘텐츠 수정 요청
 */
export interface UpdateContentRequest {
  title?: string;
  summary?: string;
  body?: string;
  imageUrl?: string;
  tags?: string[];
  status?: ContentStatus;
  visibility?: ContentVisibility;
  metadata?: Record<string, unknown>;
}

/**
 * 콘텐츠 목록 조회 파라미터
 */
export interface ContentListParams {
  /** 콘텐츠 유형 필터 */
  type?: ContentType;
  /** 상태 필터 */
  status?: ContentStatus;
  /** 공개 범위 필터 */
  visibility?: ContentVisibility;
  /** 소유 주체 유형 필터 */
  ownerType?: ContentOwnerType;
  /** 소유자 ID 필터 */
  ownerId?: string;
  /** 태그 필터 */
  tags?: string[];
  /** 검색어 */
  search?: string;
  /** 페이지 번호 */
  page?: number;
  /** 페이지당 항목 수 */
  limit?: number;
}

/**
 * API 응답 래퍼
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * 페이지네이션 응답
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
