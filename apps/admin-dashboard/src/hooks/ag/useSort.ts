/**
 * useSort - Sorting Hook
 *
 * Phase 7-C: Global Components
 */

import { useState, useCallback, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface UseSortOptions<T> {
  /** Initial sort key */
  initialSortKey?: keyof T | null;
  /** Initial sort direction */
  initialSortDirection?: SortDirection;
  /** Custom comparator */
  comparator?: (a: T, b: T, key: keyof T, direction: SortDirection) => number;
}

export interface UseSortResult<T> {
  /** Current sort key */
  sortKey: keyof T | null;
  /** Current sort direction */
  sortDirection: SortDirection;
  /** Toggle sort on a key */
  toggleSort: (key: keyof T) => void;
  /** Set sort explicitly */
  setSort: (key: keyof T | null, direction: SortDirection) => void;
  /** Clear sort */
  clearSort: () => void;
  /** Sort data */
  sortData: (data: T[]) => T[];
  /** Check if a key is currently sorted */
  isSorted: (key: keyof T) => boolean;
  /** Get sort direction for a key */
  getSortDirection: (key: keyof T) => SortDirection;
}

export function useSort<T extends Record<string, unknown>>({
  initialSortKey = null,
  initialSortDirection = null,
  comparator,
}: UseSortOptions<T> = {}): UseSortResult<T> {
  const [sortKey, setSortKey] = useState<keyof T | null>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

  const toggleSort = useCallback(
    (key: keyof T) => {
      if (sortKey === key) {
        // Cycle through: asc -> desc -> null
        if (sortDirection === 'asc') {
          setSortDirection('desc');
        } else if (sortDirection === 'desc') {
          setSortKey(null);
          setSortDirection(null);
        } else {
          setSortDirection('asc');
        }
      } else {
        setSortKey(key);
        setSortDirection('asc');
      }
    },
    [sortKey, sortDirection]
  );

  const setSort = useCallback((key: keyof T | null, direction: SortDirection) => {
    setSortKey(key);
    setSortDirection(direction);
  }, []);

  const clearSort = useCallback(() => {
    setSortKey(null);
    setSortDirection(null);
  }, []);

  const defaultComparator = useCallback(
    (a: T, b: T, key: keyof T, direction: SortDirection): number => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison: number;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal, 'ko');
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      } else {
        comparison = String(aVal).localeCompare(String(bVal), 'ko');
      }

      return direction === 'desc' ? -comparison : comparison;
    },
    []
  );

  const sortData = useCallback(
    (data: T[]): T[] => {
      if (!sortKey || !sortDirection) {
        return data;
      }

      const compare = comparator || defaultComparator;
      return [...data].sort((a, b) => compare(a, b, sortKey, sortDirection));
    },
    [sortKey, sortDirection, comparator, defaultComparator]
  );

  const isSorted = useCallback(
    (key: keyof T): boolean => sortKey === key && sortDirection !== null,
    [sortKey, sortDirection]
  );

  const getSortDirection = useCallback(
    (key: keyof T): SortDirection => (sortKey === key ? sortDirection : null),
    [sortKey, sortDirection]
  );

  return {
    sortKey,
    sortDirection,
    toggleSort,
    setSort,
    clearSort,
    sortData,
    isSorted,
    getSortDirection,
  };
}

export default useSort;
