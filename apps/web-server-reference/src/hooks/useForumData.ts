/**
 * Forum Data Hooks
 * =============================================================================
 * Custom hooks for forum data fetching.
 * Demonstrates proper API integration patterns.
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { forumService, Thread, Category } from '../services/api.service';

interface UseThreadsResult {
  threads: Thread[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useThreads(params: { page?: number; category?: string } = {}): UseThreadsResult {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [pagination, setPagination] = useState<UseThreadsResult['pagination']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await forumService.getThreads(params);

      if (response.success) {
        setThreads(response.data.threads);
        setPagination(response.data.pagination);
      } else {
        setError('Failed to fetch threads');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [params.page, params.category]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return { threads, pagination, isLoading, error, refetch: fetchThreads };
}

interface UseThreadResult {
  thread: Thread | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useThread(id: string): UseThreadResult {
  const [thread, setThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThread = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await forumService.getThread(id);

      if (response.success) {
        setThread(response.data.thread);
      } else {
        setError('Thread not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  return { thread, isLoading, error, refetch: fetchThread };
}

interface UseCategoriesResult {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await forumService.getCategories();

        if (response.success) {
          setCategories(response.data.categories);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories, isLoading, error };
}
