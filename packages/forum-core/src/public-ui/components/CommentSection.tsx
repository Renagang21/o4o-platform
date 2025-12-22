/**
 * Comment Section Component
 *
 * Reusable component for displaying and managing comments on forum posts.
 * Can be used independently or as part of the PostSingle template.
 */

import React from 'react';
import type { Block } from '@o4o/types';
import { ForumBlockRenderer } from './ForumBlockRenderer.js';

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
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface CommentSectionProps {
  comments: ForumComment[];
  totalCount: number;
  currentUserId?: string;
  isLoggedIn?: boolean;
  isLocked?: boolean;
  allowComments?: boolean;
  sortBy?: 'newest' | 'oldest' | 'popular';
  onSortChange?: (sort: 'newest' | 'oldest' | 'popular') => void;
  onSubmit?: (content: string, parentId?: string) => void;
  onEdit?: (commentId: string, content: string) => void;
  onDelete?: (commentId: string) => void;
  onLike?: (commentId: string) => void;
  onReport?: (commentId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
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
 * Comment Form Component
 */
const CommentForm: React.FC<{
  onSubmit?: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  showCancel?: boolean;
  autoFocus?: boolean;
}> = ({
  onSubmit,
  onCancel,
  placeholder = '댓글을 입력하세요...',
  initialValue = '',
  submitLabel = '댓글 작성',
  showCancel = false,
  autoFocus = false,
}) => {
  const [content, setContent] = React.useState(initialValue);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

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
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        rows={3}
      />
      <div className="flex justify-end gap-2 mt-2">
        {showCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={!content.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

/**
 * Single Comment Component
 */
const CommentItem: React.FC<{
  comment: ForumComment;
  depth?: number;
  currentUserId?: string;
  onLike?: () => void;
  onReply?: (content: string) => void;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
  onReport?: () => void;
}> = ({
  comment,
  depth = 0,
  currentUserId,
  onLike,
  onReply,
  onEdit,
  onDelete,
  onReport,
}) => {
  const [showReplyForm, setShowReplyForm] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [showActions, setShowActions] = React.useState(false);

  const isOwner = currentUserId === comment.authorId;
  const maxReplyDepth = 2;

  if (comment.isDeleted) {
    return (
      <div
        className={`comment-deleted py-4 text-gray-400 ${
          depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''
        }`}
      >
        삭제된 댓글입니다.
        {/* Show replies even if parent is deleted */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                depth={depth + 1}
                currentUserId={currentUserId}
                onLike={() => onLike?.()}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const handleReplySubmit = (content: string) => {
    onReply?.(content);
    setShowReplyForm(false);
  };

  const handleEditSubmit = (content: string) => {
    onEdit?.(content);
    setIsEditing(false);
  };

  // Convert Block[] content to text for editing
  const getContentAsText = (): string => {
    return comment.content
      .map((block) =>
        typeof block.content === 'string'
          ? block.content
          : block.content?.text || ''
      )
      .join('\n\n');
  };

  return (
    <div
      className={`comment py-4 ${
        depth > 0 ? 'ml-8 border-l-2 border-gray-200 pl-4' : 'border-b border-gray-200'
      }`}
    >
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

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {comment.authorName || '익명'}
              </span>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(comment.createdAt)}
              </span>
              {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                <span className="text-xs text-gray-400">(수정됨)</span>
              )}
            </div>
            {/* More Actions */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {showActions && (
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  {isOwner && comment.canEdit && (
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      수정
                    </button>
                  )}
                  {isOwner && comment.canDelete && (
                    <button
                      onClick={() => {
                        onDelete?.();
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                    >
                      삭제
                    </button>
                  )}
                  {!isOwner && (
                    <button
                      onClick={() => {
                        onReport?.();
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    >
                      신고
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mt-2">
              <CommentForm
                initialValue={getContentAsText()}
                onSubmit={handleEditSubmit}
                onCancel={() => setIsEditing(false)}
                submitLabel="수정"
                showCancel
                autoFocus
              />
            </div>
          ) : (
            <div className="mt-2 text-gray-700">
              <ForumBlockRenderer content={comment.content} />
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-4 mt-3">
              <button
                onClick={onLike}
                className={`flex items-center gap-1 text-sm ${
                  comment.isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill={comment.isLiked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
              </button>
              {depth < maxReplyDepth && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="text-sm text-gray-500 hover:text-blue-600"
                >
                  답글
                </button>
              )}
            </div>
          )}

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-3">
              <CommentForm
                onSubmit={handleReplySubmit}
                onCancel={() => setShowReplyForm(false)}
                placeholder={`${comment.authorName || '익명'}님에게 답글 작성...`}
                submitLabel="답글 작성"
                showCancel
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUserId={currentUserId}
              onLike={() => onLike?.()}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Sort Selector Component
 */
const SortSelector: React.FC<{
  value: 'newest' | 'oldest' | 'popular';
  onChange?: (value: 'newest' | 'oldest' | 'popular') => void;
}> = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange?.(e.target.value as 'newest' | 'oldest' | 'popular')}
    className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500"
  >
    <option value="newest">최신순</option>
    <option value="oldest">오래된순</option>
    <option value="popular">인기순</option>
  </select>
);

/**
 * Comment Section Component
 *
 * Full-featured comment section with forms, sorting, and nested replies.
 */
export const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  totalCount,
  currentUserId,
  isLoggedIn = false,
  isLocked = false,
  allowComments = true,
  sortBy = 'newest',
  onSortChange,
  onSubmit,
  onEdit,
  onDelete,
  onLike,
  onReport,
  onLoadMore,
  hasMore = false,
  className = '',
}) => {
  // Locked state
  if (isLocked) {
    return (
      <section className={`comment-section ${className}`}>
        <h3 className="text-lg font-bold text-gray-900 mb-4">댓글</h3>
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <svg
            className="w-10 h-10 mx-auto mb-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <p>댓글이 잠겨있습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`comment-section ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          댓글 {totalCount > 0 && <span className="text-blue-600">{totalCount}</span>}
        </h3>
        {comments.length > 0 && (
          <SortSelector value={sortBy} onChange={onSortChange} />
        )}
      </div>

      {/* Comment Form */}
      {allowComments && (
        <div className="mb-6">
          {isLoggedIn ? (
            <CommentForm onSubmit={(content) => onSubmit?.(content)} />
          ) : (
            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
              <p>댓글을 작성하려면 로그인이 필요합니다.</p>
            </div>
          )}
        </div>
      )}

      {/* Comments List */}
      {comments.length > 0 ? (
        <>
          <div className="comments-list">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={currentUserId}
                onLike={() => onLike?.(comment.id)}
                onReply={(content) => onSubmit?.(content, comment.id)}
                onEdit={(content) => onEdit?.(comment.id, content)}
                onDelete={() => onDelete?.(comment.id)}
                onReport={() => onReport?.(comment.id)}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={onLoadMore}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                더 보기
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p>아직 댓글이 없습니다.</p>
          {allowComments && isLoggedIn && (
            <p className="text-sm text-gray-400 mt-1">첫 댓글을 작성해보세요!</p>
          )}
        </div>
      )}
    </section>
  );
};

export default CommentSection;
