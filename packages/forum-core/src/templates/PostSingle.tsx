/**
 * Post Single Template
 *
 * Public-facing template for displaying a single forum post.
 * Includes the full post content, author info, and comment section.
 */

import React from 'react';
import type { Block } from '@o4o/types';
import { ForumBlockRenderer } from '../public-ui/components/ForumBlockRenderer.js';
import { PostStatus, PostType } from '../backend/entities/ForumPost.js';
import type { ForumPostMetadata } from '../backend/types/index.js';

export interface ForumAuthor {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  postCount?: number;
  joinedAt?: string;
  badges?: string[];
}

export interface ForumComment {
  id: string;
  content: Block[];
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt?: string;
  likeCount: number;
  isLiked?: boolean;
  parentId?: string;
  replies?: ForumComment[];
  isDeleted?: boolean;
}

export interface ForumPostFull {
  id: string;
  title: string;
  slug: string;
  content: Block[];
  excerpt?: string;
  type: PostType;
  status: PostStatus;
  authorId: string;
  author?: ForumAuthor;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  organizationId?: string;
  isPinned: boolean;
  isLocked: boolean;
  allowComments: boolean;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
  lastCommentAt?: string;
  tags?: string[];
  metadata?: ForumPostMetadata;
}

export interface PostSingleData {
  post: ForumPostFull;
  comments: ForumComment[];
  relatedPosts?: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    createdAt: string;
  }>;
}

