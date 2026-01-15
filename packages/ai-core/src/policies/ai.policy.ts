/**
 * AI Core - Policy Definitions
 *
 * AI 사용 정책 및 접근 제어 기준을 정의합니다.
 *
 * @package @o4o/ai-core
 * @workorder WO-AI-CORE-APP-SCAFFOLD-V0
 */

// ============================================================
// AI 정책 정의 (Policy Definitions)
// ============================================================

/**
 * AI 기능 정책
 */
export interface AiPolicy {
  /** 서비스 ID */
  serviceId: string;

  /** AI 기능 활성화 여부 */
  enabled: boolean;

  /** 허용된 AI 기능 목록 */
  allowedFeatures: AiFeatureType[];

  /** 접근 제한 조건 */
  restrictions?: AiRestriction[];
}

/**
 * AI 기능 타입
 */
export type AiFeatureType =
  | 'summary'          // 요약 기능
  | 'analysis'         // 분석 기능
  | 'suggestion'       // 제안 기능
  | 'chat'             // 채팅 기능
  | 'preview';         // 프리뷰 기능 (현재 활성)

/**
 * AI 접근 제한 조건
 */
export interface AiRestriction {
  /** 제한 타입 */
  type: 'role' | 'subscription' | 'quota' | 'time';

  /** 제한 값 */
  value: unknown;

  /** 제한 메시지 */
  message: string;
}

// ============================================================
// 서비스별 기본 정책 (Default Policies)
// ============================================================

/**
 * 현재 활성화된 서비스별 AI 정책
 *
 * 참고: 현재는 'preview' 기능만 활성화됨
 */
export const DEFAULT_AI_POLICIES: Record<string, AiPolicy> = {
  'neture': {
    serviceId: 'neture',
    enabled: true,
    allowedFeatures: ['preview'],
  },
  'glycopharm': {
    serviceId: 'glycopharm',
    enabled: true,
    allowedFeatures: ['preview'],
  },
  'glucoseview': {
    serviceId: 'glucoseview',
    enabled: true,
    allowedFeatures: ['preview'],
  },
  'k-cosmetics': {
    serviceId: 'k-cosmetics',
    enabled: true,
    allowedFeatures: ['preview'],
  },
  'kpa-society': {
    serviceId: 'kpa-society',
    enabled: true,
    allowedFeatures: ['preview'],
  },
};

// ============================================================
// 정책 검증 함수 (Policy Validators)
// ============================================================

/**
 * AI 기능 사용 가능 여부 확인
 */
export function isAiFeatureAllowed(
  serviceId: string,
  feature: AiFeatureType
): boolean {
  const policy = DEFAULT_AI_POLICIES[serviceId];
  if (!policy || !policy.enabled) {
    return false;
  }
  return policy.allowedFeatures.includes(feature);
}

/**
 * 서비스의 AI 정책 조회
 */
export function getAiPolicy(serviceId: string): AiPolicy | undefined {
  return DEFAULT_AI_POLICIES[serviceId];
}

// ============================================================
// Placeholder: 향후 확장 예정
// ============================================================

/**
 * TODO: 향후 구현 예정 항목
 *
 * - 역할 기반 AI 접근 제어
 * - 구독 등급별 AI 기능 제한
 * - 일일/월간 사용량 제한
 * - A/B 테스트 정책
 */
