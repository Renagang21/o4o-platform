/**
 * usePostMeta Hook
 * Phase 4-2: Normalized Meta API 사용을 위한 React Hook
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { metaApi, MetaItemResponse, UpsertMetaDto } from '../services/metaApi';

/**
 * Fetch all metadata for a post
 */
export function usePostMetaList(postId: string | undefined) {
  return useQuery({
    queryKey: ['post-meta', postId],
    queryFn: () => {
      if (!postId) throw new Error('postId is required');
      return metaApi.list(postId);
    },
    enabled: !!postId,
    staleTime: 30000, // 30초 캐시
  });
}

/**
 * Fetch metadata by key
 */
export function usePostMeta(postId: string | undefined, key: string) {
  return useQuery({
    queryKey: ['post-meta', postId, key],
    queryFn: () => {
      if (!postId) throw new Error('postId is required');
      return metaApi.get(postId, key);
    },
    enabled: !!postId && !!key,
    staleTime: 30000,
  });
}

/**
 * Upsert metadata
 */
export function useSetPostMeta(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertMetaDto) => metaApi.set(postId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-meta', postId] });
    },
  });
}

/**
 * Delete metadata
 */
export function useDeletePostMeta(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (key: string) => metaApi.delete(postId, key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-meta', postId] });
    },
  });
}

/**
 * Increment counter metadata
 */
export function useIncrementPostMeta(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, by = 1 }: { key: string; by?: number }) =>
      metaApi.increment(postId, key, by),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-meta', postId] });
    },
  });
}

/**
 * Helper: Extract value from meta list
 */
export function getMetaValue<T = unknown>(
  items: MetaItemResponse[] | undefined,
  key: string,
  defaultValue?: T
): T | undefined {
  const item = items?.find((i) => i.meta_key === key);
  return item ? (item.meta_value as T) : defaultValue;
}