export interface PostSingleTemplateProps {
  data: PostSingleData;
  currentUserId?: string;
  onLike?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  onReport?: () => void;
  onCommentSubmit?: (content: string, parentId?: string) => void;
  onCommentLike?: (commentId: string) => void;
  onTagClick?: (tag: string) => void;
  onCategoryClick?: () => void;
  onAuthorClick?: (authorId: string) => void;
  className?: string;
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-medium ${badge.color}`}>
      {badge.label}
    </span>
  );
};

/**
 * Author Card Component
 */
const AuthorCard: React.FC<{
  author: ForumAuthor;
  onClick?: () => void;
}> = ({ author, onClick }) => (
  <div
    className="author-card flex items-start gap-4 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
    onClick={onClick}
  >
    <div className="author-avatar w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xl font-medium overflow-hidden flex-shrink-0">
      {author.avatar ? (
        <img
          src={author.avatar}
          alt={author.name}
          className="w-full h-full object-cover"
        />
      ) : (
        author.name?.charAt(0).toUpperCase() || 'U'
      )}
    </div>
    <div className="flex-1">
      <h4 className="font-semibold text-gray-900">{author.name}</h4>
      {author.badges && author.badges.length > 0 && (
        <div className="flex gap-1 mt-1">
          {author.badges.map((badge, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
            >
              {badge}
            </span>
          ))}
        </div>
      )}
      {author.bio && (
        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{author.bio}</p>
      )}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        {author.postCount !== undefined && <span>게시글 {author.postCount}개</span>}
        {author.joinedAt && <span>가입일 {new Date(author.joinedAt).toLocaleDateString('ko-KR')}</span>}
      </div>
    </div>
  </div>
);

/**
 * Comment Component
 */
const CommentItem: React.FC<{
  comment: ForumComment;
  depth?: number;
  onLike?: () => void;
  onReply?: () => void;
  currentUserId?: string;
}> = ({ comment, depth = 0, onLike, onReply, currentUserId }) => {
  if (comment.isDeleted) {
    return (
      <div className={`comment-deleted text-gray-400 py-4 ${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        삭제된 댓글입니다.
      </div>
    );
  }

  return (
    <div className={`comment py-4 ${depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : 'border-b border-gray-200'}`}>
      <div className="flex items-start gap-3">
        {/* Author Avatar */}
        <div className="author-avatar w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium overflow-hidden flex-shrink-0">
          {comment.authorAvatar ? (
            <img
              src={comment.authorAvatar}
              alt={comment.authorName || 'Author'}
              className="w-full h-full object-cover"
            />
          ) : (
            comment.authorName?.charAt(0).toUpperCase() || 'U'
          )}
        </div>

        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{comment.authorName || '익명'}</span>
            <span className="text-xs text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
          </div>

          {/* Content */}
          <div className="mt-2 text-gray-700">
            <ForumBlockRenderer content={comment.content} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={onLike}
              className={`flex items-center gap-1 text-sm ${
                comment.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <svg className="w-4 h-4" fill={comment.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
            </button>
            {depth < 2 && (
              <button
                onClick={onReply}
                className="text-sm text-gray-500 hover:text-blue-600"
              >
                답글
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Comment Form Component
 */
const CommentForm: React.FC<{
  onSubmit?: (content: string) => void;
  placeholder?: string;
  isLocked?: boolean;
  isLoggedIn?: boolean;
}> = ({ onSubmit, placeholder = '댓글을 입력하세요...', isLocked, isLoggedIn = true }) => {
  const [content, setContent] = React.useState('');

  if (isLocked) {
    return (
      <div className="comment-form-locked text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p>이 게시글은 댓글이 잠겨있습니다.</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="comment-form-login text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
        <p>댓글을 작성하려면 로그인이 필요합니다.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit?.(content);
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        rows={4}
      />
      <div className="flex justify-end mt-2">
        <button
          type="submit"
          disabled={!content.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          댓글 작성
        </button>
      </div>
    </form>
  );
};

/**
 * Related Posts Component
 */
const RelatedPosts: React.FC<{
  posts: PostSingleData['relatedPosts'];
}> = ({ posts }) => {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="related-posts mt-8">
      <h3 className="text-lg font-bold text-gray-900 mb-4">관련 게시글</h3>
      <div className="space-y-3">
        {posts.map((post) => (
          <a
            key={post.id}
            href={`/forum/post/${post.slug}`}
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
          >
            <h4 className="font-medium text-gray-900 hover:text-blue-600">{post.title}</h4>
            {post.excerpt && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.excerpt}</p>
            )}
            <span className="text-xs text-gray-500 mt-2 block">
              {formatRelativeTime(post.createdAt)}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
};

/**
 * Post Single Template
 *
 * Main component for displaying a single forum post.
 */
export const PostSingleTemplate: React.FC<PostSingleTemplateProps> = ({
  data,
  currentUserId,
  onLike,
  onBookmark,
  onShare,
  onReport,
  onCommentSubmit,
  onCommentLike,
  onTagClick,
  onCategoryClick,
  onAuthorClick,
  className = '',
}) => {
  const { post, comments, relatedPosts } = data;

  return (
    <div className={`post-single ${className}`}>
      {/* Post Header */}
      <header className="post-header mb-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-4">
          <span className="hover:text-blue-600 cursor-pointer">포럼</span>
          <span className="mx-2">/</span>
          <span
            className="hover:text-blue-600 cursor-pointer"
            onClick={onCategoryClick}
          >
            {post.categoryName || '카테고리'}
          </span>
        </nav>

        {/* Title */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {post.isPinned && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  고정
                </span>
              )}
              <PostTypeBadge type={post.type} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {post.title}
            </h1>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium overflow-hidden">
              {post.author?.avatar ? (
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                post.author?.name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <span
              className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer"
              onClick={() => post.author && onAuthorClick?.(post.author.id)}
            >
              {post.author?.name || '익명'}
            </span>
          </div>
          <span>{formatDate(post.publishedAt || post.createdAt)}</span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {post.viewCount}
          </span>
        </div>
      </header>

      {/* Post Content */}
      <article className="post-content prose prose-lg max-w-none mb-8">
        <ForumBlockRenderer content={post.content} className="forum-post-content" />
      </article>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="post-tags flex flex-wrap gap-2 mb-6">
          {post.tags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagClick?.(tag)}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div className="action-bar flex items-center justify-between py-4 border-t border-b border-gray-200 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              post.isLiked
                ? 'bg-red-100 text-red-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{post.likeCount}</span>
          </button>
          <button
            onClick={onBookmark}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              post.isBookmarked
                ? 'bg-yellow-100 text-yellow-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill={post.isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span>북마크</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onShare}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>공유</span>
          </button>
          <button
            onClick={onReport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>신고</span>
          </button>
        </div>
      </div>

      {/* Author Card */}
      {post.author && (
        <section className="mb-8">
          <AuthorCard
            author={post.author}
            onClick={() => onAuthorClick?.(post.author!.id)}
          />
        </section>
      )}

      {/* Comments Section */}
      <section className="comments-section">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          댓글 {post.commentCount}개
        </h3>

        {/* Comment Form */}
        {post.allowComments && (
          <div className="mb-6">
            <CommentForm
              onSubmit={(content) => onCommentSubmit?.(content)}
              isLocked={post.isLocked}
              isLoggedIn={!!currentUserId}
            />
          </div>
        )}

        {/* Comments List */}
        {comments.length > 0 ? (
          <div className="comments-list">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onLike={() => onCommentLike?.(comment.id)}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>아직 댓글이 없습니다. 첫 댓글을 작성해보세요!</p>
          </div>
        )}
      </section>

      {/* Related Posts */}
      <RelatedPosts posts={relatedPosts} />
    </div>
  );
};

export default PostSingleTemplate;
