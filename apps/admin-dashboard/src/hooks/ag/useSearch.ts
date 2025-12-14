/**
 * useSearch - Search Hook
 *
 * Phase 7-C: Global Components
 */

import { useState, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';

export interface UseSearchOptions<T> {
  /** Initial search term */
  initialSearch?: string;
  /** Debounce delay in ms */
  debounce?: number;
  /** Search fields to match against */
  searchFields?: (keyof T)[];
  /** Custom search function */
  searchFn?: (item: T, searchTerm: string) => boolean;
}

export interface UseSearchResult<T> {
  /** Current search term */
  searchTerm: string;
  /** Debounced search term */
  debouncedSearchTerm: string;
  /** Set search term */
  setSearchTerm: (term: string) => void;
  /** Clear search */
  clearSearch: () => void;
  /** Filter data by search term */
  filterData: (data: T[]) => T[];
  /** Check if currently searching */
  isSearching: boolean;
}

export function useSearch<T extends Record<string, unknown>>({
  initialSearch = '',
  debounce = 300,
  searchFields,
  searchFn,
}: UseSearchOptions<T> = {}): UseSearchResult<T> {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const debouncedSearchTerm = useDebounce(searchTerm, debounce);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const filterData = useCallback(
    (data: T[]): T[] => {
      if (!debouncedSearchTerm.trim()) {
        return data;
      }

      const term = debouncedSearchTerm.toLowerCase().trim();

      return data.filter((item) => {
        // Use custom search function if provided
        if (searchFn) {
          return searchFn(item, term);
        }

        // Use search fields if provided
        if (searchFields && searchFields.length > 0) {
          return searchFields.some((field) => {
            const value = item[field];
            if (value === null || value === undefined) return false;
            return String(value).toLowerCase().includes(term);
          });
        }

        // Default: search all string/number values
        return Object.values(item).some((value) => {
          if (value === null || value === undefined) return false;
          if (typeof value === 'string' || typeof value === 'number') {
            return String(value).toLowerCase().includes(term);
          }
          return false;
        });
      });
    },
    [debouncedSearchTerm, searchFields, searchFn]
  );

  const isSearching = useMemo(
    () => searchTerm !== debouncedSearchTerm,
    [searchTerm, debouncedSearchTerm]
  );

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    clearSearch,
    filterData,
    isSearching,
  };
}

export default useSearch;
