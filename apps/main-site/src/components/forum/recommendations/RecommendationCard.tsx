/**
 * RecommendationCard - Display a single recommendation
 * Phase 17: AI-powered Personalized Recommendations
 */

'use client';

import { useState } from 'react';
import type { RecommendationItem } from '@/hooks/useForumRecommendations';

interface RecommendationCardProps {
  recommendation: RecommendationItem;
  /** Post data (fetched separately) */
  post?: {
    id: string;
    title: string;
    excerpt?: string;
    authorName?: string;
    createdAt?: string;
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
    thumbnailUrl?: string;
  };
  /** Click handler */
  onClick?: (postId: string) => void;
  /** Show score breakdown (admin mode) */
  showBreakdown?: boolean;
  /** Domain theme */
  domain?: 'general' | 'cosmetics' | 'yaksa';
}

export function RecommendationCard({
  recommendation,
  post,
  onClick,
  showBreakdown = false,
  domain = 'general',
}: RecommendationCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick(recommendation.postId);
    }
  };

  const getReasonIcon = (reasonCode: string): string => {
    const icons: Record<string, string> = {
      similar_tags: '🏷️',
      similar_skin_type: '💆',
      similar_concerns: '✨',
      same_organization: '🏢',
      trending: '🔥',
      recent_popular: '📈',
      related_search: '🔍',
      similar_document_type: '📄',
      recommended_for_role: '👤',
      personalized: '⭐',
    };
    return icons[reasonCode] || '💡';
  };

  const getThemeClass = (): string => {
    switch (domain) {
      case 'cosmetics':
        return 'recommendation-card--cosmetics';
      case 'yaksa':
        return 'recommendation-card--yaksa';
      default:
        return '';
    }
  };

  const scorePercent = Math.round(recommendation.score * 100);

  return (
    <div
      className={`recommendation-card ${getThemeClass()} ${isHovered ? 'recommendation-card--hovered' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
    >
      {/* Thumbnail */}
      {post?.thumbnailUrl && (
        <div className="recommendation-card__thumbnail">
          <img src={post.thumbnailUrl} alt="" />
        </div>
      )}

      {/* Content */}
      <div className="recommendation-card__content">
        <h3 className="recommendation-card__title">
          {post?.title || `Post ${recommendation.postId.slice(0, 8)}`}
        </h3>

        {post?.excerpt && (
          <p className="recommendation-card__excerpt">{post.excerpt}</p>
        )}

        {/* Reason badge */}
        <div className="recommendation-card__reason">
          <span className="recommendation-card__reason-icon">
            {getReasonIcon(recommendation.reasonCode)}
          </span>
          <span className="recommendation-card__reason-text">
            {recommendation.reason}
          </span>
        </div>

        {/* Post meta */}
        {post && (
          <div className="recommendation-card__meta">
            {post.authorName && (
              <span className="recommendation-card__author">{post.authorName}</span>
            )}
            {post.createdAt && (
              <span className="recommendation-card__date">
                {new Date(post.createdAt).toLocaleDateString('ko-KR')}
              </span>
            )}
            <span className="recommendation-card__stats">
              👁 {post.viewCount || 0}
              {' · '}
              ❤️ {post.likeCount || 0}
              {' · '}
              💬 {post.commentCount || 0}
            </span>
          </div>
        )}

        {/* Score indicator */}
        <div className="recommendation-card__score">
          <div
            className="recommendation-card__score-bar"
            style={{ width: `${scorePercent}%` }}
          />
          <span className="recommendation-card__score-text">
            추천도 {scorePercent}%
          </span>
        </div>

        {/* Admin: Score breakdown */}
        {showBreakdown && recommendation.scoreBreakdown && (
          <div className="recommendation-card__breakdown">
            <div className="recommendation-card__breakdown-title">점수 구성</div>
            <div className="recommendation-card__breakdown-items">
              <div>분석: {Math.round(recommendation.scoreBreakdown.analyticsScore * 100)}%</div>
              <div>AI태그: {Math.round(recommendation.scoreBreakdown.aiTagScore * 100)}%</div>
              <div>최신성: {Math.round(recommendation.scoreBreakdown.recencyScore * 100)}%</div>
              <div>도메인: {Math.round(recommendation.scoreBreakdown.domainScore * 100)}%</div>
              <div>조직: {Math.round(recommendation.scoreBreakdown.organizationScore * 100)}%</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .recommendation-card {
          display: flex;
          gap: 16px;
          padding: 16px;
          background: var(--color-surface, #fff);
          border: 1px solid var(--color-border, #e9ecef);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .recommendation-card--hovered {
          border-color: var(--color-primary, #0066cc);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .recommendation-card--cosmetics {
          --color-primary: #e91e8d;
          --color-primary-light: #fce4ec;
        }

        .recommendation-card--yaksa {
          --color-primary: #2e7d32;
          --color-primary-light: #e8f5e9;
        }

        .recommendation-card__thumbnail {
          width: 120px;
          height: 90px;
          flex-shrink: 0;
          border-radius: 8px;
          overflow: hidden;
          background: var(--color-surface-alt, #f8f9fa);
        }

        .recommendation-card__thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .recommendation-card__content {
          flex: 1;
          min-width: 0;
        }

        .recommendation-card__title {
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text, #212529);
          margin: 0 0 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .recommendation-card__excerpt {
          font-size: 14px;
          color: var(--color-text-secondary, #6c757d);
          margin: 0 0 12px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .recommendation-card__reason {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: var(--color-primary-light, #e3f2fd);
          border-radius: 16px;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .recommendation-card__reason-icon {
          font-size: 14px;
        }

        .recommendation-card__reason-text {
          color: var(--color-text, #212529);
        }

        .recommendation-card__meta {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          color: var(--color-text-tertiary, #adb5bd);
          margin-bottom: 8px;
        }

        .recommendation-card__author {
          font-weight: 500;
          color: var(--color-text-secondary, #6c757d);
        }

        .recommendation-card__score {
          position: relative;
          height: 4px;
          background: var(--color-border, #e9ecef);
          border-radius: 2px;
          overflow: hidden;
        }

        .recommendation-card__score-bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary, #0066cc), #764ba2);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .recommendation-card__score-text {
          position: absolute;
          right: 0;
          top: 8px;
          font-size: 10px;
          color: var(--color-text-tertiary, #adb5bd);
        }

        .recommendation-card__breakdown {
          margin-top: 16px;
          padding: 12px;
          background: var(--color-surface-alt, #f8f9fa);
          border-radius: 8px;
          font-size: 11px;
        }

        .recommendation-card__breakdown-title {
          font-weight: 600;
          color: var(--color-text-secondary, #6c757d);
          margin-bottom: 8px;
        }

        .recommendation-card__breakdown-items {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          color: var(--color-text-tertiary, #adb5bd);
        }

        @media (max-width: 640px) {
          .recommendation-card {
            flex-direction: column;
          }

          .recommendation-card__thumbnail {
            width: 100%;
            height: 160px;
          }

          .recommendation-card__breakdown-items {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

export default RecommendationCard;
