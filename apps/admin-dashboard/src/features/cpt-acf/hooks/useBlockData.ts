/**
 * Custom hook for block editor data operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { blockDataApi, blockPreviewApi } from '../services/block-data.api';
import {
  BlockData,
  BlockDataRequest,
  DynamicContentRequest,
  UseBlockDataOptions
} from '../types/block-data.types';

// Query keys
const BLOCK_KEYS = {
  all: ['block-data'] as const,
  post: (postId: string) => [...BLOCK_KEYS.all, 'post', postId] as const,
  featured: (postId: string) => [...BLOCK_KEYS.post(postId), 'featured'] as const,
  acf: (postId: string) => [...BLOCK_KEYS.post(postId), 'acf'] as const,
  acfField: (postId: string, fieldName: string) =>
    [...BLOCK_KEYS.acf(postId), fieldName] as const,
  dynamic: (options?: DynamicContentRequest) =>
    [...BLOCK_KEYS.all, 'dynamic', options] as const,
  template: (templateName: string) =>
    [...BLOCK_KEYS.all, 'template', templateName] as const,
  preview: (postId: string, revisionId?: string) =>
    [...BLOCK_KEYS.all, 'preview', postId, revisionId] as const,
  search: (query: string, options?: any) =>
    [...BLOCK_KEYS.all, 'search', query, options] as const,
};

/**
 * Hook for fetching block data for a post/page
 */
export function useBlockData(
  postId: string,
  options?: Partial<BlockDataRequest> & UseBlockDataOptions
) {
  const {
    enabled = true,
    onSuccess,
    onError,
    staleTime = 5 * 60 * 1000,
    cacheTime = 10 * 60 * 1000,
    refetchOnMount = false,
    refetchOnWindowFocus = false,
    ...requestOptions
  } = options || {};

  return useQuery({
    queryKey: [...BLOCK_KEYS.post(postId), requestOptions],
    queryFn: () => blockDataApi.getBlockData(postId, requestOptions),
    enabled: !!postId && enabled,
    staleTime,
    gcTime: cacheTime,
    refetchOnMount,
    refetchOnWindowFocus,
    select: (response) => response.data,
  });
}

/**
 * Hook for fetching featured image
 */
export function useFeaturedImage(postId: string, enabled = true) {
  return useQuery({
    queryKey: BLOCK_KEYS.featured(postId),
    queryFn: () => blockDataApi.getFeaturedImage(postId),
    enabled: !!postId && enabled,
    staleTime: 5 * 60 * 1000,
    select: (response) => response.data,
  });
}

/**
 * Hook for fetching ACF field value
 */
export function useACFFieldValue(
  postId: string,
  fieldName: string,
  enabled = true
) {
  return useQuery({
    queryKey: BLOCK_KEYS.acfField(postId, fieldName),
    queryFn: () => blockDataApi.getACFField(postId, fieldName),
    enabled: !!postId && !!fieldName && enabled,
    staleTime: 5 * 60 * 1000,
    select: (response) => response.data,
  });
}

/**
 * Hook for fetching all ACF fields for a post
 */
export function useAllACFFields(postId: string, enabled = true) {
  return useQuery({
    queryKey: BLOCK_KEYS.acf(postId),
    queryFn: () => blockDataApi.getAllACFFields(postId),
    enabled: !!postId && enabled,
    staleTime: 5 * 60 * 1000,
    select: (response) => response.data,
  });
}

/**
 * Hook for fetching dynamic content
 */
export function useDynamicContent(options?: DynamicContentRequest) {
  return useQuery({
    queryKey: BLOCK_KEYS.dynamic(options),
    queryFn: () => blockDataApi.getDynamicContent(options),
    staleTime: 2 * 60 * 1000, // 2 minutes - dynamic content changes more often
    select: (response) => response.data,
  });
}

/**
 * Hook for batch fetching multiple posts
 */
