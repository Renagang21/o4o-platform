/**
 * Custom hook for CPT (Custom Post Type) operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { cptApi, cptPostApi } from '../services/cpt.api';
import {
  CustomPostType,
  CustomPost,
  CreateCPTDto,
  UpdateCPTDto,
  CreatePostDto,
  UpdatePostDto,
  CPTListOptions,
  PostStatus
} from '../types/cpt.types';

// Query keys
const CPT_KEYS = {
  all: ['cpt'] as const,
  types: () => [...CPT_KEYS.all, 'types'] as const,
  type: (slug: string) => [...CPT_KEYS.types(), slug] as const,
  posts: (slug: string) => [...CPT_KEYS.all, 'posts', slug] as const,
  post: (slug: string, postId: string) => [...CPT_KEYS.posts(slug), postId] as const,
};

/**
 * Hook for fetching all CPT types
 */
export function useCPTTypes(active?: boolean) {
  return useQuery({
    queryKey: [...CPT_KEYS.types(), { active }],
    queryFn: () => cptApi.getAllTypes(active),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data || [],
  });
}

/**
 * Hook for fetching a single CPT type
 */
export function useCPTType(slug: string) {
  return useQuery({
    queryKey: CPT_KEYS.type(slug),
    queryFn: () => cptApi.getTypeBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data,
  });
}

/**
 * Hook for creating a CPT type
 */
export function useCreateCPTType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCPTDto) => cptApi.createType(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: CPT_KEYS.types() });
      toast.success('CPT type created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create CPT type');
    },
  });
}

/**
 * Hook for updating a CPT type
 */
export function useUpdateCPTType(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCPTDto) => cptApi.updateType(slug, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: CPT_KEYS.type(slug) });
      queryClient.invalidateQueries({ queryKey: CPT_KEYS.types() });
      toast.success('CPT type updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update CPT type');
    },
  });
}

/**
 * Hook for deleting a CPT type
 */
export function useDeleteCPTType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (slug: string) => cptApi.deleteType(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CPT_KEYS.types() });
      toast.success('CPT type deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete CPT type');
    },
  });
}

/**
 * Hook for fetching posts by CPT type
 */
export function useCPTPosts(slug: string, options?: CPTListOptions) {
  return useQuery({
    queryKey: [...CPT_KEYS.posts(slug), options],
    queryFn: () => cptPostApi.getPostsByType(slug, options),
    enabled: !!slug,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => ({
      posts: data.data || [],
      pagination: data.pagination,
    }),
  });
}

/**
 * Hook for fetching a single post
 */
export function useCPTPost(slug: string, postId: string) {
  return useQuery({
    queryKey: CPT_KEYS.post(slug, postId),
    queryFn: () => cptPostApi.getPost(slug, postId),
    enabled: !!slug && !!postId,
    staleTime: 2 * 60 * 1000,
    select: (data) => data.data,
  });
}

/**
 * Hook for creating a post
 */
export function useCreateCPTPost(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePostDto) => cptPostApi.createPost(slug, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: CPT_KEYS.posts(slug) });
      toast.success('Post created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create post');
    },
  });
}

/**
 * Hook for updating a post
 */
export function useUpdateCPTPost(slug: string, postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePostDto) => cptPostApi.updatePost(slug, postId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: CPT_KEYS.post(slug, postId) });
      queryClient.invalidateQueries({ queryKey: CPT_KEYS.posts(slug) });
      toast.success('Post updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update post');
    },
  });
}

/**
 * Hook for deleting a post
 */
export function useDeleteCPTPost(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => cptPostApi.deletePost(slug, postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CPT_KEYS.posts(slug) });
      toast.success('Post deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete post');
    },
  });
}

/**
 * Hook for bulk actions on posts
 */
export function useBulkActionCPTPosts(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      action,
      postIds,
    }: {
      action: 'trash' | 'restore' | 'delete' | 'publish' | 'draft';
      postIds: string[];
    }) => cptPostApi.bulkAction(slug, action, postIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CPT_KEYS.posts(slug) });
      toast.success('Bulk action completed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to perform bulk action');
    },
  });
}

/**
 * Hook for initializing default CPT types
 */
export function useInitializeCPTDefaults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cptApi.initializeDefaults(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CPT_KEYS.types() });
      toast.success('Default CPT types initialized');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to initialize defaults');
    },
  });
}