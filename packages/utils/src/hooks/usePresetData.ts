import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { ViewPreset } from '@o4o/types';

/**
 * Hook return type
 */
export interface UsePresetDataResult {
  data: any[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
}

/**
 * API response type for CPT data
 */
interface CptDataResponse {
  success: boolean;
  data: any[];
  total?: number;
  pagination?: {
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Fetch CPT data from API based on ViewPreset configuration
 */
async function fetchPresetData(preset: ViewPreset): Promise<CptDataResponse> {
  const { cptSlug, config } = preset;

  // Build API endpoint
  const endpoint = `/cpts/${cptSlug}/entries`;

  // Build query parameters
  const params = new URLSearchParams();

  // Sorting
  if (config.defaultSort) {
    params.append('orderBy', config.defaultSort.field);
    params.append('order', config.defaultSort.order);
  }

  // Pagination
  if (config.pagination?.showPagination) {
    params.append('page', '1');
    params.append('limit', String(config.pagination.pageSize || 10));
  }

  // Filters (if any)
  if (config.filters) {
    config.filters.forEach((filter) => {
      if (filter.defaultValue !== undefined && filter.defaultValue !== null) {
        params.append(`filter_${filter.field}`, String(filter.defaultValue));
      }
    });
  }

  const queryString = params.toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  const response = await authClient.api.get<CptDataResponse>(url);

  if (!response.data || !response.data.success) {
    throw new Error(`Failed to fetch data for CPT: ${cptSlug}`);
  }

  return response.data;
}

/**
 * React Hook: usePresetData
 *
 * Fetches CPT data based on ViewPreset configuration
 *
 * @param preset - The ViewPreset configuration
 * @returns { data, loading, error, total, refetch }
 *
 * @example
 * ```tsx
 * const { preset } = usePreset('view_post_latest_10', 'view');
 * const { data, loading, error } = usePresetData(preset);
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 *
 * return <PresetRenderer preset={preset} data={data} />;
 * ```
 */
export function usePresetData(preset: ViewPreset | undefined): UsePresetDataResult {
  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery<CptDataResponse, Error>({
    queryKey: ['preset-data', preset?.id, preset?.cptSlug],
    queryFn: () => {
      if (!preset) {
        throw new Error('Preset is required');
      }
      return fetchPresetData(preset);
    },
    enabled: !!preset,
    staleTime: preset?.config.cache?.ttl
      ? preset.config.cache.ttl * 1000
      : 5 * 60 * 1000, // Use preset cache config or default 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: preset?.config.cache?.revalidateOnFocus ?? false,
    retry: (failureCount, error) => {
      // Don't retry on 403/401/404 errors
      if (
        error.message.includes('403') ||
        error.message.includes('401') ||
        error.message.includes('404') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('Forbidden')
      ) {
        return false;
      }
      return failureCount < 1;
    }
  });

  // Handle error messages
  let errorMessage: string | null = null;
  if (error) {
    if (error.message.includes('404')) {
      errorMessage = `Data not found for CPT: ${preset?.cptSlug}`;
    } else if (
      error.message.includes('403') ||
      error.message.includes('401') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('Forbidden')
    ) {
      errorMessage = 'You do not have permission to access this data';
    } else {
      errorMessage = error.message;
    }
  }

  return {
    data: response?.data || [],
    loading: isLoading,
    error: errorMessage,
    total: response?.total || 0,
    refetch: async () => {
      await refetch();
    }
  };
}

/**
 * Hook with custom query parameters
 * Useful for implementing custom filtering, search, pagination
 */
export interface PresetDataQueryParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
  search?: string;
}

export function usePresetDataWithParams(
  preset: ViewPreset | undefined,
  params?: PresetDataQueryParams
): UsePresetDataResult {
  const {
    data: response,
    isLoading,
    error,
    refetch
  } = useQuery<CptDataResponse, Error>({
    queryKey: ['preset-data', preset?.id, preset?.cptSlug, params],
    queryFn: async () => {
      if (!preset) {
        throw new Error('Preset is required');
      }

      const endpoint = `/cpts/${preset.cptSlug}/entries`;
      const queryParams = new URLSearchParams();

      // Apply custom params or fall back to preset config
      if (params?.orderBy) {
        queryParams.append('orderBy', params.orderBy);
        queryParams.append('order', params.order || 'ASC');
      } else if (preset.config.defaultSort) {
        queryParams.append('orderBy', preset.config.defaultSort.field);
        queryParams.append('order', preset.config.defaultSort.order);
      }

      if (params?.page) {
        queryParams.append('page', String(params.page));
      }

      if (params?.limit) {
        queryParams.append('limit', String(params.limit));
      } else if (preset.config.pagination?.pageSize) {
        queryParams.append('limit', String(preset.config.pagination.pageSize));
      }

      if (params?.search && preset.config.search?.enabled) {
        queryParams.append('search', params.search);
        queryParams.append('searchFields', preset.config.search.fields.join(','));
      }

      if (params?.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          queryParams.append(`filter_${key}`, String(value));
        });
      }

      const queryString = queryParams.toString();
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;

      const response = await authClient.api.get<CptDataResponse>(url);

      if (!response.data || !response.data.success) {
        throw new Error(`Failed to fetch data for CPT: ${preset.cptSlug}`);
      }

      return response.data;
    },
    enabled: !!preset,
    staleTime: preset?.config.cache?.ttl
      ? preset.config.cache.ttl * 1000
      : 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: preset?.config.cache?.revalidateOnFocus ?? false,
    retry: (failureCount, error) => {
      if (
        error.message.includes('403') ||
        error.message.includes('401') ||
        error.message.includes('404')
      ) {
        return false;
      }
      return failureCount < 1;
    }
  });

  let errorMessage: string | null = null;
  if (error) {
    if (error.message.includes('404')) {
      errorMessage = `Data not found for CPT: ${preset?.cptSlug}`;
    } else if (
      error.message.includes('403') ||
      error.message.includes('401')
    ) {
      errorMessage = 'You do not have permission to access this data';
    } else {
      errorMessage = error.message;
    }
  }

  return {
    data: response?.data || [],
    loading: isLoading,
    error: errorMessage,
    total: response?.total || 0,
    refetch: async () => {
      await refetch();
    }
  };
}
