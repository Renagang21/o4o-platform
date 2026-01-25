/**
 * Learning App v1 Type Definitions
 *
 * 핵심 원칙:
 * - Learning App은 LMS가 아니다
 * - 콘텐츠를 '순서대로 보여주는 흐름(Flow) 관리 도구'다
 * - 교육/평가/수료 기능 절대 포함 금지
 *
 * 정체성:
 * - Content App 없이는 의미 없음
 * - Participation App 기능 없음
 * - 독립 메뉴 진입 없음 (Content 상세에서만 진입)
 */

// ============================================
// Flow (순서 흐름)
// ============================================

/**
 * 순서 흐름
 * - 여러 Content를 1 → 2 → 3 순서로 묶는다
 * - 교육/강의/커리큘럼 개념 아님
 */
export interface Flow {
  /** 고유 ID */
  id: string;
  /** 제목 */
  title: string;
  /** 설명 */
  description: string;
  /** 단계 목록 (Content ID 배열 + 순서 정보) */
  steps: FlowStep[];
  /** 활성화 여부 */
  isActive: boolean;
  /** 대표 이미지 (선택) */
  imageUrl?: string;
  /** 메타데이터 (확장용) */
  metadata?: Record<string, unknown>;
  /** 생성일시 */
  createdAt: string;
  /** 수정일시 */
  updatedAt: string;
  /** 생성자 ID */
  createdBy: string;
}

// ============================================
// FlowStep (단계)
// ============================================

/**
 * 흐름 내 단계
 * - Content ID만 참조
 * - Content 수정/생성 기능 없음
 */
export interface FlowStep {
  /** 단계 순서 (1부터 시작) */
  order: number;
  /** 참조하는 Content ID */
  contentId: string;
  /** 단계 제목 (선택, 없으면 Content 제목 사용) */
  title?: string;
  /** 단계 설명 (선택) */
  description?: string;
}

// ============================================
// FlowProgress (진행 상태)
// ============================================

/**
 * 사용자의 흐름 진행 상태
 * - 완료/이수 개념 아님
 * - 단순 위치 추적만 수행
 */
export interface FlowProgress {
  /** 진행 ID */
  id: string;
  /** 대상 Flow ID */
  flowId: string;
  /** 사용자 ID */
  userId: string;
  /** 현재 단계 인덱스 (0부터 시작) */
  currentStepIndex: number;
  /** 본 단계들 (인덱스 배열) */
  viewedSteps: number[];
  /** 시작 일시 */
  startedAt: string;
  /** 마지막 접근 일시 */
  lastAccessedAt: string;
}

// ============================================
// API Types
// ============================================

/**
 * Flow 목록 조회 파라미터
 */
export interface FlowListParams {
  /** 활성화 여부 필터 */
  isActive?: boolean;
  /** 검색어 */
  search?: string;
  /** 페이지 번호 */
  page?: number;
  /** 페이지당 항목 수 */
  limit?: number;
}

/**
 * Flow 생성 요청 (관리용)
 */
export interface CreateFlowRequest {
  title: string;
  description: string;
  steps: Omit<FlowStep, 'order'>[];
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Flow 수정 요청 (관리용)
 */
export interface UpdateFlowRequest {
  title?: string;
  description?: string;
  steps?: Omit<FlowStep, 'order'>[];
  isActive?: boolean;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
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

// ============================================
// UI State Types
// ============================================

/**
 * FlowStepPage에서 사용하는 확장 단계 정보
 * - Content 정보와 함께 표시
 */
export interface FlowStepWithContent extends FlowStep {
  /** Content 데이터 (조회 시 포함) */
  content?: {
    id: string;
    title: string;
    summary?: string;
    body: string;
    imageUrl?: string;
    type: string;
  };
}

/**
 * Flow 상세 (단계별 Content 포함)
 */
export interface FlowWithSteps extends Omit<Flow, 'steps'> {
  steps: FlowStepWithContent[];
}
