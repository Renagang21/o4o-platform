/**
 * Post List Template
 *
 * Public-facing template for displaying a list of forum posts.
 * Used for category views, search results, and tag archives.
 */

import React from 'react';
import type { Block } from '@o4o/types';
import { ForumBlockRenderer } from '../public-ui/components/ForumBlockRenderer.js';
import { PostStatus, PostType } from '../backend/entities/ForumPost.js';

// Re-use types from ForumHome
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

export interface PostListPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface PostListData {
  posts: ForumPostSummary[];
  pinnedPosts?: ForumPostSummary[];
  pagination: PostListPagination;
  title?: string;
  description?: string;
}

export interface PostListTemplateProps {
  data: PostListData;
  onPostClick?: (post: ForumPostSummary) => void;
  onPageChange?: (page: number) => void;
  view?: 'list' | 'compact' | 'card';
  showCategory?: boolean;
  className?: string;
}

/**
 * Format relative time
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
 * Post Type Badge
 */
const PostTypeBadge: React.FC<{ type: PostType }> = ({ type }) => {
  const badges: Record<PostType, { label: string; color: string }> = {
    [PostType.DISCUSSION]: { label: '토론', color: 'bg-blue-100 text-blue-800' },
    [PostType.QUESTION]: { label: '질문', color: 'bg-green-100 text-green-800' },
    [PostType.ANNOUNCEMENT]: { label: '공지', color: 'bg-red-100 text-red-800' },
    [PostType.POLL]: { label: '투표', color: 'bg-purple-100 text-purple-800' },
    [PostType.GUIDE]: { label: '가이드', color: 'bg-yellow-100 text-yellow-800' },
  };

  const badge = badges[type];
  if (!badge || type === PostType.DISCUSSION) return null;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
      {badge.label}
    </span>
  );
};

/**
 * List View Post Item
 */
