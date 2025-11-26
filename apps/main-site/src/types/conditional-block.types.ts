/**
 * Conditional Block Types
 * WordPress Toolset Conditional Blocks 모방
 */

// ============================================
// Condition Types
// ============================================

/**
 * 지원하는 조건 타입
 */
export type ConditionType =
  // User Conditions
  | 'user_logged_in'      // 사용자 로그인 여부
  | 'user_role'           // 사용자 역할
  | 'user_id'             // 특정 사용자 ID

  // Content Conditions
  | 'post_type'           // 포스트 타입
  | 'post_category'       // 포스트 카테고리
  | 'post_id'             // 특정 포스트 ID

  // URL Conditions
  | 'url_parameter'       // URL 파라미터
  | 'current_path'        // 현재 경로
  | 'subdomain'           // 서브도메인

  // Time Conditions
  | 'date_range'          // 날짜 범위
  | 'time_range'          // 시간 범위
  | 'day_of_week'         // 요일

  // Device/Browser
  | 'device_type'         // 디바이스 타입 (mobile, tablet, desktop)
  | 'browser_type';       // 브라우저 타입

/**
 * 조건 연산자
 */
export type ConditionOperator =
  // Equality
  | 'is'                  // 같음
  | 'is_not'              // 같지 않음

  // Contains
  | 'contains'            // 포함
  | 'not_contains'        // 포함하지 않음

  // Comparison
  | 'greater_than'        // 큰
  | 'less_than'           // 작은
  | 'between'             // 사이

  // Existence
  | 'exists'              // 존재
  | 'not_exists';         // 존재하지 않음

/**
 * 논리 연산자
 */
export type LogicOperator = 'AND' | 'OR';

// ============================================
// Condition Interfaces
// ============================================

/**
 * 기본 조건 인터페이스
 */
export interface Condition {
  id: string;
  type: ConditionType;
  operator: ConditionOperator;
  value: any;
  label?: string;  // UI 표시용 레이블
}

/**
 * 조건 그룹
 */
export interface ConditionGroup {
  id: string;
  conditions: Condition[];
  logicOperator: LogicOperator;  // 그룹 내 조건들의 논리 연산자
}

/**
 * Conditional Block 데이터
 */
export interface ConditionalBlockData {
  conditions: Condition[];         // 조건 배열
  logicOperator: LogicOperator;    // 조건들 간의 논리 연산자 (AND/OR)
  showWhenMet: boolean;            // true: 조건 만족시 표시, false: 조건 만족시 숨김
  groups?: ConditionGroup[];       // 고급 기능: 조건 그룹화
}

// ============================================
// Condition Value Types
// ============================================

/**
 * User Role 값
 */
export type UserRoleValue =
  | 'admin'
  | 'editor'
  | 'author'
  | 'contributor'
  | 'subscriber'
  | 'customer'
  | 'supplier'
  | 'retailer';

/**
 * Device Type 값
 */
export type DeviceTypeValue = 'mobile' | 'tablet' | 'desktop';

/**
 * Browser Type 값
 */
export type BrowserTypeValue = 'chrome' | 'firefox' | 'safari' | 'edge' | 'other';

/**
 * Day of Week 값
 */
export type DayOfWeekValue = 0 | 1 | 2 | 3 | 4 | 5 | 6;  // 0 = Sunday

/**
 * Date Range 값
 */
export interface DateRangeValue {
  start: string;  // ISO date string
  end: string;    // ISO date string
}

/**
 * Time Range 값
 */
export interface TimeRangeValue {
  start: string;  // HH:mm format
  end: string;    // HH:mm format
}

// ============================================
// Evaluation Context
// ============================================

/**
 * 조건 평가를 위한 컨텍스트
 */
export interface EvaluationContext {
  // User Context
  user?: {
    id: string | number;
    role: string;
    isAuthenticated: boolean;
  } | null;

  // Content Context
  post?: {
    id: string | number;
    type: string;
    categories?: string[];
  };

  // URL Context
  url?: {
    path: string;
    parameters: Record<string, string>;
    subdomain?: string | null;
  };

  // Time Context
  time?: {
    now: Date;
    dayOfWeek: number;
  };

  // Device Context
  device?: {
    type: DeviceTypeValue;
    browser: BrowserTypeValue;
  };
}

// ============================================
// UI Helper Types
// ============================================

/**
 * 조건 타입 정의 (UI에서 사용)
 */
export interface ConditionTypeDefinition {
  type: ConditionType;
  label: string;
  category: 'user' | 'content' | 'url' | 'time' | 'device';
  availableOperators: ConditionOperator[];
  valueType: 'boolean' | 'string' | 'number' | 'select' | 'multiselect' | 'date' | 'time' | 'daterange' | 'timerange';
  valueOptions?: Array<{ value: any; label: string }>;  // select/multiselect용
  description?: string;
}

/**
 * Condition Builder 상태
 */
export interface ConditionBuilderState {
  conditions: Condition[];
  logicOperator: LogicOperator;
  showWhenMet: boolean;
}

// ============================================
// Export Types
// ============================================

export type {
  Condition,
  ConditionGroup,
  ConditionalBlockData,
  EvaluationContext,
  ConditionTypeDefinition,
  ConditionBuilderState,
};
