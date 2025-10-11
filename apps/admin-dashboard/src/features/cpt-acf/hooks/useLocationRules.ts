/**
 * Location Rules Hook
 * Hook for managing location rules and fetching available values
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { acfLocationApi } from '../services/acf.api';
import type { LocationParam } from '../types/acf.types';

interface LocationValue {
  value: string;
  label: string;
}

interface UseLocationRulesReturn {
  getAvailableValues: (param: string) => LocationValue[];
  isLoading: boolean;
  error: string | null;
  refetchValues: (param: string) => Promise<void>;
}

/**
 * Hook for managing location rules
 * Fetches and caches available values for different location parameters
 */
export function useLocationRules(): UseLocationRulesReturn {
  const [valuesCache, setValuesCache] = useState<Map<string, LocationValue[]>>(new Map());
  const [loadingParams, setLoadingParams] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Fetch values for a specific parameter
  const fetchValues = useCallback(async (param: string) => {
    // If already cached, skip
    if (valuesCache.has(param)) {
      return;
    }

    // If already loading, skip
    if (loadingParams.has(param)) {
      return;
    }

    setLoadingParams(prev => new Set(prev).add(param));
    setError(null);

    try {
      let result;

      // Route to appropriate API based on param
      switch (param) {
        case 'user_role':
        case 'current_user_role':
          result = await acfLocationApi.getUserRoles();
          break;

        case 'post_type':
          result = await acfLocationApi.getPostTypes();
          break;

        case 'post_taxonomy':
          result = await acfLocationApi.getTaxonomies();
          break;

        case 'post_category':
          result = await acfLocationApi.getCategories();
          break;

        case 'page_template':
          result = await acfLocationApi.getPageTemplates();
          break;

        case 'post_template':
          result = await acfLocationApi.getPostTemplates();
          break;

        case 'post_status':
          // Static values for post status
          result = {
            success: true,
            data: [
              { value: 'publish', label: 'Published' },
              { value: 'draft', label: 'Draft' },
              { value: 'pending', label: 'Pending Review' },
              { value: 'private', label: 'Private' },
              { value: 'trash', label: 'Trash' },
            ]
          };
          break;

        case 'post_format':
          // Static values for post format
          result = {
            success: true,
            data: [
              { value: 'standard', label: 'Standard' },
              { value: 'aside', label: 'Aside' },
              { value: 'gallery', label: 'Gallery' },
              { value: 'link', label: 'Link' },
              { value: 'image', label: 'Image' },
              { value: 'quote', label: 'Quote' },
              { value: 'status', label: 'Status' },
              { value: 'video', label: 'Video' },
              { value: 'audio', label: 'Audio' },
              { value: 'chat', label: 'Chat' },
            ]
          };
          break;

        case 'page_type':
          // Static values for page type
          result = {
            success: true,
            data: [
              { value: 'front_page', label: 'Front Page' },
              { value: 'posts_page', label: 'Posts Page' },
              { value: 'top_level', label: 'Top Level Page (no parent)' },
              { value: 'parent', label: 'Parent Page (has children)' },
              { value: 'child', label: 'Child Page (has parent)' },
            ]
          };
          break;

        default:
          // Generic location values
          result = await acfLocationApi.getLocationValues(param);
          break;
      }

      if (result.success && result.data) {
        setValuesCache(prev => new Map(prev).set(param, result.data || []));
      } else {
        throw new Error(result.error || 'Failed to fetch location values');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error(`Error fetching location values for ${param}:`, err);

      // Set empty array on error to prevent infinite retries
      setValuesCache(prev => new Map(prev).set(param, []));
    } finally {
      setLoadingParams(prev => {
        const next = new Set(prev);
        next.delete(param);
        return next;
      });
    }
  }, [valuesCache, loadingParams]);

  // Get available values for a parameter (returns cached or fetches)
  const getAvailableValues = useCallback((param: string): LocationValue[] => {
    // Trigger fetch if not cached and not loading
    if (!valuesCache.has(param) && !loadingParams.has(param)) {
      fetchValues(param);
    }

    return valuesCache.get(param) || [];
  }, [valuesCache, loadingParams, fetchValues]);

  // Force refetch values for a parameter
  const refetchValues = useCallback(async (param: string) => {
    // Remove from cache
    setValuesCache(prev => {
      const next = new Map(prev);
      next.delete(param);
      return next;
    });

    // Fetch again
    await fetchValues(param);
  }, [fetchValues]);

  const isLoading = loadingParams.size > 0;

  return {
    getAvailableValues,
    isLoading,
    error,
    refetchValues,
  };
}

/**
 * Hook for getting location parameter options
 */
export function useLocationParams() {
  const locationParams = useMemo(() => [
    { value: 'post_type', label: 'Post Type' },
    { value: 'user_role', label: 'User Role' },
    { value: 'post_taxonomy', label: 'Post Taxonomy' },
    { value: 'post_category', label: 'Post Category' },
    { value: 'page_template', label: 'Page Template' },
    { value: 'post_template', label: 'Post Template' },
    { value: 'post_status', label: 'Post Status' },
    { value: 'post_format', label: 'Post Format' },
    { value: 'page_type', label: 'Page Type' },
    { value: 'page_parent', label: 'Page Parent' },
    { value: 'current_user', label: 'Current User' },
    { value: 'current_user_role', label: 'Current User Role' },
    { value: 'user_form', label: 'User Form' },
  ], []);

  return locationParams;
}

export default useLocationRules;
