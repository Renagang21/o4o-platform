/**
 * useTableFilter — Table Filtering Hook
 *
 * WO-O4O-TABLE-ADVANCED-FEATURES-V1 Phase 1
 *
 * 필터 상태 관리 + 필터링된 데이터 반환.
 * BaseTable 수정 없이 외부에서 data를 필터링하여 전달.
 *
 * 다중 컬럼 필터 지원. 필터 조건은 AND 결합.
 */

import { useState, useMemo, useCallback } from 'react';

export type FilterValue = string | number | boolean | null;

export type FilterFn<T> = (row: T, filterValue: FilterValue) => boolean;

export interface UseTableFilterOptions<T> {
  /** 필터 대상 데이터 */
  data: T[];
  /** 컬럼별 커스텀 필터 함수. 없으면 기본 includes 비교. */
  filters?: Record<string, FilterFn<T>>;
}

export interface UseTableFilterReturn<T> {
  /** 필터링된 데이터 — BaseTable data에 전달 */
  filteredData: T[];
  /** 현재 필터 상태 (key → value) */
  filterValues: Record<string, FilterValue>;
  /** 단일 필터 설정 */
  setFilter: (key: string, value: FilterValue) => void;
  /** 전체 필터 초기화 */
  resetFilters: () => void;
  /** 활성 필터 수 */
  activeFilterCount: number;
}

export function useTableFilter<T extends Record<string, any>>({
  data,
  filters,
}: UseTableFilterOptions<T>): UseTableFilterReturn<T> {
  const [filterValues, setFilterValues] = useState<Record<string, FilterValue>>({});

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setFilterValues((prev) => {
      const next = { ...prev };
      if (value === null || value === '' || value === undefined) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilterValues({});
  }, []);

  const activeFilterCount = Object.keys(filterValues).length;

  const filteredData = useMemo(() => {
    const entries = Object.entries(filterValues);
    if (entries.length === 0) return data;

    return data.filter((row) =>
      entries.every(([key, filterValue]) => {
        const customFilter = filters?.[key];
        if (customFilter) return customFilter(row, filterValue);

        // Default: string includes (case-insensitive)
        const cellValue = row[key];
        if (cellValue == null) return false;
        if (typeof filterValue === 'string') {
          return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
        }
        return cellValue === filterValue;
      }),
    );
  }, [data, filterValues, filters]);

  return { filteredData, filterValues, setFilter, resetFilters, activeFilterCount };
}
