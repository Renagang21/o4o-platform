/**
 * ForumPostList Block Renderer
 *
 * Renders a list of forum posts with filtering and pagination.
 * Uses injected data from CMSBlockWrapper.
 * Styled with CMS Theme tokens (CSS variables).
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';
import { forumStyles } from './theme';

interface ForumPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  categoryId: string;
  categoryName?: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  createdAt: string;
  tags?: string[];
}

interface ForumPostListData {
  posts: ForumPost[];
  pinnedPosts: ForumPost[];
  pagination: {
    currentPage: number;
    totalPosts: number;
    hasMore: boolean;
  };
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (days > 7) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
}

const PostCard = ({ post, viewMode }: { post: ForumPost; viewMode: 'list' | 'card' }) => {
  const isListMode = viewMode === 'list';

  return (
    <a
      href={`/forum/post/${post.slug}`}
      className={`block rounded-lg border p-4 transition-shadow hover:shadow-md ${isListMode ? '' : 'h-full'}`}
      style={forumStyles.card}
    >
      <div className={isListMode ? 'flex items-start gap-4' : ''}>
        {/* Author Avatar */}
        <div
          className={`rounded-full flex items-center justify-center text-sm font-medium overflow-hidden flex-shrink-0 ${isListMode ? 'w-10 h-10' : 'w-8 h-8 mb-3'}`}
          style={forumStyles.avatar}
        >
          {post.authorAvatar ? (
            <img src={post.authorAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            post.authorName?.charAt(0).toUpperCase() || 'U'
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-1">
            {post.isPinned && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={forumStyles.badgePinned}
              >
                고정
              </span>
            )}
            {post.isLocked && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={forumStyles.badgeLocked}
              >
                잠금
              </span>
            )}
            {post.categoryName && (
              <span className="text-xs" style={forumStyles.link}>
                {post.categoryName}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold truncate" style={forumStyles.heading}>
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-sm mt-1 line-clamp-2" style={forumStyles.text}>
              {post.excerpt}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2 text-xs" style={forumStyles.textMuted}>
            <span>{post.authorName || '익명'}</span>
            <span>{formatRelativeTime(post.createdAt)}</span>
            <span>조회 {post.viewCount}</span>
            <span>댓글 {post.commentCount}</span>
            {post.likeCount > 0 && <span>❤️ {post.likeCount}</span>}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs"
                  style={forumStyles.bgTertiary}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </a>
  );
};

export const ForumPostListBlock = ({ node }: BlockRendererProps) => {
  const {
    viewMode = 'list',
    showPinnedFirst = true,
    postsPerPage = 10,
    showPagination = true,
    data,
  } = node.props;

  const listData: ForumPostListData = data || {
    posts: [],
    pinnedPosts: [],
    pagination: { currentPage: 1, totalPosts: 0, hasMore: false },
  };

  const allPosts = showPinnedFirst
    ? [...listData.pinnedPosts, ...listData.posts]
    : listData.posts;

  if (allPosts.length === 0) {
    return (
      <div className="py-6">
        <div
          className="text-center py-12 rounded-lg border"
          style={{ ...forumStyles.bgSecondary, ...forumStyles.borderLight }}
        >
          <p style={forumStyles.textMuted}>게시글이 없습니다.</p>
          <p className="text-sm mt-1" style={forumStyles.textMuted}>
            첫 번째 게시글을 작성해보세요!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="forum-post-list py-6">
      {/* Post List */}
      <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
        {allPosts.slice(0, postsPerPage).map((post) => (
          <PostCard key={post.id} post={post} viewMode={viewMode} />
        ))}
      </div>

      {/* Pagination */}
      {showPagination && (listData.pagination.hasMore || listData.pagination.currentPage > 1) && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {listData.pagination.currentPage > 1 && (
            <a
              href={`?page=${listData.pagination.currentPage - 1}`}
              className="px-4 py-2 rounded-lg transition-colors"
              style={forumStyles.buttonSecondary}
            >
              이전
            </a>
          )}
          <span className="px-4 py-2" style={forumStyles.textMuted}>
            {listData.pagination.currentPage} 페이지
          </span>
          {listData.pagination.hasMore && (
            <a
              href={`?page=${listData.pagination.currentPage + 1}`}
              className="px-4 py-2 rounded-lg transition-colors"
              style={forumStyles.buttonPrimary}
            >
              다음
            </a>
          )}
        </div>
      )}
    </div>
  );
};
