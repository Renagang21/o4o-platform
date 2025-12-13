/**
 * diabetes-pharmacy DTOs
 *
 * @package @o4o/diabetes-pharmacy
 */

// ========================================
// Action Types (고정)
// ========================================

/**
 * Action Type
 * Pattern에서 파생되는 실행 가능한 Action 유형
 */
export type ActionType =
  | 'COACHING'   // 코칭 세션 시작
  | 'DISPLAY'    // 정보 표시 (리포트, 패턴 설명)
  | 'SURVEY'     // 설문/조사 요청
  | 'COMMERCE'   // 상품 연결 (비의약품만)
  | 'NONE';      // Action 안 함

/**
 * Action 상태
 */
export type ActionStatus =
  | 'available'    // 실행 가능
  | 'pending'      // 대기 중
  | 'executed'     // 실행됨
  | 'unavailable'; // 실행 불가

// ========================================
// Action DTOs
// ========================================

/**
 * Action Item DTO
 */
export interface ActionDto {
  id: string;
  type: ActionType;
  status: ActionStatus;
  title: string;
  description: string;
  patternId?: string;
  patternType?: string;
  targetApp?: string;
  targetPath?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Action List Response
 */
export interface ActionListResponseDto {
  items: ActionDto[];
  total: number;
  available: number;
  byType: Record<ActionType, number>;
}

/**
 * Action Execute Request
 */
export interface ActionExecuteRequestDto {
  actionId: string;
  pharmacyId: string;
}

/**
 * Action Execute Response
 */
export interface ActionExecuteResponseDto {
  success: boolean;
  actionId: string;
  targetApp?: string;
  targetPath?: string;
  message?: string;
  error?: string;
}

// ========================================
// Dashboard DTOs
// ========================================

/**
 * Dashboard Summary DTO
 */
export interface DashboardSummaryDto {
  pharmacyId: string;
  pharmacyName?: string;
  /** 관리 대상자 수 */
  totalPatients: number;
  /** 패턴 감지 수 */
  totalPatterns: number;
  /** 실행 가능한 Action 개수 */
  availableActions: number;
  /** Action 유형별 개수 */
  actionsByType: Record<ActionType, number>;
  /** 마지막 업데이트 */
  lastUpdated: string;
}

/**
 * Patient Summary (대상자 요약)
 */
export interface PatientSummaryDto {
  patientId: string;
  patientName?: string;
  lastCGMUpload?: string;
  latestPatterns: string[];
  pendingActions: number;
}

// ========================================
// Pattern to Action Mapping
// ========================================

/**
 * Pattern Type to Action Type 매핑
 * diabetes-core의 PatternAnalysis 결과를 Action으로 변환
 */
export const PATTERN_TO_ACTION_MAP: Record<string, ActionType> = {
  // 반복 저혈당 → 코칭 필요
  'recurring_hypo': 'COACHING',
  // 반복 고혈당 → 코칭 필요
  'recurring_hyper': 'COACHING',
  // 식후 스파이크 → 정보 표시
  'post_meal_spike': 'DISPLAY',
  // 야간 저혈당 → 코칭 필요
  'nocturnal_hypo': 'COACHING',
  // 새벽 현상 → 정보 표시
  'dawn_phenomenon': 'DISPLAY',
  // 운동 후 저하 → 정보 표시
  'exercise_drop': 'DISPLAY',
  // 주말 패턴 → 설문
  'weekend_pattern': 'SURVEY',
  // 시간대별 패턴 → 정보 표시
  'time_of_day_pattern': 'DISPLAY',
  // 식사 반응 패턴 → 설문
  'meal_response_pattern': 'SURVEY',
  // 높은 변동성 → 코칭 필요
  'high_variability': 'COACHING',
};

/**
 * Action Type별 Target App 매핑
 */
export const ACTION_TARGET_MAP: Record<ActionType, { app: string; path: string } | null> = {
  'COACHING': { app: 'diabetes-core', path: '/coaching/new' },
  'DISPLAY': { app: 'diabetes-pharmacy', path: '/reports' },
  'SURVEY': { app: 'diabetes-pharmacy', path: '/survey' },
  'COMMERCE': null, // Phase 2에서는 미구현
  'NONE': null,
};

/**
 * Action Type 아이콘 매핑
 */
export const ACTION_ICONS: Record<ActionType, string> = {
  'COACHING': 'chat',
  'DISPLAY': 'visibility',
  'SURVEY': 'assignment',
  'COMMERCE': 'shopping_cart',
  'NONE': 'block',
};

/**
 * Action Type 라벨 매핑
 */
export const ACTION_LABELS: Record<ActionType, string> = {
  'COACHING': '코칭 시작',
  'DISPLAY': '정보 보기',
  'SURVEY': '설문 응답',
  'COMMERCE': '상품 보기',
  'NONE': '액션 없음',
};
