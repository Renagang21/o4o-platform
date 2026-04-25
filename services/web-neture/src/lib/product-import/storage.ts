/**
 * WO-O4O-PRODUCT-IMPORT-ASSISTANT-V1
 *
 * sessionStorage 기반 Import Draft 저장/읽기
 * - 탭 닫으면 자동 소멸
 * - loadAndClearDraft는 1회 읽고 삭제 (single-use)
 */

import type { ImportDraft } from './types';

const KEY = 'neture-import-draft';

export function saveDraft(draft: ImportDraft): void {
  sessionStorage.setItem(KEY, JSON.stringify(draft));
}

export function loadAndClearDraft(): ImportDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as ImportDraft;
  } catch {
    sessionStorage.removeItem(KEY);
    return null;
  }
}
