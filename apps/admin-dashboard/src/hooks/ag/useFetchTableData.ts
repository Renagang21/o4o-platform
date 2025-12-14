/**
 * useFetchTableData - Table Data Fetching Hook
 *
 * Phase 7-C: Global Components
 *
 * Combines pagination, search, and sort for API data fetching
 */

import { useState, useEffect, useCallback } from 'react';

export interface FetchTableDataParams {
  page: number;
  pageSize: number;
  search?: string;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc' | null;
  filters?: Record<string, unknown>;
}

export interface FetchTableDataResult<T> {
  data: T[];
  total: number;
}

export interface UseFetchTableDataOptions<T> {
  /** Fetch function */
  fetchFn: (params: FetchTableDataParams) => Promise<FetchTableDataResult<T>>;
  /** Initial page */
  initialPage?: number;
  /** Initial page size */
  initialPageSize?: number;
  /** Initial search */
  initialSearch?: string;
  /** Initial sort key */
  initialSortKey?: string;
  /** Initial sort direction */
  initialSortDirection?: 'asc' | 'desc' | null;
  /** Initial filters */
  initialFilters?: Record<string, unknown>;
  /** Auto fetch on mount */
  autoFetch?: boolean;
  /** Debounce delay for search */
  searchDebounce?: number;
}

export interface UseFetchTableDataResult<T> {
  /** Table data */
  data: T[];
  /** Total items */
  total: number;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Current page */
  page: number;
  /** Page size */
  pageSize: number;
  /** Total pages */
  totalPages: number;
  /** Search term */
  search: string;
  /** Sort key */
  sortKey: string | null;
  /** Sort direction */
  sortDirection: 'asc' | 'desc' | null;
  /** Active filters */
  filters: Record<string, unknown>;
  /** Set page */
  setPage: (page: number) => void;
  /** Set page size */
  setPageSize: (size: number) => void;
  /** Set search */
  setSearch: (search: string) => void;
  /** Set sort */
  setSort: (key: string | null, direction: 'asc' | 'desc' | null) => void;
  /** Set filters */
  setFilters: (filters: Record<string, unknown>) => void;
  /** Update single filter */
  updateFilter: (key: string, value: unknown) => void;
  /** Clear filters */
  clearFilters: () => void;
  /** Refresh data */
  refresh: () => void;
  /** Reset all state */
  reset: () => void;
}

export function useFetchTableData<T>({
  fetchFn,
  initialPage = 1,
  initialPageSize = 10,
  initialSearch = '',
  initialSortKey = null,
  initialSortDirection = null,
  initialFilters = {},
  autoFetch = true,
  searchDebounce = 300,
}: UseFetchTableDataOptions<T>): UseFetchTableDataResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [search, setSearchState] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(
    initialSortDirection
  );
  const [filters, setFiltersState] = useState<Record<string, unknown>>(initialFilters);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page on search
    }, searchDebounce);

    return () => clearTimeout(timer);
  }, [search, searchDebounce]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn({
        page,
        pageSize,
        search: debouncedSearch,
        sortKey: sortKey || undefined,
        sortDirection,
        filters,
      });

      setData(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, page, pageSize, debouncedSearch, sortKey, sortDirection, filters]);

  // Auto fetch on dependency change
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const setSort = useCallback(
    (key: string | null, direction: 'asc' | 'desc' | null) => {
      setSortKey(key);
      setSortDirection(direction);
      setPage(1);
    },
    []
  );

  const setFilters = useCallback((newFilters: Record<string, unknown>) => {
    setFiltersState(newFilters);
    setPage(1);
  }, []);

  const updateFilter = useCallback((key: string, value: unknown) => {
    setFiltersState((prev) => {
      if (value === undefined || value === null || value === '') {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const reset = useCallback(() => {
    setPage(initialPage);
    setPageSizeState(initialPageSize);
    setSearchState(initialSearch);
    setDebouncedSearch(initialSearch);
    setSortKey(initialSortKey);
    setSortDirection(initialSortDirection);
    setFiltersState(initialFilters);
  }, [
    initialPage,
    initialPageSize,
    initialSearch,
    initialSortKey,
    initialSortDirection,
    initialFilters,
  ]);

  return {
    data,
    total,
    loading,
    error,
    page,
    pageSize,
    totalPages,
    search,
    sortKey,
    sortDirection,
    filters,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    setFilters,
    updateFilter,
    clearFilters,
    refresh,
    reset,
  };
}

export default useFetchTableData;
