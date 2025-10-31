import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type {
  FormPreset,
  ViewPreset,
  TemplatePreset,
  PresetListResponse,
  PresetQueryOptions
} from '@o4o/types';
import type { PresetType, AnyPreset } from './usePreset.js';

/**
 * Hook return type for list queries
 */
export interface UsePresetsResult<T extends AnyPreset> {
  presets: T[];
  loading: boolean;
  error: string | null;
  total: number;
  refetch: () => Promise<void>;
}

/**
 * Fetch presets list from API
 */
async function fetchPresets(
  type: PresetType,
  options?: PresetQueryOptions
): Promise<PresetListResponse<AnyPreset>> {
  const endpoint = `/presets/${type}s`;

  // Build query params
  const params = new URLSearchParams();
  if (options?.cptSlug) params.append('cptSlug', options.cptSlug);
  if (options?.isActive !== undefined) params.append('isActive', String(options.isActive));
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.orderBy) params.append('orderBy', options.orderBy);
  if (options?.order) params.append('order', options.order);

  const queryString = params.toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  const response = await authClient.api.get<PresetListResponse<AnyPreset>>(url);

  if (!response.data || !response.data.success) {
    throw new Error(`Failed to fetch ${type} presets`);
  }

  return response.data;
}

/**
 * React Hook: usePresets
 *
 * Fetches a list of presets from the API using TanStack Query
 *
 * @param type - The preset type ('form' | 'view' | 'template')
 * @param options - Query options (filtering, pagination, sorting)
 * @returns { presets, loading, error, total, refetch }
 *
 * @example
 * ```tsx
 * const { presets, loading, error } = usePresets('view', {
 *   cptSlug: 'post',
 *   isActive: true
 * });
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 *
 * return (
 *   <select>
 *     {presets.map(preset => (
 *       <option key={preset.id} value={preset.id}>
 *         {preset.name}
 *       </option>
 *     ))}
 *   </select>
 * );
 * ```
 */
export function usePresets<T extends AnyPreset = AnyPreset>(
  type: PresetType,
  options?: PresetQueryOptions
): UsePresetsResult<T> {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<PresetListResponse<AnyPreset>, Error>({
    queryKey: ['presets', type, options],
    queryFn: () => fetchPresets(type, options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 403/401 errors
      if (
        error.message.includes('403') ||
        error.message.includes('401') ||
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
    if (
      error.message.includes('403') ||
      error.message.includes('401') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('Forbidden')
    ) {
      errorMessage = 'You do not have permission to access presets';
    } else {
      errorMessage = error.message;
    }
  }

  return {
    presets: (data?.data as T[]) || [],
    loading: isLoading,
    error: errorMessage,
    total: data?.total || 0,
    refetch: async () => {
      await refetch();
    }
  };
}

/**
 * Convenience hooks for specific preset types
 */
export function useFormPresets(options?: PresetQueryOptions): UsePresetsResult<FormPreset> {
  return usePresets<FormPreset>('form', options);
}

export function useViewPresets(options?: PresetQueryOptions): UsePresetsResult<ViewPreset> {
  return usePresets<ViewPreset>('view', options);
}

export function useTemplatePresets(options?: PresetQueryOptions): UsePresetsResult<TemplatePreset> {
  return usePresets<TemplatePreset>('template', options);
}
