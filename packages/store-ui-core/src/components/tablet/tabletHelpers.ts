/**
 * 태블릿 진열 helper — 두 서비스에 중복돼 있던 매핑/정렬 로직
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1
 */

import {
  TABLET_VISIBILITY_FALLBACK_NOTICE,
  TABLET_VISIBILITY_NOTICE,
} from './types';
import type {
  StoreTabletDisplayItem,
  StoreTabletProductPool,
  TabletDisplayEntry,
  TabletDisplaySaveInput,
  TabletPoolCandidate,
} from './types';

/** 진열 응답 → 화면 entry (상품명 fallback 포함, 기존 문구 그대로) */
export function buildDisplayEntries(
  displayData: StoreTabletDisplayItem[],
  pool: StoreTabletProductPool,
): TabletDisplayEntry[] {
  return displayData.map((d) => {
    let productName = '(알 수 없음)';
    if (d.product_type === 'supplier') {
      const sp = pool.supplierProducts.find((p) => p.id === d.product_id);
      productName = sp?.product_name || '(삭제된 공급 상품)';
    } else {
      const lp = pool.localProducts.find((p) => p.id === d.product_id);
      productName = lp?.name || '(삭제된 자체 상품)';
    }
    return {
      productType: d.product_type,
      productId: d.product_id,
      productName,
      sortOrder: d.sort_order,
      isVisible: d.is_visible,
    };
  });
}

/** sortOrder 를 배열 index 로 재부여 */
export function resequenceEntries(entries: TabletDisplayEntry[]): TabletDisplayEntry[] {
  return entries.map((d, i) => ({ ...d, sortOrder: i }));
}

/** 위/아래 이동 — 범위를 벗어나면 원본을 그대로 돌려준다 */
export function moveEntry(
  entries: TabletDisplayEntry[],
  index: number,
  direction: 'up' | 'down',
): TabletDisplayEntry[] {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= entries.length) return entries;
  const next = [...entries];
  [next[index], next[target]] = [next[target], next[index]];
  return resequenceEntries(next);
}

export function removeEntryAt(entries: TabletDisplayEntry[], index: number): TabletDisplayEntry[] {
  return resequenceEntries(entries.filter((_, i) => i !== index));
}

export function isInDisplay(
  entries: TabletDisplayEntry[],
  productType: 'supplier' | 'local',
  productId: string,
): boolean {
  return entries.some((d) => d.productType === productType && d.productId === productId);
}

/** 이미 진열된 항목을 제외한 풀 후보 */
export function buildPoolCandidates(
  pool: StoreTabletProductPool | null,
  tab: 'supplier' | 'local',
  entries: TabletDisplayEntry[],
): TabletPoolCandidate[] {
  if (tab === 'supplier') {
    return (pool?.supplierProducts || [])
      .filter((p) => !isInDisplay(entries, 'supplier', p.id))
      .map((p) => ({
        id: p.id,
        name: p.product_name,
        type: 'supplier' as const,
        tabletVisible: p.tabletVisible,
        visibilityNotice:
          p.tabletVisible === false
            ? (TABLET_VISIBILITY_NOTICE[String(p.tabletVisibilityReason ?? '')]
              ?? TABLET_VISIBILITY_FALLBACK_NOTICE)
            : null,
      }));
  }
  return (pool?.localProducts || [])
    .filter((p) => !isInDisplay(entries, 'local', p.id))
    .map((p) => ({ id: p.id, name: p.name, type: 'local' as const }));
}

/** 저장 payload — 기존 계약과 동일(index 를 sortOrder 로) */
export function toDisplaySavePayload(entries: TabletDisplayEntry[]): TabletDisplaySaveInput[] {
  return entries.map((d, i) => ({
    productType: d.productType,
    productId: d.productId,
    sortOrder: i,
    isVisible: d.isVisible,
  }));
}

/** 변경 감지 — 기존 페이지와 동일한 JSON 비교 */
export function hasIdleChanges<T>(items: T[], initial: T[]): boolean {
  return JSON.stringify(items) !== JSON.stringify(initial);
}

export function tabletOptionLabel(name: string, location?: string | null): string {
  return `${name} ${location ? `(${location})` : ''}`;
}
