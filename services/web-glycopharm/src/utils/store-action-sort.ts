/**
 * Store Action Sort - Quick Actions 자동 정렬
 *
 * WO-STORE-MAIN-PAGE-PHASE2-C
 *
 * 행동 로그 기반 가중치 계산 → 자동 정렬
 * - 최근 7일 로그만 사용
 * - 최근성 가중 (오늘 ×1.0, 3일 전 ×0.6, 7일 전 ×0.2)
 * - 히스테리시스: 1·2위 차이가 임계값 이상일 때만 교체
 * - 상위 2개만 순서 변경 허용, 나머지는 기본 순서 유지
 */

import { getStoreActionLogs } from './store-action-log';

const SORT_PREFS_KEY = 'store_action_sort_prefs';
const SORT_WINDOW_DAYS = 7;
const MIN_CLICKS_TO_SORT = 5;
const SWAP_THRESHOLD = 1.5;
const MAX_PROMOTED = 2;

interface SortPrefs {
  enabled: boolean;
}

/** 자동 정렬 사용 여부 조회 */
export function isAutoSortEnabled(): boolean {
  try {
    const raw = localStorage.getItem(SORT_PREFS_KEY);
    if (!raw) return false;
    const prefs: SortPrefs = JSON.parse(raw);
    return prefs.enabled;
  } catch {
    return false;
  }
}

/** 자동 정렬 사용 여부 설정 */
export function setAutoSortEnabled(enabled: boolean): void {
  try {
    const prefs: SortPrefs = { enabled };
    localStorage.setItem(SORT_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // 실패 무시
  }
}

/**
 * actionKey별 가중치 계산
 * 최근 7일 로그에서 최근성 가중 점수 합산
 */
export function computeActionWeights(): Map<string, number> {
  const logs = getStoreActionLogs();
  const now = Date.now();
  const windowMs = SORT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const weights = new Map<string, number>();

  for (const entry of logs) {
    const entryTime = new Date(entry.timestamp).getTime();
    const age = now - entryTime;

    // 7일 이내만 사용
    if (age > windowMs) continue;

    // 최근성 가중: 0일 → 1.0, 3일 → 0.6, 7일 → 0.2
    // 선형 보간: weight = 1.0 - (age / windowMs) * 0.8
    const recencyWeight = Math.max(0.2, 1.0 - (age / windowMs) * 0.8);

    const current = weights.get(entry.actionKey) || 0;
    weights.set(entry.actionKey, current + recencyWeight);
  }

  return weights;
}

/**
 * Quick Actions 자동 정렬
 *
 * @param defaultOrder 기본 actionKey 순서 배열
 * @returns 정렬된 actionKey 순서 배열
 *
 * 규칙:
 * 1. 자동 정렬 OFF → 기본 순서 반환
 * 2. 최소 클릭 수 미달 → 기본 순서 반환
 * 3. 상위 2개만 재배치, 나머지는 기본 순서 유지
 * 4. 히스테리시스: 1위와 2위 차이가 임계값 이상일 때만 교체
 */
export function sortQuickActions(defaultOrder: string[]): string[] {
  if (!isAutoSortEnabled()) {
    return [...defaultOrder];
  }

  const weights = computeActionWeights();

  // 전체 클릭 수 확인
  let totalWeight = 0;
  for (const w of weights.values()) {
    totalWeight += w;
  }
  if (totalWeight < MIN_CLICKS_TO_SORT) {
    return [...defaultOrder];
  }

  // 가중치 기준 상위 항목 추출
  const ranked = [...weights.entries()]
    .filter(([key]) => defaultOrder.includes(key))
    .sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) {
    return [...defaultOrder];
  }

  // 히스테리시스: 1위와 기본 1위의 가중치 차이 확인
  const topKey = ranked[0][0];
  const topWeight = ranked[0][1];
  const defaultTopKey = defaultOrder[0];
  const defaultTopWeight = weights.get(defaultTopKey) || 0;

  // 기본 1위와 같으면 교체 불필요
  if (topKey === defaultTopKey) {
    // 2위도 확인
    if (ranked.length >= 2) {
      const secondKey = ranked[1][0];
      const secondWeight = ranked[1][1];
      const defaultSecondKey = defaultOrder[1];
      const defaultSecondWeight = weights.get(defaultSecondKey) || 0;

      if (secondKey !== defaultSecondKey && secondWeight - defaultSecondWeight >= SWAP_THRESHOLD) {
        return promoteKeys([secondKey], defaultOrder);
      }
    }
    return [...defaultOrder];
  }

  // 1위 교체: 가중치 차이가 임계값 이상이어야 함
  if (topWeight - defaultTopWeight < SWAP_THRESHOLD) {
    return [...defaultOrder];
  }

  // 상위 MAX_PROMOTED개까지 승격
  const toPromote: string[] = [topKey];

  if (ranked.length >= 2 && MAX_PROMOTED >= 2) {
    const secondKey = ranked[1][0];
    const secondWeight = ranked[1][1];
    const defaultSecondKey = defaultOrder[1];
    const defaultSecondWeight = weights.get(defaultSecondKey) || 0;

    if (secondKey !== defaultSecondKey && secondWeight - defaultSecondWeight >= SWAP_THRESHOLD) {
      toPromote.push(secondKey);
    }
  }

  return promoteKeys(toPromote, defaultOrder);
}

/**
 * 지정된 키들을 앞으로 이동, 나머지는 기본 순서 유지
 */
function promoteKeys(keysToPromote: string[], defaultOrder: string[]): string[] {
  const promoted = keysToPromote.filter((k) => defaultOrder.includes(k));
  const remaining = defaultOrder.filter((k) => !promoted.includes(k));
  return [...promoted, ...remaining];
}
