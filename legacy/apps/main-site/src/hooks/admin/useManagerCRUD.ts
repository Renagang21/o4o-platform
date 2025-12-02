/**
 * useManagerCRUD Hook
 * Generic CRUD operations for Admin Manager pages
 *
 * Eliminates duplicate code across 15 manager files by providing:
 * - Automatic data fetching with React Query
 * - Create/Update/Delete mutations
 * - Loading & error states
 * - Automatic refetching after mutations
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, create, update, remove } = useManagerCRUD('/cpt/types');
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';

export interface UseManagerCRUDOptions {
  /**
   * API endpoint (e.g., '/cpt/types', '/taxonomies')
   * Do NOT include /api prefix (authClient handles baseURL)
   */
  endpoint: string;

  /**
   * React Query key (defaults to endpoint)
   */
  queryKey?: string[];

  /**
   * Enable query on mount (default: true)
   */
  enabled?: boolean;

  /**
   * Success callback after create
   */
  onCreateSuccess?: (data: any) => void;

  /**
   * Success callback after update
   */
  onUpdateSuccess?: (data: any) => void;

  /**
   * Success callback after delete
   */
  onDeleteSuccess?: () => void;

  /**
   * Error callback
   */
  onError?: (error: any) => void;
}

export function useManagerCRUD<T = any>(
  endpoint: string,
  options: Omit<UseManagerCRUDOptions, 'endpoint'> = {}
) {
  const queryClient = useQueryClient();
  const {
    queryKey = [endpoint],
    enabled = true,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onError
  } = options;

  // Fetch list
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await authClient.api.get(endpoint);
      return response.data.data || response.data;
    },
    enabled,
    retry: 1,
    staleTime: 30000, // 30 seconds
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newData: Partial<T>) => {
      const response = await authClient.api.post(endpoint, newData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      onCreateSuccess?.(data);
    },
    onError: (error: any) => {
      onError?.(error);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data: updateData }: { id: string; data: Partial<T> }) => {
      const response = await authClient.api.put(`${endpoint}/${id}`, updateData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      onUpdateSuccess?.(data);
    },
    onError: (error: any) => {
      onError?.(error);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await authClient.api.delete(`${endpoint}/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      onDeleteSuccess?.();
    },
    onError: (error: any) => {
      onError?.(error);
    }
  });

  return {
    // Data
    data: data as T[] | undefined,
    items: data as T[] | undefined, // Alias
    isLoading,
    error,
    refetch,

    // Mutations
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    remove: deleteMutation.mutate,
    removeAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    // Combined loading state
    isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
