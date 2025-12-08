/**
 * CosmeticsPersonalizedFeed - Personalized Recommendations Widget
 *
 * Shows personalized post recommendations based on user preferences
 * (skin type, concerns, favorite brands, browsing history).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getCosmeticsPersonalizedPosts,
  type CosmeticsPersonalizedPost,
  type UserPreferences,
} from '@/lib/cms/client';
import { useForumEventTracker } from '@/lib/analytics';

interface CosmeticsPersonalizedFeedProps {
  limit?: number;
  title?: string;
  showMatchReason?: boolean;
  compact?: boolean;
}

const SKIN_TYPE_LABELS: Record<string, string> = {
  dry: '건성',
  oily: '지성',
  combination: '복합성',
  sensitive: '민감성',
  normal: '중성',
};

const MATCH_REASON_LABELS: Record<string, string> = {
  skinType: '피부타입 맞춤',
  concerns: '관심사 기반',
  brand: '선호 브랜드',
  history: '열람 이력',
  popular: '인기 추천',
};

const MATCH_REASON_ICONS: Record<string, string> = {
  skinType: '🎯',
  concerns: '💡',
  brand: '❤️',
  history: '📖',
  popular: '⭐',
};

function PersonalizedPostCard({
  post,
  showMatchReason,
  compact,
  onTrackClick,
}: {
  post: CosmeticsPersonalizedPost;
  showMatchReason: boolean;
  compact: boolean;
  onTrackClick: () => void;
}) {
  const cosmetics = post.cosmeticsMetadata || {};

  return (
    <a
      href={`/forum/post/${post.slug}`}
      onClick={onTrackClick}
      className={`block rounded-lg border transition-all hover:shadow-md ${
        compact ? 'p-2' : 'p-3'
      }`}
      style={{
        backgroundColor: 'var(--forum-bg-primary)',
        borderColor: 'var(--forum-border-light)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Match Reason Icon */}
        {showMatchReason && post.matchReason && (
          <div
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-lg"
            style={{ backgroundColor: 'var(--forum-bg-highlight)' }}
            title={MATCH_REASON_LABELS[post.matchReason]}
          >
            {MATCH_REASON_ICONS[post.matchReason] || '📌'}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Match Reason Label */}
          {showMatchReason && post.matchReason && (
            <span
              className="inline-block text-xs px-1.5 py-0.5 rounded mb-1"
              style={{
                backgroundColor: 'var(--forum-bg-highlight)',
                color: 'var(--forum-primary)',
              }}
            >
              {MATCH_REASON_LABELS[post.matchReason]}
            </span>
          )}

          {/* Title */}
          <h4
            className={`font-medium line-clamp-2 ${compact ? 'text-sm' : ''}`}
            style={{ color: 'var(--forum-text-primary)' }}
          >
            {post.title}
          </h4>

          {/* Meta */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {cosmetics.skinType && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: 'var(--forum-bg-tertiary)',
                  color: 'var(--forum-text-secondary)',
                }}
              >
                {SKIN_TYPE_LABELS[cosmetics.skinType] || cosmetics.skinType}
              </span>
            )}
            {cosmetics.brand && (
              <span
                className="text-xs"
                style={{ color: 'var(--forum-text-muted)' }}
              >
                {cosmetics.brand}
              </span>
            )}
          </div>

          {/* Stats */}
          <div
            className="flex items-center gap-3 mt-1 text-xs"
            style={{ color: 'var(--forum-text-muted)' }}
          >
            <span>조회 {post.viewCount}</span>
            {post.likeCount > 0 && (
              <span style={{ color: 'var(--forum-like-active)' }}>
                ♥ {post.likeCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

function PreferencesSetupPrompt({
  onSetup,
}: {
  onSetup: () => void;
}) {
  return (
    <div
      className="p-4 rounded-lg border text-center"
      style={{
        backgroundColor: 'var(--forum-bg-highlight)',
        borderColor: 'var(--forum-border-light)',
      }}
    >
      <div className="text-2xl mb-2">🎯</div>
      <h4
        className="font-medium mb-1"
        style={{ color: 'var(--forum-text-primary)' }}
      >
        맞춤 추천을 받아보세요
      </h4>
      <p
        className="text-sm mb-3"
        style={{ color: 'var(--forum-text-secondary)' }}
      >
        피부타입과 관심사를 설정하면
        <br />
        나에게 맞는 리뷰를 추천해드려요
      </p>
      <button
        onClick={onSetup}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          backgroundColor: 'var(--forum-primary)',
          color: '#ffffff',
        }}
      >
        설정하기
      </button>
    </div>
  );
}

export function CosmeticsPersonalizedFeed({
  limit = 5,
  title = '나를 위한 추천',
  showMatchReason = true,
  compact = false,
}: CosmeticsPersonalizedFeedProps) {
  const [posts, setPosts] = useState<CosmeticsPersonalizedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPreferences, setHasPreferences] = useState(true);
  const tracker = useForumEventTracker();

  // Get user preferences from localStorage or context
  const getUserPreferences = useCallback((): UserPreferences | null => {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem('cosmetics_preferences');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }, []);

  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      try {
        const preferences = getUserPreferences();

        if (!preferences) {
          // No preferences set - show setup prompt or popular posts
          setHasPreferences(false);
          // Fall back to popular posts (empty preferences = general popular)
          const data = await getCosmeticsPersonalizedPosts({}, { limit });
          setPosts(data);
        } else {
          setHasPreferences(true);
          const data = await getCosmeticsPersonalizedPosts(preferences, { limit });
          setPosts(data);
        }
      } catch (error) {
        console.error('Error loading personalized posts:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, [limit, getUserPreferences]);

  const handlePostClick = (postId: string, position: number) => {
    tracker.trackRecommendationClick(postId, 'personalized', position);
  };

  const handleSetupPreferences = () => {
    // Navigate to preferences page or open modal
    if (typeof window !== 'undefined') {
      window.location.href = '/forum/cosmetics/preferences';
    }
  };

  if (loading) {
    return (
      <div
        className="cosmetics-personalized-feed p-4 rounded-lg border"
        style={{
          backgroundColor: 'var(--forum-bg-primary)',
          borderColor: 'var(--forum-border-light)',
        }}
      >
        <h3
          className="font-semibold mb-4"
          style={{ color: 'var(--forum-text-primary)' }}
        >
          {title}
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse flex gap-3"
            >
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="cosmetics-personalized-feed p-4 rounded-lg border"
      style={{
        backgroundColor: 'var(--forum-bg-primary)',
        borderColor: 'var(--forum-border-light)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="font-semibold flex items-center gap-2"
          style={{ color: 'var(--forum-text-primary)' }}
        >
          <span>🎯</span>
          {title}
        </h3>
        {hasPreferences && (
          <button
            onClick={handleSetupPreferences}
            className="text-xs hover:underline"
            style={{ color: 'var(--forum-text-link)' }}
          >
            설정 변경
          </button>
        )}
      </div>

      {/* Setup Prompt for new users */}
      {!hasPreferences && posts.length === 0 && (
        <PreferencesSetupPrompt onSetup={handleSetupPreferences} />
      )}

      {/* Posts */}
      {posts.length > 0 && (
        <div className="space-y-2">
          {posts.map((post, index) => (
            <PersonalizedPostCard
              key={post.id}
              post={post}
              showMatchReason={showMatchReason}
              compact={compact}
              onTrackClick={() => handlePostClick(post.id, index)}
            />
          ))}
        </div>
      )}

      {/* Fallback message */}
      {!hasPreferences && posts.length > 0 && (
        <div
          className="mt-3 p-2 rounded text-center text-xs"
          style={{
            backgroundColor: 'var(--forum-bg-highlight)',
            color: 'var(--forum-text-secondary)',
          }}
        >
          💡 피부타입을 설정하면 더 정확한 추천을 받을 수 있어요
        </div>
      )}

      {/* More Link */}
      <div className="mt-4 text-center">
        <a
          href="/forum/cosmetics?sort=recommended"
          className="text-sm hover:underline"
          style={{ color: 'var(--forum-text-link)' }}
        >
          더 보기 →
        </a>
      </div>
    </div>
  );
}

export default CosmeticsPersonalizedFeed;
