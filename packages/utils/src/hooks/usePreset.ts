import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type {
  FormPreset,
  ViewPreset,
  TemplatePreset,
  PresetResponse
} from '@o4o/types';

/**
 * Preset type union
 */
export type PresetType = 'form' | 'view' | 'template';
export type AnyPreset = FormPreset | ViewPreset | TemplatePreset;

/**
 * Hook return type
 */
export interface UsePresetResult<T extends AnyPreset> {
  preset: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch preset from API
 */
async function fetchPreset(
  presetId: string,
  type: PresetType
): Promise<AnyPreset> {
  const endpoint = `/presets/${type}s/${presetId}`;
  const response = await authClient.api.get<PresetResponse<AnyPreset>>(endpoint);

  if (!response.data || !response.data.success || !response.data.data) {
    throw new Error(`Failed to fetch preset: ${presetId}`);
  }

  return response.data.data;
}

/**
 * React Hook: usePreset
 *
 * Fetches and caches preset data from the API using TanStack Query
 *
 * @param presetId - The preset ID to fetch
 * @param type - The preset type ('form' | 'view' | 'template')
 * @returns { preset, loading, error, refetch }
 *
 * @example
 * ```tsx
 * const { preset, loading, error } = usePreset('view_post_latest_10_posts_list_v1', 'view');
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 * if (!preset) return null;
 *
 * // Use preset.config to render
 * return <PostList config={preset.config} />;
 * ```
 */
export function usePreset<T extends AnyPreset = AnyPreset>(
  presetId: string | undefined,
  type: PresetType
): UsePresetResult<T> {
  const {
    data: preset,
    isLoading,
    error,
    refetch
  } = useQuery<AnyPreset, Error>({
    queryKey: ['preset', type, presetId],
    queryFn: () => {
      if (!presetId) {
        throw new Error('Preset ID is required');
      }
      return fetchPreset(presetId, type);
    },
    enabled: !!presetId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
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
      errorMessage = 'You do not have permission to access this preset';
    } else {
      errorMessage = error.message;
    }
  }

  return {
    preset: (preset as T) || null,
    loading: isLoading,
    error: errorMessage,
    refetch: async () => {
      await refetch();
    }
  };
}

/**
 * Legacy cache clearing functions
 * These are now no-ops since TanStack Query handles cache internally
 * Kept for backward compatibility
 */
export function clearPresetCache(): void {
  console.warn('clearPresetCache is deprecated - use invalidateQueries from TanStack Query');
}

export function clearPresetFromCache(_presetId: string, _type: PresetType): void {
  console.warn(
    'clearPresetFromCache is deprecated - use invalidateQueries from TanStack Query'
  );
}
