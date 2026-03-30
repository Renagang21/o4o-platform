/**
 * YaksaForumPostSingle - Single Post View Page
 *
 * Displays a single post with comments and moderation controls.
 */

'use client';

import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import {
  YaksaRoleBadge,
  YaksaStatusBadge,
  YaksaModerationPanel,
  yaksaStyles,
  applyYaksaTheme,
} from '@/components/yaksa/forum';
import {
  fetchYaksaPostDetail,
  fetchYaksaUserProfile,
  hasRoleAccess,
  type YaksaPost,
  type YaksaUser,
  type YaksaComment,
} from '@/lib/yaksa/forum-data';

interface YaksaForumPostSingleProps {
  postSlug: string;
}

export function YaksaForumPostSingle({ postSlug }: YaksaForumPostSingleProps) {
  const [post, setPost] = useState<YaksaPost | null>(null);
  const [user, setUser] = useState<YaksaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<YaksaComment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    applyYaksaTheme();
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [postData, userData] = await Promise.all([
          fetchYaksaPostDetail(postSlug),
          fetchYaksaUserProfile(),
        ]);
        setPost(postData);
        setUser(userData);
        // Mock comments
        setComments(getMockComments());
      } catch (error) {
        console.error('Error loading post:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [postSlug]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const comment: YaksaComment = {
      id: `comment-${Date.now()}`,
      content: newComment,
      author: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      postId: post?.id || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likeCount: 0,
    };

    setComments((prev) => [...prev, comment]);
    setNewComment('');
  };

  const isOperator = user && hasRoleAccess(user.role, 'operator');

  if (loading) {
    return <PostLoading />;
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p style={yaksaStyles.textMuted}>게시글을 찾을 수 없습니다.</p>
          <a
            href="/yaksa/forum"
            className="mt-4 inline-block px-4 py-2 rounded"
            style={yaksaStyles.buttonPrimary}
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="yaksa-forum-post-single min-h-screen"
      style={{ backgroundColor: 'var(--yaksa-surface-secondary)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b shadow-sm"
        style={{
          backgroundColor: 'var(--yaksa-primary)',
          borderColor: 'var(--yaksa-primary-dark)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <a href="/yaksa/forum" className="text-white hover:opacity-80">
              ← 목록
            </a>
            <span className="text-white text-sm opacity-75">
              {post.categoryName}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Post Article */}
        <article
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--yaksa-surface)',
            borderColor: 'var(--yaksa-border)',
          }}
        >
          {/* Post Header */}
          <div className="p-6 border-b" style={{ borderColor: 'var(--yaksa-border)' }}>
            {/* Status & Badges */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {post.isPinned && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  📌 고정글
                </span>
              )}
              {post.isLocked && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  🔒 잠금
                </span>
              )}
              {post.status !== 'approved' && (
                <YaksaStatusBadge status={post.status} />
              )}
              {post.metadata?.priority && post.metadata.priority !== 'normal' && (
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: post.metadata.priority === 'urgent' ? '#fef2f2' : '#fffbeb',
                    color: post.metadata.priority === 'urgent' ? '#dc2626' : '#d97706',
                  }}
                >
                  {post.metadata.priority === 'urgent' ? '긴급' : '중요'}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold mb-4" style={yaksaStyles.textPrimary}>
              {post.title}
            </h1>

            {/* Author & Meta */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium"
                  style={{
                    backgroundColor: 'var(--yaksa-surface-tertiary)',
                    color: 'var(--yaksa-text-secondary)',
                  }}
                >
                  {post.author.avatar ? (
                    <img
                      src={post.author.avatar}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    post.author.name.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={yaksaStyles.textPrimary}>
                      {post.author.name}
                    </span>
                    <YaksaRoleBadge role={post.author.role} size="sm" />
                  </div>
                  <div className="text-sm" style={yaksaStyles.textMuted}>
                    {formatDate(post.createdAt)}
                    {post.updatedAt !== post.createdAt && ' (수정됨)'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm" style={yaksaStyles.textMuted}>
                <span>조회 {post.viewCount}</span>
                <span>댓글 {post.commentCount}</span>
                {post.likeCount > 0 && (
                  <span style={{ color: 'var(--yaksa-critical)' }}>♥ {post.likeCount}</span>
                )}
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="p-6">
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || '') }}
            />

            {/* Attachments */}
            {post.attachments && post.attachments.length > 0 && (
              <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--yaksa-border)' }}>
                <h4 className="text-sm font-semibold mb-3" style={yaksaStyles.textPrimary}>
                  📎 첨부파일
                </h4>
                <div className="space-y-2">
                  {post.attachments.map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                    >
                      <span>{getFileIcon(file.mimeType)}</span>
                      <span className="text-sm" style={yaksaStyles.textPrimary}>
                        {file.filename}
                      </span>
                      <span className="text-xs" style={yaksaStyles.textMuted}>
                        ({formatFileSize(file.size)})
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Like & Share Actions */}
          <div
            className="px-6 py-4 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--yaksa-border)' }}
          >
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1 px-4 py-2 rounded-full transition-colors"
                style={yaksaStyles.buttonSecondary}
              >
                ♥ 좋아요 {post.likeCount > 0 && post.likeCount}
              </button>
              <button
                className="flex items-center gap-1 px-4 py-2 rounded-full transition-colors"
                style={yaksaStyles.buttonSecondary}
              >
                📤 공유
              </button>
            </div>
          </div>
        </article>

        {/* Moderation Panel */}
        {isOperator && (
          <div className="mt-6">
            <YaksaModerationPanel
              post={post}
              userRole={user!.role}
              onApprove={() => {
                // TODO: Implement approve action via API
              }}
              onReject={() => {
                // TODO: Implement reject action via API
              }}
              onPin={() => {
                // TODO: Implement pin action via API
              }}
              onUnpin={() => {
                // TODO: Implement unpin action via API
              }}
              onLock={() => {
                // TODO: Implement lock action via API
              }}
              onUnlock={() => {
                // TODO: Implement unlock action via API
              }}
              onDelete={() => {
                // TODO: Implement delete action via API
              }}
            />
          </div>
        )}

        {/* Comments Section */}
        <section className="mt-6">
          <div
            className="rounded-lg border"
            style={{
              backgroundColor: 'var(--yaksa-surface)',
              borderColor: 'var(--yaksa-border)',
            }}
          >
            <div className="p-4 border-b" style={{ borderColor: 'var(--yaksa-border)' }}>
              <h3 className="font-semibold" style={yaksaStyles.textPrimary}>
                댓글 {comments.length}개
              </h3>
            </div>

            {/* Comment Form */}
            {user && !post.isLocked ? (
              <form onSubmit={handleCommentSubmit} className="p-4 border-b" style={{ borderColor: 'var(--yaksa-border)' }}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 작성하세요..."
                  className="w-full p-3 rounded border resize-none"
                  style={{
                    borderColor: 'var(--yaksa-border)',
                    minHeight: '80px',
                  }}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                    style={yaksaStyles.buttonPrimary}
                  >
                    댓글 작성
                  </button>
                </div>
              </form>
            ) : post.isLocked ? (
              <div className="p-4 text-center" style={yaksaStyles.textMuted}>
                🔒 이 게시글은 잠금 상태로 댓글을 작성할 수 없습니다.
              </div>
            ) : (
              <div className="p-4 text-center" style={yaksaStyles.textMuted}>
                댓글을 작성하려면 로그인하세요.
              </div>
            )}

            {/* Comments List */}
            <div className="divide-y" style={{ borderColor: 'var(--yaksa-border)' }}>
              {comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Comment Item
function CommentItem({ comment }: { comment: YaksaComment }) {
  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
          style={{
            backgroundColor: 'var(--yaksa-surface-tertiary)',
            color: 'var(--yaksa-text-secondary)',
          }}
        >
          {comment.author.avatar ? (
            <img
              src={comment.author.avatar}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            comment.author.name.charAt(0)
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm" style={yaksaStyles.textPrimary}>
              {comment.author.name}
            </span>
            {comment.author.role !== 'guest' && comment.author.role !== 'member' && (
              <YaksaRoleBadge role={comment.author.role} size="sm" showLabel={false} />
            )}
            <span className="text-xs" style={yaksaStyles.textMuted}>
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>
          <p className="text-sm" style={yaksaStyles.textSecondary}>
            {comment.content}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs" style={yaksaStyles.textMuted}>
            <button className="hover:underline">답글</button>
            {comment.likeCount > 0 && <span>좋아요 {comment.likeCount}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading State
function PostLoading() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--yaksa-surface-secondary)' }}
    >
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

// Helpers
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
  return '📎';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMockComments(): YaksaComment[] {
  return [
    {
      id: 'c1',
      content: '유용한 정보 감사합니다. 복약지도 시 참고하겠습니다.',
      author: { id: 'u1', name: '약사C', role: 'member' },
      postId: '1',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      likeCount: 3,
    },
    {
      id: 'c2',
      content: '관련 추가 자료가 있으면 공유 부탁드립니다.',
      author: { id: 'u2', name: '약사D', role: 'operator' },
      postId: '1',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
      likeCount: 1,
    },
  ];
}

export default YaksaForumPostSingle;
