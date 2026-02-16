/**
 * Context Builder
 *
 * Extracts and validates service-specific data into a uniform AIContext.
 * Each service provides raw contextData; this module normalizes it
 * and applies safety constraints (e.g., "no medical advice").
 */

import type { AIContext, AIOrchestrationRequest, AIServiceId } from './types.js';

/** Service-specific constraint sets */
const SERVICE_CONSTRAINTS: Record<AIServiceId, string[]> = {
  glycopharm: [
    '의료적 진단이나 처방을 제공하지 마세요.',
    '관찰된 데이터 패턴만 설명하세요.',
    '구체적인 약품명 대신 제품 유형을 언급하세요.',
    '항상 "~경향이 관찰됩니다" 형태로 표현하세요.',
  ],
  neture: [
    '매출 데이터를 정확한 숫자로 인용하세요.',
    '성장률은 전주 대비로 계산하세요.',
    '마케팅 추천은 실행 가능한 수준으로 제한하세요.',
  ],
  kpa: [
    '약사회 내부 데이터만 참조하세요.',
    '개인 식별 정보를 요약에 포함하지 마세요.',
    '조직 운영 관점에서 분석하세요.',
  ],
  glucoseview: [
    '의료적 진단이나 처방을 제공하지 마세요.',
    '혈당 패턴의 관찰만 기술하세요.',
    '"전문의 상담을 권장합니다" 문구를 항상 포함하세요.',
  ],
  cosmetics: [
    '성분 분석은 관찰 수준으로 제한하세요.',
    '피부과 진단을 제공하지 마세요.',
    '알레르기 테스트 권장 문구를 포함하세요.',
  ],
};

/**
 * Build a normalized AIContext from an orchestration request.
 */
export function buildContext(request: AIOrchestrationRequest): AIContext {
  const constraints = SERVICE_CONSTRAINTS[request.service] || [];

  return {
    service: request.service,
    insightType: request.insightType,
    dataPoints: sanitizeDataPoints(request.contextData),
    constraints,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Remove potentially dangerous or oversized data from context.
 */
function sanitizeDataPoints(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Skip functions, symbols, and undefined
    if (typeof value === 'function' || typeof value === 'symbol' || value === undefined) {
      continue;
    }
    // Truncate large strings
    if (typeof value === 'string' && value.length > 5000) {
      sanitized[key] = value.slice(0, 5000) + '...[truncated]';
      continue;
    }
    // Limit array sizes
    if (Array.isArray(value) && value.length > 100) {
      sanitized[key] = value.slice(0, 100);
      continue;
    }
    sanitized[key] = value;
  }

  return sanitized;
}
