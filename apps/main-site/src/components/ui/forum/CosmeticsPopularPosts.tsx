/**
 * CosmeticsPopularPosts - Popular Posts Widget
 *
 * Shows posts with highest overall engagement.
 * Useful for highlighting community favorites.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  getCosmeticsPopularPosts,
  type CosmeticsPopularPost,
} from '@/lib/cms/client';
import { useForumEventTracker } from '@/lib/analytics';

interface CosmeticsPopularPostsProps {
  limit?: number;
  categorySlug?: string;
  title?: string;
  compact?: boolean;
  variant?: 'list' | 'grid';
}

const SKIN_TYPE_LABELS: Record<string, string> = {
  dry: '건성',
  oily: '지성',
  combination: '복합성',
  sensitive: '민감성',
  normal: '중성',
};

function PopularPostCard({
  post,
  rank,
  compact,
  onTrackClick,
}: {
  post: CosmeticsPopularPost;
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
        {/* Rank Badge */}
        {rank <= 3 && (
          <div
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
            style={{
              backgroundColor:
                rank === 1
                  ? '#fbbf24'
                  : rank === 2
                    ? '#94a3b8'
                    : '#cd7f32',
              color: '#ffffff',
            }}
          >
            {rank}
          </div>
        )}

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

function PopularPostGridCard({
  post,
  rank,
  onTrackClick,
}: {
  post: CosmeticsPopularPost;
  rank: number;
  onTrackClick: () => void;
}) {
  const cosmetics = post.cosmeticsMetadata || {};

  return (
    <a
      href={`/forum/post/${post.slug}`}
      onClick={onTrackClick}
      className="block rounded-lg border transition-all hover:shadow-md p-4 h-full"
      style={{
        backgroundColor: 'var(--forum-bg-primary)',
        borderColor: 'var(--forum-border-light)',
      }}
    >
      {/* Rank Badge */}
      {rank <= 3 && (
        <div
          className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold mb-3"
          style={{
            backgroundColor:
              rank === 1
                ? '#fbbf24'
                : rank === 2
                  ? '#94a3b8'
                  : '#cd7f32',
            color: '#ffffff',
          }}
        >
          {rank}
        </div>
      )}

      {/* Title */}
      <h4
        className="font-medium line-clamp-2 mb-2"
        style={{ color: 'var(--forum-text-primary)' }}
      >
        {post.title}
      </h4>

      {/* Excerpt */}
      {post.excerpt && (
        <p
          className="text-sm line-clamp-2 mb-3"
          style={{ color: 'var(--forum-text-secondary)' }}
        >
          {post.excerpt}
        </p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
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
      </div>

      {/* Stats */}
      <div
        className="flex items-center gap-3 mt-2 text-xs"
        style={{ color: 'var(--forum-text-muted)' }}
      >
        <span>조회 {post.viewCount}</span>
        {post.likeCount > 0 && (
          <span style={{ color: 'var(--forum-like-active)' }}>
            {post.likeCount}
          </span>
        )}
      </div>
    </a>
  );
}

export function CosmeticsPopularPosts({
  limit = 5,
  categorySlug,
  title = '인기 리뷰',
  compact = false,
  variant = 'list',
}: CosmeticsPopularPostsProps) {
  const [posts, setPosts] = useState<CosmeticsPopularPost[]>([]);
  const [loading, setLoading] = useState(true);
  const tracker = useForumEventTracker();

  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      try {
        const data = await getCosmeticsPopularPosts({ limit, categorySlug });
        setPosts(data);
      } catch (error) {
        console.error('Error loading popular posts:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, [limit, categorySlug]);

  const handlePostClick = (postId: string, position: number) => {
    tracker.trackRecommendationClick(postId, 'popular', position);
  };

  if (loading) {
    return (
      <div
        className="cosmetics-popular-posts p-4 rounded-lg border"
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
        <div className={variant === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
            >
              {variant === 'grid' ? (
                <div className="rounded-lg p-4 bg-gray-100">
                  <div className="w-8 h-8 bg-gray-200 rounded-full mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              )}
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
      className="cosmetics-popular-posts p-4 rounded-lg border"
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
          <span style={{ color: '#fbbf24' }}>★</span>
          {title}
        </h3>
      </div>

      {/* Posts */}
      {variant === 'grid' ? (
        <div className="grid grid-cols-2 gap-3">
          {posts.map((post, index) => (
            <PopularPostGridCard
              key={post.id}
              post={post}
              rank={index + 1}
              onTrackClick={() => handlePostClick(post.id, index)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post, index) => (
            <PopularPostCard
              key={post.id}
              post={post}
              rank={index + 1}
              compact={compact}
              onTrackClick={() => handlePostClick(post.id, index)}
            />
          ))}
        </div>
      )}

      {/* More Link */}
      <div className="mt-4 text-center">
        <a
          href="/forum/cosmetics?sort=popular"
          className="text-sm hover:underline"
          style={{ color: 'var(--forum-text-link)' }}
        >
          더 보기 →
        </a>
      </div>
    </div>
  );
}

export default CosmeticsPopularPosts;
