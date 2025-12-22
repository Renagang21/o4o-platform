/**
 * Forum Home Template
 *
 * Public-facing template for the forum home page.
 * Displays categories, pinned posts, and recent activity.
 */

import React from 'react';
import type { Block } from '@o4o/types';
import { ForumBlockRenderer } from '../public-ui/components/ForumBlockRenderer.js';
import { PostStatus, PostType } from '../backend/entities/ForumPost.js';

// Type definitions for template data
export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  icon?: string;
  color?: string;
}

export interface ForumPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: Block[];
  type: PostType;
  status: PostStatus;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  categoryId: string;
  categoryName?: string;
  isPinned: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  createdAt: string;
  lastCommentAt?: string;
  tags?: string[];
}

export interface ForumHomeData {
  categories: ForumCategory[];
  pinnedPosts: ForumPostSummary[];
  recentPosts: ForumPostSummary[];
  stats: {
    totalPosts: number;
    totalComments: number;
    totalUsers: number;
    onlineUsers?: number;
  };
}

export interface ForumHomeTemplateProps {
  data: ForumHomeData;
  onCategoryClick?: (category: ForumCategory) => void;
  onPostClick?: (post: ForumPostSummary) => void;
  className?: string;
}

/**
 * Category Card Component
 */
const CategoryCard: React.FC<{
  category: ForumCategory;
  onClick?: () => void;
}> = ({ category, onClick }) => (
  <div
    className="category-card bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-start gap-3">
      {category.icon && (
        <div
          className="category-icon w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
          style={{ backgroundColor: category.color || '#3B82F6' }}
        >
          {category.icon}
        </div>
      )}
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{category.name}</h3>
        {category.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {category.description}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          {category.postCount} 게시글
        </p>
      </div>
    </div>
  </div>
);

/**
 * Post Preview Card Component
 */
const PostPreviewCard: React.FC<{
  post: ForumPostSummary;
  onClick?: () => void;
  showCategory?: boolean;
}> = ({ post, onClick, showCategory = true }) => (
  <article
    className="post-preview-card bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-start gap-3">
      {/* Author Avatar */}
      <div className="author-avatar w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium overflow-hidden">
        {post.authorAvatar ? (
          <img
            src={post.authorAvatar}
            alt={post.authorName || 'Author'}
            className="w-full h-full object-cover"
          />
        ) : (
          post.authorName?.charAt(0).toUpperCase() || 'U'
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Title & Tags */}
        <div className="flex items-start gap-2">
          {post.isPinned && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
              고정
            </span>
          )}
          <h3 className="font-semibold text-gray-900 line-clamp-1">
            {post.title}
          </h3>
        </div>

        {/* Excerpt */}
        {post.excerpt ? (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.excerpt}</p>
        ) : post.content.length > 0 ? (
          <div className="mt-1 text-sm text-gray-600 line-clamp-2">
            <ForumBlockRenderer content={post.content} maxBlocks={1} />
          </div>
        ) : null}

        {/* Meta Info */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span>{post.authorName || '익명'}</span>
          {showCategory && post.categoryName && (
            <span className="text-blue-600">{post.categoryName}</span>
          )}
          <span>{formatRelativeTime(post.createdAt)}</span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {post.viewCount}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {post.commentCount}
          </span>
        </div>
      </div>
    </div>
  </article>
);

/**
 * Stats Overview Component
 */
const StatsOverview: React.FC<{
  stats: ForumHomeData['stats'];
}> = ({ stats }) => (
  <div className="stats-overview grid grid-cols-2 md:grid-cols-4 gap-4">
    <div className="stat-item bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
      <div className="text-2xl font-bold text-blue-600">{stats.totalPosts}</div>
      <div className="text-sm text-gray-500">게시글</div>
    </div>
    <div className="stat-item bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
      <div className="text-2xl font-bold text-green-600">{stats.totalComments}</div>
      <div className="text-sm text-gray-500">댓글</div>
    </div>
    <div className="stat-item bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
      <div className="text-2xl font-bold text-purple-600">{stats.totalUsers}</div>
      <div className="text-sm text-gray-500">회원</div>
    </div>
    {stats.onlineUsers !== undefined && (
      <div className="stat-item bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
        <div className="text-2xl font-bold text-orange-600">{stats.onlineUsers}</div>
        <div className="text-sm text-gray-500">접속중</div>
      </div>
    )}
  </div>
);

/**
 * Format relative time (e.g., "2시간 전")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString('ko-KR');
  } else if (days > 0) {
    return `${days}일 전`;
  } else if (hours > 0) {
    return `${hours}시간 전`;
  } else if (minutes > 0) {
    return `${minutes}분 전`;
  } else {
    return '방금 전';
  }
}

/**
 * Forum Home Template
 *
 * Main component for the forum home page.
 */
export const ForumHomeTemplate: React.FC<ForumHomeTemplateProps> = ({
  data,
  onCategoryClick,
  onPostClick,
  className = '',
}) => {
  return (
    <div className={`forum-home ${className}`}>
      {/* Stats Overview */}
      <section className="mb-8">
        <StatsOverview stats={data.stats} />
      </section>

      {/* Categories Section */}
      {data.categories.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">카테고리</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                onClick={() => onCategoryClick?.(category)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Pinned Posts Section */}
      {data.pinnedPosts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">공지사항</h2>
          <div className="space-y-3">
            {data.pinnedPosts.map((post) => (
              <PostPreviewCard
                key={post.id}
                post={post}
                onClick={() => onPostClick?.(post)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent Posts Section */}
      {data.recentPosts.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">최근 게시글</h2>
          <div className="space-y-3">
            {data.recentPosts.map((post) => (
              <PostPreviewCard
                key={post.id}
                post={post}
                onClick={() => onPostClick?.(post)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ForumHomeTemplate;