export function useBatchBlockData(
  postIds: string[],
  options?: Partial<BlockDataRequest>
) {
  return useQuery({
    queryKey: [...BLOCK_KEYS.all, 'batch', postIds, options],
    queryFn: () => blockDataApi.getBatchBlockData(postIds, options),
    enabled: postIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for prefetching block data
 */
export function usePrefetchBlockData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      postId,
      options,
    }: {
      postId: string;
      options?: Partial<BlockDataRequest>;
    }) => blockDataApi.prefetchBlockData(postId, options),
    onSuccess: (_, variables) => {
      // Update cache with prefetched data
      queryClient.invalidateQueries({
        queryKey: BLOCK_KEYS.post(variables.postId),
      });
    },
  });
}

/**
 * Hook for clearing cache
 */
export function useClearBlockCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => blockDataApi.clearCache(postId),
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({
        queryKey: BLOCK_KEYS.post(postId),
      });
      toast.success('Cache cleared successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to clear cache');
    },
  });
}

/**
 * Hook for fetching template data
 */
export function useTemplateData(templateName: string, enabled = true) {
  return useQuery({
    queryKey: BLOCK_KEYS.template(templateName),
    queryFn: () => blockDataApi.getTemplateData(templateName),
    enabled: !!templateName && enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes - templates don't change often
    select: (response) => response.data,
  });
}

/**
 * Hook for searching posts with block data
 */
export function useSearchWithBlockData(
  query: string,
  options?: {
    postType?: string;
    limit?: number;
    includeACF?: boolean;
  },
  enabled = true
) {
  return useQuery({
    queryKey: BLOCK_KEYS.search(query, options),
    queryFn: () => blockDataApi.searchWithBlockData(query, options),
    enabled: !!query && enabled,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook for fetching preview data
 */
export function usePreviewData(
  postId: string,
  revisionId?: string,
  enabled = true
) {
  return useQuery({
    queryKey: BLOCK_KEYS.preview(postId, revisionId),
    queryFn: () => blockPreviewApi.getPreviewData(postId, revisionId),
    enabled: !!postId && enabled,
    staleTime: 0, // Preview data should always be fresh
    gcTime: 60 * 1000, // Keep in cache for 1 minute only
    select: (response) => response.data,
  });
}

/**
 * Hook for saving preview data
 */
export function useSavePreviewData(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<BlockData>) =>
      blockPreviewApi.savePreviewData(postId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: BLOCK_KEYS.preview(postId),
      });
      toast.success('Preview saved');
      return response.revisionId;
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save preview');
    },
  });
}

/**
 * Hook for getting preview URL
 */
export function usePreviewUrl(postId: string, revisionId?: string) {
  return useQuery({
    queryKey: [...BLOCK_KEYS.preview(postId, revisionId), 'url'],
    queryFn: () => blockPreviewApi.getPreviewUrl(postId, revisionId),
    enabled: !!postId,
    staleTime: 5 * 60 * 1000,
    select: (response) => response.url,
  });
}

/**
 * Combined hook for block editor with all features
 */
export function useBlockEditor(postId: string, options?: UseBlockDataOptions) {
  const blockData = useBlockData(postId, options);
  const featuredImage = useFeaturedImage(postId, options?.enabled);
  const acfFields = useAllACFFields(postId, options?.enabled);
  const clearCache = useClearBlockCache();
  const prefetch = usePrefetchBlockData();

  return {
    blockData: blockData.data,
    featuredImage: featuredImage.data,
    acfFields: acfFields.data,
    isLoading: blockData.isLoading || featuredImage.isLoading || acfFields.isLoading,
    error: blockData.error || featuredImage.error || acfFields.error,
    refetch: () => {
      blockData.refetch();
      featuredImage.refetch();
      acfFields.refetch();
    },
    clearCache: () => clearCache.mutate(postId),
    prefetch: (options?: Partial<BlockDataRequest>) =>
      prefetch.mutate({ postId, options }),
  };
}