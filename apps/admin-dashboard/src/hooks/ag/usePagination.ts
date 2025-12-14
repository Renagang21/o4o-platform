/**
 * usePagination - Pagination Hook
 *
 * Phase 7-C: Global Components
 */

import { useState, useMemo, useCallback } from 'react';

export interface UsePaginationOptions {
  /** Total number of items */
  totalItems: number;
  /** Initial page (1-indexed) */
  initialPage?: number;
  /** Items per page */
  initialPageSize?: number;
  /** Available page size options */
  pageSizeOptions?: number[];
}

export interface UsePaginationResult {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total pages */
  totalPages: number;
  /** Total items */
  totalItems: number;
  /** Start index (0-indexed) */
  startIndex: number;
  /** End index (0-indexed, exclusive) */
  endIndex: number;
  /** Whether there's a previous page */
  hasPrevious: boolean;
  /** Whether there's a next page */
  hasNext: boolean;
  /** Page size options */
  pageSizeOptions: number[];
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  previousPage: () => void;
  /** Go to first page */
  firstPage: () => void;
  /** Go to last page */
  lastPage: () => void;
  /** Change page size */
  setPageSize: (size: number) => void;
  /** Reset to first page */
  reset: () => void;
}

export function usePagination({
  totalItems,
  initialPage = 1,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
}: UsePaginationOptions): UsePaginationResult {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalItems / pageSize)),
    [totalItems, pageSize]
  );

  // Ensure page is within bounds
  const boundedPage = useMemo(
    () => Math.min(Math.max(1, page), totalPages),
    [page, totalPages]
  );

  // Update page if out of bounds
  if (boundedPage !== page) {
    setPage(boundedPage);
  }

  const startIndex = (boundedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const goToPage = useCallback(
    (newPage: number) => {
      setPage(Math.min(Math.max(1, newPage), totalPages));
    },
    [totalPages]
  );

  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  const previousPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = useCallback(() => {
    goToPage(totalPages);
  }, [totalPages, goToPage]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1); // Reset to first page when changing page size
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
    setPageSizeState(initialPageSize);
  }, [initialPage, initialPageSize]);

  return {
    page: boundedPage,
    pageSize,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    hasPrevious: boundedPage > 1,
    hasNext: boundedPage < totalPages,
    pageSizeOptions,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    reset,
  };
}

export default usePagination;
