/**
 * useForumRecommendations - Hook for Forum Recommendations
 * Phase 17: AI-powered Personalized Recommendations
 *
 * Provides client-side access to recommendation features:
 * - Personalized recommendations
 * - Domain-specific recommendations (cosmetics/yaksa)
 * - Trending posts
 * - Related posts
 */

'use client';

import { useState, useCallback, useEffect } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface RecommendationItem {
  postId: string;
  score: number;
  reason: string;
  reasonCode: string;
  scoreBreakdown?: {
    analyticsScore: number;
    aiTagScore: number;
    recencyScore: number;
    domainScore: number;
    organizationScore: number;
  };
}

export interface UserContext {
  skinType?: string;
  concerns?: string[];
  isPharmacist?: boolean;
  organizationId?: string;
  preferredTags?: string[];
  recentlyViewed?: string[];
}

export interface RecommendationOptions {
  limit?: number;
  scope?: 'personal' | 'trending' | 'recent' | 'related';
  categoryId?: string;
  excludeViewed?: boolean;
  includeBreakdown?: boolean;
}

export type DomainType = 'general' | 'cosmetics' | 'yaksa';

interface UseForumRecommendationsOptions {
  domain?: DomainType;
  autoFetch?: boolean;
  userContext?: UserContext;
}

interface UseForumRecommendationsReturn {
  recommendations: RecommendationItem[];
  loading: boolean;
  error: Error | null;
  fetchRecommendations: (options?: RecommendationOptions) => Promise<void>;
  fetchTrending: (options?: RecommendationOptions) => Promise<void>;
  fetchRelated: (postId: string, options?: RecommendationOptions) => Promise<void>;
  setUserContext: (context: UserContext) => void;
}

// =============================================================================
// API Functions
// =============================================================================

const API_BASE = '/api/v1/forum/recommendations';

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

function buildQueryString(
  userContext?: UserContext,
  options?: RecommendationOptions
): string {
  const params = new URLSearchParams();

  // Options
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.scope) params.append('scope', options.scope);
  if (options?.categoryId) params.append('categoryId', options.categoryId);
  if (options?.excludeViewed !== undefined) {
    params.append('excludeViewed', String(options.excludeViewed));
  }
  if (options?.includeBreakdown) params.append('includeBreakdown', 'true');

  // User context
  if (userContext?.skinType) params.append('skinType', userContext.skinType);
  if (userContext?.concerns?.length) {
    params.append('concerns', userContext.concerns.join(','));
  }
  if (userContext?.isPharmacist) params.append('isPharmacist', 'true');
  if (userContext?.organizationId) {
    params.append('organizationId', userContext.organizationId);
  }
  if (userContext?.preferredTags?.length) {
    params.append('preferredTags', userContext.preferredTags.join(','));
  }
  if (userContext?.recentlyViewed?.length) {
    params.append('recentlyViewed', userContext.recentlyViewed.join(','));
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

// =============================================================================
// Hook
// =============================================================================

export function useForumRecommendations(
  hookOptions: UseForumRecommendationsOptions = {}
): UseForumRecommendationsReturn {
  const { domain = 'general', autoFetch = false, userContext: initialContext } = hookOptions;

  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [userContext, setUserContext] = useState<UserContext>(initialContext || {});

  // Get endpoint based on domain
  const getEndpoint = useCallback((domain: DomainType): string => {
    switch (domain) {
      case 'cosmetics':
        return `${API_BASE}/cosmetics`;
      case 'yaksa':
        return `${API_BASE}/yaksa`;
      default:
        return API_BASE;
    }
  }, []);

  // Fetch personalized recommendations
  const fetchRecommendations = useCallback(
    async (options?: RecommendationOptions): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const endpoint = getEndpoint(domain);
        const queryString = buildQueryString(userContext, options);
        const data = await fetchAPI<{ recommendations: RecommendationItem[] }>(
          `${endpoint}${queryString}`
        );
        setRecommendations(data.recommendations);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    },
    [domain, userContext, getEndpoint]
  );

  // Fetch trending posts
  const fetchTrending = useCallback(
    async (options?: RecommendationOptions): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const queryString = buildQueryString(undefined, options);
        const data = await fetchAPI<{ recommendations: RecommendationItem[] }>(
          `${API_BASE}/trending${queryString}`
        );
        setRecommendations(data.recommendations);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error fetching trending:', error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch related posts
  const fetchRelated = useCallback(
    async (postId: string, options?: RecommendationOptions): Promise<void> => {
      if (!postId) return;

      setLoading(true);
      setError(null);

      try {
        const queryString = buildQueryString(undefined, options);
        const data = await fetchAPI<{ recommendations: RecommendationItem[] }>(
          `${API_BASE}/related/${postId}${queryString}`
        );
        setRecommendations(data.recommendations);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        console.error('Error fetching related posts:', error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchRecommendations();
    }
  }, [autoFetch, fetchRecommendations]);

  return {
    recommendations,
    loading,
    error,
    fetchRecommendations,
    fetchTrending,
    fetchRelated,
    setUserContext,
  };
}

export default useForumRecommendations;