const ListViewItem: React.FC<{
  post: ForumPostSummary;
  onClick?: () => void;
  showCategory?: boolean;
}> = ({ post, onClick, showCategory = true }) => (
  <article
    className="post-list-item bg-white border-b border-gray-200 py-4 px-4 hover:bg-gray-50 transition-colors cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-start gap-3">
      {/* Author Avatar */}
      <div className="author-avatar w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium overflow-hidden flex-shrink-0">
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
        {/* Title Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {post.isPinned && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
              고정
            </span>
          )}
          <PostTypeBadge type={post.type} />
          <h3 className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1">
            {post.title}
          </h3>
          {post.commentCount > 0 && (
            <span className="text-xs text-blue-600">[{post.commentCount}]</span>
          )}
        </div>

        {/* Excerpt */}
        {post.excerpt ? (
          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{post.excerpt}</p>
        ) : post.content.length > 0 ? (
          <div className="mt-1 text-sm text-gray-600 line-clamp-1">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {post.likeCount}
          </span>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-1 mt-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  </article>
);

/**
 * Compact View Post Item
 */
const CompactViewItem: React.FC<{
  post: ForumPostSummary;
  onClick?: () => void;
  showCategory?: boolean;
}> = ({ post, onClick, showCategory = true }) => (
  <article
    className="post-compact-item border-b border-gray-200 py-2 px-4 hover:bg-gray-50 transition-colors cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-center gap-3">
      {/* Badges */}
      <div className="flex items-center gap-1 flex-shrink-0 w-16">
        {post.isPinned && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            공지
          </span>
        )}
        <PostTypeBadge type={post.type} />
      </div>

      {/* Category */}
      {showCategory && (
        <span className="text-xs text-blue-600 w-20 flex-shrink-0 truncate">
          {post.categoryName || '-'}
        </span>
      )}

      {/* Title */}
      <h3 className="flex-1 font-medium text-gray-900 hover:text-blue-600 truncate">
        {post.title}
        {post.commentCount > 0 && (
          <span className="text-xs text-blue-600 ml-1">[{post.commentCount}]</span>
        )}
      </h3>

      {/* Author */}
      <span className="text-xs text-gray-500 w-20 flex-shrink-0 truncate">
        {post.authorName || '익명'}
      </span>

      {/* Date */}
      <span className="text-xs text-gray-500 w-20 flex-shrink-0 text-right">
        {formatRelativeTime(post.createdAt)}
      </span>

      {/* Stats */}
      <div className="flex items-center gap-2 text-xs text-gray-400 w-20 flex-shrink-0">
        <span>{post.viewCount}</span>
        <span>{post.likeCount}</span>
      </div>
    </div>
  </article>
);

/**
 * Card View Post Item
 */
const CardViewItem: React.FC<{
  post: ForumPostSummary;
  onClick?: () => void;
  showCategory?: boolean;
}> = ({ post, onClick, showCategory = true }) => (
  <article
    className="post-card-item bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
    onClick={onClick}
  >
    {/* Header */}
    <div className="flex items-center gap-2 mb-3">
      {/* Author Avatar */}
      <div className="author-avatar w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium overflow-hidden">
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
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-900">{post.authorName || '익명'}</span>
        <span className="text-xs text-gray-500 ml-2">{formatRelativeTime(post.createdAt)}</span>
      </div>
      {showCategory && post.categoryName && (
        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
          {post.categoryName}
        </span>
      )}
    </div>

    {/* Title */}
    <div className="flex items-center gap-2 mb-2">
      {post.isPinned && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
          고정
        </span>
      )}
      <PostTypeBadge type={post.type} />
      <h3 className="font-semibold text-gray-900 line-clamp-2">{post.title}</h3>
    </div>

    {/* Content Preview */}
    {post.excerpt ? (
      <p className="text-sm text-gray-600 line-clamp-3 mb-3">{post.excerpt}</p>
    ) : post.content.length > 0 ? (
      <div className="text-sm text-gray-600 line-clamp-3 mb-3">
        <ForumBlockRenderer content={post.content} maxBlocks={2} />
      </div>
    ) : null}

    {/* Footer */}
    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
      {/* Tags */}
      {post.tags && post.tags.length > 0 ? (
        <div className="flex gap-1">
          {post.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : (
        <div />
      )}

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          {post.viewCount}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {post.commentCount}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          {post.likeCount}
        </span>
      </div>
    </div>
  </article>
);

/**
 * Pagination Component
 */
const Pagination: React.FC<{
  pagination: PostListPagination;
  onPageChange?: (page: number) => void;
}> = ({ pagination, onPageChange }) => {
  const { currentPage, totalPages } = pagination;

  if (totalPages <= 1) return null;

  // Generate page numbers to show
  const pages: (number | 'ellipsis')[] = [];
  const showPages = 5;
  const halfShow = Math.floor(showPages / 2);

  let start = Math.max(1, currentPage - halfShow);
  let end = Math.min(totalPages, currentPage + halfShow);

  if (currentPage <= halfShow) {
    end = Math.min(totalPages, showPages);
  } else if (currentPage > totalPages - halfShow) {
    start = Math.max(1, totalPages - showPages + 1);
  }

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('ellipsis');
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <nav className="pagination flex items-center justify-center gap-1 mt-6">
      {/* Previous */}
      <button
        onClick={() => onPageChange?.(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        이전
      </button>

      {/* Page Numbers */}
      {pages.map((page, index) =>
        page === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange?.(page)}
            className={`px-3 py-2 rounded border text-sm ${
              page === currentPage
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange?.(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 rounded border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        다음
      </button>
    </nav>
  );
};

/**
 * Post List Template
 *
 * Main component for displaying a list of forum posts.
 */
export const PostListTemplate: React.FC<PostListTemplateProps> = ({
  data,
  onPostClick,
  onPageChange,
  view = 'list',
  showCategory = true,
  className = '',
}) => {
  const ViewComponent = {
    list: ListViewItem,
    compact: CompactViewItem,
    card: CardViewItem,
  }[view];

  return (
    <div className={`post-list ${className}`}>
      {/* Header */}
      {(data.title || data.description) && (
        <header className="mb-6">
          {data.title && (
            <h1 className="text-2xl font-bold text-gray-900">{data.title}</h1>
          )}
          {data.description && (
            <p className="text-gray-600 mt-1">{data.description}</p>
          )}
          <div className="text-sm text-gray-500 mt-2">
            총 {data.pagination.totalItems}개의 게시글
          </div>
        </header>
      )}

      {/* Pinned Posts */}
      {data.pinnedPosts && data.pinnedPosts.length > 0 && (
        <section className="pinned-posts mb-4 bg-yellow-50 rounded-lg border border-yellow-200 overflow-hidden">
          {data.pinnedPosts.map((post) => (
            <ViewComponent
              key={post.id}
              post={post}
              onClick={() => onPostClick?.(post)}
              showCategory={showCategory}
            />
          ))}
        </section>
      )}

      {/* Posts */}
      {data.posts.length > 0 ? (
        <section className={`posts ${view === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'bg-white rounded-lg border border-gray-200 overflow-hidden'}`}>
          {data.posts.map((post) => (
            <ViewComponent
              key={post.id}
              post={post}
              onClick={() => onPostClick?.(post)}
              showCategory={showCategory}
            />
          ))}
        </section>
      ) : (
        <div className="empty-state text-center py-12 text-gray-500">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>게시글이 없습니다.</p>
        </div>
      )}

      {/* Pagination */}
      <Pagination pagination={data.pagination} onPageChange={onPageChange} />
    </div>
  );
};

export default PostListTemplate;
