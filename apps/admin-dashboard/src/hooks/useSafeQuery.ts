/**
 * Safe Query Hook
 * 
 * Wraps React Query's useQuery to automatically handle various API response formats
 * and prevent runtime errors from unexpected data structures
 */

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { ensureArray, ensureObject, normalizeResponse } from '@/utils/apiResponseHelper';

interface SafeQueryOptions<T> extends Omit<UseQueryOptions<any, Error, T>, 'queryFn'> {
  queryFn: () => Promise<any>;
  dataType?: 'array' | 'object' | 'auto';
  defaultData?: T;
}

/**
 * Safe version of useQuery that handles various API response formats
 */
export function useSafeQuery<T = any>(
  options: SafeQueryOptions<T>
): UseQueryResult<T, Error> {
  const { queryFn, dataType = 'auto', defaultData, ...queryOptions } = options;

  return useQuery({
    ...queryOptions,
    queryFn: async () => {
      try {
        const response = await queryFn();
        const normalized = normalizeResponse(response);
        
        // Handle data based on expected type
        if (dataType === 'array') {
          return ensureArray(normalized.data, defaultData as any || []) as T;
        } else if (dataType === 'object') {
          return ensureObject(normalized.data, defaultData as any || {}) as T;
        } else {
          // Auto-detect based on default data or response
          if (Array.isArray(defaultData)) {
            return ensureArray(normalized.data, defaultData as any) as T;
          } else if (defaultData && typeof defaultData === 'object') {
            return ensureObject(normalized.data, defaultData as any) as T;
          }
          
          // Return normalized data as-is
          return normalized.data as T;
        }
      } catch (error) {
        // If error occurs, return default data
        if (defaultData !== undefined) {
          return defaultData;
        }
        throw error;
      }
    }
  });
}

/**
 * Safe version of useQuery specifically for array data
 */
export function useSafeArrayQuery<T = any>(
  queryKey: any[],
  queryFn: () => Promise<any>,
  options?: Omit<UseQueryOptions<T[], Error, T[]>, 'queryKey' | 'queryFn'>,
  defaultData: T[] = []
): UseQueryResult<T[], Error> {
  return useSafeQuery<T[]>({
    queryKey,
    queryFn,
    dataType: 'array',
    defaultData,
    ...options
  });
}

/**
 * Safe version of useQuery specifically for object data
 */
export function useSafeObjectQuery<T extends Record<string, any> = Record<string, any>>(
  queryKey: any[],
  queryFn: () => Promise<any>,
  options?: Omit<UseQueryOptions<T, Error, T>, 'queryKey' | 'queryFn'>,
  defaultData: T = {} as T
): UseQueryResult<T, Error> {
  return useSafeQuery<T>({
    queryKey,
    queryFn,
    dataType: 'object',
    defaultData,
    ...options
  });
}

/**
 * Hook for paginated data that ensures proper structure
 */
export function useSafePaginatedQuery<T = any>(
  queryKey: any[],
  queryFn: () => Promise<any>,
  options?: Omit<UseQueryOptions<any, Error, any>, 'queryKey' | 'queryFn'>
): UseQueryResult<{
  data: T[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}, Error> {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await queryFn();
      const normalized = normalizeResponse(response);
      
      return {
        data: ensureArray<T>(normalized.data),
        pagination: normalized.pagination || {
          total: 0,
          totalPages: 0,
          currentPage: 1,
          pageSize: 10
        }
      };
    },
    ...options
  });
}