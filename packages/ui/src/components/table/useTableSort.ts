/**
 * useTableSort — Table Sorting Hook
 *
 * WO-O4O-TABLE-ADVANCED-FEATURES-V1 Phase 1
 *
 * 정렬 상태 관리 + 정렬된 데이터 반환.
 * BaseTable 수정 없이 외부에서 data를 정렬하여 전달.
 *
 * 3-state cycle: asc → desc → none (원본 복원)
 */

import { useState, useMemo, useCallback } from 'react';

export type SortOrder = 'asc' | 'desc' | null;

export interface SortState {
  key: string | null;
  order: SortOrder;
}

export interface UseTableSortOptions<T> {
  /** 정렬 대상 데이터 */
  data: T[];
  /** 커스텀 sorter (column key → comparator). 없으면 기본 비교. */
  sorters?: Record<string, (a: T, b: T) => number>;
  /** 초기 정렬 상태 */
  defaultSort?: SortState;
}

export interface UseTableSortReturn<T> {
  /** 정렬된 데이터 — BaseTable data에 전달 */
  sortedData: T[];
  /** 현재 정렬 상태 */
  sortState: SortState;
  /** 정렬 토글 (3-state cycle: asc → desc → none) */
  toggleSort: (key: string) => void;
  /** 정렬 초기화 */
  resetSort: () => void;
}

const defaultSortState: SortState = { key: null, order: null };

export function useTableSort<T extends Record<string, any>>({
  data,
  sorters,
  defaultSort = defaultSortState,
}: UseTableSortOptions<T>): UseTableSortReturn<T> {
  const [sortState, setSortState] = useState<SortState>(defaultSort);

  const toggleSort = useCallback((key: string) => {
    setSortState((prev) => {
      if (prev.key !== key) return { key, order: 'asc' };
      if (prev.order === 'asc') return { key, order: 'desc' };
      return { key: null, order: null }; // desc → none
    });
  }, []);

  const resetSort = useCallback(() => {
    setSortState(defaultSortState);
  }, []);

  const sortedData = useMemo(() => {
    if (!sortState.key || !sortState.order) return data;

    const key = sortState.key;
    const customSorter = sorters?.[key];
    const sorted = [...data];

    sorted.sort((a, b) => {
      if (customSorter) {
        const result = customSorter(a, b);
        return sortState.order === 'desc' ? -result : result;
      }

      // Default comparison
      const aVal = a[key];
      const bVal = b[key];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortState.order === 'desc' ? -cmp : cmp;
    });

    return sorted;
  }, [data, sortState, sorters]);

  return { sortedData, sortState, toggleSort, resetSort };
}
