/**
 * Store Action Log - Lightweight stub
 *
 * WO-STORE-MAIN-PAGE-PHASE2-B
 * 행동 로그 수집 구조 (준비 단계)
 *
 * Phase 2-C/3에서 Quick Actions 자동 정렬 및 AI 추천 우선순위에 활용.
 * 현재는 console stub만 제공하며, 실패해도 UX에 영향 없음.
 */

export interface StoreActionLogEntry {
  actionKey: string;
  timestamp: string;
}

const LOG_STORAGE_KEY = 'store_action_log';
const MAX_LOG_ENTRIES = 100;

/**
 * 행동 로그 기록 (비동기·경량, 실패 무시)
 */
export function logStoreAction(actionKey: string): void {
  try {
    const entry: StoreActionLogEntry = {
      actionKey,
      timestamp: new Date().toISOString(),
    };

    // localStorage에 경량 저장
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    const logs: StoreActionLogEntry[] = raw ? JSON.parse(raw) : [];
    logs.push(entry);

    // 최대 건수 초과 시 오래된 것부터 제거
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    }

    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // 실패해도 UX 영향 없음
  }
}

/**
 * 저장된 행동 로그 조회 (Phase 2-C/3에서 정렬에 활용)
 */
export function getStoreActionLogs(): StoreActionLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
