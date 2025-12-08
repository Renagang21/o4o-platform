/**
 * ForumHomeView - Forum Homepage Component
 *
 * Displays forum statistics, categories, pinned posts, and recent posts.
 * Uses CSS variables for theming (cosmetics theme support).
 */

'use client';

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getForumStats,
  getForumCategories,
  getForumPosts,
  type ForumStats,
  type ForumCategory,
  type ForumPost,
} from '@/lib/cms/client';
import { formatRelativeTime } from './utils';

interface ForumHomeViewProps {
  showStats?: boolean;
  showCategories?: boolean;
  showPinnedPosts?: boolean;
  showRecentPosts?: boolean;
  recentPostsLimit?: number;
  categoryColumns?: number;
}

export function ForumHomeView({
  showStats = true,
  showCategories = true,
  showPinnedPosts = true,
  showRecentPosts = true,
  recentPostsLimit = 10,
  categoryColumns = 3,
}: ForumHomeViewProps) {
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<ForumPost[]>([]);
  const [recentPosts, setRecentPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, categoriesData, pinnedData, recentData] = await Promise.all([
          showStats ? getForumStats() : Promise.resolve(null),
          showCategories ? getForumCategories() : Promise.resolve([]),
          showPinnedPosts ? getForumPosts({ isPinned: true, limit: 5 }) : Promise.resolve({ posts: [] }),
          showRecentPosts ? getForumPosts({ sortBy: 'newest', limit: recentPostsLimit }) : Promise.resolve({ posts: [] }),
        ]);

        setStats(statsData);
        setCategories(categoriesData);
        setPinnedPosts(pinnedData.posts);
        setRecentPosts(recentData.posts);
      } catch (error) {
        console.error('Error loading forum home data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [showStats, showCategories, showPinnedPosts, showRecentPosts, recentPostsLimit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--forum-primary)]"></div>
      </div>
    );
  }

  const columnClass =
    categoryColumns === 2
      ? 'md:grid-cols-2'
      : categoryColumns === 4
        ? 'md:grid-cols-2 lg:grid-cols-4'
        : 'md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className="forum-home py-6">
      {/* Stats Overview */}
      {showStats && stats && (
        <section className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="게시글" value={stats.totalPosts} colorVar="--forum-stat-posts" />
            <StatCard label="댓글" value={stats.totalComments} colorVar="--forum-stat-comments" />
            <StatCard label="카테고리" value={stats.totalCategories} colorVar="--forum-stat-users" />
            {stats.activeUsers !== undefined && (
              <StatCard label="접속중" value={stats.activeUsers} colorVar="--forum-warning" />
            )}
          </div>
        </section>
      )}

      {/* Categories */}
      {showCategories && categories.length > 0 && (
        <section className="mb-8">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: 'var(--forum-text-primary)' }}
          >
            카테고리
          </h2>
          <div className={`grid grid-cols-1 ${columnClass} gap-4`}>
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </section>
      )}

      {/* Pinned Posts */}
      {showPinnedPosts && pinnedPosts.length > 0 && (
        <section className="mb-8">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: 'var(--forum-text-primary)' }}
          >
            공지사항
          </h2>
          <div className="space-y-3">
            {pinnedPosts.map((post) => (
              <PostCard key={post.id} post={post} showPinnedBadge />
            ))}
          </div>
        </section>
      )}

      {/* Recent Posts */}
      {showRecentPosts && recentPosts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-xl font-bold"
              style={{ color: 'var(--forum-text-primary)' }}
            >
              최근 게시글
            </h2>
            <Link
              to="/forum/list"
              className="text-sm hover:underline"
              style={{ color: 'var(--forum-text-link)' }}
            >
              전체보기 &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, colorVar }: { label: string; value: number; colorVar: string }) {
  return (
    <div
      className="rounded-lg border p-4 text-center"
      style={{
        backgroundColor: 'var(--forum-bg-primary)',
        borderColor: 'var(--forum-border-light)',
        boxShadow: 'var(--forum-shadow-sm)',
      }}
    >
      <div
        className="text-2xl font-bold"
        style={{ color: `var(${colorVar}-text, var(--forum-primary))` }}
      >
        {value.toLocaleString()}
      </div>
      <div className="text-sm" style={{ color: 'var(--forum-text-muted)' }}>
        {label}
      </div>
    </div>
  );
}

function CategoryCard({ category }: { category: ForumCategory }) {
  return (
    <Link
      to={`/forum/category/${category.slug}`}
      className="block rounded-lg border p-4 transition-shadow hover:shadow-md"
      style={{
        backgroundColor: 'var(--forum-bg-primary)',
        borderColor: 'var(--forum-border-light)',
        boxShadow: 'var(--forum-shadow-sm)',
      }}
    >
      <div className="flex items-start gap-3">
        {category.icon && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
            style={{ backgroundColor: category.color || 'var(--forum-primary)' }}
          >
            {category.icon}
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-semibold" style={{ color: 'var(--forum-text-primary)' }}>
            {category.name}
          </h3>
          {category.description && (
            <p
              className="text-sm mt-1 line-clamp-2"
              style={{ color: 'var(--forum-text-secondary)' }}
            >
              {category.description}
            </p>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--forum-text-muted)' }}>
            {category.postCount} 게시글
          </p>
        </div>
      </div>
    </Link>
  );
}

function PostCard({ post, showPinnedBadge = false }: { post: ForumPost; showPinnedBadge?: boolean }) {
  return (
    <Link
      to={`/forum/post/${post.slug || post.id}`}
      className="block rounded-lg border p-4 transition-shadow hover:shadow-md"
      style={{
        backgroundColor: 'var(--forum-bg-primary)',
        borderColor: 'var(--forum-border-light)',
        boxShadow: 'var(--forum-shadow-sm)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Author Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium overflow-hidden flex-shrink-0"
          style={{
            backgroundColor: 'var(--forum-bg-tertiary)',
            color: 'var(--forum-text-secondary)',
          }}
        >
          {post.author?.avatar ? (
            <img src={post.author.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            (post.author?.name || '익명').charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges & Title */}
          <div className="flex items-center gap-2 flex-wrap">
            {showPinnedBadge && post.isPinned && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: 'var(--forum-badge-pinned-bg)',
                  color: 'var(--forum-badge-pinned-text)',
                }}
              >
                고정
              </span>
            )}
            {post.isLocked && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: 'var(--forum-badge-locked-bg)',
                  color: 'var(--forum-badge-locked-text)',
                }}
              >
                잠금
              </span>
            )}
            <h3
              className="font-semibold truncate"
              style={{ color: 'var(--forum-text-primary)' }}
            >
              {post.title}
            </h3>
          </div>

          {/* Excerpt */}
          {post.excerpt && (
            <p
              className="text-sm mt-1 line-clamp-2"
              style={{ color: 'var(--forum-text-secondary)' }}
            >
              {post.excerpt}
            </p>
          )}

          {/* Meta */}
          <div
            className="flex items-center gap-3 mt-2 text-xs flex-wrap"
            style={{ color: 'var(--forum-text-muted)' }}
          >
            <span>{post.author?.name || '익명'}</span>
            {post.categoryName && (
              <span style={{ color: 'var(--forum-text-link)' }}>{post.categoryName}</span>
            )}
            <span>{formatRelativeTime(post.createdAt)}</span>
            <span>조회 {post.viewCount}</span>
            <span>댓글 {post.commentCount}</span>
            {post.likeCount > 0 && <span>❤️ {post.likeCount}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default ForumHomeView;
