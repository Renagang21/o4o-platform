/**
 * Conditional Block Evaluator
 * 조건을 평가하여 true/false를 반환
 */

import {
  Condition,
  ConditionOperator,
  EvaluationContext,
  LogicOperator,
  DateRangeValue,
  TimeRangeValue,
} from '../types/conditional-block.types';

/**
 * 단일 조건 평가
 */
export function evaluateCondition(
  condition: Condition,
  context: EvaluationContext
): boolean {
  const { type, operator, value } = condition;

  try {
    switch (type) {
      // ============================================
      // User Conditions
      // ============================================
      case 'user_logged_in':
        return evaluateUserLoggedIn(value, operator, context);

      case 'user_role':
        return evaluateUserRole(value, operator, context);

      case 'user_id':
        return evaluateUserId(value, operator, context);

      // ============================================
      // Content Conditions
      // ============================================
      case 'post_type':
        return evaluatePostType(value, operator, context);

      case 'post_category':
        return evaluatePostCategory(value, operator, context);

      case 'post_id':
        return evaluatePostId(value, operator, context);

      // ============================================
      // URL Conditions
      // ============================================
      case 'url_parameter':
        return evaluateUrlParameter(value, operator, context);

      case 'current_path':
        return evaluateCurrentPath(value, operator, context);

      case 'subdomain':
        return evaluateSubdomain(value, operator, context);

      // ============================================
      // Time Conditions
      // ============================================
      case 'date_range':
        return evaluateDateRange(value as DateRangeValue, operator, context);

      case 'time_range':
        return evaluateTimeRange(value as TimeRangeValue, operator, context);

      case 'day_of_week':
        return evaluateDayOfWeek(value, operator, context);

      // ============================================
      // Device Conditions
      // ============================================
      case 'device_type':
        return evaluateDeviceType(value, operator, context);

      case 'browser_type':
        return evaluateBrowserType(value, operator, context);

      default:
        console.warn(`Unknown condition type: ${type}`);
        return false;
    }
  } catch (error) {
    console.error(`Error evaluating condition:`, condition, error);
    return false;
  }
}

/**
 * 여러 조건 평가 (AND/OR 로직 적용)
 */
export function evaluateConditions(
  conditions: Condition[],
  logicOperator: LogicOperator,
  context: EvaluationContext
): boolean {
  if (conditions.length === 0) {
    return true;  // 조건이 없으면 항상 표시
  }

  const results = conditions.map(condition => evaluateCondition(condition, context));

  if (logicOperator === 'AND') {
    return results.every(result => result === true);
  } else {
    return results.some(result => result === true);
  }
}

// ============================================
// Individual Condition Evaluators
// ============================================

function evaluateUserLoggedIn(
  value: boolean,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const isLoggedIn = context.user?.isAuthenticated ?? false;
  return compareValues(isLoggedIn, value, operator);
}

function evaluateUserRole(
  value: string,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const userRole = context.user?.role;
  if (!userRole) return operator === 'is_not';
  return compareValues(userRole, value, operator);
}

function evaluateUserId(
  value: string | number,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const userId = context.user?.id;
  if (!userId) return operator === 'is_not';
  return compareValues(String(userId), String(value), operator);
}

function evaluatePostType(
  value: string,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const postType = context.post?.type;
  if (!postType) return operator === 'is_not';
  return compareValues(postType, value, operator);
}

function evaluatePostCategory(
  value: string,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const categories = context.post?.categories || [];
  const hasCategory = categories.includes(value);
  return compareValues(hasCategory, true, operator);
}

function evaluatePostId(
  value: string | number,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const postId = context.post?.id;
  if (!postId) return operator === 'is_not';
  return compareValues(String(postId), String(value), operator);
}

function evaluateUrlParameter(
  value: string,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const parameters = context.url?.parameters || {};

  // value format: "key" or "key=value"
  if (value.includes('=')) {
    const [key, expectedValue] = value.split('=');
    const actualValue = parameters[key];

    if (operator === 'exists') return actualValue !== undefined;
    if (operator === 'not_exists') return actualValue === undefined;

    return compareValues(actualValue, expectedValue, operator);
  } else {
    // Just checking existence
    const exists = parameters[value] !== undefined;
    if (operator === 'exists') return exists;
    if (operator === 'not_exists') return !exists;
    return exists;
  }
}

function evaluateCurrentPath(
  value: string,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const currentPath = context.url?.path || '';
  return compareValues(currentPath, value, operator);
}

