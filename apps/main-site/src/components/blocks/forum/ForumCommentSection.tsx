/**
 * ForumCommentSection Block Renderer
 *
 * Renders comment section with nested replies.
 * Uses injected data from CMSBlockWrapper.
 * Styled with CMS Theme tokens (CSS variables).
 */

'use client';

import { BlockRendererProps } from '../BlockRenderer';
import { forumStyles } from './theme';

interface Block {
  id: string;
  type: string;
  content: any;
}

interface ForumComment {
  id: string;
  content: Block[];
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt: string;
  likeCount: number;
  isLiked?: boolean;
  isDeleted?: boolean;
  replies?: ForumComment[];
}

interface ForumCommentSectionData {
  comments: ForumComment[];
  totalCount: number;
  hasMore: boolean;
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

function getContentText(blocks: Block[]): string {
  return blocks
    .map((block) => (typeof block.content === 'string' ? block.content : block.content?.text || ''))
    .filter(Boolean)
    .join(' ');
}

const CommentItem = ({ comment, depth = 0 }: { comment: ForumComment; depth?: number }) => {
  if (comment.isDeleted) {
    return (
      <div
        className={`py-4 ${depth > 0 ? 'ml-8 border-l-2 pl-4' : ''}`}
        style={{ ...forumStyles.textMuted, borderColor: 'var(--forum-border-light)' }}
      >
        삭제된 댓글입니다.
      </div>
    );
  }

  return (
    <div
      className={`py-4 ${depth > 0 ? 'ml-8 border-l-2 pl-4' : 'border-b'}`}
      style={{ borderColor: 'var(--forum-border-light)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium overflow-hidden flex-shrink-0"
          style={forumStyles.avatar}
        >
          {comment.authorAvatar ? (
            <img src={comment.authorAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            comment.authorName?.charAt(0).toUpperCase() || 'U'
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium" style={forumStyles.heading}>
              {comment.authorName || '익명'}
            </span>
            <span className="text-xs" style={forumStyles.textMuted}>
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <div className="mt-2" style={forumStyles.text}>
            {getContentText(comment.content)}
          </div>
          <div className="flex items-center gap-4 mt-3">
            <button
              className="flex items-center gap-1 text-sm transition-colors"
              style={comment.isLiked ? forumStyles.likeActive : forumStyles.likeInactive}
            >
              <span>❤️</span>
              {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
            </button>
            {depth < 2 && (
              <button
                className="text-sm transition-colors hover:underline"
                style={forumStyles.link}
              >
                답글
              </button>
            )}
          </div>
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ForumCommentSectionBlock = ({ node }: BlockRendererProps) => {
  const {
    sortBy = 'newest',
    showForm = true,
    showCount = true,
    data,
  } = node.props;

  const commentData: ForumCommentSectionData = data || {
    comments: [],
    totalCount: 0,
    hasMore: false,
  };

  return (
    <section className="forum-comment-section py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold" style={forumStyles.heading}>
          댓글 {showCount && commentData.totalCount > 0 && (
            <span style={forumStyles.link}>{commentData.totalCount}</span>
          )}
        </h3>
        {commentData.comments.length > 0 && (
          <select
            value={sortBy}
            className="text-sm border rounded-lg px-3 py-1.5"
            style={forumStyles.input}
            disabled
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
            <option value="popular">인기순</option>
          </select>
        )}
      </div>

      {/* Comment Form */}
      {showForm && (
        <div className="mb-6">
          <textarea
            placeholder="댓글을 입력하세요..."
            className="w-full p-3 border rounded-lg focus:ring-2 resize-none"
            style={{
              ...forumStyles.input,
              outlineColor: 'var(--forum-primary)',
            }}
            rows={3}
            disabled
          />
          <div className="flex justify-end mt-2">
            <button
              className="px-4 py-2 rounded-lg disabled:opacity-50"
              style={forumStyles.buttonPrimary}
              disabled
            >
              댓글 작성
            </button>
          </div>
        </div>
      )}

      {/* Comments List */}
      {commentData.comments.length > 0 ? (
        <div className="comments-list">
          {commentData.comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
          {commentData.hasMore && (
            <div className="text-center mt-6">
              <button
                className="px-6 py-2 rounded-lg transition-colors"
                style={forumStyles.buttonSecondary}
              >
                더 보기
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8" style={forumStyles.textMuted}>
          <p>아직 댓글이 없습니다.</p>
          <p className="text-sm mt-1">첫 댓글을 작성해보세요!</p>
        </div>
      )}
    </section>
  );
};
