/**
 * CosmeticsTrendingPosts - Trending Posts Widget
 *
 * Shows posts with high engagement growth in recent time period.
 * Useful for highlighting what's "hot" in the cosmetics community.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  getCosmeticsTrendingPosts,
  type CosmeticsTrendingPost,
} from '@/lib/cms/client';
import { useForumEventTracker } from '@/lib/analytics';

interface CosmeticsTrendingPostsProps {
  limit?: number;
  period?: '24h' | '7d' | '30d';
  title?: string;
  showViewCount?: boolean;
  compact?: boolean;
}

const SKIN_TYPE_LABELS: Record<string, string> = {
  dry: '건성',
  oily: '지성',
  combination: '복합성',
  sensitive: '민감성',
  normal: '중성',
};

function TrendingBadge({ growthRate }: { growthRate: number }) {
  if (growthRate <= 0) return null;

  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        color: '#ef4444',
      }}
    >
      <span className="text-[10px]">▲</span>
      {Math.round(growthRate)}%
    </span>
  );
}

function TrendingPostCard({
  post,
  rank,
  compact,
  onTrackClick,
}: {
  post: CosmeticsTrendingPost;
  rank: number;
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
        {/* Rank */}
        <div
          className={`flex-shrink-0 flex items-center justify-center rounded-lg font-bold ${
            compact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
          }`}
          style={{
            backgroundColor:
              rank <= 3 ? 'var(--forum-primary)' : 'var(--forum-bg-tertiary)',
            color: rank <= 3 ? '#ffffff' : 'var(--forum-text-secondary)',
          }}
        >
          {rank}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
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
                  backgroundColor: 'var(--forum-bg-highlight)',
                  color: 'var(--forum-primary)',
                }}
              >
                {SKIN_TYPE_LABELS[cosmetics.skinType] || cosmetics.skinType}
              </span>
            )}
            <TrendingBadge growthRate={post.growthRate} />
          </div>

          {/* Stats */}
          <div
            className="flex items-center gap-3 mt-1 text-xs"
            style={{ color: 'var(--forum-text-muted)' }}
          >
            <span>조회 {post.viewCount}</span>
            <span>댓글 {post.commentCount}</span>
            {post.likeCount > 0 && (
              <span style={{ color: 'var(--forum-like-active)' }}>
                {post.likeCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}

export function CosmeticsTrendingPosts({
  limit = 5,
  period = '24h',
  title = '지금 뜨는 리뷰',
  showViewCount: _showViewCount = true,
  compact = false,
}: CosmeticsTrendingPostsProps) {
  const [posts, setPosts] = useState<CosmeticsTrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const tracker = useForumEventTracker();

  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      try {
        const data = await getCosmeticsTrendingPosts({ limit, period });
        setPosts(data);
      } catch (error) {
        console.error('Error loading trending posts:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, [limit, period]);

  const handlePostClick = (postId: string, position: number) => {
    tracker.trackRecommendationClick(postId, 'trending', position);
  };

  if (loading) {
    return (
      <div
        className="cosmetics-trending-posts p-4 rounded-lg border"
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

  if (posts.length === 0) {
    return null;
  }

  return (
    <div
      className="cosmetics-trending-posts p-4 rounded-lg border"
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
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: '#ef4444' }}
          ></span>
          {title}
        </h3>
        <span className="text-xs" style={{ color: 'var(--forum-text-muted)' }}>
          {period === '24h' ? '24시간' : period === '7d' ? '7일' : '30일'}
        </span>
      </div>

      {/* Posts */}
      <div className="space-y-2">
        {posts.map((post, index) => (
          <TrendingPostCard
            key={post.id}
            post={post}
            rank={index + 1}
            compact={compact}
            onTrackClick={() => handlePostClick(post.id, index)}
          />
        ))}
      </div>

      {/* More Link */}
      <div className="mt-4 text-center">
        <a
          href="/forum/cosmetics?sort=trending"
          className="text-sm hover:underline"
          style={{ color: 'var(--forum-text-link)' }}
        >
          더 보기 →
        </a>
      </div>
    </div>
  );
}

export default CosmeticsTrendingPosts;
