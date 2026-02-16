/**
 * Signal Adapter — 서비스 데이터를 HubSignal로 변환하는 유틸리티
 *
 * WO-PLATFORM-HUB-AI-SIGNAL-INTEGRATION-V1
 *
 * 사용법:
 *   const signals = mergeSignals(
 *     { members: createSignal('warning', { label: '승인 대기', count: 3, pulse: true }) },
 *     { forum: createSignal('info', { count: 42 }) },
 *   );
 */

import type { HubSignal, HubAction } from './types.js';

/**
 * HubSignal 생성 헬퍼
 */
export function createSignal(
  level: HubSignal['level'],
  opts?: { label?: string; count?: number; pulse?: boolean },
): HubSignal {
  return {
    level,
    label: opts?.label,
    count: opts?.count,
    pulse: opts?.pulse,
  };
}

/**
 * QuickAction이 포함된 HubSignal 생성
 *
 * WO-PLATFORM-AI-HUB-ASSETCOPY-INTEGRATION-V1
 */
export function createActionSignal(
  level: HubSignal['level'],
  opts: {
    label?: string;
    count?: number;
    pulse?: boolean;
    action: HubAction;
  },
): HubSignal {
  return {
    level,
    label: opts.label,
    count: opts.count,
    pulse: opts.pulse,
    action: opts.action,
  };
}

/**
 * 여러 신호 맵을 하나로 병합
 * 중복 키는 뒤의 것이 우선
 */
export function mergeSignals(
  ...maps: (Record<string, HubSignal> | undefined)[]
): Record<string, HubSignal> {
  const result: Record<string, HubSignal> = {};
  for (const map of maps) {
    if (map) {
      Object.assign(result, map);
    }
  }
  return result;
}
