import { useState, useEffect } from 'react';
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
 * Simple in-memory cache for presets
 */
interface PresetCacheEntry {
  data: AnyPreset;
  timestamp: number;
}

const presetCache = new Map<string, PresetCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear expired cache entries
 */
function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of presetCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      presetCache.delete(key);
    }
  }
}

/**
 * Get cache key
 */
function getCacheKey(presetId: string, type: PresetType): string {
  return `${type}:${presetId}`;
}

/**
 * Fetch preset from API
 */
async function fetchPreset(
  presetId: string,
  type: PresetType
): Promise<AnyPreset> {
  const cacheKey = getCacheKey(presetId, type);

  // Check cache first
  const cached = presetCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Clear expired entries periodically
  clearExpiredCache();

  // Fetch from API
  const endpoint = `/presets/${type}s/${presetId}`;
  const response = await authClient.api.get<PresetResponse<AnyPreset>>(endpoint);

  if (!response.data || !response.data.success || !response.data.data) {
    throw new Error(`Failed to fetch preset: ${presetId}`);
  }

  const preset = response.data.data;

  // Cache the result
  presetCache.set(cacheKey, {
    data: preset,
    timestamp: Date.now()
  });

  return preset;
}

/**
 * React Hook: usePreset
 *
 * Fetches and caches preset data from the API
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
  const [preset, setPreset] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!presetId) {
      setPreset(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPreset(presetId, type);
      setPreset(data as T);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch preset';
      setError(errorMessage);
      setPreset(null);

      // Check if it's a permission error (403/401)
      if (errorMessage.includes('403') || errorMessage.includes('401')) {
        setError('You do not have permission to access this preset');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [presetId, type]);

  return {
    preset,
    loading,
    error,
    refetch: fetchData
  };
}

/**
 * Clear all cached presets
 * Useful for manual cache invalidation
 */
export function clearPresetCache(): void {
  presetCache.clear();
}

/**
 * Clear a specific preset from cache
 */
export function clearPresetFromCache(presetId: string, type: PresetType): void {
  const cacheKey = getCacheKey(presetId, type);
  presetCache.delete(cacheKey);
}
