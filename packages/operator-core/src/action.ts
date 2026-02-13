/**
 * Operator AI Action Layer
 *
 * WO-OPERATOR-AI-ACTION-LAYER-V1
 * WO-OPERATOR-ACTION-TRIGGER-V1
 *
 * Signal 상태를 기반으로 운영자에게 행동 제안(Action Suggestion)을 생성한다.
 * AI는 결정을 대신하지 않는다. 행동 제안만 수행한다.
 * trigger 타입은 대시보드 내에서 즉시 실행 가능한 운영 동작을 제공한다.
 */

import type { OperatorSignalCardConfig } from './types';

/** 즉시 실행 트리거 정의 */
export interface OperatorActionTrigger {
  /** 서비스에서 식별할 트리거 키 */
  key: string;
  /** 실행 전 확인 메시지 (없으면 즉시 실행) */
  confirmMessage?: string;
}

/** 행동 제안 1건 */
export interface OperatorActionSuggestion {
  id: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  targetRoute?: string;
  actionType: 'navigate' | 'modal' | 'external' | 'trigger';
  /** actionType === 'trigger'일 때 사용 */
  trigger?: OperatorActionTrigger;
}

/**
 * Signal Card 목록을 분석해 행동 제안 목록을 생성한다.
 *
 * 규칙:
 *  - alert → high priority
 *  - warning → medium priority
 *  - good → 제안 없음
 *
 * 최대 3개까지 반환. priority 내림차순 정렬.
 */
export function generateOperatorActions(
  signals: OperatorSignalCardConfig[],
  limit = 3,
): OperatorActionSuggestion[] {
  const suggestions: OperatorActionSuggestion[] = [];

  for (const card of signals) {
    const { signal, title, actionLink } = card;

    if (signal.status === 'alert') {
      suggestions.push({
        id: `action-${title}`,
        priority: 'high',
        title: `${title}: 즉시 조치 필요`,
        description: signal.message,
        targetRoute: actionLink,
        actionType: 'navigate',
      });
    } else if (signal.status === 'warning') {
      suggestions.push({
        id: `action-${title}`,
        priority: 'medium',
        title: `${title}: 점검 권장`,
        description: signal.message,
        targetRoute: actionLink,
        actionType: 'navigate',
      });
    }
    // good → 제안 없음
  }

  // priority 내림차순 (high > medium > low)
  const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
  suggestions.sort((a, b) => order[b.priority] - order[a.priority]);

  return suggestions.slice(0, limit);
}