function evaluateSubdomain(
  value: string,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const subdomain = context.url?.subdomain || null;
  if (!subdomain) return operator === 'is_not';
  return compareValues(subdomain, value, operator);
}

function evaluateDateRange(
  value: DateRangeValue,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const now = context.time?.now || new Date();
  const start = new Date(value.start);
  const end = new Date(value.end);

  if (operator === 'between') {
    return now >= start && now <= end;
  }

  return false;
}

function evaluateTimeRange(
  value: TimeRangeValue,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const now = context.time?.now || new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  if (operator === 'between') {
    return currentTime >= value.start && currentTime <= value.end;
  }

  return false;
}

function evaluateDayOfWeek(
  value: number,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const dayOfWeek = context.time?.dayOfWeek ?? (context.time?.now || new Date()).getDay();
  return compareValues(dayOfWeek, value, operator);
}

function evaluateDeviceType(
  value: string,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const deviceType = context.device?.type;
  if (!deviceType) return operator === 'is_not';
  return compareValues(deviceType, value, operator);
}

function evaluateBrowserType(
  value: string,
  operator: ConditionOperator,
  context: EvaluationContext
): boolean {
  const browserType = context.device?.browser;
  if (!browserType) return operator === 'is_not';
  return compareValues(browserType, value, operator);
}

// ============================================
// Helper Functions
// ============================================

/**
 * 값 비교 헬퍼 함수
 */
function compareValues(
  actualValue: any,
  expectedValue: any,
  operator: ConditionOperator
): boolean {
  switch (operator) {
    case 'is':
      return actualValue === expectedValue;

    case 'is_not':
      return actualValue !== expectedValue;

    case 'contains':
      if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
        return actualValue.toLowerCase().includes(expectedValue.toLowerCase());
      }
      if (Array.isArray(actualValue)) {
        return actualValue.includes(expectedValue);
      }
      return false;

    case 'not_contains':
      if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
        return !actualValue.toLowerCase().includes(expectedValue.toLowerCase());
      }
      if (Array.isArray(actualValue)) {
        return !actualValue.includes(expectedValue);
      }
      return true;

    case 'greater_than':
      return Number(actualValue) > Number(expectedValue);

    case 'less_than':
      return Number(actualValue) < Number(expectedValue);

    case 'exists':
      return actualValue !== undefined && actualValue !== null;

    case 'not_exists':
      return actualValue === undefined || actualValue === null;

    case 'between':
      // Handled in specific evaluators (date_range, time_range)
      return false;

    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * 컨텍스트 생성 헬퍼 (클라이언트 사이드용)
 */
export function createEvaluationContext(options: {
  user?: any;
  post?: any;
  url?: {
    pathname: string;
    searchParams?: URLSearchParams;
    hostname?: string;
  };
}): EvaluationContext {
  const now = new Date();

  // URL 파라미터 추출
  const parameters: Record<string, string> = {};
  if (options.url?.searchParams) {
    options.url.searchParams.forEach((value, key) => {
      parameters[key] = value;
    });
  }

  // 서브도메인 추출
  let subdomain: string | null = null;
  if (options.url?.hostname) {
    const parts = options.url.hostname.split('.');
    if (parts.length > 2) {
      subdomain = parts[0];
    }
  }

  // 디바이스 타입 감지 (간단한 구현)
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
  const isTablet = /Tablet|iPad/i.test(userAgent);

  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (isMobile) deviceType = 'mobile';
  else if (isTablet) deviceType = 'tablet';

  // 브라우저 타입 감지
  let browserType: 'chrome' | 'firefox' | 'safari' | 'edge' | 'other' = 'other';
  if (userAgent.includes('Chrome')) browserType = 'chrome';
  else if (userAgent.includes('Firefox')) browserType = 'firefox';
  else if (userAgent.includes('Safari')) browserType = 'safari';
  else if (userAgent.includes('Edge')) browserType = 'edge';

  return {
    user: options.user ? {
      id: options.user.id,
      role: options.user.role || options.user.userType,
      isAuthenticated: !!options.user.id,
    } : null,

    post: options.post ? {
      id: options.post.id,
      type: options.post.type || options.post.postType,
      categories: options.post.categories || [],
    } : undefined,

    url: {
      path: options.url?.pathname || '/',
      parameters,
      subdomain,
    },

    time: {
      now,
      dayOfWeek: now.getDay(),
    },

    device: {
      type: deviceType,
      browser: browserType,
    },
  };
}
