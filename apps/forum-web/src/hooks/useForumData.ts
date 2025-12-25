/**
 * Forum Data Hooks
 * =============================================================================
 * Custom hooks for forum data fetching.
 * Demonstrates proper API integration patterns.
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { forumService, Thread, Reply, Category } from '../services/api.service';

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

interface UseRepliesResult {
  replies: Reply[];
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

export function useReplies(threadId: string, params: { page?: number } = {}): UseRepliesResult {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [pagination, setPagination] = useState<UseRepliesResult['pagination']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReplies = useCallback(async () => {
    if (!threadId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await forumService.getReplies(threadId, params);

      if (response.success) {
        setReplies(response.data.replies);
        setPagination(response.data.pagination);
      } else {
        setError('Failed to fetch replies');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [threadId, params.page]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  return { replies, pagination, isLoading, error, refetch: fetchReplies };
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

interface UseCreateThreadResult {
  createThread: (data: { title: string; content: string; category?: string }) => Promise<Thread | null>;
  isLoading: boolean;
  error: string | null;
}

export function useCreateThread(): UseCreateThreadResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createThread = useCallback(async (data: { title: string; content: string; category?: string }): Promise<Thread | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await forumService.createThread(data);

      if (response.success) {
        return response.data.thread;
      } else {
        setError('Failed to create thread');
        return null;
      }
    } catch (err: unknown) {
      // Handle API error response
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: { message?: string; details?: Array<{ message: string }> } } } };
        const apiError = axiosError.response?.data?.error;
        if (apiError?.details && apiError.details.length > 0) {
          setError(apiError.details.map(d => d.message).join(', '));
        } else if (apiError?.message) {
          setError(apiError.message);
        } else {
          setError('게시글 작성에 실패했습니다.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createThread, isLoading, error };
}

interface UseCreateReplyResult {
  createReply: (threadId: string, data: { content: string }) => Promise<Reply | null>;
  isLoading: boolean;
  error: string | null;
}

export function useCreateReply(): UseCreateReplyResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReply = useCallback(async (threadId: string, data: { content: string }): Promise<Reply | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await forumService.createReply(threadId, data);

      if (response.success) {
        return response.data.reply;
      } else {
        setError('Failed to create reply');
        return null;
      }
    } catch (err: unknown) {
      // Handle API error response
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: { message?: string; details?: Array<{ message: string }> } } } };
        const apiError = axiosError.response?.data?.error;
        if (apiError?.details && apiError.details.length > 0) {
          setError(apiError.details.map(d => d.message).join(', '));
        } else if (apiError?.message) {
          setError(apiError.message);
        } else {
          setError('댓글 작성에 실패했습니다.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createReply, isLoading, error };
}
