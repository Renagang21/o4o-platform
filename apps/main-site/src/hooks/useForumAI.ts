/**
 * useForumAI - Hook for Forum AI Features
 * Phase 16: AI Summary & Auto-Tagging
 *
 * Provides client-side access to AI-generated content:
 * - Fetch AI metadata for posts
 * - Process posts with AI
 * - Apply suggested tags
 */

'use client';

import { useState, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ForumPostAISummary {
  shortSummary: string;
  bulletSummary: string[];
  generatedAt: string;
  model: string;
}

export interface ForumPostAITags {
  suggestedTags: string[];
  suggestedCategory?: string;
  confidence: number;
  cosmeticsTags?: {
    skinType?: string;
    concerns?: string[];
    productTypes?: string[];
  };
  yaksaTags?: {
    documentType?: string;
    isOrganizational?: boolean;
    topics?: string[];
  };
}

export interface ForumPostAIMeta {
  summary?: ForumPostAISummary;
  tags?: ForumPostAITags;
  tagsApproved?: boolean;
  tagsApprovedBy?: string;
  tagsApprovedAt?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  lastProcessedAt?: string;
}

interface UseForumAIOptions {
  postId: string;
  autoFetch?: boolean;
}

interface UseForumAIReturn {
  aiMeta: ForumPostAIMeta | null;
  loading: boolean;
  error: Error | null;
  fetchAIMeta: () => Promise<void>;
  processPost: (regenerate?: boolean) => Promise<void>;
  applyTags: (tags?: string[]) => Promise<boolean>;
  isProcessing: boolean;
}

// =============================================================================
// API Functions
// =============================================================================

const API_BASE = '/api/v1/forum/ai';

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'API request failed');
  }

  return data.data;
}

// =============================================================================
// Hook
// =============================================================================

export function useForumAI(options: UseForumAIOptions): UseForumAIReturn {
  const { postId } = options;

  const [aiMeta, setAIMeta] = useState<ForumPostAIMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch AI metadata
  const fetchAIMeta = useCallback(async (): Promise<void> => {
    if (!postId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchAPI<ForumPostAIMeta | null>(`${API_BASE}/posts/${postId}/ai`);
      setAIMeta(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error fetching AI metadata:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  // Process post with AI
  const processPost = useCallback(async (regenerate = false): Promise<void> => {
    if (!postId) return;

    setIsProcessing(true);
    setError(null);

    try {
      const data = await fetchAPI<{ summary: ForumPostAISummary; tags: ForumPostAITags }>(
        `${API_BASE}/posts/${postId}/ai/${regenerate ? 'regenerate' : 'process'}`,
        { method: 'POST', body: JSON.stringify({ regenerate }) }
      );

      // Update local state with new data
      setAIMeta(prev => ({
        ...prev,
        summary: data.summary,
        tags: data.tags,
        status: 'completed',
        lastProcessedAt: new Date().toISOString(),
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      setAIMeta(prev => prev ? { ...prev, status: 'failed', error: error.message } : null);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [postId]);

  // Apply suggested tags
  const applyTags = useCallback(async (tags?: string[]): Promise<boolean> => {
    if (!postId) return false;

    try {
      await fetchAPI(`${API_BASE}/posts/${postId}/ai/apply-tags`, {
        method: 'POST',
        body: JSON.stringify({ tags }),
      });

      // Update local state
      setAIMeta(prev => prev ? {
        ...prev,
        tagsApproved: true,
        tagsApprovedAt: new Date().toISOString(),
      } : null);

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('Error applying tags:', error);
      return false;
    }
  }, [postId]);

  return {
    aiMeta,
    loading,
    error,
    fetchAIMeta,
    processPost,
    applyTags,
    isProcessing,
  };
}

export default useForumAI;
