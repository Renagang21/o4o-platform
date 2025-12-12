/**
 * RecommendationList - Display list of recommendations
 * Phase 17: AI-powered Personalized Recommendations
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useForumRecommendations, type UserContext, type DomainType } from '@/hooks/useForumRecommendations';
import { RecommendationCard } from './RecommendationCard';

interface PostData {
  id: string;
  title: string;
  excerpt?: string;
  authorName?: string;
  createdAt?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  thumbnailUrl?: string;
}

interface RecommendationListProps {
  /** List title */
  title?: string;
  /** Domain type */
  domain?: DomainType;
  /** Number of recommendations to show */
  limit?: number;
  /** User context for personalization */
  userContext?: UserContext;
  /** Post data map (postId -> PostData) */
  postsData?: Record<string, PostData>;
  /** Post click handler */
  onPostClick?: (postId: string) => void;
  /** Show related posts for a specific post */
  relatedToPostId?: string;
  /** Show trending instead of personalized */
  showTrending?: boolean;
  /** Show score breakdown (admin mode) */
  showBreakdown?: boolean;
  /** Custom empty message */
  emptyMessage?: string;
  /** Category filter */
  categoryId?: string;
}

export function RecommendationList({
  title,
  domain = 'general',
  limit = 5,
  userContext,
  postsData = {},
  onPostClick,
  relatedToPostId,
  showTrending = false,
  showBreakdown = false,
  emptyMessage = '추천 글이 없습니다.',
  categoryId,
}: RecommendationListProps) {
  const {
    recommendations,
    loading,
    error,
    fetchRecommendations,
    fetchTrending,
    fetchRelated,
    setUserContext,
  } = useForumRecommendations({ domain, autoFetch: false, userContext });

  // Update user context when prop changes
  useEffect(() => {
    if (userContext) {
      setUserContext(userContext);
    }
  }, [userContext, setUserContext]);

  // Fetch recommendations on mount
  useEffect(() => {
    const options = { limit, categoryId, includeBreakdown: showBreakdown };

    if (relatedToPostId) {
      fetchRelated(relatedToPostId, options);
    } else if (showTrending) {
      fetchTrending(options);
    } else {
      fetchRecommendations(options);
    }
  }, [
    relatedToPostId,
    showTrending,
    limit,
    categoryId,
    showBreakdown,
    fetchRecommendations,
    fetchTrending,
    fetchRelated,
  ]);

  // Generate list title
  const listTitle = useMemo(() => {
    if (title) return title;
    if (relatedToPostId) return '관련 글';
    if (showTrending) return '인기 급상승';

    switch (domain) {
      case 'cosmetics':
        return '나를 위한 뷰티 추천';
      case 'yaksa':
        return '추천 문서';
      default:
        return '추천 글';
    }
  }, [title, relatedToPostId, showTrending, domain]);

  // Get domain theme class
  const getThemeClass = (): string => {
    switch (domain) {
      case 'cosmetics':
        return 'recommendation-list--cosmetics';
      case 'yaksa':
        return 'recommendation-list--yaksa';
      default:
        return '';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`recommendation-list ${getThemeClass()}`}>
        <h2 className="recommendation-list__title">{listTitle}</h2>
        <div className="recommendation-list__loading">
          <div className="recommendation-list__spinner" />
          <span>추천 글을 불러오는 중...</span>
        </div>
        <style>{baseStyles}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`recommendation-list ${getThemeClass()}`}>
        <h2 className="recommendation-list__title">{listTitle}</h2>
        <div className="recommendation-list__error">
          추천을 불러오는데 실패했습니다.
        </div>
        <style>{baseStyles}</style>
      </div>
    );
  }

  // Empty state
  if (!recommendations.length) {
    return (
      <div className={`recommendation-list ${getThemeClass()}`}>
        <h2 className="recommendation-list__title">{listTitle}</h2>
        <div className="recommendation-list__empty">{emptyMessage}</div>
        <style>{baseStyles}</style>
      </div>
    );
  }

  return (
    <div className={`recommendation-list ${getThemeClass()}`}>
      <h2 className="recommendation-list__title">{listTitle}</h2>

      <div className="recommendation-list__items">
        {recommendations.map(recommendation => (
          <RecommendationCard
            key={recommendation.postId}
            recommendation={recommendation}
            post={postsData[recommendation.postId]}
            onClick={onPostClick}
            showBreakdown={showBreakdown}
            domain={domain}
          />
        ))}
      </div>

      <style>{baseStyles}</style>
    </div>
  );
}

const baseStyles = `
  .recommendation-list {
    padding: 24px;
    background: var(--color-background, #fff);
    border-radius: 16px;
  }

  .recommendation-list--cosmetics {
    --color-primary: #e91e8d;
    --color-primary-light: #fce4ec;
    background: linear-gradient(135deg, #fff5f8 0%, #fff 100%);
  }

  .recommendation-list--yaksa {
    --color-primary: #2e7d32;
    --color-primary-light: #e8f5e9;
    background: linear-gradient(135deg, #f1f8e9 0%, #fff 100%);
  }

  .recommendation-list__title {
    font-size: 20px;
    font-weight: 700;
    color: var(--color-text, #212529);
    margin: 0 0 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .recommendation-list__title::before {
    content: '✨';
  }

  .recommendation-list--cosmetics .recommendation-list__title::before {
    content: '💄';
  }

  .recommendation-list--yaksa .recommendation-list__title::before {
    content: '📋';
  }

  .recommendation-list__items {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .recommendation-list__loading,
  .recommendation-list__error,
  .recommendation-list__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px;
    color: var(--color-text-secondary, #6c757d);
    font-size: 14px;
  }

  .recommendation-list__spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-border, #e9ecef);
    border-top-color: var(--color-primary, #0066cc);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .recommendation-list__error {
    color: var(--color-error, #dc3545);
  }
`;

export default RecommendationList;
